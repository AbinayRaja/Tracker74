export const calculateTimeDifference = (
  lat1: number,


  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Earth radius in km

  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Calculate total distance traveled along a route
 * @param points - Array of location points with latitude and longitude
 * @returns Total distance in kilometers
 */
export const calculateTotalDistance = (points: Array<{ latitude: number, longitude: number }>): number => {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currentPoint = points[i];

    const distance = calculateDistanceKm(
      prevPoint.latitude,
      prevPoint.longitude,
      currentPoint.latitude,
      currentPoint.longitude
    );

    totalDistance += distance;
  }

  return Math.round(totalDistance * 100) / 100;
};

/**
 * Get average speed in km/h
 * @param distanceKm - Total distance traveled in km
 * @param durationMinutes - Total duration in minutes
 * @returns Average speed in km/h
 */
export const calculateAverageSpeed = (distanceKm: number, durationMinutes: number): number => {
  if (durationMinutes === 0) return 0;
  const durationHours = durationMinutes / 60;
  return Math.round((distanceKm / durationHours) * 100) / 100;
};

/**
 * Convert duration object to minutes
 * @param duration - Object with hours and minutes
 * @returns Total minutes
 */
export const durationToMinutes = (duration: { hours: number, minutes: number }): number => {
  return duration.hours * 60 + duration.minutes;
};

