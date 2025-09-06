// app/tabs/_layout.tsx

import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { WorkoutProvider } from "../../context/WorkoutContext";

export default function TabLayout() {
  return (
    <WorkoutProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: "#000", borderTopColor: "#222" },
          tabBarActiveTintColor: "#ff9800",
          tabBarInactiveTintColor: "#888",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            title: "Workout",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="dumbbell" color={color} size={size} />
            ),
          }}
        />
        {/* Добавляем новую вкладку для workout-map. Она будет скрыта из-за href: null */}
        <Tabs.Screen
          name="workout-map"
          options={{
            title: "Map",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="map" color={color} size={size} />
            ),
            href: null, // Эта опция скрывает вкладку из меню, но сохраняет навигацию
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </WorkoutProvider>
  );
}