import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import MapView, { Polyline, Marker } from 'react-native-maps';
import polyline from '@mapbox/polyline';

import { getRoadRoute } from '../helpers/locationHelper';

import {
  calculateTimeDifference,
  calculateTotalDistance,
} from '../helpers/calculateKm';

interface CheckRecord {
  type: 'check-in' | 'check-out' | 'track';
  timestamp: string;
  address?: string;
  coords: {
    latitude: number;
    longitude: number;
  };
}

interface SessionRecord {
  id: string;
  checkIn: CheckRecord;
  checkOut?: CheckRecord;
  trackPoints: CheckRecord[];
  sessionStats?: {
    hours: number;
    minutes: number;
    distanceKm: number;
  };
  routePolyline?: { latitude: number; longitude: number }[];
  savedAt: string;
}

const CHECKIN_HISTORY_KEY = '@checkin_history';

const History = () => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 🔍 Debug history (runs once)
  useEffect(() => {
    const checkHistory = async () => {
      try {
        const value = await AsyncStorage.getItem(CHECKIN_HISTORY_KEY);
        console.log('Check-in History:', value);
      } catch (e) {
        console.log('Error reading history:', e);
      }
    };

    checkHistory();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCheckinHistory();
    }, []),
  );

  const loadCheckinHistory = async () => {
    try {
      setLoading(true);

      const json = await AsyncStorage.getItem(CHECKIN_HISTORY_KEY);

      if (json) {
        const history: CheckRecord[] = JSON.parse(json);

        const groupedSessions = await groupIntoSessions(history);

        setSessions(groupedSessions.reverse());
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
      Alert.alert('Error', 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const groupIntoSessions = async (
    history: CheckRecord[],
  ): Promise<SessionRecord[]> => {
    const sessions: SessionRecord[] = [];
    let currentSession: SessionRecord | null = null;

    for (let i = 0; i < history.length; i++) {
      const record = history[i];

      if (record.type === 'check-in') {
        if (currentSession) sessions.push(currentSession);

        currentSession = {
          id: `${record.timestamp}-${i}`,
          checkIn: record,
          trackPoints: [],
          savedAt: record.timestamp,
        };
      }

      else if (record.type === 'track' && currentSession) {
        currentSession.trackPoints.push(record);
      }

      else if (record.type === 'check-out' && currentSession) {

        currentSession.checkOut = record;
        currentSession.savedAt = record.timestamp;

        const duration = calculateTimeDifference(
          currentSession.checkIn.timestamp,
          record.timestamp
        );

        currentSession.sessionStats = {
          hours: duration.hours,
          minutes: duration.minutes,
          distanceKm: 0,
        };

        // 🛣 road route
        try {

          const roadResult = await getRoadRoute(
            currentSession.checkIn.coords.latitude,
            currentSession.checkIn.coords.longitude,
            record.coords.latitude,
            record.coords.longitude
          );

          if (roadResult) {

            currentSession.sessionStats.distanceKm =
              Number(roadResult.distanceKm.toFixed(2));

            const decoded = polyline.decode(roadResult.geometry);

            currentSession.routePolyline = decoded.map(p => ({
              latitude: p[0],
              longitude: p[1],
            }));

          } else {

            const allPoints = [
              currentSession.checkIn.coords,
              ...currentSession.trackPoints.map(p => p.coords),
              record.coords,
            ];

            currentSession.sessionStats.distanceKm =
              calculateTotalDistance(allPoints);

          }

        } catch (err) {
          console.log('Route calculation error:', err);
        }

        sessions.push(currentSession);
        currentSession = null;
      }
    }

    if (currentSession) {
      sessions.push(currentSession);
    }

    return sessions;
  };

  const renderSessionItem = ({ item }: { item: SessionRecord }) => {

    const isExpanded = expandedId === item.id;
    const stats = item.sessionStats || { hours: 0, minutes: 0, distanceKm: 0 };

    return (
      <View style={styles.sessionCard}>

        <TouchableOpacity
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          style={styles.sessionHeader}>

          <View>
            <Text style={styles.sessionDate}>
              📅 {new Date(item.checkIn.timestamp).toLocaleDateString('en-IN')}
            </Text>

            <Text style={styles.sessionTime}>
              ⏰ {new Date(item.checkIn.timestamp).toLocaleTimeString('en-IN')}
            </Text>
          </View>

          <View>
            <Text style={styles.statText}>
              📍 {stats.distanceKm.toFixed(2)} km
            </Text>

            <Text style={styles.statText}>
              ⏱ {stats.hours}h {stats.minutes}m
            </Text>
          </View>

        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.mapContainer}>

            <MapView
              style={styles.map}
              initialRegion={{
                latitude: item.checkIn.coords.latitude,
                longitude: item.checkIn.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}>

              <Marker coordinate={item.checkIn.coords} pinColor="green" />

              {item.trackPoints.map((p, i) => (
                <Marker key={i} coordinate={p.coords} pinColor="blue" />
              ))}

              {item.checkOut && (
                <Marker coordinate={item.checkOut.coords} pinColor="red" />
              )}

              {item.routePolyline && (
                <Polyline
                  coordinates={item.routePolyline}
                  strokeWidth={4}
                  strokeColor="#3b82f6"
                />
              )}

            </MapView>

          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Check-in History</Text>
      </View>

      {sessions.length === 0 ? (

        <View style={styles.emptyState}>
          <Text style={{ fontSize: 40 }}>📍</Text>
          <Text>No history yet</Text>
        </View>

      ) : (

        <FlatList
          data={sessions}
          renderItem={renderSessionItem}
          keyExtractor={item => item.id}
        />

      )}

    </SafeAreaView>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({

container:{backgroundColor:'#f9fafb'},

header:{
// padding:16,
backgroundColor:'#fff',
// borderBottomWidth:1,
borderColor:'#e5e7eb'
},

headerTitle:{
fontSize:18,
fontWeight:'700'
},

sessionCard:{
margin:10,
backgroundColor:'#fff',
borderRadius:8,
overflow:'hidden',
borderWidth:1,
borderColor:'#e5e7eb'
},

sessionHeader:{
flexDirection:'row',
justifyContent:'space-between',
padding:16,
backgroundColor:'#f3f4f6'
},

sessionDate:{
fontSize:14,
fontWeight:'600'
},

sessionTime:{
fontSize:12,
color:'#6b7280'
},

statText:{
fontSize:13,
fontWeight:'600'
},

mapContainer:{
height:height*0.3
},

map:{
flex:1
},

loadingContainer:{
flex:1,
justifyContent:'center',
alignItems:'center'
},

emptyState:{
flex:1,
justifyContent:'center',
alignItems:'center'
}

});

export default History;