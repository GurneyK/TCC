import { useEffect, useState } from "react";
import { Toast } from "@/components/ui/toast/Toast";
import { useUi } from "@/store/hooks";

/** Confirms the result of an action. The Toast itself is a status role, so it is read once. */
export function ToastHost() {
  const toast = useUi((s) => s.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);
  if (!toast || !visible) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm justify-end px-4 sm:px-0">
      <div className="pointer-events-auto w-full">
        <Toast title={toast.title} variant={toast.tone}>
          {toast.body}
        </Toast>
      </div>
    </div>
  );
}
