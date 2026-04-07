import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

// ─── Permission ─────────────────────────────────────────────────────────────
export const requestLocationPermission = async () => {
  if (Platform.OS === 'ios') return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'This app needs access to your location for check-in.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Permission error:', err);
    return false;
  }
};

// ─── Fetch current location (accurate single fix) ─────────────────────────
export const fetchLocation = () => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => resolve(position.coords),
      error => {
        // Fallback: lower accuracy
        Geolocation.getCurrentPosition(
          pos => resolve(pos.coords),
          err => reject(err),
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 },
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  });
};

// ─── Address from coordinates ─────────────────────────────────────────────
export const getAddressFromCoords = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://test.yourfarm.co.in/v1/admin/address/coordinates?latitude=${latitude}&longitude=${longitude}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: '7KIAIMQZ25XTQMM7XIYWA',
        },
      },
    );
    if (!response.ok) return { data: null };
    const json = await response.json();
    return json && typeof json === 'object' ? json : { data: null };
  } catch (error) {
    console.error('Address fetch error:', error);
    return { data: null };
  }
};

// ─── Road route via OSRM (free, no API key needed) ───────────────────────
export const getRoadRoute = async (originLat, originLng, destLat, destLng) => {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${originLng},${originLat};${destLng},${destLat}` +
      `?overview=full&geometries=polyline`;

    const response = await fetch(url);
    const json = await response.json();

    if (!json.routes || json.routes.length === 0) return null;

    const route = json.routes[0];
    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      geometry: route.geometry,
    };
  } catch (error) {
    console.log('OSRM Error:', error);
    return null;
  }
};

// ─── Continuous background tracking ──────────────────────────────────────
let _trackingWatchId = null;

export const startTracking = (onNewLocation, intervalMs = 30000) => {
  if (_trackingWatchId !== null) {
    Geolocation.clearWatch(_trackingWatchId);
    _trackingWatchId = null;
  }

  _trackingWatchId = Geolocation.watchPosition(
    position => {
      onNewLocation(position.coords, new Date().toISOString());
    },
    error => {
      console.log('Tracking error:', error.message);
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 20,
      interval: intervalMs,
      fastestInterval: 10000,
    },
  );

  return () => {
    if (_trackingWatchId !== null) {
      Geolocation.clearWatch(_trackingWatchId);
      _trackingWatchId = null;
    }
  };
};

export const stopTracking = () => {
  if (_trackingWatchId !== null) {
    Geolocation.clearWatch(_trackingWatchId);
    _trackingWatchId = null;
  }
};