import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Sale, SaleItem, SalePayment, DocumentSettings, Currency } from '@ejr/shared-types';
import type { Customer } from '@ejr/shared-types';

interface SaleWithRelations extends Sale {
  items: Array<SaleItem & { product?: { name: string; code: string; factoryCode?: string } }>;
  payments: SalePayment[];
}

/**
 * Currency formatting configuration for each supported currency
 */
const CURRENCY_FORMAT_CONFIG: Record<Currency, { locale: string; currency: string; decimals: number; symbol: string }> = {
  BRL: { locale: 'pt-BR', currency: 'BRL', decimals: 2, symbol: 'R$' },
  PYG: { locale: 'es-PY', currency: 'PYG', decimals: 0, symbol: 'Gs.' },
  USD: { locale: 'en-US', currency: 'USD', decimals: 2, symbol: '$' },
};

const formatBrazilianDate = (date: Date | string): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const d = new Date(date);
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
};

const formatShortDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
};

const formatCurrency = (value: number, currency: Currency = 'BRL'): string => {
  const config = CURRENCY_FORMAT_CONFIG[currency];
  const realValue = config.decimals === 0 ? value : value / 100;

  if (currency === 'PYG') {
    const formatted = new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(realValue);
    return `Gs. ${formatted}`;
  }

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(realValue);
};

const formatDocument = (document: string): string => {
  if (!document) return '';
  const cleaned = document.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return document;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 11, g: 92, b: 154 }; // EJR blue default
};

const STATUS_LABELS: Record<string, { label: string; color: [number, number, number] }> = {
  PENDING: { label: 'PENDENTE', color: [217, 119, 6] },      // amber
  PAID: { label: 'PAGO', color: [5, 150, 105] },             // emerald
  PARTIAL: { label: 'PARCIAL', color: [37, 99, 235] },       // blue
  OVERDUE: { label: 'ATRASADO', color: [220, 38, 38] },      // red
  CANCELLED: { label: 'CANCELADO', color: [107, 114, 128] }, // gray
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartao de Credito',
  DEBIT_CARD: 'Cartao de Debito',
  BANK_TRANSFER: 'Transferencia',
  PIX: 'PIX',
  CHECK: 'Cheque',
  PROMISSORY: 'Promissoria',
  BOLETO: 'Boleto',
  OTHER: 'Outro',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Atrasado',
  CANCELLED: 'Cancelado',
};

/**
 * Generates a professional PDF for a sale
 */
