import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { WorkoutContext } from "../../context/WorkoutContext";
import { useStepCounter } from "../../hooks/useStepCounter";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function HomeScreen() {
  const router = useRouter();
  const { workouts } = useContext(WorkoutContext);
  const { steps, calories } = useStepCounter(70);

  const moving = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
  const movingGoal = 30;
  const caloriesGoal = 400;
  const stepsGoal = 6000;
  const screenHeight = Dimensions.get("window").height;

  const goToWorkout = (mode: string) => {
    router.push(`/workout-map?mode=${mode}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.contentContainer, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: screenHeight * 0.1 }} />

        <View style={styles.ringsContainer}>
          <AnimatedCircularProgress size={200} width={20} fill={(calories / caloriesGoal) * 100} tintColor="#e91e63" backgroundColor="rgba(233, 30, 99, 0.2)" arcSweepAngle={180} rotation={-90} lineCap="round" />
          <AnimatedCircularProgress size={160} width={20} fill={(steps / stepsGoal) * 100} tintColor="#ff9800" backgroundColor="rgba(255, 152, 0, 0.2)" arcSweepAngle={180} rotation={-90} lineCap="round" style={styles.innerRing} />
          <AnimatedCircularProgress size={120} width={20} fill={(moving / movingGoal) * 100} tintColor="#2196f3" backgroundColor="rgba(33, 150, 243, 0.2)" arcSweepAngle={180} rotation={-90} lineCap="round" style={styles.innerRing} />
        </View>

        <Text style={styles.header}>Today's Activity</Text>

        <View style={styles.card}>
          <View style={styles.statRow}>
            <View style={styles.labelRow}><Text style={styles.label}>🔥 Calories</Text><View style={[styles.dot, { backgroundColor: "#e91e63" }]} /></View>
            <Text style={styles.value}>{Math.round(calories)}/{caloriesGoal} kcal</Text>
          </View>
          <View style={styles.statRow}>
            <View style={styles.labelRow}><Text style={styles.label}>👟 Steps</Text><View style={[styles.dot, { backgroundColor: "#ff9800" }]} /></View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 20 },
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
