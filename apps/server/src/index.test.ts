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
	async function signUpWithOrg(prefix: string) {
		const { cookie } = await signUp(prefix);
		const slug = `org-${crypto.randomUUID().slice(0, 8)}`;
		const created = await call("/api/auth/organization/create", {
			method: "POST",
			body: JSON.stringify({ name: `${prefix} Org`, slug }),
			cookie,
		});
		expect(created.status).toBe(200);
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

	async function addProvider(
		cookie: string,
		overrides: Record<string, unknown> = {},
	) {
		const res = await rpc("ai/createProvider", cookie, {
			name: `Provider ${crypto.randomUUID().slice(0, 8)}`,
			kind: "anthropic",
			apiKey: `sk-ant-${crypto.randomUUID()}`,
			...overrides,
		});
		return res;
	}

	test("rejects anonymous callers", async () => {
		const res = await call("/rpc/ai/listProviders", {
			method: "POST",
			body: JSON.stringify({ json: {} }),
		});
		expect(res.status).toBe(401);
	});

	test("refuses a session with no active organization", async () => {
		const { cookie } = await signUp("ai-no-org");
		const res = await rpc("ai/listProviders", cookie);
		expect(res.status).toBe(403);
	});

	test("lists the base provider kinds", async () => {
		const { cookie } = await signUpWithOrg("ai-kinds");
		const res = await rpc("ai/listKinds", cookie);
		expect(res.status).toBe(200);
		const ids = res.body.json.map((k: Json) => k.id);
		expect(ids).toContain("anthropic");
		expect(ids).toContain("compatible");
	});

	test("starts with no providers", async () => {
		const { cookie } = await signUpWithOrg("ai-empty");
		const res = await rpc("ai/listProviders", cookie);
		expect(res.status).toBe(200);
		expect(res.body.json).toEqual([]);
	});

	test("stores a key and never returns it", async () => {
		const { cookie } = await signUpWithOrg("ai-store");
		const apiKey = `sk-ant-secret-${crypto.randomUUID()}`;

		const created = await addProvider(cookie, { name: "Claude prod", apiKey });
		expect(created.status).toBe(200);

		const listed = await rpc("ai/listProviders", cookie);
		const provider = listed.body.json[0];
		expect(provider.name).toBe("Claude prod");
		expect(provider.apiKeyHint).toBeTruthy();
		expect(provider.apiKeyHint).not.toBe(apiKey);
		expect(JSON.stringify(listed.body)).not.toContain(apiKey);
	});

	test("allows several providers of the same kind", async () => {
		const { cookie } = await signUpWithOrg("ai-multi");
		expect((await addProvider(cookie, { name: "Claude prod" })).status).toBe(
			200,
		);
		expect((await addProvider(cookie, { name: "Claude dev" })).status).toBe(
			200,
		);
		expect(
			(
				await addProvider(cookie, {
					name: "Ollama",
					kind: "compatible",
					baseUrl: "http://localhost:11434/v1",
				})
			).status,
		).toBe(200);

		const listed = await rpc("ai/listProviders", cookie);
		expect(listed.body.json).toHaveLength(3);
		expect(
			listed.body.json.filter((p: Json) => p.kind === "anthropic"),
		).toHaveLength(2);
	});

	test("rejects a duplicate name within an organization", async () => {
		const { cookie } = await signUpWithOrg("ai-dupe");
		expect((await addProvider(cookie, { name: "Same" })).status).toBe(200);
		const again = await addProvider(cookie, { name: "Same" });
		expect(again.status).toBeGreaterThanOrEqual(400);
	});

	test("requires a base URL for an OpenAI-compatible provider", async () => {
		const { cookie } = await signUpWithOrg("ai-compat");
		const res = await addProvider(cookie, {
			name: "Local",
			kind: "compatible",
			baseUrl: "",
		});
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	test("rejects an unknown kind", async () => {
		const { cookie } = await signUpWithOrg("ai-unknown");
		const res = await addProvider(cookie, { kind: "not-a-kind" });
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	test("isolates providers between organizations", async () => {
		const owner = await signUpWithOrg("ai-tenant-a");
		const apiKey = `sk-tenant-a-${crypto.randomUUID()}`;
		const created = await addProvider(owner.cookie, {
			name: "Tenant A key",
			apiKey,
		});
		const providerId = created.body.json.id;

		const outsider = await signUpWithOrg("ai-tenant-b");
		const listed = await rpc("ai/listProviders", outsider.cookie);
		expect(listed.body.json).toEqual([]);
		expect(JSON.stringify(listed.body)).not.toContain(apiKey);

		// Naming the id directly must not work either.
		const stolen = await rpc("ai/testConnection", outsider.cookie, {
			providerId,
		});
		expect(stolen.status).toBeGreaterThanOrEqual(400);

		const deleted = await rpc("ai/deleteProvider", outsider.cookie, {
			providerId,
		});
		expect(deleted.status).toBeGreaterThanOrEqual(400);

		// And it is still there for its owner.
		const stillThere = await rpc("ai/listProviders", owner.cookie);
		expect(stillThere.body.json).toHaveLength(1);
	});

	test("reports a failure when the credential is rejected", async () => {
		const { cookie } = await signUpWithOrg("ai-badkey");
		// Points at a port nothing is listening on, so the fetch fails fast
		// without reaching a real provider.
		const created = await addProvider(cookie, {
			name: "Dead endpoint",
			kind: "compatible",
			baseUrl: "http://127.0.0.1:9/v1",
			apiKey: "irrelevant",
		});
		expect(created.status).toBe(200);

		const tested = await rpc("ai/testConnection", cookie, {
			providerId: created.body.json.id,
		});
		expect(tested.status).toBe(200);
		expect(tested.body.json.ok).toBe(false);
		expect(tested.body.json.error).toBeTruthy();

		// The failure is recorded so the UI can show it without re-testing.
		const listed = await rpc("ai/listProviders", cookie);
		expect(listed.body.json[0].lastError).toBeTruthy();
	});

	test("replacing a key clears the previous check result", async () => {
		const { cookie } = await signUpWithOrg("ai-replace");
		const created = await addProvider(cookie, {
			name: "Rotating",
			kind: "compatible",
			baseUrl: "http://127.0.0.1:9/v1",
		});
		const providerId = created.body.json.id;
		await rpc("ai/testConnection", cookie, { providerId });

		const updated = await rpc("ai/updateProvider", cookie, {
			providerId,
			apiKey: "a-new-key-entirely",
		});
		expect(updated.status).toBe(200);

		const listed = await rpc("ai/listProviders", cookie);
		expect(listed.body.json[0].lastError).toBeNull();
		expect(listed.body.json[0].lastCheckedAt).toBeNull();
	});

	test("model selection round-trips, and null means all", async () => {
		const { cookie } = await signUpWithOrg("ai-models");
		const created = await addProvider(cookie, { name: "Picker" });
		const providerId = created.body.json.id;

		const picked = await rpc("ai/setEnabledModels", cookie, {
			providerId,
			models: ["model-a", "model-b"],
		});
		expect(picked.status).toBe(200);

		let listed = await rpc("ai/listProviders", cookie);
		expect(listed.body.json[0].enabledModels).toEqual(["model-a", "model-b"]);

		const all = await rpc("ai/setEnabledModels", cookie, {
			providerId,
			models: null,
		});
		expect(all.status).toBe(200);

		listed = await rpc("ai/listProviders", cookie);
		expect(listed.body.json[0].enabledModels).toBeNull();
	});

	test("refuses to activate a model the provider does not offer", async () => {
		const { cookie } = await signUpWithOrg("ai-activate");
		const created = await addProvider(cookie, { name: "Restricted" });
		const providerId = created.body.json.id;

		await rpc("ai/setEnabledModels", cookie, {
			providerId,
			models: ["allowed-model"],
		});

		const bad = await rpc("ai/setActive", cookie, {
			providerId,
			model: "some-other-model",
		});
		expect(bad.status).toBeGreaterThanOrEqual(400);

		const good = await rpc("ai/setActive", cookie, {
			providerId,
			model: "allowed-model",
		});
		expect(good.status).toBe(200);

		const settings = await rpc("ai/getSettings", cookie);
		expect(settings.body.json.activeProviderId).toBe(providerId);
		expect(settings.body.json.activeModel).toBe("allowed-model");
	});

	test("deleting the active provider clears the selection", async () => {
		const { cookie } = await signUpWithOrg("ai-delete-active");
		const created = await addProvider(cookie, { name: "Temporary" });
		const providerId = created.body.json.id;

		await rpc("ai/setEnabledModels", cookie, { providerId, models: ["m1"] });
		await rpc("ai/setActive", cookie, { providerId, model: "m1" });

		const deleted = await rpc("ai/deleteProvider", cookie, { providerId });
		expect(deleted.status).toBe(200);

		// The FK is ON DELETE SET NULL, so the app never points at a dead row.
		const settings = await rpc("ai/getSettings", cookie);
		expect(settings.body.json.activeProviderId).toBeNull();
	});

	test("stores the system prompt", async () => {
		const { cookie } = await signUpWithOrg("ai-prompt");
		const saved = await rpc("ai/setActive", cookie, {
			providerId: null,
			model: null,
			systemPrompt: "Be terse.",
		});
		expect(saved.status).toBe(200);

		const settings = await rpc("ai/getSettings", cookie);
		expect(settings.body.json.systemPrompt).toBe("Be terse.");
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

describe("organization permissions", () => {
	/** Creates an org, makes it active, and returns the owner's cookie. */
	async function ownerWithOrg(prefix: string) {
		const { cookie, email } = await signUp(prefix);
		const slug = `org-${crypto.randomUUID().slice(0, 8)}`;
		const created = await call("/api/auth/organization/create", {
			method: "POST",
			body: JSON.stringify({ name: `${prefix} Org`, slug }),
			cookie,
		});
		expect(created.status).toBe(200);
		await call("/api/auth/organization/set-active", {
			method: "POST",
			body: JSON.stringify({ organizationId: created.body.id }),
			cookie,
		});
		return { cookie, email, organizationId: created.body.id as string };
	}

	/** Invites someone, accepts as them, and returns their cookie. */
	async function addMember(
		ownerCookie: string,
		organizationId: string,
		role: "admin" | "member",
	) {
		const invitee = await signUp(`invitee-${role}`);

		const invited = await call("/api/auth/organization/invite-member", {
			method: "POST",
			body: JSON.stringify({ email: invitee.email, role }),
			cookie: ownerCookie,
		});
		expect(invited.status).toBe(200);

		const accepted = await call("/api/auth/organization/accept-invitation", {
			method: "POST",
			body: JSON.stringify({ invitationId: invited.body.id }),
			cookie: invitee.cookie,
		});
		expect(accepted.status).toBe(200);

		await call("/api/auth/organization/set-active", {
			method: "POST",
			body: JSON.stringify({ organizationId }),
			cookie: invitee.cookie,
		});

		return invitee;
	}

	test("an invited member can join and see the organization", async () => {
		const owner = await ownerWithOrg("perm-join");
		const member = await addMember(
			owner.cookie,
			owner.organizationId,
			"member",
		);

		const list = await call("/api/auth/organization/list", {
			cookie: member.cookie,
		});
		expect(list.status).toBe(200);
		expect(list.body.map((o: Json) => o.id)).toContain(owner.organizationId);
	});

	test("a plain member cannot invite others", async () => {
		const owner = await ownerWithOrg("perm-invite");
		const member = await addMember(
			owner.cookie,
			owner.organizationId,
			"member",
		);

		const res = await call("/api/auth/organization/invite-member", {
			method: "POST",
			body: JSON.stringify({ email: "outsider@example.test", role: "member" }),
			cookie: member.cookie,
		});
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	test("an admin can invite", async () => {
		const owner = await ownerWithOrg("perm-admin-invite");
		const admin = await addMember(owner.cookie, owner.organizationId, "admin");

		const res = await call("/api/auth/organization/invite-member", {
			method: "POST",
			body: JSON.stringify({
				email: `admin-invited-${crypto.randomUUID()}@example.test`,
				role: "member",
			}),
			cookie: admin.cookie,
		});
		expect(res.status).toBe(200);
	});

	test("a plain member cannot remove anyone", async () => {
		const owner = await ownerWithOrg("perm-remove");
		const member = await addMember(
			owner.cookie,
			owner.organizationId,
			"member",
		);
		const victim = await addMember(
			owner.cookie,
			owner.organizationId,
			"member",
		);

		const full = await call("/api/auth/organization/get-full-organization", {
			cookie: owner.cookie,
		});
		const victimMember = full.body.members.find(
			(m: Json) => m.user?.email === victim.email,
		);
		expect(victimMember).toBeTruthy();

		const res = await call("/api/auth/organization/remove-member", {
			method: "POST",
			body: JSON.stringify({ memberIdOrEmail: victimMember.id }),
			cookie: member.cookie,
		});
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	test("a plain member cannot promote themselves", async () => {
		const owner = await ownerWithOrg("perm-escalate");
		const member = await addMember(
			owner.cookie,
			owner.organizationId,
			"member",
		);

		const full = await call("/api/auth/organization/get-full-organization", {
			cookie: owner.cookie,
		});
		const self = full.body.members.find(
			(m: Json) => m.user?.email === member.email,
		);

		const res = await call("/api/auth/organization/update-member-role", {
			method: "POST",
			body: JSON.stringify({ memberId: self.id, role: "owner" }),
			cookie: member.cookie,
		});
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	test("an owner can change a member's role", async () => {
		const owner = await ownerWithOrg("perm-promote");
		const member = await addMember(
			owner.cookie,
			owner.organizationId,
			"member",
		);

		const full = await call("/api/auth/organization/get-full-organization", {
			cookie: owner.cookie,
		});
		const target = full.body.members.find(
			(m: Json) => m.user?.email === member.email,
		);

		const res = await call("/api/auth/organization/update-member-role", {
			method: "POST",
			body: JSON.stringify({ memberId: target.id, role: "admin" }),
			cookie: owner.cookie,
		});
		expect(res.status).toBe(200);
	});

	test("a non-member cannot invite into an organization", async () => {
		const owner = await ownerWithOrg("perm-outsider");
		const outsider = await signUp("perm-outsider-user");

		const res = await call("/api/auth/organization/invite-member", {
			method: "POST",
			body: JSON.stringify({
				email: "nope@example.test",
				role: "member",
				organizationId: owner.organizationId,
			}),
			cookie: outsider.cookie,
		});
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	test("leaving removes access to the organization", async () => {
		const owner = await ownerWithOrg("perm-leave");
		const member = await addMember(
			owner.cookie,
			owner.organizationId,
			"member",
		);

		const left = await call("/api/auth/organization/leave", {
			method: "POST",
			body: JSON.stringify({ organizationId: owner.organizationId }),
			cookie: member.cookie,
		});
		expect(left.status).toBe(200);

		const list = await call("/api/auth/organization/list", {
			cookie: member.cookie,
		});
		expect(list.body.map((o: Json) => o.id)).not.toContain(
			owner.organizationId,
		);
	});
});

describe("teams", () => {
	async function ownerWithOrg(prefix: string) {
		const { cookie, email } = await signUp(prefix);
		const slug = `org-${crypto.randomUUID().slice(0, 8)}`;
		const created = await call("/api/auth/organization/create", {
			method: "POST",
			body: JSON.stringify({ name: `${prefix} Org`, slug }),
			cookie,
		});
		expect(created.status).toBe(200);
		await call("/api/auth/organization/set-active", {
			method: "POST",
			body: JSON.stringify({ organizationId: created.body.id }),
			cookie,
		});
		return { cookie, email, organizationId: created.body.id as string };
	}

	async function createTeam(
		cookie: string,
		organizationId: string,
		name: string,
	) {
		const res = await call("/api/auth/organization/create-team", {
			method: "POST",
			body: JSON.stringify({ name, organizationId }),
			cookie,
		});
		expect(res.status).toBe(200);
		return res.body.id as string;
	}

	test("no default team is created with the organization", async () => {
		// defaultTeam is disabled: a new organization starts with zero teams.
		const owner = await ownerWithOrg("team-default");
		const list = await call(
			`/api/auth/organization/list-teams?organizationId=${owner.organizationId}`,
			{ cookie: owner.cookie },
		);
		expect(list.status).toBe(200);
		expect(list.body).toEqual([]);
	});

	test("an owner can create and list teams", async () => {
		const owner = await ownerWithOrg("team-create");
		await createTeam(owner.cookie, owner.organizationId, "Engineering");
		await createTeam(owner.cookie, owner.organizationId, "Design");

		const list = await call(
			`/api/auth/organization/list-teams?organizationId=${owner.organizationId}`,
			{ cookie: owner.cookie },
		);
		expect(list.body.map((t: Json) => t.name).sort()).toEqual([
			"Design",
			"Engineering",
		]);
	});

	test("teams are scoped to their organization", async () => {
		const a = await ownerWithOrg("team-tenant-a");
		await createTeam(a.cookie, a.organizationId, "Secret Team");

		const b = await ownerWithOrg("team-tenant-b");
		const list = await call(
			`/api/auth/organization/list-teams?organizationId=${b.organizationId}`,
			{ cookie: b.cookie },
		);
		expect(list.body).toEqual([]);
	});

	test("a non-member cannot list another organization's teams", async () => {
		const owner = await ownerWithOrg("team-outsider");
		await createTeam(owner.cookie, owner.organizationId, "Private");

		const outsider = await signUp("team-outsider-user");
		const res = await call(
			`/api/auth/organization/list-teams?organizationId=${owner.organizationId}`,
			{ cookie: outsider.cookie },
		);
		if (res.status === 200) {
			expect(res.body).toEqual([]);
		} else {
			expect(res.status).toBeGreaterThanOrEqual(400);
		}
	});

	test("members can be added to and removed from a team", async () => {
		const owner = await ownerWithOrg("team-membership");
		const teamId = await createTeam(owner.cookie, owner.organizationId, "Core");

		const full = await call("/api/auth/organization/get-full-organization", {
			cookie: owner.cookie,
		});
		const ownerUserId = full.body.members[0].userId;

		// The owner joins too, otherwise they cannot read the roster afterwards
		// — list-team-members requires the caller to be on the team.
		const addedOwner = await call("/api/auth/organization/add-team-member", {
			method: "POST",
			body: JSON.stringify({ teamId, userId: ownerUserId }),
			cookie: owner.cookie,
		});
		expect(addedOwner.status).toBe(200);

		const invitee = await signUp("team-mate");
		const invited = await call("/api/auth/organization/invite-member", {
			method: "POST",
			body: JSON.stringify({ email: invitee.email, role: "member" }),
			cookie: owner.cookie,
		});
		expect(invited.status).toBe(200);
		await call("/api/auth/organization/accept-invitation", {
			method: "POST",
			body: JSON.stringify({ invitationId: invited.body.id }),
			cookie: invitee.cookie,
		});

		const mateFull = await call(
			"/api/auth/organization/get-full-organization",
			{
				cookie: owner.cookie,
			},
		);
		const mateUserId = mateFull.body.members.find(
			(m: Json) => m.user?.email === invitee.email,
		).userId;

		const added = await call("/api/auth/organization/add-team-member", {
			method: "POST",
			body: JSON.stringify({ teamId, userId: mateUserId }),
			cookie: owner.cookie,
		});
		expect(added.status).toBe(200);

		const listed = await call(
			`/api/auth/organization/list-team-members?teamId=${teamId}`,
			{ cookie: owner.cookie },
		);
		expect(listed.status).toBe(200);
		expect(listed.body.map((m: Json) => m.userId)).toContain(mateUserId);

		const removed = await call("/api/auth/organization/remove-team-member", {
			method: "POST",
			body: JSON.stringify({ teamId, userId: mateUserId }),
			cookie: owner.cookie,
		});
		expect(removed.status).toBe(200);

		const after = await call(
			`/api/auth/organization/list-team-members?teamId=${teamId}`,
			{ cookie: owner.cookie },
		);
		expect(after.status).toBe(200);
		expect(after.body.map((m: Json) => m.userId)).not.toContain(mateUserId);
		expect(after.body.map((m: Json) => m.userId)).toContain(ownerUserId);
	});

	test("listing a team's members requires being on that team", async () => {
		// Documents a real constraint: an owner who is not on a team cannot read
		// its roster. The UI has to handle that rather than spin.
		const owner = await ownerWithOrg("team-not-member");
		const teamId = await createTeam(
			owner.cookie,
			owner.organizationId,
			"Closed",
		);

		const res = await call(
			`/api/auth/organization/list-team-members?teamId=${teamId}`,
			{ cookie: owner.cookie },
		);
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	test("deleting a team keeps its members in the organization", async () => {
		const owner = await ownerWithOrg("team-delete");
		const teamId = await createTeam(owner.cookie, owner.organizationId, "Temp");

		const removed = await call("/api/auth/organization/remove-team", {
			method: "POST",
			body: JSON.stringify({ teamId }),
			cookie: owner.cookie,
		});
		expect(removed.status).toBe(200);

		const full = await call("/api/auth/organization/get-full-organization", {
			cookie: owner.cookie,
		});
		expect(full.body.members.length).toBe(1);
	});
});
