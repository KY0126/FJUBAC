import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, FileText, Loader2, UsersRound } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type ApplicantType = "internal" | "external";

export default function RecruitmentPage() {
  const { data: cycles, isLoading } = trpc.recruitment.listOpen.useQuery();
  const [applicantType, setApplicantType] = useState<ApplicantType>("internal");
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const submitApplication = trpc.recruitment.submit.useMutation({ onSuccess: result => setSubmittedId(result.applicationId) });

  const availableCycles = useMemo(() => cycles?.filter(cycle => cycle.audienceType === applicantType) ?? [], [applicantType, cycles]);
  const selectedCycle = availableCycles.find(cycle => cycle.id === cycleId) ?? availableCycles[0] ?? null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!selectedCycle) return;
    submitApplication.mutate({
      cycleId: selectedCycle.id,
      applicantType,
      applicantName: String(form.get("applicantName") ?? ""),
      studentNumber: applicantType === "internal" ? String(form.get("studentNumber") ?? "") : undefined,
      schoolEmail: applicantType === "internal" ? String(form.get("schoolEmail") ?? "") : undefined,
      externalEmail: applicantType === "external" ? String(form.get("externalEmail") ?? "") : undefined,
      grade: String(form.get("grade") ?? ""),
      contact: String(form.get("contact") ?? ""),
      motivation: String(form.get("motivation") ?? ""),
    });
  };

  if (submittedId) {
    return <main className="recruitment-shell"><section className="application-result"><CheckCircle2 /><p className="club-section-number">APPLICATION RECEIVED</p><h1>申請已送出。</h1><p>系統已建立申請編號 <strong>#{submittedId}</strong>。人才發展部將依此梯次流程進行書審與面試安排；後續結果會寄送至你填寫的 Email。</p><Link href="/" className="club-primary">返回社團首頁</Link></section></main>;
  }

  return (
    <main className="recruitment-shell">
      <header className="recruitment-header"><Link href="/" className="back-link"><ArrowLeft size={16} />返回 FJUBAC</Link><span>RECRUITMENT PORTAL</span></header>
      <section className="recruitment-intro"><div><p className="club-section-number">JOINING PATH / 2026</p><h1>從一份申請，<br /><em>開始下一段實作。</em></h1><p>請依你的身份選擇校內或校外招生梯次。每一梯次都有獨立的申請說明、書審與面試時程；最終核准後，才能以 Email 認證碼啟用帳號。</p></div><aside><FileText /><strong>申請流程</strong><span>申請 → 書審 → 面試 → 結果 → 帳號啟用</span></aside></section>
      <section className="recruitment-content">
        <div className="audience-toggle" role="tablist" aria-label="選擇招生梯次">
          <button role="tab" aria-selected={applicantType === "internal"} onClick={() => { setApplicantType("internal"); setCycleId(null); }}>校內申請者</button>
          <button role="tab" aria-selected={applicantType === "external"} onClick={() => { setApplicantType("external"); setCycleId(null); }}>校外申請者</button>
        </div>
        {isLoading ? <div className="recruitment-state"><Loader2 className="animate-spin" />正在讀取招生梯次…</div> : !selectedCycle ? (
          <div className="recruitment-state empty"><Clock3 /><div><strong>目前沒有開放的{applicantType === "internal" ? "校內" : "校外"}招生梯次。</strong><p>請留意 FJUBAC 公開公告，或在下一個梯次開放後再回到本頁申請。</p></div></div>
        ) : (
          <form onSubmit={submit} className="application-form">
            <div className="cycle-panel"><p className="club-section-number">OPEN CYCLE</p><h2>{selectedCycle.title}</h2><p>{selectedCycle.description}</p><dl><div><dt>書審截止</dt><dd>{new Date(selectedCycle.documentDeadlineAt).toLocaleString("zh-TW")}</dd></div>{selectedCycle.interviewStartsAt && <div><dt>面試開始</dt><dd>{new Date(selectedCycle.interviewStartsAt).toLocaleString("zh-TW")}</dd></div>}</dl>{availableCycles.length > 1 && <select value={selectedCycle.id} onChange={event => setCycleId(Number(event.target.value))}>{availableCycles.map(cycle => <option value={cycle.id} key={cycle.id}>{cycle.title}</option>)}</select>}</div>
            <div className="application-fields"><div className="form-heading"><UsersRound /><div><h2>填寫申請資料</h2><p>僅蒐集書審、面試與聯絡所需資訊。申請資料僅供人才發展部授權審核者與社長使用。</p></div></div>{submitApplication.error && <p className="form-error"><AlertCircle />{submitApplication.error.message}</p>}<div className="form-grid"><label>姓名<input name="applicantName" required maxLength={120} /></label><label>系級／年級<input name="grade" required maxLength={80} placeholder="例：企管三甲／大三" /></label>{applicantType === "internal" ? <><label>學號<input name="studentNumber" required maxLength={32} /></label><label>學校信箱<input name="schoolEmail" type="email" required maxLength={320} /></label></> : <label className="full">Email<input name="externalEmail" type="email" required maxLength={320} /></label>}<label className="full">聯絡方式<input name="contact" required maxLength={120} placeholder="例：手機、LINE ID 或其他可聯絡方式" /></label><label className="full">申請原因<textarea name="motivation" required minLength={20} maxLength={5000} rows={7} placeholder="請說明你希望在 FJUBAC 學習、實作或探索的方向。" /></label></div><button type="submit" className="club-primary" disabled={submitApplication.isPending}>{submitApplication.isPending ? "送出中…" : "送出申請資料"}</button></div>
          </form>
        )}
      </section>
    </main>
  );
}
