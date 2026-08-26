#!/usr/bin/env bun
/**
 * First-run setup: create .env files from the checked-in examples and
 * generate a real auth secret. Safe to re-run — it never overwrites an
 * existing .env.
 *
 * Usage: bun run setup
 */
import { existsSync } from "node:fs";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const targets = [".env", "apps/server/.env", "apps/web/.env"];

for (const target of targets) {
	const dest = join(root, target);
	const src = `${dest}.example`;

	if (existsSync(dest)) {
		console.log(`skip   ${target} (already exists)`);
		continue;
	}
	if (!existsSync(src)) {
		console.log(`skip   ${target} (no ${target}.example)`);
		continue;
	}

	await copyFile(src, dest);
	console.log(`create ${target}`);
}

// Fill in any secret the copied file left blank.
const serverEnv = join(root, "apps/server/.env");
if (existsSync(serverEnv)) {
	let contents = await readFile(serverEnv, "utf8");
	let changed = false;

	for (const key of ["BETTER_AUTH_SECRET", "ENCRYPTION_KEY"]) {
		const blank = new RegExp(`^${key}=\\s*$`, "m");
		if (!blank.test(contents)) continue;

		const secret = Buffer.from(
			crypto.getRandomValues(new Uint8Array(32)),
		).toString("base64");
		contents = contents.replace(blank, `${key}=${secret}`);
		changed = true;
		console.log(`create ${key}`);
	}

	if (changed) await writeFile(serverEnv, contents);
}

console.log(`
Next:
  bun run db:start
  bun run db:migrate
  bun run dev`);
