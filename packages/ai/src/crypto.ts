/**
 * Envelope encryption for provider API keys.
 *
 * Keys are stored per organization, so they cannot live in env vars. They are
 * encrypted with AES-256-GCM under a server-held master key before they touch
 * the database, and are only ever decrypted in the server process immediately
 * before a provider call. They are never sent to the browser — the API returns
 * a masked hint instead.
 *
 * This protects against a leaked database dump. It does not protect against a
 * compromised server, which holds the master key by necessity. For a stronger
 * boundary, swap `getMasterKey` for a call to a KMS.
 */
import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits, the size GCM is specified for
const TAG_LENGTH = 16;

function getMasterKey(): Buffer {
	const secret = process.env.ENCRYPTION_KEY;
	if (!secret || secret.length < 32) {
		throw new Error(
			"ENCRYPTION_KEY must be set to at least 32 characters to store provider credentials. Generate one with: openssl rand -base64 32",
		);
	}
	// SHA-256 gives a uniform 32-byte key from an arbitrary-length secret.
	return createHash("sha256").update(secret).digest();
}

/**
 * Returns `<iv>.<tag>.<ciphertext>`, all base64url. Self-describing so the
 * pieces cannot be mixed up, and safe to store in a text column.
 */
export function encryptSecret(plaintext: string): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, getMasterKey(), iv);
	const ciphertext = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();

	return [
		iv.toString("base64url"),
		tag.toString("base64url"),
		ciphertext.toString("base64url"),
	].join(".");
}

export function decryptSecret(encoded: string): string {
	const parts = encoded.split(".");
	if (parts.length !== 3) {
		throw new Error("Malformed encrypted secret.");
	}
	const [ivPart, tagPart, dataPart] = parts as [string, string, string];

	const iv = Buffer.from(ivPart, "base64url");
	const tag = Buffer.from(tagPart, "base64url");
	if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
		throw new Error("Malformed encrypted secret.");
	}

	const decipher = createDecipheriv(ALGORITHM, getMasterKey(), iv);
	decipher.setAuthTag(tag);

	// Throws if the ciphertext or tag was tampered with — that is the point.
	return Buffer.concat([
		decipher.update(Buffer.from(dataPart, "base64url")),
		decipher.final(),
	]).toString("utf8");
}

/**
 * What the UI shows instead of the key: enough to recognise which key is
 * stored, not enough to use it.
 */
export function maskSecret(plaintext: string): string {
	if (plaintext.length <= 8) return "•".repeat(plaintext.length);
	return `${plaintext.slice(0, 3)}…${plaintext.slice(-4)}`;
}
