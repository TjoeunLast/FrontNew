import { Platform } from "react-native";

type MessagingModule = typeof import("@react-native-firebase/messaging");

export async function getFirebaseMessaging() {
  if (Platform.OS === "web") return null;

  try {
    const mod = (await import("@react-native-firebase/messaging")) as MessagingModule;
    return mod.default;
  } catch (error) {
    console.log("FCM native module unavailable. Running without push messaging.", error);
    return null;
  }
}
