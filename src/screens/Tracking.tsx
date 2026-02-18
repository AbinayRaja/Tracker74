// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   SafeAreaView,
// } from 'react-native';
// import {useNavigation} from '@react-navigation/native';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// import MapComponent from '../components/MapComponent';
// import {
//   requestLocationPermission,
//   startTracking,
// } from '../helpers/locationHelper';
// import {
//   calculateDistanceKm,
//   calculateTimeDifference,
// } from '../helpers/calculateKm';

// interface LocationPoint {
//   latitude: number;
//   longitude: number;
//   timestamp?: string;
// }

// const Tracking = ({route}) => {
//   const navigation = useNavigation();
//   const {checkInRecord} = route.params || {};

//   const [isTracking, setIsTracking] = useState(false);
//   const [trackPoints, setTrackPoints] = useState<LocationPoint[]>([]);
//   const [totalDistance, setTotalDistance] = useState(0);
//   const [totalDuration, setTotalDuration] = useState({hours: 0, minutes: 0});
//   const [sessionStats, setSessionStats] = useState(null);

//   const stopTrackingRef = useRef<(() => void) | null>(null);

//   useEffect(() => {
//     const initializeTracking = async () => {
//       if (checkInRecord) {
//         setTrackPoints([checkInRecord.coords]);
//       }
//       await checkLocationPermissionAndStart();
//     };

//     initializeTracking();

//     return () => {
//       if (stopTrackingRef.current) {
//         stopTrackingRef.current();
//       }
//     };
//   }, []);

//   const checkLocationPermissionAndStart = async () => {
//     try {
//       const hasPermission = await requestLocationPermission();
//       if (!hasPermission) {
//         Alert.alert(
//           'Permission Denied',
//           'Location permission is required for tracking.',
//         );
//         navigation.goBack();
//         return;
//       }
//       handleStartTracking();
//     } catch (err) {
//       console.error('Permission check failed:', err);
//       Alert.alert('Error', 'Failed to check location permission.');
//     }
//   };

//   const handleStartTracking = () => {
//     setIsTracking(true);

//     const stopFn = startTracking((newCoords, timestamp) => {
//       const newPoint = {
//         latitude: newCoords.latitude,
//         longitude: newCoords.longitude,
//         timestamp,
//       };

//       setTrackPoints(prevPoints => {
//         const updatedPoints = [...prevPoints, newPoint];

//         // Calculate total distance
//         let totalKm = 0;
//         for (let i = 1; i < updatedPoints.length; i++) {
//           const dist = calculateDistanceKm(
//             updatedPoints[i - 1].latitude,
//             updatedPoints[i - 1].longitude,
//             updatedPoints[i].latitude,
//             updatedPoints[i].longitude,
//           );
//           totalKm += dist;
//         }

//         setTotalDistance(totalKm);

//         // Calculate duration
//         if (updatedPoints.length > 1) {
//           const firstTimestamp = updatedPoints[0].timestamp;
//           const lastTimestamp =
//             updatedPoints[updatedPoints.length - 1].timestamp;

//           if (firstTimestamp && lastTimestamp) {
//             const duration = calculateTimeDifference(
//               firstTimestamp,
//               lastTimestamp,
//             );
//             setTotalDuration(duration);
//           }
//         }

//         return updatedPoints;
//       });
//     });

//     stopTrackingRef.current = stopFn;
//   };

//   const handleStopTracking = () => {
//     if (stopTrackingRef.current) {
//       stopTrackingRef.current();
//       stopTrackingRef.current = null;
//     }

//     setIsTracking(false);

//     if (trackPoints.length > 1) {
//       const summary = {
//         startPoint: trackPoints[0],
//         endPoint: trackPoints[trackPoints.length - 1],
//         intermediatePoints: trackPoints.slice(1, -1),
//         totalDistance,
//         totalDuration,
//         trackingPoints: trackPoints,
//       };

//       setSessionStats(summary);

//       Alert.alert(
//         'Tracking Complete',
//         `Distance: ${totalDistance.toFixed(2)} km\nDuration: ${
//           totalDuration.hours
//         }h ${totalDuration.minutes}m`,
//         [
//           {
//             text: 'View Route',
//             onPress: () => {
//               // Keep the map visible with the route
//             },
//           },
//           {
//             text: 'Save & Exit',
//             onPress: async () => {
//               try {
//                 const TRACKING_HISTORY_KEY = '@tracking_history';
//                 let history = [];
//                 const json = await AsyncStorage.getItem(TRACKING_HISTORY_KEY);
//                 if (json) {
//                   history = JSON.parse(json);
//                 }

//                 history.push({
//                   ...summary,
//                   savedAt: new Date().toISOString(),
//                 });

//                 if (history.length > 30) {
//                   history = history.slice(-30);
//                 }
//                 await AsyncStorage.setItem(
//                   TRACKING_HISTORY_KEY,
//                   JSON.stringify(history),
//                 );

//                 navigation.goBack();
//               } catch (err) {
//                 console.error('Failed to save tracking:', err);
//                 Alert.alert('Error', 'Failed to save tracking data.');
//               }
//             },
//           },
//         ],
//       );
//     }
//   };

//   const handleResume = () => {
//     setIsTracking(true);
//     setSessionStats(null);
//     handleStartTracking();
//   };

//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <View style={styles.container}>
//         {/* Header */}
//         <View style={styles.header}>
//           <Text style={styles.headerTitle}>Real-Time Route Tracking</Text>
//           <TouchableOpacity
//             style={styles.closeBtn}
//             onPress={() => {
//               if (isTracking && stopTrackingRef.current) {
//                 stopTrackingRef.current();
//               }
//               navigation.goBack();
//             }}>
//             <Text style={styles.closeBtnText}>✕</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Map Component */}
//         <MapComponent
//           trackPoints={trackPoints.slice(1)}
//           startPoint={trackPoints[0] || null}
//           endPoint={sessionStats?.endPoint || null}
//           totalDistance={totalDistance}
//           duration={totalDuration}
//           isLiveTracking={isTracking}
//         />

