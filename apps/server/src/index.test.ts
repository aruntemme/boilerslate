/**
 * Integration tests for auth + multi-tenancy.
 *
 * These run the real Hono app against a real Postgres. Nothing is mocked and
 * nothing is stubbed: if these pass, signup, sessions, organizations and
 * tenant isolation genuinely work.
 *
 * Requires a running database:  bun run db:start && bun run db:migrate
 */
import { describe, expect, test } from "bun:test";
import app from "./index";

/** Parsed JSON of unknown shape; assertions below narrow it per test. */
// biome-ignore lint/suspicious/noExplicitAny: test helper for arbitrary API responses
type Json = any;

const ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3001";

function uniqueEmail(prefix: string) {
	return `${prefix}-${crypto.randomUUID()}@example.test`;
}

/** Calls the app in-process and returns the response plus any session cookie. */
async function call(
	path: string,
	init: RequestInit & { cookie?: string } = {},
) {
	const headers = new Headers(init.headers);
	headers.set("Origin", ORIGIN);
	if (init.body) headers.set("Content-Type", "application/json");
	if (init.cookie) headers.set("Cookie", init.cookie);

	const res = await app.request(path, { ...init, headers });
	const setCookie = res.headers.getSetCookie?.() ?? [];
	const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
	const text = await res.text();
	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		body = text;
	}
	return { status: res.status, body: body as Json, cookie };
}

/** Signs up a fresh user and returns their session cookie. */
async function signUp(prefix: string) {
	const email = uniqueEmail(prefix);
	const res = await call("/api/auth/sign-up/email", {
		method: "POST",
		body: JSON.stringify({ email, password: "TestPassword123!", name: prefix }),
	});
	expect(res.status).toBe(200);
	expect(res.cookie).not.toBe("");
	return { email, cookie: res.cookie };
}

describe("health", () => {
	test("serves the root route", async () => {
		const res = await call("/");
		expect(res.status).toBe(200);
		expect(res.body).toBe("OK");
	});
});

describe("authentication", () => {
	test("signs a user up and issues a working session", async () => {
		const { email, cookie } = await signUp("auth");

		const session = await call("/api/auth/get-session", { cookie });
		expect(session.status).toBe(200);
		expect(session.body.user.email).toBe(email);
	});

	test("rejects a duplicate email", async () => {
		const { email } = await signUp("dupe");
		const again = await call("/api/auth/sign-up/email", {
			method: "POST",
			body: JSON.stringify({
				email,
				password: "TestPassword123!",
				name: "Dupe",
			}),
		});
		expect(again.status).toBeGreaterThanOrEqual(400);
	});

	test("rejects a wrong password", async () => {
		const { email } = await signUp("wrongpw");
		const res = await call("/api/auth/sign-in/email", {
			method: "POST",
			body: JSON.stringify({ email, password: "NotThePassword1!" }),
		});
		expect(res.status).toBeGreaterThanOrEqual(400);
	});
});

describe("protected procedures", () => {
	test("returns data to an authenticated caller", async () => {
		const { email, cookie } = await signUp("rpc");
		const res = await call("/rpc/privateData", {
			method: "POST",
			body: "{}",
			cookie,
		});
		expect(res.status).toBe(200);
		expect(res.body.json.user.email).toBe(email);
	});

	test("rejects an anonymous caller with 401", async () => {
		const res = await call("/rpc/privateData", { method: "POST", body: "{}" });
		expect(res.status).toBe(401);
		expect(res.body.json.code).toBe("UNAUTHORIZED");
	});
});

