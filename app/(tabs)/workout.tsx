import { View, Text, StyleSheet } from "react-native";

export default function Workout() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Workout Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 20,
  },
});
