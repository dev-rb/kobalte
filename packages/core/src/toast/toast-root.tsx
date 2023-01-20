import { composeEventHandlers } from "@kobalte/utils";
import { Accessor, ParentComponent, splitProps } from "solid-js";
import { createControllableBooleanSignal } from "../primitives";
import { ToastImpl, ToastImplProps } from "./toast";

export interface ToastRootOptions extends Omit<ToastImplProps, "isOpen" | "onClose"> {
  defaultIsOpen?: boolean;
  isOpen?: Accessor<boolean>;
  onOpenChange?: (isOpen: boolean) => void;
}

export const ToastRoot: ParentComponent<ToastRootOptions> = props => {
  const [self, others] = splitProps(props, ["defaultIsOpen", "isOpen", "onOpenChange"]);

  const [open, setOpen] = createControllableBooleanSignal({
    onChange: self.onOpenChange,
    value: self.isOpen,
    defaultValue: () => self.defaultIsOpen,
  });

  return (
    <div>
      <ToastImpl
        isOpen={open()}
        {...others}
        onClose={() => setOpen(false)}
        onSwipeStart={composeEventHandlers([props.onSwipeStart, event => {}])}
        onSwipeMove={composeEventHandlers([props.onSwipeMove, event => {}])}
        onSwipeEnd={composeEventHandlers([props.onSwipeEnd, event => {}])}
        onSwipeCancel={composeEventHandlers([props.onSwipeCancel, event => {}])}
      />
    </div>
  );
};
