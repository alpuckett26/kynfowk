import * as SplashScreen from "expo-splash-screen";
import { Slot } from "expo-router";

SplashScreen.preventAutoHideAsync();
SplashScreen.hideAsync().catch(() => {});

export default function Layout() {
  return <Slot />;
}
