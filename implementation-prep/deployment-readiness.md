# FJUBAC 正式發布與後續啟用檢查

## 已完成的部署前程式準備

網站已具備每日治理端點 `/api/scheduled/daily-governance`、`scheduledJobs` 狀態列、任期提醒、到期撤權、過期認證碼清理及稽核紀錄。端點僅接受平台排程呼叫，並依已登錄的 task UID 檢查請求；因此不需要也不應以常駐程序或 `setInterval` 取代平台排程。

## 正式發布後的必要操作

完成此版本部署後，請在網站管理介面按下 **Publish**。部署成功後，再建立專案級每日治理排程，建議排程為每天 UTC 09:00，命令如下。

```bash
manus-heartbeat create \
  --name fjubac-daily-governance \
  --cron "0 0 9 * * *" \
  --path /api/scheduled/daily-governance \
  --description "Daily officer term reminders, auto-revocation, and OTP cleanup"
```

建立指令會回傳 task UID。必須將該 UID 寫入 `scheduledJobs` 中 `key = 'daily-governance'` 的 `scheduleCronTaskUid` 欄位，排程端點才會接受平台呼叫。此操作在未部署前不可執行；部署完成後請通知網站負責人續辦。

## 延後設定的交易 Email

目前 `RESEND_API_KEY` 與 `RESEND_FROM_EMAIL` 尚未設定。這是刻意保留的安全狀態：系統不會建立、寄送或顯示可用的 OTP。設定完成並驗證寄件網域後，才能啟用核准後的帳號啟用、首次登入與忘記密碼寄信。不得以測試金鑰、假寄件人或前端顯示驗證碼取代此流程。

## 正式公開前的治理簽核

D-15 的共用信箱、共同資產持有與 MFA 已延至下一次 MVP，但公開服務前仍需由社長簽核暫時資產持有人、服務清冊、復原方式、續費責任與交接日期。這份簽核應與部署紀錄分開保存，並在交接時一併更新。
