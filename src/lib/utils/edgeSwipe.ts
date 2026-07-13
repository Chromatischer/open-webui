export interface EdgeSwipeConfig {
	/** Which screen edge the drawer is anchored to. */
	edge: 'left' | 'right';
	/** Whether the gesture is currently active (e.g. only on mobile). */
	enabled: () => boolean;
	/** Current open state of the drawer. */
	isOpen: () => boolean;
	/** Open (true) or close (false) the drawer. */
	setOpen: (open: boolean) => void;
	/** How close to the edge (px) the gesture must start to count. */
	edgeThreshold?: number;
	/** Minimum swipe distance, expressed as screenWidth / distanceDivisor. */
	distanceDivisor?: number;
}

/**
 * Shared edge-swipe logic for the left sidebar and right scratchboard drawers.
 *
 * Opening is an edge gesture: it must start within `edgeThreshold` of the
 * anchored edge and travel *away* from it. Closing is more forgiving — once the
 * drawer is open, a swipe back *toward* the anchored edge from anywhere on
 * screen closes it (you grab the revealed drawer, not just its rim).
 *
 * Each gesture is still evaluated against both edges; callers gate `enabled` so
 * the two drawers never fight (e.g. the scratchboard's open gesture is disabled
 * while the sidebar is open), and the open/close split keeps a close swipe from
 * doubling as the opposite drawer's open swipe.
 */
export function handleEdgeSwipe(config: EdgeSwipeConfig, start: Touch, end: Touch): void {
	if (!config.enabled()) return;

	const edgeThreshold = config.edgeThreshold ?? 40;
	const distanceDivisor = config.distanceDivisor ?? 8;

	const screenWidth = window.innerWidth;
	const swipeDistance = Math.abs(end.screenX - start.screenX);
	if (swipeDistance < screenWidth / distanceDivisor) return;

	const movedRight = end.screenX > start.screenX;
	const open = config.isOpen();

	if (config.edge === 'left') {
		if (open) {
			// Closing: swipe back toward the left edge, from anywhere.
			if (!movedRight) config.setOpen(false);
		} else {
			// Opening: start near the left edge and travel right.
			if (start.clientX > edgeThreshold) return;
			if (movedRight) config.setOpen(true);
		}
	} else {
		if (open) {
			// Closing: swipe back toward the right edge, from anywhere.
			if (movedRight) config.setOpen(false);
		} else {
			// Opening: start near the right edge and travel left.
			if (start.clientX < screenWidth - edgeThreshold) return;
			if (!movedRight) config.setOpen(true);
		}
	}
}
