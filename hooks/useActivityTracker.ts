// app/hooks/useActivityTracker.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import * as Location from "expo-location";
import haversine from "haversine";

type TrackerOptions = {
  maxDistanceKm?: number;
  adaptiveBufferSize?: number;
  minThresholdKm?: number;
  maxThresholdKm?: number;
  speedThresholdKmh?: number;
  stepsPerKm?: number;
  weightKg?: number;
  watchTimeIntervalMs?: number;
};

export function useActivityTracker(options?: TrackerOptions) {
  const {
    maxDistanceKm = 0.5,
    adaptiveBufferSize = 8,
    minThresholdKm = 0.01,
    maxThresholdKm = 0.1,
    speedThresholdKmh = 1,
    stepsPerKm = 1300,
    weightKg = 70,
    watchTimeIntervalMs = 1000,
  } = options ?? {};

  const [steps, setSteps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [moving, setMoving] = useState(0); // minutes

  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const stepsRef = useRef(0);
  const caloriesRef = useRef(0);
  const movingSecondsRef = useRef(0);
  const lastStopRef = useRef<number | null>(null);
  const recentDistances = useRef<number[]>([]);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastLatRef = useRef<number>(0);
  const lastLonRef = useRef<number>(0);

  const R = 0.0001;
  const Q = 0.0001;
  const kalmanFilter = (prev: number, current: number) =>
    prev + (Q / (Q + R)) * (current - prev);

  const stop = useCallback(() => {
    if (locationSubRef.current) {
      try { locationSubRef.current.remove(); } catch (e) { /* ignore */ }
      locationSubRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    distanceRef.current = 0;
    stepsRef.current = 0;
    caloriesRef.current = 0;
    movingSecondsRef.current = 0;
    recentDistances.current = [];
    lastLocationRef.current = null;
    lastTimestampRef.current = null;
    lastStopRef.current = null;
    lastLatRef.current = 0;
    lastLonRef.current = 0;
    setSteps(0);
    setCalories(0);
    setMoving(0);
  }, []);

  const start = useCallback(async () => {
    stop(); // ensure previous subscription removed

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Error", "Location permission not granted");
      return;
    }

    try {
      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      lastLocationRef.current = { latitude: initial.coords.latitude, longitude: initial.coords.longitude };
      lastTimestampRef.current = Date.now();
      lastLatRef.current = initial.coords.latitude;
      lastLonRef.current = initial.coords.longitude;
    } catch (e) {
      // swallow initial position errors (watch may still work)
      // console.warn("init pos failed", e);
    }

    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: watchTimeIntervalMs,
        distanceInterval: 0,
      },
      (loc) => {
        if (!loc || !loc.coords) return;

        const newLat = kalmanFilter(lastLatRef.current, loc.coords.latitude);
        const newLon = kalmanFilter(lastLonRef.current, loc.coords.longitude);
        lastLatRef.current = newLat;
        lastLonRef.current = newLon;

        const newPoint = { latitude: newLat, longitude: newLon };
        const now = Date.now();
        const prev = lastLocationRef.current;
        const prevTime = lastTimestampRef.current;

        if (prev && prevTime) {
          let dKm = haversine(prev, newPoint, { unit: "km" }) || 0;
          if (dKm > maxDistanceKm) dKm = 0;
          const gpsSpeed = loc.coords.speed != null ? loc.coords.speed * 3.6 : 0;

          recentDistances.current.push(dKm);
          if (recentDistances.current.length > adaptiveBufferSize) recentDistances.current.shift();
          const avgD =
            recentDistances.current.reduce((a, b) => a + b, 0) / recentDistances.current.length;
          const adaptiveThreshold = Math.max(
            minThresholdKm,
            Math.min(maxThresholdKm, avgD * 2)
          );

          const isMoving = dKm > adaptiveThreshold && gpsSpeed >= speedThresholdKmh;

          if (isMoving) {
            distanceRef.current += dKm;
            const newSteps = Math.round(distanceRef.current * stepsPerKm);
            stepsRef.current = Math.max(stepsRef.current, newSteps);
            setSteps(stepsRef.current);

            caloriesRef.current += weightKg * dKm;
            setCalories(Math.round(caloriesRef.current));

            movingSecondsRef.current += Math.round(watchTimeIntervalMs / 1000);
            setMoving(Math.floor(movingSecondsRef.current / 60));
          }

          if (!isMoving && gpsSpeed < speedThresholdKmh) {
            if (!lastStopRef.current) lastStopRef.current = now;
          } else {
            lastStopRef.current = null;
          }
        }

        lastLocationRef.current = newPoint;
        lastTimestampRef.current = now;
      }
    );
  }, [
    adaptiveBufferSize,
    maxDistanceKm,
    minThresholdKm,
    maxThresholdKm,
    speedThresholdKmh,
    stepsPerKm,
    weightKg,
    watchTimeIntervalMs,
    kalmanFilter,
    stop,
  ]);

  useEffect(() => {
    // start on mount
    start();
    return () => stop();
  }, [start, stop]);

  return { steps, calories, moving, start, stop, reset };
}

export default useActivityTracker;
