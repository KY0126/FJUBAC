import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, LockKeyhole, MailCheck, ShieldAlert } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type Screen = "login" | "request" | "verify" | "password" | "success";
type Purpose = "activation" | "password_reset";

export default function AccountAccessPage() {
  const [screen, setScreen] = useState<Screen>("login");
  const [identifier, setIdentifier] = useState("");
  const [purpose, setPurpose] = useState<Purpose>("activation");
  const [notice, setNotice] = useState<string | null>(null);
  const requestCode = trpc.recruitment.account.requestCode.useMutation();
  const verifyCode = trpc.recruitment.account.verifyCode.useMutation();
  const setPassword = trpc.recruitment.account.setPassword.useMutation();
  const login = trpc.recruitment.account.login.useMutation();

  const request = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    const result = await requestCode.mutateAsync({ identifier, purpose });
    if (result.delivery === "ready") {
      setScreen("verify");
      setNotice("認證碼已寄出。請查看你的學校信箱或外部 Email。\n");
    } else if (result.delivery === "awaiting_email_configuration") {
      setNotice("帳號資料已建立，但交易 Email 尚未設定。請等待社團啟用寄送服務後，再回到此頁取得認證碼。");
    } else {
      setNotice("若此帳號符合目前流程，系統會依帳號狀態提供後續指示。請確認識別資料後再試。\n");
    }
  };

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    const form = new FormData(event.currentTarget);
    await verifyCode.mutateAsync({ identifier, purpose, code: String(form.get("code") ?? "") });
    setScreen("password");
  };

  const password = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    const form = new FormData(event.currentTarget);
    await setPassword.mutateAsync({ password: String(form.get("password") ?? ""), confirmPassword: String(form.get("confirmPassword") ?? "") });
    setScreen("success");
  };

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    const form = new FormData(event.currentTarget);
    await login.mutateAsync({ identifier, password: String(form.get("password") ?? "") });
    setScreen("success");
  };

  const error = requestCode.error?.message || verifyCode.error?.message || setPassword.error?.message || login.error?.message;

  return <main className="account-shell"><header className="account-header"><Link href="/" className="back-link"><ArrowLeft size={16} />返回 FJUBAC</Link><span>MEMBER ACCESS</span></header><section className="account-card"><div className="account-icon">{screen === "login" ? <KeyRound /> : screen === "verify" ? <MailCheck /> : screen === "password" ? <LockKeyhole /> : <CheckCircle2 />}</div>{screen === "login" && <><p className="club-section-number">MEMBER SIGN IN</p><h1>社員登入</h1><p className="account-description">校內社員請輸入學號；校外社員請輸入通過申請時使用的 Email。</p><form onSubmit={signIn} className="account-form"><label>學號或 Email<input value={identifier} onChange={event => setIdentifier(event.target.value)} required minLength={3} /></label><label>密碼<input name="password" type="password" required autoComplete="current-password" /></label><button className="club-primary" disabled={login.isPending}>{login.isPending ? "登入中…" : "登入"}</button></form><div className="account-options"><button onClick={() => { setPurpose("activation"); setScreen("request"); setNotice(null); }}>首次啟用帳號</button><button onClick={() => { setPurpose("password_reset"); setScreen("request"); setNotice(null); }}>忘記密碼</button></div><div className="account-public-exit"><p>尚未具備社員帳號？可先查看公開資訊與招生說明。</p><Link href="/" className="club-secondary">目前不是社員？返回公開網站</Link></div></>}{screen === "request" && <><p className="club-section-number">{purpose === "activation" ? "ACCOUNT ACTIVATION" : "PASSWORD RESET"}</p><h1>{purpose === "activation" ? "啟用帳號" : "重設密碼"}</h1><p className="account-description">輸入你的學號或 Email。系統僅會向已核准帳號登錄的 Email 寄送一次性認證碼。</p><form onSubmit={request} className="account-form"><label>學號或 Email<input value={identifier} onChange={event => setIdentifier(event.target.value)} required minLength={3} /></label><button className="club-primary" disabled={requestCode.isPending}>{requestCode.isPending ? "確認中…" : "取得認證碼"}</button></form><button className="account-text-button" onClick={() => { setScreen("login"); setNotice(null); }}>返回登入</button></>}{screen === "verify" && <><p className="club-section-number">EMAIL VERIFICATION</p><h1>輸入認證碼</h1><p className="account-description">認證碼有效期為 10 分鐘。輸入錯誤累積 5 次後失效，需要重新申請。</p><form onSubmit={verify} className="account-form"><label>6 位數認證碼<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" /></label><button className="club-primary" disabled={verifyCode.isPending}>{verifyCode.isPending ? "驗證中…" : "驗證並繼續"}</button></form><button className="account-text-button" onClick={() => { setScreen("request"); setNotice(null); }}>重新申請認證碼</button></>}{screen === "password" && <><p className="club-section-number">SECURE PASSWORD</p><h1>設定新密碼</h1><p className="account-description">密碼至少需 12 個字元。完成設定後，系統會以加密 session 登入你的社員帳號。</p><form onSubmit={password} className="account-form"><label>新密碼<input name="password" type="password" minLength={12} required autoComplete="new-password" /></label><label>再次輸入新密碼<input name="confirmPassword" type="password" minLength={12} required autoComplete="new-password" /></label><button className="club-primary" disabled={setPassword.isPending}>{setPassword.isPending ? "設定中…" : "完成設定"}</button></form></>}{screen === "success" && <><p className="club-section-number">ACCOUNT READY</p><h1>帳號已就緒。</h1><p className="account-description">你現在可以使用社員服務、活動報名與已被授權的資源。專案與幹部工作區將依你的有效指派顯示。</p><div className="account-success-actions"><Link href="/me" className="club-primary">前往個人中心</Link><Link href="/workspace" className="club-secondary">前往社員工作區</Link></div></>}{(notice || error) && <div className={error ? "account-alert error" : "account-alert"}>{error ? <ShieldAlert /> : <AlertCircle />}<span>{error || notice}</span></div>}</section></main>;
}
