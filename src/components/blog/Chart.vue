<script setup lang="ts">
import {
	BarController,
	BarElement,
	CategoryScale,
	Chart as ChartJS,
	Filler,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
	ScatterController,
	Tooltip,
} from "chart.js";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Bar, Line, Scatter } from "vue-chartjs";
import {
	type ChartPoint,
	type ChartSeries,
	type DataColumn,
	formatNumber,
	normalizeSeries,
	toCategoryRows,
} from "./chartData";
import DataTable from "./DataTable.vue";

ChartJS.register(
	LineController,
	BarController,
	ScatterController,
	LineElement,
	PointElement,
	BarElement,
	LinearScale,
	CategoryScale,
	Tooltip,
	Filler,
);

type ChartType = "line" | "bar" | "area" | "scatter";
type BarMode = "grouped" | "stacked";

const props = withDefaults(
	defineProps<{
		series?: ChartSeries[];
		data?: ChartPoint[];
		type?: ChartType;
		title?: string;
		xLabel?: string;
		yLabel?: string;
		color?: string;
		height?: number;
		barMode?: BarMode;
		smooth?: boolean;
		allowedTypes?: ChartType[];
		controls?: boolean;
		enableTable?: boolean;
	}>(),
	{
		type: "line",
		height: 340,
		barMode: "grouped",
		smooth: false,
		controls: true,
		enableTable: true,
	},
);

// --- local UI state -------------------------------------------------------
const mounted = ref(false);
const chartType = ref<ChartType>(props.type);
const mode = ref<BarMode>(props.barMode);
const compare = ref(false);
const showTable = ref(false);
const hidden = ref<Set<string>>(new Set());
// Bumped whenever the site theme changes so colour lookups re-resolve.
const themeKey = ref(0);

let observer: MutationObserver | null = null;
onMounted(() => {
	mounted.value = true;
	observer = new MutationObserver(() => {
		themeKey.value++;
	});
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class", "data-theme", "style"],
	});
});
onBeforeUnmount(() => observer?.disconnect());

// --- theme-aware colour helpers ------------------------------------------
function cssVarValue(name: string): string {
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function resolveColor(value: string): string {
	const m = value.trim().match(/^var\((--[^,)]+)\)$/);
	return m ? cssVarValue(m[1]) || value : value;
}
function withAlpha(value: string, pct: number): string {
	return `color-mix(in srgb, ${resolveColor(value)} ${pct}%, transparent)`;
}

// --- normalised data ------------------------------------------------------
const allSeries = computed(() =>
	normalizeSeries({
		series: props.series,
		data: props.data,
		title: props.title,
		color: props.color,
	}),
);

const types = computed<ChartType[]>(() => {
	const base = props.allowedTypes ?? ["line", "bar", "area"];
	return base.includes(props.type) ? base : [props.type, ...base];
});

const visibleSeries = computed(() => allSeries.value.filter((s) => !hidden.value.has(s.name)));
const categoryData = computed(() => toCategoryRows(allSeries.value));
const rows = computed(() => categoryData.value.rows);
const categories = computed(() => categoryData.value.categories);

const multi = computed(() => allSeries.value.length > 1);
const stacked = computed(() => mode.value === "stacked");
const dotsVisible = computed(() => categories.value.length <= 24);

const showModeToggle = computed(
	() => props.controls && multi.value && (chartType.value === "bar" || chartType.value === "area"),
);
const showCompareToggle = computed(
	() =>
		props.controls &&
		visibleSeries.value.length >= 2 &&
		(chartType.value === "line" || (chartType.value === "area" && !stacked.value)),
);
const compareActive = computed(() => compare.value && showCompareToggle.value);

const tableColumns = computed<DataColumn[]>(() => [
	{ key: "x", label: props.xLabel || "Category", numeric: false },
	...allSeries.value.map((s) => ({ key: s.name, label: s.name, numeric: true })),
]);

function toggleSeries(name: string) {
	const next = new Set(hidden.value);
	if (next.has(name)) next.delete(name);
	else if (hidden.value.size < allSeries.value.length - 1) next.add(name);
	hidden.value = next;
}

