import { useState, useEffect, useRef } from "react";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import haversine from "haversine";
import { supabase } from "./supabase";
import { getGuestId } from "./guest";
import UUID from "react-native-uuid";
import { WebView } from "react-native-webview";

const stepsPerKm = 1300;
const SPEED_BUFFER_SEC = 5;
const MIN_SPEED_KMH = 0.5; // снизили порог для более раннего отслеживания
const STOP_TIMEOUT = 3000;
const ADAPTIVE_BUFFER_SIZE = 3;
const MAX_GPS_JUMP_METERS = 50;
const MAX_SPEED_JUMP = 10;

export function useWorkoutLogic(mode: string, webviewRef: React.RefObject<WebView>) {
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [steps, setSteps] = useState<number>(0);
  const [cadence, setCadence] = useState<number>(0);

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

  // --- Geolocation tracking ---
  useEffect(() => {
    if (!started) return;
    let locationSub: Location.LocationSubscription | null = null;

    const initLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const initialPoint = { latitude: initial.coords.latitude, longitude: initial.coords.longitude };
      lastLocationRef.current = initialPoint;
      lastTimestampRef.current = Date.now();
      setLocation(initialPoint);
      webviewRef.current?.postMessage(JSON.stringify(initialPoint));

      locationSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          const newPoint = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          const now = Date.now();
          webviewRef.current?.postMessage(JSON.stringify(newPoint));

          const gpsSpeed = loc.coords.speed != null ? loc.coords.speed * 3.6 : 0;

          const prev = lastLocationRef.current;
          const prevTime = lastTimestampRef.current;

          if (prev && prevTime && !paused && countdown === null) {
            const dKm = haversine(prev, newPoint, { unit: "km" }) || 0;
            const dMeters = dKm * 1000;
            if (dMeters > MAX_GPS_JUMP_METERS) return;

            const deltaSec = Math.max((now - prevTime) / 1000, 0.001);

            // адаптивный фильтр движения
            recentDistances.current.push(dKm);
            if (recentDistances.current.length > ADAPTIVE_BUFFER_SIZE) recentDistances.current.shift();
            const avgD = recentDistances.current.reduce((a, b) => a + b, 0) / recentDistances.current.length;
            const adaptiveThreshold = Math.max(0.001, Math.min(0.01, avgD * 2));
            const isMoving = avgD > adaptiveThreshold || gpsSpeed >= MIN_SPEED_KMH;

            if (isMoving) {
              const baseSpeed = Math.max((dKm / deltaSec) * 3600, gpsSpeed);
              const lastSpeed = speedBuffer.current[speedBuffer.current.length - 1] || 0;
              const filteredSpeed = Math.abs(baseSpeed - lastSpeed) > MAX_SPEED_JUMP ? lastSpeed : baseSpeed;

              speedBuffer.current.push(filteredSpeed);
              if (speedBuffer.current.length > SPEED_BUFFER_SEC) speedBuffer.current.shift();
              const sorted = [...speedBuffer.current].sort((a, b) => a - b);
              let smoothed = sorted[Math.floor(sorted.length / 2)];
              if (smoothed < MIN_SPEED_KMH) smoothed = 0;
              setSpeed(smoothed);

              if (smoothed > maxSpeedRef.current) maxSpeedRef.current = smoothed;

              const newDistance = distanceRef.current + dKm;
              distanceRef.current = newDistance;
              setDistance(newDistance);

              if (mode !== "bike") {
                const deltaStepsRaw = Math.round(dKm * stepsPerKm);
                const deltaSteps = dKm * 1000 > 5 ? 0 : Math.min(deltaStepsRaw, 4);
                if (deltaSteps > 0) {
                  stepsRef.current += deltaSteps;
                  setSteps(stepsRef.current);
                }
              } else {
                const cadenceValue = Math.round(Math.max(smoothed, 0) * 2);
                setCadence(cadenceValue);
              }

              lastStopRef.current = null;
            } else {
              if (!lastStopRef.current) lastStopRef.current = now;
              if (now - lastStopRef.current > STOP_TIMEOUT) setSpeed(0);
            }
          } else {
            setSpeed(gpsSpeed < MIN_SPEED_KMH ? 0 : gpsSpeed);
          }

          lastLocationRef.current = newPoint;
          lastTimestampRef.current = now;
          setLocation(newPoint);
        }
      );
    };

    initLocation();
    return () => { if (locationSub) locationSub.remove(); };
  }, [started, paused, countdown, mode]);

  // --- Accelerometer steps ---
  useEffect(() => {
    if (!started || mode === "bike") return;

    const STEP_INTERVAL = 300; // реагируем быстрее
    const BUFFER_SIZE = 5; // меньше буфер для скорости реакции
    const BASE_THRESHOLD = 1.0; // более чувствительный порог
    const MIN_STEP_MAGNITUDE = 1.05;

    const subscription = Accelerometer.addListener(acc => {
      const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
      accelBuffer.current.push(magnitude);
      if (accelBuffer.current.length > BUFFER_SIZE) accelBuffer.current.shift();
      const avgMag = accelBuffer.current.reduce((a, b) => a + b, 0) / accelBuffer.current.length;

      const now = Date.now();
      const adaptiveThreshold = BASE_THRESHOLD + 0.1 * Math.sin(duration / 5);

      if (avgMag > adaptiveThreshold && avgMag > MIN_STEP_MAGNITUDE && now - lastStepTime.current > STEP_INTERVAL) {
        lastStepTime.current = now;
        stepsRef.current += 1;
        setSteps(stepsRef.current);
      }
    });

    Accelerometer.setUpdateInterval(100);
    return () => subscription.remove();
  }, [started, duration, mode]);

  // --- Countdown ---
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => (c ? c - 1 : 0)), 1000);
    } else if (countdown === 0) setCountdown(null);
    return () => { if (timer) clearTimeout(timer); };
  }, [countdown]);

  // --- Duration interval ---
  useEffect(() => {
    if (started && countdown === null && !paused) {
      durationInterval.current = setInterval(() => setDuration(prev => prev + 1), 1000);
    } else if (durationInterval.current) clearInterval(durationInterval.current);
    return () => { if (durationInterval.current) clearInterval(durationInterval.current); };
  }, [started, paused, countdown]);

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
        cadence: mode === "bike" ? cadence : null,
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
    setCadence(0);
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
    setCadence(0);
  };

  const handleCenterLocation = () => {
    if (location && webviewRef.current) webviewRef.current.postMessage(JSON.stringify(location));
  };

  return {
    started,
    paused,
    countdown,
    location,
    distance,
    speed,
    duration,
    steps,
    cadence,
    handleStart,
    handlePause,
    handleResume,
    handleStop,
    handleCenterLocation,
  };
}
