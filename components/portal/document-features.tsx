"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FileText, IdCard, Loader2, Medal, Upload, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocStatusBadge } from "@/components/status-badge";
import type { DocStatus, DocType } from "@/lib/student-store";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

// Icons are picked here: functions can't be passed from server components to client ones.
const ICONS: Record<DocType, LucideIcon> = {
  transcript: FileText,
  ielts: Medal,
  identity: IdCard,
};

export interface DocumentFeature {
  type: DocType;
  title: string;
  accept: string;
  /** Value for the file input's accept attribute. */
  acceptAttr: string;
  fileName: string | null;
  status: DocStatus;
  reason: string | null;
}

function DocumentCard({ item }: { item: DocumentFeature }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (file.size > MAX_FILE_SIZE) {
      setError("File quá lớn, tối đa 4 MB.");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("type", item.type);
      body.append("file", file);
      const res = await fetch("/api/portal/documents", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Không tải lên được, vui lòng thử lại.");
        return;
      }
      router.refresh();
    } catch {
      setError("Không tải lên được, vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  }

  const uploaded = item.status !== "chua_nop";
  const Icon = ICONS[item.type];

  return (
    <div>
      <Card className="flex aspect-video flex-col items-center justify-center gap-2 border-none bg-foreground/5 p-6 shadow-none ring-0">
        <Icon className="size-7 text-muted-foreground" />
        <span className="max-w-full truncate px-4 text-xs text-muted-foreground">
          {item.fileName ?? "Chưa có file"}
        </span>
      </Card>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
          <DocStatusBadge status={item.status} />
        </div>
        <p className="mt-3 text-balance text-muted-foreground">
          {item.status === "can_nop_lai" && item.reason ? (
            <>
              Cần nộp lại: <span className="text-red-600">{item.reason}</span>
            </>
          ) : (
            item.accept
          )}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={item.acceptAttr}
          className="hidden"
          onChange={onFileChosen}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          {uploading ? "Đang đọc giấy tờ..." : uploaded ? "Nộp lại" : "Chọn file"}
        </Button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

export function DocumentFeatures({ items }: { items: DocumentFeature[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {items.map((item) => (
        <DocumentCard key={item.type} item={item} />
      ))}
    </div>
  );
}
