import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { WebView } from "react-native-webview";
import { useRouter, useLocalSearchParams } from "expo-router";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { styles } from "../../lib/styles/workout-map.styles";

import { useWorkoutLogic } from "../../lib/workoutLogic";

type TargetMode = "none" | "distance" | "duration" | "calories";

export default function WorkoutMap() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = (params.mode as string) ?? "running";

  const [showTargetMenu, setShowTargetMenu] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<TargetMode>("none");

  const webviewRef = useRef<WebView>(null);

  const {
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
  } = useWorkoutLogic(mode, webviewRef);

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getTargetText = () => {
    switch (selectedTarget) {
      case "distance":
        return "Distance target";
      case "duration":
        return "Duration target";
      case "calories":
        return "Calorie target";
      default:
        return "No target";
    }
  };

  const mapHtml = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const map = L.map('map').setView([50.4501, 30.5234], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
let marker;
let polyline=L.polyline([], { color: 'blue', weight: 5 }).addTo(map);
function handleMessage(data){
  try{
    const lat=data.latitude;
    const lon=data.longitude;
    if(typeof lat==='number'&&typeof lon==='number'){
      const latlng=[lat,lon];
      if(!marker){marker=L.marker(latlng).addTo(map).bindPopup('You').openPopup();}
      else{marker.setLatLng(latlng);}
      polyline.addLatLng(latlng);
      map.panTo(latlng);
    }
  }catch(e){}
}
document.addEventListener('message',e=>handleMessage(JSON.parse(e.data)));
window.addEventListener('message',e=>handleMessage(JSON.parse(e.data)));
</script>
</body>
</html>`;

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
                {mode === "bike" && (
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Cadence</Text>
                    <Text style={styles.metricValue}>{cadence} rpm</Text>
                  </View>
                )}
                {mode !== "bike" && (
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Steps</Text>
                    <Text style={styles.metricValue}>{steps}</Text>
                  </View>
                )}
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
            <TouchableOpacity
              style={styles.targetButton}
              onPress={() => setShowTargetMenu(!showTargetMenu)}
            >
              <Text style={styles.targetText}>{getTargetText()}</Text>
              <Icon name={showTargetMenu ? "chevron-down" : "chevron-up"} size={20} color="#fff" />
            </TouchableOpacity>

            {showTargetMenu && (
              <View style={styles.targetMenuUp}>
                {["distance", "duration", "calories", "none"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={styles.targetMenuItem}
                    onPress={() => {
                      setSelectedTarget(t as TargetMode);
                      setShowTargetMenu(false);
                    }}
                  >
                    <Text style={styles.targetMenuItemText}>
                      {t === "none" ? "No target" : t.charAt(0).toUpperCase() + t.slice(1) + " target"}
                    </Text>
                    {t === selectedTarget && (
                      <Icon
                        name="check"
                        size={20}
                        color="#5cb85c"
                        style={{ marginLeft: "auto" }}
                      />
                    )}
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
