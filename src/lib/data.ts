import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/backend";

// Local types mirror the external LoomTrack schema (source of truth).
// Core tables use a BIGINT `id` (10000+, DB sequence) as both key and display ID; auth user ids stay UUID strings.
export type Business = {
  id: number; company_name: string; address: string; phone: string;
  email: string | null; city: string | null; state: string | null; country: string | null;
  postal_code: string | null; tax_id: string | null; is_active: boolean;
};
export type Membership = {
  id: number; business_id: number; user_id: string; role: string; is_active: boolean;
  businesses: Business | null;
};
export type Machine = { id: number; business_id: number; name: string; is_active: boolean };
export type Product = { id: number; business_id: number; name: string; code: string; default_piece_rate: number; unit: string; is_active: boolean };
export type Employee = { id: number; business_id: number; name: string; phone: string | null; join_date: string | null; is_active: boolean };
export type Customer = { id: number; business_id: number; name: string; phone: string | null; address: string | null; is_active: boolean };
export type Direction = "INCOME" | "EXPENSE";
// id, wage_amount and the audit fields are set by database defaults/triggers — never by the browser.
export type ProductionEntry = {
  id: number; business_id: number; production_date: string; machine_id: number; product_id: number;
  employee_id: number; quantity: number; piece_rate: number; wage_amount: number; notes: string | null; created_at: string;
  updated_at: string | null; created_by: string | null; updated_by: string | null;
};

/** One server-side page of production, newest first, filtered by date range before paging. */
export function useProductionPage(from: string, to: string, page: number, pageSize = 25) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["production_entries", bid, "page", from, to, page, pageSize],
    enabled: !!bid,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const start = page * pageSize;
      const { data, error, count } = await db.from("production_entries").select("*", { count: "exact" }).eq("business_id", bid)
        .gte("production_date", from).lte("production_date", to)
        .order("production_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(start, start + pageSize - 1);
      if (error) throw error;
      return { rows: data as ProductionEntry[], total: (count as number | null) ?? 0 };
    },
  });
}

/** Totals for the full date range via the secure production_summary RPC (membership-checked in the database). */
export function useProductionTotals(from: string, to: string) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["production_entries", bid, "totals", from, to],
    enabled: !!bid,
    queryFn: async () => {
      const { data, error } = await db.rpc("production_summary", { p_business_id: bid, p_from: from, p_to: to });
      if (error) throw error;
      const r = (Array.isArray(data) ? data[0] : data) as { total_quantity?: number; total_wages?: number; entry_count?: number } | null;
      return { qty: Number(r?.total_quantity ?? 0), wages: Number(r?.total_wages ?? 0), count: Number(r?.entry_count ?? 0) };
    },
  });
}

/** Server-side paged master list for the current business, newest record first. */
export function useMasterPage<T>(table: string, page: number, pageSize = 25) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: [table, bid, "page", page, pageSize],
    enabled: !!bid,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const start = page * pageSize;
      const { data, error, count } = await db.from(table).select("*", { count: "exact" }).eq("business_id", bid)
        .order("id", { ascending: false }).range(start, start + pageSize - 1);
      if (error) throw error;
      return { rows: data as T[], total: (count as number | null) ?? 0 };
    },
  });
}

/** Resolve auth user ids to a readable name (profiles.full_name → email). Unreadable profiles fall back to the signed-in user's email or "User". */
export function useUserNames(ids: (string | null | undefined)[]) {
  const uniq = [...new Set(ids.filter((x): x is string => !!x))].sort();
  return useQuery({
    queryKey: ["profiles", uniq],
    enabled: uniq.length > 0,
    queryFn: async () => {
      const map: Record<string, string> = {};
      const { data } = await db.from("profiles").select("user_id,full_name,email").in("user_id", uniq);
      (data ?? []).forEach((p: { user_id: string; full_name: string | null; email: string | null }) => {
        const n = p.full_name?.trim() || p.email?.trim();
        if (n) map[p.user_id] = n;
      });
      const { data: u } = await supabase.auth.getUser();
      if (u.user && !map[u.user.id]) map[u.user.id] = (u.user.user_metadata?.["full_name"] as string | undefined) || u.user.email || "You";
      return map;
    },
  });
}

