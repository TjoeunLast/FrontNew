const PROFILE_IMAGE_STORAGE_KEY_PREFIX = "baro_profile_image_url_v2:";

function normalizeIdentity(identity?: string) {
  return String(identity ?? "").trim().toLowerCase();
}

export function buildProfileImageStorageKey(identity?: string) {
  const normalized = normalizeIdentity(identity);
  return `${PROFILE_IMAGE_STORAGE_KEY_PREFIX}${normalized || "anonymous"}`;
}

export function buildProfileImageFileStem(identity?: string) {
  const normalized = normalizeIdentity(identity).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `profile-image-${normalized || "anonymous"}`;
}
