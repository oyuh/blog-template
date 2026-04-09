import { useEffect, useRef } from "react";

export default function ScrollProgressBar() {
	const progressRef = useRef<HTMLDivElement>(null);
	const currentProgress = useRef(0);
	const targetProgress = useRef(0);
	const rafId = useRef<number | null>(null);
	const isAnimating = useRef(false);

	useEffect(() => {
		const lerp = (start: number, end: number, factor: number) => {
			return start + (end - start) * factor;
		};

		const animate = () => {
			if (!progressRef.current) {
				isAnimating.current = false;
				return;
			}

			currentProgress.current = lerp(currentProgress.current, targetProgress.current, 0.25);

			// Stop animating when close enough to target (within 0.1%)
			if (Math.abs(currentProgress.current - targetProgress.current) < 0.1) {
				currentProgress.current = targetProgress.current;
				progressRef.current.style.transform = `scaleY(${currentProgress.current / 100})`;
				isAnimating.current = false;
				rafId.current = null;
				return;
			}

			progressRef.current.style.transform = `scaleY(${currentProgress.current / 100})`;
			rafId.current = requestAnimationFrame(animate);
		};

		const startAnimating = () => {
			if (!isAnimating.current) {
				isAnimating.current = true;
				rafId.current = requestAnimationFrame(animate);
			}
		};

		const updateTarget = () => {
			const windowHeight = window.innerHeight;
			const documentHeight = document.documentElement.scrollHeight;
			const scrollTop = window.scrollY;

			const scrollableHeight = documentHeight - windowHeight;
			const progress = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;
			targetProgress.current = Math.min(100, Math.max(0, progress));
			startAnimating();
		};

		// Initial calculation
		updateTarget();
		currentProgress.current = targetProgress.current;
		if (progressRef.current) {
			progressRef.current.style.transform = `scaleY(${currentProgress.current / 100})`;
		}

		window.addEventListener("scroll", updateTarget, { passive: true });
		window.addEventListener("resize", updateTarget, { passive: true });

		return () => {
			if (rafId.current) {
				cancelAnimationFrame(rafId.current);
			}
			window.removeEventListener("scroll", updateTarget);
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
