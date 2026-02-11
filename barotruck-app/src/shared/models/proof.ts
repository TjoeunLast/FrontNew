/**
 * 운송 완료 증빙 상세 정보 (ProofResponseDto.java 대응)
 */
export interface ProofResponse {
  proofId: number;
  receiptImageUrl: string;   // 인수증 사진 URL
  signatureImageUrl: string; // 수령인 서명 이미지 URL
  recipientName: string;      // 물건을 받은 사람 이름
}

/**
 * 증빙 업로드 요청 데이터 (Multipart 전송용)
 */
export interface ProofUploadRequest {
  orderId: number;
  receipt?: any;      // 이미지 파일 (Blob/File)
  signature?: any;    // 서명 파일 (Blob/File)
  recipientName: string;
}