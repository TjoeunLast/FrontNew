import React from "react";
import { Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function ShipperTabsLayout() {
  const { colors: c } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#4E46E5",
        tabBarInactiveTintColor: "#94A3B8",
        headerShown: false,

        tabBarStyle: {
          height: 100,
          paddingBottom: 20,
          paddingTop: 10,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          elevation: 10, // 안드로이드 입체감
          shadowColor: "#000", // iOS 그림자
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        },

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: "배차관리",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "truck-check" : "truck-check-outline"}
              color={color}
              size={26}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settlement"
        options={{
          title: "정산내역",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "receipt" : "receipt-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="my"
        options={{
          title: "내정보",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
