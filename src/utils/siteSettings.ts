// Personal site settings: let visitors tailor how the site feels.
//
// Three opt-in/out preferences are persisted to localStorage and applied both
// before paint (a tiny inline script in Base.astro mirrors `applySettingsToDocument`)
// and at runtime (the settings modal + the React islands subscribe via `SETTINGS_EVENT`).
//
//  - holiday:  "enabled" | "disabled" | "removed"
//      enabled  → holiday overlays + the header sparkle button behave normally
//      disabled → overlays paused (mirrors the existing `holidays-user-disabled`
//                 flag); the header button stays visible so it can be re-enabled
//      removed  → the header button is stripped entirely and overlays never run
//  - spotify:  "enabled" | "disabled"
//      disabled → the header status is removed AND the SpotifyStatus island never
//                 subscribes, so no requests hit the streaming API
//  - comments: "enabled" | "disabled"
//      disabled → the comments UI (sidebar pop-out, mobile overlay, TOC buttons) is
//                 removed AND the Comments island never mounts, so no requests fire

export type HolidaySetting = "enabled" | "disabled" | "removed";
export type ToggleSetting = "enabled" | "disabled";

export interface SiteSettings {
	holiday: HolidaySetting;
	spotify: ToggleSetting;
	comments: ToggleSetting;
}

export type SiteSettingKey = keyof SiteSettings;

export const SETTINGS_STORAGE_KEY = "site-settings:v1";
export const SETTINGS_SAVED_KEY = "site-settings:savedAt";
export const SETTINGS_EVENT = "site-settings:change";

// Reused so the holiday toggle/overlay keep working with our preference.
const HOLIDAY_DISABLED_KEY = "holidays-user-disabled";

export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
	holiday: "disabled",
	spotify: "enabled",
	comments: "enabled",
};

const HOLIDAY_VALUES: HolidaySetting[] = ["enabled", "disabled", "removed"];
const TOGGLE_VALUES: ToggleSetting[] = ["enabled", "disabled"];

function coerceHoliday(value: unknown): HolidaySetting {
	return HOLIDAY_VALUES.includes(value as HolidaySetting)
		? (value as HolidaySetting)
		: SITE_SETTINGS_DEFAULTS.holiday;
}

function coerceToggle(value: unknown, fallback: ToggleSetting): ToggleSetting {
	return TOGGLE_VALUES.includes(value as ToggleSetting) ? (value as ToggleSetting) : fallback;
}

/** Read the persisted settings, falling back to defaults for anything missing/invalid. */
export function readSiteSettings(): SiteSettings {
	if (typeof window === "undefined") return { ...SITE_SETTINGS_DEFAULTS };
	try {
		const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
		if (!raw) return { ...SITE_SETTINGS_DEFAULTS };
		const parsed = JSON.parse(raw) as Partial<Record<SiteSettingKey, unknown>>;
		return {
			holiday: coerceHoliday(parsed.holiday),
			spotify: coerceToggle(parsed.spotify, SITE_SETTINGS_DEFAULTS.spotify),
			comments: coerceToggle(parsed.comments, SITE_SETTINGS_DEFAULTS.comments),
		};
	} catch {
		return { ...SITE_SETTINGS_DEFAULTS };
	}
}

function writeSiteSettings(settings: SiteSettings): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// ignore storage failures (private mode, quota, …)
	}
}

/**
 * Reflect the settings onto `<html>` via classes so plain CSS can hide the
 * relevant header / TOC affordances. Kept in sync with the inline script in
 * Base.astro — update both if the class names change.
 *
 * Also ensures a non-enabled holiday preference pauses the holiday overlay. We
 * only force the pause flag (never un-force it here) so that, while holidays are
 * "enabled", the header sparkle button can still pause/resume on its own.
 */
export function applySettingsToDocument(settings: SiteSettings): void {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	root.classList.toggle("settings-holiday-removed", settings.holiday === "removed");
	root.classList.toggle("settings-spotify-disabled", settings.spotify === "disabled");
	root.classList.toggle("settings-comments-disabled", settings.comments === "disabled");

	if (settings.holiday !== "enabled") {
		try {
			window.localStorage.setItem(HOLIDAY_DISABLED_KEY, "true");
		} catch {
			// ignore
		}
	}
}

/** Read the timestamp (ms) of the last settings change, or null if never saved. */
export function readSettingsSavedAt(): number | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(SETTINGS_SAVED_KEY);
		const ts = raw ? Number(raw) : Number.NaN;
		return Number.isFinite(ts) ? ts : null;
	} catch {
		return null;
	}
}

/**
 * Push the holiday preference into the existing holiday overlay system. The
 * overlay/toggle listen for `holiday-toggle` and persist `holidays-user-disabled`
 * themselves, but we set it eagerly so a page refresh restores the right state.
 */
function syncHolidaySideEffects(value: HolidaySetting): void {
	if (typeof document === "undefined") return;
	const userDisabled = value !== "enabled";
	try {
		window.localStorage.setItem(HOLIDAY_DISABLED_KEY, String(userDisabled));
	} catch {
		// ignore
	}
	document.dispatchEvent(
		new CustomEvent("holiday-toggle", {
			detail: userDisabled ? { userDisabled: true } : { userDisabled: false, auto: true },
		}),
	);
}

/** Update a single setting, persist it, apply DOM effects, and notify listeners. */
export function setSiteSetting<K extends SiteSettingKey>(key: K, value: SiteSettings[K]): SiteSettings {
	const next = { ...readSiteSettings(), [key]: value } as SiteSettings;
	writeSiteSettings(next);
	applySettingsToDocument(next);

	if (typeof window !== "undefined") {
		try {
			window.localStorage.setItem(SETTINGS_SAVED_KEY, String(Date.now()));
		} catch {
			// ignore
		}
	}

	if (key === "holiday") {
		syncHolidaySideEffects(value as HolidaySetting);
	}

	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent<SiteSettings>(SETTINGS_EVENT, { detail: next }));
	}
	return next;
}

/**
 * Subscribe to settings changes. Fires on in-tab updates (`SETTINGS_EVENT`) and
 * cross-tab updates (the `storage` event). Returns an unsubscribe function.
 */
export function subscribeSiteSettings(listener: (settings: SiteSettings) => void): () => void {
	if (typeof window === "undefined") return () => {};

	const onChange = (event: Event) => {
		const detail = (event as CustomEvent<SiteSettings>).detail;
		listener(detail ?? readSiteSettings());
	};
	const onStorage = (event: StorageEvent) => {
		if (event.key !== null && event.key !== SETTINGS_STORAGE_KEY) return;
		listener(readSiteSettings());
	};

	window.addEventListener(SETTINGS_EVENT, onChange as EventListener);
	window.addEventListener("storage", onStorage);
	return () => {
		window.removeEventListener(SETTINGS_EVENT, onChange as EventListener);
		window.removeEventListener("storage", onStorage);
	};
}
