export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthStartStr(d = new Date()) {
  return todayStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayStr(d);
}

export function fmtDate(s?: string | null) {
  if (!s) return "";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

let currency = "₹";
export function setCurrency(c: string) {
  currency = c || "₹";
}
export function money(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return `${currency}${v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
export function qty(n: number | string | null | undefined) {
  return Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque"];
export const EMPLOYEE_EXPENSE_CATEGORIES = ["Salary Payment", "Advance", "Medical", "Travel", "Loan/Recovery", "Other Employee Expense"];
export const GENERAL_EXPENSE_CATEGORIES = ["Electricity", "Rent", "Food", "Bank EMI", "Repairs", "Transport", "Other"];
export const DELIVERY_STATUSES = ["Draft", "Delivered", "Partially Approved", "Approved", "Rejected", "Paid"] as const;
