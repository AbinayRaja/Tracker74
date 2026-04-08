import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import polyline from '@mapbox/polyline';

import { calculateTimeDifference, calculateTotalDistance } from '../helpers/calculateKm';

// ─── Types ────────────────────────────────────────────────────────────────
interface Coords { latitude: number; longitude: number; }

interface CheckRecord {
  type: 'check-in' | 'check-out' | 'track';
  timestamp: string;
  address?: string;
  coords: Coords;
}

interface Session {
  id: string;
  checkIn: CheckRecord;
  checkOut?: CheckRecord;
  trackPoints: CheckRecord[];
  stats: { hours: number; minutes: number; distanceKm: number };
  routePolyline: Coords[];
}

const HISTORY_KEY = '@checkin_history';

// ─── Build OSRM route through all waypoints ───────────────────────────────
const buildOsrmRoute = async (waypoints: Coords[]): Promise<{ distanceKm: number; coords: Coords[] } | null> => {
  if (waypoints.length < 2) return null;

  // Deduplicate consecutive identical coords
  const unique = waypoints.filter((pt, i) => {
    if (i === 0) return true;
    const prev = waypoints[i - 1];
    return !(Math.abs(pt.latitude - prev.latitude) < 0.0001 &&
      Math.abs(pt.longitude - prev.longitude) < 0.0001);
  });

  if (unique.length < 2) return null;

  try {
    const waypointStr = unique.map(p => `${p.longitude},${p.latitude}`).join(';');
    const url =
      `https://router.project-osrm.org/route/v1/driving/${waypointStr}` +
      `?overview=full&geometries=polyline`;

    const response = await fetch(url);
    const json = await response.json();

    if (!json.routes || json.routes.length === 0) return null;

    const route = json.routes[0];
    const distanceKm = Number((route.distance / 1000).toFixed(2));
    const decoded = polyline.decode(route.geometry);
    const coords: Coords[] = decoded.map((p: number[]) => ({ latitude: p[0], longitude: p[1] }));

    return { distanceKm, coords };
  } catch (e) {
    console.log('OSRM multi-waypoint error:', e);
    return null;
  }
};

// ─── Group flat history into sessions ────────────────────────────────────
const buildSessions = async (history: CheckRecord[]): Promise<Session[]> => {
  const sessions: Session[] = [];
  let current: Session | null = null;

  for (let i = 0; i < history.length; i++) {
    const rec = history[i];

    if (rec.type === 'check-in') {
      if (current) sessions.push(current);
      current = {
        id: `${rec.timestamp}-${i}`,
        checkIn: rec,
        checkOut: undefined,
        trackPoints: [],
        stats: { hours: 0, minutes: 0, distanceKm: 0 },
        routePolyline: [],
      };
    } else if (rec.type === 'track' && current) {
      current.trackPoints.push(rec);
    } else if (rec.type === 'check-out' && current) {
      current.checkOut = rec;

      // FIX: Actual time from check-in timestamp to check-out timestamp
      const dur = calculateTimeDifference(current.checkIn.timestamp, rec.timestamp);
      current.stats.hours = dur.hours;
      current.stats.minutes = dur.minutes;

      // FIX: Build full route: checkIn → all trackPoints → checkOut via OSRM
      const allWaypoints: Coords[] = [
        current.checkIn.coords,
        ...current.trackPoints.map(tp => tp.coords),
        rec.coords,
      ];

      try {
        const osrmResult = await buildOsrmRoute(allWaypoints);

        if (osrmResult) {
          current.stats.distanceKm = osrmResult.distanceKm;
          current.routePolyline = osrmResult.coords;
        } else {
          // Fallback: straight-line between waypoints
          current.stats.distanceKm = calculateTotalDistance(allWaypoints);
          current.routePolyline = allWaypoints;
        }
      } catch (e) {
        console.log('Route error in history:', e);
        current.stats.distanceKm = calculateTotalDistance(allWaypoints);
        current.routePolyline = allWaypoints;
      }

      sessions.push(current);
      current = null;
    }
  }

  // Incomplete session (no check-out yet — ongoing)
  if (current) sessions.push(current);

  return sessions;
};

