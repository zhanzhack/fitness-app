import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";
import { getGuestId } from "../../lib/guest";
import { mergeGuestWorkouts } from "../../lib/workouts";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/MaterialCommunityIcons"; // <-- для стрелки

export default function ProfileScreen() {
  const router = useRouter();
  const [stepsGoal, setStepsGoal] = useState("7500");
  const [caloriesGoal, setCaloriesGoal] = useState("2000");
  const [movingGoal, setMovingGoal] = useState("115");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bedtimeEnabled, setBedtimeEnabled] = useState(false);
  const [bedtime, setBedtime] = useState<Date>(new Date());
  const [wakeup, setWakeup] = useState<Date>(new Date());
  const [showBedtimePicker, setShowBedtimePicker] = useState(false);
  const [showWakeupPicker, setShowWakeupPicker] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      let currentGuestId: string | null = null;
      if (!user) {
        currentGuestId = await getGuestId();
        setGuestId(currentGuestId);
      }

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select(
            "steps_goal, calories_goal, moving_goal, weight, height, bedtime_enabled, bedtime_time, wakeup_time, guest_id"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (data) {
          if (data.steps_goal) setStepsGoal(data.steps_goal.toString());
          if (data.calories_goal) setCaloriesGoal(data.calories_goal.toString());
          if (data.moving_goal) setMovingGoal(data.moving_goal.toString());
          if (data.weight) setWeight(data.weight?.toString() ?? "");
          if (data.height) setHeight(data.height?.toString() ?? "");
          if (data.bedtime_enabled) setBedtimeEnabled(data.bedtime_enabled);
          if (data.bedtime_time)
            setBedtime(new Date(`1970-01-01T${data.bedtime_time}`));
          if (data.wakeup_time)
            setWakeup(new Date(`1970-01-01T${data.wakeup_time}`));

          if (data.guest_id) {
            await mergeGuestWorkouts(user.id, data.guest_id);
            await AsyncStorage.removeItem("guest_id");
          }
        }
      } else if (currentGuestId) {
        const s = await AsyncStorage.getItem("steps_goal");
        const c = await AsyncStorage.getItem("calories_goal");
        const m = await AsyncStorage.getItem("moving_goal");
        const w = await AsyncStorage.getItem("weight");
        const h = await AsyncStorage.getItem("height");
        const be = await AsyncStorage.getItem("bedtime_enabled");
        const bt = await AsyncStorage.getItem("bedtime_time");
        const wt = await AsyncStorage.getItem("wakeup_time");

        if (s) setStepsGoal(s);
        if (c) setCaloriesGoal(c);
        if (m) setMovingGoal(m);
        if (w) setWeight(w);
        if (h) setHeight(h);
        if (be) setBedtimeEnabled(be === "true");
        if (bt) setBedtime(new Date(bt));
        if (wt) setWakeup(new Date(wt));
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const saveData = async () => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }

    await supabase
      .from("profiles")
      .update({
        steps_goal: Number(stepsGoal),
        calories_goal: Number(caloriesGoal),
        moving_goal: Number(movingGoal),
        weight: weight ? Number(weight) : null,
        height: height ? Number(height) : null,
        bedtime_enabled: bedtimeEnabled,
        bedtime_time: bedtime.toTimeString().slice(0, 5),
        wakeup_time: wakeup.toTimeString().slice(0, 5),
      })
      .eq("id", userId);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  const isGuest = !userId;

  return (
    <ScrollView style={styles.container}>
      {/* Заголовок с кнопкой назад */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={28} color="#FFD93D" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* Вес и рост */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Body</Text>
        <View style={styles.inputBlock}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            style={styles.input}
            editable={!isGuest}
          />
        </View>

        <View style={styles.inputBlock}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            style={styles.input}
            editable={!isGuest}
          />
        </View>
      </View>

      {/* Цели активности */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Activity goals</Text>
        <View style={styles.inputBlock}>
          <Text style={styles.label}>Steps per day</Text>
          <TextInput
            value={stepsGoal}
            onChangeText={setStepsGoal}
            keyboardType="numeric"
            style={styles.input}
            editable={!isGuest}
          />
        </View>

        <View style={styles.inputBlock}>
          <Text style={styles.label}>Calories goal</Text>
          <TextInput
            value={caloriesGoal}
            onChangeText={setCaloriesGoal}
            keyboardType="numeric"
            style={styles.input}
            editable={!isGuest}
          />
        </View>

        <View style={styles.inputBlock}>
          <Text style={styles.label}>Move goal (Heart Points)</Text>
          <TextInput
            value={movingGoal}
            onChangeText={setMovingGoal}
            keyboardType="numeric"
            style={styles.input}
            editable={!isGuest}
          />
        </View>
      </View>

      {/* Сон */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sleep</Text>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Enable bedtime</Text>
          <Switch
            value={bedtimeEnabled}
            onValueChange={setBedtimeEnabled}
            thumbColor={bedtimeEnabled ? "#2563eb" : "#666"}
            disabled={isGuest}
          />
        </View>

        {bedtimeEnabled && (
          <>
            <TouchableOpacity
              style={styles.inputBlock}
              onPress={() => !isGuest && setShowBedtimePicker(true)}
            >
              <Text style={styles.label}>Bedtime</Text>
              <Text style={styles.timeText}>
                {bedtime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.inputBlock}
              onPress={() => !isGuest && setShowWakeupPicker(true)}
            >
              <Text style={styles.label}>Wake up</Text>
              <Text style={styles.timeText}>
                {wakeup.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* DatePickers */}
      {showBedtimePicker && (
        <DateTimePicker
          value={bedtime}
          mode="time"
          is24Hour={true}
          onChange={(e, date) => {
            setShowBedtimePicker(false);
            if (date) setBedtime(date);
          }}
        />
      )}

      {showWakeupPicker && (
        <DateTimePicker
          value={wakeup}
          mode="time"
          is24Hour={true}
          onChange={(e, date) => {
            setShowWakeupPicker(false);
            if (date) setWakeup(date);
          }}
        />
      )}

      <TouchableOpacity onPress={saveData} style={styles.button}>
        <Text style={styles.buttonText}>{isGuest ? "Sign in to save" : "Save"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  card: { backgroundColor: "#111", borderRadius: 16, padding: 16, marginBottom: 20 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 12 },
  inputBlock: { marginBottom: 16 },
  label: { color: "#aaa", marginBottom: 6, fontSize: 14 },
  input: { backgroundColor: "#1f1f1f", color: "#fff", padding: 12, borderRadius: 12, fontSize: 16 },
  timeText: { color: "#fff", fontSize: 16, backgroundColor: "#1f1f1f", padding: 12, borderRadius: 12 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  button: { backgroundColor: "#e4bf2cff", padding: 16, borderRadius: 14, marginTop: 10, marginBottom: 40 },
  buttonText: { color: "#fff", fontWeight: "bold", textAlign: "center", fontSize: 16 },
  loading: { color: "#fff", fontSize: 18 },
});
