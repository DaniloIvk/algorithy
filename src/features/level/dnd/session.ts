import {
	getZoneLength,
	insertAt,
	isMovableAt,
	moveWithinZone,
	removeAt,
} from '../../../domain/sequence-tree';
import { generateId } from '../../../lib/id';
import type { SequenceItem } from '../../../schemas/sequence.schema';
import { DND_CONFIG } from './config';
import { findDropTarget } from './targets';
import type { ActiveDrag, DraggableDescriptor, DropTarget } from './types';

type SetSequence = (
	action: SequenceItem[] | ((previous: SequenceItem[]) => SequenceItem[]),
) => void;

type ActiveZoneSetter = (zoneId: string | null) => void;
type ActiveDragSetter = (drag: ActiveDrag | null) => void;
type ActiveIndexSetter = (index: number | null) => void;
type CommitSetter = (kind: 'place' | 'remove') => void;

type Session = {
	readonly pointerId: number;
	readonly descriptor: DraggableDescriptor;
	readonly sourceElement: HTMLElement;
	readonly startX: number;
	readonly startY: number;
	readonly grabX: number;
	readonly grabY: number;
	readonly slop: number;
	active: boolean;
	ghost: HTMLElement | null;
	holdTimer: number | null;
	lastClientX: number;
	lastClientY: number;
	scrollFrame: number | null;
};

const INTERACTIVE_SELECTOR = 'input, select, textarea, button, a, [contenteditable="true"]';

function createItemFromDescriptor(descriptor: DraggableDescriptor): SequenceItem {
	const base: SequenceItem = {
		kind: 'algorithm',
		id: generateId(),
		action: descriptor.action,
		label: descriptor.label,
		default: false,
		movable: true,
	};

	if (descriptor.action === 'for' || descriptor.action === 'while') {
		return { ...base, children: [] };
	}

	if (descriptor.action === 'if') {
		return {
			...base,
			condition: descriptor.condition ?? 'path-ahead',
			children: [],
			elseChildren: [],
		};
	}

	if (descriptor.action === 'switch') {
		return { ...base, branches: [{ condition: 'path-left', children: [] }] };
	}

	return base;
}

