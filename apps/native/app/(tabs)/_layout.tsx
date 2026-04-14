import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

function TabIcon({
  emoji,
  label,
  focused,
}: {
  emoji: string;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={styles.tabItem}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📞" label="Calls" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💜" label="Stats" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚙️" label="Settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopColor: "#f3f4f6",
    paddingTop: 8,
    height: 72,
  },
  tabItem: {
    alignItems: "center",
    gap: 2,
  },
  tabEmoji: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 10,
    color: "#9ca3af",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#d946ef",
  },
});
