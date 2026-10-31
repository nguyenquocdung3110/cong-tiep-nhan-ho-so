"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { changeRoleAction } from "@/app/admin/(dashboard)/accounts/actions";
import type { AdminRole } from "@/lib/admin-accounts";

const LABELS: Record<AdminRole, string> = { admin: "Quản trị viên", nhan_vien: "Nhân viên" };

// Changing a role changes what the person can do (admins can edit and delete data), so it needs a
// second click to confirm.
export function AccountRoleButton({ id, role }: { id: string; role: AdminRole }) {
  const next: AdminRole = role === "admin" ? "nhan_vien" : "admin";
  const [confirming, setConfirming] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = React.useTransition();

  function run() {
    setMessage(null);
    startTransition(async () => {
      const result = await changeRoleAction(id, next);
      setMessage({ ok: result.ok, text: result.message });
      setConfirming(false);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {confirming ? (
        <>
          <span className="max-w-56 whitespace-normal text-right text-xs text-muted-foreground">
            Đổi thành {LABELS[next]}?
          </span>
          <div className="flex gap-1.5">
            <Button type="button" size="sm" disabled={pending} onClick={run}>
              {pending ? "Đang đổi..." : "Đổi"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Hủy
            </Button>
          </div>
        </>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(true)}>
          Đổi thành {LABELS[next]}
        </Button>
      )}
      {message && (
        <p
          className={
            "max-w-56 whitespace-normal break-words text-right text-xs " +
            (message.ok ? "text-green-700" : "text-red-600")
          }
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
