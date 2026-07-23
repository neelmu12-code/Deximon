import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex min-h-52 items-center justify-center rounded-xl border border-dashed border-hair bg-surface px-6 py-12 text-center ${className}`}
    >
      <div className="max-w-sm space-y-3">
        {icon && (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface2 text-ink3">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-ink3">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
