import { Card } from "@/components/ui/card";
import { LeadQualityBadge } from "@/components/admin/lead-quality-badge";
import { ExtractLeadButton } from "@/components/admin/extract-lead-button";
import type { StoredLead } from "@/lib/chat-store";
import { formatDateTime } from "@/lib/format";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">
        {value ?? <span className="text-muted-foreground">Chưa có</span>}
      </dd>
    </div>
  );
}

export function LeadPanel({
  conversationId,
  lead,
  messageCount,
}: {
  conversationId: string;
  lead: StoredLead | null;
  messageCount: number;
}) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-medium">Thông tin lead</h2>
        {lead && <LeadQualityBadge quality={lead.quality} />}
      </div>

      {lead ? (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Họ tên" value={lead.name} />
            <Field label="Số điện thoại" value={lead.phone} />
            <div className="col-span-2">
              <Field label="Email" value={lead.email} />
            </div>
            <Field label="Nước du học" value={lead.studyCountry} />
            <Field label="Bậc học" value={lead.educationLevel} />
            <div className="col-span-2">
              <Field label="Ngành học" value={lead.major} />
            </div>
            <div className="col-span-2">
              <Field label="Thời gian rảnh" value={lead.availability} />
            </div>
            <Field
              label="Đặt lịch tư vấn"
              value={lead.wantsConsultation ? "Có" : "Không"}
            />
            <div className="col-span-2">
              <Field label="Ghi chú" value={lead.note} />
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            Trích xuất lúc {formatDateTime(lead.extractedAt)} từ {lead.extractedMessageCount} tin nhắn
            {lead.extractedMessageCount < messageCount && (
              <span className="text-amber-700">
                {" "}
                · cuộc trò chuyện đã có thêm tin mới, nên trích xuất lại
              </span>
            )}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Chưa trích xuất thông tin lead cho cuộc trò chuyện này.
        </p>
      )}

      <ExtractLeadButton conversationId={conversationId} hasLead={!!lead} />
    </Card>
  );
}
