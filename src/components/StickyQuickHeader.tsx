const quickLinks = [
	{ href: "/", label: "Home" },
	{ href: "/about", label: "About" },
	{ href: "/posts", label: "Posts & Projects" },
	{ href: "/notes", label: "Notes" },
	// Add more links as needed
];

export default function StickyQuickHeader() {
	return (
		<header
			className="hidden md:flex fixed top-0 left-0 w-full z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 h-10 items-center px-6"
			style={{ fontSize: "0.9rem" }}
		>
			{/* Logo SVG */}
			<a href="/" className="flex items-center mr-4" aria-label="Home">
				{/* Replace with your actual SVG */}
				<svg width="24" height="24" fill="none" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="10" fill="#0ea5e9" />
				</svg>
			</a>
			{/* Quick Links */}
			<nav className="flex gap-4">
				{quickLinks.map((link) => (
					<a
						key={link.href}
						href={link.href}
						className="text-neutral-700 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
						style={{ fontWeight: 500 }}
					>
						{link.label}
					</a>
				))}
			</nav>
		</header>
	);
}
