import React from "react";
import { Stack } from "expo-router";

export default function ChatLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: true, 
        headerTitle: "채팅",
        headerBackTitle: "뒤로" 
      }} 
    />
  );
}