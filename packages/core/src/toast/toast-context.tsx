import { Accessor, Setter, createContext, useContext } from "solid-js";

export type SwipeDirection = "up" | "down" | "left" | "right";

export interface ToastContextValue {
  duration: number;
  label: string;
  swipeDirection: SwipeDirection;
  swipeThreshold: number;
  toastCount: Accessor<number>;
  viewport: Accessor<HTMLElement | null>;
  onViewportChange: (newViewport: HTMLElement) => void;
  onToastAdd: () => void;
  onToastRemove: () => void;
  isPaused: Accessor<boolean>;
  setIsPaused: Setter<boolean>;
  isFocusedToastEscapeKeyDown: Accessor<boolean>;
  setIsFocusedToastEscapeKeyDown: Setter<boolean>;
}

export const ToastContext = createContext<ToastContextValue>();

export function useToastContext() {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error("[kobalte]: `useToastContext` must be used within a `Toast` component");
  }

  return context;
}
