import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function CommonPaymentScreen() {
  return (
    <View style={s.page}>
      <Text style={s.title}>결제 방식</Text>
      <Text style={s.desc}>현재 사용 중인 결제 방식은 토스 결제와 착불 결제입니다.</Text>
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
