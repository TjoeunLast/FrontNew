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

// 부모 컴포넌트로부터 받을 Props 정의
interface AddressSearchProps {
  visible: boolean;                  // 모달 열림/닫힘 상태
  onClose: () => void;               // 모달 닫기 함수
  onComplete: (address: string) => void; // 완료 시 주소 텍스트를 넘겨줄 함수
}

const AddressSearch = ({ visible, onClose, onComplete }: AddressSearchProps) => {
  const handleComplete = (data: AddressData) => {
    // 요구하신 대로 상세 주소 조합 없이 기본 주소만 깔끔하게 넘깁니다.
    onComplete(data.address); 
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