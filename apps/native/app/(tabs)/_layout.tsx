import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calls" />
      <Tabs.Screen name="connections" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
