import { fetchEmailSettings } from "./supabase";

const GOOGLE_SCRIPT_URL_KEY = "master_google_script_url";
const NOTIFICATION_EMAIL_KEY = "master_notification_email";

// ── URL do Google Script ──────────────────────────────────────────────────────

export function getGoogleScriptUrl(): string {
  return localStorage.getItem(GOOGLE_SCRIPT_URL_KEY) || "";
}

export function setGoogleScriptUrl(url: string) {
  localStorage.setItem(GOOGLE_SCRIPT_URL_KEY, url);
}

// ── Email de notificação ──────────────────────────────────────────────────────

export function getNotificationEmail(): string {
  return localStorage.getItem(NOTIFICATION_EMAIL_KEY) || "masterservicos.iub@gmail.com";
}

export function setNotificationEmail(email: string) {
  localStorage.setItem(NOTIFICATION_EMAIL_KEY, email);
}

// ── Sincronizar do Supabase para o localStorage (chamar ao autenticar) ────────

export async function syncEmailSettingsFromDB(): Promise<void> {
  try {
    const settings = await fetchEmailSettings();
    if (settings.google_script_url) {
      localStorage.setItem(GOOGLE_SCRIPT_URL_KEY, settings.google_script_url);
    }
    if (settings.notification_email) {
      localStorage.setItem(NOTIFICATION_EMAIL_KEY, settings.notification_email);
    }
  } catch (err) {
    console.warn("Não foi possível sincronizar configurações de e-mail:", err);
  }
}

// ── Envio para Google Sheets ──────────────────────────────────────────────────

interface OrderData {
  id: string;
  date: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  services: { name: string; price: number; width?: number; height?: number; quantity?: number }[];
  total: number;
  status: string;
  notes: string;
}

export async function sendToGoogleSheets(order: OrderData): Promise<boolean> {
  const url = getGoogleScriptUrl();
  if (!url) return false;

  try {
    const servicesText = order.services
      .map((s) => {
        let detail = s.name;
        if (s.width && s.height) {
          detail += ` (${s.width}x${s.height}m = ${(s.width * s.height).toFixed(1)}m²)`;
        } else if (s.quantity && s.quantity > 1) {
          detail += ` (x${s.quantity})`;
        }
        detail += ` - R$ ${s.price.toFixed(2)}`;
        return detail;
      })
      .join(" | ");

    const payload = {
      id: order.id,
      data: new Date(order.date).toLocaleDateString("pt-BR"),
      hora: new Date(order.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      nome: order.name,
      telefone: order.phone,
      email: order.email,
      endereco: order.address,
      servicos: servicesText,
      total: order.total.toFixed(2),
      status: order.status,
      observacoes: order.notes,
    };

    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    return true;
  } catch (error) {
    console.error("Erro ao enviar para Google Sheets:", error);
    return false;
  }
}

export async function updateStatusInGoogleSheets(orderId: string, status: string, notes: string): Promise<boolean> {
  const url = getGoogleScriptUrl();
  if (!url) return false;

  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "updateStatus",
        id: orderId,
        status,
        observacoes: notes,
      }),
    });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar Google Sheets:", error);
    return false;
  }
}