// --- chart.js config ------------------------------------------------------
function num2(
	av: string | number | undefined,
	bv: string | number | undefined,
	fn: (a: number, b: number) => number,
): number | null {
	return typeof av === "number" && typeof bv === "number" ? fn(av, bv) : null;
}

const gridColor = computed(() => {
	themeKey.value; // dependency
	return withAlpha("var(--color-global-text)", 12);
});

const chartData = computed(() => {
	themeKey.value; // re-resolve colours on theme change

	if (chartType.value === "scatter") {
		return {
			datasets: visibleSeries.value.map((s) => ({
				label: s.name,
				data: s.data.map((p) => ({ x: Number(p.x), y: p.y })),
				backgroundColor: resolveColor(s.color),
				pointRadius: 4,
				pointHoverRadius: 6,
			})),
		};
	}

	if (chartType.value === "bar") {
		return {
			labels: categories.value,
			datasets: visibleSeries.value.map((s) => ({
				label: s.name,
				data: rows.value.map((r) => (typeof r[s.name] === "number" ? (r[s.name] as number) : null)),
				backgroundColor: resolveColor(s.color),
				borderRadius: 4,
				maxBarThickness: 56,
				...(stacked.value ? { stack: "stack" } : {}),
			})),
		};
	}

	// line / area
	const area = chartType.value === "area";
	const st = stacked.value;
	const datasets: Record<string, unknown>[] = [];

	if (compareActive.value) {
		const [a, b] = visibleSeries.value;
		if (a && b) {
			datasets.push({
				label: "__base",
				data: rows.value.map((r) => num2(r[a.name], r[b.name], Math.min)),
				borderColor: "transparent",
				pointRadius: 0,
				fill: false,
				order: 2,
			});
			datasets.push({
				label: "__band",
				data: rows.value.map((r) => num2(r[a.name], r[b.name], Math.max)),
				borderColor: "transparent",
				pointRadius: 0,
				backgroundColor: withAlpha("var(--color-accent)", 12),
				fill: 0, // fill down to the __base dataset
				order: 2,
			});
		}
	}

	visibleSeries.value.forEach((s, i) => {
		const color = resolveColor(s.color);
		datasets.push({
			label: s.name,
			data: rows.value.map((r) => (typeof r[s.name] === "number" ? (r[s.name] as number) : null)),
			borderColor: color,
			backgroundColor: area ? withAlpha(s.color, st ? 35 : 14) : color,
			borderWidth: 2,
			tension: props.smooth ? 0.4 : 0,
			spanGaps: true,
			pointRadius: area ? 0 : dotsVisible.value ? 2.5 : 0,
			pointHoverRadius: 4,
			pointBackgroundColor: color,
			fill: area ? (st ? (i === 0 ? "origin" : "-1") : "origin") : false,
			order: 1,
		});
	});

	return { labels: categories.value, datasets };
});

