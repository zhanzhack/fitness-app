import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function WorkoutHistory() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      let storedGuestId = await AsyncStorage.getItem("guest_id");
      if (!storedGuestId) {
        storedGuestId = uuidv4();
        await AsyncStorage.setItem("guest_id", storedGuestId);
      }
      setGuestId(storedGuestId);
    };
    init();
  }, []);

  const loadWorkouts = async () => {
    if (!userId && !guestId) return;
    setRefreshing(true);

    let query = supabase
      .from("workouts")
      .select("*")
      .order("created_at", { ascending: false });

    if (userId) query = query.eq("user_id", userId);
    else if (guestId) query = query.eq("guest_id", guestId);

    const { data, error } = await query;
    if (!error && data) setWorkouts(data);

    setRefreshing(false);
  };

  useEffect(() => {
    loadWorkouts();
  }, [userId, guestId]);

  return (
    <View style={styles.container}>
      {/* Заголовок с отступом и стрелкой назад */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={28} color="#FFD93D" />
        </TouchableOpacity>
        <Text style={styles.title}>Workout History</Text>
        <View style={{ width: 28 }} /> {/* Для симметрии справа */}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadWorkouts} />}
      >
        {workouts.length === 0 ? (
          <Text style={{ color: "#aaa", textAlign: "center", marginTop: 20 }}>No workouts yet</Text>
        ) : (
          workouts.map((w, idx) => {
            const date = new Date(w.created_at);
            const timeStr = `${date.getHours().toString().padStart(2,"0")}:${date.getMinutes().toString().padStart(2,"0")} ${date.getDate()}.${(date.getMonth()+1).toString().padStart(2,"0")}.${date.getFullYear()}`;
            return (
              <TouchableOpacity
                key={idx}
                style={styles.item}
                onPress={() => router.push(`/workout/${w.id}`)}
              >
                <Text style={styles.label}>{w.type.charAt(0).toUpperCase() + w.type.slice(1)}</Text>
                <Text style={styles.value}>{w.distance.toFixed(2)} km / {timeStr}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24, // заголовок немного ниже
    marginBottom: 16,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFD93D",
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  label: { color: "#FFD93D", fontSize: 16 },
  value: { color: "#fff", fontSize: 16 },
});
