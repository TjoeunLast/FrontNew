export interface ImageInfo {
  imageUrl: string;    // S3 등 저장소의 전체 접근 URL
  s3Key: string;       // 저장소 내부 고유 키
  originalName: string; // 원본 파일명
}