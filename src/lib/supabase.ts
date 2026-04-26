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
  affiliate_code?: string;
  fraud_status?: string;
  fraud_reasons?: string;
  client_fingerprint?: string;
  client_ip?: string;
  paid_at?: string;
  commission_paid_at?: string | null;
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
  const updateData: any = { status };
  if (status === "Pago") {
    updateData.paid_at = new Date().toISOString();
  } else {
    updateData.paid_at = null;
  }
  const { error } = await supabase
    .from("orders")
    .update(updateData)
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
  image_url?: string;
  description?: string;
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

// Admin Settings (auth + email config)
export interface AdminAuthSettings {
  username?: string;
  password?: string;
  email?: string;
}

export async function fetchAdminAuth(): Promise<AdminAuthSettings> {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("username, password, email")
    .eq("id", "main")
    .single();
  if (error || !data) return { username: "admin", password: "1478", email: "masterservicos.iub@gmail.com" };
  return data;
}

export async function updateAdminAuth(updates: AdminAuthSettings): Promise<void> {
  const { error } = await supabase
    .from("admin_settings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", "main");
  if (error) throw error;
}

export async function recoverAdminPassword(email: string): Promise<string> {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("email")
    .eq("id", "main")
    .single();
    
  if (error || !data || data.email !== email) {
    throw new Error("E-mail não corresponde ao cadastrado no sistema.");
  }

  const newPass = Math.floor(100000 + Math.random() * 900000).toString();
  await updateAdminAuth({ password: newPass });
  return newPass;
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

// Coupons
export interface CouponRow {
  id?: string;
  created_at?: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  applies_to: "all" | "service";
  service_id: string | null;
  active: boolean;
}

export async function fetchCoupons(): Promise<CouponRow[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as CouponRow[];
}

export async function insertCoupon(coupon: Omit<CouponRow, "id" | "created_at">) {
  const { data, error } = await supabase.from("coupons").insert([coupon]).select();
  if (error) throw error;
  return data;
}

export async function updateCoupon(id: string, coupon: Partial<CouponRow>) {
  const { error } = await supabase.from("coupons").update(coupon).eq("id", id);
  if (error) throw error;
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw error;
}

export async function findCouponByCode(code: string): Promise<CouponRow | null> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .ilike("code", code.trim())
    .eq("active", true)
    .maybeSingle();
  if (error) return null;
  return (data as CouponRow) || null;
}

// Clients CRUD
export interface ClientRow {
  id?: string;
  created_at?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export async function fetchClients(): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data as ClientRow[];
}

export async function insertClient(client: Omit<ClientRow, "id" | "created_at">) {
  const { data, error } = await supabase.from("clients").insert([client]).select();
  if (error) throw error;
  return data;
}

