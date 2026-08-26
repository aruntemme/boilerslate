/**
 * Credential encryption.
 *
 * These run against the real crypto implementation — the whole point is that a
 * leaked database row is useless, so the tamper cases matter as much as the
 * round trip.
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto";

beforeAll(() => {
	process.env.ENCRYPTION_KEY ||= "test-encryption-key-at-least-32-chars-long";
});

describe("encryptSecret / decryptSecret", () => {
	test("round-trips a value", () => {
		const secret = "sk-ant-api03-abcdefghijklmnop";
		expect(decryptSecret(encryptSecret(secret))).toBe(secret);
	});

	test("round-trips unicode and long values", () => {
		const secret = `${"ключ-🔑-".repeat(50)}end`;
		expect(decryptSecret(encryptSecret(secret))).toBe(secret);
	});

	test("produces different ciphertext each time", () => {
		// A fresh IV per call, so identical keys do not produce identical rows.
		const a = encryptSecret("same-value");
		const b = encryptSecret("same-value");
		expect(a).not.toBe(b);
		expect(decryptSecret(a)).toBe(decryptSecret(b));
	});

	test("ciphertext does not contain the plaintext", () => {
		const secret = "sk-super-secret-value";
		expect(encryptSecret(secret)).not.toContain(secret);
	});

	test("rejects tampered ciphertext", () => {
		const encoded = encryptSecret("sensitive");
		const parts = encoded.split(".");
		// Flip a character in the ciphertext segment.
		const data = parts[2] as string;
		parts[2] = (data[0] === "A" ? "B" : "A") + data.slice(1);
		expect(() => decryptSecret(parts.join("."))).toThrow();
	});

	test("rejects a swapped auth tag", () => {
		const a = encryptSecret("value-a").split(".");
		const b = encryptSecret("value-b").split(".");
		expect(() => decryptSecret([a[0], b[1], a[2]].join("."))).toThrow();
	});

	test("rejects malformed input", () => {
		expect(() => decryptSecret("not-encrypted")).toThrow();
		expect(() => decryptSecret("a.b")).toThrow();
	});

	test("cannot decrypt under a different master key", () => {
		const encoded = encryptSecret("tenant-key");
		const original = process.env.ENCRYPTION_KEY;
		process.env.ENCRYPTION_KEY = "a-completely-different-key-32-chars-x";
		try {
			expect(() => decryptSecret(encoded)).toThrow();
		} finally {
			process.env.ENCRYPTION_KEY = original;
		}
	});

	test("refuses to encrypt without a master key", () => {
		const original = process.env.ENCRYPTION_KEY;
		process.env.ENCRYPTION_KEY = "";
		try {
			expect(() => encryptSecret("x")).toThrow(/ENCRYPTION_KEY/);
		} finally {
			process.env.ENCRYPTION_KEY = original;
		}
	});
});

describe("maskSecret", () => {
	test("keeps only a recognisable fragment", () => {
		const masked = maskSecret("sk-ant-api03-abcdefghijklmnop");
		expect(masked).toBe("sk-…mnop");
		expect(masked).not.toContain("api03");
	});

	test("reveals nothing for a short value", () => {
		expect(maskSecret("short")).toBe("•••••");
	});
});
