import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Loader2, ShieldCheck, UserRoundCheck } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type ReviewResult = "pass" | "return" | "fail" | "waitlist" | "recommend";

const reviewResultLabels: Record<ReviewResult, string> = {
  pass: "通過",
  return: "要求補件",
  fail: "不建議進入下一關",
  waitlist: "候補建議",
  recommend: "推薦進入下一關",
};

export default function RecruitmentManagement() {
  const { user, loading, isAuthenticated } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [stage, setStage] = useState<"document" | "interview">("document");
  const [reviewResult, setReviewResult] = useState<ReviewResult>("recommend");
  const [reviewComment, setReviewComment] = useState("");
  const clubContext = trpc.club.me.useQuery(undefined, { enabled: isAuthenticated });
  const canReview = user?.role === "admin" || clubContext.data?.permissionGroups.includes("recruitment.review");
  const canFinalize = user?.role === "admin";
  const { data, isLoading, refetch } = trpc.recruitment.management.list.useQuery(undefined, { enabled: Boolean(isAuthenticated && canReview) });
  const selected = useMemo(() => data?.find(entry => entry.application.id === selectedId) ?? data?.[0] ?? null, [data, selectedId]);
  const reviewDetails = trpc.recruitment.management.reviews.useQuery({ applicationId: selected?.application.id ?? 0 }, { enabled: Boolean(selected) && Boolean(isAuthenticated && canReview) });
  const addReview = trpc.recruitment.management.addReview.useMutation({ onSuccess: async () => { setReviewComment(""); await Promise.all([refetch(), reviewDetails.refetch()]); toast.success("審核紀錄已新增"); } });
  const scheduleInterview = trpc.recruitment.management.scheduleInterview.useMutation({ onSuccess: async () => { await Promise.all([refetch(), reviewDetails.refetch()]); toast.success("面試已安排"); } });
  const finalize = trpc.recruitment.management.finalize.useMutation({ onSuccess: async result => { await refetch(); if (result.activationDelivery === "awaiting_email_configuration") toast.message("已核准，帳號啟用待交易 Email 設定後寄送認證碼。"); else toast.success("最終決策已完成"); } });

  const onReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    addReview.mutate({ applicationId: selected.application.id, stage, result: reviewResult, comment: reviewComment || undefined });
  };

  const onInterview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    scheduleInterview.mutate({
      applicationId: selected.application.id,
      startsAt: new Date(String(form.get("startsAt"))),
      endsAt: new Date(String(form.get("endsAt"))),
      format: String(form.get("format")) as "online" | "in_person",
      locationOrLink: String(form.get("locationOrLink") ?? "") || undefined,
    });
  };

  if (loading) return <main className="management-state"><Loader2 className="animate-spin" />正在載入治理工作台…</main>;
  if (!isAuthenticated) return <main className="management-state"><ShieldCheck /><h1>招生治理工作台</h1><p>書審、面試與最終核准僅提供社長與被授權幹部使用。</p><button onClick={startLogin} className="club-primary">以治理帳號登入</button></main>;
  if (!canReview) return <main className="management-state"><AlertTriangle /><h1>目前帳號未具招生審核權限</h1><p>書審與面試由人才發展部長或被指派的招生幹部處理；最終核准則僅限社長。</p><Link href="/" className="club-secondary">返回首頁</Link></main>;

  return (
    <main className="management-shell">
      <header className="management-header"><div><p className="club-section-number">TALENT ACQUISITION & ENGAGEMENT</p><h1>招生治理工作台</h1></div><div><span>{canFinalize ? "社長最終核准" : "人才發展部審核權限"}</span><Link href="/" className="back-link">離開工作台</Link></div></header>
      <section className="email-guard"><AlertTriangle size={18} /><div><strong>帳號啟用寄信尚未設定</strong><p>核准後會建立待啟用會員與稽核紀錄；在設定交易 Email 前，系統不會寄送認證碼或顯示任何認證內容。</p></div></section>
      {isLoading ? <div className="management-state"><Loader2 className="animate-spin" />正在讀取申請資料…</div> : !data?.length ? <section className="management-empty"><ClipboardCheck /><h2>目前沒有招生申請。</h2><p>新的校內或校外申請送出後，將在此依時間順序列出。</p></section> : (
        <section className="management-layout">
          <aside className="application-queue"><header><span>申請佇列</span><b>{data.length}</b></header>{data.map(({ application, cycle }) => <button key={application.id} className={selected?.application.id === application.id ? "active" : ""} onClick={() => setSelectedId(application.id)}><span>{application.applicantType === "internal" ? "校內" : "校外"}</span><strong>{application.applicantName}</strong><small>{cycle.title} · {application.status}</small></button>)}</aside>
          {selected && <div className="application-detail"><header className="detail-header"><div><p className="club-section-number">APPLICATION #{selected.application.id}</p><h2>{selected.application.applicantName}</h2><p>{selected.application.applicantType === "internal" ? selected.application.schoolEmail : selected.application.externalEmail} · {selected.application.grade}</p></div><span className="status-chip">{selected.application.status}</span></header><section className="application-profile"><dl><div><dt>聯絡方式</dt><dd>{selected.application.contact}</dd></div><div><dt>申請梯次</dt><dd>{selected.cycle.title}</dd></div><div className="wide"><dt>申請原因</dt><dd>{selected.application.motivation}</dd></div></dl></section><div className="management-grid"><form className="review-card" onSubmit={onReview}><header><ClipboardCheck /><div><h3>書審／面試紀錄</h3><p>人才發展部長與指定幹部可登錄意見；最終核准仍由社長執行。</p></div></header><div className="review-history">{reviewDetails.data?.reviews.length ? reviewDetails.data.reviews.map(item => <div key={item.id}><strong>{item.stage === "document" ? "書審" : "面試"} · {reviewResultLabels[item.result]}</strong><span>{item.comment || "未填寫評語"}</span></div>) : <p>尚無審核紀錄。</p>}</div><label>階段<select value={stage} onChange={event => setStage(event.target.value as "document" | "interview")}><option value="document">書審</option><option value="interview">面試</option></select></label><label>結果<select value={reviewResult} onChange={event => setReviewResult(event.target.value as ReviewResult)}>{Object.entries(reviewResultLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>內部評語<textarea value={reviewComment} onChange={event => setReviewComment(event.target.value)} rows={4} maxLength={5000} /></label><button type="submit" className="club-primary" disabled={addReview.isPending}>{addReview.isPending ? "儲存中…" : "新增審核紀錄"}</button></form><form className="review-card" onSubmit={onInterview}><header><CalendarClock /><div><h3>面試安排</h3><p>面試排程與細節只限授權審核人員與申請者使用。</p></div></header><label>開始時間<input name="startsAt" type="datetime-local" required /></label><label>結束時間<input name="endsAt" type="datetime-local" required /></label><label>形式<select name="format"><option value="online">線上</option><option value="in_person">實體</option></select></label><label>地點或連結<input name="locationOrLink" maxLength={500} /></label><button type="submit" className="club-primary" disabled={scheduleInterview.isPending}>{scheduleInterview.isPending ? "安排中…" : "儲存面試安排"}</button></form></div>{canFinalize ? <section className="finalize-card"><UserRoundCheck /><div><h3>社長最終決策</h3><p>核准會建立待啟用會員與審計紀錄；因交易 Email 尚未設定，認證碼寄送將被安全保留至後續啟用。</p></div><div className="finalize-actions"><button onClick={() => finalize.mutate({ applicationId: selected.application.id, decision: "waitlisted" })} disabled={finalize.isPending}>列入候補</button><button onClick={() => finalize.mutate({ applicationId: selected.application.id, decision: "rejected" })} disabled={finalize.isPending}>婉拒</button><button className="approve" onClick={() => finalize.mutate({ applicationId: selected.application.id, decision: "approved" })} disabled={finalize.isPending}>{finalize.isPending ? "處理中…" : "核准並建立待啟用帳號"}</button></div></section> : <section className="finalize-card"><ShieldCheck /><div><h3>等待社長最終決策</h3><p>你可以完成書審與面試紀錄；候補、婉拒與核准帳號僅由社長執行。</p></div></section>}</div>}
        </section>
      )}
    </main>
  );
}
