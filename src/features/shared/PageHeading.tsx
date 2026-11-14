import { useEffect, useRef, type ReactNode } from "react";

export interface PageHeadingProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  actions?: ReactNode;
}

/** Sets the document title and takes focus on navigation so screen readers land on the new page. */
export function PageHeading({ actions, description, eyebrow, title }: PageHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${title} · Treasury Command Center`;
    ref.current?.focus({ preventScroll: true });
  }, [title]);

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold text-gray-900 outline-none" ref={ref} tabIndex={-1}>
          {title}
        </h1>
        {description ? <div className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
