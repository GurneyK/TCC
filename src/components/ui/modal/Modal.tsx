import { X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "../button/Button";
import { useDialogFocus } from "../drawer/useDialogFocus";

export interface ModalProps {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

export function Modal({ children, description, footer, onOpenChange, open, title }: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const ref = useDialogFocus<HTMLDivElement>(open, () => onOpenChange(false));
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4" role="presentation">
      <div
        aria-describedby={description ? descId : undefined}
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg overflow-hidden rounded-habibiLg bg-white shadow-habibiLg"
        ref={ref}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-gray-500" id={descId}>
                {description}
              </p>
            ) : null}
          </div>
          <button
            className="focus-ring rounded-habibiSm p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
            <span className="sr-only">Close dialog</span>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">{footer}</div>
        ) : (
          <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <Button variant="secondaryGray" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)}>Confirm</Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
