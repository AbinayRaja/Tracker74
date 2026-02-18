import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, {Polyline, Marker} from 'react-native-maps';

import {
  requestLocationPermission,
  fetchLocation,
  getAddressFromCoords,
  getRoadDistanceKm,
  startTracking,
} from '../helpers/locationHelper';
import styles from '../styles/checkinStyles';
import CheckIn from '../assets/checkinMap.jpg';
import {
  calculateTimeDifference,
  calculateDistanceKm,
} from '../helpers/calculateKm';

// Storage key
const CHECKIN_HISTORY_KEY = '@checkin_history';

interface CheckRecord {
  type: 'check-in' | 'check-out' | 'track';
  timestamp: string;
  address?: string; // only for check-in / check-out
  coords: {
    latitude: number;
    longitude: number;
  };
}

const Checkin = ({route}) => {
  const {userName} = route.params;
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [latestRecord, setLatestRecord] = useState<CheckRecord | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<CheckRecord | null>(null);
  const [lastCheckOut, setLastCheckOut] = useState<CheckRecord | null>(null);
  const [sessionStats, setSessionStats] = useState<{
    hours: number;
    minutes: number;
    distanceKm: number;
  } | null>(null);
  const [displayAddress, setDisplayAddress] =
    useState<string>('No location yet');

  // ── New states for full path tracking ──
  const [trackPoints, setTrackPoints] = useState<CheckRecord[]>([]); // intermediate points only
  const stopTrackingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadLatestCheckRecord();

    // Cleanup on unmount
    return () => {
      if (stopTrackingRef.current) {
        stopTrackingRef.current();
      }
    };
  }, []);

  const loadLatestCheckRecord = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(CHECKIN_HISTORY_KEY);
      if (jsonValue) {
        const history: CheckRecord[] = JSON.parse(jsonValue);
        if (history.length > 0) {
          const latest = history[history.length - 1];
          setLatestRecord(latest);
          if (latest.address) {
            setDisplayAddress(latest.address);
          }

          // Find most recent check-in
          let checkIn: CheckRecord | null = null;
          for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].type === 'check-in') {
              checkIn = history[i];
              break;
            }
          }
          setLastCheckIn(checkIn);
          setLastCheckOut(null);
          setSessionStats(null);
          setTrackPoints([]);
        }
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  };

  const saveCheckRecord = async (record: CheckRecord) => {
    try {
      let history: CheckRecord[] = [];
      const json = await AsyncStorage.getItem(CHECKIN_HISTORY_KEY);
      if (json) {
        history = JSON.parse(json);
      }

      history.push(record);
      if (history.length > 60) {
        history = history.slice(-60);
      }

      await AsyncStorage.setItem(CHECKIN_HISTORY_KEY, JSON.stringify(history));

      setLatestRecord(record);
      if (record.address) {
        setDisplayAddress(record.address);
      }

      if (record.type === 'check-in') {
        setLastCheckIn(record);
        setLastCheckOut(null);
        setSessionStats(null);
        setTrackPoints([]);
      } else if (record.type === 'check-out') {
        setLastCheckOut(record);
      }
    } catch (e) {
      console.error('Failed to save record:', e);
    }
  };

  const handleAction = async (action: 'check-in' | 'check-out') => {
    setLoading(true);

    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Location permission is required.');
        setLoading(false);
        return;
      }

      const coords = await fetchLocation();
      let fullAddress = 'Could not get address';
      console.log(coords, 'coords');

      try {
        const response = await getAddressFromCoords(
          coords.latitude,
          coords.longitude,
        );
        if (response && typeof response === 'object' && response.data) {
          const {suburb = '', city_district = '', city = ''} = response.data;
          const parts = [suburb, city_district, city].filter(Boolean);
          if (parts.length > 0) {
            fullAddress = parts.join(', ');
          }
        }
      } catch (addrErr) {
        console.log('Address fetch failed:', addrErr);
      }

      const newRecord: CheckRecord = {
        type: action,
        timestamp: new Date().toISOString(),
        address: fullAddress,
        coords: {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
      };

      await saveCheckRecord(newRecord);

      if (action === 'check-in') {
        const stopFn = startTracking((newCoords, ts) => {
          const trackRec: CheckRecord = {
            type: 'track',
            timestamp: ts,
            coords: {
              latitude: newCoords.latitude,
              longitude: newCoords.longitude,
            },
          };
          setTrackPoints(prev => [...prev, trackRec]);
        });

        stopTrackingRef.current = stopFn;

        Alert.alert(
          'Check-in Successful',
          `📍 ${fullAddress}\n\n${new Date().toLocaleString('en-IN')}`,
        );
      } else {
        if (stopTrackingRef.current) {
          stopTrackingRef.current();
          stopTrackingRef.current = null;
        }

        if (lastCheckIn) {
          const timeDiff = calculateTimeDifference(
            lastCheckIn.timestamp,
            newRecord.timestamp,
          );

          const fullPath = [lastCheckIn, ...trackPoints, newRecord];

          // let totalKm = 0;

          // for (let i = 1; i < fullPath.length; i++) {
          //   const prev = fullPath[i - 1];
          //   const curr = fullPath[i];

          //   const segmentDistance = await getRoadDistanceKm(
          //     prev.coords.latitude,
          //     prev.coords.longitude,
          //     curr.coords.latitude,
          //     curr.coords.longitude,
          //   );

          //   totalKm += segmentDistance;
          // }

          // totalKm = Math.round(totalKm * 100) / 100;

          // setSessionStats({
          //   hours: timeDiff.hours,
          //   minutes: timeDiff.minutes,
          //   distanceKm: totalKm,
          // });
          if (lastCheckIn) {
            const timeDiff = calculateTimeDifference(
              lastCheckIn.timestamp,
              newRecord.timestamp,
            );

            const totalKm = await getRoadDistanceKm(
              lastCheckIn.coords.latitude,
              lastCheckIn.coords.longitude,
              newRecord.coords.latitude,
              newRecord.coords.longitude,
            );

            const roundedKm = Math.round(totalKm * 100) / 100;

            setSessionStats({
              hours: timeDiff.hours,
              minutes: timeDiff.minutes,
              distanceKm: roundedKm,
            });

            setLastCheckOut(newRecord);

            Alert.alert(
              'Check-out Successful',
              `📍 ${fullAddress}\n\nTotal Distance: ${roundedKm} km`,
            );
          }

          // Alert.alert(
          //   'Check-out Successful',
          //   `📍 ${fullAddress}\n\nTotal distance: ${totalKm} km\n${new Date().toLocaleString(
          //     'en-IN',
          //   )}`,
          // );
        }
      }
    } catch (err: any) {
      console.error('Action failed:', err);
      Alert.alert('Error', err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const isLastCheckIn = latestRecord?.type === 'check-in';
  const nextAction = isLastCheckIn ? 'check-out' : 'check-in';
  const buttonText = loading
    ? 'PROCESSING...'
    : nextAction === 'check-in'
    ? 'CHECK-IN'
    : 'CHECK-OUT';
  const testRoute = [
    {latitude: 11.0813, longitude: 76.9999}, // Start - Saravanampatti
    {latitude: 11.083, longitude: 77.0025}, // Mid point
    {latitude: 11.085, longitude: 77.005}, // End point
  ];

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 40,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Check In</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.welcomeRow}>
            <View>
              <Text style={styles.welcome}>Welcome, {userName}!</Text>
              <Text style={styles.subText}>Sales Officer</Text>
            </View>
          </View>

          {/* <Image source={CheckIn} style={styles.map} /> */}
          {lastCheckIn && (
            <MapView
              style={{height: 250, marginVertical: 12}}
              initialRegion={{
                latitude: lastCheckIn.coords.latitude,
                longitude: lastCheckIn.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}>
              {/* Start Marker */}
              <Marker
                coordinate={{
                  latitude: lastCheckIn.coords.latitude,
                  longitude: lastCheckIn.coords.longitude,
                }}
                title="Start"
                pinColor="green"
              />

              {/* Track Points */}
              {trackPoints.map((point, index) => (
                <Marker
                  key={index}
                  coordinate={{
                    latitude: point.coords.latitude,
                    longitude: point.coords.longitude,
                  }}
                  pinColor="blue"
                />
              ))}

              {/* Polyline */}
              <Polyline
                coordinates={[
                  {
                    latitude: lastCheckIn.coords.latitude,
                    longitude: lastCheckIn.coords.longitude,
                  },
                  ...trackPoints.map(p => ({
                    latitude: p.coords.latitude,
                    longitude: p.coords.longitude,
                  })),
                ]}
                strokeWidth={4}
                strokeColor="skyblue"
              />
            </MapView>
          )}

          <View style={styles.locationRow}>
            <Text style={styles.locationText}>Location</Text>
            <Text style={styles.dayText}>{displayAddress}</Text>
          </View>

          {/* Records + Stats Section */}
          {lastCheckIn ? (
            <>
              {/* Check-in Card */}
              <View
                style={{
                  marginVertical: 12,
                  padding: 12,
                  backgroundColor: '#f0fdf4',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#86efac',
                }}>
                <Text style={{fontWeight: 'bold', color: '#15803d'}}>
                  Checked In
                </Text>
                <Text style={{color: '#4b5563', marginTop: 4, fontSize: 13}}>
                  {new Date(lastCheckIn.timestamp).toLocaleString('en-IN')}
                </Text>
                <Text style={{marginTop: 6, color: '#374151'}}>
                  📍 {lastCheckIn.address || 'Location not available'}
                </Text>
              </View>

              {/* Check-out Card + Session Stats */}
              {lastCheckOut && (
                <View
                  style={{
                    marginVertical: 12,
                    padding: 12,
                    backgroundColor: '#fef2f2',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#fca5a5',
                  }}>
                  <Text
                    style={{
                      fontWeight: 'bold',
                      color: '#b91c1c',
                      fontSize: 16,
                    }}>
                    Checked Out
                  </Text>
                  <Text style={{color: '#4b5563', marginTop: 4, fontSize: 13}}>
                    {new Date(lastCheckOut.timestamp).toLocaleString('en-IN')}
                  </Text>
                  <Text style={{marginTop: 6, color: '#374151'}}>
                    📍 {lastCheckOut.address || 'Location not available'}
                  </Text>
                </View>
              )}
              {sessionStats && (
                <View
                  style={{
                    marginVertical: 12,
                    padding: 12,
                    backgroundColor: '#baddf2',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#87cbf5',
                  }}>
                  <Text
                    style={{color: '#1b3a99', fontWeight: '600', fontSize: 15}}>
                    Session Summary
                  </Text>
                  <Text style={{color: '#374151', marginTop: 6, fontSize: 14}}>
                    ⏱ Duration: {sessionStats.hours} hrs {sessionStats.minutes}{' '}
                    min
                  </Text>
                  <Text style={{color: '#374151', marginTop: 4, fontSize: 14}}>
                    🛣 Total distance travelled: {sessionStats.distanceKm} km
                  </Text>

                  {/* View Route Map Button */}
                  {/* <TouchableOpacity
                    style={{
                      marginTop: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      backgroundColor: '#0ea5e9',
                      borderRadius: 6,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      navigation.navigate('Tracking', {
                        checkInRecord: lastCheckIn,
                        trackPoints,
                        sessionStats,
                      });
                    }}>
                    <Text
                      style={{color: '#fff', fontWeight: '600', fontSize: 14}}>
                      🗺 View Route Map
                    </Text>
                  </TouchableOpacity> */}
                </View>
              )}
            </>
          ) : (
            <Text
              style={{
                textAlign: 'center',
                color: '#6b7280',
                marginVertical: 16,
              }}>
              No Check-in yet
            </Text>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.checkInBtn,
              nextAction === 'check-out' && {backgroundColor: '#b91c1c'},
            ]}
            onPress={() => handleAction(nextAction)}
            disabled={loading}>
            <Text style={styles.checkInText}>{buttonText}</Text>
          </TouchableOpacity>

          <Text style={styles.signalText}>
            {loading
              ? 'Getting location...'
              : isLastCheckIn
              ? 'Tracking active...'
              : ''}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default Checkin;
