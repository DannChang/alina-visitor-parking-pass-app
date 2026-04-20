'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const MOBILE_SHEET_MEDIA_QUERY = '(max-width: 767px)';
const MAX_SHEET_HEIGHT_RATIO = 0.9;
const COLLAPSED_SHEET_HEIGHT_RATIO = 0.56;
const MIN_COLLAPSED_SHEET_HEIGHT = 280;
const MIN_SNAP_POINT_DISTANCE = 96;
const DRAG_DISMISS_DISTANCE = 96;
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

type DialogRootProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>;
type DialogContentElement = React.ElementRef<typeof DialogPrimitive.Content>;
type DialogContentStyle = React.CSSProperties & {
  '--dialog-sheet-height'?: string;
  '--dialog-sheet-y'?: string;
};

interface DragState {
  pointerId: number;
  startY: number;
  startHeight: number;
  minHeight: number;
  maxHeight: number;
  lastY: number;
  lastTime: number;
  velocityY: number;
  draggedBelowMinBy: number;
}

const DialogOpenChangeContext = React.createContext<((open: boolean) => void) | null>(null);

function Dialog({ onOpenChange, ...props }: DialogRootProps) {
  return (
    <DialogOpenChangeContext.Provider value={onOpenChange ?? null}>
      <DialogPrimitive.Root {...props} {...(onOpenChange ? { onOpenChange } : {})} />
    </DialogOpenChangeContext.Provider>
  );
}

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

function setForwardedRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

function getViewportHeight() {
  if (typeof window === 'undefined') {
    return 0;
  }

  return window.visualViewport?.height ?? window.innerHeight;
}

function isMobileSheetViewport() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(MOBILE_SHEET_MEDIA_QUERY).matches;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getClosestSnapPoint(value: number, snapPoints: number[]) {
  const [firstSnapPoint] = snapPoints;

  if (firstSnapPoint === undefined) {
    return value;
  }

  return snapPoints.reduce(
    (closest, snapPoint) =>
      Math.abs(snapPoint - value) < Math.abs(closest - value) ? snapPoint : closest,
    firstSnapPoint
  );
}

function getContentSnapPoints(contentHeight: number, viewportHeight: number) {
  if (!viewportHeight || !contentHeight) {
    return [];
  }

  const expandedHeight = Math.min(Math.ceil(contentHeight), Math.floor(viewportHeight * 0.9));
  const collapsedHeight = Math.min(
    Math.floor(viewportHeight * COLLAPSED_SHEET_HEIGHT_RATIO),
    expandedHeight - MIN_SNAP_POINT_DISTANCE
  );

  if (collapsedHeight >= MIN_COLLAPSED_SHEET_HEIGHT) {
    return [collapsedHeight, expandedHeight];
  }

  return [expandedHeight];
}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  DialogContentElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showHandle?: boolean;
  }