export function useProductionEntries(from: string, to: string) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["production_entries", bid, from, to],
    enabled: !!bid,
    queryFn: async () => {
      const { data, error } = await db.from("production_entries").select("*").eq("business_id", bid)
        .gte("production_date", from).lte("production_date", to)
        .order("production_date", { ascending: false }).order("created_at", { ascending: false }).limit(5000);
      if (error) throw error;
      return data as ProductionEntry[];
    },
  });
}
/** Latest N production entries for the current business, newest first. */
export function useRecentProduction(limit = 5) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["production_entries", bid, "recent", limit],
    enabled: !!bid,
    queryFn: async () => {
      const { data, error } = await db.from("production_entries").select("*").eq("business_id", bid)
        .order("production_date", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data as ProductionEntry[];
    },
  });
}
export type PaymentType = { id: number; business_id: number | null; description: string; direction: Direction; is_active: boolean };
export type Payment = {
  id: number; business_id: number; payment_date: string; payment_type_id: number;
  amount: number; employee_id: number | null; description: string | null; created_at: string;
  created_by?: string | null; updated_at?: string | null; updated_by?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export async function fetchMembership(): Promise<Membership | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await db.from("business_users")
    .select("id,business_id,user_id,role,is_active,businesses(*)")
    .eq("user_id", u.user.id).eq("is_active", true).order("created_at").limit(1).maybeSingle();
  if (error) throw error;
  return data as Membership | null;
}

export const useMembership = () => useQuery({ queryKey: ["membership"], queryFn: fetchMembership, staleTime: 60_000 });

/** Current business id; every business query below is scoped to it. */
export function useBusinessId() {
  return useMembership().data?.business_id;
}

function useScoped<T>(key: string, table: string, order: string) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: [table, bid, key],
    enabled: !!bid,
    queryFn: async () => {
      const { data, error } = await db.from(table).select("*").eq("business_id", bid).order(order);
      if (error) throw error;
      return data as T[];
    },
  });
}

export const useMachines = () => useScoped<Machine>("all", "machines", "name");
export const useProducts = () => useScoped<Product>("all", "products", "name");
export const useEmployees = () => useScoped<Employee>("all", "employees", "name");
export const useCustomers = () => useScoped<Customer>("all", "customers", "name");

// Standard seeded types may be shared (business_id null) or per-business.
export function usePaymentTypes() {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["payment_types", bid],
    enabled: !!bid,
    queryFn: async () => {
      const { data, error } = await db.from("payment_types").select("*")
        .or(`business_id.eq.${bid},business_id.is.null`).order("id");
      if (error) throw error;
      return data as PaymentType[];
    },
  });
}

export function usePayments(from: string, to: string) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["payments", bid, from, to],
    enabled: !!bid,
    queryFn: async () => {
      const { data, error } = await db.from("payments").select("*").eq("business_id", bid)
        .gte("payment_date", from).lte("payment_date", to)
        .order("payment_date", { ascending: false }).order("created_at", { ascending: false }).limit(5000);
      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function useSettings() {
  const m = useMembership();
  return { ...m, data: m.data ? { business_name: m.data.businesses?.company_name ?? "", currency: "₹" } : undefined };
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function nameMap<T extends { id: number; name: string }>(list?: T[]) {
  const m: Record<string, string> = {};
  list?.forEach((x) => (m[x.id] = x.name));
  return m;
}

export function sum<T>(list: T[] | undefined, f: (x: T) => number) {
  return (list ?? []).reduce((a, x) => a + Number(f(x) || 0), 0);
}

export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Something went wrong";
}

/** Light rows (employee_id, quantity, wage_amount) for employee-wise wage grouping; capped, date range required. */
export const WAGE_ROW_CAP = 20000;
export function useWageRows(from: string, to: string, employeeId: string) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["production_entries", bid, "wage_rows", from, to, employeeId],
    enabled: !!bid && !!from && !!to,
    queryFn: async () => {
      let q = db.from("production_entries").select("employee_id, quantity, wage_amount").eq("business_id", bid)
        .gte("production_date", from).lte("production_date", to);
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q.limit(WAGE_ROW_CAP);
      if (error) throw error;
      return data as Pick<ProductionEntry, "employee_id" | "quantity" | "wage_amount">[];
    },
  });
}

/** One employee's production entries for a period, newest first, server-paged. */
export function useEmployeeEntriesPage(employeeId: number, from: string, to: string, page: number, pageSize = 25) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["production_entries", bid, "emp_page", employeeId, from, to, page, pageSize],
    enabled: !!bid && !!employeeId,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const start = page * pageSize;
      const { data, error, count } = await db.from("production_entries").select("*", { count: "exact" }).eq("business_id", bid)
        .eq("employee_id", employeeId).gte("production_date", from).lte("production_date", to)
        .order("production_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(start, start + pageSize - 1);
      if (error) throw error;
      return { rows: data as ProductionEntry[], total: (count as number | null) ?? 0 };
    },
  });
}

