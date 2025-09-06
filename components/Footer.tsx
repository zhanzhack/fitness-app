// components/Footer.tsx
import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function Footer() {
  const router = useRouter();

  return (
    <View style={styles.tabs}>
      <TouchableOpacity onPress={() => router.push("/")}>
        <MaterialCommunityIcons name="home" size={28} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/workout")}>
        <MaterialCommunityIcons name="dumbbell" size={28} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/profile")}>
        <MaterialCommunityIcons name="account" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: "#111",
  },
});
