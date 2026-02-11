// 1. 레이아웃 영역 (Layouts)
export { AppLayout } from "./layout/AppLayout"; // 전체 화면 프레임 및 스크롤 제어
export { AppTopBar } from "./layout/AppTopBar"; // 페이지 상단 헤더 및 뒤로가기
export { BottomCTA } from "./layout/BottomCTA"; // 하단 고정 액션 버튼 영역

// 2. 기본 요소 영역 (Base Components)
export { Button } from "./base/Button"; // 다양한 스타일의 공통 버튼
export { IconButton } from "./base/IconButton"; // 아이콘 전용 클릭 요소
export { Card } from "./base/Card"; // 컨텐츠 그룹화 카드 컨테이너
export { Divider } from "./base/Divider"; // 요소 간 구분을 위한 절취선

// 3. 입력 양식 영역 (Form Components)
export { Chip } from "./form/Chip"; // 단일 선택 및 필터용 칩
export { SegmentedTabs } from "./form/SegmentedTabs"; // 슬라이딩 스타일 탭 선택기
export { TextField } from "./form/TextField"; // 라벨 및 에러 처리가 포함된 입력창

// 4. 피드백 및 알림 영역 (Feedback Components)
export { Badge } from "./feedback/Badge"; // 상태 및 속성 표시용 배지
export { EmptyState } from "./feedback/EmptyState"; // 데이터 부재 시 안내 화면
export { Dialog } from "./feedback/Dialog"; // 확인/취소용 팝업 대화상자
export { LoadingOverlay } from "./feedback/LoadingOverlay"; // 전역 차단 로딩 화면
export { ToastProvider, useToast } from "./feedback/ToastProvider"; // 휘발성 알림 시스템
