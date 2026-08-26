/**
 * The theme registry.
 *
 * Every theme listed here has a matching `:root[data-theme="<id>"]` block in
 * styles/themes.css. Adding a theme means adding it in both places and
 * nowhere else — the switcher and the settings page both read this list.
 *
 * `swatch` is the light-mode primary, used to render the preview dot. It is
 * duplicated from the CSS on purpose: the picker has to paint a swatch for a
 * theme that is not currently applied, so it cannot read the live variable.
 */

export type ThemeId =
	| "emerald"
	| "violet"
	| "neutral"
	| "blue"
	| "rose"
	| "amber"
	| "cyan"
	| "orange";

export type Mode = "light" | "dark" | "system";

export interface ThemeDefinition {
	id: ThemeId;
	label: string;
	swatch: string;
}

export const THEMES: readonly ThemeDefinition[] = [
	{ id: "emerald", label: "Emerald", swatch: "oklch(0.508 0.118 165.612)" },
	{ id: "violet", label: "Violet", swatch: "oklch(0.457 0.24 277.023)" },
	{ id: "blue", label: "Blue", swatch: "oklch(0.546 0.245 262.881)" },
	{ id: "cyan", label: "Cyan", swatch: "oklch(0.52 0.105 220.5)" },
	{ id: "rose", label: "Rose", swatch: "oklch(0.514 0.222 16.935)" },
	{ id: "orange", label: "Orange", swatch: "oklch(0.553 0.195 38.402)" },
	{ id: "amber", label: "Amber", swatch: "oklch(0.555 0.128 66.663)" },
	{ id: "neutral", label: "Neutral", swatch: "oklch(0.205 0 0)" },
] as const;

export const DEFAULT_THEME: ThemeId = "emerald";
export const DEFAULT_MODE: Mode = "system";

/** Corner radius presets, exposed as an editable control in settings. */
export const RADII = [
	{ label: "Square", value: "0rem" },
	{ label: "Small", value: "0.375rem" },
	{ label: "Default", value: "0.625rem" },
	{ label: "Large", value: "1rem" },
] as const;

export const DEFAULT_RADIUS = "0.625rem";

/** localStorage keys. Shared by the provider and the no-flash inline script. */
export const STORAGE_KEYS = {
	theme: "ui-theme",
	mode: "ui-mode",
	radius: "ui-radius",
} as const;

export function isThemeId(value: unknown): value is ThemeId {
	return THEMES.some((t) => t.id === value);
}

export function isMode(value: unknown): value is Mode {
	return value === "light" || value === "dark" || value === "system";
}

/**
 * Runs before first paint, inlined into the document head as a blocking
 * script. Without this the page renders with default tokens and then snaps to
 * the stored theme — a visible flash on every load.
 *
 * Kept as a string with no external references so it can be stringified
 * verbatim into the HTML.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var d=document.documentElement;
var t=localStorage.getItem("${STORAGE_KEYS.theme}")||"${DEFAULT_THEME}";
var m=localStorage.getItem("${STORAGE_KEYS.mode}")||"${DEFAULT_MODE}";
var r=localStorage.getItem("${STORAGE_KEYS.radius}");
d.setAttribute("data-theme",t);
var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
d.classList.toggle("dark",dark);
if(r){d.style.setProperty("--radius",r);}
}catch(e){}})();`;
