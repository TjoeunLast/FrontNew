import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function CommonPaymentScreen() {
  return (
    <View style={s.page}>
      {/* 공통 결제 정책 안내 화면: 역할별 화면에서 동일 정책 문구를 재사용 */}
      <Text style={s.title}>Common Payment</Text>
      <Text style={s.desc}>Enabled payment options are card (Toss) and cash-on-delivery only.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F5F7FB",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
  },
});
