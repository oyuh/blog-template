// Small, consistent "hand-placed" tilt for hover cards / readouts.
// Magnitude stays gentle (≈1.3–2.6°) with a random direction, so things look
// casually rotated rather than glitchy.

const MIN = 1.3;
const RANGE = 1.3; // → max ≈ 2.6°

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Deterministic tilt from a stable seed (e.g. a post id) — same input, same tilt. */
export function tiltFromSeed(seed: string): number {
	let h = 0;
	for (let i = 0; i < seed.length; i += 1) {
		h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
	}
	const sign = h & 1 ? 1 : -1;
	const amt = MIN + ((h >>> 1) % 131) / 100;
	return round2(sign * amt);
}

/** Random tilt for runtime, single-instance UI (e.g. the footer readouts). */
export function randomTilt(): number {
	const sign = Math.random() < 0.5 ? -1 : 1;
	return round2(sign * (MIN + Math.random() * RANGE));
}
