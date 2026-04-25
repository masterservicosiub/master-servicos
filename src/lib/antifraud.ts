import { supabase, type AffiliateRow, type OrderRow } from "./supabase";
import { onlyDigits } from "./cpfValidator";

const FP_KEY = "device_fp";

// Stable per-browser fingerprint (random uuid stored in localStorage)
export function getDeviceFingerprint(): string {
  try {
    let fp = localStorage.getItem(FP_KEY);
    if (!fp) {
      fp = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36));
      localStorage.setItem(FP_KEY, fp);
    }
    return fp;
  } catch {
    return "anon";
  }
}

export async function getClientIp(): Promise<string | null> {
  try {
    const r = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    const j = await r.json();
    return j.ip || null;
  } catch {
    return null;
  }
}

export async function trackAffiliateClick(referral_code: string) {
  if (!referral_code) return;
  const fingerprint = getDeviceFingerprint();
  const ip = await getClientIp();
  try {
    await supabase.from("affiliate_clicks").insert([
      {
        referral_code: referral_code.toUpperCase(),
        fingerprint,
        ip,
        user_agent: navigator.userAgent.slice(0, 250),
      },
    ]);
  } catch {}
}

export interface FraudCheckInput {
  affiliate_code: string;
  client_phone: string;
  client_email: string;
  client_name: string;
  fingerprint: string;
  ip: string | null;
}

export interface FraudCheckResult {
  status: "ok" | "suspicious" | "blocked";
  reasons: string[];
}

/**
 * Run antifraud rules against a new order tied to an affiliate.
 * - blocked: clear self-referral (matches affiliate's own data)
 * - suspicious: same fingerprint/phone/email already used by another affiliate's referral,
 *   excessive volume from same device, or affiliate marked as blocked
 */
export async function runFraudCheck(input: FraudCheckInput): Promise<FraudCheckResult> {
  const reasons: string[] = [];
  let status: FraudCheckResult["status"] = "ok";

  const code = (input.affiliate_code || "").toUpperCase().trim();
  if (!code) return { status, reasons };

  const phoneDigits = onlyDigits(input.client_phone);
  const email = (input.client_email || "").trim().toLowerCase();

  // 1) Affiliate exists and not blocked
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("referral_code", code)
    .maybeSingle();

  if (!affiliate) {
    return { status: "blocked", reasons: ["Código de afiliado inexistente"] };
  }
  const af = affiliate as AffiliateRow;

  if (af.blocked) {
    return { status: "blocked", reasons: ["Afiliado bloqueado por fraude"] };
  }

  // 2) Self-referral checks (CPF/phone/email match affiliate)
  if (phoneDigits && onlyDigits(af.phone) === phoneDigits) {
    reasons.push("Telefone igual ao do afiliado");
    status = "blocked";
  }
  if (email && (af.email || "").toLowerCase() === email) {
    reasons.push("E-mail igual ao do afiliado");
    status = "blocked";
  }
  if (
    input.client_name &&
    af.full_name &&
    af.full_name.trim().toLowerCase() === input.client_name.trim().toLowerCase()
  ) {
    reasons.push("Nome igual ao do afiliado");
    if (status !== "blocked") status = "suspicious";
  }

  // 3) Same device already used for THIS affiliate (re-purchase) → suspicious
  if (input.fingerprint) {
    const { data: sameDevice } = await supabase
      .from("orders")
      .select("id, affiliate_code")
      .eq("client_fingerprint", input.fingerprint);
    if (sameDevice && sameDevice.length > 0) {
      const sameAffCount = sameDevice.filter((o: any) => o.affiliate_code === code).length;
      if (sameAffCount >= 1) {
        reasons.push("Mesmo dispositivo já usado para este afiliado");
        if (status !== "blocked") status = "suspicious";
      }
      if (sameDevice.length >= 5) {
        reasons.push("Dispositivo com volume anormal de pedidos");
        if (status !== "blocked") status = "suspicious";
      }
    }

    // 4) Click + immediate conversion from same fingerprint AS the affiliate's owner device
    const { data: ownerClicks } = await supabase
      .from("affiliate_clicks")
      .select("fingerprint")
      .eq("referral_code", code)
      .limit(50);
    // If the affiliate owner ever logged in on this device and now uses it to "indicate" themselves
    // We can't know owner FP directly, but we treat repeated self-clicks as a signal:
    if (ownerClicks && ownerClicks.length > 20) {
      reasons.push("Volume anormal de cliques no link");
      if (status === "ok") status = "suspicious";
    }
  }

  // 5) Same phone already converted by ANOTHER affiliate
  if (phoneDigits) {
    const { data: phoneOrders } = await supabase
      .from("orders")
      .select("affiliate_code")
      .eq("phone", input.client_phone);
    if (phoneOrders) {
      const otherAff = phoneOrders.find(
        (o: any) => o.affiliate_code && o.affiliate_code !== code,
      );
      if (otherAff) {
        reasons.push("Cliente já indicado por outro afiliado");
        if (status === "ok") status = "suspicious";
      }
    }
  }

  // 6) Velocity: too many orders from same IP in last 24h
  if (input.ip) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: ipOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("client_ip", input.ip)
      .gte("created_at", since);
    if (ipOrders && ipOrders.length >= 3) {
      reasons.push("Muitos pedidos do mesmo IP em 24h");
      if (status === "ok") status = "suspicious";
    }
  }

  return { status, reasons };
}

// Admin helpers
export async function fetchAffiliatesAll(): Promise<AffiliateRow[]> {
  const { data, error } = await supabase
    .from("affiliates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as AffiliateRow[]) || [];
}

export async function setAffiliateBlocked(id: string, blocked: boolean, reason: string) {
  const { error } = await supabase
    .from("affiliates")
    .update({ blocked, blocked_reason: blocked ? reason : "" })
    .eq("id", id);
  if (error) throw error;
}

export async function setOrderFraudStatus(id: string, status: "ok" | "suspicious" | "blocked", reasons = "") {
  const { error } = await supabase
    .from("orders")
    .update({ fraud_status: status, fraud_reasons: reasons })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchSuspiciousOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .neq("fraud_status", "ok")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as OrderRow[]) || [];
}

export async function deleteAffiliate(id: string) {
  const { error } = await supabase.from("affiliates").delete().eq("id", id);
  if (error) throw error;
}