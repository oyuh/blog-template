import { useEffect, useRef, useState } from "react";

type ResumeDownloadProps = {
	pdfUrl?: string;
};

export default function ResumeDownload({
	pdfUrl = "/Lawson_Hart_Resume.pdf",
}: ResumeDownloadProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isPdfAvailable, setIsPdfAvailable] = useState<boolean | null>(null);
	const closeBtnRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		document.body.style.overflow = "hidden";
		closeBtnRef.current?.focus();

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;

		let cancelled = false;
		setIsPdfAvailable(null);

		(async () => {
			try {
				const response = await fetch(pdfUrl, { method: "HEAD" });
				if (!cancelled) setIsPdfAvailable(response.ok);
			} catch {
				if (!cancelled) setIsPdfAvailable(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [isOpen, pdfUrl]);

	const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
		if (event.target === event.currentTarget) {
			setIsOpen(false);
		}
	};

	const handleBackdropKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			setIsOpen(false);
		}
	};

	return (
		<>
			<span className="inline-flex items-center gap-1 align-baseline">
				<button
					type="button"
					onClick={() => setIsOpen(true)}
					className="lawson-link inline-flex items-center gap-1 text-[15px] font-normal underline decoration-dotted underline-offset-4 hover:decoration-solid transition-all"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					View/download my resume
				</button>
			</span>

			{isOpen && (
				<div
					className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
					onClick={handleBackdropClick}
					onKeyDown={handleBackdropKeyDown}
					tabIndex={-1}
					role="presentation"
				>
					<dialog
						open
						aria-labelledby="resume-modal-title"
						aria-modal="true"
						className="relative w-full max-w-4xl rounded-2xl bg-global-bg p-4 shadow-2xl ring-1 ring-white/10"
					>
						<div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
							<div>
								<p id="resume-modal-title" className="text-lg font-semibold text-accent-2">
									Resume preview
								</p>
								<p className="text-sm text-global-text/70">
									Download or open the PDF directly from here.
								</p>
							</div>
							<div className="flex items-center gap-2">
								{isPdfAvailable !== false && (
									<a
										href={pdfUrl}
										download
										className="inline-flex items-center gap-2 rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent hover:text-white"
									>
										<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V4"
											/>
										</svg>
										Download PDF
									</a>
								)}
								<button
									type="button"
									onClick={() => setIsOpen(false)}
									ref={closeBtnRef}
									className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-sm text-global-text transition hover:bg-white/5"
								>
									Close
								</button>
							</div>
						</div>
						{isPdfAvailable === false ? (
							<p className="mt-4 text-sm text-global-text/80">
								Resume PDF not found at <span className="font-mono">{pdfUrl}</span>. Add a PDF at
								that path (or pass a different <span className="font-mono">pdfUrl</span> prop) to
								enable preview/download.
							</p>
						) : (
							<>
								<div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/5">
									<iframe title="Resume preview" src={pdfUrl} className="h-[70vh] w-full" />
								</div>
								<p className="mt-3 text-xs text-global-text/60">
									Having trouble viewing the PDF?{" "}
									<a className="underline" href={pdfUrl} target="_blank" rel="noreferrer">
										Open it in a new tab.
									</a>
								</p>
							</>
						)}
					</dialog>
				</div>
			)}
		</>
	);
}
