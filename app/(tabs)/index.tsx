import React, { useContext, useState } from "react";
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { WorkoutContext } from "../../context/WorkoutContext";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useLastWorkouts } from "../../hooks/useLastWorkouts";
import useActivityTracker from "../../hooks/useActivityTracker";
import { styles } from "../../lib/styles/index.style"; // ✅ импорт стилей

const screenHeight = Dimensions.get("window").height;

const caloriesGoal = 500;
const stepsGoal = 10000;
const movingGoal = 60;

export default function HomeScreen() {
  const router = useRouter();
  const { workouts: localWorkouts, addWorkout: addLocalWorkout } = useContext(WorkoutContext);

  // last workouts hook
  const { lastWorkouts, loadLastWorkouts } = useLastWorkouts(localWorkouts);

  // activity tracker hook (starts on mount inside the hook)
  const { steps, calories, moving } = useActivityTracker();

  const [refreshing, setRefreshing] = useState(false);

  // navigate to workout
  const goToWorkout = (mode: string) => {
    router.push(`/workout-map?mode=${mode}`, {
      onWorkoutComplete: async (distance: number) => {
        const timestamp = new Date().toISOString();
        const workout = { type: mode, distance, created_at: timestamp };
        addLocalWorkout(workout);
      },
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLastWorkouts();
    setRefreshing(false);
  };

  return (
    <LinearGradient
      colors={['#000000', '#1a1a1a', '#43464B', '#6d6f73', '#43464B', '#1a1a1a', '#000000']}
      locations={[0, 0.2, 0.4, 0.6, 0.75, 0.9, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ marginTop: screenHeight * 0.1 }} />

        <View style={styles.ringsContainer}>
          <AnimatedCircularProgress
            size={200} width={20} fill={(calories / caloriesGoal) * 100}
            tintColor="#FF6B6B" backgroundColor="rgba(255,107,107,0.2)" arcSweepAngle={180} rotation={-90} lineCap="round"
          />
          <AnimatedCircularProgress
            size={160} width={20} fill={(steps / stepsGoal) * 100}
            tintColor="#FFD93D" backgroundColor="rgba(255,217,61,0.2)" arcSweepAngle={180} rotation={-90} lineCap="round"
            style={styles.innerRing}
          />
          <AnimatedCircularProgress
            size={120} width={20} fill={(moving / movingGoal) * 100}
            tintColor="#4ECDC4" backgroundColor="rgba(78,205,196,0.2)" arcSweepAngle={180} rotation={-90} lineCap="round"
            style={styles.innerRing}
          />
        </View>

        <Text style={styles.header}>Today's Activity</Text>

        <View style={[styles.card, { padding: 20 }]}>
          <View style={styles.statRow}>
            <View style={styles.labelRow}><Text style={styles.label}>🔥 Calories</Text></View>
            <Text style={styles.value}>{Math.round(calories)}/{caloriesGoal} kcal</Text>
          </View>
          <View style={styles.statRow}>
            <View style={styles.labelRow}><Text style={styles.label}>👟 Steps</Text></View>
            <Text style={styles.value}>{steps}/{stepsGoal}</Text>
          </View>
          <View style={styles.statRow}>
            <View style={styles.labelRow}><Text style={styles.label}>⏱ Moving</Text></View>
            <Text style={styles.value}>{moving}/{movingGoal} mins</Text>
          </View>
        </View>

        <View style={styles.activitiesRow}>
          {["running", "walking", "bike", "more"].map(mode => {
            const iconName = mode === "running" ? "run" : mode === "walking" ? "walk" : mode === "bike" ? "bike" : "dots-horizontal";
            return (
              <TouchableOpacity key={mode} style={styles.activityButton} onPress={() => goToWorkout(mode)}>
                <Icon name={iconName} size={28} color="#fff" />
                <Text style={styles.activityText}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => router.push("/workout-history")}
        >
          <Text style={[styles.label, { fontSize: 18, marginBottom: 8 }]}>Last Workouts</Text>

          <TouchableOpacity
            style={{ marginBottom: 8, alignSelf: "flex-end" }}
            onPress={(e) => { e.stopPropagation(); loadLastWorkouts(); }}
          >
            <Text style={{ color: "#FFD93D", fontWeight: "bold" }}>Refresh</Text>
          </TouchableOpacity>

          {lastWorkouts.length === 0 ? (
            <Text style={{ color: "#aaa", fontSize: 14 }}>No recent workouts</Text>
          ) : (
            lastWorkouts.map((w, idx) => {
              const label = w.type.charAt(0).toUpperCase() + w.type.slice(1);
              const date = new Date(w.created_at);
              const timeStr = `${date.getHours().toString().padStart(2,"0")}:${date.getMinutes().toString().padStart(2,"0")} ${date.getDate()}.${(date.getMonth()+1).toString().padStart(2,"0")}.${date.getFullYear()}`;
              return (
                <View key={idx} style={styles.statRow}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.value}>{w.distance.toFixed(2)} km / {timeStr}</Text>
                </View>
              );
            })
          )}
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}
