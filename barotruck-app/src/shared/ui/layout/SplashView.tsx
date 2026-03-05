import { useAppTheme } from "@/shared/hooks/useAppTheme";
import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

export function SplashView() {
  const { colors: c } = useAppTheme();

  // 부드럽게 나타나는 애니메이션 값 설정
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, // 투명도 0 -> 1 (보이게)
      duration: 1000, // 1초 동안 스르륵 나타남
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    logoContainer: {
      alignItems: "center",
    },
    iconImage: {
      width: 100,
      height: 100,
    },
    textImage: {
      width: 180,
      height: 40,
    },
  });

  return (
    <View style={s.container}>
      <Animated.View style={[s.logoContainer, { opacity: fadeAnim }]}>
        {/* 1. 중앙 트럭 로고 (왼쪽 이미지) */}
        <Image
          source={require("../../../../assets/images/logo-icon.png")}
          style={s.iconImage}
          resizeMode="contain"
        />
        {/* 2. 하단 텍스트 로고 (오른쪽 이미지) */}
        <Image
          source={require("../../../../assets/images/logo-text.png")}
          style={s.textImage}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}
