import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function WorkoutDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const loadWorkout = async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) setWorkout(data);
    };

    loadWorkout();
  }, [id]);

  if (!workout) {
    return (
      <View style={styles.container}>
        <Text style={{ color: "#fff", textAlign: "center", marginTop: 50 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Заголовок с отступом сверху и стрелкой назад */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {workout.type.charAt(0).toUpperCase() + workout.type.slice(1)} Details
        </Text>
        <View style={{ width: 28 }} /> {/* Для симметрии */}
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Distance:</Text>
        <Text style={styles.value}>{workout.distance.toFixed(2)} km</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Duration:</Text>
        <Text style={styles.value}>{Math.floor(workout.duration / 60)} mins</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Steps:</Text>
        <Text style={styles.value}>{workout.steps}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Calories:</Text>
        <Text style={styles.value}>{workout.calories}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Avg Speed:</Text>
        <Text style={styles.value}>{workout.avg_speed?.toFixed(2)} km/h</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Max Speed:</Text>
        <Text style={styles.value}>{workout.max_speed?.toFixed(2)} km/h</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Water Loss:</Text>
        <Text style={styles.value}>{workout.water_loss} L</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24, // <-- отступ сверху
    marginBottom: 16,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFD93D",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  label: { color: "#fff", fontSize: 16 },
  value: { color: "#FFD93D", fontSize: 16, fontWeight: "bold" },
});
