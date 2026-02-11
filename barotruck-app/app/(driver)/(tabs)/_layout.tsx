

import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // [수정] 직접 아이콘 라이브러리 임포트
import { useAppTheme } from '@/shared/hooks/useAppTheme';

export default function DriverTabsLayout() {
  const { colors: c } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4E46E5', 
        tabBarInactiveTintColor: '#94A3B8', 
        headerShown: false, 
        tabBarStyle: {
          height: 80, 
          paddingBottom: 10,
          backgroundColor: '#FFFFFF',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: '홈', 
          tabBarIcon: ({color, focused}) => (
            <Ionicons name={focused ? "home" : "home-outline"} color={color} size={24} />
          )
        }} 
      />
      <Tabs.Screen 
        name="my" 
        options={{ 
          title: '오더', 
          tabBarIcon: ({color, focused}) => (
            <Ionicons name={focused ? "list" : "list-outline"} color={color} size={24} />
          )
        }} 
      />
      <Tabs.Screen 
        name="driving" 
        options={{ 
          title: '운행', 
          tabBarIcon: ({color, focused}) => (
            // [수정] steering-wheel을 지원하는 라이브러리로 변경
            <MaterialCommunityIcons name="steering" color={color} size={26} />
          )
        }} 
      />
      <Tabs.Screen 
        name="wallet" 
        options={{ 
          title: '정산', 
          tabBarIcon: ({color, focused}) => (
            <Ionicons name={focused ? "wallet" : "wallet-outline"} color={color} size={24} />
          )
        }} 
      />
      <Tabs.Screen 
        name="more" 
        options={{ 
          title: '더보기', 
          tabBarIcon: ({color, focused}) => (
            <Ionicons name={focused ? "ellipsis-horizontal" : "ellipsis-horizontal-outline"} color={color} size={24} />
          )
        }} 
      />
    </Tabs>
  );
}





