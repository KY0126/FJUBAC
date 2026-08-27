import { CheckSquare, CircleAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";

const labels = { todo: "待處理", in_progress: "進行中", blocked: "受阻", completed: "已完成", cancelled: "已取消" } as const;

function formatDueAt(value: Date | string | null) {
  return value ? new Date(value).toLocaleDateString("zh-TW", { year: "numeric", month: "short", day: "numeric" }) : "未設定期限";
}

export function MyTaskSummary() {
  const mine = trpc.workspace.projectWork.mine.useQuery();
  return <section className="my-task-summary" aria-labelledby="my-task-heading"><div className="workspace-section-head"><div><p className="club-section-number">01 / MY TASKS</p><h2 id="my-task-heading">我的待辦</h2></div><CheckSquare size={20} /></div>{mine.isLoading ? <p className="project-work-empty">正在讀取你的實際任務…</p> : mine.isError ? <p className="project-work-empty">無法載入待辦：{mine.error.message}</p> : mine.data?.length ? <ul className="my-task-list">{mine.data.map(({ task, project }) => <li key={task.id}><div><strong>{task.title}</strong><span>{project.title} · {labels[task.status]}</span></div><div>{task.priority === "high" ? <span className="task-priority"><CircleAlert size={14} />高優先</span> : null}<small>{formatDueAt(task.dueAt)}</small></div></li>)}</ul> : <p className="project-work-empty">目前沒有指派給你的實際待辦。被指派任務後會顯示於此。</p>}</section>;
}
