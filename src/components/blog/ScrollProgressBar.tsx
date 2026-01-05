import { useEffect, useRef } from "react";

export default function ScrollProgressBar() {
	const progressRef = useRef<HTMLDivElement>(null);
	const currentProgress = useRef(0);
	const targetProgress = useRef(0);
	const rafId = useRef<number | null>(null);

	useEffect(() => {
		const lerp = (start: number, end: number, factor: number) => {
			return start + (end - start) * factor;
		};

		const animate = () => {
			if (!progressRef.current) return;

			// Smooth interpolation with consistent factor for both directions
			currentProgress.current = lerp(currentProgress.current, targetProgress.current, 0.25);

			// Update DOM - use transform for better performance
			progressRef.current.style.transform = `scaleY(${currentProgress.current / 100})`;

			// Continue animation loop
			rafId.current = requestAnimationFrame(animate);
		};

		const updateTarget = () => {
			const windowHeight = window.innerHeight;
			const documentHeight = document.documentElement.scrollHeight;
			const scrollTop = window.scrollY;

			// Calculate progress as percentage
			const scrollableHeight = documentHeight - windowHeight;
			const progress = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;
			targetProgress.current = Math.min(100, Math.max(0, progress));
		};

		const handleScroll = () => {
			updateTarget();
		};

		// Initial calculation
		updateTarget();
		currentProgress.current = targetProgress.current;

		// Start animation loop
		rafId.current = requestAnimationFrame(animate);

		// Update on scroll
		window.addEventListener("scroll", handleScroll, { passive: true });
		window.addEventListener("resize", updateTarget, { passive: true });

		return () => {
			if (rafId.current) {
				cancelAnimationFrame(rafId.current);
			}
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", updateTarget);
		};
	}, []);

	return (
		<div
			ref={progressRef}
			className="fixed right-0 top-0 z-50 w-1 h-full bg-accent pointer-events-none origin-top"
			aria-hidden="true"
			style={{ transform: "scaleY(0)", willChange: "transform" }}
		/>
	);
}
