import { Clock3 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const MIN_SECONDS = 2.5;
const MAX_SECONDS = 12;
const DEFAULT_SECONDS = 3.8;

export function DepartmentCarouselSettingsPanel() {
  const settings = trpc.content.displaySettings.manageRead.useQuery();
  const utils = trpc.useUtils();
  const [seconds, setSeconds] = useState(DEFAULT_SECONDS);
  useEffect(() => {
    if (settings.data) setSeconds(settings.data.departmentCarouselIntervalMs / 1000);
  }, [settings.data]);
  const update = trpc.content.displaySettings.update.useMutation({
    onSuccess: async () => {
      toast.success("首頁部門輪播速度已更新。\n");
      await utils.content.displaySettings.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const intervalMs = Math.round(seconds * 1000);
    if (intervalMs < MIN_SECONDS * 1000 || intervalMs > MAX_SECONDS * 1000) return toast.error("輪播速度請設定在 2.5 至 12 秒之間。\n");
    await update.mutateAsync({ departmentCarouselIntervalMs: intervalMs });
  };
  return <section className="manage-form governance-card department-carousel-settings"><header><Clock3 /><div><h2>首頁部門輪播</h2><p>調整公開首頁五部門卡片的自動切換速度。</p></div></header>{settings.isLoading ? <p className="governance-detail">正在讀取目前設定…</p> : settings.isError ? <p className="form-error">無法讀取輪播設定：{settings.error.message}</p> : <form className="inline-management-form" onSubmit={submit}><label>切換秒數<input aria-label="部門輪播切換秒數" type="number" min={MIN_SECONDS} max={MAX_SECONDS} step="0.1" value={seconds} onChange={event => setSeconds(Number(event.target.value))} required /></label><p className="governance-detail">預設 3.8 秒；可設定 2.5–12 秒。滑鼠停留、鍵盤焦點、手動暫停、頁面不可見與減少動態偏好時仍會停止自動輪播。</p><button className="club-secondary" disabled={update.isPending}>{update.isPending ? "儲存中…" : "儲存輪播速度"}</button></form>}</section>;
}
