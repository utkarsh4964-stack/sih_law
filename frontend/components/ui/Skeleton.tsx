import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[3px] bg-white/[0.06]",
        className
      )}
    />
  );
}
