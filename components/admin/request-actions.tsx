"use client";

import React from "react";
import { Check, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  approveRequestAction,
  rejectRequestAction,
  resendApprovalAction,
  type ActionResult,
} from "@/app/admin/requests/actions";
import type { QuoteStatus } from "@/lib/quote-store";

// Approving emails the customer (through Make) and cannot be undone, so both decisions
// need a second click to confirm (no window.confirm: it blocks automation and is easy to dismiss).
export function RequestActions({
  id,
  status,
  notified,
}: {
  id: string;
  status: QuoteStatus;
  notified: boolean;
}) {
  const [confirming, setConfirming] = React.useState<"approve" | "reject" | null>(null);
  const [result, setResult] = React.useState<ActionResult | null>(null);
  const [pending, startTransition] = React.useTransition();

  function run(action: (id: string) => Promise<ActionResult>) {
    setResult(null);
    startTransition(async () => {
      setResult(await action(id));
      setConfirming(null);
    });
  }

  const message = result && (
    <p
      className={
        result.tone === "success"
          ? "max-w-48 whitespace-normal break-words text-right text-xs text-green-700"
          : result.tone === "warning"
            ? "max-w-48 whitespace-normal break-words text-right text-xs text-amber-700"
            : "max-w-48 whitespace-normal break-words text-right text-xs text-red-600"
      }
    >
      {result.message}
    </p>
  );

  if (status === "da_duyet") {
    return (
      <div className="flex flex-col items-end gap-1">
        {notified ? (
          <span className="text-xs text-muted-foreground">Đã gửi link đăng nhập</span>
        ) : (
          <>
            <span className="text-xs text-amber-700">Chưa gửi link đăng nhập</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(resendApprovalAction)}
            >
              <Send />
              {pending ? "Đang gửi..." : "Gửi lại"}
            </Button>
          </>
        )}
        {message}
      </div>
    );
  }

  if (status === "tu_choi") {
    return <div className="flex flex-col items-end gap-1">{message}</div>;
  }

  if (confirming) {
    const approving = confirming === "approve";
    return (
      <div className="flex flex-col items-end gap-1.5">
        <span className="max-w-48 whitespace-normal break-words text-right text-xs text-muted-foreground">
          {approving ? "Duyệt và gửi link đăng nhập cho khách?" : "Từ chối yêu cầu này?"}
        </span>
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={approving ? "default" : "destructive"}
            disabled={pending}
            onClick={() => run(approving ? approveRequestAction : rejectRequestAction)}
          >
            {pending ? "Đang xử lý..." : approving ? "Duyệt" : "Từ chối"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setConfirming(null)}
          >
            Hủy
          </Button>
        </div>
        {message}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label="Duyệt"
          onClick={() => setConfirming("approve")}
        >
          <Check className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label="Từ chối"
          onClick={() => setConfirming("reject")}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      {message}
    </div>
  );
}
