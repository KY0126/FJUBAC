export type EmailDeliveryState = "ready" | "awaiting_email_configuration" | "failed";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function getEmailDeliveryState(): EmailDeliveryState {
  return process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL ? "ready" : "awaiting_email_configuration";
}

export async function sendVerificationCodeEmail(input: { to: string; recipientName?: string | null; code: string; purpose: "activation" | "password_reset" }) {
  if (getEmailDeliveryState() !== "ready") return { state: "awaiting_email_configuration" as const };
  const action = input.purpose === "activation" ? "啟用帳號" : "重設密碼";
  const greeting = input.recipientName ? `${input.recipientName}，` : "";
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `fjubac-${input.purpose}-${input.to}-${Date.now()}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [input.to],
      subject: `FJUBAC｜${action}認證碼`,
      text: `${greeting}你的 FJUBAC ${action}認證碼為 ${input.code}。認證碼將在 10 分鐘後失效，請勿轉寄或告知他人。`,
      html: `<p>${greeting}你的 FJUBAC ${action}認證碼為：</p><p style="font-size:28px;letter-spacing:6px;font-weight:700">${input.code}</p><p>認證碼將在 10 分鐘後失效，請勿轉寄或告知他人。</p>`,
    }),
  });
  if (!response.ok) return { state: "failed" as const };
  return { state: "ready" as const };
}
