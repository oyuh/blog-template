<script setup lang="ts">
import { computed, ref } from "vue";
import { type DataColumn, type DataRow, formatNumber } from "./chartData";

const props = withDefaults(
	defineProps<{
		columns: DataColumn[];
		rows: DataRow[];
		caption?: string;
		sortable?: boolean;
		compact?: boolean;
		/** Drop the outer card chrome (used when embedded under a chart). */
		bare?: boolean;
	}>(),
	{ sortable: true, compact: false, bare: false },
);

type SortState = { key: string; dir: "asc" | "desc" } | null;
const sort = ref<SortState>(null);

function isNumericColumn(col: DataColumn): boolean {
	if (col.numeric !== undefined) return col.numeric;
	return props.rows.every((r) => {
		const v = r[col.key];
		return v === undefined || v === "" || typeof v === "number";
	});
}

const numericCols = computed(
	() => new Set(props.columns.filter(isNumericColumn).map((c) => c.key)),
);

const sortedRows = computed(() => {
	const s = sort.value;
	if (!s) return props.rows;
	const numeric = numericCols.value.has(s.key);
	const factor = s.dir === "asc" ? 1 : -1;
	return [...props.rows].sort((a, b) => {
		const av = a[s.key];
		const bv = b[s.key];
		if (av === undefined) return 1;
		if (bv === undefined) return -1;
		if (numeric) return (Number(av) - Number(bv)) * factor;
		return String(av).localeCompare(String(bv)) * factor;
	});
});

function toggleSort(key: string) {
	const prev = sort.value;
	if (!prev || prev.key !== key) sort.value = { key, dir: "asc" };
	else if (prev.dir === "asc") sort.value = { key, dir: "desc" };
	else sort.value = null; // third click clears, restoring source order
}

function alignFor(col: DataColumn): "left" | "right" | "center" {
	return col.align ?? (numericCols.value.has(col.key) ? "right" : "left");
}

function ariaSortFor(col: DataColumn): "ascending" | "descending" | "none" {
	if (sort.value?.key !== col.key) return "none";
	return sort.value.dir === "asc" ? "ascending" : "descending";
}

function renderCell(col: DataColumn, value: string | number | undefined): string | number {
	if (value === undefined || value === "") return "—";
	if (col.format) return col.format(value);
	if (numericCols.value.has(col.key) && typeof value === "number") return formatNumber(value);
	return value;
}
</script>

<template>
	<div :class="['dtable-wrap', 'not-prose', { 'dtable-wrap--bare': bare }]">
		<div class="dtable-scroll">
			<table :class="['dtable', { 'dtable--compact': compact }]">
				<caption v-if="caption" class="dtable-caption">{{ caption }}</caption>
				<thead>
					<tr>
						<th
							v-for="col in columns"
							:key="col.key"
							scope="col"
							:aria-sort="sortable ? ariaSortFor(col) : undefined"
							:style="{ textAlign: alignFor(col) }"
						>
							<button
								v-if="sortable"
								type="button"
								:class="['dtable-sort', { 'is-active': sort?.key === col.key }]"
								@click="toggleSort(col.key)"
							>
								<span>{{ col.label }}</span>
								<span class="dtable-sort-icon" aria-hidden="true">
									{{ sort?.key === col.key ? (sort?.dir === "asc" ? "▲" : "▼") : "↕" }}
								</span>
							</button>
							<template v-else>{{ col.label }}</template>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(row, i) in sortedRows" :key="i">
						<td v-for="col in columns" :key="col.key" :style="{ textAlign: alignFor(col) }">
							{{ renderCell(col, row[col.key]) }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
