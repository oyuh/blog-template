import { useEffect, useMemo, useState } from "react";
import {
	Area,
	Bar,
	CartesianGrid,
	ComposedChart,
	Line,
	ResponsiveContainer,
	Scatter,
	ScatterChart,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	type ChartPoint,
	type ChartSeries,
	formatNumber,
	normalizeSeries,
	toCategoryRows,
} from "./chartData";
import DataTable, { type DataColumn } from "./DataTable";

type ChartType = "line" | "bar" | "area" | "scatter";
type BarMode = "grouped" | "stacked";

interface ChartProps {
	/** Multi-series API. */
	series?: ChartSeries[];
	/** Legacy single-series API (still supported). */
	data?: ChartPoint[];
	type?: ChartType;
	title?: string;
	xLabel?: string;
	yLabel?: string;
	color?: string;
	height?: number;
	/** Initial layout for bar/area when there is more than one series. */
	barMode?: BarMode;
	/** Smooth (monotone) line/area curves. */
	smooth?: boolean;
	/** Which chart types the type-switcher offers. */
	allowedTypes?: ChartType[];
	/** Show the controls bar (type switch, legend, table toggle). */
	controls?: boolean;
	/** Offer the "view as table" toggle. */
	enableTable?: boolean;
}

interface TooltipItem {
	name?: string;
	value?: number | string;
	color?: string;
	dataKey?: string | number;
	payload?: Record<string, unknown>;
}

interface TooltipProps {
	active?: boolean;
	payload?: TooltipItem[];
	label?: string | number;
}

const CMP_BASE = "__cmpBase";
const CMP_BAND = "__cmpBand";

