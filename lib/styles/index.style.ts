import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  contentContainer: {
    alignItems: "center",
  },
  ringsContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  innerRing: {
    position: "absolute",
  },
  card: {
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 20,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    color: "#fff",
    fontSize: 16,
  },
  value: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  activitiesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  activityButton: {
    alignItems: "center",
    width: "23%",
  },
  activityText: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
});
