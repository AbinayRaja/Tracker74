import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

const MapComponent = ({
  trackPoints = [],
  startPoint = null,
  endPoint = null,
  totalDistance = 0,
  duration = null,
  isLiveTracking = false,
}) => {
  const mapRef = useRef(null);
  const { width, height } = Dimensions.get('window');

  // All points including start and end
  const allPoints = [
    startPoint,
    ...trackPoints.filter(point => point),
    endPoint,
  ].filter(point => point);

  // Auto-fit map to show all points
  useEffect(() => {
    if (allPoints.length > 0 && mapRef.current) {
      const coordinates = allPoints.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));

      if (coordinates.length === 1) {
        mapRef.current.animateToRegion({
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
      } else {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: {
            top: 100,
            right: 50,
            bottom: 100,
            left: 50,
          },
          animated: true,
        });
      }
    }
  }, [allPoints]);

  // Auto-scroll to latest point when live tracking
  useEffect(() => {
    if (isLiveTracking && trackPoints.length > 0 && mapRef.current) {
      const lastPoint = trackPoints[trackPoints.length - 1];
      mapRef.current.animateToRegion({
        latitude: lastPoint.latitude,
        longitude: lastPoint.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  }, [trackPoints, isLiveTracking]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={[styles.map, { width, height: height * 0.7 }]}
        initialRegion={{
          latitude: 20.5937,
          longitude: 78.9629,
          latitudeDelta: 8,
          longitudeDelta: 8,
        }}
        showsUserLocation={true}
        followsUserLocation={isLiveTracking}
        loadingEnabled={true}
      >
        {/* Polyline for the route */}
        {allPoints.length > 1 && (
          <Polyline
            coordinates={allPoints.map(p => ({
              latitude: p.latitude,
              longitude: p.longitude,
            }))}
            strokeColor="#2563eb"
            strokeWidth={4}
            lineDashPattern={[0]}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Start Point Marker */}
        {startPoint && (
          <Marker
            coordinate={{
              latitude: startPoint.latitude,
              longitude: startPoint.longitude,
            }}
            title="Start Location"
            description={
              startPoint.timestamp
                ? new Date(startPoint.timestamp).toLocaleTimeString('en-IN')
                : ''
            }
            pinColor="#22c55e"
          />
        )}

        {/* Intermediate Points (smaller markers) */}
        {trackPoints.map((point, index) => (
          <Marker
            key={`track-${index}`}
            coordinate={{
              latitude: point.latitude,
              longitude: point.longitude,
            }}
            pinColor="#3b82f6"
            opacity={0.6}
          />
        ))}

        {/* End Point Marker */}
        {endPoint && (
          <Marker
            coordinate={{
              latitude: endPoint.latitude,
              longitude: endPoint.longitude,
            }}
            title="End Location"
            description={
              endPoint.timestamp
                ? new Date(endPoint.timestamp).toLocaleTimeString('en-IN')
                : ''
            }
            pinColor="#ef4444"
          />
        )}
      </MapView>

      {/* Statistics Panel */}
      <View style={styles.statsPanel}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{totalDistance.toFixed(2)} km</Text>
        </View>

        {duration && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>
              {duration.hours}h {duration.minutes}m
            </Text>
          </View>
        )}

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Points</Text>
          <Text style={styles.statValue}>{allPoints.length}</Text>
        </View>

        {isLiveTracking && (
          <View style={styles.liveIndicator}>
            <Text style={styles.liveText}>🔴 LIVE</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  map: {
    flex: 1,
  },
  statsPanel: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  liveIndicator: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
});

export default MapComponent;
