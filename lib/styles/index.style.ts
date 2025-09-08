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

  // Water Tracker

waterHeader: {
  color: "#fff",
  fontSize: 18,
  fontWeight: "bold",
  marginBottom: 12,
  textAlign: "left",
},

waterRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 16,
},

counterContainer: {
  alignItems: "center",
  justifyContent: "center",
  marginRight: 16,
},

value: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "bold",
  marginBottom: 8,
},

addWaterBtn: {
  borderRadius: 20,
  overflow: "hidden",
},

gradientBtn: {
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 20,
  alignItems: "center",
  justifyContent: "center",
},

addWaterText: {
  color: "#fff",
  fontWeight: "bold",
  fontSize: 14,
},

beakerContainer: {
  marginTop: -25, // подняли мензурку выше
  justifyContent: "flex-start",
},

beaker: {
  width: 60,
  height: 120,
  borderWidth: 2,
  borderColor: "#fff",
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: "rgba(255,255,255,0.05)",
  justifyContent: "flex-end",
  position: "relative",
},

waterFill: {
  width: "100%",
  position: "absolute",
  bottom: 0,
},

beakerMark: {
  position: "absolute",
  left: 4,
  width: 10,
  height: 2,
  backgroundColor: "#fff",
  opacity: 0.7,
},


});
