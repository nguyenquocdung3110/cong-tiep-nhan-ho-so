import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { LeadPanel } from "@/components/admin/lead-panel";
import { DeleteConversationButton } from "@/components/admin/delete-conversation-button";
import { Card } from "@/components/ui/card";
import { getConversation, getLead, isValidConversationId } from "@/lib/chat-store";
import { formatDateTime, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidConversationId(id)) notFound();

  const conversation = await getConversation(id);
  if (!conversation) notFound();
  const lead = await getLead(id);

  return (
    <>
      <Link
        href="/admin/conversations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Tất cả hội thoại
      </Link>

      <AdminPageHeader
        title="Chi tiết hội thoại"
        description={`Bắt đầu ${formatDateTime(conversation.createdAt)} · ${conversation.messages.length} tin nhắn · mã ${conversation.id.slice(0, 8)}`}
        action={<DeleteConversationButton id={conversation.id} redirectToList />}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,42rem)_22rem]">
        <Card className="space-y-4 p-5">
          {conversation.messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Cuộc trò chuyện chưa có tin nhắn.</p>
          )}
          {conversation.messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                  m.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground",
                )}
              >
                {m.content}
              </div>
              <span className="px-1 text-xs text-muted-foreground">
                {m.role === "user" ? "Khách" : "Chatbot"} · {formatTime(m.createdAt)}
              </span>
            </div>
          ))}
        </Card>

        <LeadPanel
          conversationId={conversation.id}
          lead={lead}
          messageCount={conversation.messages.length}
        />
      </div>
    </>
  );
}
