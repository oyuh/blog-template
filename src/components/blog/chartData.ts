// Shared data model + helpers for the blog Chart and DataTable components.
// Keeping these in one place means a chart and its "view as table" stay in sync.

export interface ChartPoint {
	x: string | number;
	y: number;
}

export interface ChartSeries {
	name: string;
	data: ChartPoint[];
	/** Optional explicit colour; falls back to the categorical palette. */
	color?: string;
}

/** A series after normalisation — colour is always resolved. */
export type NormalizedSeries = Omit<ChartSeries, "color"> & { color: string };

/** Categorical palette wired to the CSS variables defined in global.css. */
export const CHART_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
	"var(--chart-6)",
] as const;

export function seriesColor(index: number, explicit?: string): string {
	return explicit ?? CHART_COLORS[index % CHART_COLORS.length] ?? CHART_COLORS[0];
}

interface NormalizeArgs {
	series?: ChartSeries[] | undefined;
	data?: ChartPoint[] | undefined;
	title?: string | undefined;
	color?: string | undefined;
}

/**
 * Accept either the multi-series API (`series`) or the legacy single-series API
 * (`data` + `title`/`color`) and return a normalised series list with colours
 * resolved. Older posts that used `<Chart data={...} />` keep working.
 */
export function normalizeSeries({ series, data, title, color }: NormalizeArgs): NormalizedSeries[] {
	const list: ChartSeries[] =
		series && series.length > 0
			? series
			: data
				? [{ name: title?.trim() || "Series 1", data, ...(color ? { color } : {}) }]
				: [];

	return list.map((s, i) => ({
		...s,
		name: s.name?.trim() || `Series ${i + 1}`,
		color: seriesColor(i, s.color ?? (i === 0 ? color : undefined)),
	}));
}

export type CategoryRow = { x: string } & Record<string, string | number>;

/**
 * Merge every series onto a shared, ordered category axis so Recharts (which
 * wants one row per x with a key per series) can render them together.
 * Categories appear in first-seen order across all series.
 */
export function toCategoryRows(series: ChartSeries[]): {
	rows: CategoryRow[];
	categories: string[];
} {
	const categories: string[] = [];
	const seen = new Set<string>();
	for (const s of series) {
		for (const p of s.data) {
			const key = String(p.x);
			if (!seen.has(key)) {
				seen.add(key);
				categories.push(key);
			}
		}
	}

	const lookup = series.map((s) => {
		const map = new Map<string, number>();
		for (const p of s.data) map.set(String(p.x), p.y);
		return map;
	});

	const rows: CategoryRow[] = categories.map((cat) => {
		const row: CategoryRow = { x: cat };
		series.forEach((s, i) => {
			const v = lookup[i]?.get(cat);
			if (v !== undefined) row[s.name] = v;
		});
		return row;
	});

	return { rows, categories };
}

/** Compact, locale-aware number formatting for ticks, tooltips and tables. */
export function formatNumber(value: number): string {
	if (!Number.isFinite(value)) return "—";
	const abs = Math.abs(value);
	if (abs >= 1_000_000) return `${trimZero(value / 1_000_000)}M`;
	if (abs >= 10_000) return `${trimZero(value / 1_000)}k`;
	if (Number.isInteger(value)) return value.toLocaleString();
	return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function trimZero(n: number): string {
	return n
		.toLocaleString(undefined, { maximumFractionDigits: 1 })
		.replace(/\.0$/, "");
}
