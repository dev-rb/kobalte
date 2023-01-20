/*!
 * Portions of this file are based on code from radix-ui-primitives.
 * MIT Licensed, Copyright (c) 2022 WorkOS.
 *
 * Credits to the Radix UI team:
 * https://github.com/radix-ui/primitives/blob/81b25f4b40c54f72aeb106ca0e64e1e09655153e/packages/react/toast/src/Toast.tsx
 *
 * Portions of this file are based on code from zag.
 * MIT Licensed, Copyright (c) 2021 Chakra UI.
 */

import { composeEventHandlers, mergeDefaultProps } from "@kobalte/utils";
import {
  createEffect,
  createSignal,
  JSX,
  on,
  onCleanup,
  onMount,
  ParentComponent,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";

import { DismissableLayer, DismissableLayerOptions } from "../dismissable-layer";
import { SwipeDirection, ToastContext, ToastContextValue, useToastContext } from "./toast-context";

export const ToastProvider: ParentComponent<ToastContextValue> = props => {
  props = mergeDefaultProps(
    {
      duration: 500,
      label: "notification",
      swipeDirection: "right",
      swipeThreshold: 50,
    },
    props
  );

  const [toastCount, setToastCount] = createSignal<number>(0);
  const [isPaused, setIsPaused] = createSignal<boolean>(false);
  const [isFocusedToastEscapeKeyDown, setIsFocusedToastEscapeKeyDown] =
    createSignal<boolean>(false);

  const [viewport, setViewport] = createSignal<HTMLElement | null>(null);

  const onToastAdd = () => {
    setToastCount(p => p + 1);
  };

  const onToastRemove = () => {
    setToastCount(p => Math.max(0, p - 1));
  };

  const context: ToastContextValue = {
    duration: props.duration!,
    label: props.label!,
    swipeDirection: props.swipeDirection!,
    swipeThreshold: props.swipeThreshold!,
    isPaused,
    setIsPaused,
    isFocusedToastEscapeKeyDown,
    setIsFocusedToastEscapeKeyDown,
    onToastAdd,
    onToastRemove,
    onViewportChange: newViewport => setViewport(newViewport),
    toastCount,
    viewport,
  };
  return <ToastContext.Provider value={context}>{props.children}</ToastContext.Provider>;
};

type SwipeEvent = PointerEvent & { currentTarget: HTMLLIElement; target: Element } & {
  delta: { x: number; y: number };
};

export interface ToastImplProps extends JSX.HTMLAttributes<HTMLLIElement> {
  type?: "foreground" | "background";

  isOpen: boolean;
  onClose: () => void;

  duration?: number;
  onEscapeKeyDown?: DismissableLayerOptions["onEscapeKeyDown"];
  onPause?: () => void;
  onResume?: () => void;
  onSwipeStart: (ev: SwipeEvent) => void;
  onSwipeMove: (ev: SwipeEvent) => void;
  onSwipeCancel: (ev: SwipeEvent) => void;
  onSwipeEnd: (ev: SwipeEvent) => void;
}

interface SwipeState {
  start: { x: number; y: number } | null;
  delta: { x: number; y: number } | null;
}

interface TimerState {
  id: number;
  start: number;
  remaining: number;
}

export const ToastImpl: ParentComponent<ToastImplProps> = props => {
  const toastContext = useToastContext();
  const duration = () => props.duration || toastContext.duration;

  const [swipeState, setSwipeState] = createSignal<SwipeState>({
    start: null,
    delta: null,
  });

  const [timerState, setTimerState] = createSignal<TimerState>({
    id: 0,
    remaining: duration(),
    start: 0,
  });

  const handleClose = () => {};

  const onEscapeKeyDown = (e: KeyboardEvent) => {};

  const startTimer = (duration: number) => {
    if (!duration || duration === Infinity) return;
    window.clearTimeout(timerState().id);
    setTimerState(p => ({
      ...p,
      start: new Date().getTime(),
      id: window.setTimeout(handleClose, duration),
    }));
  };

  createEffect(
    on([toastContext.viewport, duration], () => {
      const viewport = toastContext.viewport();
      if (viewport) {
        const handleResume = () => {
          startTimer(timerState().remaining);
          props.onResume?.();
        };

        const handlePause = () => {
          const elapsedTime = new Date().getTime() - timerState().start;
          setTimerState(p => ({
            ...p,
            remaining: p.remaining - elapsedTime,
          }));
          window.clearTimeout(timerState().id);
          props.onPause?.();
        };

        // Assign custom viewport events
      }
    })
  );

  createEffect(
    on([() => props.isOpen, duration], () => {
      if (props.isOpen && !toastContext.isPaused()) {
        startTimer(duration());
      }
    })
  );

  onMount(() => {
    toastContext.onToastAdd();
    onCleanup(() => toastContext.onToastRemove());
  });

  return (
    <Show when={toastContext.viewport()}>
      <>
        <Portal mount={toastContext.viewport()!}>
          <DismissableLayer
            as="div"
            isDismissed={!props.isOpen}
            onEscapeKeyDown={() =>
              composeEventHandlers([
                onEscapeKeyDown,
                () => {
                  if (!toastContext.isFocusedToastEscapeKeyDown()) handleClose();

                  toastContext.setIsFocusedToastEscapeKeyDown(false);
                },
              ])
            }
          >
            <li
              role="status"
              aria-live="off"
              // tabIndex={0}
              data-state={props.isOpen ? "open" : "closed"}
              data-swipe-direction={toastContext.swipeDirection}
              style={{ "user-select": "none", "touch-action": "none" }}
              onKeyDown={composeEventHandlers([
                props.onKeyDown,
                event => {
                  if (event.key !== "Escape") return;
                  props.onEscapeKeyDown?.(event);
                  if (!event.defaultPrevented) {
                    toastContext.setIsFocusedToastEscapeKeyDown(true);
                    handleClose();
                  }
                },
              ])}
              onPointerDown={composeEventHandlers([
                props.onPointerDown,
                event => {
                  if (event.button !== 0) return;
                  setSwipeState(p => ({ ...p, start: { x: event.clientX, y: event.clientY } }));
                },
              ])}
              onPointerMove={composeEventHandlers([
                props.onPointerMove,
                event => {
                  const start = swipeState().start;
                  if (!start) return;

                  const x = event.clientX - start.x;
                  const y = event.clientY - start.y;

                  const hasSwipeMoveStarted = Boolean();
                  const isHorizontalSwipe = ["left", "right"].includes(toastContext.swipeDirection);
                  const clamp = ["left", "up"].includes(toastContext.swipeDirection)
                    ? Math.min
                    : Math.max;

                  const clampedX = isHorizontalSwipe ? clamp(0, x) : 0;
                  const clampedY = !isHorizontalSwipe ? clamp(0, y) : 0;

                  const moveStartBuffer = event.pointerType === "touch" ? 10 : 2;

                  const delta = { x: clampedX, y: clampedY };
                  const eventDetail = { ...event, delta };
                  if (hasSwipeMoveStarted) {
                    setSwipeState(p => ({ ...p, delta }));
                    props.onSwipeMove?.(eventDetail);
                  } else if (
                    isDeltaInDirection(delta, toastContext.swipeDirection, moveStartBuffer)
                  ) {
                    setSwipeState(p => ({ ...p, delta }));
                    event.target.setPointerCapture(event.pointerId);
                    props.onSwipeStart?.(eventDetail);
                  } else if (Math.abs(x) > moveStartBuffer || Math.abs(y) > moveStartBuffer) {
                    setSwipeState(p => ({ ...p, start: null }));
                  }
                },
              ])}
              onPointerUp={composeEventHandlers([
                props.onPointerUp,
                event => {
                  const delta = swipeState().delta;

                  const target = event.target;
                  if (target.hasPointerCapture(event.pointerId)) {
                    target.releasePointerCapture(event.pointerId);
                  }

                  setSwipeState({
                    delta: null,
                    start: null,
                  });

                  if (delta) {
                    const toast = event.currentTarget;
                    const eventDetail = { ...event, delta };
                    if (
                      isDeltaInDirection(
                        delta,
                        toastContext.swipeDirection,
                        toastContext.swipeThreshold
                      )
                    ) {
                      // Dispatch swipe end event
                      props.onSwipeEnd?.(eventDetail);
                    } else {
                      // Dispatch swipe cancel event
                      props.onSwipeCancel?.(eventDetail);
                    }

                    toast.addEventListener("click", ev => ev.preventDefault(), { once: true });
                  }
                },
              ])}
            />
          </DismissableLayer>
        </Portal>
      </>
    </Show>
  );
};

const isDeltaInDirection = (
  delta: { x: number; y: number },
  direction: SwipeDirection,
  threshold = 0
) => {
  const deltaX = Math.abs(delta.x);
  const deltaY = Math.abs(delta.y);
  const isDeltaX = deltaX > deltaY;
  if (direction === "left" || direction === "right") {
    return isDeltaX && deltaX > threshold;
  } else {
    return !isDeltaX && deltaY > threshold;
  }
};
