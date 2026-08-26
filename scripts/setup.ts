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

// Fill in an auth secret if the copied file left it blank.
const serverEnv = join(root, "apps/server/.env");
if (existsSync(serverEnv)) {
	const contents = await readFile(serverEnv, "utf8");
	if (/^BETTER_AUTH_SECRET=\s*$/m.test(contents)) {
		const secret = Buffer.from(
			crypto.getRandomValues(new Uint8Array(32)),
		).toString("base64");
		await writeFile(
			serverEnv,
			contents.replace(
				/^BETTER_AUTH_SECRET=\s*$/m,
				`BETTER_AUTH_SECRET=${secret}`,
			),
		);
		console.log("create BETTER_AUTH_SECRET");
	}
}

console.log(`
Next:
  bun run db:start
  bun run db:migrate
  bun run dev`);
