import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import polyline from '@mapbox/polyline';

import {
  requestLocationPermission,
  fetchLocation,
  getAddressFromCoords,
  getRoadRoute,
  startTracking,
} from '../helpers/locationHelper';
import { calculateTimeDifference } from '../helpers/calculateKm';

// ─── Types ────────────────────────────────────────────────────────────────
interface Coords { latitude: number; longitude: number; }

interface CheckRecord {
  type: 'check-in' | 'check-out' | 'track';
  timestamp: string;
  address?: string;
  coords: Coords;
}

// ─── Storage key ──────────────────────────────────────────────────────────
const HISTORY_KEY = '@checkin_history';

// ─── Helper: save one record to AsyncStorage ─────────────────────────────
const persistRecord = async (record: CheckRecord) => {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    let history: CheckRecord[] = raw ? JSON.parse(raw) : [];
    history.push(record);
    if (history.length > 500) history = history.slice(-500);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('persistRecord error:', e);
  }
};

// ─── Component ────────────────────────────────────────────────────────────
const Checkin = ({ route }: any) => {
  const { userName } = route?.params ?? { userName: 'User' };

  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [displayAddress, setDisplayAddress] = useState('No location yet');

  // Session state
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInRecord, setCheckInRecord] = useState<CheckRecord | null>(null);
  const [checkOutRecord, setCheckOutRecord] = useState<CheckRecord | null>(null);

  // FIX: trackPoints stores full CheckRecord so we have timestamp + coords
  const [trackPoints, setTrackPoints] = useState<CheckRecord[]>([]);
  const [routeCoords, setRouteCoords] = useState<Coords[]>([]);
  const [sessionStats, setSessionStats] = useState<{ hours: number; minutes: number; distanceKm: number } | null>(null);

  const stopTrackingRef = useRef<(() => void) | null>(null);

  // ── On mount: restore last session state ──────────────────────────────
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const history: CheckRecord[] = JSON.parse(raw);

      // Find the most recent check-in record
      let lastCI: CheckRecord | null = null;
      let lastCIIdx = -1;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].type === 'check-in') { lastCI = history[i]; lastCIIdx = i; break; }
      }
      if (!lastCI || lastCIIdx === -1) return;

      // Check if there's a subsequent check-out
      const hasCheckOut = history.slice(lastCIIdx + 1).some(r => r.type === 'check-out');

      if (!hasCheckOut) {
        setIsCheckedIn(true);
        setCheckInRecord(lastCI);
        setDisplayAddress(lastCI.address ?? 'No address');

        // Restore full track records (with timestamps) recorded after that check-in
        const trackRecs = history
          .slice(lastCIIdx + 1)
          .filter(r => r.type === 'track');
        setTrackPoints(trackRecs);

        // Restart tracking since session is still open
        const stop = startTracking(async (newCoords, ts) => {
          const trackRec: CheckRecord = {
            type: 'track',
            timestamp: ts,
            coords: { latitude: newCoords.latitude, longitude: newCoords.longitude },
          };
          await persistRecord(trackRec);
          setTrackPoints(prev => [...prev, trackRec]);
        });
        stopTrackingRef.current = stop;
      }
    })();

    return () => { stopTrackingRef.current?.(); };
  }, []);

  // ── Check In ──────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    setLoading(true);
    setStatusText('Getting your location…');
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      const coords = await fetchLocation();
      let address = 'Could not get address';

      try {
        const res = await getAddressFromCoords(coords.latitude, coords.longitude);
        if (res?.data) {
          const { suburb = '', city_district = '', city = '' } = res.data;
          const parts = [suburb, city_district, city].filter(Boolean);
          if (parts.length) address = parts.join(', ');
        }
      } catch (_) { }

      const record: CheckRecord = {
        type: 'check-in',
        timestamp: new Date().toISOString(),
        address,
        coords: { latitude: coords.latitude, longitude: coords.longitude },
      };

      await persistRecord(record);

      setCheckInRecord(record);
      setCheckOutRecord(null);
      setTrackPoints([]);
      setRouteCoords([]);
      setSessionStats(null);
      setIsCheckedIn(true);
      setDisplayAddress(address);

      // Start background tracking — saves every 20 minutes
      const stop = startTracking(async (newCoords, ts) => {
        const trackRec: CheckRecord = {
          type: 'track',
          timestamp: ts,
          coords: { latitude: newCoords.latitude, longitude: newCoords.longitude },
        };
        await persistRecord(trackRec);
        setTrackPoints(prev => [...prev, trackRec]);
      });
      stopTrackingRef.current = stop;

      Alert.alert('Checked In ✅', `📍 ${address}\n${new Date().toLocaleString('en-IN')}`);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to check in. Try again.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  // ── Check Out ─────────────────────────────────────────────────────────
  const handleCheckOut = async () => {
    setLoading(true);
    setStatusText('Calculating your route…');
    try {
      stopTrackingRef.current?.();
      stopTrackingRef.current = null;

      const coords = await fetchLocation();
      let address = 'Could not get address';

      try {
        const res = await getAddressFromCoords(coords.latitude, coords.longitude);
        if (res?.data) {
          const { suburb = '', city_district = '', city = '' } = res.data;
          const parts = [suburb, city_district, city].filter(Boolean);
          if (parts.length) address = parts.join(', ');
        }
      } catch (_) { }

      const checkoutTimestamp = new Date().toISOString();

      const record: CheckRecord = {
        type: 'check-out',
        timestamp: checkoutTimestamp,
        address,
        coords: { latitude: coords.latitude, longitude: coords.longitude },
      };

      await persistRecord(record);
      setCheckOutRecord(record);
      setIsCheckedIn(false);
      setDisplayAddress(address);

      // ── FIX: Calculate ACTUAL time from check-in timestamp to check-out ──
      if (checkInRecord) {
        const dur = calculateTimeDifference(checkInRecord.timestamp, checkoutTimestamp);

        // ── Build full route: checkIn → all trackPoints → checkOut ──────────
        // FIX: Use OSRM multi-waypoint route through all visited points
        const allWaypoints: Coords[] = [
          checkInRecord.coords,
          ...trackPoints.map(tp => tp.coords),
          { latitude: coords.latitude, longitude: coords.longitude },
        ];

        // Deduplicate consecutive identical coords
        const uniqueWaypoints = allWaypoints.filter((pt, i) => {
          if (i === 0) return true;
          const prev = allWaypoints[i - 1];
          return !(Math.abs(pt.latitude - prev.latitude) < 0.0001 &&
            Math.abs(pt.longitude - prev.longitude) < 0.0001);
        });

        let totalDistanceKm = 0;
        let fullPolylineCoords: Coords[] = [];

        if (uniqueWaypoints.length >= 2) {
          // Build OSRM URL with all waypoints (coordinates format: lon,lat)
          const waypointStr = uniqueWaypoints
            .map(p => `${p.longitude},${p.latitude}`)
            .join(';');

          try {
            const osrmUrl =
              `https://router.project-osrm.org/route/v1/driving/${waypointStr}` +
              `?overview=full&geometries=polyline`;

            const response = await fetch(osrmUrl);
            const json = await response.json();

            if (json.routes && json.routes.length > 0) {
              const osrmRoute = json.routes[0];
              totalDistanceKm = Number((osrmRoute.distance / 1000).toFixed(2));
              const decoded = polyline.decode(osrmRoute.geometry);
              fullPolylineCoords = decoded.map((p: number[]) => ({
                latitude: p[0],
                longitude: p[1],
              }));
            } else {
              // Fallback: straight lines between waypoints
              fullPolylineCoords = uniqueWaypoints;
              const { calculateTotalDistance } = require('../helpers/calculateKm');
              totalDistanceKm = calculateTotalDistance(uniqueWaypoints);
            }
          } catch (routeErr) {
            console.log('OSRM multi-waypoint error:', routeErr);
            fullPolylineCoords = uniqueWaypoints;
            const { calculateTotalDistance } = require('../helpers/calculateKm');
            totalDistanceKm = calculateTotalDistance(uniqueWaypoints);
          }
        }

        setSessionStats({
          hours: dur.hours,
          minutes: dur.minutes,
          distanceKm: totalDistanceKm,
        });

        setRouteCoords(fullPolylineCoords);

        Alert.alert(
          'Checked Out ✅',
          `📍 ${address}\n\n🛣 Distance: ${totalDistanceKm} km\n⏱ Duration: ${dur.hours}h ${dur.minutes}m`,
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to check out. Try again.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  // ── Map region ────────────────────────────────────────────────────────
  const mapCenter = checkInRecord?.coords ?? { latitude: 20.5937, longitude: 78.9629 };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Check In</Text>
      </View>

      <View style={s.card}>

        {/* Welcome */}
        <View style={s.welcomeRow}>
          <Text style={s.welcomeName}>Welcome, {userName}!</Text>
          <Text style={s.welcomeRole}>Sales Officer</Text>
        </View>

        {/* ── Map ── */}
        {checkInRecord && (
          <MapView
            style={s.map}
            region={{
              latitude: mapCenter.latitude,
              longitude: mapCenter.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}>

            {/* Check-in marker (green) */}
            <Marker
              coordinate={checkInRecord.coords}
              title="Check-in"
              description={new Date(checkInRecord.timestamp).toLocaleTimeString('en-IN')}
              pinColor="green"
            />

            {/* FIX: Track points shown as blue markers on map */}
            {trackPoints.map((tp, i) => (
              <Marker
                key={`track-${i}`}
                coordinate={tp.coords}
                pinColor="blue"
                opacity={0.75}
                title={`Stop ${i + 1}`}
                description={new Date(tp.timestamp).toLocaleTimeString('en-IN')}
              />
            ))}

            {/* Check-out marker (red) */}
            {checkOutRecord && (
              <Marker
                coordinate={checkOutRecord.coords}
                title="Check-out"
                description={new Date(checkOutRecord.timestamp).toLocaleTimeString('en-IN')}
                pinColor="red"
              />
            )}

            {/* FIX: Road route polyline through all waypoints */}
            {routeCoords.length > 1 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor="#2563eb"
                strokeWidth={4}
              />
            )}
          </MapView>
        )}

        {/* ── Location label ── */}
        <View style={s.locationRow}>
          <Text style={s.locationLabel}>📍 Current Location</Text>
          <Text style={s.locationValue}>{displayAddress}</Text>
        </View>

        {/* ── Check-in info card ── */}
        {checkInRecord && (
          <View style={[s.infoCard, s.infoCardGreen]}>
            <Text style={[s.infoCardTitle, { color: '#15803d' }]}>✅ Checked In</Text>
            <Text style={s.infoCardTime}>
              {new Date(checkInRecord.timestamp).toLocaleString('en-IN')}
            </Text>
            <Text style={s.infoCardAddr}>📍 {checkInRecord.address}</Text>
          </View>
        )}

        {/* ── Check-out info card ── */}
        {checkOutRecord && (
          <View style={[s.infoCard, s.infoCardRed]}>
            <Text style={[s.infoCardTitle, { color: '#b91c1c' }]}>🔴 Checked Out</Text>
            <Text style={s.infoCardTime}>
              {new Date(checkOutRecord.timestamp).toLocaleString('en-IN')}
            </Text>
            <Text style={s.infoCardAddr}>📍 {checkOutRecord.address}</Text>
          </View>
        )}

        {/* ── Session summary ── */}
        {sessionStats && (
          <View style={[s.infoCard, s.infoCardBlue]}>
            <Text style={[s.infoCardTitle, { color: '#1d4ed8' }]}>📊 Session Summary</Text>
            <Text style={s.statRow}>
              ⏱  Duration:   {sessionStats.hours}h {sessionStats.minutes}m
            </Text>
            <Text style={s.statRow}>
              🛣  Distance:   {sessionStats.distanceKm.toFixed(2)} km
            </Text>
            {trackPoints.length > 0 && (
              <Text style={s.statRow}>
                📌  Stops recorded:   {trackPoints.length}
              </Text>
            )}
          </View>
        )}

        {!checkInRecord && (
          <Text style={s.noCheckin}>No check-in yet. Tap CHECK-IN below.</Text>
        )}

        {/* ── Action button ── */}
        <TouchableOpacity
          style={[s.actionBtn, isCheckedIn && s.actionBtnRed]}
          onPress={isCheckedIn ? handleCheckOut : handleCheckIn}
          disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.actionBtnText}>{isCheckedIn ? 'CHECK-OUT' : 'CHECK-IN'}</Text>
          }
        </TouchableOpacity>

        {/* Status text */}
        {!!statusText && <Text style={s.statusText}>{statusText}</Text>}
        {isCheckedIn && !loading && (
          <Text style={s.trackingBadge}>🟢 Tracking active — location saved every 20 minutes</Text>
        )}

      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  card: {
    margin: 16,
    marginTop: -20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    elevation: 5,
  },

  welcomeRow: { marginBottom: 16 },
  welcomeName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  welcomeRole: { fontSize: 13, color: '#6b7280', marginTop: 4 },

  map: {
    height: 260,
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },

  locationRow: { marginBottom: 14 },
  locationLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '600', marginBottom: 4 },
  locationValue: { fontSize: 14, color: '#374151', fontWeight: '500' },

  infoCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  infoCardGreen: { backgroundColor: '#ecfdf5', borderColor: '#4ade80' },
  infoCardRed: { backgroundColor: '#fef2f2', borderColor: '#f87171' },
  infoCardBlue: { backgroundColor: '#eff6ff', borderColor: '#60a5fa' },
  infoCardTitle: { fontWeight: '700', fontSize: 15, marginBottom: 6 },
  infoCardTime: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  infoCardAddr: { fontSize: 13, color: '#374151' },

  statRow: { fontSize: 14, color: '#1d4ed8', marginTop: 4, fontWeight: '500' },

  noCheckin: {
    textAlign: 'center', color: '#9ca3af', marginVertical: 16, fontSize: 14,
  },

  actionBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },
  actionBtnRed: { backgroundColor: '#dc2626' },
  actionBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 16, letterSpacing: 1 },

  statusText: { textAlign: 'center', color: '#6b7280', fontSize: 13, marginTop: 10 },

  trackingBadge: {
    textAlign: 'center', color: '#16a34a', fontSize: 12, marginTop: 6, fontWeight: '600',
  },
});

export default Checkin;