import React from "react";
import { Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function ShipperTabsLayout() {
  const t = useAppTheme();
  const c = t.colors;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brand.primary,
        tabBarInactiveTintColor: c.text.secondary,
        tabBarStyle: {
          backgroundColor: c.bg.surface,
          borderTopColor: c.border.default,
          borderTopWidth: 1,
          height: 78,
          paddingTop: 10,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: "배차관리",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="truck-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="settlement"
        options={{
          title: "정산내역",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "receipt" : "receipt-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="my"
        options={{
          title: "내 정보",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