// ─── Component ────────────────────────────────────────────────────────────
const History = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const load = async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      if (raw) {
        const history: CheckRecord[] = JSON.parse(raw);
        const built = await buildSessions(history);
        setSessions(built.reverse()); // newest first
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('History load error:', err);
      Alert.alert('Error', 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    Alert.alert('Clear History', 'Delete all location history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(HISTORY_KEY);
          setSessions([]);
        },
      },
    ]);
  };

  // ── Session card ────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Session }) => {
    const expanded = expandedId === item.id;
    const hasCheckOut = !!item.checkOut;

    return (
      <View style={s.card}>
        <TouchableOpacity
          onPress={() => setExpandedId(expanded ? null : item.id)}
          style={s.cardHeader}
          activeOpacity={0.7}>

          <View style={{ flex: 1 }}>
            <Text style={s.dateText}>
              📅 {new Date(item.checkIn.timestamp).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </Text>
            <Text style={s.timeText}>
              🕐 {new Date(item.checkIn.timestamp).toLocaleTimeString('en-IN')}
              {hasCheckOut
                ? ` → ${new Date(item.checkOut!.timestamp).toLocaleTimeString('en-IN')}`
                : ' (ongoing)'}
            </Text>
            {item.checkIn.address ? (
              <Text style={s.addrText} numberOfLines={1}>📍 {item.checkIn.address}</Text>
            ) : null}
            {/* FIX: Show stop count in card header */}
            {item.trackPoints.length > 0 && (
              <Text style={s.stopsText}>🔵 {item.trackPoints.length} stops recorded</Text>
            )}
          </View>

          <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
            <Text style={s.statBadge}>
              {item.stats.distanceKm.toFixed(2)} km
            </Text>
            <Text style={s.statBadge}>
              {item.stats.hours}h {item.stats.minutes}m
            </Text>
            {!hasCheckOut && (
              <View style={s.liveDot}>
                <Text style={s.liveText}>● LIVE</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* ── Expanded: map ── */}
        {expanded && (
          <View style={s.mapWrap}>
            <MapView
              style={s.map}
              initialRegion={{
                latitude: item.checkIn.coords.latitude,
                longitude: item.checkIn.coords.longitude,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06,
              }}>

              {/* Check-in: green */}
              <Marker
                coordinate={item.checkIn.coords}
                title="Check-in"
                description={new Date(item.checkIn.timestamp).toLocaleTimeString('en-IN')}
                pinColor="green"
              />

              {/* FIX: Track points: blue markers with time label */}
              {item.trackPoints.map((tp, i) => (
                <Marker
                  key={`tp-${i}`}
                  coordinate={tp.coords}
                  pinColor="blue"
                  opacity={0.8}
                  title={`Stop ${i + 1}`}
                  description={new Date(tp.timestamp).toLocaleTimeString('en-IN')}
                />
              ))}

              {/* Check-out: red */}
              {item.checkOut && (
                <Marker
                  coordinate={item.checkOut.coords}
                  title="Check-out"
                  description={new Date(item.checkOut.timestamp).toLocaleTimeString('en-IN')}
                  pinColor="red"
                />
              )}

              {/* FIX: Full road route polyline through all waypoints */}
              {item.routePolyline.length > 1 && (
                <Polyline
                  coordinates={item.routePolyline}
                  strokeColor="#2563eb"
                  strokeWidth={4}
                />
              )}
            </MapView>

            {/* Stats overlay */}
            <View style={s.statsRow}>
              <Text style={s.statItem}>🛣 {item.stats.distanceKm.toFixed(2)} km</Text>
              <Text style={s.statItem}>⏱ {item.stats.hours}h {item.stats.minutes}m</Text>
              {item.trackPoints.length > 0 && (
                <Text style={s.statItem}>📌 {item.trackPoints.length} stops</Text>
              )}
              {item.checkOut && (
                <Text style={s.statItem}>
                  📍 {item.checkOut.address ?? 'Checkout location'}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, color: '#6b7280' }}>Loading history…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Location History</Text>
        {sessions.length > 0 && (
          <TouchableOpacity onPress={clearHistory} style={s.clearBtn}>
            <Text style={s.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {sessions.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48 }}>📍</Text>
          <Text style={{ color: '#6b7280', marginTop: 8 }}>No check-in history yet</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </SafeAreaView>
  );
};

const { height } = Dimensions.get('window');

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    marginTop: '10%',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
  clearBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },

  card: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },

  cardHeader: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  dateText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  timeText: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  addrText: { fontSize: 12, color: '#374151', marginTop: 3 },
  stopsText: { fontSize: 11, color: '#2563eb', marginTop: 3, fontWeight: '600' },

  statBadge: { fontSize: 13, fontWeight: '600', color: '#1d4ed8', marginBottom: 2 },
  liveDot: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  liveText: { fontSize: 11, color: '#15803d', fontWeight: '700' },

  mapWrap: { borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  map: { height: height * 0.32 },

  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 6,
    backgroundColor: '#f0f9ff',
    borderTopWidth: 1,
    borderTopColor: '#bae6fd',
  },
  statItem: { fontSize: 12, color: '#0369a1', marginRight: 10 },
});

export default History;