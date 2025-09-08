import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "../lib/styles/index.style";

const WaterTracker = () => {
  const [water, setWater] = useState(0);
  const waterGoal = 2000;

  const beakerHeight = 120; // соответствует height из styles.beaker
  const animatedHeight = useRef(new Animated.Value(0)).current;

  const addWater = (amount: number) => {
    const newWater = Math.min(water + amount, waterGoal);
    setWater(newWater);

    const percentage = newWater / waterGoal;
    const height = percentage * beakerHeight;

    Animated.timing(animatedHeight, {
      toValue: height,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false, // обязательно false для height
    }).start();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.waterHeader}>💧 Water Tracker</Text>

      <View style={styles.waterRow}>
        {/* Счетчик + кнопка */}
        <View style={styles.counterContainer}>
          <Text style={styles.value}>
            {water} / {waterGoal} ml
          </Text>
          <TouchableOpacity
            style={styles.addWaterBtn}
            onPress={() => addWater(250)}
          >
            <LinearGradient
              colors={["#3498db", "#2980b9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBtn}
            >
              <Text style={styles.addWaterText}>+ 250 ml</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Мензурка */}
        <View style={styles.beakerContainer}>
          <View style={styles.beaker}>
            {/* Анимированная вода */}
            <Animated.View
              style={[
                styles.waterFill,
                {
                  height: animatedHeight,
                  backgroundColor: "#3498db", // <-- видимая вода
                },
              ]}
            />

            {/* Деления мензурки */}
            {Array.from({ length: 4 }).map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.beakerMark,
                  { bottom: `${(idx + 1) * 25}%` },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

export default WaterTracker;
