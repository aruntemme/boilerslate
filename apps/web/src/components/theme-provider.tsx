/**
 * Applies and persists the two theme axes.
 *
 *   theme -> data-theme="<id>" on <html>   (which colour family)
 *   mode  -> .dark class on <html>          (light / dark / follow the OS)
 *
 * Plus one editable token, --radius, set inline on <html>.
 *
 * The first paint is handled by THEME_INIT_SCRIPT in __root.tsx, not here —
 * this provider only takes over once React has hydrated. Initial state is read
 * from the DOM rather than from localStorage so the two can never disagree.
 */
import {
	DEFAULT_MODE,
	DEFAULT_RADIUS,
	DEFAULT_THEME,
	isMode,
	isThemeId,
	type Mode,
	STORAGE_KEYS,
	type ThemeId,
} from "@boilerslate/ui/lib/themes";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

interface ThemeContextValue {
	theme: ThemeId;
	mode: Mode;
	radius: string;
	/** True when the dark palette is actually showing, including via "system". */
	isDark: boolean;
	setTheme: (theme: ThemeId) => void;
	setMode: (mode: Mode) => void;
	setRadius: (radius: string) => void;
	reset: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStored<T>(
	key: string,
	guard: (v: unknown) => v is T,
	fallback: T,
): T {
	if (typeof window === "undefined") return fallback;
	try {
		const value = localStorage.getItem(key);
		return guard(value) ? value : fallback;
	} catch {
		return fallback;
	}
}

function prefersDark() {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<ThemeId>(() =>
		readStored(STORAGE_KEYS.theme, isThemeId, DEFAULT_THEME),
	);
	const [mode, setModeState] = useState<Mode>(() =>
		readStored(STORAGE_KEYS.mode, isMode, DEFAULT_MODE),
	);
	const [radius, setRadiusState] = useState<string>(() =>
		readStored(
			STORAGE_KEYS.radius,
			(v): v is string => typeof v === "string" && v.length > 0,
			DEFAULT_RADIUS,
		),
	);
	const [systemDark, setSystemDark] = useState(prefersDark);

	// Track the OS preference so mode "system" stays live rather than being
	// sampled once at load.
	useEffect(() => {
		const query = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
		query.addEventListener("change", onChange);
		setSystemDark(query.matches);
		return () => query.removeEventListener("change", onChange);
	}, []);

	const isDark = mode === "dark" || (mode === "system" && systemDark);

	useEffect(() => {
		const root = document.documentElement;
		root.setAttribute("data-theme", theme);
		root.classList.toggle("dark", isDark);
		root.style.setProperty("--radius", radius);
	}, [theme, isDark, radius]);

	const persist = useCallback((key: string, value: string) => {
		try {
			localStorage.setItem(key, value);
		} catch {
			// Private browsing or blocked storage: the theme still applies for
			// this session, it just will not be remembered.
		}
	}, []);

	const value = useMemo<ThemeContextValue>(
		() => ({
			theme,
			mode,
			radius,
			isDark,
			setTheme: (next) => {
				setThemeState(next);
				persist(STORAGE_KEYS.theme, next);
			},
			setMode: (next) => {
				setModeState(next);
				persist(STORAGE_KEYS.mode, next);
			},
			setRadius: (next) => {
				setRadiusState(next);
				persist(STORAGE_KEYS.radius, next);
			},
			reset: () => {
				setThemeState(DEFAULT_THEME);
				setModeState(DEFAULT_MODE);
				setRadiusState(DEFAULT_RADIUS);
				persist(STORAGE_KEYS.theme, DEFAULT_THEME);
				persist(STORAGE_KEYS.mode, DEFAULT_MODE);
				persist(STORAGE_KEYS.radius, DEFAULT_RADIUS);
			},
		}),
		[theme, mode, radius, isDark, persist],
	);

	return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used inside <ThemeProvider>");
	}
	return context;
}
