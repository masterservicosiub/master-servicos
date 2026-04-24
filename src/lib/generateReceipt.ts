import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import logoUrl from "@/assets/logo.png";
import type { OrderRow } from "./supabase";

const COMPANY = {
  name: "MASTER SERVIÇOS",
  cnpj: "61.906.390/0001-58",
  address: "Setor Planalto - Itumbiara/GO",
  phone: "(64) 9 9264-2950",
};

const fmtBRL = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function loadImageDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Builds the PIX "copia e cola" payload (BR Code / EMV) for a static PIX with CNPJ key.
 */
function buildPixPayload(opts: { key: string; name: string; city: string; amount: number; txid?: string }): string {
  const { key, name, city, amount, txid = "***" } = opts;

  // ✅ Remove acentos e caracteres especiais
  const normalize = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, "")
      .toUpperCase();

  const tlv = (id: string, value: string) => id + value.length.toString().padStart(2, "0") + value;

  const gui = tlv("00", "br.gov.bcb.pix");
  const keyField = tlv("01", key);
  const merchantAccountInfo = tlv("26", gui + keyField);
  const merchantCategoryCode = tlv("52", "0000");
  const transactionCurrency = tlv("53", "986");
  const transactionAmount = amount > 0 ? tlv("54", amount.toFixed(2)) : "";
  const countryCode = tlv("58", "BR");
  const merchantName = tlv("59", normalize(name).substring(0, 25)); // ✅ normalizado
  const merchantCity = tlv("60", normalize(city).substring(0, 15)); // ✅ normalizado
  const additionalData = tlv("62", tlv("05", txid.substring(0, 25)));
  const payloadFormatIndicator = tlv("00", "01");

  let payload =
    payloadFormatIndicator +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    merchantName +
    merchantCity +
    additionalData;

  // CRC16-CCITT (sem alterações — estava correto)
  const toCrc = payload + "6304";
  let crc = 0xffff;
  for (let i = 0; i < toCrc.length; i++) {
    crc ^= toCrc.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  const crcStr = crc.toString(16).toUpperCase().padStart(4, "0");
  return toCrc + crcStr;
}

function parseServices(servicesText: string): { description: string; value: number }[] {
  if (!servicesText) return [];
  return servicesText.split("|").map((part) => {
    const trimmed = part.trim();
    const m = trimmed.match(/^(.*?)-\s*R\$\s*([\d.,]+)\s*$/i);
    if (m) {
      const desc = m[1].trim();
      const val = parseFloat(m[2].replace(/\./g, "").replace(",", "."));
      return { description: desc, value: isNaN(val) ? 0 : val };
    }
    return { description: trimmed, value: 0 };
  });
}

