import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rpxlpqehpzhofxuzjbws.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gjEEROXK9SG4QmMoqbx33g_mLurxreu";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface OrderRow {
  id?: string;
  created_at?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  services: string;
  total: number;
  status: string;
  notes: string;
}

export async function insertOrder(order: OrderRow) {
  const { data, error } = await supabase
    .from("orders")
    .insert([order])
    .select();
  if (error) throw error;
  return data;
}

export async function fetchOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as OrderRow[];
}

export async function updateOrderStatus(id: string, status: string) {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function updateOrderNotes(id: string, notes: string) {
  const { error } = await supabase
    .from("orders")
    .update({ notes })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteOrderById(id: string) {
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Services CRUD (page showcase)
export interface ServiceRow {
  id?: string;
  created_at?: string;
  title: string;
  description: string;
  image_url: string;
}

export async function fetchServicesAdmin(): Promise<ServiceRow[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as ServiceRow[];
}

export async function insertService(service: Omit<ServiceRow, "id" | "created_at">) {
  const { data, error } = await supabase.from("services").insert([service]).select();
  if (error) throw error;
  return data;
}

export async function updateService(id: string, service: Partial<ServiceRow>) {
  const { error } = await supabase.from("services").update(service).eq("id", id);
  if (error) throw error;
}

export async function deleteService(id: string) {
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}

// Budget Services CRUD (orçamento page pricing)
export interface BudgetServiceRow {
  id?: string;
  created_at?: string;
  name: string;
  type: "fixed" | "area";
  fixed_price: number;
  tiers: { maxArea: number; pricePerM2: number }[] | null;
  min_price: number;
  sort_order: number;
}

export async function fetchBudgetServices(): Promise<BudgetServiceRow[]> {
  const { data, error } = await supabase
    .from("budget_services")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as BudgetServiceRow[];
}

export async function insertBudgetService(service: Omit<BudgetServiceRow, "id" | "created_at">) {
  const { data, error } = await supabase.from("budget_services").insert([service]).select();
  if (error) throw error;
  return data;
}

export async function updateBudgetService(id: string, service: Partial<BudgetServiceRow>) {
  const { error } = await supabase.from("budget_services").update(service).eq("id", id);
  if (error) throw error;
}

export async function deleteBudgetService(id: string) {
  const { error } = await supabase.from("budget_services").delete().eq("id", id);
  if (error) throw error;
}

// Admin Settings (password + email config)
export async function fetchAdminPassword(): Promise<string> {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("password")
    .eq("id", "main")
    .single();
  if (error || !data) return "1478";
  return data.password;
}

export async function updateAdminPassword(newPassword: string): Promise<void> {
  const { error } = await supabase
    .from("admin_settings")
    .update({ password: newPassword, updated_at: new Date().toISOString() })
    .eq("id", "main");
  if (error) throw error;
}

export interface EmailSettings {
  google_script_url: string;
  notification_email: string;
}

export async function fetchEmailSettings(): Promise<EmailSettings> {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("google_script_url, notification_email")
    .eq("id", "main")
    .single();
  if (error || !data) {
    return { google_script_url: "", notification_email: "" };
  }
  return {
    google_script_url: data.google_script_url || "",
    notification_email: data.notification_email || "",
  };
}

export async function updateEmailSettings(settings: Partial<EmailSettings>): Promise<void> {
  const { error } = await supabase
    .from("admin_settings")
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq("id", "main");
  if (error) throw error;
}