const chartOptions = computed(() => {
	themeKey.value; // dependency
	const isScatter = chartType.value === "scatter";
	const stackAxes = (chartType.value === "bar" || chartType.value === "area") && stacked.value;
	const tickFont = { size: 11, family: '"Geist Mono Variable", monospace' };
	const text = resolveColor("var(--color-global-text)");

	return {
		responsive: true,
		maintainAspectRatio: false,
		interaction: {
			mode: isScatter ? "nearest" : "index",
			intersect: false,
		},
		scales: {
			x: {
				type: isScatter ? "linear" : "category",
				stacked: stackAxes,
				ticks: { font: tickFont, ...(isScatter ? { callback: (v: number) => formatNumber(Number(v)) } : {}) },
				grid: { display: false },
				title: props.xLabel ? { display: true, text: props.xLabel, font: tickFont } : { display: false },
			},
			y: {
				type: "linear",
				stacked: stackAxes,
				ticks: { font: tickFont, callback: (v: number) => formatNumber(Number(v)) },
				grid: { color: gridColor.value },
				title: props.yLabel ? { display: true, text: props.yLabel, font: tickFont } : { display: false },
			},
		},
		plugins: {
			legend: { display: false },
			tooltip: {
				backgroundColor: resolveColor("var(--color-global-bg)"),
				borderColor: gridColor.value,
				borderWidth: 1,
				titleColor: text,
				bodyColor: text,
				titleFont: { family: '"Geist Mono Variable", monospace', size: 12, weight: 600 },
				bodyFont: { family: '"Geist Mono Variable", monospace', size: 13 },
				padding: 10,
				cornerRadius: 8,
				filter: (item: { dataset: { label?: string } }) =>
					!String(item.dataset.label ?? "").startsWith("__"),
				callbacks: {
					title: (items: { label?: string; parsed: { x: number } }[]) => {
						if (isScatter) {
							return `${props.xLabel || "x"} ${formatNumber(Number(items[0]?.parsed.x))}`;
						}
						return items[0]?.label ?? "";
					},
					label: (item: { dataset: { label?: string }; parsed: { y: number } }) =>
						` ${item.dataset.label}: ${formatNumber(Number(item.parsed.y))}`,
				},
			},
		},
	};
});
</script>

<template>
	<figure class="chart-card not-prose">
		<figcaption v-if="title" class="chart-title">{{ title }}</figcaption>

		<div
			v-if="controls && (types.length > 1 || multi || enableTable)"
			class="chart-controls"
		>
			<div v-if="types.length > 1" class="chart-seg" role="tablist" aria-label="Chart type">
				<button
					v-for="t in types"
					:key="t"
					type="button"
					role="tab"
					:aria-selected="chartType === t"
					:class="['chart-seg-btn', { 'is-active': chartType === t }]"
					@click="chartType = t"
				>
					{{ t[0]?.toUpperCase() }}{{ t.slice(1) }}
				</button>
			</div>

			<div class="chart-controls-right">
				<button
					v-if="showModeToggle"
					type="button"
					class="chart-toggle"
					:aria-pressed="stacked"
					@click="mode = stacked ? 'grouped' : 'stacked'"
				>
					{{ stacked ? "Stacked" : "Grouped" }}
				</button>
				<button
					v-if="showCompareToggle"
					type="button"
					:class="['chart-toggle', { 'is-active': compareActive }]"
					:aria-pressed="compareActive"
					@click="compare = !compare"
				>
					Δ Compare
				</button>
				<button
					v-if="enableTable"
					type="button"
					:class="['chart-toggle', { 'is-active': showTable }]"
					:aria-pressed="showTable"
					@click="showTable = !showTable"
				>
					{{ showTable ? "Hide table" : "View as table" }}
				</button>
			</div>
		</div>

		<div class="chart-plot">
			<div v-if="!mounted" class="chart-plot chart-plot--loading" :style="{ height: `${height}px` }">
				<span class="chart-loading">Loading chart…</span>
			</div>
			<div v-else :style="{ height: `${height}px` }">
				<Scatter v-if="chartType === 'scatter'" :data="(chartData as any)" :options="(chartOptions as any)" />
				<Bar v-else-if="chartType === 'bar'" :data="(chartData as any)" :options="(chartOptions as any)" />
				<Line v-else :data="(chartData as any)" :options="(chartOptions as any)" />
			</div>
		</div>

		<div v-if="multi" class="chart-legend" role="toolbar" aria-label="Toggle series">
			<button
				v-for="s in allSeries"
				:key="s.name"
				type="button"
				:class="['chart-legend-chip', { 'is-off': hidden.has(s.name) }]"
				:aria-pressed="!hidden.has(s.name)"
				@click="toggleSeries(s.name)"
			>
				<span class="chart-legend-swatch" :style="{ background: s.color }" />
				{{ s.name }}
			</button>
		</div>

		<div v-if="showTable && enableTable" class="chart-table">
			<DataTable :columns="tableColumns" :rows="rows" bare compact />
		</div>
	</figure>
</template>
