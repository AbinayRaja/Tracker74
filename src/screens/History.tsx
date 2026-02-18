import React, { useState } from 'react';
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
import { useFocusEffect as useNavigationFocusEffect } from '@react-navigation/native';

import MapComponent from '../components/MapComponent';
import { calculateAverageSpeed, durationToMinutes } from '../helpers/calculateKm';

interface RouteRecord {
  id: string;
  startPoint: { latitude: number; longitude: number; timestamp?: string };
  endPoint: { latitude: number; longitude: number; timestamp?: string };
  intermediatePoints: Array<{ latitude: number; longitude: number }>;
  trackingPoints: Array<{ latitude: number; longitude: number; timestamp?: string }>;
  totalDistance: number;
  totalDuration: { hours: number; minutes: number };
  savedAt: string;
}

const History = () => {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useNavigationFocusEffect(
    React.useCallback(() => {
      loadRouteHistory();
    }, [])
  );

  const loadRouteHistory = async () => {
    try {
      setLoading(true);
      const TRACKING_HISTORY_KEY = '@tracking_history';
      const json = await AsyncStorage.getItem(TRACKING_HISTORY_KEY);
      
      if (json) {
        const history = JSON.parse(json);
        const routesWithId = history.map((route, index) => ({
          ...route,
          id: `${route.savedAt}-${index}`,
        }));
        setRoutes(routesWithId.reverse()); // Show newest first
      }
    } catch (err) {
      console.error('Failed to load route history:', err);
      Alert.alert('Error', 'Failed to load route history');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoute = (routeId: string) => {
    Alert.alert(
      'Delete Route',
      'Are you sure you want to delete this route?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const TRACKING_HISTORY_KEY = '@tracking_history';
              let history = [];
              const json = await AsyncStorage.getItem(TRACKING_HISTORY_KEY);
              if (json) history = JSON.parse(json);

              // Remove the deleted route
              const updatedHistory = history.filter(
                (_, index) => `${history[index].savedAt}-${index}` !== routeId
              );

              await AsyncStorage.setItem(
                TRACKING_HISTORY_KEY,
                JSON.stringify(updatedHistory)
              );

              setRoutes((prev) => prev.filter((r) => r.id !== routeId));
              Alert.alert('Success', 'Route deleted successfully');
            } catch (err) {
              console.error('Failed to delete route:', err);
              Alert.alert('Error', 'Failed to delete route');
            }
          },
        },
      ]
    );
  };

  const handleExportRoute = (route: RouteRecord) => {
    const routeData = {
      distance: `${route.totalDistance} km`,
      duration: `${route.totalDuration.hours}h ${route.totalDuration.minutes}m`,
      speed: `${calculateAverageSpeed(route.totalDistance, durationToMinutes(route.totalDuration))} km/h`,
      points: route.trackingPoints.length,
      date: new Date(route.savedAt).toLocaleString('en-IN'),
    };

    Alert.alert('Route Details', JSON.stringify(routeData, null, 2));
  };

  const renderRouteItem = ({ item }: { item: RouteRecord }) => {
    const isExpanded = expandedId === item.id;
    const avgSpeed = calculateAverageSpeed(
      item.totalDistance,
      durationToMinutes(item.totalDuration)
    );
    const date = new Date(item.savedAt);

    return (
      <View style={styles.routeCard}>
        <TouchableOpacity
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          style={styles.routeHeader}
        >
          <View style={styles.routeInfo}>
            <Text style={styles.routeDate}>
              📅 {date.toLocaleDateString('en-IN')}
            </Text>
            <Text style={styles.routeTime}>
              ⏰ {date.toLocaleTimeString('en-IN')}
            </Text>
          </View>
          <View style={styles.routeStats}>
            <Text style={styles.routeStat}>
              📍 {item.totalDistance.toFixed(2)} km
            </Text>
            <Text style={styles.routeStat}>
              ⏱ {item.totalDuration.hours}h {item.totalDuration.minutes}m
            </Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Map Component */}
            <View style={styles.mapContainer}>
              <MapComponent
                trackPoints={item.intermediatePoints}
                startPoint={item.startPoint}
                endPoint={item.endPoint}
                totalDistance={item.totalDistance}
                duration={item.totalDuration}
                isLiveTracking={false}
              />
            </View>

            {/* Detailed Stats */}
            <View style={styles.detailedStats}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Distance:</Text>
                <Text style={styles.statValue}>{item.totalDistance.toFixed(2)} km</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Duration:</Text>
                <Text style={styles.statValue}>
                  {item.totalDuration.hours}h {item.totalDuration.minutes}m
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Average Speed:</Text>
                <Text style={styles.statValue}>{avgSpeed.toFixed(2)} km/h</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>GPS Points:</Text>
                <Text style={styles.statValue}>{item.trackingPoints.length}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.exportBtn]}
                onPress={() => handleExportRoute(item)}
              >
                <Text style={styles.actionBtnText}>📊 EXPORT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDeleteRoute(item.id)}
              >
                <Text style={styles.actionBtnText}>🗑 DELETE</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading routes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route History</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={loadRouteHistory}
        >
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {routes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📍</Text>
          <Text style={styles.emptyStateText}>No routes tracked yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start tracking to see your routes here
          </Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          renderItem={renderRouteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.1}
        />
      )}
    </SafeAreaView>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  refreshBtnText: {
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  routeCard: {
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
  },
  routeInfo: {
    flex: 1,
  },
  routeDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  routeTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  routeStats: {
    alignItems: 'flex-end',
  },
  routeStat: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  mapContainer: {
    height: height * 0.35,
    backgroundColor: '#f0f9ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailedStats: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportBtn: {
    backgroundColor: '#10b981',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});

export default History;
