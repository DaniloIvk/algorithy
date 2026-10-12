import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'hono/jsx';
import type { Child } from 'hono/jsx';
import { generateId } from './id';

type ToastVariant = 'info' | 'success' | 'error' | 'warning';

type ToastRecord = {
	readonly id: string;
	readonly message: string;
	readonly variant: ToastVariant;
	readonly exiting: boolean;
};

type ToastContextValue = {
	readonly toasts: readonly ToastRecord[];
	readonly addToast: (message: string, variant?: ToastVariant, duration?: number) => string;
	readonly removeToast: (toastId: string) => void;
};

const TOAST_DURATION_MS = 10_000;
const TOAST_MAX_COUNT = 5;
/** Matches the `toast-out` animation duration in `src/style.css`. */
const TOAST_EXIT_MS = 200;

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastProvider({
	children,
	onToast,
}: {
	readonly children: Child;
	readonly onToast?: () => void;
}) {
	const [toastList, setToastList] = useState<readonly ToastRecord[]>([]);
	const dismissTimers = useRef<Map<string, number>>(new Map<string, number>());
	const exitTimers = useRef<Map<string, number>>(new Map<string, number>());

	const removeToast = useCallback((toastId: string) => {
		const dismissTimer = dismissTimers.current.get(toastId);
		if (dismissTimer !== undefined) {
			window.clearTimeout(dismissTimer);
			dismissTimers.current.delete(toastId);
		}
		if (exitTimers.current.has(toastId)) {
			return;
		}
		setToastList((previousToasts) =>
			previousToasts.map((toastRecord) =>
				toastRecord.id === toastId ? { ...toastRecord, exiting: true } : toastRecord,
			),
		);
		const exitTimer = window.setTimeout(() => {
			exitTimers.current.delete(toastId);
			setToastList((previousToasts) =>
				previousToasts.filter((toastRecord) => toastRecord.id !== toastId),
			);
		}, TOAST_EXIT_MS);
		exitTimers.current.set(toastId, exitTimer);
	}, []);

	const addToast = useCallback(
		(message: string, variant: ToastVariant = 'info', duration = TOAST_DURATION_MS) => {
			onToast?.();
			const toastId = generateId();
			setToastList((previousToasts) => [
				...previousToasts,
				{ id: toastId, message, variant, exiting: false },
			]);
			const dismissTimer = window.setTimeout(() => {
				removeToast(toastId);
			}, duration);
			dismissTimers.current.set(toastId, dismissTimer);
			return toastId;
		},
		[removeToast, onToast],
	);

	useEffect(() => {
		const activeToasts = toastList.filter((toastRecord) => !toastRecord.exiting);
		if (activeToasts.length <= TOAST_MAX_COUNT) {
			return;
		}
		const overflow = activeToasts.slice(0, activeToasts.length - TOAST_MAX_COUNT);
		for (const toastRecord of overflow) {
			if (exitTimers.current.has(toastRecord.id)) {
				continue;
			}
			const exitTimer = window.setTimeout(() => {
				exitTimers.current.delete(toastRecord.id);
				setToastList((previousToasts) =>
					previousToasts.filter((candidate) => candidate.id !== toastRecord.id),
				);
			}, TOAST_EXIT_MS);
			exitTimers.current.set(toastRecord.id, exitTimer);
		}
		const exitingIds = new Set(overflow.map((toastRecord) => toastRecord.id));
		setToastList((previousToasts) =>
			previousToasts.map((toastRecord) =>
				exitingIds.has(toastRecord.id) ? { ...toastRecord, exiting: true } : toastRecord,
			),
		);
	}, [toastList]);

	useEffect(() => {
		return () => {
			for (const timeoutId of dismissTimers.current.values()) {
				window.clearTimeout(timeoutId);
			}
			for (const timeoutId of exitTimers.current.values()) {
				window.clearTimeout(timeoutId);
			}
			dismissTimers.current.clear();
			exitTimers.current.clear();
		};
	}, []);

	const contextValue = useMemo<ToastContextValue>(
		() => ({
			toasts: toastList,
			addToast,
			removeToast,
		}),
		[toastList, addToast, removeToast],
	);

	return <ToastContext.Provider value={contextValue}>{children}</ToastContext.Provider>;
}

function useToast() {
	const contextValue = useContext(ToastContext);
	if (contextValue === null) {
		throw new Error('useToast must be used within ToastProvider');
	}
	return contextValue;
}

export { ToastProvider, useToast };
export type { ToastContextValue, ToastRecord, ToastVariant };
