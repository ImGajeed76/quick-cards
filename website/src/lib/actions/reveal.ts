// Fade + gently-overshoot-translate on the first viewport entry.
// Fires once, then disconnects. Respects prefers-reduced-motion via the
// global override in layout.css — in that case the transitions collapse
// to 0ms and the element still ends up in its visible state.

type Options = {
	delay?: number;
	distance?: number;
	duration?: number;
};

export function reveal(node: HTMLElement, options: Options = {}) {
	const { delay = 0, distance = 12, duration = 400 } = options;

	node.style.opacity = '0';
	node.style.transform = `translateY(${distance}px)`;
	node.style.transition = [
		`opacity ${duration}ms ease-out ${delay}ms`,
		`transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`
	].join(', ');
	node.style.willChange = 'opacity, transform';

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				requestAnimationFrame(() => {
					node.style.opacity = '1';
					node.style.transform = 'translateY(0)';
				});
				setTimeout(() => {
					node.style.willChange = '';
				}, duration + delay + 50);
				observer.disconnect();
			}
		},
		{ threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
