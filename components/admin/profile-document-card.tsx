"use client";

import React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocStatusBadge } from "@/components/status-badge";
import {
  updateProfileDocumentAction,
  type ProfileActionResult,
} from "@/app/admin/(dashboard)/profiles/actions";
import type { DocStatus, DocType } from "@/lib/student-store";

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "date" | "number";
  /** Value for the edit input (dates as yyyy-mm-dd). */
  value: string;
  /** What to show when not editing; null = nothing read. */
  display: string | null;
  required?: boolean;
};

// Shows what was read from one document. Admins get an "Edit" button; staff (nhan_vien) only
// see the data, because `canEdit` is false for them (the server and the database refuse
// their edits as well).
export function ProfileDocumentCard({
  profileId,
  docType,
  title,
  status,
  fileName,
  reason,
  fields,
  canEdit,
}: {
  profileId: string;
  docType: DocType;
  title: string;
  status: DocStatus;
  fileName: string | null;
  reason: string | null;
  fields: FieldDef[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [state, action, pending] = React.useActionState<ProfileActionResult | null, FormData>(
    async (previous, formData) => {
      const result = await updateProfileDocumentAction(profileId, docType, previous, formData);
      if (result.ok) setEditing(false); // saved: back to the read-only view
      return result;
    },
    null,
  );

  const hasData = status === "hop_le";

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium">{title}</h3>
            <DocStatusBadge status={status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {fileName ?? "Chưa nộp file"}
          </p>
        </div>
        {canEdit && hasData && !editing && (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil />
            Sửa
          </Button>
        )}
      </div>

      {!hasData && (
        <p className="mt-4 text-sm text-muted-foreground">
          {status === "can_nop_lai" && reason ? `Cần nộp lại: ${reason}` : "Chưa có thông tin."}
        </p>
      )}

      {hasData && !editing && (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className="rounded-lg bg-muted/40 p-3">
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className="mt-1 break-words text-sm font-medium">
                {f.display ?? <span className="font-normal text-muted-foreground">Chưa đọc được</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {hasData && editing && (
        <form action={action} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={`${docType}-${f.name}`}>{f.label}</Label>
                <Input
                  id={`${docType}-${f.name}`}
                  name={f.name}
                  type={f.type === "number" ? "text" : f.type}
                  inputMode={f.type === "number" ? "decimal" : undefined}
                  defaultValue={f.value}
                  required={f.required}
                />
              </div>
            ))}
          </div>
          {state && !state.ok && (
            <p role="alert" className="text-sm text-red-600">
              {state.message}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Đang lưu..." : "Lưu"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setEditing(false)}
            >
              Hủy
            </Button>
          </div>
        </form>
      )}

      {state?.ok && !editing && <p className="mt-3 text-xs text-green-700">{state.message}</p>}
    </Card>
  );
}
