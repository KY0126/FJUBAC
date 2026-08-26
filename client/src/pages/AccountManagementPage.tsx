import { ArrowLeft, Ban, FilePenLine, KeyRound, Search, ShieldCheck, UserCog, UserPlus, UserRoundCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";

type AccountStatusFilter = "all" | "pending_activation" | "active" | "inactive";
type MembershipStatusFilter = "all" | "active" | "inactive" | "alumni";
type PendingAction = "deactivate" | "activate" | "reset" | null;

const statusLabel = { pending_activation: "待啟用", active: "啟用中", inactive: "已停用" } as const;
const membershipLabel = { active: "社員", inactive: "非活躍社員", alumni: "校友" } as const;

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "尚無紀錄";
  return new Date(value).toLocaleString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AccountManagementPage() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = isAuthenticated && user?.role === "admin";
  const [queryDraft, setQueryDraft] = useState("");
  const [query, setQuery] = useState("");
  const [accountStatus, setAccountStatus] = useState<AccountStatusFilter>("all");
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatusFilter>("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ name: "", email: "", studentNumber: "", membershipStatus: "active" as MembershipStatusFilter, cohort: "" });
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionReason, setActionReason] = useState("");
  const utils = trpc.useUtils();
  const listInput = useMemo(() => ({ query: query || undefined, accountStatus: accountStatus === "all" ? undefined : accountStatus, membershipStatus: membershipStatus === "all" ? undefined : membershipStatus }), [query, accountStatus, membershipStatus]);
  const accounts = trpc.accounts.list.useQuery(listInput, { enabled: isAdmin });
  const selected = accounts.data?.find(row => row.user.id === selectedUserId) ?? null;
  const errorToast = (message: string) => toast.error(message || "帳號操作未完成，請稍後再試。");
  const refreshAccounts = async () => { await utils.accounts.list.invalidate(); };
  const updateProfile = trpc.accounts.updateProfile.useMutation({ onSuccess: async () => { toast.success("帳號資料已更新並寫入稽核紀錄。" ); await refreshAccounts(); }, onError: error => errorToast(error.message) });
  const setStatus = trpc.accounts.setStatus.useMutation({ onSuccess: async () => { toast.success("帳號狀態已更新並寫入稽核紀錄。" ); setPendingAction(null); setActionReason(""); await refreshAccounts(); }, onError: error => errorToast(error.message) });
  const resetActivation = trpc.accounts.resetActivation.useMutation({ onSuccess: async () => { toast.success("已重設啟用流程；使用者需重新完成 Email 驗證與密碼設定。" ); setPendingAction(null); setActionReason(""); await refreshAccounts(); }, onError: error => errorToast(error.message) });

  useEffect(() => {
    if (!accounts.data?.length) {
      setSelectedUserId(null);
      return;
    }
    if (!selectedUserId || !accounts.data.some(row => row.user.id === selectedUserId)) setSelectedUserId(accounts.data[0].user.id);
  }, [accounts.data, selectedUserId]);

  useEffect(() => {
    if (!selected) return;
    setDraft({ name: selected.user.name || "", email: selected.user.email || "", studentNumber: selected.user.studentNumber || "", membershipStatus: selected.membership?.status || "active", cohort: selected.membership?.cohort || "" });
  }, [selected]);

  if (!isAuthenticated) return <main className="workspace-gate"><ShieldCheck /><h1>帳號管理需要治理登入</h1><p>此區僅供社長／暫代網站負責人管理社團帳號、啟用狀態與稽核歷程。</p><div className="workspace-gate-actions"><Link href="/account" className="club-primary">社員登入</Link><button type="button" className="club-secondary" onClick={startLogin}>社長治理登入</button></div></main>;
  if (!isAdmin) return <main className="workspace-gate"><Ban /><h1>目前沒有帳號管理權限</h1><p>帳號資料、停用與啟用重設僅能由社長／暫代網站負責人執行，且每項變更都會寫入稽核紀錄。</p><Link href="/workspace" className="club-primary">返回社員工作區</Link></main>;

  const submitSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setQuery(queryDraft.trim()); };
  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    await updateProfile.mutateAsync({ userId: selected.user.id, name: draft.name, email: draft.email, studentNumber: selected.user.accountType === "internal" ? draft.studentNumber : undefined, membershipStatus: selected.membership ? draft.membershipStatus as "active" | "inactive" | "alumni" : undefined, cohort: selected.membership ? draft.cohort : undefined });
  };
  const confirmAction = async () => {
    if (!selected || actionReason.trim().length < 3) return toast.error("請填寫至少 3 個字的操作原因，以保留可追溯紀錄。");
    if (pendingAction === "reset") await resetActivation.mutateAsync({ userId: selected.user.id, reason: actionReason.trim() });
    if (pendingAction === "deactivate") await setStatus.mutateAsync({ userId: selected.user.id, status: "inactive", reason: actionReason.trim() });
    if (pendingAction === "activate") await setStatus.mutateAsync({ userId: selected.user.id, status: "active", reason: actionReason.trim() });
  };

  const pendingCopy = pendingAction === "deactivate" ? { title: "停用帳號", description: "停用後，該使用者無法以社團帳號登入；資料與稽核歷程仍會保留。" } : pendingAction === "activate" ? { title: "復原帳號", description: "復原後，帳號將重新允許登入；請確認社員資格是否仍應有效。" } : { title: "重設啟用流程", description: "此操作會移除現有密碼並使帳號回到待啟用狀態；使用者須重新完成 Email 驗證與密碼設定。" };

  return <main className="account-admin-shell"><header className="workspace-header"><Link href="/manage/workspace" className="back-link"><ArrowLeft size={16} />返回管理工作台</Link><span>ACCOUNT GOVERNANCE</span></header><section className="account-admin-hero"><p className="club-section-number">ACCOUNT CONTROL</p><h1>帳號管理</h1><p>帳號建立沿用招生最終核准流程；此處提供已建立帳號的查詢、編修、停用／復原與啟用重設。系統不提供硬刪除，以保留必要的治理與活動歷程。</p></section><section className="account-admin-content"><div className="account-admin-toolbar"><form onSubmit={submitSearch}><Search size={17} /><input aria-label="搜尋帳號" value={queryDraft} onChange={event => setQueryDraft(event.target.value)} placeholder="姓名、Email 或學號" /><button type="submit" className="club-secondary">搜尋</button></form><div className="account-admin-filters"><label>帳號<select value={accountStatus} onChange={event => setAccountStatus(event.target.value as AccountStatusFilter)}><option value="all">全部狀態</option><option value="pending_activation">待啟用</option><option value="active">啟用中</option><option value="inactive">已停用</option></select></label><label>社員<select value={membershipStatus} onChange={event => setMembershipStatus(event.target.value as MembershipStatusFilter)}><option value="all">全部社員狀態</option><option value="active">社員</option><option value="inactive">非活躍社員</option><option value="alumni">校友</option></select></label></div><Link href="/manage/recruitment" className="account-admin-create"><UserPlus size={16} />由招生核准建立帳號</Link></div><div className="account-admin-layout"><section className="account-admin-list" aria-label="帳號清單"><header><strong>帳號清單</strong><span>{accounts.data?.length ?? 0} 筆</span></header>{accounts.isLoading ? <p>正在讀取帳號資料…</p> : accounts.isError ? <p className="form-error">無法讀取帳號：{accounts.error.message}</p> : accounts.data?.length ? accounts.data.map(row => <button key={row.user.id} type="button" className={selected?.user.id === row.user.id ? "is-selected" : ""} onClick={() => setSelectedUserId(row.user.id)}><span className="account-avatar" aria-hidden="true">{(row.user.name || row.user.email || "?").slice(0, 1).toUpperCase()}</span><span><strong>{row.user.name || "未設定名稱"}</strong><small>{row.user.email || row.user.studentNumber || "未提供識別資訊"}</small></span><em className={`account-status ${row.user.accountStatus}`}>{statusLabel[row.user.accountStatus]}</em></button>) : <p>沒有符合目前條件的帳號。</p>}</section><section className="account-admin-detail">{selected ? <><header><div><p className="club-section-number">ACCOUNT #{selected.user.id}</p><h2>{selected.user.name || "未設定名稱"}</h2><p>{selected.user.accountType === "internal" ? "校內帳號" : selected.user.accountType === "external" ? "校外帳號" : "OAuth 治理帳號"} · 建立於 {formatDate(selected.user.createdAt)}</p></div><UserCog size={28} /></header><div className="account-admin-state"><span className={`account-status ${selected.user.accountStatus}`}>{statusLabel[selected.user.accountStatus]}</span>{selected.membership ? <span>{membershipLabel[selected.membership.status]}</span> : <span>未建立社員資格</span>}<small>最近登入：{formatDate(selected.user.lastSignedIn)}</small></div>{selected.user.accountType === "oauth" || selected.user.id === user?.id ? <div className="form-error">OAuth 治理帳號與目前登入帳號不能在此編修、停用或重設，以避免鎖定網站責任人。</div> : <><form className="account-admin-form" onSubmit={submitProfile}><label>姓名<input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} required maxLength={120} /></label><label>Email<input type="email" value={draft.email} onChange={event => setDraft(current => ({ ...current, email: event.target.value }))} required maxLength={320} /></label>{selected.user.accountType === "internal" ? <label>學號<input value={draft.studentNumber} onChange={event => setDraft(current => ({ ...current, studentNumber: event.target.value }))} required maxLength={32} /></label> : null}{selected.membership ? <><label>社員狀態<select value={draft.membershipStatus} onChange={event => setDraft(current => ({ ...current, membershipStatus: event.target.value as MembershipStatusFilter }))}><option value="active">社員</option><option value="inactive">非活躍社員</option><option value="alumni">校友</option></select></label><label>屆別／年級<input value={draft.cohort} onChange={event => setDraft(current => ({ ...current, cohort: event.target.value }))} maxLength={40} /></label></> : null}<button type="submit" className="club-primary" disabled={updateProfile.isPending}><FilePenLine size={16} />{updateProfile.isPending ? "儲存中…" : "儲存帳號資料"}</button></form><div className="account-admin-actions"><button type="button" className="club-secondary" onClick={() => setPendingAction("reset")}><KeyRound size={16} />重設啟用流程</button>{selected.user.accountStatus === "inactive" ? <button type="button" className="club-primary" onClick={() => setPendingAction("activate")}><UserRoundCheck size={16} />復原帳號</button> : <button type="button" className="account-danger" onClick={() => setPendingAction("deactivate")}><Ban size={16} />停用帳號</button>}</div></>}</> : <div className="account-admin-empty"><UserCog size={28} /><h2>選擇一筆帳號</h2><p>可從左側清單查看帳號狀態與可管理資料。</p></div>}</section></div></section><AlertDialog open={pendingAction !== null} onOpenChange={open => { if (!open) { setPendingAction(null); setActionReason(""); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{pendingCopy.title}</AlertDialogTitle><AlertDialogDescription>{pendingCopy.description}</AlertDialogDescription></AlertDialogHeader><label className="account-action-reason">操作原因<textarea value={actionReason} onChange={event => setActionReason(event.target.value)} rows={3} placeholder="請記錄本次操作的必要原因" /></label><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction disabled={setStatus.isPending || resetActivation.isPending} onClick={event => { event.preventDefault(); void confirmAction(); }}>{setStatus.isPending || resetActivation.isPending ? "處理中…" : "確認執行"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></main>;
}
