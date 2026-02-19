import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { Button, Card } from "@/shared/ui/base";
import { tokenStorage } from "@/shared/utils/tokenStorage";
import { getCurrentUserSnapshot } from "@/shared/utils/currentUserStorage";

export default function Index() {
  const t = useAppTheme(); // 테마 객체 가져오기
  const c = t.colors; // 색상 팔레트 추출
  const router = useRouter(); // Expo Router 네비게이션 도구
  const [checkingAutoLogin, setCheckingAutoLogin] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const token = await tokenStorage.getItem("userToken");
        if (!token) return;

        const snapshot = await getCurrentUserSnapshot();
        const role = String(snapshot?.role ?? "").toUpperCase();

        if (role === "DRIVER") {
          router.replace("/(driver)/(tabs)");
          return;
        }

        if (role === "SHIPPER") {
          router.replace("/(shipper)/(tabs)");
          return;
        }

        router.replace("/(auth)/login");
      } finally {
        if (active) setCheckingAutoLogin(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  if (checkingAutoLogin) {
    return <View style={[s.container, { backgroundColor: c.bg.canvas }]} />;
  }

  return (
    <View style={[s.container, { backgroundColor: c.bg.canvas }]}>
      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* 헤더: 로고 및 설명 */}
        <View style={s.header}>
          <Text style={[s.logo, { color: c.brand.primary }]}>BARO TRUCK</Text>
          <Text style={[s.sub, { color: c.text.secondary }]}>
            바로트럭 개발 게이트웨이 🚛
          </Text>
        </View>

        {/* 섹션 1: 실제 서비스 경로 */}
        <Card style={s.card}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>
            🚀 실 서비스 화면
          </Text>
          <View style={s.btnGroup}>
            <Button
              title="차주(기사) 홈 이동"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.push("/(auth)/login")}
            />
            <Button
              title="화주(고객) 홈 이동"
              variant="outline"
              size="lg"
              fullWidth
              onPress={() => router.push("/(auth)/login")}
            />
          </View>
        </Card>

        {/* 섹션 2: 개발자 도구 */}
        <Card style={s.card}>
          <Text style={[s.sectionTitle, { color: c.text.primary }]}>
            🛠 개발자 도구
          </Text>
          <View style={s.btnGroup}>
            <Button
              title="UI 컴포넌트 프리뷰"
              variant="accent"
              fullWidth
              onPress={() => router.push("/ui-preview")}
            />
            
            <Button
              title="로그인 테스트"
              variant="ghost"
              fullWidth
              onPress={() => router.push("/(auth)/login")}
            />
          </View>
          <Text style={[s.desc, { color: c.text.secondary }]}>
            수정된 모든 UI 컴포넌트는 프리뷰에서 확인 가능합니다.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 60, gap: 20 },
  header: { alignItems: "center", marginBottom: 10 },
  logo: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  sub: { fontSize: 16, fontWeight: "600", marginTop: 4 },
  card: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  btnGroup: { gap: 10 },
  desc: { fontSize: 12, marginTop: 4, textAlign: "center" },
});
