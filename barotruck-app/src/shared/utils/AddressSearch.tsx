// src/shared/utils/AddressSearch.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Postcode from "@actbase/react-daum-postcode";

import { KakaoLocalApi } from "@/shared/api/kakaoLocalService";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

interface AddressData {
  zonecode: number | string;
  address: string;
  buildingName: string;
  addressType: string;
  bname: string;
  [key: string]: any;
}

export interface SelectedAddress {
  address: string;
  lat?: number;
  lng?: number;
}

// 부모 컴포넌트로부터 받을 Props 정의
interface AddressSearchProps {
  visible: boolean;                  // 모달 열림/닫힘 상태
  onClose: () => void;               // 모달 닫기 함수
  onComplete: (result: SelectedAddress) => void; // 완료 시 주소/좌표를 넘겨줄 함수
}

const AddressSearch = ({ visible, onClose, onComplete }: AddressSearchProps) => {
  const { colors } = useAppTheme();

  const parseCoordinate = (value: unknown): number | undefined => {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };

  const pickCoordinate = (data: AddressData, keys: string[]): number | undefined => {
    for (const key of keys) {
      const parsed = parseCoordinate(data[key]);
      if (parsed !== undefined) return parsed;
    }
    return undefined;
  };

  const handleComplete = async (data: AddressData) => {
    let lat = pickCoordinate(data, ["y", "lat", "latitude"]);
    let lng = pickCoordinate(data, ["x", "lng", "longitude"]);

    console.log("[AddressSearch] selected address:", data.address);
    console.log("[AddressSearch] postcode coordinates:", { lat, lng });

    if (lat === undefined || lng === undefined) {
      try {
        console.log("[AddressSearch] postcode coordinates missing, fallback to Kakao Local API");
        const geocoded = await KakaoLocalApi.geocodeAddress(data.address);
        lat = geocoded?.lat;
        lng = geocoded?.lng;
        console.log("[AddressSearch] Kakao Local API coordinates:", geocoded);
      } catch (error) {
        console.error("Failed to geocode selected address:", error);
      }
    }

    console.log("[AddressSearch] final coordinates:", { address: data.address, lat, lng });
    onComplete({ address: data.address, lat, lng });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]} edges={["top", "bottom"]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.bg.canvas,
              borderBottomColor: colors.border.default,
            },
          ]}
        >
          <Pressable onPress={onClose} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>주소 검색</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Postcode
          style={styles.postcode}
          jsOptions={{ animation: true }}
          onSelected={handleComplete}
          onError={(error: unknown) => console.error(error)}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  postcode: {
    flex: 1,
    width: "100%",
  },
});

export default AddressSearch;
