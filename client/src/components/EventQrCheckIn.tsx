import { QrCode, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { CheckCircle2, CircleAlert, Link } from "lucide-react";
import { Link as RouterLink } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export function EventQrCheckIn({ token }: { token: string | null }) {
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const playTone = (frequency: number) => { try { const audio = new AudioContext(); const oscillator = audio.createOscillator(); oscillator.frequency.value = frequency; oscillator.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .12); } catch { /* 瀏覽器限制音效時保留視覺與文字回饋 */ } };
  const scan = trpc.checkIn.scan.useMutation({ onSuccess: async result => { setFeedback("success"); playTone(880); toast.success(result.status === "checked_in" ? `已完成「${result.eventTitle}」簽到。` : `你已完成「${result.eventTitle}」簽到。`); await Promise.all([utils.personal.summary.invalidate(), utils.content.events.myRegistrationStatuses.invalidate()]); }, onError: error => { setFeedback("error"); playTone(220); toast.error(error.message); } });
  if (!token) return null;
  if (!isAuthenticated) return <section className="event-checkin-confirm"><QrCode /><div><p className="club-section-number">EVENT CHECK-IN</p><h2>請先登入後完成簽到</h2><p>QR 本身不含個資；系統會在登入後確認你是否為該活動已報名的社員。</p><RouterLink className="club-primary" href="/account">社員登入</RouterLink></div></section>;
  return <section className={`event-checkin-confirm${feedback ? ` is-${feedback}` : ""}`}><QrCode /><div><p className="club-section-number">EVENT CHECK-IN</p><h2>確認活動簽到</h2><p>送出後，系統會驗證 QR 的時效、活動範圍與你的實際報名資格；重複掃碼不會新增重複紀錄。</p>{feedback === "success" ? <p className="checkin-feedback success"><CheckCircle2 size={18} />簽到成功，已同步個人紀錄。</p> : feedback === "error" ? <p className="checkin-feedback error"><CircleAlert size={18} />簽到未完成，請確認提示後再試。</p> : null}<button type="button" className="club-primary" onClick={() => { setFeedback(null); scan.mutate({ token }); }} disabled={scan.isPending}>{scan.isPending ? "簽到確認中…" : "確認簽到"}</button><small><ShieldCheck size={14} />簽到結果會顯示於個人中心；幹部僅能查看其授權活動名單。</small></div></section>;
}
