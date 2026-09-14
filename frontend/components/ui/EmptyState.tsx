import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <Icon size={28} className="text-border-strong" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
