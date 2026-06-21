import type { APIRoute } from "astro";

// Server-side proxy for the music-thing worker (https://github.com/oyuh/music-thing).
//
// The worker requires a secret (`?secret=` or `Authorization: Bearer`). Per its
// README: "anything in client-side JS is public — viewers can read your
// API_SECRET in the page source." So we never call it from the browser. This
// route runs on the server, reads the secret from a server-only env var, and
// returns ONLY the minimal now-playing fields the footer needs — the secret and
// everything else stay on the server.

export const prerender = false;

const MUSIC_API_URL = "https://music-thing.lawson-hart.workers.dev/";

type WorkerTrack = {
	title?: string;
	artists?: string[];
	albumArt?: string;
	url?: string;
	durationMs?: number;
	progressMs?: number;
};

type WorkerColor = { hex?: string };

type WorkerResponse = {
	state?: "playing" | "paused" | "stopped";
	source?: "now-playing" | "recently-played";
	track?: WorkerTrack | null;
	colors?: {
		dominant?: WorkerColor;
		accents?: WorkerColor[];
		text?: string;
	};
};

// These values become CSS custom properties in the browser, so only let through
// strict #rgb / #rrggbb hex — never trust an arbitrary string into `style`.
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const safeHex = (value: unknown): string | null =>
	typeof value === "string" && HEX.test(value.trim()) ? value.trim() : null;

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			// Live data — don't let the browser or CDN serve a stale song.
			"Cache-Control": "no-store",
		},
	});
}

// Treat anything that isn't actively "playing" as idle: the footer only glows /
// animates while a song is really playing, matching the old behaviour.
const idle = () => json({ status: "idle", currentTrack: null });

export const GET: APIRoute = async () => {
	const secret = import.meta.env.MUSIC_THING_SECRET ?? process.env.MUSIC_THING_SECRET;
	if (!secret) {
		console.error("[now-playing] MUSIC_THING_SECRET is not configured");
		return json({ status: "idle", currentTrack: null, error: "not_configured" }, 500);
	}

	try {
		const upstream = await fetch(MUSIC_API_URL, {
			headers: { Authorization: `Bearer ${secret}` },
		});

		if (!upstream.ok) {
			console.error(`[now-playing] upstream responded ${upstream.status}`);
			return idle();
		}

		const data = (await upstream.json()) as WorkerResponse;
		const track = data?.track;
		const playing = data?.state === "playing" && Boolean(track);

		if (!playing || !track) return idle();

		// Album-art palette → footer accents. Sanitized to hex; nulls let the CSS
		// fall back to the site's own accent vars.
		const colors = {
			dominant: safeHex(data.colors?.dominant?.hex),
			accents: (data.colors?.accents ?? [])
				.map((accent) => safeHex(accent?.hex))
				.filter((hex): hex is string => hex !== null),
			text: safeHex(data.colors?.text),
		};

		return json({
			status: "playing",
			currentTrack: {
				track: track.title ?? "",
				artist: Array.isArray(track.artists) ? track.artists.join(", ") : "",
				albumArt: track.albumArt ?? "",
				duration: track.durationMs ?? 0,
				progress: track.progressMs ?? 0,
				colors,
			},
		});
	} catch (error) {
		console.error("[now-playing] fetch failed:", error);
		return idle();
	}
};
