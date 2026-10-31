"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProfileAction } from "@/app/admin/(dashboard)/profiles/actions";

// Deleting a profile cannot be undone, so it needs a second click to confirm.
export function DeleteProfileButton({ id }: { id: string }) {
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function onDelete() {
    setError("");
    startTransition(async () => {
      const result = await deleteProfileAction(id); // on success the server redirects to the list
      if (result && !result.ok) {
        setError(result.message);
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
          Xóa hồ sơ
        </Button>
        {error && <span className="max-w-64 text-right text-xs text-destructive">{error}</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Xóa vĩnh viễn hồ sơ này?</span>
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
