import { CheckCircle2, ClipboardPenLine, MailCheck, MessageSquareMore, SearchCheck } from "lucide-react";

const steps = [
  { label: "申請送出", detail: "依校內或校外梯次填寫資料", Icon: ClipboardPenLine },
  { label: "書面審查", detail: "人才發展部依梯次審閱", Icon: SearchCheck },
  { label: "面試安排", detail: "依通知完成交流與評估", Icon: MessageSquareMore },
  { label: "最終結果", detail: "由社長完成最終核准", Icon: CheckCircle2 },
  { label: "帳號啟用", detail: "Email 驗證後設定密碼", Icon: MailCheck },
];

export function RecruitmentProgress() {
  return <section className="recruitment-progress" aria-labelledby="recruitment-progress-title"><header><p className="club-section-number">APPLICATION JOURNEY</p><h2 id="recruitment-progress-title">申請流程</h2><p>每一梯次的實際截止時間與面試安排，以招生頁顯示資訊為準。</p></header><ol>{steps.map((step, index) => <li key={step.label}><span className="recruitment-progress-dot" aria-hidden="true"><step.Icon size={17} /></span><div><strong><small>{String(index + 1).padStart(2, "0")}</small>{step.label}</strong><p>{step.detail}</p></div></li>)}</ol></section>;
}
