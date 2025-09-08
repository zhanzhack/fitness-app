import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase"; // check path
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function Workout() {
  const router = useRouter();
  const [bestWorkout, setBestWorkout] = useState<any>(null);
  const [avgDistance, setAvgDistance] = useState<number | null>(null);
  const [totalWorkouts, setTotalWorkouts] = useState<number>(0);
  const [totalCalories, setTotalCalories] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    fetchWeeklyStats();
  }, []);

  const fetchWeeklyStats = async () => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .gte("created_at", startOfWeek.toISOString());

    if (error) {
      console.log("Error fetching workouts:", error);
      return;
    }

    if (data && data.length > 0) {
      setTotalWorkouts(data.length);

      // Best workout
      const sorted = [...data].sort((a, b) => b.distance - a.distance);
      setBestWorkout(sorted[0]);

      // Average distance
      const totalDist = data.reduce((sum, w) => sum + (w.distance || 0), 0);
      setAvgDistance(totalDist / data.length);

      // Total calories
      const totalCals = data.reduce((sum, w) => sum + (w.calories || 0), 0);
      setTotalCalories(totalCals);

      // Streak calculation
      const dates = data
        .map(w => new Date(w.created_at).toDateString())
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      let currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = (prev.getTime() - curr.getTime()) / (1000 * 3600 * 24);
        if (diff === 1) currentStreak++;
        else break;
      }
      setStreak(currentStreak);

      // Build recommendations
      const recs: any[] = [];
      if (avgDistance && avgDistance < 3) {
        recs.push({
          title: "How to Choose the Right Running Shoes",
          url: "https://www.youtube.com/watch?v=Y8lIFxCE5Ro",
          thumbnail: "https://img.youtube.com/vi/Y8lIFxCE5Ro/0.jpg",
        });
      }
      if (totalCalories < 1000) {
        recs.push({
          title: "10 Min Fat Burning Home Workout",
          url: "https://www.youtube.com/watch?v=ml6cT4AZdqI",
          thumbnail: "https://img.youtube.com/vi/ml6cT4AZdqI/0.jpg",
        });
      }
      recs.push({
        title: "Best Home Workouts Without Equipment",
        url: "https://www.youtube.com/watch?v=UItWltVZZmE",
        thumbnail: "https://img.youtube.com/vi/UItWltVZZmE/0.jpg",
      });

      setVideos(recs);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header with Back button */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={28} color="#FFD93D" />
        </TouchableOpacity>
        <Text style={styles.header}>Workout</Text>
      </View>

      {/* Workout history */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push("/workout-history")}
      >
        <Text style={styles.cardText}>View your workout history →</Text>
      </TouchableOpacity>

      {/* Weekly stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>This Week's Stats</Text>
        {bestWorkout && (
          <Text style={styles.cardText}>
            🏆 Best distance: {bestWorkout.distance.toFixed(2)} km
          </Text>
        )}
        {avgDistance !== null && (
          <Text style={styles.cardText}>
            📏 Average distance: {avgDistance.toFixed(2)} km
          </Text>
        )}
        <Text style={styles.cardText}>📅 Total workouts: {totalWorkouts}</Text>
        <Text style={styles.cardText}>🔥 Calories burned: {totalCalories}</Text>
        <Text style={styles.cardText}>🌟 Current streak: {streak} day(s)</Text>
      </View>

      {/* Video recommendations */}
      {videos.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recommended for You</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
          >
            {videos.map((v, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.videoCard}
                onPress={() => Linking.openURL(v.url)}
              >
                <Image source={{ uri: v.thumbnail }} style={styles.thumbnail} />
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {v.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  header: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  card: {
    backgroundColor: "#1e1e1e",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  cardText: {
    color: "#aaa",
    fontSize: 16,
    marginBottom: 4,
  },
  videoCard: {
    width: 220,
    marginRight: 12,
  },
  thumbnail: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 6,
  },
  videoTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});
