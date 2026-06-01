import { useMemo, useState } from "react";
import { formatNumber } from "./chartData";

export interface DataColumn {
	key: string;
	label: string;
	align?: "left" | "right" | "center";
	/** Treat values as numbers for sorting + default right-alignment. */
	numeric?: boolean;
	format?: (value: string | number) => string;
}

export type DataRow = Record<string, string | number>;

interface DataTableProps {
	columns: DataColumn[];
	rows: DataRow[];
	caption?: string;
	sortable?: boolean;
	compact?: boolean;
	/** Drop the outer card chrome (used when embedded under a chart). */
	bare?: boolean;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

function isNumericColumn(col: DataColumn, rows: DataRow[]): boolean {
	if (col.numeric !== undefined) return col.numeric;
	return rows.every((r) => {
		const v = r[col.key];
		return v === undefined || v === "" || typeof v === "number";
	});
}

export default function DataTable({
	columns,
	rows,
	caption,
	sortable = true,
	compact = false,
	bare = false,
}: DataTableProps) {
	const [sort, setSort] = useState<SortState>(null);

	const numericCols = useMemo(
		() => new Set(columns.filter((c) => isNumericColumn(c, rows)).map((c) => c.key)),
		[columns, rows],
	);

	const sortedRows = useMemo(() => {
		if (!sort) return rows;
		const numeric = numericCols.has(sort.key);
		const factor = sort.dir === "asc" ? 1 : -1;
		return [...rows].sort((a, b) => {
			const av = a[sort.key];
			const bv = b[sort.key];
			if (av === undefined) return 1;
			if (bv === undefined) return -1;
			if (numeric) return (Number(av) - Number(bv)) * factor;
			return String(av).localeCompare(String(bv)) * factor;
		});
	}, [rows, sort, numericCols]);

	const toggleSort = (key: string) => {
		setSort((prev) => {
			if (!prev || prev.key !== key) return { key, dir: "asc" };
			if (prev.dir === "asc") return { key, dir: "desc" };
			return null; // third click clears, restoring source order
		});
	};

	const renderCell = (col: DataColumn, value: string | number | undefined) => {
		if (value === undefined || value === "") return "—";
		if (col.format) return col.format(value);
		if (numericCols.has(col.key) && typeof value === "number") return formatNumber(value);
		return value;
	};

	return (
		<div className={`dtable-wrap not-prose${bare ? " dtable-wrap--bare" : ""}`}>
			<div className="dtable-scroll">
				<table className={`dtable${compact ? " dtable--compact" : ""}`}>
					{caption && <caption className="dtable-caption">{caption}</caption>}
					<thead>
						<tr>
							{columns.map((col) => {
								const align = col.align ?? (numericCols.has(col.key) ? "right" : "left");
								const active = sort?.key === col.key;
								const ariaSort = active
									? sort?.dir === "asc"
										? "ascending"
										: "descending"
									: "none";
								return (
									<th
										key={col.key}
										scope="col"
										aria-sort={sortable ? ariaSort : undefined}
										style={{ textAlign: align }}
									>
										{sortable ? (
											<button
												type="button"
												className={`dtable-sort${active ? " is-active" : ""}`}
												onClick={() => toggleSort(col.key)}
											>
												<span>{col.label}</span>
												<span className="dtable-sort-icon" aria-hidden="true">
													{active ? (sort?.dir === "asc" ? "▲" : "▼") : "↕"}
												</span>
											</button>
										) : (
											col.label
										)}
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody>
						{sortedRows.map((row, i) => (
							<tr key={i}>
								{columns.map((col) => {
									const align = col.align ?? (numericCols.has(col.key) ? "right" : "left");
									return (
										<td key={col.key} style={{ textAlign: align }}>
											{renderCell(col, row[col.key])}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