export default function Chart({
	series,
	data,
	type = "line",
	title,
	xLabel,
	yLabel,
	color,
	height = 340,
	barMode: barModeProp = "grouped",
	smooth = false,
	allowedTypes,
	controls = true,
	enableTable = true,
}: ChartProps) {
	const allSeries = useMemo(
		() => normalizeSeries({ series, data, title, color }),
		[series, data, title, color],
	);

	const types = useMemo<ChartType[]>(() => {
		const base = allowedTypes ?? ["line", "bar", "area"];
		return base.includes(type) ? base : [type, ...base];
	}, [allowedTypes, type]);

	const [mounted, setMounted] = useState(false);
	const [chartType, setChartType] = useState<ChartType>(type);
	const [barMode, setBarMode] = useState<BarMode>(barModeProp);
	const [compare, setCompare] = useState(false);
	const [showTable, setShowTable] = useState(false);
	const [hidden, setHidden] = useState<Set<string>>(new Set());

	useEffect(() => setMounted(true), []);

	const visibleSeries = useMemo(
		() => allSeries.filter((s) => !hidden.has(s.name)),
		[allSeries, hidden],
	);

	const { rows, categories } = useMemo(() => toCategoryRows(allSeries), [allSeries]);

	const multi = allSeries.length > 1;
	const stacked = barMode === "stacked";
	const showModeToggle = controls && multi && (chartType === "bar" || chartType === "area");
	const showCompareToggle =
		controls &&
		visibleSeries.length >= 2 &&
		(chartType === "line" || (chartType === "area" && !stacked));
	const compareActive = compare && showCompareToggle;

	// Build the rows the chart consumes. When comparing, add a shaded band
	// (min .. max) between the first two visible series to surface the gap.
	const chartRows = useMemo(() => {
		if (!compareActive) return rows;
		const [a, b] = visibleSeries;
		if (!a || !b) return rows;
		return rows.map((row) => {
			const av = row[a.name];
			const bv = row[b.name];
			if (typeof av !== "number" || typeof bv !== "number") return row;
			return { ...row, [CMP_BASE]: Math.min(av, bv), [CMP_BAND]: Math.abs(av - bv) };
		});
	}, [rows, compareActive, visibleSeries]);

	const toggleSeries = (name: string) =>
		setHidden((prev) => {
			const next = new Set(prev);
			if (next.has(name)) next.delete(name);
			// keep at least one series visible
			else if (prev.size < allSeries.length - 1) next.add(name);
			return next;
		});

	const tableColumns: DataColumn[] = useMemo(
		() => [
			{ key: "x", label: xLabel || "Category", numeric: false },
			...allSeries.map((s) => ({ key: s.name, label: s.name, numeric: true })),
		],
		[allSeries, xLabel],
	);

	const renderTooltip = ({ active, payload, label }: TooltipProps) => {
		if (!active || !payload || payload.length === 0) return null;
		const items = payload.filter(
			(p) => p.dataKey !== CMP_BASE && p.dataKey !== CMP_BAND && p.value !== undefined,
		);
		if (items.length === 0) return null;

		const heading =
			chartType === "scatter"
				? `${xLabel || "x"} ${formatNumber(Number(items[0]?.payload?.x))}`
				: String(label ?? "");

		return (
			<div className="chart-tip">
				{heading && <div className="chart-tip-label">{heading}</div>}
				{items.map((item, i) => {
					const value =
						chartType === "scatter"
							? Number(item.payload?.y ?? item.value)
							: Number(item.value);
					return (
						<div className="chart-tip-row" key={`${item.name}-${i}`}>
							<span className="chart-tip-swatch" style={{ background: item.color }} />
							<span className="chart-tip-name">{item.name}</span>
							<span className="chart-tip-val">{formatNumber(value)}</span>
						</div>
					);
				})}
			</div>
		);
	};

	const axisProps = {
		tick: { fontSize: 11, fontFamily: '"Atkinson Hyperlegible Mono", monospace' },
		tickLine: false,
		axisLine: { strokeWidth: 1 },
	} as const;

	if (!mounted) {
		return (
			<div className="chart-card not-prose" aria-hidden="true">
				{title && <div className="chart-title">{title}</div>}
				<div className="chart-plot chart-plot--loading" style={{ height }}>
					<span className="chart-loading">Loading chart…</span>
				</div>
			</div>
		);
	}

	const dotsVisible = categories.length <= 24;

	return (
		<figure className="chart-card not-prose">
			{title && <figcaption className="chart-title">{title}</figcaption>}

			{controls && (types.length > 1 || multi || enableTable) && (
				<div className="chart-controls">
					{types.length > 1 && (
						<div className="chart-seg" role="tablist" aria-label="Chart type">
							{types.map((t) => (
								<button
									type="button"
									key={t}
									role="tab"
									aria-selected={chartType === t}
									className={`chart-seg-btn${chartType === t ? " is-active" : ""}`}
									onClick={() => setChartType(t)}
								>
									{t[0]?.toUpperCase()}
									{t.slice(1)}
								</button>
							))}
						</div>
					)}

					<div className="chart-controls-right">
						{showModeToggle && (
							<button
								type="button"
								className="chart-toggle"
								aria-pressed={stacked}
								onClick={() => setBarMode(stacked ? "grouped" : "stacked")}
							>
								{stacked ? "Stacked" : "Grouped"}
							</button>
						)}
						{showCompareToggle && (
							<button
								type="button"
								className={`chart-toggle${compareActive ? " is-active" : ""}`}
								aria-pressed={compareActive}
								onClick={() => setCompare((c) => !c)}
							>
								Δ Compare
							</button>
						)}
						{enableTable && (
							<button
								type="button"
								className={`chart-toggle${showTable ? " is-active" : ""}`}
								aria-pressed={showTable}
								onClick={() => setShowTable((s) => !s)}
							>
								{showTable ? "Hide table" : "View as table"}
							</button>
						)}
					</div>
				</div>
			)}

			<div className="chart-plot">
				<ResponsiveContainer width="100%" height={height}>
					{chartType === "scatter" ? (
						<ScatterChart margin={{ top: 8, right: 16, bottom: xLabel ? 24 : 8, left: yLabel ? 8 : 0 }}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} />
							<XAxis
								type="number"
								dataKey="x"
								{...axisProps}
								{...(xLabel
									? { name: xLabel, label: { value: xLabel, position: "insideBottom", offset: -10 } }
									: {})}
							/>
							<YAxis
								type="number"
								dataKey="y"
								{...axisProps}
								width={48}
								tickFormatter={(v) => formatNumber(Number(v))}
								{...(yLabel
									? { name: yLabel, label: { value: yLabel, angle: -90, position: "insideLeft" } }
									: {})}
							/>
							<Tooltip
								content={(p) => renderTooltip(p as unknown as TooltipProps)}
								cursor={{ strokeDasharray: "3 3" }}
							/>
							{visibleSeries.map((s) => (
								<Scatter key={s.name} name={s.name} data={s.data} fill={s.color} />
							))}
						</ScatterChart>
					) : (
						<ComposedChart
							data={chartRows}
							margin={{ top: 8, right: 16, bottom: xLabel ? 24 : 8, left: yLabel ? 8 : 0 }}
						>
							<CartesianGrid strokeDasharray="3 3" vertical={false} />
							<XAxis
								dataKey="x"
								{...axisProps}
								{...(xLabel
									? { label: { value: xLabel, position: "insideBottom", offset: -10 } }
									: {})}
							/>
							<YAxis
								{...axisProps}
								width={48}
								tickFormatter={(v) => formatNumber(Number(v))}
								{...(yLabel
									? { label: { value: yLabel, angle: -90, position: "insideLeft" } }
									: {})}
							/>
							<Tooltip
								content={(p) => renderTooltip(p as unknown as TooltipProps)}
								cursor={{ className: "chart-cursor" }}
							/>

							{compareActive && (
								<>
									<Area
										dataKey={CMP_BASE}
										stackId="cmp"
										stroke="none"
										fill="transparent"
										isAnimationActive={false}
										activeDot={false}
										legendType="none"
									/>
									<Area
										dataKey={CMP_BAND}
										stackId="cmp"
										stroke="none"
										fill="var(--color-accent)"
										fillOpacity={0.12}
										isAnimationActive={false}
										activeDot={false}
										legendType="none"
									/>
								</>
							)}

							{visibleSeries.map((s) => {
								if (chartType === "bar") {
									return (
										<Bar
											key={s.name}
											dataKey={s.name}
											fill={s.color}
											radius={[4, 4, 0, 0]}
											maxBarSize={56}
											{...(stacked ? { stackId: "stack" } : {})}
										/>
									);
								}
								if (chartType === "area") {
									return (
										<Area
											key={s.name}
											dataKey={s.name}
											type={smooth ? "monotone" : "linear"}
											stroke={s.color}
											strokeWidth={2}
											fill={s.color}
											fillOpacity={stacked ? 0.35 : 0.14}
											{...(stacked ? { stackId: "stack" } : {})}
											dot={false}
											activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-global-bg)" }}
											connectNulls
										/>
									);
								}
								return (
									<Line
										key={s.name}
										dataKey={s.name}
										type={smooth ? "monotone" : "linear"}
										stroke={s.color}
										strokeWidth={2}
										dot={dotsVisible ? { r: 2.5, strokeWidth: 0, fill: s.color } : false}
										activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-global-bg)" }}
										connectNulls
									/>
								);
							})}
						</ComposedChart>
					)}
				</ResponsiveContainer>
			</div>

			{multi && (
				<div className="chart-legend" role="toolbar" aria-label="Toggle series">
					{allSeries.map((s) => {
						const off = hidden.has(s.name);
						return (
							<button
								type="button"
								key={s.name}
								className={`chart-legend-chip${off ? " is-off" : ""}`}
								aria-pressed={!off}
								onClick={() => toggleSeries(s.name)}
							>
								<span className="chart-legend-swatch" style={{ background: s.color }} />
								{s.name}
							</button>
						);
					})}
				</div>
			)}

			{showTable && enableTable && (
				<div className="chart-table">
					<DataTable columns={tableColumns} rows={rows} bare compact />
				</div>
			)}
		</figure>
	);
}