>(({ className, children, showHandle = true, style, ...props }, ref) => {
  const onOpenChange = React.useContext(DialogOpenChangeContext);
  const contentRef = React.useRef<DialogContentElement | null>(null);
  const snapPointsRef = React.useRef<number[]>([]);
  const sheetHeightRef = React.useRef<number | null>(null);
  const dragStateRef = React.useRef<DragState | null>(null);
  const isDraggingRef = React.useRef(false);
  const [sheetHeight, setSheetHeight] = React.useState<number | null>(null);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const setMeasuredHeight = React.useCallback((height: number | null) => {
    sheetHeightRef.current = height;
    setSheetHeight(height);
  }, []);

  const measureContentElement = React.useCallback(
    (content: DialogContentElement | null) => {
      if (!content || !isMobileSheetViewport()) {
        snapPointsRef.current = [];
        setMeasuredHeight(null);
        setDragOffset(0);
        return;
      }

      if (isDraggingRef.current) {
        return;
      }

      const viewportHeight = getViewportHeight();
      const maxHeight = Math.floor(viewportHeight * MAX_SHEET_HEIGHT_RATIO);
      const snapPoints = getContentSnapPoints(content.scrollHeight, viewportHeight);

      if (snapPoints.length === 0) {
        setMeasuredHeight(null);
        return;
      }

      const minSnapPoint = snapPoints[0];
      const maxSnapPoint = snapPoints[snapPoints.length - 1];

      if (minSnapPoint === undefined || maxSnapPoint === undefined) {
        setMeasuredHeight(null);
        return;
      }

      snapPointsRef.current = snapPoints;

      const currentHeight = sheetHeightRef.current;
      const nextHeight = currentHeight
        ? getClosestSnapPoint(clamp(currentHeight, minSnapPoint, maxHeight), snapPoints)
        : maxSnapPoint;

      setMeasuredHeight(nextHeight);
    },
    [setMeasuredHeight]
  );

  const setContentRef = React.useCallback(
    (node: DialogContentElement | null) => {
      contentRef.current = node;
      setForwardedRef(ref, node);

      if (!node || typeof window === 'undefined') {
        return;
      }

      const measureNode = () => {
        if (contentRef.current === node) {
          measureContentElement(node);
        }
      };

      if (typeof window.queueMicrotask === 'function') {
        window.queueMicrotask(measureNode);
        return;
      }

      window.setTimeout(measureNode, 0);
    },
    [measureContentElement, ref]
  );

  const updateSnapPoints = React.useCallback(() => {
    measureContentElement(contentRef.current);
  }, [measureContentElement]);

  useIsomorphicLayoutEffect(() => {
    const content = contentRef.current;

    if (!content || typeof window === 'undefined') {
      return;
    }

    let animationFrame = 0;

    const scheduleUpdate = () => {
      if (animationFrame && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(animationFrame);
      }

      if (typeof window.requestAnimationFrame === 'function') {
        animationFrame = window.requestAnimationFrame(updateSnapPoints);
        return;
      }

      updateSnapPoints();
    };

    updateSnapPoints();

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleUpdate);
    resizeObserver?.observe(content);

    const mutationObserver =
      typeof MutationObserver === 'undefined' ? null : new MutationObserver(scheduleUpdate);
    mutationObserver?.observe(content, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    window.addEventListener('resize', scheduleUpdate);
    window.visualViewport?.addEventListener('resize', scheduleUpdate);

    const mediaQueryList = window.matchMedia?.(MOBILE_SHEET_MEDIA_QUERY);
    mediaQueryList?.addEventListener('change', scheduleUpdate);

    return () => {
      if (animationFrame && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(animationFrame);
      }

      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      window.visualViewport?.removeEventListener('resize', scheduleUpdate);
      mediaQueryList?.removeEventListener('change', scheduleUpdate);
    };
  }, [children, updateSnapPoints]);

  const snapToHeight = React.useCallback(
    (height: number) => {
      setMeasuredHeight(height);
      setDragOffset(0);
    },
    [setMeasuredHeight]
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !isMobileSheetViewport()) {
      return;
    }

    const snapPoints = snapPointsRef.current;
    const currentHeight = sheetHeightRef.current;
    const minSnapPoint = snapPoints[0];
    const maxSnapPoint = snapPoints[snapPoints.length - 1];

    if (!currentHeight || minSnapPoint === undefined || maxSnapPoint === undefined) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const now = window.performance.now();
    isDraggingRef.current = true;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: currentHeight,
      minHeight: minSnapPoint,
      maxHeight: maxSnapPoint,
      lastY: event.clientY,
      lastTime: now,
      velocityY: 0,
      draggedBelowMinBy: 0,
    };
    setIsDragging(true);
    setDragOffset(0);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const rawHeight = dragState.startHeight + dragState.startY - event.clientY;
    const draggedBelowMinBy = Math.max(0, dragState.minHeight - rawHeight);
    const nextHeight = clamp(rawHeight, dragState.minHeight, dragState.maxHeight);
    const now = window.performance.now();
    const elapsed = Math.max(now - dragState.lastTime, 1);

    dragState.velocityY = (event.clientY - dragState.lastY) / elapsed;
    dragState.lastY = event.clientY;
    dragState.lastTime = now;
    dragState.draggedBelowMinBy = draggedBelowMinBy;

    setMeasuredHeight(nextHeight);
    setDragOffset(Math.min(draggedBelowMinBy * 0.45, 140));
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    const snapPoints = snapPointsRef.current;
    const currentHeight = sheetHeightRef.current ?? dragState.startHeight;
    const snapPoint = getClosestSnapPoint(currentHeight, snapPoints);
    const shouldDismiss =
      Boolean(onOpenChange) &&
      dragState.draggedBelowMinBy > DRAG_DISMISS_DISTANCE &&
      dragState.velocityY >= 0;

    dragStateRef.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);

    if (shouldDismiss) {
      setDragOffset(0);
      onOpenChange?.(false);
      return;
    }

    snapToHeight(snapPoint);
  };

  const handleHandleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const snapPoints = snapPointsRef.current;

    const minSnapPoint = snapPoints[0];
    const maxSnapPoint = snapPoints[snapPoints.length - 1];

    if (!isMobileSheetViewport() || minSnapPoint === undefined || maxSnapPoint === undefined) {
      return;
    }

    const currentHeight = sheetHeightRef.current ?? maxSnapPoint;

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      snapToHeight(snapPoints.find((snapPoint) => snapPoint > currentHeight + 1) ?? maxSnapPoint);
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      snapToHeight(
        snapPoints
          .slice()
          .reverse()
          .find((snapPoint) => snapPoint < currentHeight - 1) ?? minSnapPoint
      );
    }
  };

  const contentStyle: DialogContentStyle = { ...style };

  if (sheetHeight) {
    contentStyle['--dialog-sheet-height'] = `${sheetHeight}px`;
  }

  if (dragOffset) {
    contentStyle['--dialog-sheet-y'] = `${dragOffset}px`;
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={setContentRef}
        data-dragging={isDragging ? 'true' : undefined}
        className={cn(
          // Mobile: measured bottom sheet with content-based snap points.
          'fixed inset-x-0 bottom-0 z-50 h-[var(--dialog-sheet-height,auto)] max-h-[90vh] w-full translate-y-[var(--dialog-sheet-y,0px)] overflow-y-auto rounded-t-2xl border-t bg-background p-6 shadow-lg transition-[height,transform] duration-200 ease-out data-[dragging=true]:transition-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          // Desktop: centered modal.
          'md:inset-auto md:left-[50%] md:top-[50%] md:h-auto md:max-h-[85vh] md:max-w-lg md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-lg md:border',
          'md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%]',
          'md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]',
          'md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95',
          className
        )}
        style={contentStyle}
        {...props}
      >
        {showHandle ? (
          <button
            type="button"
            aria-label="Drag bottom sheet"
            className="mx-auto mb-4 flex h-7 w-16 cursor-grab touch-none select-none items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:cursor-grabbing md:hidden"
            onKeyDown={handleHandleKeyDown}
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
          >
            <span className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </button>
        ) : null}
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 flex min-h-touch min-w-touch items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground md:h-auto md:min-h-0 md:w-auto md:min-w-0">
          <X className="h-5 w-5 md:h-4 md:w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
