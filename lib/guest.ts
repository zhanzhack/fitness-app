// lib/guest.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import UUID from "react-native-uuid";

export async function getGuestId() {
  let guestId = await AsyncStorage.getItem("guest_id");
  if (!guestId) {
    guestId = UUID.v4() as string;
    await AsyncStorage.setItem("guest_id", guestId);
  }
  return guestId;
}
