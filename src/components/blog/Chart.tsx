import type React from "react";
import { useEffect, useRef, useState } from "react";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

interface DataPoint {
	x: number | string;
	y: number;
	label?: string;
}

interface ChartProps {
	data: DataPoint[];
	type?: "line" | "bar" | "scatter";
	title?: string;
	xLabel?: string;
	yLabel?: string;
	color?: string;
	width?: number;
	height?: number;
	client?: string; // For Astro client directive
}

export default function Chart({
	data,
	type = "line",
	title,
	xLabel,
	yLabel,
	color,
	width = 600,
	height = 300,
}: ChartProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [mounted, setMounted] = useState(false);
	const [hovered, setHovered] = useState<{ index: number; x: number; y: number } | null>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!mounted || !canvasRef.current) return;

		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Render crisp on high-DPI displays
		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.floor(width * dpr);
		canvas.height = Math.floor(height * dpr);
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		// Clear canvas
		ctx.clearRect(0, 0, width, height);

		// Get CSS custom properties for theming
		const accentColor =
			color || getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim();
		const textColor = getComputedStyle(document.documentElement)
			.getPropertyValue("--color-global-text")
			.trim();

		// Chart dimensions
		const padding = { top: 50, right: 30, bottom: 60, left: 60 };
		const chartWidth = width - padding.left - padding.right;
		const chartHeight = height - padding.top - padding.bottom;

		// Find min/max values
		const yValues = data.map((d) => d.y);
		const minY = Math.min(...yValues, 0);
		const maxY = Math.max(...yValues);
		const yRange = maxY - minY || 1;
		const yPadding = yRange * 0.1;

		const hasFractionalY = yValues.some((v) => Math.abs(v - Math.round(v)) > 1e-6);
		const yTickDecimals = hasFractionalY ? 1 : 0;

		// Helper functions
		const getXPoint = (index: number) =>
			padding.left + (index / (data.length - 1 || 1)) * chartWidth;
		const xStep = chartWidth / Math.max(1, data.length);
		const getXBandCenter = (index: number) => padding.left + index * xStep + xStep / 2;
		const getXForLabels = (index: number) =>
			type === "bar" ? getXBandCenter(index) : getXPoint(index);
		const getY = (value: number) =>
			padding.top +
			chartHeight -
			((value - (minY - yPadding)) / (yRange + yPadding * 2)) * chartHeight;

		// eslint-disable-next-line @typescript-eslint/no-shadow
		const clampLocal = (value: number, min: number, max: number) => clamp(value, min, max);
		const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
			const radius = Math.max(0, Math.min(r, w / 2, h / 2));
			ctx.beginPath();
			ctx.moveTo(x + radius, y);
			ctx.arcTo(x + w, y, x + w, y + h, radius);
			ctx.arcTo(x + w, y + h, x, y + h, radius);
			ctx.arcTo(x, y + h, x, y, radius);
			ctx.arcTo(x, y, x + w, y, radius);
			ctx.closePath();
		};

		// Draw title
		if (title) {
			ctx.fillStyle = textColor;
			ctx.font = 'bold 16px "Atkinson Hyperlegible", sans-serif';
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.fillText(title, width / 2, 15);
		}

		// Draw axes (minimal style)
		ctx.strokeStyle = `color-mix(in srgb, ${textColor} 20%, transparent)`;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(padding.left, padding.top);
		ctx.lineTo(padding.left, height - padding.bottom);
		ctx.lineTo(width - padding.right, height - padding.bottom);
		ctx.stroke();

		// Draw subtle grid lines
		ctx.strokeStyle = `color-mix(in srgb, ${textColor} 6%, transparent)`;
		ctx.lineWidth = 1;
		const gridSteps = 5;
		for (let i = 0; i <= gridSteps; i++) {
			const y = padding.top + (chartHeight / gridSteps) * i;
			ctx.beginPath();
			ctx.moveTo(padding.left, y);
			ctx.lineTo(width - padding.right, y);
			ctx.stroke();
		}

		// Y-axis labels (hierarchy: smaller, muted)
		ctx.fillStyle = `color-mix(in srgb, ${textColor} 50%, transparent)`;
		ctx.font = '11px "Atkinson Hyperlegible Mono", monospace';
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		for (let i = 0; i <= gridSteps; i++) {
			const value = minY - yPadding + ((yRange + yPadding * 2) / gridSteps) * (gridSteps - i);
			const y = padding.top + (chartHeight / gridSteps) * i;
			ctx.fillText(value.toFixed(yTickDecimals), padding.left - 10, y);
		}

		// Y-axis label
		if (yLabel) {
			ctx.save();
			ctx.fillStyle = textColor;
			ctx.font = '600 12px "Atkinson Hyperlegible", sans-serif';
			ctx.textAlign = "center";
			ctx.textBaseline = "bottom";
			ctx.translate(15, height / 2);
			ctx.rotate(-Math.PI / 2);
			ctx.fillText(yLabel, 0, 0);
			ctx.restore();
		}

		// X-axis labels (hierarchy: smaller, muted)
		ctx.fillStyle = `color-mix(in srgb, ${textColor} 50%, transparent)`;
		ctx.font = '11px "Atkinson Hyperlegible Mono", monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		const labelStep = Math.max(1, Math.floor(data.length / 8));
		data.forEach((point, index) => {
			if (index % labelStep === 0 || index === data.length - 1) {
				const label = point.label || point.x.toString();
				ctx.fillText(label, getXForLabels(index), height - padding.bottom + 10);
			}
		});

		// X-axis label
		if (xLabel) {
			ctx.fillStyle = textColor;
			ctx.font = '600 12px "Atkinson Hyperlegible", sans-serif';
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.fillText(xLabel, width / 2, height - 20);
		}

		// Draw data
		if (type === "line") {
			ctx.strokeStyle = accentColor;
			ctx.lineWidth = 2;
			ctx.beginPath();
			data.forEach((point, index) => {
				const x = getXPoint(index);
				const y = getY(point.y);
				if (index === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			});
			ctx.stroke();

			// Draw points
			ctx.fillStyle = accentColor;
			data.forEach((point, index) => {
				const x = getXPoint(index);
				const y = getY(point.y);
				ctx.beginPath();
				ctx.arc(x, y, 4, 0, Math.PI * 2);
				ctx.fill();
			});
		} else if (type === "bar") {
			const barWidth = xStep * 0.7;
			ctx.fillStyle = accentColor;
			data.forEach((point, index) => {
				const x = padding.left + index * xStep + (xStep - barWidth) / 2;
				const y = getY(point.y);
				const barHeight = height - padding.bottom - y;
				ctx.fillRect(x, y, barWidth, barHeight);
			});
		} else if (type === "scatter") {
			ctx.fillStyle = accentColor;
			data.forEach((point, index) => {
				const x = getXPoint(index);
				const y = getY(point.y);
				ctx.beginPath();
				ctx.arc(x, y, 5, 0, Math.PI * 2);
				ctx.fill();
			});
		}

		// Hover highlight + tooltip
		if (hovered && hovered.index >= 0 && hovered.index < data.length) {
			const i = hovered.index;
			const point = data[i];
			if (!point) return;
			const label = (point.label || point.x.toString()).trim();
			const valueText = hasFractionalY ? point.y.toFixed(1) : point.y.toFixed(0);
			const tooltipText = label ? `${label}: ${valueText}` : valueText;

			let hx = 0;
			let hy = 0;
			if (type === "bar") {
				const barWidth = xStep * 0.7;
				const x = padding.left + i * xStep + (xStep - barWidth) / 2;
				const y = getY(point.y);
				const barHeight = height - padding.bottom - y;

				ctx.save();
				ctx.strokeStyle = `color-mix(in srgb, ${accentColor} 75%, ${textColor} 25%)`;
				ctx.lineWidth = 2;
				ctx.strokeRect(x + 0.5, y + 0.5, barWidth - 1, Math.max(0, barHeight - 1));
				ctx.restore();

				hx = x + barWidth / 2;
				hy = y;
			} else {
				hx = getXPoint(i);
				hy = getY(point.y);

				ctx.save();
				ctx.fillStyle = accentColor;
				ctx.beginPath();
				ctx.arc(hx, hy, 6, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}

			ctx.save();
			ctx.font = '12px "Atkinson Hyperlegible Mono", monospace';
			const paddingX = 10;
			const paddingY = 7;
			const metrics = ctx.measureText(tooltipText);
			const boxW = metrics.width + paddingX * 2;
			const boxH = 12 + paddingY * 2;

			let boxX = hx + 12;
			let boxY = hy - boxH - 12;
			boxX = clampLocal(boxX, padding.left, width - padding.right - boxW);
			boxY = clampLocal(boxY, padding.top, height - padding.bottom - boxH);

			drawRoundedRect(boxX, boxY, boxW, boxH, 8);
			ctx.fillStyle = `color-mix(in srgb, ${textColor} 10%, transparent)`;
			ctx.fill();
			ctx.strokeStyle = `color-mix(in srgb, ${textColor} 25%, transparent)`;
			ctx.lineWidth = 1;
			ctx.stroke();

			ctx.fillStyle = textColor;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(tooltipText, boxX + paddingX, boxY + boxH / 2 + 0.5);
			ctx.restore();
		}
	}, [data, type, title, xLabel, yLabel, color, width, height, mounted, hovered]);

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;

		// Map mouse coords to the chart's logical coordinate system (width/height)
		const x = ((e.clientX - rect.left) / rect.width) * width;
		const y = ((e.clientY - rect.top) / rect.height) * height;

		const padding = { top: 50, right: 30, bottom: 60, left: 60 };
		const chartWidth = width - padding.left - padding.right;
		const chartHeight = height - padding.top - padding.bottom;
		const inPlotArea =
			x >= padding.left &&
			x <= padding.left + chartWidth &&
			y >= padding.top &&
			y <= padding.top + chartHeight;
		if (!inPlotArea) {
			canvas.style.cursor = "default";
			setHovered(null);
			return;
		}

		let index = 0;
		if (type === "bar") {
			const xStep = chartWidth / Math.max(1, data.length);
			index = Math.floor((x - padding.left) / xStep);
			index = clamp(index, 0, Math.max(0, data.length - 1));
		} else {
			let best = 0;
			let bestDist = Number.POSITIVE_INFINITY;
			for (let i = 0; i < data.length; i++) {
				const px = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
				const d = Math.abs(x - px);
				if (d < bestDist) {
					best = i;
					bestDist = d;
				}
			}
			index = best;
		}

		canvas.style.cursor = "pointer";
		setHovered({ index, x, y });
	};

	const handleMouseLeave = () => {
		const canvas = canvasRef.current;
		if (canvas) canvas.style.cursor = "default";
		setHovered(null);
	};

	if (!mounted) {
		return (
			<div
				style={{
					width: `${width}px`,
					height: `${height}px`,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					border: "1px solid color-mix(in srgb, var(--color-global-text) 15%, transparent)",
					borderRadius: "6px",
					margin: "1rem 0",
					background: "transparent",
				}}
			>
				<span
					style={{
						color: "color-mix(in srgb, var(--color-global-text) 50%, transparent)",
						fontFamily: '"Atkinson Hyperlegible Mono", monospace',
						fontSize: "0.875rem",
					}}
				>
					Loading chart...
				</span>
			</div>
		);
	}

	return (
		<div
			style={{
				display: "inline-block",
				margin: "1.5rem 0",
				padding: "1rem",
				border: "1px solid color-mix(in srgb, var(--color-global-text) 15%, transparent)",
				borderRadius: "6px",
				background: "transparent",
			}}
		>
			<canvas
				ref={canvasRef}
				width={width}
				height={height}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				style={{
					display: "block",
					maxWidth: "100%",
					height: "auto",
				}}
			/>
		</div>
	);
}
