"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Folders,
  Search,
  ListChecks,
  ShieldCheck,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "Cases", icon: Folders },
  { href: "/search", label: "Evidence Search", icon: Search },
  { href: "/audit", label: "Audit Trail", icon: ListChecks },
  { href: "/security", label: "Security Center", icon: ShieldCheck },
];

const FUTURE = [
  { label: "Users", icon: Users },
  { label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-primary/10 text-primary">
          <ShieldCheck size={14} />
        </div>
        <span className="text-sm font-semibold tracking-tight">LAW1</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-[13px] transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-white/5 hover:text-text"
              )}
            >
              <Icon size={15} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-4 border-t border-border pt-3">
          <p className="px-2.5 pb-1.5 text-[10px] font-medium tracking-wide text-muted/70">
            Future scope
          </p>
          {FUTURE.map((item) => (
            <div
              key={item.label}
              className="flex cursor-not-allowed items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-[13px] text-muted/40"
            >
              <item.icon size={15} strokeWidth={1.8} />
              {item.label}
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}
