import type { LeadQuality } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

const qualityStyle: Record<LeadQuality, { label: string; className: string }> = {
  good: { label: "Good", className: "bg-emerald-100 text-emerald-800" },
  ok: { label: "OK", className: "bg-amber-100 text-amber-800" },
  spam: { label: "Spam", className: "bg-red-100 text-red-800" },
};

export function LeadQualityBadge({ quality }: { quality: LeadQuality }) {
  const { label, className } = qualityStyle[quality];
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {label}
    </span>
  );
}
