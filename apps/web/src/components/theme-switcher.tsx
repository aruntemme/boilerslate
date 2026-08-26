/**
 * Theme dropdown: pick a colour family and a light/dark mode.
 * The fuller controls, including radius, live on the settings page.
 */
import { Button } from "@boilerslate/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@boilerslate/ui/components/dropdown-menu";
import { type Mode, THEMES, type ThemeId } from "@boilerslate/ui/lib/themes";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

const MODES: { value: Mode; label: string; icon: typeof Sun }[] = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

export function ThemeSwitcher() {
	const { theme, mode, setTheme, setMode } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="icon" aria-label="Change theme" />
				}
			>
				<Palette className="size-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				{/* Base UI requires GroupLabel to live inside its group. */}
				<DropdownMenuRadioGroup
					value={theme}
					onValueChange={(value) => setTheme(value as ThemeId)}
				>
					<DropdownMenuLabel>Theme</DropdownMenuLabel>
					{THEMES.map((t) => (
						<DropdownMenuRadioItem key={t.id} value={t.id}>
							<span className="flex items-center gap-2">
								<span
									aria-hidden="true"
									className="size-3.5 rounded-full border border-border"
									style={{ background: t.swatch }}
								/>
								{t.label}
							</span>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>

				<DropdownMenuSeparator />

				<DropdownMenuRadioGroup
					value={mode}
					onValueChange={(value) => setMode(value as Mode)}
				>
					<DropdownMenuLabel>Appearance</DropdownMenuLabel>
					{MODES.map(({ value, label, icon: Icon }) => (
						<DropdownMenuRadioItem key={value} value={value}>
							<span className="flex items-center gap-2">
								<Icon className="size-3.5" />
								{label}
							</span>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
