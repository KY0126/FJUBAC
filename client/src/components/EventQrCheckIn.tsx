import { QrCode, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export function EventQrCheckIn({ token }: { token: string | null }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const scan = trpc.checkIn.scan.useMutation({ onSuccess: async result => { toast.success(result.status === "checked_in" ? `已完成「${result.eventTitle}」簽到。` : `你已完成「${result.eventTitle}」簽到。`); await Promise.all([utils.personal.summary.invalidate(), utils.content.events.myRegistrationStatuses.invalidate()]); }, onError: error => toast.error(error.message) });
  if (!token) return null;
  if (!isAuthenticated) return <section className="event-checkin-confirm"><QrCode /><div><p className="club-section-number">EVENT CHECK-IN</p><h2>請先登入後完成簽到</h2><p>QR 本身不含個資；系統會在登入後確認你是否為該活動已報名的社員。</p><Link className="club-primary" href="/account">社員登入</Link></div></section>;
  return <section className="event-checkin-confirm"><QrCode /><div><p className="club-section-number">EVENT CHECK-IN</p><h2>確認活動簽到</h2><p>送出後，系統會驗證 QR 的時效、活動範圍與你的實際報名資格；重複掃碼不會新增重複紀錄。</p><button type="button" className="club-primary" onClick={() => scan.mutate({ token })} disabled={scan.isPending}>{scan.isPending ? "簽到確認中…" : "確認簽到"}</button><small><ShieldCheck size={14} />簽到結果會顯示於個人中心；幹部僅能查看其授權活動名單。</small></div></section>;
}
