"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractLeadAction } from "@/app/admin/conversations/actions";

export function ExtractLeadButton({
  conversationId,
  hasLead,
}: {
  conversationId: string;
  hasLead: boolean;
}) {
  const [error, setError] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    setError("");
    startTransition(async () => {
      const result = await extractLeadAction(conversationId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" size="sm" disabled={pending} onClick={onClick}>
        <Sparkles />
        {pending ? "Đang trích xuất..." : hasLead ? "Trích xuất lại" : "Trích xuất thông tin lead"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
