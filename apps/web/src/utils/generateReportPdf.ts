import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPriceValue } from '../hooks/useFormatPrice';

interface PdfKpi {
  label: string;
  value: string;
}

interface PdfColumn {
  key: string;
  label: string;
  format?: 'text' | 'currency' | 'number' | 'date' | 'percent';
  align?: 'left' | 'center' | 'right';
}

interface GenerateReportPdfOptions {
  title: string;
  subtitle?: string;
  kpis?: PdfKpi[];
  columns: PdfColumn[];
  data: any[];
  fileName?: string;
  dateRange?: { start?: string; end?: string };
}

function formatCellValue(value: any, format?: string): string {
  if (value === null || value === undefined) return '-';
  switch (format) {
    case 'currency':
      return formatPriceValue(Number(value), 'PYG');
    case 'date':
      return new Date(value).toLocaleDateString('pt-BR');
    case 'percent':
      return `${Number(value).toFixed(1)}%`;
    case 'number':
      return Number(value).toLocaleString('pt-BR');
    default:
      return String(value);
  }
}

export function generateReportPdf(options: GenerateReportPdfOptions) {
  const { title, subtitle, kpis, columns, data, fileName, dateRange } = options;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('EJR Organizador Global', 14, 15);

  doc.setFontSize(14);
  doc.text(title, 14, 24);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 30);
  }

  // Date info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const dateText = dateRange?.start && dateRange?.end
    ? `Período: ${new Date(dateRange.start).toLocaleDateString('pt-BR')} a ${new Date(dateRange.end).toLocaleDateString('pt-BR')}`
    : `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
  doc.text(dateText, pageWidth - 14, 15, { align: 'right' });

  let startY = subtitle ? 36 : 32;

  // KPIs
  if (kpis && kpis.length > 0) {
    const kpiWidth = (pageWidth - 28) / Math.min(kpis.length, 4);
    kpis.forEach((kpi, i) => {
      const x = 14 + (i % 4) * kpiWidth;
      const row = Math.floor(i / 4);
      const y = startY + row * 14;

      doc.setFillColor(240, 245, 255);
      doc.roundedRect(x, y, kpiWidth - 4, 12, 2, 2, 'F');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(kpi.label, x + 3, y + 4);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30);
      doc.text(kpi.value, x + 3, y + 10);
    });

    startY += Math.ceil(kpis.length / 4) * 14 + 4;
  }

  doc.setTextColor(0);

  // Table
  const tableColumns = columns.map(col => ({
    header: col.label,
    dataKey: col.key,
  }));

  const tableData = data.map(row => {
    const formatted: any = {};
    columns.forEach(col => {
      formatted[col.key] = formatCellValue(row[col.key], col.format);
    });
    return formatted;
  });

  const columnStyles: any = {};
  columns.forEach(col => {
    if (col.align === 'right' || col.format === 'currency' || col.format === 'number' || col.format === 'percent') {
      columnStyles[col.key] = { halign: 'right' };
    } else if (col.align === 'center') {
      columnStyles[col.key] = { halign: 'center' };
    }
  });

  autoTable(doc, {
    columns: tableColumns,
    body: tableData,
    startY,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [11, 92, 154], // #0B5C9A
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount} | EJR Organizador Global`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const name = fileName || `relatorio-${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(name);
}
