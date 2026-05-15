import crypto from "node:crypto";

const ENCRYPTION_PREFIX = "enc::";
const DEFAULT_SECRET =
  process.env.APP_ENCRYPTION_KEY ||
  "local-development-only-orrico-secret-key";

function getKeyMaterial() {
  return crypto
    .createHash("sha256")
    .update(DEFAULT_SECRET)
    .digest();
}

export function encryptSecret(value) {
  const normalizedValue = String(value || "");

  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue.startsWith(ENCRYPTION_PREFIX)) {
    return normalizedValue;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    getKeyMaterial(),
    iv,
  );
  const encrypted = Buffer.concat([
    cipher.update(normalizedValue, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(value) {
  const normalizedValue = String(value || "");

  if (!normalizedValue) {
    return "";
  }

  if (!normalizedValue.startsWith(ENCRYPTION_PREFIX)) {
    return normalizedValue;
  }

  const payload = normalizedValue.slice(
    ENCRYPTION_PREFIX.length,
  );
  const [ivHex, authTagHex, encryptedHex] = payload.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Stored secret format is invalid.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKeyMaterial(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
