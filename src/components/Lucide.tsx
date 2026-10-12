import { useEffect, useRef } from 'hono/jsx';
import { createElement, type IconNode } from 'lucide';

type LucideProps = {
	readonly icon: IconNode;
	readonly class: string;
};

function Lucide({ icon, class: className }: LucideProps) {
	const ref = useRef<HTMLSpanElement | null>(null);

	useEffect(() => {
		const host = ref.current;

		if (!host) {
			return;
		}

		host.replaceChildren(createElement(icon, { class: className }));
	}, [icon, className]);

	return <span ref={ref} class={className} aria-hidden='true' />;
}

export default Lucide;
