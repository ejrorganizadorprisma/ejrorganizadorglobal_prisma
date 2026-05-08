import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SalesOrder, SalesOrderItem, DocumentSettings, Currency } from '@ejr/shared-types';
import type { Customer } from '@ejr/shared-types';

interface SalesOrderWithRelations extends SalesOrder {
  items: Array<SalesOrderItem & { product?: { name: string; code: string; factoryCode?: string } }>;
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
  DRAFT: { label: 'RASCUNHO', color: [107, 114, 128] },                  // gray
  PENDING: { label: 'PENDENTE', color: [217, 119, 6] },                  // amber
  APPROVED: { label: 'APROVADO', color: [5, 150, 105] },                 // emerald
  CONVERTING: { label: 'EM PROCESSAMENTO', color: [107, 114, 128] },     // gray
  PARTIALLY_CONVERTED: { label: 'FATURADO PARCIAL', color: [13, 148, 136] }, // teal
  CONVERTED: { label: 'FATURADO', color: [5, 150, 105] },                // emerald
  CANCELLED: { label: 'CANCELADO', color: [107, 114, 128] },             // gray
};

export type SalesOrderPdfMode = 'elegant' | 'print';

/**
 * Generates a professional PDF for a sales order
 * @param mode - 'elegant' (default, colorful) or 'print' (ink-saving grayscale)
 */
export const generateSalesOrderPDF = (
  order: SalesOrderWithRelations,
  customer: Customer,
  settings?: DocumentSettings,
  currency: Currency = 'BRL',
  mode: SalesOrderPdfMode = 'elegant'
): void => {
  const doc = new jsPDF();
  const isPrint = mode === 'print';

  // Settings or defaults
  const companyLogo = settings?.companyLogo;
  const primaryColor = settings?.primaryColor || '#0B5C9A';
  const footerText = settings?.footerText || 'Obrigado pela preferencia!';
  const footerAddress = settings?.footerAddress;
  const footerPhone = settings?.footerPhone;
  const footerEmail = settings?.footerEmail;
  const footerWebsite = settings?.footerWebsite;

  // In print mode: force grayscale to save ink. Elegant: use brand color.
  const primaryRgb = isPrint ? { r: 60, g: 60, b: 60 } : hexToRgb(primaryColor);
  const lightGrey = '#f3f4f6';
  const darkGrey = '#6b7280';
  const black = '#000000';

  let yPos = 20;

  // ========== HEADER SECTION ==========
  if (isPrint) {
    // Print mode: no colored background, just logo and a thin separator line
    if (companyLogo) {
      try {
        doc.addImage(companyLogo, 'PNG', 15, 8, 55, 22);
      } catch (error) {
        console.error('Error adding logo:', error);
      }
    } else if (settings?.companyName) {
      doc.setTextColor(black);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(settings.companyName, 15, 20);
    }
    // Thin separator line
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(15, 36, 195, 36);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGrey);
    doc.text('EJR Organizador Global', 195, 32, { align: 'right' });
  } else {
    // Elegant mode: colorful header
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
  }

  yPos = 45;

  // ========== ORDER INFO SECTION ==========
  doc.setTextColor(black);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PEDIDO', 20, yPos);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGrey);
  doc.text(`No ${order.orderNumber}`, 20, yPos + 7);

  // Status badge on the right
  const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.PENDING;
  const statusText = statusInfo.label;
  const statusWidth = doc.getTextWidth(statusText) + 10;
  const statusX = 195 - statusWidth;
  const statusY = yPos - 4;

  if (isPrint) {
    // Print mode: outline badge, no fill
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.roundedRect(statusX, statusY, statusWidth, 7, 1.5, 1.5, 'S');
    doc.setTextColor(black);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(statusText, statusX + statusWidth / 2, statusY + 4.8, { align: 'center' });
  } else {
    doc.setFillColor(statusInfo.color[0], statusInfo.color[1], statusInfo.color[2]);
    doc.roundedRect(statusX, statusY, statusWidth, 7, 1.5, 1.5, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(statusText, statusX + statusWidth / 2, statusY + 4.8, { align: 'center' });
  }

  // Date below status
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGrey);
  doc.text(`Data: ${formatBrazilianDate(order.orderDate)}`, 195, yPos + 7, { align: 'right' });

  yPos += 18;

  // Helper: renders a section title bar (filled in elegant mode, bordered in print mode)
  const renderSectionTitle = (title: string) => {
    if (isPrint) {
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.rect(15, yPos, 180, 8, 'S');
    } else {
      doc.setFillColor(lightGrey);
      doc.rect(15, yPos, 180, 8, 'F');
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black);
    doc.text(title, 20, yPos + 5.5);
    yPos += 12;
  };

  // ========== CUSTOMER SECTION ==========
  renderSectionTitle('DADOS DO CLIENTE');

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
  renderSectionTitle('ITENS DO PEDIDO');

  const itemsData: any[] = [];

  order.items.forEach((item) => {
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
    theme: isPrint ? 'grid' : 'striped',
    headStyles: isPrint
      ? {
          fillColor: false as any,
          textColor: black,
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'left',
          lineColor: [100, 100, 100],
          lineWidth: 0.3,
        }
      : {
          fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b],
          textColor: '#ffffff',
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'left',
        },
    bodyStyles: isPrint
      ? {
          fontSize: 9,
          textColor: black,
          lineColor: [180, 180, 180],
          lineWidth: 0.2,
        }
      : {
          fontSize: 9,
          textColor: black,
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
  doc.text(formatCurrency(order.subtotal, currency), 195, yPos, { align: 'right' });
  yPos += 6;

  if (order.discount > 0) {
    doc.text('Desconto:', totalsX, yPos);
    doc.text(`- ${formatCurrency(order.discount, currency)}`, 195, yPos, { align: 'right' });
    yPos += 6;
  }

  doc.setDrawColor(darkGrey);
  doc.line(totalsX, yPos, 195, yPos);
  yPos += 5;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', totalsX, yPos);
  if (!isPrint) {
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  }
  doc.text(formatCurrency(order.total, currency), 195, yPos, { align: 'right' });
  doc.setTextColor(black);

  yPos += 12;

  // ========== NOTES SECTION ==========
  if (order.notes && order.notes.trim()) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    renderSectionTitle('OBSERVACOES');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(order.notes, 170);
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
  const safeNumber = order.orderNumber.replace(/\//g, '-');
  const suffix = isPrint ? '_impressao' : '';
  const fileName = `Pedido_${safeNumber}_${safeName}${suffix}.pdf`;
  doc.save(fileName);
};
