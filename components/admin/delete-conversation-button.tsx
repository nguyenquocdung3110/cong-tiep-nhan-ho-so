"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteConversationAction } from "@/app/admin/conversations/actions";

// Two-step inline confirmation (no window.confirm) so a stray click can't delete.
export function DeleteConversationButton({
  id,
  redirectToList = false,
}: {
  id: string;
  redirectToList?: boolean;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function onDelete() {
    setError("");
    startTransition(async () => {
      const result = await deleteConversationAction(id, redirectToList);
      if (result.error) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => setConfirming(true)}
        >
          <Trash2 />
          Xóa
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Xóa vĩnh viễn?</span>
      <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={onDelete}>
        {pending ? "Đang xóa..." : "Xóa"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => setConfirming(false)}
      >
        Hủy
      </Button>
    </span>
  );
}
