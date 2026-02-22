import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TextPressureProps = {
	text?: string;
	fontFamily?: string;
	fontUrl?: string;
	width?: boolean;
	weight?: boolean;
	italic?: boolean;
	alpha?: boolean;
	flex?: boolean;
	stroke?: boolean;
	scale?: boolean;
	textColor?: string;
	strokeColor?: string;
	strokeWidth?: number;
	className?: string;
	minFontSize?: number;
};

const distanceBetween = (a: { x: number; y: number }, b: { x: number; y: number }) => {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	return Math.sqrt(dx * dx + dy * dy);
};

const mapDistance = (distance: number, maxDistance: number, minValue: number, maxValue: number) => {
	const value = maxValue - Math.abs((maxValue * distance) / maxDistance);
	return Math.max(minValue, value + minValue);
};

const debounce = (fn: () => void, delayMs: number) => {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	return () => {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(), delayMs);
	};
};

export default function TextPressure({
	text = "Howdy",
	fontFamily = "Compressa VF",
	fontUrl = "https://res.cloudinary.com/dr6lvwubh/raw/upload/v1529908256/CompressaPRO-GX.woff2",
	width = true,
	weight = true,
	italic = true,
	alpha = false,
	flex = true,
	stroke = false,
	scale = false,
	textColor = "rgba(87, 130, 255, 0.22)",
	strokeColor = "rgba(87, 130, 255, 0.35)",
	strokeWidth = 1.5,
	className = "",
	minFontSize = 24,
}: TextPressureProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const titleRef = useRef<HTMLHeadingElement | null>(null);
	const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);

	const mouseRef = useRef({ x: 0, y: 0 });
	const cursorRef = useRef({ x: 0, y: 0 });

	const [fontSize, setFontSize] = useState(minFontSize);
	const [scaleY, setScaleY] = useState(1);
	const [lineHeight, setLineHeight] = useState(1);

	const chars = text.split("");

	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			cursorRef.current.x = event.clientX;
			cursorRef.current.y = event.clientY;
		};

		const handleTouchMove = (event: TouchEvent) => {
			const touch = event.touches[0];
			if (!touch) return;
			cursorRef.current.x = touch.clientX;
			cursorRef.current.y = touch.clientY;
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("touchmove", handleTouchMove, { passive: true });

		if (containerRef.current) {
			const {
				left,
				top,
				width: containerWidth,
				height: containerHeight,
			} = containerRef.current.getBoundingClientRect();
			mouseRef.current.x = left + containerWidth / 2;
			mouseRef.current.y = top + containerHeight / 2;
			cursorRef.current.x = mouseRef.current.x;
			cursorRef.current.y = mouseRef.current.y;
		}

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("touchmove", handleTouchMove);
		};
	}, []);

	const setSize = useCallback(() => {
		if (!containerRef.current || !titleRef.current) return;
		const { width: containerWidth, height: containerHeight } =
			containerRef.current.getBoundingClientRect();

		let nextFontSize = containerWidth / (chars.length / 2);
		nextFontSize = Math.max(nextFontSize, minFontSize);

		setFontSize(nextFontSize);
		setScaleY(1);
		setLineHeight(1);

		requestAnimationFrame(() => {
			if (!titleRef.current) return;
			const textRect = titleRef.current.getBoundingClientRect();
			if (scale && textRect.height > 0) {
				const ratioY = containerHeight / textRect.height;
				setScaleY(ratioY);
				setLineHeight(ratioY);
			}
		});
	}, [chars.length, minFontSize, scale]);

	useEffect(() => {
		const debounced = debounce(setSize, 100);
		debounced();
		window.addEventListener("resize", debounced);
		return () => window.removeEventListener("resize", debounced);
	}, [setSize]);

	useEffect(() => {
		let rafId = 0;

		const animate = () => {
			mouseRef.current.x += (cursorRef.current.x - mouseRef.current.x) / 15;
			mouseRef.current.y += (cursorRef.current.y - mouseRef.current.y) / 15;

			if (titleRef.current) {
				const titleRect = titleRef.current.getBoundingClientRect();
				const maxDistance = titleRect.width / 2;

				spanRefs.current.forEach((span) => {
					if (!span) return;
					const rect = span.getBoundingClientRect();
					const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
					const d = distanceBetween(mouseRef.current, center);

					const wdth = width ? Math.floor(mapDistance(d, maxDistance, 5, 200)) : 100;
					const wght = weight ? Math.floor(mapDistance(d, maxDistance, 100, 900)) : 400;
					const italVal = italic ? mapDistance(d, maxDistance, 0, 1).toFixed(2) : "0";
					const alphaVal = alpha ? mapDistance(d, maxDistance, 0, 1).toFixed(2) : "1";

					const variation = `'wght' ${wght}, 'wdth' ${wdth}, 'ital' ${italVal}`;
					if (span.style.fontVariationSettings !== variation) {
						span.style.fontVariationSettings = variation;
					}
					if (alpha && span.style.opacity !== alphaVal) {
						span.style.opacity = alphaVal;
					}
				});
			}

			rafId = window.requestAnimationFrame(animate);
		};

		animate();
		return () => window.cancelAnimationFrame(rafId);
	}, [width, weight, italic, alpha]);

	const styleTag = useMemo(
		() => (
			<style>{`
				@font-face {
					font-family: '${fontFamily}';
					src: url('${fontUrl}');
					font-style: normal;
				}
				.lh-text-pressure-stroke span {
					position: relative;
					color: ${textColor};
				}
				.lh-text-pressure-stroke span::after {
					content: attr(data-char);
					position: absolute;
					left: 0;
					top: 0;
					color: transparent;
					z-index: -1;
					-webkit-text-stroke-width: ${strokeWidth}px;
					-webkit-text-stroke-color: ${strokeColor};
				}
			`}</style>
		),
		[fontFamily, fontUrl, textColor, strokeColor, strokeWidth],
	);

	const dynamicClassName = [
		"lh-text-pressure-title",
		className,
		flex ? "flex justify-between" : "",
		stroke ? "lh-text-pressure-stroke" : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div ref={containerRef} className="relative h-full w-full overflow-visible bg-transparent">
			{styleTag}
			<h1
				ref={titleRef}
				className={dynamicClassName}
				style={{
					fontFamily: `'${fontFamily}', 'Atkinson Hyperlegible', system-ui, sans-serif`,
					textTransform: "uppercase",
					fontSize,
					lineHeight,
					transform: `scale(1, ${scaleY})`,
					transformOrigin: "center top",
					margin: 0,
					textAlign: "center",
					userSelect: "none",
					whiteSpace: "nowrap",
					fontWeight: 700,
					width: "100%",
					color: stroke ? undefined : textColor,
				}}
			>
				{chars.map((char, index) => (
					<span
						key={`${char}-${index}`}
						ref={(el) => {
							spanRefs.current[index] = el;
						}}
						data-char={char}
						className="inline-block"
					>
						{char}
					</span>
				))}
			</h1>
		</div>
	);
}
