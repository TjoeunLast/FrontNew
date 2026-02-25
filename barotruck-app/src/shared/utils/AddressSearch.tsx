// src/shared/utils/AddressSearch.tsx
import React from 'react';
import { Modal, SafeAreaView, Button } from 'react-native';
import Postcode from '@actbase/react-daum-postcode';

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

  const handleComplete = (data: AddressData) => {
    const lat = pickCoordinate(data, ["y", "lat", "latitude"]);
    const lng = pickCoordinate(data, ["x", "lng", "longitude"]);
    onComplete({ address: data.address, lat, lng });
    // 주소를 넘겨준 뒤 모달 닫기
    onClose(); 
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={{ flex: 1 }}>
        <Postcode
          style={{ width: '100%', height: '100%' }}
          jsOptions={{ animation: true }}
          onSelected={handleComplete}
          onError={(error: unknown) => console.error(error)}
        />
        <Button title="닫기" onPress={onClose} color="red" />
      </SafeAreaView>
    </Modal>
  );
};

export default AddressSearch;
