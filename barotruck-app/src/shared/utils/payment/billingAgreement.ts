import type {
  BillingAgreementStatus,
  ShipperBillingAgreementResponse,
} from '@/shared/models/payment';

type BillingAgreementLike = Pick<
  ShipperBillingAgreementResponse,
  'status' | 'cardCompany'
>;

export function isActiveBillingAgreement(
  agreement?: Pick<ShipperBillingAgreementResponse, 'status'> | null
) {
  return agreement?.status === 'ACTIVE';
}

export function getBillingAgreementStatusLabel(
  status?: BillingAgreementStatus | null
) {
  switch (status) {
    case 'ACTIVE':
      return '사용 중';
    case 'INACTIVE':
      return '해지됨';
    case 'DELETED':
      return '삭제됨';
    default:
      return '미등록';
  }
}

export function getBillingAgreementMethodLabel(
  agreement?: BillingAgreementLike | null
) {
  if (!isActiveBillingAgreement(agreement)) {
    return '미등록';
  }

  const cardCompany = String(agreement?.cardCompany ?? '').trim();
  return cardCompany || '카드 등록됨';
}

export function formatBillingAgreementDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  const hh = String(parsed.getHours()).padStart(2, '0');
  const min = String(parsed.getMinutes()).padStart(2, '0');

  return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
}
