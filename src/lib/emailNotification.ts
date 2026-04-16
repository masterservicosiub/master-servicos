import { supabase } from "./supabase";
import { getNotificationEmail } from "./googleSheets";

const SUPABASE_URL = "https://rpxlpqehpzhofxuzjbws.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gjEEROXK9SG4QmMoqbx33g_mLurxreu";

interface OrderNotificationData {
  name: string;
  phone: string;
  email: string;
  address: string;
  services: string;
  total: number;
}

function buildOrderEmailHtml(order: OrderNotificationData): string {
  const now = new Date();
  const date = now.toLocaleDateString("pt-BR");
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const servicesList = order.services
    .split(" | ")
    .map((s) => `<li style="margin-bottom:4px;">• ${s}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#1d4ed8;padding:24px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;">🔔 Novo Pedido Recebido!</h1>
            <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">Master Serviços — Sistema de Orçamentos</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 0;">
            <h2 style="margin:0 0 16px;color:#1e3a8a;font-size:16px;border-bottom:2px solid #dbeafe;padding-bottom:8px;">👤 Dados do Cliente</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;width:140px;">Nome:</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${order.name}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Telefone:</td><td style="padding:6px 0;color:#111827;font-size:14px;">${order.phone}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">E-mail:</td><td style="padding:6px 0;color:#111827;font-size:14px;">${order.email || "Não informado"}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Endereço:</td><td style="padding:6px 0;color:#111827;font-size:14px;">${order.address || "Não informado"}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0;">
            <h2 style="margin:0 0 16px;color:#1e3a8a;font-size:16px;border-bottom:2px solid #dbeafe;padding-bottom:8px;">🛠️ Serviços Solicitados</h2>
            <ul style="margin:0;padding:0;list-style:none;color:#111827;font-size:14px;line-height:1.8;">${servicesList}</ul>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;">
            <table width="100%" cellpadding="16" cellspacing="0" style="background:#eff6ff;border-radius:6px;">
              <tr>
                <td style="color:#1e3a8a;font-size:16px;font-weight:bold;">💰 Total Estimado</td>
                <td align="right" style="color:#1d4ed8;font-size:20px;font-weight:bold;">R$ ${order.total.toFixed(2).replace(".", ",")}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">📅 Recebido em ${date} às ${time}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#1e3a8a;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#93c5fd;font-size:12px;">Master Serviços — Hidráulica, Roçagem e Limpeza</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function callSendEmailEdgeFunction(to: string, subject: string, html: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers,
    body: JSON.stringify({ to, subject, html }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Erro na Edge Function send-email:", error);
    return false;
  }

  return true;
}

export async function sendOrderEmailNotification(order: OrderNotificationData): Promise<boolean> {
  const notificationEmail = getNotificationEmail();

  if (!notificationEmail) {
    console.warn("E-mail de notificação não configurado.");
    return false;
  }

  try {
    const html = buildOrderEmailHtml(order);
    return await callSendEmailEdgeFunction(
      notificationEmail,
      `🔔 Novo Pedido - ${order.name}`,
      html
    );
  } catch (error) {
    console.error("Erro ao enviar notificação por e-mail:", error);
    return false;
  }
}

export async function sendTestEmail(): Promise<boolean> {
  const notificationEmail = getNotificationEmail();
  if (!notificationEmail) return false;

  const now = new Date();
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:24px;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#1d4ed8;padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:20px;">✅ Teste de Configuração</h1>
    </div>
    <div style="padding:28px;text-align:center;">
      <p style="color:#111827;font-size:16px;">As notificações por e-mail estão funcionando corretamente!</p>
      <p style="color:#6b7280;font-size:14px;">📧 Destino: <strong>${notificationEmail}</strong></p>
      <p style="color:#6b7280;font-size:14px;">🕐 ${now.toLocaleString("pt-BR")}</p>
    </div>
    <div style="background:#1e3a8a;padding:14px;text-align:center;">
      <p style="color:#93c5fd;font-size:12px;margin:0;">Master Serviços — Sistema de Orçamentos</p>
    </div>
  </div>
</body>
</html>`;

  try {
    return await callSendEmailEdgeFunction(
      notificationEmail,
      "✅ Teste de Configuração - Master Serviços",
      html
    );
  } catch (error) {
    console.error("Erro ao enviar e-mail de teste:", error);
    return false;
  }
}
