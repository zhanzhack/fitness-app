import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Calendar } from "react-native-calendars";
import Slider from "@react-native-community/slider";

type DistanceOption = "short" | "medium" | "long";

export default function WorkoutHistory() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");

  // --- Фильтры ---
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [distanceFilter, setDistanceFilter] = useState<DistanceOption[]>([]);
  const [sliderValue, setSliderValue] = useState<number>(0); // объединяем состояние слайдера и фильтра

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
    if (!error && data) {
      setWorkouts(data);
      setFilteredWorkouts(data);
    }

    setRefreshing(false);
  };

  useEffect(() => {
    loadWorkouts();
  }, [userId, guestId]);

  // --- Применяем фильтры ---
  useEffect(() => {
    let filtered = [...workouts];

    if (searchText) {
      filtered = filtered.filter(w => w.type.toLowerCase().includes(searchText.toLowerCase()));
    }

    if (selectedDate) {
      filtered = filtered.filter(w => {
        const d = new Date(w.created_at);
        return d.toDateString() === selectedDate.toDateString();
      });
    }

    if (distanceFilter.length > 0) {
      filtered = filtered.filter(w => {
        if (distanceFilter.includes("short") && w.distance < 2) return true;
        if (distanceFilter.includes("medium") && w.distance >= 2 && w.distance <= 5) return true;
        if (distanceFilter.includes("long") && w.distance > 5) return true;
        return false;
      });
    }

    if (sliderValue > 0) {
      filtered = filtered.filter(w => w.duration <= sliderValue);
    }

    setFilteredWorkouts(filtered);
  }, [searchText, selectedDate, distanceFilter, sliderValue, workouts]);

  const markedDates = workouts.reduce((acc, w) => {
    const d = new Date(w.created_at).toISOString().split('T')[0];
    acc[d] = { marked: true, dotColor: '#FFD93D' };
    return acc;
  }, {} as any);

  const toggleDistance = (df: DistanceOption) => {
    if (distanceFilter.includes(df)) setDistanceFilter(distanceFilter.filter(d => d !== df));
    else setDistanceFilter([...distanceFilter, df]);
  };

  const getDistanceColor = (distance: number) => {
    if (distance < 2) return "#2E2E2E";
    if (distance < 5) return "#FFD93D";
    return "#FF6B6B";
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadWorkouts} />}
    >
      {/* Заголовок */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={28} color="#FFD93D" />
        </TouchableOpacity>
        <Text style={styles.title}>Workout History</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Поиск */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by type..."
        placeholderTextColor="#888"
        value={searchText}
        onChangeText={setSearchText}
      />

      {/* Календарь */}
      <Calendar
        onDayPress={day => setSelectedDate(new Date(day.dateString))}
        markedDates={selectedDate ? { ...markedDates, [selectedDate.toISOString().split('T')[0]]: { selected: true, selectedColor: '#FFD93D' } } : markedDates}
        theme={{
          backgroundColor: '#111',
          calendarBackground: '#111',
          textSectionTitleColor: '#fff',
          selectedDayBackgroundColor: '#FFD93D',
          todayTextColor: '#FFD93D',
          dayTextColor: '#fff',
          monthTextColor: '#FFD93D',
          arrowColor: '#FFD93D',
          textDisabledColor: '#555',
        }}
        style={{ borderRadius: 8, marginBottom: 12 }}
        hideExtraDays={true}
        disableAllTouchEventsForDisabledDays={true}
      />

      {/* Фильтры Distance */}
      <View style={styles.filtersRow}>
        <Text style={styles.distanceLabel}>Distance:</Text>
        <View style={styles.distanceCirclesContainer}>
          {["short","medium","long"].map(df => (
            <View key={df} style={styles.distanceCircleWrapper}>
              <TouchableOpacity
                style={[styles.distanceCircle, distanceFilter.includes(df as DistanceOption) && styles.filterBtnActive]}
                onPress={() => toggleDistance(df as DistanceOption)}
              />
              <Text style={styles.distanceText}>{df.charAt(0).toUpperCase() + df.slice(1)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Фильтр Duration с ползунком */}
      <View style={{ marginVertical: 12 }}>
        <Text style={styles.distanceLabel}>
          Max Duration: {Math.floor(sliderValue/3600)}h {Math.floor((sliderValue%3600)/60)}m
        </Text>
        <Slider
          minimumValue={0}
          maximumValue={36000} // 10 часов
          step={1200} // 20 минут
          value={sliderValue}
          minimumTrackTintColor="#FFD93D"
          maximumTrackTintColor="#555"
          thumbTintColor="#FFD93D"
          onValueChange={setSliderValue}
        />
      </View>

      {/* Заголовок тренировок */}
      <Text style={styles.workoutsHeader}>Your workouts</Text>

      {/* Список тренировок */}
      {filteredWorkouts.length === 0 ? (
        <Text style={{ color: "#aaa", textAlign: "center", marginTop: 20 }}>No workouts found</Text>
      ) : (
        filteredWorkouts.map((w, idx) => {
          const date = new Date(w.created_at);
          const timeStr = `${date.getHours().toString().padStart(2,"0")}:${date.getMinutes().toString().padStart(2,"0")} ${date.getDate()}.${(date.getMonth()+1).toString().padStart(2,"0")}.${date.getFullYear()}`;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.item, { backgroundColor: getDistanceColor(w.distance) }]}
              onPress={() => router.push(`/workout/${w.id}`)}
            >
              <Text style={styles.label}>{w.type.charAt(0).toUpperCase() + w.type.slice(1)}</Text>
              <Text style={styles.value}>{w.distance.toFixed(2)} km / {timeStr}</Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginTop: 24, marginBottom: 16 },
  title: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "bold", color: "#FFD93D" },
  searchInput: { backgroundColor: "#222", color: "#fff", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  filtersRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12, alignItems: "center" },
  distanceLabel: { color: "#FFD93D", fontSize: 16, marginRight: 8 },
  distanceCirclesContainer: { flexDirection: "row", justifyContent: "space-evenly", flex: 1 },
  distanceCircleWrapper: { alignItems: "center" },
  distanceCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#222", marginBottom: 2 },
  distanceText: { color: "#fff", fontSize: 12 },
  filterBtnActive: { backgroundColor: "#FFD93D" },
  item: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#333", borderRadius: 8, paddingHorizontal: 12, marginBottom: 6 },
  label: { color: "#FFD93D", fontSize: 16 },
  value: { color: "#fff", fontSize: 16 },
  workoutsHeader: { color: "#FFD93D", fontSize: 18, fontWeight: "bold", marginVertical: 8 },
});