export type ProdFilter = { from: string; to: string; employeeId: string; machineId: string; productId: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyProdFilter(q: any, bid: number, f: ProdFilter) {
  q = q.eq("business_id", bid).gte("production_date", f.from).lte("production_date", f.to);
  if (f.employeeId) q = q.eq("employee_id", f.employeeId);
  if (f.machineId) q = q.eq("machine_id", f.machineId);
  if (f.productId) q = q.eq("product_id", f.productId);
  return q;
}

/** Light rows for production summary charts; capped, date range required. */
export function useProductionSummaryRows(f: ProdFilter) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["production_entries", bid, "summary_rows", f],
    enabled: !!bid && !!f.from && !!f.to,
    queryFn: async () => {
      const { data, error } = await applyProdFilter(
        db.from("production_entries").select("production_date, employee_id, machine_id, product_id, quantity, wage_amount"), bid!, f,
      ).limit(WAGE_ROW_CAP);
      if (error) throw error;
      return data as Pick<ProductionEntry, "production_date" | "employee_id" | "machine_id" | "product_id" | "quantity" | "wage_amount">[];
    },
  });
}

/** Filtered production detail, newest first, server-paged. */
export function useProductionFilteredPage(f: ProdFilter, page: number, pageSize = 25) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["production_entries", bid, "filtered_page", f, page, pageSize],
    enabled: !!bid && !!f.from && !!f.to,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const start = page * pageSize;
      const { data, error, count } = await applyProdFilter(db.from("production_entries").select("*", { count: "exact" }), bid!, f)
        .order("production_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(start, start + pageSize - 1);
      if (error) throw error;
      return { rows: data as ProductionEntry[], total: (count as number | null) ?? 0 };
    },
  });
}

/** Payments view filter; direction is resolved to payment_type_id list by the caller (from payment_types.direction). */
export type PayFilter = { from: string; to: string; typeIds: number[] | null };
function applyPayFilter(q: any, bid: number, f: PayFilter) {
  q = q.eq("business_id", bid).gte("payment_date", f.from).lte("payment_date", f.to);
  if (f.typeIds) q = q.in("payment_type_id", f.typeIds.length ? f.typeIds : [-1]);
  return q;
}
export function usePaymentsPage(f: PayFilter, page: number, pageSize = 25) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["payments", bid, "page", f, page, pageSize],
    enabled: !!bid && !!f.from && !!f.to,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const start = page * pageSize;
      const { data, error, count } = await applyPayFilter(db.from("payments").select("*", { count: "exact" }), bid!, f)
        .order("payment_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(start, start + pageSize - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Payment[], total: count ?? 0 };
    },
  });
}
export const PAY_ROW_CAP = 20000;
/** Light rows (type + amount) for period totals; capped. */
export function usePaymentTotalsRows(f: PayFilter) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["payments", bid, "totals", f],
    enabled: !!bid && !!f.from && !!f.to,
    queryFn: async () => {
      const { data, error } = await applyPayFilter(db.from("payments").select("payment_type_id, amount"), bid!, f).limit(PAY_ROW_CAP);
      if (error) throw error;
      return (data ?? []) as Pick<Payment, "payment_type_id" | "amount">[];
    },
  });
}

// deliveries: bill_amount is stored; the browser sends approved × rate (a DB trigger, if any, stays authoritative).
export type Delivery = {
  id: number; business_id: number; delivery_date: string; customer_id: number; product_id: number;
  delivered_qty: number; approved_qty: number; rejected_qty: number; rate: number; bill_amount: number;
  status: string; notes: string | null; created_at: string; created_by: string | null; updated_at: string | null; updated_by: string | null;
};
export type DelFilter = { from: string; to: string; customerId: string; productId: string };
function applyDelFilter(q: any, bid: number, f: DelFilter) {
  q = q.eq("business_id", bid).gte("delivery_date", f.from).lte("delivery_date", f.to);
  if (f.customerId) q = q.eq("customer_id", Number(f.customerId));
  if (f.productId) q = q.eq("product_id", Number(f.productId));
  return q;
}
export function useDeliveriesPage(f: DelFilter, page: number, pageSize = 25) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["deliveries", bid, "page", f, page, pageSize],
    enabled: !!bid && !!f.from && !!f.to,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const start = page * pageSize;
      const { data, error, count } = await applyDelFilter(db.from("deliveries").select("*", { count: "exact" }), bid!, f)
        .order("delivery_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(start, start + pageSize - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Delivery[], total: count ?? 0 };
    },
  });
}
export const DEL_ROW_CAP = 20000;
export function useDeliveryTotalsRows(f: DelFilter) {
  const bid = useBusinessId();
  return useQuery({
    queryKey: ["deliveries", bid, "totals", f],
    enabled: !!bid && !!f.from && !!f.to,
    queryFn: async () => {
      const { data, error } = await applyDelFilter(db.from("deliveries").select("delivered_qty, approved_qty, rejected_qty, bill_amount"), bid!, f).limit(DEL_ROW_CAP);
      if (error) throw error;
      return (data ?? []) as Pick<Delivery, "delivered_qty" | "approved_qty" | "rejected_qty" | "bill_amount">[];
    },
  });
}
