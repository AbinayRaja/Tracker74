// ─── Time difference ──────────────────────────────────────────────────────
export const calculateTimeDifference = (startISO, endISO) => {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  const diffMs = Math.max(0, end - start);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
};

// ─── Haversine formula (straight-line distance) ───────────────────────────
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = v => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Total path distance ──────────────────────────────────────────────────
export const calculateTotalDistance = points => {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += calculateDistanceKm(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude,
    );
  }
  return Math.round(total * 100) / 100;
};