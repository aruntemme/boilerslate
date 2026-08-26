/**
 * Provider configuration.
 *
 * API keys are write-only: the form sends a key, the server encrypts it, and
 * nothing ever sends it back. What comes back is a masked hint, so you can see
 * *which* key is stored without the browser ever holding it.
 */
import { Badge } from "@boilerslate/ui/components/badge";
import { Button } from "@boilerslate/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@boilerslate/ui/components/card";
import { Input } from "@boilerslate/ui/components/input";
import { Label } from "@boilerslate/ui/components/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@boilerslate/ui/components/select";
import { Separator } from "@boilerslate/ui/components/separator";
import { Textarea } from "@boilerslate/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, KeyRound, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

function ProviderRow({
	provider,
	onSaved,
}: {
	provider: {
		id: string;
		label: string;
		docs: string;
		requiresBaseUrl: boolean;
		envKey: string;
		configured: boolean;
		source: "stored" | "env" | "none";
		apiKeyHint: string | null;
		baseUrl: string | null;
	};
	onSaved: () => void;
}) {
	const [apiKey, setApiKey] = useState("");
	const [baseUrl, setBaseUrl] = useState(provider.baseUrl ?? "");

	const save = useMutation(
		orpc.ai.saveProvider.mutationOptions({
			onSuccess: () => {
				setApiKey("");
				toast.success(`${provider.label} saved`);
				onSaved();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const remove = useMutation(
		orpc.ai.removeProvider.mutationOptions({
			onSuccess: () => {
				toast.success(`${provider.label} key removed`);
				onSaved();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<div className="flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex flex-wrap items-center gap-2">
				<span className="font-medium">{provider.label}</span>

				{provider.source === "stored" && (
					<Badge variant="secondary">
						<Check className="mr-1 size-3" />
						Key stored
					</Badge>
				)}
				{provider.source === "env" && (
					<Badge variant="outline">From {provider.envKey}</Badge>
				)}
				{provider.source === "none" && (
					<Badge variant="outline" className="text-muted-foreground">
						Not configured
					</Badge>
				)}

				<a
					href={provider.docs}
					target="_blank"
					rel="noreferrer"
					className="ml-auto flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
				>
					Docs
					<ExternalLink className="size-3" />
				</a>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="grid gap-1.5">
					<Label htmlFor={`key-${provider.id}`}>API key</Label>
					<Input
						id={`key-${provider.id}`}
						type="password"
						autoComplete="off"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						placeholder={
							provider.apiKeyHint ?? "Paste a key — it is stored encrypted"
						}
					/>
					{provider.apiKeyHint && (
						<p className="text-muted-foreground text-xs">
							Stored: <code>{provider.apiKeyHint}</code>. Leave blank to keep
							it.
						</p>
					)}
				</div>

				{provider.requiresBaseUrl && (
					<div className="grid gap-1.5">
						<Label htmlFor={`url-${provider.id}`}>Base URL</Label>
						<Input
							id={`url-${provider.id}`}
							value={baseUrl}
							onChange={(e) => setBaseUrl(e.target.value)}
							placeholder="http://localhost:11434/v1"
						/>
						<p className="text-muted-foreground text-xs">
							Ollama, vLLM, LM Studio, Groq, OpenRouter…
						</p>
					</div>
				)}
			</div>

			<div className="flex gap-2">
				<Button
					size="sm"
					disabled={save.isPending || (!apiKey && !provider.requiresBaseUrl)}
					onClick={() =>
						save.mutate({
							provider: provider.id,
							...(apiKey ? { apiKey } : {}),
							...(baseUrl ? { baseUrl } : {}),
						})
					}
				>
					<KeyRound className="size-4" />
					{save.isPending ? "Saving…" : "Save"}
				</Button>

				{provider.source === "stored" && (
					<Button
						size="sm"
						variant="ghost"
						disabled={remove.isPending}
						onClick={() => remove.mutate({ provider: provider.id })}
					>
						<Trash2 className="size-4" />
						Remove key
					</Button>
				)}
			</div>
		</div>
	);
}

export function AiProviderSettings() {
	const queryClient = useQueryClient();

	// These procedures 403 until the session has an active organization, which
	// is a permanent condition, not a blip. Retrying it just spins forever.
	const noRetryOn4xx = {
		retry: (failureCount: number, error: unknown) => {
			const status = (error as { status?: number })?.status;
			if (status && status >= 400 && status < 500) return false;
			return failureCount < 2;
		},
	};

	const providers = useQuery({
		...orpc.ai.listProviders.queryOptions(),
		...noRetryOn4xx,
	});
	const settings = useQuery({
		...orpc.ai.getSettings.queryOptions(),
		...noRetryOn4xx,
	});

	const [systemPrompt, setSystemPrompt] = useState<string | null>(null);

	const saveSettings = useMutation(
		orpc.ai.saveSettings.mutationOptions({
			onSuccess: () => {
				toast.success("AI settings saved");
				queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const error = providers.error ?? settings.error;
	if (error) {
		// 403 here means "no active organization", which is expected until an
		// organization exists — say so, rather than reporting a failure.
		const needsOrganization = (error as { status?: number }).status === 403;
		return (
			<Card>
				<CardHeader>
					<CardTitle>AI</CardTitle>
					<CardDescription>
						{needsOrganization
							? "AI providers are configured per organization. Create or select an organization to set them up."
							: (error.message ?? "Could not load AI settings.")}
					</CardDescription>
				</CardHeader>
				{needsOrganization && (
					<CardContent className="text-muted-foreground text-sm">
						There is no organization UI yet — create one through the API, or see{" "}
						<code className="text-foreground">docs/multi-tenancy.md</code>.
					</CardContent>
				)}
			</Card>
		);
	}

	if (!providers.data || !settings.data) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>AI</CardTitle>
					<CardDescription>Loading providers…</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const active = providers.data.find(
		(p) => p.id === settings.data.activeProvider,
	);
	const prompt = systemPrompt ?? settings.data.systemPrompt;

	return (
		<Card>
			<CardHeader>
				<CardTitle>AI</CardTitle>
				<CardDescription>
					Providers and models for this organization. Keys are encrypted before
					they are stored and are never sent back to the browser.
				</CardDescription>
			</CardHeader>

			<CardContent className="flex flex-col gap-6">
				<div className="grid gap-3">
					<Label>Active model</Label>
					<Select
						value={`${settings.data.activeProvider}:${settings.data.activeModel}`}
						onValueChange={(value) => {
							const [provider, ...rest] = String(value).split(":");
							saveSettings.mutate({
								activeProvider: provider as string,
								activeModel: rest.join(":"),
								systemPrompt: prompt,
							});
						}}
					>
						<SelectTrigger className="w-full sm:w-96">
							{/* Base UI renders the raw value by default, which here is the
							    composite "provider:model" id — show the labels instead. */}
							<SelectValue>
								{active
									? `${active.label} · ${
											active.models.find(
												(m) => m.id === settings.data.activeModel,
											)?.label ?? settings.data.activeModel
										}`
									: settings.data.activeModel}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{providers.data.map((p) => (
								<SelectGroup key={p.id}>
									<SelectLabel>
										{p.label}
										{!p.configured && " — not configured"}
									</SelectLabel>
									{p.models.map((m) => (
										<SelectItem
											key={`${p.id}:${m.id}`}
											value={`${p.id}:${m.id}`}
											disabled={!p.configured}
										>
											{m.label}
											{m.tools ? "" : " (no tools)"}
										</SelectItem>
									))}
								</SelectGroup>
							))}
						</SelectContent>
					</Select>
					{active && !active.configured && (
						<p className="text-destructive text-xs">
							{active.label} has no credentials. Add a key below or set{" "}
							<code>{active.envKey}</code> on the server.
						</p>
					)}
				</div>

				<div className="grid gap-1.5">
					<Label htmlFor="ai-system-prompt">System prompt</Label>
					<Textarea
						id="ai-system-prompt"
						value={prompt}
						onChange={(e) => setSystemPrompt(e.target.value)}
						placeholder="Leave blank to use the built-in default."
						rows={3}
					/>
					<div>
						<Button
							size="sm"
							variant="outline"
							disabled={saveSettings.isPending}
							onClick={() =>
								saveSettings.mutate({
									activeProvider: settings.data.activeProvider,
									activeModel: settings.data.activeModel,
									systemPrompt: prompt,
								})
							}
						>
							Save prompt
						</Button>
					</div>
				</div>

				<Separator />

				<div className="flex flex-col gap-3">
					<Label>Providers</Label>
					{providers.data.map((p) => (
						<ProviderRow
							key={p.id}
							provider={p}
							onSaved={() => queryClient.invalidateQueries()}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
