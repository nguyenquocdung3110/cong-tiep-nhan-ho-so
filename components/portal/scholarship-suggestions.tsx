"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ScholarshipSuggestions as Suggestions,
  SuggestedScholarship,
} from "@/lib/scholarship-advisor";

function conditionText(s: SuggestedScholarship) {
  const parts = [
    s.minGpa !== null ? `Điểm học tập ≥ ${s.minGpa.toFixed(1)}` : null,
    s.minIelts !== null ? `IELTS ≥ ${s.minIelts.toFixed(1)}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function Item({ s, tone }: { s: SuggestedScholarship; tone: "yes" | "no" }) {
  return (
    <div
      className={
        tone === "yes"
          ? "rounded-xl border border-green-200 bg-green-50 p-4"
          : "rounded-xl border bg-muted/30 p-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{s.name}</p>
          <p className="text-sm text-muted-foreground">{s.schoolName}</p>
        </div>
        <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium ring-1 ring-border">
          Hỗ trợ: {s.support}
        </span>
      </div>
      <p className="mt-2 text-sm">{s.reason}</p>
      <p className="mt-1 text-xs text-muted-foreground">Điều kiện: {conditionText(s)}</p>
    </div>
  );
}

export function ScholarshipSuggestions({
  suggestions,
  suggestedAt,
  stale,
}: {
  suggestions: Suggestions | null;
  suggestedAt: string | null;
  /** The profile or the list of eligible schools changed after the suggestions were made. */
  stale: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function run() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/portal/scholarships", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Chưa gợi ý được học bổng, vui lòng thử lại.");
        return;
      }
      router.refresh();
    } catch {
      setError("Chưa gợi ý được học bổng, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gợi ý học bổng</CardTitle>
        <p className="text-sm text-muted-foreground">
          AI tra cứu học bổng của các trường bạn đã đạt yêu cầu và gợi ý học bổng phù hợp với
          điểm của bạn. Đây chỉ là gợi ý tham khảo, điều kiện chính thức do từng trường quyết định.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions && (
          <>
            {stale && (
              <p className="text-sm text-amber-700">
                Hồ sơ của bạn đã thay đổi kể từ lần gợi ý này. Hãy cập nhật gợi ý.
              </p>
            )}
            {suggestions.summary && <p className="text-sm font-medium">{suggestions.summary}</p>}

            {suggestions.recommended.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Học bổng bạn đủ điều kiện</h3>
                {suggestions.recommended.map((s) => (
                  <Item key={`${s.schoolName}|${s.name}`} s={s} tone="yes" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Hiện chưa có học bổng nào bạn đủ điều kiện tối thiểu.
              </p>
            )}

            {suggestions.notRecommended.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Học bổng chưa đủ điều kiện</h3>
                {suggestions.notRecommended.map((s) => (
                  <Item key={`${s.schoolName}|${s.name}`} s={s} tone="no" />
                ))}
              </div>
            )}

            {suggestions.lookedUp.length > 0 && (
              <p className="text-xs text-muted-foreground">
                AI đã tra cứu học bổng của: {[...new Set(suggestions.lookedUp)].join(", ")}.
                {suggestedAt &&
                  ` Cập nhật lúc ${new Date(suggestedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.`}
              </p>
            )}
          </>
        )}

        <Button type="button" size="sm" disabled={loading} onClick={run}>
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {loading
            ? "AI đang tra cứu học bổng (khoảng 20 giây)..."
            : suggestions
              ? "Cập nhật gợi ý"
              : "Gợi ý học bổng cho tôi"}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
