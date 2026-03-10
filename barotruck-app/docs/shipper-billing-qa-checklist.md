# Shipper Billing QA Checklist

기준일: 2026-03-10

## 1. 범위

- 화주 앱 billing agreement 등록 진입
- 화주 앱 billing agreement 조회
- 화주 앱 billing agreement 해지
- 실패 메시지 처리
- Toss `prepare / confirm / cancel / billing` 통합 점검

## 2. 사전 준비

- 앱 실행 경로: `C:\ytheory\Backend\Barotruck\FrontNew\barotruck-app`
- 백엔드 실행 경로: `C:\ytheory\springPro\Backend\Barotruck`
- 앱 환경변수
  - `EXPO_PUBLIC_API_BASE_URL`
- 백엔드 설정 확인
  - `payment.toss.client-key`
  - `payment.toss.secret-key`
  - `payment.toss.billing.redirect.success-url`
  - `payment.toss.billing.redirect.fail-url`
  - billing 관련 DB 테이블과 컬럼 반영 여부
- 테스트 계정
  - 화주 계정 1개
  - 관리자 계정 1개
- 테스트 주문
  - 화주가 본인 주문으로 Toss `prepare / confirm` 가능한 주문 1건
  - 관리자 취소 검증용 결제 완료 주문 1건

## 3. 화면 진입

- 화주 앱 로그인
- `내 정보 > 결제 수단 관리` 진입
- 등록 버튼 클릭 시 `billing 카드 등록` WebView 화면 진입 확인

## 4. 체크리스트

- [ ] `GET /api/v1/payments/billing/context` 호출 성공
- [ ] 등록 화면에서 Toss billing 인증 WebView 노출
- [ ] 성공 URL에서 `authKey` 수신 후 `POST /api/v1/payments/billing/agreements` 호출 성공
- [ ] 등록 완료 후 이전 화면 복귀
- [ ] `GET /api/v1/payments/billing/agreements/me` 조회 결과가 앱 화면에 반영
- [ ] 내 정보 화면 결제수단 라벨이 실제 카드사명 또는 `미등록`으로 반영
- [ ] `DELETE /api/v1/payments/billing/agreements/me` 해지 성공
- [ ] 해지 후 상태가 `INACTIVE` 또는 서버 응답 기준 비활성 상태로 보임
- [ ] billing 등록 실패 시 상단 실패 메시지와 Alert 노출
- [ ] billing 해지 실패 시 상단 실패 메시지와 토스트 노출
- [ ] Toss `prepare` 성공
- [ ] Toss `confirm` 성공
- [ ] 관리자 `cancel` 성공 또는 정책상 차단 메시지 확인
- [ ] 실패 코드와 메시지가 QA 기록에 남음

## 5. 재현 시나리오

### 시나리오 A. billing agreement 최초 등록

1. 화주 앱에서 `내 정보 > 결제 수단 관리` 진입
2. `등록하기` 클릭
3. WebView가 열리면 Toss 카드 인증 진행
4. 인증 성공 후 앱 Alert에 `자동결제 카드가 등록되었습니다.` 노출 확인
5. 이전 화면으로 복귀한 뒤 상태 카드 확인

기대 결과

- 상태가 `사용 중`으로 보인다.
- 카드사명 또는 마스킹 카드번호가 보인다.
- `고객 키`, `billing key`, `최초 인증 시각`이 표시된다.

### 시나리오 B. billing agreement 재등록

1. 기존 ACTIVE agreement 상태에서 `다시 등록` 클릭
2. 다른 테스트 카드 또는 동일 카드로 인증 진행
3. 등록 완료 후 상태 카드 새로고침

기대 결과

- 최신 agreement 정보로 갱신된다.
- 서버 정책상 이전 ACTIVE agreement는 비활성 처리된다.

### 시나리오 C. billing agreement 조회만 수행

1. `결제 수단 관리` 화면 진입
2. `새로고침` 클릭

기대 결과

- 서버 최신 상태가 다시 반영된다.
- 오류가 없으면 실패 메시지 영역이 비어 있다.

### 시나리오 D. billing agreement 해지

1. ACTIVE agreement 상태에서 `해지` 클릭
2. 확인 Alert에서 `해지` 선택

기대 결과

- 토스트에 해지 성공 메시지가 표시된다.
- 상태가 `해지됨`으로 바뀐다.
- 자동청구 재사용을 위해서는 `등록하기` 또는 `다시 등록`이 필요하다.

### 시나리오 E. billing 등록 실패 메시지

1. 서버의 billing client key를 비우거나 잘못된 값으로 설정
2. `등록하기` 클릭

기대 결과

- 등록 화면에 실패 메시지가 표시된다.
- `다시 시도` 버튼이 보인다.
- 앱이 비정상 종료되지 않는다.

대체 실패 재현

- 토스 인증 단계에서 사용자 취소
- 성공 URL에 `authKey` 없이 리다이렉트되는 테스트 payload 사용
- `POST /billing/agreements`가 400 또는 500을 반환하도록 서버 상태 조정

### 시나리오 F. Toss prepare / confirm

1. 화주 주문 상세 또는 정산 화면에서 Toss 결제 진입
2. `POST /api/v1/payments/orders/{orderId}/toss/prepare` 성공 확인
3. Toss 결제 완료 후 `POST /api/v1/payments/orders/{orderId}/toss/confirm` 성공 확인

기대 결과

- 주문 결제 상태가 `PAID`로 반영된다.
- 차주 확인 전까지 driver 측에서는 `PAID` 대기 상태로 보인다.

### 시나리오 G. 관리자 cancel

1. 관리자 토큰 또는 관리자 API 테스트 도구 준비
2. `POST /api/admin/payment/orders/{orderId}/cancel` 호출
3. 필요 시 `cancelReason`, `cancelAmount` 전달

기대 결과

- 취소 가능 주문이면 내부 상태가 `CANCELLED`로 반영된다.
- 정책상 취소 불가 주문이면 차단 사유 메시지가 반환된다.

주의

- 현재 화주 앱에는 취소 UI를 열지 않았다.
- cancel 검증은 관리자 권한 기준 API 호출로 수행한다.

## 6. 권장 로그 기록

- 테스트 일시
- 테스트 계정
- 주문 ID
- paymentKey
- pgOrderId
- customerKey
- authKey 수신 여부
- 서버 응답 코드
- 서버 메시지
- 실제 앱 화면 결과

## 7. 실패 분류 기준

- 앱 진입 실패
  - 화면 진입 불가, WebView 미노출
- Toss SDK 실패
  - 스크립트 로드 실패, 외부 카드 앱 호출 실패
- 서버 billing 실패
  - `context`, `agreements`, `deactivate` API 실패
- 일반 결제 실패
  - `prepare`, `confirm` 실패
- 관리자 취소 실패
  - 정책상 차단, Toss 취소 실패, 권한 오류

## 8. 현재 구현 기준 메모

- billing 등록/조회/해지는 화주 앱 UI에서 수행 가능
- prepare/confirm 래퍼는 기존 앱 흐름을 유지
- cancel 래퍼는 추가했지만 관리자 권한 API라 앱 UI에는 노출하지 않음
- billing 실패 메시지는 등록 화면과 관리 화면에서 모두 다시 확인 가능