function createDragController(
	setSequence: SetSequence,
	onActiveZoneChange: ActiveZoneSetter,
	onDraggingChange: ActiveDragSetter,
	onActiveIndexChange: ActiveIndexSetter,
	onCommit: CommitSetter,
) {
	let session: Session | null = null;
	let highlightedZoneId: string | null = null;

	function canDelete(descriptor: DraggableDescriptor): boolean {
		return descriptor.from !== undefined && descriptor.default !== true;
	}

	function resolveDrop(descriptor: DraggableDescriptor, target: DropTarget): void {
		setSequence((previous) => {
			if (target.kind === 'delete') {
				if (descriptor.from === undefined) {
					return previous;
				}
				return removeAt(previous, descriptor.zoneId ?? 'root', descriptor.from).sequence;
			}

			const { zoneId } = target;

			if (descriptor.from === undefined) {
				const index = target.index ?? getZoneLength(previous, zoneId);
				return insertAt(previous, zoneId, index, createItemFromDescriptor(descriptor));
			}

			const sourceId = descriptor.zoneId ?? 'root';
			if (isMovableAt(previous, sourceId, descriptor.from) !== true) {
				return previous;
			}

			if (sourceId === zoneId) {
				const collapsed = target.index ?? getZoneLength(previous, zoneId) - 1;
				const index = descriptor.from < collapsed ? collapsed + 1 : collapsed;
				return moveWithinZone(previous, zoneId, descriptor.from, index);
			}

			const { sequence: without, removed } = removeAt(previous, sourceId, descriptor.from);
			if (removed === undefined) {
				return previous;
			}
			const index = target.index ?? getZoneLength(without, zoneId);
			return insertAt(without, zoneId, index, removed);
		});
	}

	function makeGhost(sourceElement: HTMLElement, rect: DOMRect): HTMLElement {
		const ghost = sourceElement.cloneNode(true) as HTMLElement;
		for (const element of ghost.querySelectorAll('[id]')) {
			element.removeAttribute('id');
		}
		ghost.removeAttribute('id');
		ghost.style.position = 'fixed';
		ghost.style.left = '0';
		ghost.style.top = '0';
		ghost.style.width = `${rect.width}px`;
		ghost.style.height = `${rect.height}px`;
		ghost.style.margin = '0';
		ghost.style.pointerEvents = 'none';
		ghost.style.zIndex = String(DND_CONFIG.ghostZIndex);
		ghost.style.opacity = '0.9';
		ghost.setAttribute('data-drag-ghost', 'true');
		document.body.append(ghost);
		return ghost;
	}

	function moveGhost(clientX: number, clientY: number): void {
		if (session === null || session.ghost === null) {
			return;
		}
		const { ghost, grabX, grabY } = session;
		ghost.style.transform = `translate3d(${clientX - grabX}px, ${clientY - grabY}px, 0)`;
	}

	function setDeleteHighlight(active: boolean): void {
		const element = document.querySelector('[data-drop-delete]');
		if (!(element instanceof HTMLElement)) {
			return;
		}
		if (active) {
			element.setAttribute('data-drag-over', 'true');
		} else {
			element.removeAttribute('data-drag-over');
		}
	}

	function applyDropHighlight(target: DropTarget | null): void {
		const zoneId = target?.kind === 'zone' ? target.zoneId : null;
		if (zoneId !== highlightedZoneId) {
			highlightedZoneId = zoneId;
			onActiveZoneChange(zoneId);
		}
		onActiveIndexChange(target?.kind === 'zone' ? target.index : null);
		setDeleteHighlight(target?.kind === 'delete');
	}

	function stopAutoscroll(frame: number | null): void {
		if (frame !== null) {
			window.cancelAnimationFrame(frame);
		}
	}

	function autoscrollStep(): void {
		if (session === null || !session.active) {
			return;
		}
		const { lastClientX, lastClientY } = session;
		const margin = DND_CONFIG.autoscrollEdgePx;
		const speed = DND_CONFIG.autoscrollSpeedPx;
		let delta = 0;
		if (lastClientY < margin) {
			delta = -Math.ceil(((margin - lastClientY) / margin) * speed);
		} else if (lastClientY > window.innerHeight - margin) {
			delta = Math.ceil(((lastClientY - (window.innerHeight - margin)) / margin) * speed);
		}
		if (delta === 0) {
			session.scrollFrame = null;
			return;
		}
		window.scrollBy(0, delta);
		applyDropHighlight(
			findDropTarget(
				lastClientX,
				lastClientY,
				canDelete(session.descriptor),
				session.descriptor.id,
			),
		);
		session.scrollFrame = window.requestAnimationFrame(autoscrollStep);
	}

	function updateTarget(clientX: number, clientY: number): void {
		if (session === null) {
			return;
		}
		session.lastClientX = clientX;
		session.lastClientY = clientY;
		applyDropHighlight(
			findDropTarget(clientX, clientY, canDelete(session.descriptor), session.descriptor.id),
		);

		const margin = DND_CONFIG.autoscrollEdgePx;
		const nearEdge = clientY < margin || clientY > window.innerHeight - margin;
		if (!nearEdge) {
			stopAutoscroll(session.scrollFrame);
			session.scrollFrame = null;
			return;
		}
		if (session.scrollFrame === null) {
			session.scrollFrame = window.requestAnimationFrame(autoscrollStep);
		}
	}

	function activate(): void {
		if (session === null || session.active) {
			return;
		}
		session.active = true;
		if (session.holdTimer !== null) {
			window.clearTimeout(session.holdTimer);
			session.holdTimer = null;
		}
		const sourceRect = session.sourceElement.getBoundingClientRect();
		session.ghost = makeGhost(session.sourceElement, sourceRect);
		moveGhost(session.startX, session.startY);
		onDraggingChange({
			id: session.descriptor.id ?? null,
			action: session.descriptor.action,
			width: sourceRect.width,
			height: sourceRect.height,
		});
		document.body.setAttribute('data-dragging', 'true');
		if (canDelete(session.descriptor)) {
			document.body.setAttribute('data-deletable-drag', 'true');
		} else if (session.descriptor.from === undefined) {
			document.body.setAttribute('data-palette-drag', 'true');
		}
	}

	function cleanup(): void {
		if (session === null) {
			return;
		}
		const current = session;
		session = null;
		if (current.holdTimer !== null) {
			window.clearTimeout(current.holdTimer);
		}
		stopAutoscroll(current.scrollFrame);
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
		window.removeEventListener('pointercancel', onPointerCancel);
		window.removeEventListener('keydown', onKeyDown);
		if (current.sourceElement.hasPointerCapture(current.pointerId)) {
			current.sourceElement.releasePointerCapture(current.pointerId);
		}
		current.ghost?.remove();
		setDeleteHighlight(false);
		document.body.removeAttribute('data-dragging');
		document.body.removeAttribute('data-deletable-drag');
		document.body.removeAttribute('data-palette-drag');
		highlightedZoneId = null;
		onActiveZoneChange(null);
		onActiveIndexChange(null);
		onDraggingChange(null);
	}

	function onPointerMove(event: PointerEvent): void {
		if (session === null || event.pointerId !== session.pointerId) {
			return;
		}
		if (!session.active) {
			const dx = event.clientX - session.startX;
			const dy = event.clientY - session.startY;
			if (Math.hypot(dx, dy) < session.slop) {
				return;
			}
			activate();
		}
		moveGhost(event.clientX, event.clientY);
		updateTarget(event.clientX, event.clientY);
		event.preventDefault();
	}

	function onPointerUp(event: PointerEvent): void {
		if (session === null || event.pointerId !== session.pointerId) {
			return;
		}
		const { descriptor, active } = session;
		const target = active
			? findDropTarget(event.clientX, event.clientY, canDelete(descriptor), descriptor.id)
			: null;
		cleanup();
		if (target !== null) {
			resolveDrop(descriptor, target);
			onCommit(target.kind === 'delete' ? 'remove' : 'place');
		}
	}

	function onPointerCancel(event: PointerEvent): void {
		if (session === null || event.pointerId !== session.pointerId) {
			return;
		}
		cleanup();
	}

	function onKeyDown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			cleanup();
		}
	}

	function begin(event: PointerEvent, descriptor: DraggableDescriptor): void {
		if (session !== null) {
			return;
		}
		if (event.pointerType === 'mouse' && event.button !== 0) {
			return;
		}

		const eventTarget = event.target;
		if (eventTarget instanceof Element && eventTarget.closest(INTERACTIVE_SELECTOR)) {
			return;
		}

		const sourceElement = event.currentTarget;
		if (!(sourceElement instanceof HTMLElement)) {
			return;
		}

		event.stopPropagation();
		event.preventDefault();

		document.body.removeAttribute('data-deletable-drag');
		document.body.removeAttribute('data-palette-drag');

		const rect = sourceElement.getBoundingClientRect();
		const isMouse = event.pointerType === 'mouse';

		session = {
			pointerId: event.pointerId,
			descriptor,
			sourceElement,
			startX: event.clientX,
			startY: event.clientY,
			grabX: event.clientX - rect.left,
			grabY: event.clientY - rect.top,
			slop: isMouse ? DND_CONFIG.mouseSlopPx : DND_CONFIG.slopPx,
			active: false,
			ghost: null,
			holdTimer: null,
			lastClientX: event.clientX,
			lastClientY: event.clientY,
			scrollFrame: null,
		};

		try {
			sourceElement.setPointerCapture(event.pointerId);
		} catch {
			// Pointer capture can fail if the element left the DOM; window
			// listeners below still keep the session working.
		}

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('pointercancel', onPointerCancel);
		window.addEventListener('keydown', onKeyDown);

		if (!isMouse) {
			session.holdTimer = window.setTimeout(activate, DND_CONFIG.holdMs);
		}
	}

	return { begin };
}

export { createDragController };
