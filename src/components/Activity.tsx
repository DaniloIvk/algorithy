import type { Child, PropsWithChildren } from 'hono/jsx';

type ActivityProps = PropsWithChildren<{
	readonly when: boolean;
	readonly fallback?: Child;
}>;

function Activity({ when, children, fallback = null }: ActivityProps) {
	return <>{when ? children : fallback}</>;
}

export default Activity;
