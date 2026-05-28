import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { OrderRow } from "./supabase";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function generateRevenueReport(orders: OrderRow[], year: number) {
  const doc = new jsPDF();

  const paidOrders = orders.filter(o => {
    if (!o.created_at) return false;
    const d = new Date(o.created_at);
    return d.getFullYear() === year && o.status === "Pago";
  });

  const monthlyTotals = Array(12).fill(0) as number[];
  const monthlyCount = Array(12).fill(0) as number[];
  paidOrders.forEach(o => {
    const m = new Date(o.created_at!).getMonth();
    monthlyTotals[m] += Number(o.total || 0);
    monthlyCount[m] += 1;
  });

  const annualTotal = monthlyTotals.reduce((a, b) => a + b, 0);
  const now = new Date();
  const currentMonthIdx = now.getFullYear() === year ? now.getMonth() : 11;
  const currentMonthTotal = monthlyTotals[currentMonthIdx];

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Faturamento", 105, 25, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Ano: ${year}`, 105, 34, { align: "center" });
  doc.text(`Gerado em: ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}`, 105, 41, { align: "center" });

  // Separator
  doc.setDrawColor(200);
  doc.line(14, 46, 196, 46);

  // Summary cards
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo", 14, 56);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Faturamento Anual (${year}):`, 14, 66);
  doc.setFont("helvetica", "bold");
  doc.text(fmt(annualTotal), 90, 66);

  doc.setFont("helvetica", "normal");
  doc.text(`Faturamento ${MONTHS[currentMonthIdx]}/${year}:`, 14, 74);
  doc.setFont("helvetica", "bold");
  doc.text(fmt(currentMonthTotal), 90, 74);

  doc.setFont("helvetica", "normal");
  doc.text(`Total de pedidos pagos:`, 14, 82);
  doc.setFont("helvetica", "bold");
  doc.text(`${paidOrders.length}`, 90, 82);

  // Monthly breakdown table
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Faturamento Mês a Mês", 14, 98);

  const tableData = MONTHS.map((month, i) => [
    month,
    monthlyCount[i].toString(),
    fmt(monthlyTotals[i]),
    annualTotal > 0 ? `${((monthlyTotals[i] / annualTotal) * 100).toFixed(1)}%` : "0%",
  ]);

  // Add total row
  tableData.push([
    "TOTAL",
    paidOrders.length.toString(),
    fmt(annualTotal),
    "100%",
  ]);

  autoTable(doc, {
    startY: 103,
    head: [["Mês", "Pedidos", "Faturamento", "% do Ano"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
    bodyStyles: { fontSize: 10 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    foot: [],
    didParseCell: (data) => {
      // Bold the total row
      if (data.row.index === 12 && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [220, 230, 241];
      }
    },
  });

  doc.save(`relatorio-faturamento-${year}.pdf`);
}
