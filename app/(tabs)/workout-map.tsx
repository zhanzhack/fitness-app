import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import haversine from "haversine";
import { useRouter, useLocalSearchParams } from "expo-router";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { styles } from "../../lib/styles/workout-map.styles";

import { supabase } from "../../lib/supabase";
import { getGuestId } from "../../lib/guest";
import UUID from "react-native-uuid";

type TargetMode = "none" | "distance" | "duration" | "calories";

export default function WorkoutMap() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = (params.mode as string) ?? "running";

  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [steps, setSteps] = useState<number>(0);
  const [showTargetMenu, setShowTargetMenu] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<TargetMode>("none");

  const webviewRef = useRef<WebView>(null);
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const distanceRef = useRef<number>(0);
  const stepsRef = useRef<number>(0);
  const speedBuffer = useRef<number[]>([]);
  const lastStopRef = useRef<number | null>(null);
  const recentDistances = useRef<number[]>([]);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const maxSpeedRef = useRef<number>(0);
  const accelBuffer = useRef<number[]>([]);
  const lastStepTime = useRef<number>(0);

  const stepsPerKm = 1300;
  const SPEED_BUFFER_SEC = 5;
  const MIN_SPEED_KMH = 1.0;
  const STOP_TIMEOUT = 3000;
  const ADAPTIVE_BUFFER_SIZE = 3;
  const MIN_DISTANCE_MOVED = 0.002;
  const MAX_THRESHOLD_KM = 0.001;
  const directionBuffer = useRef<{ x: number; y: number; z: number }[]>([]);
  // --- Geolocation tracking ---
  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;

    const initLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Ошибка", "Разрешение на геолокацию не получено");
        return;
      }

      try {
        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const initialPoint = { latitude: initial.coords.latitude, longitude: initial.coords.longitude };
        lastLocationRef.current = initialPoint;
        lastTimestampRef.current = Date.now();
        setLocation(initialPoint);
        webviewRef.current?.postMessage(JSON.stringify(initialPoint));
      } catch (e) {}

      locationSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          const newPoint = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          const now = Date.now();
          webviewRef.current?.postMessage(JSON.stringify(newPoint));

          const prev = lastLocationRef.current;
          const prevTime = lastTimestampRef.current;

          if (prev && prevTime && started && countdown === null && !paused) {
            const dKm = haversine(prev, newPoint, { unit: "km" }) || 0;
            const deltaSec = Math.max((now - prevTime) / 1000, 0.001);
            const gpsSpeed = loc.coords.speed != null ? loc.coords.speed * 3.6 : 0;

            // --- адаптивный фильтр движения ---
            recentDistances.current.push(dKm);
            if (recentDistances.current.length > ADAPTIVE_BUFFER_SIZE) recentDistances.current.shift();
            const avgD = recentDistances.current.reduce((a, b) => a + b, 0) / recentDistances.current.length;
            const adaptiveThreshold = Math.max(MIN_DISTANCE_MOVED, Math.min(MAX_THRESHOLD_KM, avgD * 2));
            const isMoving = (avgD > adaptiveThreshold) || gpsSpeed >= MIN_SPEED_KMH;

            if (isMoving) {
              const deltaStepsRaw = Math.round(dKm * stepsPerKm);
              const MAX_STEPS_PER_TICK = 4;
              const deltaSteps = dKm * 1000 > 5 ? 0 : Math.min(deltaStepsRaw, MAX_STEPS_PER_TICK);

              if (deltaSteps > 0) {
                const newDistance = distanceRef.current + dKm;
                distanceRef.current = newDistance;
                setDistance(newDistance);

                stepsRef.current += deltaSteps;
                setSteps(stepsRef.current);

                const baseSpeed = Math.max((dKm / deltaSec) * 3600, gpsSpeed);
                speedBuffer.current.push(baseSpeed);
                if (speedBuffer.current.length > SPEED_BUFFER_SEC) speedBuffer.current.shift();
                const smoothed = speedBuffer.current.reduce((a, b) => a + b, 0) / speedBuffer.current.length;
                setSpeed(smoothed);

                if (baseSpeed > maxSpeedRef.current) maxSpeedRef.current = baseSpeed;
                lastStopRef.current = null;
              }
            } else {
              if (!lastStopRef.current) lastStopRef.current = now;
              if (now - lastStopRef.current > STOP_TIMEOUT) setSpeed(0);
            }
          } else {
            const initialSpeed = loc.coords.speed != null && loc.coords.speed * 3.6 >= MIN_SPEED_KMH ? loc.coords.speed * 3.6 : 0;
            setSpeed(initialSpeed);
          }

          lastLocationRef.current = newPoint;
          lastTimestampRef.current = now;
          setLocation(newPoint);
        }
      );
    };

    initLocation();
    return () => { if (locationSub) locationSub.remove(); };
  }, [started, paused, countdown]);



  // --- Accelerometer step detection ---
