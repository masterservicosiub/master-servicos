import { getGoogleScriptUrl, getNotificationEmail } from "./googleSheets";

interface OrderNotificationData {
  name: string;
  phone: string;
  email: string;
  address: string;
  services: string;
  total: number;
}

async function callGoogleScript(payload: Record<string, string>): Promise<boolean> {
  const url = getGoogleScriptUrl();
  if (!url) {
    console.error("URL do Google Script não configurada.");
    return false;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    // no-cors always returns opaque response, assume success
    return true;
  } catch (error) {
    console.error("Erro ao chamar Google Script:", error);
    return false;
  }
}

export async function sendOrderEmailNotification(order: OrderNotificationData): Promise<boolean> {
  const notificationEmail = getNotificationEmail();
  if (!notificationEmail) {
    console.warn("E-mail de notificação não configurado.");
    return false;
  }

  const now = new Date();
  const servicesList = order.services
    .split(" | ")
    .map((s) => `• ${s}`)
    .join("\n");

  return callGoogleScript({
    action: "sendEmail",
    to: notificationEmail,
    subject: `🔔 Novo Pedido - ${order.name}`,
    nome: order.name,
    telefone: order.phone,
    email: order.email || "Não informado",
    endereco: order.address || "Não informado",
    servicos: servicesList,
    total: `R$ ${order.total.toFixed(2).replace(".", ",")}`,
    data: now.toLocaleDateString("pt-BR"),
    hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  });
}

export async function sendTestEmail(): Promise<boolean> {
  const notificationEmail = getNotificationEmail();
  if (!notificationEmail) return false;

  const now = new Date();
  return callGoogleScript({
    action: "sendTestEmail",
    to: notificationEmail,
    data: now.toLocaleDateString("pt-BR"),
    hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  });
}
