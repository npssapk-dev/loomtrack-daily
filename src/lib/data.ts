import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Machine = { id: string; name: string; active: boolean };
export type Product = { id: string; name: string; code: string; default_rate: number; unit: string; active: boolean };
export type Employee = { id: string; name: string; phone: string | null; join_date: string | null; active: boolean };
export type Customer = { id: string; name: string; phone: string | null; address: string | null; active: boolean };

export type Production = {
  id: string; production_date: string; machine_id: string; product_id: string; employee_id: string;
  quantity: number; piece_rate: number; calculated_wage: number; remarks: string | null; created_at: string;
};
export type Expense = {
  id: string; expense_date: string; expense_type: "employee" | "general"; category: string;
  employee_id: string | null; amount: number; payment_method: string | null; remarks: string | null;
};
export type Income = {
  id: string; income_date: string; income_type: "Sales" | "Other Income"; customer_id: string | null;
  delivery_id: string | null; amount: number; payment_method: string | null; reference: string | null; remarks: string | null;
};
export type Delivery = {
  id: string; delivery_date: string; customer_id: string; product_id: string; delivered_qty: number;
  approved_qty: number; rejected_qty: number; rate: number; bill_amount: number; status: string; remarks: string | null;
};

// Loose client handle so generic table names work without regenerated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

async function all<T>(table: string, order: string, asc = true): Promise<T[]> {
  const { data, error } = await db.from(table).select("*").order(order, { ascending: asc });
  if (error) throw error;
  return data as T[];
}

export const useMachines = () => useQuery({ queryKey: ["machines"], queryFn: () => all<Machine>("machines", "name") });
export const useProducts = () => useQuery({ queryKey: ["products"], queryFn: () => all<Product>("products", "name") });
export const useEmployees = () => useQuery({ queryKey: ["employees"], queryFn: () => all<Employee>("employees", "name") });
export const useCustomers = () => useQuery({ queryKey: ["customers"], queryFn: () => all<Customer>("customers", "name") });

export function useRange<T>(table: string, dateCol: string, from: string, to: string) {
  return useQuery({
    queryKey: [table, from, to],
    queryFn: async () => {
      const { data, error } = await db.from(table).select("*").gte(dateCol, from).lte(dateCol, to)
        .order(dateCol, { ascending: false }).order("created_at", { ascending: false }).limit(5000);
      if (error) throw error;
      return data as T[];
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await db.from("app_settings").select("*").eq("id", 1).maybeSingle();
      return (data ?? { business_name: "LoomTrack", currency: "₹" }) as { business_name: string; currency: string };
    },
  });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function nameMap<T extends { id: string; name: string }>(list?: T[]) {
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
