#!/usr/bin/env bun
/**
 * Scaffolds a new workspace package that matches the conventions in
 * packages/ — correct scope, shared tsconfig, and a typecheck task so it is
 * covered by `bun run verify` from the moment it exists.
 *
 * Usage: bun run gen:package <name>
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const name = process.argv[2];

if (!name) {
	console.error("Usage: bun run gen:package <name>");
	process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(name)) {
	console.error(
		`Invalid package name "${name}". Use lowercase letters, digits and hyphens.`,
	);
	process.exit(1);
}

const root = new URL("..", import.meta.url).pathname;
const scope: string = JSON.parse(
	await readFile(join(root, "package.json"), "utf8"),
).name;
const dir = join(root, "packages", name);

if (existsSync(dir)) {
	console.error(`packages/${name} already exists.`);
	process.exit(1);
}

const pkgName = `@${scope}/${name}`;

await mkdir(join(dir, "src"), { recursive: true });

await writeFile(
	join(dir, "package.json"),
	`${JSON.stringify(
		{
			name: pkgName,
			version: "0.0.0",
			private: true,
			type: "module",
			exports: { ".": "./src/index.ts" },
			scripts: { "check-types": "tsc --noEmit" },
			devDependencies: {
				typescript: "catalog:",
				"@types/bun": "catalog:",
				[`@${scope}/config`]: "workspace:*",
			},
		},
		null,
		"\t",
	)}\n`,
);

await writeFile(
	join(dir, "tsconfig.json"),
	`${JSON.stringify({ extends: `@${scope}/config/tsconfig.base.json` }, null, "\t")}\n`,
);

await writeFile(
	join(dir, "src", "index.ts"),
	`export const ${name.replace(/-./g, (m) => m[1].toUpperCase())} = {};\n`,
);

console.log(`Created packages/${name} (${pkgName})

Next:
  bun install
  import { ... } from "${pkgName}"`);