//         {/* Control Panel */}
//         <View style={styles.controlPanel}>
//           {!sessionStats ? (
//             <TouchableOpacity
//               style={[
//                 styles.controlBtn,
//                 isTracking ? styles.stopBtn : styles.startBtn,
//               ]}
//               onPress={isTracking ? handleStopTracking : handleStartTracking}>
//               <Text style={styles.controlBtnText}>
//                 {isTracking ? '⏹ STOP TRACKING' : '▶ START TRACKING'}
//               </Text>
//             </TouchableOpacity>
//           ) : (
//             <>
//               <View style={styles.summaryBox}>
//                 <View style={styles.summaryRow}>
//                   <Text style={styles.summaryLabel}>Total Distance:</Text>
//                   <Text style={styles.summaryValue}>
//                     {totalDistance.toFixed(2)} km
//                   </Text>
//                 </View>
//                 <View style={styles.summaryRow}>
//                   <Text style={styles.summaryLabel}>Duration:</Text>
//                   <Text style={styles.summaryValue}>
//                     {totalDuration.hours}h {totalDuration.minutes}m
//                   </Text>
//                 </View>
//                 <View style={styles.summaryRow}>
//                   <Text style={styles.summaryLabel}>Total Points:</Text>
//                   <Text style={styles.summaryValue}>{trackPoints.length}</Text>
//                 </View>
//               </View>

//               <View style={styles.actionRow}>
//                 <TouchableOpacity
//                   style={[styles.controlBtn, styles.resumeBtn]}
//                   onPress={handleResume}>
//                   <Text style={styles.controlBtnText}>▶ RESUME</Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   style={[styles.controlBtn, styles.exitBtn]}
//                   onPress={() => {
//                     try {
//                       const TRACKING_HISTORY_KEY = '@tracking_history';
//                       AsyncStorage.getItem(TRACKING_HISTORY_KEY).then(json => {
//                         let history = [];
//                         if (json) {
//                           history = JSON.parse(json);
//                         }

//                         history.push({
//                           startPoint: trackPoints[0],
//                           endPoint: trackPoints[trackPoints.length - 1],
//                           intermediatePoints: trackPoints.slice(1, -1),
//                           totalDistance,
//                           totalDuration,
//                           trackingPoints: trackPoints,
//                           savedAt: new Date().toISOString(),
//                         });

//                         if (history.length > 30) {
//                           history = history.slice(-30);
//                         }
//                         AsyncStorage.setItem(
//                           TRACKING_HISTORY_KEY,
//                           JSON.stringify(history),
//                         );
//                         navigation.goBack();
//                       });
//                     } catch (err) {
//                       console.error('Failed to save:', err);
//                     }
//                   }}>
//                   <Text style={styles.controlBtnText}>✓ SAVE & EXIT</Text>
//                 </TouchableOpacity>
//               </View>
//             </>
//           )}
//         </View>

//         {/* Info Box */}
//         <View style={styles.infoBox}>
//           <Text style={styles.infoText}>
//             {isTracking
//               ? '📍 Tracking active. Your route is being recorded with GPS coordinates.'
//               : '⏸ Tracking paused. Tap RESUME to continue tracking.'}
//           </Text>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   container: {
//     flex: 1,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 26,
//     paddingVertical: 20,
//     backgroundColor: '#fff',
//     borderBottomWidth: 1,
//     borderBottomColor: '#e5e7eb',
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#1f2937',
//     marginBottom: -30,
//   },
//   closeBtn: {
//     width: 32,
//     height: 32,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderRadius: 16,
//     backgroundColor: '#f3f4f6',
//   },
//   closeBtnText: {
//     fontSize: 20,
//     color: '#6b7280',
//   },
//   controlPanel: {
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     backgroundColor: '#f9fafb',
//     borderTopWidth: 1,
//     borderTopColor: '#e5e7eb',
//   },
//   controlBtn: {
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     justifyContent: 'center',
//     alignItems: 'center',
//     fontWeight: '600',
//   },
//   startBtn: {
//     backgroundColor: '#10b981',
//   },
//   stopBtn: {
//     backgroundColor: '#ef4444',
//   },
//   resumeBtn: {
//     backgroundColor: '#3b82f6',
//     flex: 1,
//     marginRight: 8,
//   },
//   exitBtn: {
//     backgroundColor: '#6366f1',
//     flex: 1,
//     marginLeft: 8,
//   },
//   controlBtnText: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#fff',
//   },
//   summaryBox: {
//     backgroundColor: '#eff6ff',
//     borderLeftWidth: 4,
//     borderLeftColor: '#3b82f6',
//     paddingVertical: 12,
//     paddingHorizontal: 12,
//     borderRadius: 6,
//     marginBottom: 12,
//   },
//   summaryRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginVertical: 4,
//   },
//   summaryLabel: {
//     fontSize: 13,
//     color: '#6b7280',
//     fontWeight: '500',
//   },
//   summaryValue: {
//     fontSize: 13,
//     fontWeight: '700',
//     color: '#1f2937',
//   },
//   actionRow: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   infoBox: {
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     backgroundColor: '#fef3c7',
//     borderLeftWidth: 4,
//     borderLeftColor: '#f59e0b',
//     marginHorizontal: 12,
//     marginBottom: 12,
//     borderRadius: 6,
//   },
//   infoText: {
//     fontSize: 13,
//     color: '#92400e',
//     fontWeight: '500',
//   },
// });

// export default Tracking;
