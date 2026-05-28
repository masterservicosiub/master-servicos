import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { OrderRow, ExpenseRow } from "./supabase";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function generateRevenueReport(orders: OrderRow[], year: number, expenses: ExpenseRow[] = []) {
  const doc = new jsPDF();

  const paidOrders = orders.filter(o => {
    if (!o.created_at) return false;
    const d = new Date(o.created_at);
    return d.getFullYear() === year && o.status === "Pago";
  });

  const monthlyGross = Array(12).fill(0) as number[];
  const monthlyCount = Array(12).fill(0) as number[];
  paidOrders.forEach(o => {
    const m = new Date(o.created_at!).getMonth();
    monthlyGross[m] += Number(o.total || 0);
    monthlyCount[m] += 1;
  });

  const yearExpenses = expenses.filter((e) => {
    const ds = e.expense_date || e.created_at;
    return ds && new Date(ds).getFullYear() === year;
  });
  const monthlyExpenses = Array(12).fill(0) as number[];
  yearExpenses.forEach((e) => {
    const ds = e.expense_date || e.created_at!;
    monthlyExpenses[new Date(ds).getMonth()] += Number(e.amount || 0);
  });

  const monthlyTotals = monthlyGross.map((v, i) => v - monthlyExpenses[i]);
  const annualGross = monthlyGross.reduce((a, b) => a + b, 0);
  const annualExpenses = monthlyExpenses.reduce((a, b) => a + b, 0);
  const annualTotal = annualGross - annualExpenses;
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
  doc.text(`Faturamento Bruto (${year}):`, 14, 66);
  doc.setFont("helvetica", "bold");
  doc.text(fmt(annualGross), 90, 66);

  doc.setFont("helvetica", "normal");
  doc.text(`Saídas (${year}):`, 14, 74);
  doc.setFont("helvetica", "bold");
  doc.text(`- ${fmt(annualExpenses)}`, 90, 74);

  doc.setFont("helvetica", "normal");
  doc.text(`Faturamento Líquido (${year}):`, 14, 82);
  doc.setFont("helvetica", "bold");
  doc.text(fmt(annualTotal), 90, 82);

  doc.setFont("helvetica", "normal");
  doc.text(`Líquido ${MONTHS[currentMonthIdx]}/${year}:`, 14, 90);
  doc.setFont("helvetica", "bold");
  doc.text(fmt(currentMonthTotal), 90, 90);

  doc.setFont("helvetica", "normal");
  doc.text(`Total de pedidos pagos:`, 14, 98);
  doc.setFont("helvetica", "bold");
  doc.text(`${paidOrders.length}`, 90, 98);

  // Monthly breakdown table
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Faturamento Mês a Mês", 14, 114);

  const tableData = MONTHS.map((month, i) => [
    month,
    monthlyCount[i].toString(),
    fmt(monthlyGross[i]),
    fmt(monthlyExpenses[i]),
    fmt(monthlyTotals[i]),
    annualTotal > 0 ? `${((monthlyTotals[i] / annualTotal) * 100).toFixed(1)}%` : "0%",
  ]);

  // Add total row
  tableData.push([
    "TOTAL",
    paidOrders.length.toString(),
    fmt(annualGross),
    fmt(annualExpenses),
    fmt(annualTotal),
    "100%",
  ]);

  autoTable(doc, {
    startY: 119,
    head: [["Mês", "Pedidos", "Bruto", "Saídas", "Líquido", "% do Ano"]],
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

  // Expenses detail list
  if (yearExpenses.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? 200;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detalhamento de Saídas", 14, finalY + 12);

    const expRows = yearExpenses
      .slice()
      .sort((a, b) => {
        const da = new Date(a.expense_date || a.created_at!).getTime();
        const db = new Date(b.expense_date || b.created_at!).getTime();
        return da - db;
      })
      .map((e) => [
        new Date(e.expense_date || e.created_at!).toLocaleDateString("pt-BR"),
        e.description,
        fmt(Number(e.amount || 0)),
      ]);

    autoTable(doc, {
      startY: finalY + 17,
      head: [["Data", "Descrição", "Valor"]],
      body: expRows,
      theme: "grid",
      headStyles: { fillColor: [192, 57, 43], textColor: 255, fontStyle: "bold" },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [250, 240, 240] },
    });
  }

  doc.save(`relatorio-faturamento-${year}.pdf`);
}
