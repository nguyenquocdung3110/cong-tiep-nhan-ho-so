import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { LeadQualityBadge } from "@/components/admin/lead-quality-badge";
import { DeleteConversationButton } from "@/components/admin/delete-conversation-button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listConversations } from "@/lib/chat-store";
import { formatDateTime } from "@/lib/format";

// Live data from Supabase: never prerender or cache this page.
export const dynamic = "force-dynamic";

export default async function AdminConversationsPage() {
  let conversations;
  try {
    conversations = await listConversations();
  } catch (err) {
    console.error("Load conversations failed", err);
    return (
      <>
        <AdminPageHeader title="Hội thoại" />
        <p className="text-sm text-destructive">
          Không tải được danh sách hội thoại. Kiểm tra SUPABASE_URL và SUPABASE_SECRET_KEY trong .env.
        </p>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Hội thoại"
        description="Lịch sử hội thoại của khách với chatbot hỏi đáp trên trang chủ."
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Câu hỏi đầu tiên</TableHead>
              <TableHead>Số tin nhắn</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Bắt đầu</TableHead>
              <TableHead>Cập nhật gần nhất</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Chưa có cuộc trò chuyện nào.
                </TableCell>
              </TableRow>
            )}
            {conversations.map((conv) => (
              <TableRow key={conv.id}>
                <TableCell className="max-w-sm truncate font-medium">
                  {conv.preview || "(trống)"}
                </TableCell>
                <TableCell>{conv.messageCount} tin nhắn</TableCell>
                <TableCell>
                  {conv.leadQuality ? (
                    <LeadQualityBadge quality={conv.leadQuality} />
                  ) : (
                    <span className="text-xs text-muted-foreground">Chưa trích xuất</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(conv.createdAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(conv.updatedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-3">
                    <Link
                      href={`/admin/conversations/${conv.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Xem
                    </Link>
                    <DeleteConversationButton id={conv.id} />
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