export const generateSalePDF = (
  sale: SaleWithRelations,
  customer: Customer,
  settings?: DocumentSettings,
  currency: Currency = 'BRL'
): void => {
  const doc = new jsPDF();

  // Settings or defaults
  const companyLogo = settings?.companyLogo;
  const primaryColor = settings?.primaryColor || '#0B5C9A';
  const footerText = settings?.footerText || 'Obrigado pela preferencia!';
  const footerAddress = settings?.footerAddress;
  const footerPhone = settings?.footerPhone;
  const footerEmail = settings?.footerEmail;
  const footerWebsite = settings?.footerWebsite;

  const primaryRgb = hexToRgb(primaryColor);
  const lightGrey = '#f3f4f6';
  const darkGrey = '#6b7280';
  const black = '#000000';

  let yPos = 20;

  // ========== HEADER SECTION ==========
  doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor('#ffffff');

  if (companyLogo) {
    try {
      doc.addImage(companyLogo, 'PNG', 10, 3, 70, 30);
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('EJR Organizador Global', 205, 32, { align: 'right' });

  yPos = 45;

  // ========== SALE INFO SECTION ==========
  doc.setTextColor(black);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('VENDA', 20, yPos);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGrey);
  doc.text(`No ${sale.saleNumber}`, 20, yPos + 7);

  // Status badge on the right
  const statusInfo = STATUS_LABELS[sale.status] || STATUS_LABELS.PENDING;
  const statusText = statusInfo.label;
  const statusWidth = doc.getTextWidth(statusText) + 10;
  const statusX = 195 - statusWidth;
  const statusY = yPos - 4;

  doc.setFillColor(statusInfo.color[0], statusInfo.color[1], statusInfo.color[2]);
  doc.roundedRect(statusX, statusY, statusWidth, 7, 1.5, 1.5, 'F');
  doc.setTextColor('#ffffff');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, statusX + statusWidth / 2, statusY + 4.8, { align: 'center' });

  // Date below status
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGrey);
  doc.text(`Data: ${formatBrazilianDate(sale.saleDate)}`, 195, yPos + 7, { align: 'right' });

  yPos += 18;

  // ========== CUSTOMER SECTION ==========
  doc.setFillColor(lightGrey);
  doc.rect(15, yPos, 180, 8, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(black);
  doc.text('DADOS DO CLIENTE', 20, yPos + 5.5);

  yPos += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(black);

  doc.text(`Nome: ${customer.name}`, 20, yPos);
  yPos += 5;

  if (customer.document) {
    const docLabel = customer.document.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ';
    doc.text(`${docLabel}: ${formatDocument(customer.document)}`, 20, yPos);
    yPos += 5;
  }

  if (customer.email) {
    doc.text(`Email: ${customer.email}`, 20, yPos);
    yPos += 5;
  }

  if (customer.phone) {
    doc.text(`Telefone: ${customer.phone}`, 20, yPos);
    yPos += 5;
  }

  yPos += 5;

  // ========== ITEMS TABLE ==========
  doc.setFillColor(lightGrey);
  doc.rect(15, yPos, 180, 8, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(black);
  doc.text('ITENS DA VENDA', 20, yPos + 5.5);

  yPos += 12;

  const itemsData: any[] = [];

  sale.items.forEach((item) => {
    if (item.itemType === 'PRODUCT' && item.product) {
      itemsData.push([
        item.product.code || '-',
        item.product.name,
        item.quantity.toString(),
        formatCurrency(item.unitPrice, currency),
        item.discount > 0 ? `- ${formatCurrency(item.discount, currency)}` : '-',
        formatCurrency(item.total, currency),
      ]);
    } else if (item.itemType === 'SERVICE') {
      itemsData.push([
        '-',
        item.serviceName || 'Servico',
        item.quantity.toString(),
        formatCurrency(item.unitPrice, currency),
        item.discount > 0 ? `- ${formatCurrency(item.discount, currency)}` : '-',
        formatCurrency(item.total, currency),
      ]);
    }
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Cod.', 'Descricao', 'Qtd', 'Valor Unit.', 'Desc.', 'Total']],
    body: itemsData,
    theme: 'striped',
    headStyles: {
      fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b],
      textColor: '#ffffff',
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: black
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // ========== TOTALS SECTION ==========
  const totalsX = 130;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(black);

  doc.text('Subtotal:', totalsX, yPos);
  doc.text(formatCurrency(sale.subtotal, currency), 195, yPos, { align: 'right' });
  yPos += 6;

  if (sale.discount > 0) {
    doc.text('Desconto:', totalsX, yPos);
    doc.text(`- ${formatCurrency(sale.discount, currency)}`, 195, yPos, { align: 'right' });
    yPos += 6;
  }

  doc.setDrawColor(darkGrey);
  doc.line(totalsX, yPos, 195, yPos);
  yPos += 5;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', totalsX, yPos);
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.text(formatCurrency(sale.total, currency), 195, yPos, { align: 'right' });
  doc.setTextColor(black);

  yPos += 8;

  // Paid / Pending
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(5, 150, 105);
  doc.text('Pago:', totalsX, yPos);
  doc.text(formatCurrency(sale.totalPaid, currency), 195, yPos, { align: 'right' });
  yPos += 5;

  doc.setTextColor(220, 38, 38);
  doc.text('Pendente:', totalsX, yPos);
  doc.text(formatCurrency(sale.totalPending, currency), 195, yPos, { align: 'right' });
  doc.setTextColor(black);

  yPos += 12;

  // ========== PAYMENTS TABLE ==========
  if (sale.payments && sale.payments.length > 0) {
    // Page break check
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(lightGrey);
    doc.rect(15, yPos, 180, 8, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black);
    doc.text(`PARCELAS (${sale.installments}x)`, 20, yPos + 5.5);

    yPos += 12;

    const paymentsData = sale.payments
      .sort((a, b) => a.installmentNumber - b.installmentNumber)
      .map((p) => [
        `${p.installmentNumber}/${sale.installments}`,
        PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod,
        formatShortDate(p.dueDate),
        p.paidDate ? formatShortDate(p.paidDate) : '-',
        formatCurrency(p.amount, currency),
        PAYMENT_STATUS_LABELS[p.status] || p.status,
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Parcela', 'Metodo', 'Vencimento', 'Pagamento', 'Valor', 'Status']],
      body: paymentsData,
      theme: 'striped',
      headStyles: {
        fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b],
        textColor: '#ffffff',
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: black
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 26, halign: 'center' },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 24, halign: 'center' },
      },
      didParseCell: (data) => {
        // Color the status column
        if (data.section === 'body' && data.column.index === 5) {
          const status = data.cell.raw as string;
          if (status === 'Pago') {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Atrasado') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Pendente') {
            data.cell.styles.textColor = [217, 119, 6];
          }
        }
      },
      margin: { left: 15, right: 15 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ========== NOTES SECTION ==========
  if (sale.notes && sale.notes.trim()) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(lightGrey);
    doc.rect(15, yPos, 180, 8, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black);
    doc.text('OBSERVACOES', 20, yPos + 5.5);

    yPos += 12;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(sale.notes, 170);
    doc.text(notesLines, 20, yPos);
    yPos += (notesLines.length * 5) + 5;
  }

  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGrey);

    let footerY = 287;

    if (footerText) {
      doc.text(footerText, 105, footerY, { align: 'center' });
      footerY -= 3;
    }

    const contactInfo: string[] = [];
    if (footerAddress) contactInfo.push(footerAddress);
    if (footerPhone) contactInfo.push(`Tel: ${footerPhone}`);
    if (footerEmail) contactInfo.push(footerEmail);
    if (footerWebsite) contactInfo.push(footerWebsite);

    if (contactInfo.length > 0) {
      const contactLine = contactInfo.join(' | ');
      doc.text(contactLine, 105, footerY, { align: 'center' });
    }

    // Page number
    if (pageCount > 1) {
      doc.setFontSize(7);
      doc.text(`Pagina ${i} de ${pageCount}`, 195, 287, { align: 'right' });
    }
  }

  // ========== SAVE ==========
  const safeName = (customer.name || 'Cliente').replace(/\s+/g, '_').replace(/[^\w-]/g, '');
  const safeNumber = sale.saleNumber.replace(/\//g, '-');
  const fileName = `Venda_${safeNumber}_${safeName}.pdf`;
  doc.save(fileName);
};
