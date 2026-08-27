import { CheckCircle2, QrCode, UserCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export function PersonalCheckInHistory() {
  const { isAuthenticated } = useAuth();
  const history = trpc.checkIn.myHistory.useQuery(undefined, { enabled: isAuthenticated });
  if (!isAuthenticated) return null;
  return <section id="checkin-history" className="personal-checkin-history"><header><div><QrCode /><div><p className="club-section-number">ATTENDANCE HISTORY</p><h2>我的活動簽到紀錄</h2></div></div></header><p>僅顯示你本人的 QR 或人工備援簽到結果；任何更正均由授權幹部留下稽核摘要。</p>{history.isLoading ? <div className="history-empty">正在讀取本人簽到紀錄…</div> : history.isError ? <div className="history-empty">暫時無法讀取簽到紀錄：{history.error.message}</div> : history.data?.length ? <ul className="history-list">{history.data.map(({ checkIn, event, session }) => <li key={checkIn.id}><CheckCircle2 size={15} /><div><strong>{event.title}</strong><span><b className={`attendance-status ${checkIn.attendanceStatus === "attended" ? "is-attended" : "is-absent"}`}>{checkIn.attendanceStatus === "attended" ? "已簽到" : "未簽到"}</b> · {checkIn.method === "qr" ? "QR 掃碼" : "人工備援"} · {new Date(checkIn.checkedInAt).toLocaleString("zh-TW")}</span><small><UserCheck size={12} />{session.label}{event.location ? ` · ${event.location}` : ""}</small></div></li>)}</ul> : <div className="history-empty">目前尚無你的活動簽到紀錄。QR 報到開放時，掃碼確認後會在此顯示。</div>}</section>;
}