useEffect(() => {
  if (!started) return;

  const STEP_INTERVAL = 400;
  const BUFFER_SIZE = 8;
  const BASE_THRESHOLD = 1.2;
  const MIN_STEP_MAGNITUDE = 1.05;
  const FLAT_THRESHOLD = 0.02;
  const MIN_SPEED = 0.5;
  const jerkThreshold = 0.8;
  const directionBufferSize = 5;

  const subscription = Accelerometer.addListener(acc => {
    const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
    const horizontal = Math.sqrt(acc.x ** 2 + acc.y ** 2);

    if (horizontal < FLAT_THRESHOLD && Math.abs(acc.z - 1) < FLAT_THRESHOLD) return;

    accelBuffer.current.push(magnitude);
    if (accelBuffer.current.length > BUFFER_SIZE) accelBuffer.current.shift();
    const avgMag = accelBuffer.current.reduce((a, b) => a + b, 0) / accelBuffer.current.length;

    const mean = avgMag;
    const variance =
      accelBuffer.current.reduce((sum, val) => sum + (val - mean) ** 2, 0) / accelBuffer.current.length;
    const stdDev = Math.sqrt(variance);

    const now = Date.now();
    const adaptiveThreshold = BASE_THRESHOLD + 0.2 * Math.sin(duration / 10) + stdDev * 0.5;

    // --- направление ---
    directionBuffer.current.push({ x: acc.x, y: acc.y, z: acc.z });
    if (directionBuffer.current.length > directionBufferSize) directionBuffer.current.shift();

    const last = directionBuffer.current[directionBuffer.current.length - 1];
    const prev = directionBuffer.current[0];
    const deltaX = Math.abs(last.x - prev.x);
    const deltaY = Math.abs(last.y - prev.y);
    const deltaZ = Math.abs(last.z - prev.z);

    const wasStable = accelBuffer.current.every(val => Math.abs(val - mean) < 0.05);
    if ((deltaX > jerkThreshold || deltaY > jerkThreshold || deltaZ > jerkThreshold) && wasStable) {
      return;
    }

    const isMoving = speed >= MIN_SPEED;
    if (
      avgMag > adaptiveThreshold &&
      avgMag > MIN_STEP_MAGNITUDE &&
      now - lastStepTime.current > STEP_INTERVAL &&
      isMoving
    ) {
      lastStepTime.current = now;
      stepsRef.current += 1;
      setSteps(stepsRef.current);
    }
  });

  Accelerometer.setUpdateInterval(100);
  return () => subscription.remove();
}, [started, duration, speed]);




  // --- Countdown ---
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => (c ? c - 1 : 0)), 1000);
    } else if (countdown === 0) setCountdown(null);
    return () => { if (timer) clearTimeout(timer); };
  }, [countdown]);

  // --- Duration interval ---
  useEffect(() => {
    if (started && countdown === null && !paused) {
      durationInterval.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
    } else {
      if (durationInterval.current) clearInterval(durationInterval.current);
    }
    return () => { if (durationInterval.current) clearInterval(durationInterval.current); };
  }, [started, paused, countdown]);

  // --- Supabase save ---
  const saveWorkout = async () => {
    try {
      const guestId = await getGuestId();
      const workoutId = UUID.v4() as string;
      const { data: { user } } = await supabase.auth.getUser();

      const workout = {
        id: workoutId,
        user_id: user?.id || null,
        guest_id: user ? null : guestId,
        type: mode,
        duration,
        distance,
        steps,
        calories: Math.round(distance * 60),
        avg_speed: distance / (duration / 3600),
        max_speed: maxSpeedRef.current,
        water_loss: Math.round((duration / 3600) * 0.7 * 100) / 100,
      };

      const { data, error } = await supabase.from("workouts").insert([workout]);
      if (error) console.log("Error saving workout:", error);
      else console.log("Workout saved:", data);
    } catch (e) {
      console.log("Save workout exception:", e);
    }
  };

  const handleStart = () => {
    distanceRef.current = 0;
    stepsRef.current = 0;
    speedBuffer.current = [];
    lastLocationRef.current = null;
    lastTimestampRef.current = null;
    recentDistances.current = [];
    maxSpeedRef.current = 0;
    accelBuffer.current = [];
    lastStepTime.current = 0;

    setDistance(0);
    setSteps(0);
    setSpeed(0);
    setDuration(0);
    setCountdown(3);
    setStarted(true);
    setPaused(false);
  };

  const handlePause = () => setPaused(true);
  const handleResume = () => setPaused(false);

  const handleStop = async () => {
    setStarted(false);
    setPaused(false);
    await saveWorkout();

    lastLocationRef.current = null;
    lastTimestampRef.current = null;
    distanceRef.current = 0;
    stepsRef.current = 0;
    speedBuffer.current = [];
    recentDistances.current = [];
    maxSpeedRef.current = 0;
    accelBuffer.current = [];
    lastStepTime.current = 0;

    setLocation(null);
    setDistance(0);
    setSpeed(0);
    setDuration(0);
    setSteps(0);
    setSelectedTarget("none");
  };

  const handleCenterLocation = () => {
    if (location && webviewRef.current) webviewRef.current.postMessage(JSON.stringify(location));
  };

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2,"0")}:${seconds.toString().padStart(2,"0")}`;
  };

  const getTargetText = () => {
    switch (selectedTarget) {
      case "distance": return "Distance target";
      case "duration": return "Duration target";
      case "calories": return "Calorie target";
      default: return "No target";
    }
  };

  const mapHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map = L.map('map').setView([50.4501, 30.5234], 15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);let marker;let polyline=L.polyline([], { color: 'blue', weight: 5 }).addTo(map);function handleMessage(data){try{const lat=data.latitude;const lon=data.longitude;if(typeof lat==='number'&&typeof lon==='number'){const latlng=[lat,lon];if(!marker){marker=L.marker(latlng).addTo(map).bindPopup('You').openPopup();}else{marker.setLatLng(latlng);}polyline.addLatLng(latlng);map.panTo(latlng);}}catch(e){}}document.addEventListener('message',e=>handleMessage(JSON.parse(e.data)));window.addEventListener('message',e=>handleMessage(JSON.parse(e.data)));</script></body></html>`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          originWhitelist={["*"]}
          source={{ html: mapHtml }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
        />
        <TouchableOpacity style={styles.buttonLocationTop} onPress={handleCenterLocation}>
          <Icon name="crosshairs-gps" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {started || countdown !== null ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {countdown !== null && <Text style={styles.countdownText}>Starting in {countdown}...</Text>}

          {started && countdown === null && (
            <>
              <View style={styles.metricsContainer}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Duration</Text>
                  <Text style={styles.metricValue}>{formatDuration(duration)}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Distance</Text>
                  <Text style={styles.metricValue}>{distance.toFixed(2)} km</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Speed</Text>
                  <Text style={styles.metricValue}>{speed.toFixed(2)} km/h</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Steps</Text>
                  <Text style={styles.metricValue}>{steps}</Text>
                </View>
              </View>

              <View style={styles.startedButtons}>
                {paused ? (
                  <TouchableOpacity style={styles.buttonResume} onPress={handleResume}>
                    <Text style={styles.buttonText}>Resume</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.buttonPause} onPress={handlePause}>
                    <Text style={styles.buttonText}>Pause</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.buttonStop} onPress={handleStop}>
                  <Text style={styles.buttonText}>Stop</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <View style={styles.initialControls}>
          <View style={styles.targetContainer}>
            <TouchableOpacity style={styles.targetButton} onPress={() => setShowTargetMenu(!showTargetMenu)}>
              <Text style={styles.targetText}>{getTargetText()}</Text>
              <Icon name={showTargetMenu ? "chevron-down" : "chevron-up"} size={20} color="#fff" />
            </TouchableOpacity>

            {showTargetMenu && (
              <View style={styles.targetMenuUp}>
                {["distance","duration","calories","none"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={styles.targetMenuItem}
                    onPress={() => { setSelectedTarget(t as TargetMode); setShowTargetMenu(false); }}
                  >
                    <Text style={styles.targetMenuItemText}>
                      {t === "none" ? "No target" : t.charAt(0).toUpperCase() + t.slice(1) + " target"}
                    </Text>
                    {t === selectedTarget && <Icon name="check" size={20} color="#5cb85c" style={{ marginLeft:"auto" }}/>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleStart}>
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