describe("multi-tenancy", () => {
	test("creates an organization with the creator as owner", async () => {
		const { cookie } = await signUp("owner");
		const slug = `org-${crypto.randomUUID().slice(0, 8)}`;

		const created = await call("/api/auth/organization/create", {
			method: "POST",
			body: JSON.stringify({ name: "Test Org", slug }),
			cookie,
		});
		expect(created.status).toBe(200);
		expect(created.body.slug).toBe(slug);
		expect(created.body.members[0].role).toBe("owner");

		const list = await call("/api/auth/organization/list", { cookie });
		expect(list.status).toBe(200);
		expect(list.body.map((o: Json) => o.slug)).toContain(slug);
	});

	test("rejects a duplicate organization slug", async () => {
		const { cookie } = await signUp("slug");
		const slug = `org-${crypto.randomUUID().slice(0, 8)}`;
		const body = JSON.stringify({ name: "First", slug });

		const first = await call("/api/auth/organization/create", {
			method: "POST",
			body,
			cookie,
		});
		expect(first.status).toBe(200);

		const second = await call("/api/auth/organization/create", {
			method: "POST",
			body,
			cookie,
		});
		expect(second.status).toBeGreaterThanOrEqual(400);
	});

	test("isolates tenants: a non-member cannot read another org", async () => {
		const owner = await signUp("isolation-owner");
		const slug = `org-${crypto.randomUUID().slice(0, 8)}`;
		const created = await call("/api/auth/organization/create", {
			method: "POST",
			body: JSON.stringify({ name: "Private Org", slug }),
			cookie: owner.cookie,
		});
		expect(created.status).toBe(200);
		const orgId = created.body.id;

		const outsider = await signUp("isolation-outsider");

		// The outsider sees no organizations at all.
		const list = await call("/api/auth/organization/list", {
			cookie: outsider.cookie,
		});
		expect(list.body).toEqual([]);

		// And is refused even when naming the organization id directly.
		const direct = await call(
			`/api/auth/organization/get-full-organization?organizationId=${orgId}`,
			{ cookie: outsider.cookie },
		);
		expect(direct.status).toBe(403);
	});

	test("refuses organization creation to anonymous callers", async () => {
		const res = await call("/api/auth/organization/create", {
			method: "POST",
			body: JSON.stringify({
				name: "Nope",
				slug: `org-${crypto.randomUUID().slice(0, 8)}`,
			}),
		});
		expect(res.status).toBe(401);
	});
});

