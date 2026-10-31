import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Chính sách quyền riêng tư — DuHoc24",
};

const CONTACT_EMAIL = "hotro@duhoc24.vn";

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32">
        <h1 className="text-3xl font-medium tracking-tight">Chính sách quyền riêng tư</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cập nhật lần cuối: 31/10/2026</p>
        <p className="mt-6 text-muted-foreground">
          DuHoc24 tôn trọng quyền riêng tư của bạn. Trang này cho biết chúng tôi thu thập thông
          tin gì, dùng để làm gì, lưu ở đâu và cách bạn yêu cầu xóa dữ liệu.
        </p>

        <div className="mt-10 space-y-10">
          <section>
            <h2 className="text-lg font-medium">1. Chúng tôi thu thập thông tin gì</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <span className="text-foreground">Tài khoản Google:</span> email và tên của bạn, khi
                bạn đăng nhập bằng Google.
              </li>
              <li>
                <span className="text-foreground">Thông tin bạn điền trên website:</span> họ tên,
                email, số điện thoại, quốc gia muốn du học, bậc học và gói dịch vụ ở form báo giá;
                nội dung bạn trao đổi với chatbot.
              </li>
              <li>
                <span className="text-foreground">Giấy tờ bạn tải lên:</span> bảng điểm, chứng chỉ
                IELTS, CMND/CCCD hoặc hộ chiếu. Hệ thống đọc giấy tờ và lưu thông tin trích xuất
                (họ tên, ngày sinh, điểm số, số giấy tờ). Chúng tôi không lưu bản gốc của tệp tải
                lên.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium">2. Dùng để làm gì</h2>
            <p className="mt-3 text-muted-foreground">
              Chúng tôi dùng thông tin trên để xử lý hồ sơ du học của bạn: gửi báo giá, liên hệ tư
              vấn, kiểm tra giấy tờ, đối chiếu điểm của bạn với điểm chuẩn các trường và gợi ý học
              bổng phù hợp.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium">3. Lưu ở đâu và ai xử lý</h2>
            <p className="mt-3 text-muted-foreground">
              Dữ liệu của bạn được lưu trên Supabase (máy chủ đặt tại vùng Mumbai, Ấn Độ). Chỉ hệ
              thống của chúng tôi truy cập được dữ liệu; mỗi người dùng chỉ xem được hồ sơ gắn với
              tài khoản Google của chính mình và không xem được hồ sơ của người khác.
            </p>
            <p className="mt-3 text-muted-foreground">Để vận hành, một số dữ liệu được xử lý bởi:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <span className="text-foreground">Google (Gemini):</span> đọc giấy tờ bạn tải lên,
                trả lời chatbot và gợi ý học bổng.
              </li>
              <li>
                <span className="text-foreground">Make.com:</span> tự động gửi email báo giá và link
                đăng nhập (dùng họ tên và email của bạn).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium">4. Xóa dữ liệu</h2>
            <p className="mt-3 text-muted-foreground">
              Để yêu cầu xóa dữ liệu của bạn, hãy gửi email tới{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              kèm họ tên và email bạn đã dùng trên website. Chúng tôi sẽ xử lý yêu cầu và xóa dữ
              liệu liên quan của bạn.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
