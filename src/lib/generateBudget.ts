import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@/assets/logo.png";
import type { OrderRow } from "./supabase";

const COMPANY = {
  name: "MASTER SOLUÇÕES",
  cnpj: "61.906.390/0001-58",
  address: "Setor Planalto - Itumbiara/GO",
  phone: "(64) 9 9264-2950",
};

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export async function generateBudget(order: OrderRow) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ===== LOGO =====
  let logoData = "";
  try {
    logoData = await loadImageDataUrl(logoUrl);
  } catch (e) {
    console.error("Erro ao carregar logo:", e);
  }

  // Watermark
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

  // ===== BUDGET INFO =====
  const budgetNumber = order.id ? order.id.substring(0, 8).toUpperCase() : Date.now().toString().slice(-8);
  const issueDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(230, 120, 30);
  doc.text("ORÇAMENTO", pageW / 2, 52, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(`Orçamento Nº: ${budgetNumber}`, 14, 62);
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
      : [[order.services || "Serviços orçados", fmtBRL(total)]];

  autoTable(doc, {
    startY: y + 4,
    head: [["Serviços", "Valor"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [230, 120, 30],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: { fontSize: 10, textColor: [40, 40, 40] },
    columnStyles: { 1: { halign: "right", cellWidth: 40 } },
    margin: { left: 14, right: 14 },
  });

  let afterTableY = (doc as any).lastAutoTable.finalY + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
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
  doc.setTextColor(20, 20, 20);
  doc.text(`TOTAL:`, pageW - 60, afterTableY);
  doc.text(fmtBRL(total), pageW - 14, afterTableY, { align: "right" });

  // ===== NOTES (if any) =====
  const blockX = 14;
  const blockW = pageW - 28;

  const notesLines: string[] =
    order.notes && order.notes.trim() ? doc.splitTextToSize(order.notes.trim(), blockW - 8) : [];

  if (notesLines.length > 0) {
    const notesBlockH = 7 + notesLines.length * 4.5 + 4;
    const notesBlockY = afterTableY + 12;

    doc.setFillColor(255, 253, 235);
    doc.setDrawColor(200, 160, 0);
    doc.setLineWidth(0.4);
    doc.roundedRect(blockX, notesBlockY, blockW, notesBlockH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(120, 80, 0);
    doc.text("OBSERVAÇÕES", blockX + 4, notesBlockY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(60, 50, 0);
    doc.text(notesLines, blockX + 4, notesBlockY + 10);
  }

  // ===== FOOTER MESSAGE =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(230, 120, 30);
  doc.text("Este documento não é válido como Recibo.", pageW / 2, pageH - 18, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text("Orçamento válido por 7 dias.", pageW / 2, pageH - 12, { align: "center" });

  doc.save(`orcamento-${budgetNumber}-${(order.name || "cliente").replace(/\s+/g, "_")}.pdf`);
}
