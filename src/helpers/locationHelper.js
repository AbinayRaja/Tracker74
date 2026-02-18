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
export const getRoadDistanceKm = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<number> => {

  const API_KEY = "AIzaSyA02lUPnWpLfGUPeliw3RBHYrszdobP38U";

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${API_KEY}`;

  try {
    const res = await fetch(url);
    const json = await res.json();

    if (json.routes.length) {
      const encoded = json.routes[0].overview_polyline.points;
      const decoded = polyline.decode(encoded);

      let total = 0;

      for (let i = 1; i < decoded.length; i++) {
        const [lat1, lng1] = decoded[i - 1];
        const [lat2, lng2] = decoded[i];

        total += calculateDistanceKm(lat1, lng1, lat2, lng2);
      }

      return Math.round(total * 100) / 100;
    }

    return 0;

  } catch (err) {
    console.log("Road distance error:", err);
    return 0;
  }
};
