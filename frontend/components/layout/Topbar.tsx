"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, LogOut, ShieldCheck, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { SecurityStatus } from "@/types";

export function Topbar() {
  const { user, logout } = useAuth();
  const [status, setStatus] = useState<SecurityStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getSecurityStatus()
      .then((s) => mounted && setStatus(s))
      .catch(() => mounted && setStatus(null));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2 md:hidden">
        <ShieldCheck size={16} className="text-primary" />
        <span className="text-sm font-semibold">LAW1</span>
      </div>

      <div className="hidden text-xs text-muted md:block">
        Secure Evidence. Intelligent Investigation. Complete Accountability.
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/security"
          className="flex items-center gap-1.5 rounded-[4px] border border-border-strong px-2.5 py-1.5 text-xs text-muted hover:text-text"
        >
          {status ? (
            status.audit_chain_status === "VALID" ? (
              <ShieldCheck size={13} className="text-primary" />
            ) : (
              <ShieldAlert size={13} className="text-critical" />
            )
          ) : (
            <ShieldCheck size={13} className="text-muted" />
          )}
          {status ? status.audit_chain_status : "…"}
        </Link>

        <Link
          href="/security"
          className="relative flex items-center gap-1.5 rounded-[4px] border border-border-strong px-2.5 py-1.5 text-xs text-muted hover:text-text"
        >
          <AlertTriangle
            size={13}
            className={
              status && status.open_alerts > 0 ? "text-warning" : "text-muted"
            }
          />
          {status ? status.open_alerts : "…"} alerts
        </Link>

        {user && (
          <div className="flex items-center gap-2 border-l border-border pl-3">
            <div className="text-right leading-tight">
              <p className="text-xs font-medium text-text">{user.name}</p>
              <p className="text-[10px] tracking-wide text-muted">
                {user.role.replace(/_/g, " ")}
              </p>
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted hover:bg-white/5 hover:text-critical"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
