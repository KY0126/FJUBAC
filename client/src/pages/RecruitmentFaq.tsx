const questions = [
  { question: "校內與校外申請者都可以加入嗎？", answer: "可以。請依自身身份選擇校內或校外梯次；每個梯次的說明、截止時間與面試安排會分別顯示。" },
  { question: "申請流程包含哪些階段？", answer: "申請送出後會依梯次進行書面審查與面試。人才發展部及指定幹部負責審查與安排，最終核准由社長決定。" },
  { question: "社員與專案生有什麼差別？", answer: "專案生一定是社員，並需參與指定專案的實作；一般社員則可依活動與資源範圍參與社團學習，不一定加入專案。" },
  { question: "核准後如何啟用帳號？", answer: "核准後會依帳號啟用流程進行 Email 驗證與密碼設定。實際寄送服務會在社團完成交易 Email 設定後啟用。" },
  { question: "活動和資源每位社員都能看到嗎？", answer: "公開、社員、專案與幹部活動／資源有不同範圍。登入後，系統會依有效會員、專案指派與幹部職務顯示你可查看的內容。" },
];

export function RecruitmentFaq() {
  return <section id="recruitment-faq" className="recruitment-faq" aria-labelledby="recruitment-faq-title"><header><p className="club-section-number">FAQ</p><h2 id="recruitment-faq-title">招生常見問題</h2><p>先確認申請資格與流程；實際時程仍以各招生梯次頁面為準。</p></header><div>{questions.map((item, index) => <details key={item.question}><summary><span>{String(index + 1).padStart(2, "0")}</span>{item.question}</summary><p>{item.answer}</p></details>)}</div></section>;
}
