# 交易 Email 整合參考

**用途：** 為 FJUBAC 帳號啟用與密碼重設的 Email 認證碼寄送保留已驗證的整合依據。  
**目前狀態：** 未設定 `RESEND_API_KEY` 與 `RESEND_FROM_EMAIL` 時，系統不會建立可使用的認證碼或外洩任何認證內容，而是回傳 `awaiting_email_configuration`。

## 未來啟用條件

1. 在專案設定中安全提供 `RESEND_API_KEY`。
2. 設定已在 Resend 驗證的寄件人字串 `RESEND_FROM_EMAIL`，格式可為 `FJUBAC <noreply@example.edu>`。
3. 確認校內與校外收件者的 Email 皆以資料庫中經最終核准的 Email 為準。
4. 啟用後，系統會在寄送一次性六位數認證碼前撤銷舊的未使用認證碼，將新碼以雜湊保存，並在 10 分鐘後失效。

## API 參考

Resend 官方 Email API 以 `POST https://api.resend.com/emails` 寄送訊息，需提供 Bearer API 金鑰，並傳送 `from`、`to`、`subject` 及 `html` 或 `text` 欄位；可使用 `Idempotency-Key` 避免重複寄送。[1]

[1]: https://resend.com/docs/api-reference/emails/send-email "Resend｜Send Email API"
