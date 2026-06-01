// Size the hero so the role line ("I'm a … software engineer.") fills the body
// width on one line, then scale the "Howdy!" heading to stay proportionally
// larger. The role line is the headline statement, so it drives the type scale.

const REF_PX = 100; // measure at a big size so rounding barely matters
const MIN_ROLE_PX = 18; // below this we let the line wrap instead (phones)
const MAX_ROLE_PX = 44; // keep it from getting silly on wide layouts
const HOWDY_FACTOR = 1.6; // "Howdy!" is this much larger than the role line

function fitHero() {
	const role = document.querySelector<HTMLElement>("[data-hero-role]");
	if (!role) return;
	const howdy = document.querySelector<HTMLElement>("[data-hero-howdy]");

	const cs = window.getComputedStyle(role);
	const padL = Number.parseFloat(cs.paddingLeft) || 0;
	const padR = Number.parseFloat(cs.paddingRight) || 0;
	const avail = role.clientWidth - padL - padR;
	if (avail <= 0) return;

	// Measure the whole sentence (bold span included) at the reference size.
	// A clone keeps the real markup, so mixed font weights measure correctly.
	const clone = role.cloneNode(true) as HTMLElement;
	clone.removeAttribute("data-hero-role");
	clone.style.position = "absolute";
	clone.style.left = "-99999px";
	clone.style.top = "0";
	clone.style.visibility = "hidden";
	clone.style.whiteSpace = "nowrap";
	clone.style.width = "auto";
	clone.style.maxWidth = "none";
	clone.style.margin = "0";
	clone.style.fontSize = `${REF_PX}px`;
	document.body.appendChild(clone);
	const wRef = clone.getBoundingClientRect().width;
	clone.remove();
	if (wRef <= 0) return;

	const ideal = (REF_PX * avail) / wRef;

	// Too wide to sit on one readable line (phones): wrap at the CSS size.
	if (ideal < MIN_ROLE_PX) {
		role.classList.remove("hero-fit");
		role.style.fontSize = "";
		if (howdy) howdy.style.fontSize = "";
		return;
	}

	role.classList.add("hero-fit");
	const roleFont = Math.min(MAX_ROLE_PX, ideal);
	role.style.fontSize = `${roleFont}px`;
	if (howdy) howdy.style.fontSize = `${roleFont * HOWDY_FACTOR}px`;
}

let rafId = 0;
function schedule() {
	window.cancelAnimationFrame(rafId);
	rafId = window.requestAnimationFrame(fitHero);
}

// Refit on viewport changes (wired once for the lifetime of the page).
window.addEventListener("resize", schedule);

// Re-run after Astro view transitions land on a new page.
document.addEventListener("astro:page-load", () => {
	fitHero();
	schedule();
	document.fonts?.ready.then(fitHero).catch(() => {});
});

// Initial run + a settle pass once layout and web fonts are ready.
fitHero();
schedule();
document.fonts?.ready.then(fitHero).catch(() => {});