export async function generateReceipt(order: OrderRow) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Load logo
  let logoData = "";
  try {
    logoData = await loadImageDataUrl(logoUrl);
  } catch (e) {
    console.error("Erro ao carregar logo:", e);
  }

  // Watermark (centered, semi-transparent)
  if (logoData) {
    try {
      const gState = (doc as any).GState ? new (doc as any).GState({ opacity: 0.08 }) : null;
      if (gState) (doc as any).setGState(gState);
      const wmW = 130;
      const wmH = 130;
      doc.addImage(logoData, "PNG", (pageW - wmW) / 2, (pageH - wmH) / 2, wmW, wmH);
      if (gState) {
        const reset = new (doc as any).GState({ opacity: 1 });
        (doc as any).setGState(reset);
      }
    } catch (e) {
      console.error("Erro ao aplicar marca d'água:", e);
    }
  }

  // ===== HEADER =====
  if (logoData) {
    doc.addImage(logoData, "PNG", 14, 12, 24, 24);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(COMPANY.name, 42, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text(`CNPJ: ${COMPANY.cnpj}`, 42, 26);
  doc.text(COMPANY.address, 42, 31);
  doc.text(`Contato: ${COMPANY.phone}`, 42, 36);

  doc.setDrawColor(180);
  doc.setLineWidth(0.4);
  doc.line(14, 42, pageW - 14, 42);

  // ===== RECEIPT INFO =====
  const receiptNumber = order.id ? order.id.substring(0, 8).toUpperCase() : Date.now().toString().slice(-8);
  const issueDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("RECIBO DE SERVIÇOS", pageW / 2, 52, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Recibo Nº: ${receiptNumber}`, 14, 62);
  doc.text(`Data: ${issueDate}`, pageW - 14, 62, { align: "right" });

  // ===== CLIENT INFO =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DADOS DO CLIENTE", 14, 72);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 79;
  doc.text(`Nome: ${order.name || "-"}`, 14, y);
  y += 5;
  if (order.address) {
    doc.text(`Endereço: ${order.address}`, 14, y);
    y += 5;
  }
  if (order.phone) {
    doc.text(`Contato: ${order.phone}`, 14, y);
    y += 5;
  }
  if (order.email) {
    doc.text(`E-mail: ${order.email}`, 14, y);
    y += 5;
  }

  // ===== SERVICES TABLE =====
  const items = parseServices(order.services || "");
  const subtotal = items.reduce((s, i) => s + i.value, 0);
  const total = Number(order.total) || subtotal;
  const discount = Math.max(0, subtotal - total);

  const tableBody =
    items.length > 0
      ? items.map((it) => [it.description, fmtBRL(it.value)])
      : [[order.services || "Serviços executados", fmtBRL(total)]];

  autoTable(doc, {
    startY: y + 4,
    head: [["Descrição dos Serviços Executados", "Valor"]],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold", fontSize: 10 },
    bodyStyles: { fontSize: 10, textColor: [40, 40, 40] },
    columnStyles: { 1: { halign: "right", cellWidth: 40 } },
    margin: { left: 14, right: 14 },
  });

  let afterTableY = (doc as any).lastAutoTable.finalY + 6;

  // Subtotal / discount / total
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Subtotal:`, pageW - 60, afterTableY);
  doc.text(fmtBRL(subtotal > 0 ? subtotal : total), pageW - 14, afterTableY, { align: "right" });
  afterTableY += 6;

  if (discount > 0) {
    doc.setTextColor(180, 30, 30);
    doc.text(`Desconto:`, pageW - 60, afterTableY);
    doc.text(`- ${fmtBRL(discount)}`, pageW - 14, afterTableY, { align: "right" });
    doc.setTextColor(40, 40, 40);
    afterTableY += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`TOTAL:`, pageW - 60, afterTableY);
  doc.text(fmtBRL(total), pageW - 14, afterTableY, { align: "right" });

  // ===== PAYMENT BLOCK (FOOTER) =====
  const footerH = 70;
  const footerY = pageH - footerH - 10;

  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.6);
  doc.roundedRect(14, footerY, pageW - 28, footerH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(41, 128, 185);
  doc.text("FORMA DE PAGAMENTO — PIX", pageW / 2, footerY + 8, { align: "center" });

  // QR code
  try {
    const pixPayload = buildPixPayload({
      key: COMPANY.cnpj.replace(/\D/g, ""),
      name: COMPANY.name,
      city: "ITUMBIARA",
      amount: total,
      txid: receiptNumber,
    });
    const qrDataUrl = await QRCode.toDataURL(pixPayload, { margin: 1, width: 256 });
    doc.addImage(qrDataUrl, "PNG", 20, footerY + 12, 45, 45);
  } catch (e) {
    console.error("Erro ao gerar QR code:", e);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text("Chave PIX (CNPJ):", 72, footerY + 20);
  doc.setFont("helvetica", "bold");
  doc.text("61.906.390 ANGELO MARCOS", 72, footerY + 40);

  doc.setFont("helvetica", "normal");
  doc.text("Beneficiário:", 72, footerY + 34);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.name, 72, footerY + 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Valor total:", 72, footerY + 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text(fmtBRL(total), 72, footerY + 58);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text("Aponte a câmera para o QR Code para pagar via PIX.", pageW / 2, footerY + footerH - 4, { align: "center" });

  doc.save(`recibo-${receiptNumber}-${(order.name || "cliente").replace(/\s+/g, "_")}.pdf`);
}
