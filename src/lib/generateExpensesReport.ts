import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExpenseRow } from "./supabase";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function generateExpensesReport(expenses: ExpenseRow[], year: number) {
  const doc = new jsPDF();
  const fmt = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const yearExpenses = expenses
    .filter((e) => e.expense_date && Number(e.expense_date.slice(0, 4)) === year)
    .slice()
    .sort((a, b) => (a.expense_date < b.expense_date ? -1 : 1));

  const monthly = Array(12).fill(0) as number[];
  const monthlyCount = Array(12).fill(0) as number[];
  yearExpenses.forEach((e) => {
    const m = Number(e.expense_date.slice(5, 7)) - 1;
    if (m >= 0 && m < 12) {
      monthly[m] += Number(e.amount || 0);
      monthlyCount[m] += 1;
    }
  });
  const total = monthly.reduce((a, b) => a + b, 0);
  const now = new Date();

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Saídas", 105, 25, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Ano: ${year}`, 105, 34, { align: "center" });
  doc.text(
    `Gerado em: ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}`,
    105,
    41,
    { align: "center" },
  );
  doc.setDrawColor(200);
  doc.line(14, 46, 196, 46);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo", 14, 56);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Saídas Totais (${year}):`, 14, 66);
  doc.setFont("helvetica", "bold");
  doc.text(fmt(total), 90, 66);
  doc.setFont("helvetica", "normal");
  doc.text(`Lançamentos:`, 14, 74);
  doc.setFont("helvetica", "bold");
  doc.text(`${yearExpenses.length}`, 90, 74);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Saídas Mês a Mês", 14, 88);

  const monthRows = MONTHS.map((m, i) => [m, monthlyCount[i].toString(), fmt(monthly[i])]);
  monthRows.push(["TOTAL", yearExpenses.length.toString(), fmt(total)]);
  autoTable(doc, {
    startY: 93,
    head: [["Mês", "Lançamentos", "Total"]],
    body: monthRows,
    theme: "grid",
    headStyles: { fillColor: [192, 57, 43], textColor: 255, fontStyle: "bold" },
    bodyStyles: { fontSize: 10 },
    alternateRowStyles: { fillColor: [250, 240, 240] },
    didParseCell: (data) => {
      if (data.row.index === 12 && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [241, 220, 220];
      }
    },
  });

  if (yearExpenses.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? 200;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detalhamento de Saídas", 14, finalY + 12);

    const rows = yearExpenses.map((e) => [
      e.expense_date.split("-").reverse().join("/"),
      e.description,
      fmt(Number(e.amount || 0)),
    ]);
    rows.push(["", "TOTAL", fmt(total)]);
    autoTable(doc, {
      startY: finalY + 17,
      head: [["Data", "Descrição", "Valor"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [192, 57, 43], textColor: 255, fontStyle: "bold" },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [250, 240, 240] },
      didParseCell: (data) => {
        if (data.row.index === rows.length - 1 && data.section === "body") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [241, 220, 220];
        }
      },
    });
  }

  doc.save(`relatorio-saidas-${year}.pdf`);
}