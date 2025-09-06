import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { WorkoutContext } from "../../context/WorkoutContext";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as Location from "expo-location";
import haversine from "haversine";

export default function HomeScreen() {
  const router = useRouter();
  const { workouts } = useContext(WorkoutContext);

  const screenHeight = Dimensions.get("window").height;

  const stepsPerKm = 1300;
  const weightKg = 70;
  const SPEED_THRESHOLD_KMH = 1;
  const ADAPTIVE_BUFFER_SIZE = 5;
  const MIN_THRESHOLD_KM = 0.0002;
  const MAX_THRESHOLD_KM = 0.001;

  const movingGoal = 30;
  const caloriesGoal = 400;
  const stepsGoal = 6000;

  const [steps, setSteps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [moving, setMoving] = useState(0);

  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const stepsRef = useRef(0);
  const caloriesRef = useRef(0);
  const movingSecondsRef = useRef(0);
  const recentDistances = useRef<number[]>([]);
  const lastStopRef = useRef<number | null>(null);

  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;

    // --- Калман фильтр ---
    let lastLat = 0;
    let lastLon = 0;
    const R = 0.0001; // шум GPS
    const Q = 0.0001; // процессный шум
    const kalmanFilter = (prev: number, current: number) => {
      const K = Q / (Q + R);
      return prev + K * (current - prev);
    };

    const initLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Ошибка", "Разрешение на геолокацию не получено");
        return;
      }

      try {
        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        lastLocationRef.current = { latitude: initial.coords.latitude, longitude: initial.coords.longitude };
        lastTimestampRef.current = Date.now();
        lastLat = initial.coords.latitude;
        lastLon = initial.coords.longitude;
      } catch (e) {}

      locationSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          const newLat = kalmanFilter(lastLat, loc.coords.latitude);
          const newLon = kalmanFilter(lastLon, loc.coords.longitude);
          lastLat = newLat;
          lastLon = newLon;

          const newPoint = { latitude: newLat, longitude: newLon };
          const now = Date.now();

          const prev = lastLocationRef.current;
          const prevTime = lastTimestampRef.current;

          if (prev && prevTime) {
            let dKm = haversine(prev, newPoint, { unit: "km" }) || 0;
            const deltaSec = Math.max((now - prevTime) / 1000, 0.001);
            const gpsSpeed = loc.coords.speed != null ? loc.coords.speed * 3.6 : 0;

            // --- адаптивный фильтр шума ---
            recentDistances.current.push(dKm);
            if (recentDistances.current.length > ADAPTIVE_BUFFER_SIZE) recentDistances.current.shift();
            const avgD = recentDistances.current.reduce((a, b) => a + b, 0) / recentDistances.current.length;
            const adaptiveThreshold = Math.max(MIN_THRESHOLD_KM, Math.min(MAX_THRESHOLD_KM, avgD * 2));

            let isMoving = false;
            if (dKm > adaptiveThreshold && gpsSpeed >= SPEED_THRESHOLD_KMH) isMoving = true;

            if (isMoving) {
              distanceRef.current += dKm;
              const newSteps = Math.round(distanceRef.current * stepsPerKm);
              stepsRef.current = Math.max(stepsRef.current, newSteps);
              setSteps(stepsRef.current);

              caloriesRef.current += weightKg * dKm;
              setCalories(Math.round(caloriesRef.current));

              movingSecondsRef.current += 1;
              setMoving(Math.floor(movingSecondsRef.current / 60));
            }

            if (!isMoving && gpsSpeed < SPEED_THRESHOLD_KMH) {
              if (!lastStopRef.current) lastStopRef.current = now;
              if (now - lastStopRef.current > 2000) {
                // стоим на месте
              }
            } else {
              lastStopRef.current = null;
            }
          }

          lastLocationRef.current = newPoint;
          lastTimestampRef.current = now;
        }
      );
    };

    initLocation();

    return () => {
      if (locationSub) locationSub.remove();
    };
  }, []);

  const goToWorkout = (mode: string) => {
    router.push(`/workout-map?mode=${mode}`);
  };

  return (
    <LinearGradient
      colors={['#000000', '#1a1a1a', '#43464B', '#6d6f73', '#43464B', '#1a1a1a', '#000000']}
      locations={[0, 0.2, 0.4, 0.6, 0.75, 0.9, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={[styles.contentContainer, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: screenHeight * 0.1 }} />

        <View style={styles.ringsContainer}>
          <AnimatedCircularProgress
            size={200}
            width={20}
            fill={(calories / caloriesGoal) * 100}
            tintColor="#FF6B6B"
            backgroundColor="rgba(255, 107, 107, 0.2)"
            arcSweepAngle={180}
            rotation={-90}
            lineCap="round"
          />
          <AnimatedCircularProgress
            size={160}
            width={20}
            fill={(steps / stepsGoal) * 100}
            tintColor="#FFD93D"
            backgroundColor="rgba(255, 217, 61, 0.2)"
            arcSweepAngle={180}
            rotation={-90}
            lineCap="round"
            style={styles.innerRing}
          />
          <AnimatedCircularProgress
            size={120}
            width={20}
            fill={(moving / movingGoal) * 100}
            tintColor="#4ECDC4"
            backgroundColor="rgba(78, 205, 196, 0.2)"
            arcSweepAngle={180}
            rotation={-90}
            lineCap="round"
            style={styles.innerRing}
          />
        </View>

        <Text style={styles.header}>Today's Activity</Text>

        <View style={styles.card}>
          <View style={styles.statRow}>
            <View style={styles.labelRow}><Text style={styles.label}>🔥 Calories</Text><View style={[styles.dot, { backgroundColor: "#ff4081" }]} /></View>
            <Text style={styles.value}>{Math.round(calories)}/{caloriesGoal} kcal</Text>
          </View>
          <View style={styles.statRow}>
            <View style={styles.labelRow}><Text style={styles.label}>👟 Steps</Text><View style={[styles.dot, { backgroundColor: "#ffa500" }]} /></View>
            <Text style={styles.value}>{steps}/{stepsGoal}</Text>
          </View>
          <View style={styles.statRow}>
            <View style={styles.labelRow}><Text style={styles.label}>⏱ Moving</Text><View style={[styles.dot, { backgroundColor: "#2196f3" }]} /></View>
            <Text style={styles.value}>{moving}/{movingGoal} mins</Text>
          </View>
        </View>

        <View style={styles.activitiesRow}>
          <TouchableOpacity style={styles.activityButton} onPress={() => goToWorkout("running")}><Icon name="run" size={28} color="#fff" /><Text style={styles.activityText}>Running</Text></TouchableOpacity>
          <TouchableOpacity style={styles.activityButton} onPress={() => goToWorkout("walking")}><Icon name="walk" size={28} color="#fff" /><Text style={styles.activityText}>Walking</Text></TouchableOpacity>
          <TouchableOpacity style={styles.activityButton} onPress={() => goToWorkout("bike")}><Icon name="bike" size={28} color="#fff" /><Text style={styles.activityText}>Bike</Text></TouchableOpacity>
          <TouchableOpacity style={styles.activityButton} onPress={() => goToWorkout("more")}><Icon name="dots-horizontal" size={28} color="#fff" /><Text style={styles.activityText}>More</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { fontSize: 28, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 20 },
  contentContainer: { alignItems: "center" },
  ringsContainer: { alignItems: "center", justifyContent: "center" },
  innerRing: { position: "absolute" },
  card: { backgroundColor: "#1c1c1e", borderRadius: 12, padding: 20, width: "100%", marginBottom: 20 },
  statRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  labelRow: { flexDirection: "row", alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, marginLeft: 4 },
  label: { color: "#fff", fontSize: 16 },
  value: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  activitiesRow: { flexDirection: "row", justifyContent: "space-around", width: "100%", backgroundColor: "#1c1c1e", borderRadius: 12, paddingVertical: 12, marginBottom: 8 },
  activityButton: { alignItems: "center", width: "23%" },
  activityText: { color: "#fff", fontSize: 14, marginTop: 4, textAlign: "center" },
});