describe("ai provider configuration", () => {
	/** Signs up, creates an organization, and returns a cookie scoped to it. */
	async function signUpWithOrg(prefix: string) {
		const { cookie } = await signUp(prefix);
		const slug = `org-${crypto.randomUUID().slice(0, 8)}`;
		const created = await call("/api/auth/organization/create", {
			method: "POST",
			body: JSON.stringify({ name: `${prefix} Org`, slug }),
			cookie,
		});
		expect(created.status).toBe(200);

		// Organization-scoped procedures read the *active* organization from the
		// session, which create() does not set on its own.
		const activated = await call("/api/auth/organization/set-active", {
			method: "POST",
			body: JSON.stringify({ organizationId: created.body.id }),
			cookie,
		});
		expect(activated.status).toBe(200);

		return { cookie, organizationId: created.body.id as string };
	}

	/** oRPC's RPC protocol wraps both request and response in a `json` envelope. */
	async function rpc(path: string, cookie: string, input: unknown = {}) {
		return call(`/rpc/${path}`, {
			method: "POST",
			body: JSON.stringify({ json: input }),
			cookie,
		});
	}

	test("rejects anonymous callers", async () => {
		const res = await call("/rpc/ai/listProviders", {
			method: "POST",
			body: "{}",
		});
		expect(res.status).toBe(401);
	});

	test("refuses a session with no active organization", async () => {
		const { cookie } = await signUp("ai-no-org");
		const res = await rpc("ai/listProviders", cookie);
		expect(res.status).toBe(403);
	});

	test("lists the provider catalog", async () => {
		const { cookie } = await signUpWithOrg("ai-catalog");
		const res = await rpc("ai/listProviders", cookie);
		expect(res.status).toBe(200);

		const ids = res.body.json.map((p: Json) => p.id);
		expect(ids).toContain("anthropic");
		expect(ids).toContain("openai");

		const anthropic = res.body.json.find((p: Json) => p.id === "anthropic");
		expect(anthropic.models.length).toBeGreaterThan(0);
		expect(anthropic.source).toBe("none");
	});

	test("stores a key and never returns it", async () => {
		const { cookie } = await signUpWithOrg("ai-store");
		const apiKey = `sk-ant-secret-${crypto.randomUUID()}`;

		const saved = await rpc("ai/saveProvider", cookie, {
			provider: "anthropic",
			apiKey,
		});
		expect(saved.status).toBe(200);

		const listed = await rpc("ai/listProviders", cookie);
		const anthropic = listed.body.json.find((p: Json) => p.id === "anthropic");

		expect(anthropic.source).toBe("stored");
		expect(anthropic.configured).toBe(true);
		// The hint identifies the key without revealing it.
		expect(anthropic.apiKeyHint).toBeTruthy();
		expect(anthropic.apiKeyHint).not.toBe(apiKey);

		// The plaintext must not appear anywhere in the response.
		expect(JSON.stringify(listed.body)).not.toContain(apiKey);
	});

	test("isolates provider config between organizations", async () => {
		const owner = await signUpWithOrg("ai-tenant-a");
		const apiKey = `sk-tenant-a-${crypto.randomUUID()}`;
		await rpc("ai/saveProvider", owner.cookie, {
			provider: "openai",
			apiKey,
		});

		const outsider = await signUpWithOrg("ai-tenant-b");
		const listed = await rpc("ai/listProviders", outsider.cookie);
		expect(listed.status).toBe(200);

		const openai = listed.body.json.find((p: Json) => p.id === "openai");
		// Tenant B must see no stored key, and certainly not tenant A's.
		expect(openai.source).not.toBe("stored");
		expect(openai.apiKeyHint).toBeNull();
		expect(JSON.stringify(listed.body)).not.toContain(apiKey);
	});

	test("removing a key clears the stored credential", async () => {
		const { cookie } = await signUpWithOrg("ai-remove");
		await rpc("ai/saveProvider", cookie, {
			provider: "anthropic",
			apiKey: "sk-to-be-removed-0123456789",
		});

		const removed = await rpc("ai/removeProvider", cookie, {
			provider: "anthropic",
		});
		expect(removed.status).toBe(200);

		const listed = await rpc("ai/listProviders", cookie);
		const anthropic = listed.body.json.find((p: Json) => p.id === "anthropic");
		expect(anthropic.apiKeyHint).toBeNull();
	});

	test("requires a base URL for the OpenAI-compatible provider", async () => {
		const { cookie } = await signUpWithOrg("ai-compat");
		const res = await rpc("ai/saveProvider", cookie, {
			provider: "compatible",
			apiKey: "local-key-0123456789",
		});
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	test("rejects an unknown provider", async () => {
		const { cookie } = await signUpWithOrg("ai-unknown");
		const res = await rpc("ai/saveProvider", cookie, {
			provider: "not-a-provider",
			apiKey: "x",
		});
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	test("round-trips the active model and system prompt", async () => {
		const { cookie } = await signUpWithOrg("ai-settings");

		const saved = await rpc("ai/saveSettings", cookie, {
			activeProvider: "openai",
			activeModel: "gpt-5-mini",
			systemPrompt: "Be terse.",
		});
		expect(saved.status).toBe(200);

		const got = await rpc("ai/getSettings", cookie);
		expect(got.body.json.activeProvider).toBe("openai");
		expect(got.body.json.activeModel).toBe("gpt-5-mini");
		expect(got.body.json.systemPrompt).toBe("Be terse.");
	});
});

describe("ai chat endpoint", () => {
	test("rejects anonymous callers", async () => {
		const res = await call("/ai/chat", {
			method: "POST",
			body: JSON.stringify({ messages: [] }),
		});
		expect(res.status).toBe(401);
	});

	test("refuses a session with no active organization", async () => {
		const { cookie } = await signUp("chat-no-org");
		const res = await call("/ai/chat", {
			method: "POST",
			body: JSON.stringify({
				messages: [
					{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] },
				],
			}),
			cookie,
		});
		expect(res.status).toBe(403);
	});
});
