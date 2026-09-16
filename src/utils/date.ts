/** 日期展示工具（展示层）。 */

/** 本地时区 YYYY-MM-DD */
export function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** 今天的中文短日期，如「9月16日 周三」 */
export function todayLabel(): string {
  const now = new Date();
  return `${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAYS[now.getDay()]}`;
}

/** ISO 时间字符串 → 「09:30」 */
export function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** epoch ms → 「09:30」 */
export function timeLabelFromEpoch(epoch: number): string {
  return timeLabel(new Date(epoch).toISOString());
}

/** epoch ms → 「MM-DD HH:mm」 */
export function dateTimeLabelFromEpoch(epoch: number): string {
  const d = new Date(epoch);
  const md = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`;
  return `${md} ${timeLabel(d.toISOString())}`;
}
