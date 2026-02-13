import { Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function DriverTabsLayout() {
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
          elevation: 10, // 안드로이드 그림자
          shadowColor: "#000", // ios 그림자
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
          title: "오더",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "list" : "list-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="driving"
        options={{
          title: "운행",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name="steering" color={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "정산",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "wallet" : "wallet-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: "내정보",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused ? "ellipsis-horizontal" : "ellipsis-horizontal-outline"
              }
              color={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
