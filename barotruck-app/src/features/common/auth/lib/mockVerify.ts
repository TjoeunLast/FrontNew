// src/features/common/auth/lib/mockVerify.ts
import { Platform } from "react-native";

// Web는 localStorage, Native는 AsyncStorage
let AsyncStorage: any = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
}

const USERS_KEY = "baro_mock_users"; // [{ email, phone }]
const OTP_KEY_PREFIX = "baro_mock_otp:"; // baro_mock_otp:01012345678 -> { code, exp }

type UserLite = { email: string; phone: string };

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    if (Platform.OS === "web") {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    }
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  const raw = JSON.stringify(value);
  if (Platform.OS === "web") window.localStorage.setItem(key, raw);
  else await AsyncStorage.setItem(key, raw);
}

export async function mockCheckEmailDuplicate(email: string): Promise<{ ok: boolean; reason?: string }> {
  const users = await readJson<UserLite[]>(USERS_KEY, []);
  const exists = users.some((u) => u.email === email);
  if (exists) return { ok: false, reason: "이미 사용 중인 이메일이에요." };
  return { ok: true };
}

export async function mockSendPhoneOtp(phoneDigits: string): Promise<{ code: string; expAt: number }> {
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6자리
  const expAt = Date.now() + 3 * 60 * 1000; // 3분
  await writeJson(`${OTP_KEY_PREFIX}${phoneDigits}`, { code, expAt });
  return { code, expAt };
}

export async function mockVerifyPhoneOtp(phoneDigits: string, code: string): Promise<{ ok: boolean; reason?: string }> {
  const saved = await readJson<{ code: string; expAt: number } | null>(`${OTP_KEY_PREFIX}${phoneDigits}`, null);
  if (!saved) return { ok: false, reason: "인증요청을 먼저 해주세요." };
  if (Date.now() > saved.expAt) return { ok: false, reason: "인증 시간이 만료됐어요. 다시 요청해주세요." };
  if (saved.code !== code) return { ok: false, reason: "인증번호가 올바르지 않아요." };
  return { ok: true };
}

export async function mockCommitUser(email: string, phone: string): Promise<void> {
  const users = await readJson<UserLite[]>(USERS_KEY, []);
  const next = [...users.filter((u) => u.email !== email), { email, phone }];
  await writeJson(USERS_KEY, next);
}
