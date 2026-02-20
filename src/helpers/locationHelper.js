import { Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import polyline from '@mapbox/polyline';

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    return true;
  }

  // Android
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
    console.log(granted, 'granted');

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn(err);
    return false;
  }
};

export const fetchLocation = async (): Promise<Geolocation.GeoCoordinates> => {
  const hasPermission = await requestLocationPermission();

  if (!hasPermission) {
    throw new Error('Location permission denied');
  }

  return new Promise((resolve, reject) => {
    const watchId = Geolocation.watchPosition(
      position => {
        Geolocation.clearWatch(watchId);
        resolve(position.coords);
      },
      error => {
        reject(error);
      },
      {
        enableHighAccuracy: false,
        distanceFilter: 0,
        interval: 5000,
        fastestInterval: 2000,
      }
    );
  });
};


export const getAddressFromCoords = async (
  latitude: number,
  longitude: number,
) => {
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

    if (!response.ok) {
      return { data: null };
    }

    const json = await response.json();
    console.log(json, 'json');

    // Return the response in the expected format
    if (json && typeof json === 'object') {
      return json;
    }

    return { data: null };
  } catch (error) {
    console.error('Address fetch error:', error);
    return { data: null };
  }
};

let trackingInterval: NodeJS.Timeout | null = null;

export const startTracking = (
  onNewLocation: (
    coords: Geolocation.GeoCoordinates,
    timestamp: string,
  ) => void,
): (() => void) => {
  if (trackingInterval) {
    clearInterval(trackingInterval);
  }

  trackingInterval = setInterval(async () => {
    try {
      const position = await fetchLocation();
      onNewLocation(position, new Date().toISOString());
    } catch (err) {
      console.log('Track location failed:', err);
    }
  }, 30000);

  return () => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }
  };
};

export const stopTracking = () => {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
};

export const getRoutePolyline = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
) => {
  const API_KEY = "AIzaSyA02lUPnWpLfGUPeliw3RBHYrszdobP38U";

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${API_KEY}`;

  const res = await fetch(url);
  const json = await res.json();

  if (json.routes.length) {
    return json.routes[0].overview_polyline.points;
  }

  return null;
};


export const getRoadRoute = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=polyline`;

    const response = await fetch(url);
    const json = await response.json();

    if (!json.routes || json.routes.length === 0) {
      return null;
    }

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

export const getRoadDistanceKm = async (
  originLat,
  originLng,
  destLat,
  destLng
) => {
  try {
    console.log(originLat, 'originLat');
    console.log(originLng, 'originLng');
    console.log(destLat, 'destLat');
    console.log(destLng, 'destLng');




    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;

    const response = await fetch(url);
    const json = await response.json();

    if (!json.routes || json.routes.length === 0) {
      return null;
    }

    const route = json.routes[0];

    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch (error) {
    console.log("OSRM Error:", error);
    return null;
  }
};
