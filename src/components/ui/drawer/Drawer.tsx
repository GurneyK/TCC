import { X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "./useDialogFocus";

export interface DrawerProps {
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  side?: "right" | "left";
  title: string;
  /** Optional line under the title. */
  description?: string;
  /** Sticky action area at the bottom. */
  footer?: ReactNode;
}

export function Drawer({ children, description, footer, onOpenChange, open, side = "right", title }: DrawerProps) {
  const titleId = useId();
  const ref = useDialogFocus<HTMLElement>(open, () => onOpenChange(false));
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-gray-900/50" onClick={() => onOpenChange(false)} role="presentation">
      <aside
        aria-labelledby={titleId}
        aria-modal="true"
        className={[
          "fixed top-0 flex h-full w-full max-w-md flex-col border-gray-200 bg-white shadow-habibiLg sm:max-w-lg",
          side === "right" ? "right-0 border-l" : "left-0 border-r",
        ].join(" ")}
        onClick={(event) => event.stopPropagation()}
        ref={ref}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900" id={titleId}>
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
          </div>
          <button
            className="focus-ring rounded-habibiSm p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
            <span className="sr-only">Close drawer</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer ? <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">{footer}</div> : null}
      </aside>
    </div>,
    document.body,
  );
}
