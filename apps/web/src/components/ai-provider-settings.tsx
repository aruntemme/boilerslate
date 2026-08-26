/**
 * AI provider configuration.
 *
 * Providers are named instances of a base kind, so an organization can have
 * several of the same kind. Models are discovered from each provider rather
 * than listed statically — a hard-coded catalogue is wrong within weeks.
 *
 * API keys are write-only: the form sends one, the server encrypts it, and
 * nothing sends it back. What returns is a masked hint.
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
import { Checkbox } from "@boilerslate/ui/components/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@boilerslate/ui/components/dialog";
import { Empty } from "@boilerslate/ui/components/empty";
import { Input } from "@boilerslate/ui/components/input";
import { Label } from "@boilerslate/ui/components/label";
import { ScrollArea } from "@boilerslate/ui/components/scroll-area";
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
import {
	CircleAlert,
	CircleCheck,
	ExternalLink,
	Plug,
	Plus,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

interface KindInfo {
	id: string;
	label: string;
	example: string;
	requiresBaseUrl: boolean;
	defaultBaseUrl: string | null;
	docs: string;
	hint: string;
}

interface ProviderRow {
	id: string;
	name: string;
	kind: string;
	apiKeyHint: string | null;
	baseUrl: string | null;
	enabledModels: string[] | null;
	availableModels: { id: string; label: string }[] | null;
	lastCheckedAt: string | Date | null;
	lastError: string | null;
}

function AddProviderDialog({
	kinds,
	open,
	onOpenChange,
	onCreated,
}: {
	kinds: KindInfo[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: () => void;
}) {
	const [kindId, setKindId] = useState(kinds[0]?.id ?? "anthropic");
	const [name, setName] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [baseUrl, setBaseUrl] = useState("");

	const kind = kinds.find((k) => k.id === kindId);

	const create = useMutation(
		orpc.ai.createProvider.mutationOptions({
			onSuccess: () => {
				setName("");
				setApiKey("");
				setBaseUrl("");
				onOpenChange(false);
				toast.success("Provider added");
				onCreated();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add a provider</DialogTitle>
					<DialogDescription>
						You can add several of the same kind — separate keys, separate
						endpoints.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-3">
					<div className="grid gap-1.5">
						<Label htmlFor="kind">Base provider</Label>
						<Select value={kindId} onValueChange={(v) => setKindId(String(v))}>
							<SelectTrigger id="kind">
								<SelectValue>{kind?.label ?? "Choose"}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{kinds.map((k) => (
										<SelectItem key={k.id} value={k.id}>
											{k.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
						{kind && (
							<p className="text-muted-foreground text-xs">{kind.hint}</p>
						)}
					</div>

					<div className="grid gap-1.5">
						<Label htmlFor="provider-name">Name</Label>
						<Input
							id="provider-name"
							value={name}
							placeholder={kind?.example ?? "My provider"}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>

					<div className="grid gap-1.5">
						<Label htmlFor="provider-key">API key</Label>
						<Input
							id="provider-key"
							type="password"
							autoComplete="off"
							value={apiKey}
							placeholder="Stored encrypted; never shown again"
							onChange={(e) => setApiKey(e.target.value)}
						/>
					</div>

					<div className="grid gap-1.5">
						<Label htmlFor="provider-url">
							Base URL{kind?.requiresBaseUrl ? "" : " (optional)"}
						</Label>
						<Input
							id="provider-url"
							value={baseUrl}
							placeholder={kind?.defaultBaseUrl ?? "http://localhost:11434/v1"}
							onChange={(e) => setBaseUrl(e.target.value)}
						/>
					</div>
				</div>

				<DialogFooter>
					<DialogClose render={<Button variant="outline" />}>
						Cancel
					</DialogClose>
					<Button
						disabled={
							create.isPending ||
							!name.trim() ||
							!apiKey ||
							(kind?.requiresBaseUrl && !baseUrl)
						}
						onClick={() =>
							create.mutate({
								name: name.trim(),
								kind: kindId,
								apiKey,
								...(baseUrl ? { baseUrl } : {}),
							})
						}
					>
						{create.isPending ? "Adding…" : "Add provider"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ProviderCard({
	provider,
	kinds,
	onChanged,
}: {
	provider: ProviderRow;
	kinds: KindInfo[];
	onChanged: () => void;
}) {
	const [newKey, setNewKey] = useState("");
	const kind = kinds.find((k) => k.id === provider.kind);

	const test = useMutation(
		orpc.ai.testConnection.mutationOptions({
			onSuccess: (result) => {
				if (result.ok) {
					toast.success(`Connected — ${result.models.length} models available`);
				} else {
					toast.error(result.error ?? "Connection failed");
				}
				onChanged();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const setModels = useMutation(
		orpc.ai.setEnabledModels.mutationOptions({
			onSuccess: onChanged,
			onError: (error) => toast.error(error.message),
		}),
	);

	const update = useMutation(
		orpc.ai.updateProvider.mutationOptions({
			onSuccess: () => {
				setNewKey("");
				toast.success("Key replaced");
				onChanged();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const remove = useMutation(
		orpc.ai.deleteProvider.mutationOptions({
			onSuccess: () => {
				toast.success(`${provider.name} removed`);
				onChanged();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const available = provider.availableModels ?? [];
	// null means "all", which is the default and stays true for new releases.
	const allSelected = provider.enabledModels === null;
	const selected = new Set(provider.enabledModels ?? []);

	function toggleModel(id: string, on: boolean) {
		const base = allSelected ? available.map((m) => m.id) : [...selected];
		const next = on
			? [...new Set([...base, id])]
			: base.filter((m) => m !== id);
		setModels.mutate({ providerId: provider.id, models: next });
	}

	return (
		<div className="flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex flex-wrap items-center gap-2">
				<span className="font-medium">{provider.name}</span>
				<Badge variant="outline">{kind?.label ?? provider.kind}</Badge>

				{provider.lastError ? (
					<Badge variant="destructive">
						<CircleAlert className="mr-1 size-3" />
						Failed
					</Badge>
				) : provider.lastCheckedAt ? (
					<Badge variant="secondary">
						<CircleCheck className="mr-1 size-3" />
						{available.length} models
					</Badge>
				) : (
					<Badge variant="outline" className="text-muted-foreground">
						Untested
					</Badge>
				)}

				<div className="ml-auto flex items-center gap-1">
					{kind && (
						<a
							href={kind.docs}
							target="_blank"
							rel="noreferrer"
							className="flex items-center gap-1 px-2 text-muted-foreground text-xs hover:text-foreground"
						>
							Docs
							<ExternalLink className="size-3" />
						</a>
					)}
					<Button
						size="sm"
						variant="outline"
						disabled={test.isPending}
						onClick={() => test.mutate({ providerId: provider.id })}
					>
						<Plug className="size-4" />
						{test.isPending ? "Testing…" : "Test & fetch models"}
					</Button>
					<Button
						size="icon-sm"
						variant="ghost"
						aria-label={`Remove ${provider.name}`}
						onClick={() => remove.mutate({ providerId: provider.id })}
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</div>

			<div className="grid gap-2 text-muted-foreground text-xs sm:grid-cols-2">
				<span>
					Key:{" "}
					<code className="text-foreground">{provider.apiKeyHint ?? "—"}</code>
				</span>
				{provider.baseUrl && (
					<span className="truncate">
						URL: <code className="text-foreground">{provider.baseUrl}</code>
					</span>
				)}
			</div>

			{provider.lastError && (
				<p className="rounded-md bg-destructive/10 p-2 text-destructive text-xs">
					{provider.lastError}
				</p>
			)}

			{available.length > 0 && (
				<div className="flex flex-col gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<Label className="text-xs">Models</Label>
						<Button
							size="sm"
							variant={allSelected ? "default" : "outline"}
							onClick={() =>
								setModels.mutate({ providerId: provider.id, models: null })
							}
						>
							All ({available.length})
						</Button>
						<Button
							size="sm"
							variant={allSelected ? "outline" : "default"}
							onClick={() =>
								setModels.mutate({
									providerId: provider.id,
									models: allSelected ? [] : [...selected],
								})
							}
						>
							Pick
						</Button>
						{allSelected && (
							<span className="text-muted-foreground text-xs">
								New models appear automatically.
							</span>
						)}
					</div>

					{!allSelected && (
						<ScrollArea className="h-44 rounded-md border p-2">
							<div className="flex flex-col gap-1.5">
								{available.map((model) => (
									<label
										key={model.id}
										htmlFor={`m-${provider.id}-${model.id}`}
										className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted"
									>
										<Checkbox
											id={`m-${provider.id}-${model.id}`}
											checked={selected.has(model.id)}
											onCheckedChange={(v) => toggleModel(model.id, v === true)}
										/>
										<span className="truncate">{model.label}</span>
										<code className="ml-auto shrink-0 text-muted-foreground text-xs">
											{model.id}
										</code>
									</label>
								))}
							</div>
						</ScrollArea>
					)}
				</div>
			)}

			<Separator />

			<div className="flex flex-wrap items-end gap-2">
				<div className="grid min-w-48 flex-1 gap-1.5">
					<Label htmlFor={`key-${provider.id}`} className="text-xs">
						Replace key
					</Label>
					<Input
						id={`key-${provider.id}`}
						type="password"
						autoComplete="off"
						value={newKey}
						placeholder="Leave blank to keep the current key"
						onChange={(e) => setNewKey(e.target.value)}
					/>
				</div>
				<Button
					size="sm"
					variant="outline"
					disabled={!newKey || update.isPending}
					onClick={() =>
						update.mutate({ providerId: provider.id, apiKey: newKey })
					}
				>
					Replace
				</Button>
			</div>
		</div>
	);
}

export function AiProviderSettings() {
	const queryClient = useQueryClient();
	const [addOpen, setAddOpen] = useState(false);
	const [systemPrompt, setSystemPrompt] = useState<string | null>(null);

	// These 403 until the session has an active organization, which is a
	// permanent condition — retrying it just spins forever.
	const noRetryOn4xx = {
		retry: (failureCount: number, error: unknown) => {
			const status = (error as { status?: number })?.status;
			if (status && status >= 400 && status < 500) return false;
			return failureCount < 2;
		},
	};

	const kinds = useQuery({
		...orpc.ai.listKinds.queryOptions(),
		...noRetryOn4xx,
	});
	const providers = useQuery({
		...orpc.ai.listProviders.queryOptions(),
		...noRetryOn4xx,
	});
	const settings = useQuery({
		...orpc.ai.getSettings.queryOptions(),
		...noRetryOn4xx,
	});

	const setActive = useMutation(
		orpc.ai.setActive.mutationOptions({
			onSuccess: () => {
				toast.success("Active model updated");
				queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const refresh = () => queryClient.invalidateQueries();

	const error = kinds.error ?? providers.error ?? settings.error;
	if (error) {
		const needsOrganization = (error as { status?: number }).status === 403;
		return (
			<Card>
				<CardHeader>
					<CardTitle>AI</CardTitle>
					<CardDescription>
						{needsOrganization
							? "AI providers are configured per organization. Choose one from the sidebar switcher first."
							: (error.message ?? "Could not load AI settings.")}
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	if (!kinds.data || !providers.data || !settings.data) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>AI</CardTitle>
					<CardDescription>Loading providers…</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const list = providers.data as ProviderRow[];
	const activeProvider = list.find(
		(p) => p.id === settings.data.activeProviderId,
	);
	const prompt = systemPrompt ?? settings.data.systemPrompt;

	/** Models a provider is currently offering. */
	function modelsFor(provider: ProviderRow) {
		const available = provider.availableModels ?? [];
		if (provider.enabledModels === null) return available;
		const allowed = new Set(provider.enabledModels);
		return available.filter((m) => allowed.has(m.id));
	}

	const activeLabel = activeProvider
		? `${activeProvider.name} · ${
				modelsFor(activeProvider).find(
					(m) => m.id === settings.data.activeModel,
				)?.label ?? settings.data.activeModel
			}`
		: "None selected";

	return (
		<Card>
			<CardHeader>
				<CardTitle>AI</CardTitle>
				<CardDescription>
					Providers for this organization. Keys are encrypted before storage and
					never sent back to the browser.
				</CardDescription>
			</CardHeader>

			<CardContent className="flex flex-col gap-6">
				<div className="grid gap-3">
					<Label>Active model</Label>
					<Select
						value={
							settings.data.activeProviderId && settings.data.activeModel
								? `${settings.data.activeProviderId}::${settings.data.activeModel}`
								: ""
						}
						onValueChange={(value) => {
							const [providerId, model] = String(value).split("::");
							setActive.mutate({
								providerId: providerId ?? null,
								model: model ?? null,
								systemPrompt: prompt,
							});
						}}
					>
						<SelectTrigger className="w-full sm:w-96">
							<SelectValue>{activeLabel}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{list.map((provider) => {
								const models = modelsFor(provider);
								if (models.length === 0) return null;
								return (
									<SelectGroup key={provider.id}>
										<SelectLabel>{provider.name}</SelectLabel>
										{models.map((model) => (
											<SelectItem
												key={`${provider.id}::${model.id}`}
												value={`${provider.id}::${model.id}`}
											>
												{model.label}
											</SelectItem>
										))}
									</SelectGroup>
								);
							})}
						</SelectContent>
					</Select>
					{list.every((p) => modelsFor(p).length === 0) && (
						<p className="text-muted-foreground text-xs">
							No models yet — add a provider and press “Test &amp; fetch
							models”.
						</p>
					)}
				</div>

				<div className="grid gap-1.5">
					<Label htmlFor="ai-system-prompt">System prompt</Label>
					<Textarea
						id="ai-system-prompt"
						value={prompt}
						rows={3}
						placeholder="Leave blank to use the built-in default."
						onChange={(e) => setSystemPrompt(e.target.value)}
					/>
					<div>
						<Button
							size="sm"
							variant="outline"
							disabled={setActive.isPending}
							onClick={() =>
								setActive.mutate({
									providerId: settings.data.activeProviderId,
									model: settings.data.activeModel,
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
					<div className="flex items-center justify-between gap-2">
						<Label>Providers</Label>
						<Button size="sm" onClick={() => setAddOpen(true)}>
							<Plus className="size-4" />
							Add provider
						</Button>
					</div>

					{list.length === 0 ? (
						<Empty>
							<Sparkles className="size-6 text-muted-foreground" />
							<p className="font-medium">No providers yet</p>
							<p className="text-muted-foreground text-sm">
								Add one to start — you can have several of the same kind.
							</p>
						</Empty>
					) : (
						list.map((provider) => (
							<ProviderCard
								key={provider.id}
								provider={provider}
								kinds={kinds.data as KindInfo[]}
								onChanged={refresh}
							/>
						))
					)}
				</div>
			</CardContent>

			<AddProviderDialog
				kinds={kinds.data as KindInfo[]}
				open={addOpen}
				onOpenChange={setAddOpen}
				onCreated={refresh}
			/>
		</Card>
	);
}