export async function updateClient(id: string, client: Partial<ClientRow>) {
  const { error } = await supabase.from("clients").update(client).eq("id", id);
  if (error) throw error;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- Affiliates ----------------
export interface AffiliateRow {
  id?: string;
  created_at?: string;
  full_name: string;
  cpf: string;
  address: string;
  phone: string;
  email: string;
  pix_key: string;
  username: string;
  password_hash: string;
  referral_code: string;
  active?: boolean;
  blocked?: boolean;
  blocked_reason?: string;
  fraud_score?: number;
  terms_agreed?: boolean;
}

// Lightweight password hash (SHA-256) — note: anon key access; treat as obfuscation
async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPassword(pw: string): Promise<string> {
  return sha256(`master-affiliate::${pw}`);
}

export function generateReferralCode(name: string): string {
  const base = (name || "AF")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 4) || "AF";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${rand}`;
}

export async function registerAffiliate(input: Omit<AffiliateRow, "id" | "created_at" | "password_hash" | "referral_code"> & { password: string }) {
  const password_hash = await hashPassword(input.password);
  let referral_code = generateReferralCode(input.full_name);
  // ensure uniqueness with retry
  for (let i = 0; i < 4; i++) {
    const { data: exists } = await supabase
      .from("affiliates")
      .select("id")
      .eq("referral_code", referral_code)
      .maybeSingle();
    if (!exists) break;
    referral_code = generateReferralCode(input.full_name);
  }
  const row: AffiliateRow = {
    full_name: input.full_name,
    cpf: input.cpf,
    address: input.address,
    phone: input.phone,
    email: input.email,
    pix_key: input.pix_key,
    username: input.username,
    password_hash,
    referral_code,
    active: true,
    terms_agreed: input.terms_agreed,
  };
  const { data, error } = await supabase.from("affiliates").insert([row]).select().single();
  if (error) throw error;
  return data as AffiliateRow;
}

export async function loginAffiliate(username: string, password: string): Promise<AffiliateRow | null> {
  const password_hash = await hashPassword(password);
  const { data, error } = await supabase
    .from("affiliates")
    .select("*")
    .eq("username", username.trim())
    .eq("password_hash", password_hash)
    .maybeSingle();
  if (error) return null;
  const af = (data as AffiliateRow) || null;
  if (af && af.blocked) {
    throw new Error("AFFILIATE_BLOCKED:" + (af.blocked_reason || "Conta bloqueada por suspeita de fraude."));
  }
  return af;
}

export async function fetchAffiliateOrders(referral_code: string): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("affiliate_code", referral_code)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as OrderRow[]) || [];
}

/**
 * Mark all currently-released (paid + 7d old, ok) commissions for an affiliate as paid out.
 * Returns the list of order ids updated and total commission paid.
 */
export async function markAffiliateCommissionsPaid(referral_code: string): Promise<{ ids: string[]; total: number }> {
  const COMMISSION_RATE = 0.01;
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const { data, error } = await supabase
    .from("orders")
    .select("id, total, paid_at, created_at, fraud_status, status, commission_paid_at")
    .eq("affiliate_code", referral_code)
    .eq("status", "Pago")
    .is("commission_paid_at", null);
  if (error) throw error;

  const eligible = (data || []).filter((o: any) => {
    if ((o.fraud_status || "ok") !== "ok") return false;
    const ref = o.paid_at || o.created_at;
    if (!ref) return false;
    return now - new Date(ref).getTime() >= SEVEN_DAYS;
  });
  if (eligible.length === 0) return { ids: [], total: 0 };

  const ids = eligible.map((o: any) => o.id);
  const total = eligible.reduce((s: number, o: any) => s + Number(o.total || 0) * COMMISSION_RATE, 0);
  const { error: upErr } = await supabase
    .from("orders")
    .update({ commission_paid_at: new Date().toISOString() })
    .in("id", ids);
  if (upErr) throw upErr;
  return { ids, total };
}

export async function recoverAffiliatePassword(email: string, cpf: string): Promise<string> {
  const { data, error } = await supabase
    .from("affiliates")
    .select("id")
    .ilike("email", email.trim())
    .eq("cpf", cpf.trim())
    .maybeSingle();

  if (error || !data) {
    throw new Error("Usuário não encontrado com estes dados.");
  }

  // Generate 6 digit random password
  const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
  const password_hash = await hashPassword(newPassword);

  const { error: updateError } = await supabase
    .from("affiliates")
    .update({ password_hash })
    .eq("id", data.id);

  if (updateError) {
    throw new Error("Erro ao atualizar a senha.");
  }

  return newPassword;
}

// ---------------- Affiliate Materials ----------------
export interface AffiliateMaterialRow {
  id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  updated_at?: string;
}

export async function fetchAffiliateMaterials(): Promise<AffiliateMaterialRow[]> {
  const { data, error } = await supabase
    .from("affiliate_materials")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as AffiliateMaterialRow[]) || [];
}

export async function updateAffiliateMaterial(id: string, updates: Partial<AffiliateMaterialRow>) {
  const { error } = await supabase
    .from("affiliate_materials")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export interface AffiliateMaterialOrderRow {
  id?: string;
  created_at?: string;
  affiliate_id?: string | null;
  affiliate_code: string;
  affiliate_name: string;
  material_id: string;
  material_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  status?: string;
  notes?: string;
}

export async function insertAffiliateMaterialOrder(order: AffiliateMaterialOrderRow) {
  const { data, error } = await supabase
    .from("affiliate_material_orders")
    .insert([order])
    .select();
  if (error) throw error;
  return data;
}

export async function fetchAffiliateMaterialOrders(): Promise<AffiliateMaterialOrderRow[]> {
  const { data, error } = await supabase
    .from("affiliate_material_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as AffiliateMaterialOrderRow[]) || [];
}

export async function updateAffiliateMaterialOrderStatus(id: string, status: string) {
  const { error } = await supabase
    .from("affiliate_material_orders")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAffiliateMaterialOrder(id: string) {
  const { error } = await supabase
    .from("affiliate_material_orders")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
