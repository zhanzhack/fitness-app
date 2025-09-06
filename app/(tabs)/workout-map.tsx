import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import haversine from "haversine";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

type TargetMode = "none" | "distance" | "duration" | "calories";

export default function WorkoutMap() {
  const router = useRouter();

  // UI state
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

  // Refs
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const durationInterval = useRef<number | null>(null);
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const distanceRef = useRef<number>(0);
  const stepsRef = useRef<number>(0);
  const speedBuffer = useRef<number[]>([]);
  const lastStopRef = useRef<number | null>(null);
  const recentDistances = useRef<number[]>([]);

  // Constants
  const stepsPerKm = 1300;
  const SPEED_BUFFER_SEC = 5; 
  const MIN_SPEED_KMH = 1; 
  const STOP_TIMEOUT = 2000; 
  const ADAPTIVE_BUFFER_SIZE = 5;
  const MIN_THRESHOLD_KM = 0.0002; 
  const MAX_THRESHOLD_KM = 0.001;  

  // --- Start geolocation immediately ---
  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;

    const initLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Ошибка", "Разрешение на геолокацию не получено");
        return;
      }

      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
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

          // --- ТВОЯ ЛОГИКА ОБРАБОТКИ GEOPOSITION ---
          if (prev && prevTime && started && !paused) { 
            const dKm = haversine(prev, newPoint, { unit: "km" }) || 0;
            const deltaSec = Math.max((now - prevTime) / 1000, 0.001);
            const gpsSpeed = loc.coords.speed != null ? loc.coords.speed * 3.6 : 0;

            recentDistances.current.push(dKm);
            if (recentDistances.current.length > ADAPTIVE_BUFFER_SIZE) recentDistances.current.shift();
            const avgD = recentDistances.current.reduce((a, b) => a + b, 0) / recentDistances.current.length;
            const adaptiveThreshold = Math.max(MIN_THRESHOLD_KM, Math.min(MAX_THRESHOLD_KM, avgD * 2));

            let isMoving = false;
            if (dKm > adaptiveThreshold && gpsSpeed >= MIN_SPEED_KMH) isMoving = true;

            let baseSpeed = 0;
            if (isMoving) {
              baseSpeed = Math.max((dKm / deltaSec) * 3600, gpsSpeed);
              const newDistance = distanceRef.current + dKm;
              distanceRef.current = newDistance;
              setDistance(newDistance);

              const newSteps = Math.round(newDistance * stepsPerKm);
              stepsRef.current = newSteps;
              setSteps(newSteps);
            }

            speedBuffer.current.push(baseSpeed);
            if (speedBuffer.current.length > SPEED_BUFFER_SEC) speedBuffer.current.shift();
            const smoothed = speedBuffer.current.reduce((a, b) => a + b, 0) / speedBuffer.current.length;

            if (!isMoving && gpsSpeed < MIN_SPEED_KMH) {
              if (!lastStopRef.current) lastStopRef.current = now;
              if (now - lastStopRef.current > STOP_TIMEOUT) setSpeed(0);
              else setSpeed(smoothed);
            } else {
              lastStopRef.current = null;
              setSpeed(smoothed);
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

    return () => {
      if (locationSub) locationSub.remove();
    };
  }, [started, paused]);

  // Countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => (c ? c - 1 : 0)), 1000);
    } else if (countdown === 0) {
      setStarted(true); // Старт статистики только после countdown
      setCountdown(null);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [countdown]);

  // Duration interval
  useEffect(() => {
    if (started && !paused) {
      durationInterval.current = setInterval(() => setDuration((prev) => prev + 1), 1000) as unknown as number;
    } else {
      if (durationInterval.current) clearInterval(durationInterval.current);
    }

    return () => { if (durationInterval.current) clearInterval(durationInterval.current); };
  }, [started, paused]);

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2,"0")}:${seconds.toString().padStart(2,"0")}`;
  };

  const handleStart = () => {
    distanceRef.current = 0;
    stepsRef.current = 0;
    speedBuffer.current = [];
    lastLocationRef.current = null;
    lastTimestampRef.current = null;
    recentDistances.current = [];

    setDistance(0);
    setSteps(0);
    setSpeed(0);
    setDuration(0);
    setCountdown(3); // Запуск countdown
    setPaused(false);
  };

  const handlePause = () => setPaused(true);
  const handleResume = () => setPaused(false);
  const handleStop = () => {
    setStarted(false);
    setPaused(false);
    lastLocationRef.current = null;
    lastTimestampRef.current = null;
    distanceRef.current = 0;
    stepsRef.current = 0;
    speedBuffer.current = [];
    recentDistances.current = [];

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

  const mapHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map = L.map('map').setView([50.4501, 30.5234], 15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);let marker;let polyline=L.polyline([], { color: 'blue', weight: 5 }).addTo(map);function handleMessage(data){try{const lat=data.latitude;const lon=data.longitude;if(typeof lat==='number'&&typeof lon==='number'){const latlng=[lat,lon];if(!marker){marker=L.marker(latlng).addTo(map).bindPopup('You').openPopup();}else{marker.setLatLng(latlng);}polyline.addLatLng(latlng);map.panTo(latlng);}}catch(e){}}document.addEventListener('message',e=>handleMessage(JSON.parse(e.data)));window.addEventListener('message',e=>handleMessage(JSON.parse(e.data)));</script></body></html>`;

  const getTargetText = () => {
    switch (selectedTarget) {
      case "distance": return "Distance target";
      case "duration": return "Duration target";
      case "calories": return "Calorie target";
      default: return "No target";
    }
  };

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
        <WebView ref={webviewRef} originWhitelist={["*"]} source={{ html: mapHtml }} style={{ flex: 1 }} javaScriptEnabled domStorageEnabled />
        <TouchableOpacity style={styles.buttonLocationTop} onPress={handleCenterLocation}>
          <Icon name="crosshairs-gps" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {countdown !== null || started ? (
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

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#000" },
  header:{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", padding:16, backgroundColor:"#000", zIndex:10 },
  headerTitle:{ color:"#fff", fontSize:18, fontWeight:"bold" },

  mapContainer:{ height:Dimensions.get("window").height*0.55, borderRadius:12, overflow:"hidden", marginHorizontal:20, marginTop:10, marginBottom:20 },
  buttonLocationTop:{ position:"absolute", top:16, right:16, backgroundColor:"#2196f3", padding:12, borderRadius:50, zIndex:10 },

  scrollContent:{ paddingHorizontal:20, paddingBottom:100, flexGrow:1 },
  initialControls:{ padding:20, alignItems:"center" },
  button:{ backgroundColor:"#ff9800", padding:16, borderRadius:12, width:"100%", alignItems:"center", marginBottom:10 },
  buttonText:{ color:"#fff", fontSize:14, fontWeight:"bold" },
  countdownText:{ color:"#fff", fontSize:22, marginVertical:10, textAlign:"center" },

  metricsContainer:{ flexDirection:"row", flexWrap:"wrap", justifyContent:"space-between", marginBottom:20 },
  metricCard:{ backgroundColor:"#1c1c1e", borderRadius:12, padding:16, width:"48%", marginBottom:10, alignItems:"center", justifyContent:"center" },
  metricLabel:{ color:"#888", fontSize:14, marginBottom:4 },
  metricValue:{ color:"#fff", fontSize:20, fontWeight:"bold" },

  startedButtons:{ flexDirection:"row", marginTop:10, flexWrap:"wrap", justifyContent:"center" },
  buttonPause:{ backgroundColor:"#fbc02d", padding:16, borderRadius:12, width:"25%", alignItems:"center", marginRight:10 },
  buttonResume:{ backgroundColor:"#4caf50", padding:16, borderRadius:12, width:"25%", alignItems:"center", marginRight:10 },
  buttonStop:{ backgroundColor:"#e53935", padding:16, borderRadius:12, width:"25%", alignItems:"center", marginRight:10 },

  targetContainer:{ width:"100%", alignItems:"center", marginBottom:20 },
  targetButton:{ flexDirection:"row", alignItems:"center", backgroundColor:"#1c1c1e", padding:12, borderRadius:8, width:"100%", justifyContent:"center" },
  targetText:{ color:"#fff", fontSize:16 },
  targetMenuItem:{ padding:12, borderBottomWidth:1, borderBottomColor:"#333", flexDirection:"row", alignItems:"center" },
  targetMenuItemText:{ color:"#fff", fontSize:16 },
  targetMenuUp:{ position:"absolute", bottom:60, width:"100%", backgroundColor:"#1c1c1e", borderRadius:8, zIndex:1000, paddingVertical:4 },
});
