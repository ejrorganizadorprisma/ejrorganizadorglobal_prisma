import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DocumentSettings, Currency } from '@ejr/shared-types';
import type { Collection } from '../hooks/useCollections';

/**
 * Currency formatting configuration
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

const formatDateTime = (date: Date | string): string => {
  const d = new Date(date);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
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

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 11, g: 92, b: 154 };
};

const STATUS_LABELS: Record<string, { label: string; color: [number, number, number] }> = {
  PENDING_APPROVAL: { label: 'PENDENTE APROVACAO', color: [217, 119, 6] },
  APPROVED: { label: 'APROVADO', color: [37, 99, 235] },
  DEPOSITED: { label: 'DEPOSITADO', color: [5, 150, 105] },
  REJECTED: { label: 'REJEITADO', color: [220, 38, 38] },
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

export type CollectionPdfMode = 'elegant' | 'print';

/**
 * Generates a professional PDF receipt for a collection
 * @param mode - 'elegant' (default, colorful) or 'print' (ink-saving grayscale)
 */
export const generateCollectionPDF = (
  collection: Collection,
  settings?: DocumentSettings,
  currency: Currency = 'BRL',
  mode: CollectionPdfMode = 'elegant'
): void => {
  const doc = new jsPDF();
  const isPrint = mode === 'print';

  // Settings or defaults
  const companyLogo = settings?.companyLogo;
  const primaryColor = settings?.primaryColor || '#0B5C9A';
  const footerText = settings?.footerText || 'Comprovante de Recebimento';
  const footerAddress = settings?.footerAddress;
  const footerPhone = settings?.footerPhone;
  const footerEmail = settings?.footerEmail;
  const footerWebsite = settings?.footerWebsite;

  const primaryRgb = isPrint ? { r: 60, g: 60, b: 60 } : hexToRgb(primaryColor);
  const lightGrey = '#f3f4f6';
  const darkGrey = '#6b7280';
  const black = '#000000';

  let yPos = 20;

  // ========== HEADER SECTION ==========
  if (isPrint) {
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
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(15, 36, 195, 36);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGrey);
    doc.text('EJR Organizador Global', 195, 32, { align: 'right' });
  } else {
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

  // ========== COLLECTION INFO SECTION ==========
  doc.setTextColor(black);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROVANTE DE COBRANCA', 20, yPos);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGrey);
  doc.text(`No ${collection.collectionNumber}`, 20, yPos + 7);

  // Status badge on the right
  const statusInfo = STATUS_LABELS[collection.status] || STATUS_LABELS.PENDING_APPROVAL;
  const statusText = statusInfo.label;
  const statusWidth = doc.getTextWidth(statusText) + 10;
  const statusX = 195 - statusWidth;
  const statusY = yPos - 4;

  if (isPrint) {
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
  doc.text(
    `Recebido em: ${formatBrazilianDate(collection.collectedAt || collection.createdAt)}`,
    195,
    yPos + 7,
    { align: 'right' }
  );

  yPos += 18;

  // Helper: section title
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

  // ========== INFO TABLE: Customer / Sale / Seller ==========
  renderSectionTitle('INFORMACOES DA COBRANCA');

  const infoRows: any[] = [];
  const customerName = collection.customer?.name || collection.sale?.customer?.name || '-';
  infoRows.push(['Cliente', customerName]);

  if (collection.sale?.saleNumber) {
    infoRows.push(['Venda referente', collection.sale.saleNumber]);
  }
  if (collection.seller?.name) {
    infoRows.push(['Vendedor', collection.seller.name]);
  }

  autoTable(doc, {
    startY: yPos,
    body: infoRows,
    theme: isPrint ? 'grid' : 'plain',
    styles: {
      fontSize: 10,
      textColor: black,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: darkGrey },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 15, right: 15 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // ========== PAYMENT DETAILS ==========
  renderSectionTitle('DETALHES DO PAGAMENTO');

  const paymentRows: any[] = [];
  paymentRows.push([
    'Metodo de pagamento',
    PAYMENT_METHOD_LABELS[collection.paymentMethod] || collection.paymentMethod,
  ]);

  if (collection.checkNumber) {
    paymentRows.push(['Numero do cheque', collection.checkNumber]);
  }
  if (collection.checkBank) {
    paymentRows.push(['Banco', collection.checkBank]);
  }
  if (collection.checkDate) {
    paymentRows.push(['Data do cheque', formatShortDate(collection.checkDate)]);
  }

  autoTable(doc, {
    startY: yPos,
    body: paymentRows,
    theme: isPrint ? 'grid' : 'plain',
    styles: {
      fontSize: 10,
      textColor: black,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: darkGrey },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 15, right: 15 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ========== AMOUNT BOX (highlighted) ==========
  if (isPrint) {
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos, 180, 22, 'S');
  } else {
    doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.rect(15, yPos, 180, 22, 'F');
  }

  if (isPrint) {
    doc.setTextColor(darkGrey);
  } else {
    doc.setTextColor(255, 255, 255);
  }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('VALOR RECEBIDO', 20, yPos + 8);

  if (isPrint) {
    doc.setTextColor(black);
  }
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(collection.amount, currency), 190, yPos + 14, { align: 'right' });

  doc.setTextColor(black);
  yPos += 30;

  // ========== TIMELINE / APPROVAL INFO ==========
  if (collection.approvedAt || collection.depositedAt || collection.rejectionReason) {
    renderSectionTitle('HISTORICO');

    const timelineRows: any[] = [];

    timelineRows.push([
      'Recebimento',
      formatDateTime(collection.collectedAt || collection.createdAt),
    ]);

    if (collection.approvedAt) {
      timelineRows.push(['Aprovacao', formatDateTime(collection.approvedAt)]);
    }
    if (collection.depositedAt) {
      timelineRows.push(['Deposito', formatDateTime(collection.depositedAt)]);
    }
    if (collection.rejectionReason) {
      timelineRows.push(['Motivo da rejeicao', collection.rejectionReason]);
    }

    autoTable(doc, {
      startY: yPos,
      body: timelineRows,
      theme: isPrint ? 'grid' : 'plain',
      styles: {
        fontSize: 10,
        textColor: black,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', textColor: darkGrey },
        1: { cellWidth: 'auto' },
      },
      margin: { left: 15, right: 15 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // ========== GPS LOCATION ==========
  if (collection.latitude && collection.longitude) {
    renderSectionTitle('LOCALIZACAO GPS');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(black);
    doc.text(
      `Latitude: ${collection.latitude}    Longitude: ${collection.longitude}`,
      20,
      yPos
    );
    yPos += 5;

    if (!isPrint) doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Google Maps: https://www.google.com/maps?q=${collection.latitude},${collection.longitude}`,
      20,
      yPos
    );
    doc.setTextColor(black);
    doc.setFont('helvetica', 'normal');
    yPos += 8;
  }

  // ========== NOTES SECTION ==========
  if (collection.notes && collection.notes.trim()) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    renderSectionTitle('OBSERVACOES');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(collection.notes, 170);
    doc.text(notesLines, 20, yPos);
    yPos += (notesLines.length * 5) + 5;
  }

  // ========== SIGNATURE LINES ==========
  if (yPos > 230) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos += 15;
  }

  doc.setDrawColor(black);
  doc.setLineWidth(0.3);

  // Recebedor
  doc.line(25, yPos, 95, yPos);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGrey);
  doc.text('Recebedor', 60, yPos + 5, { align: 'center' });
  if (collection.seller?.name) {
    doc.setTextColor(black);
    doc.setFontSize(8);
    doc.text(collection.seller.name, 60, yPos + 10, { align: 'center' });
  }

  // Cliente
  doc.line(115, yPos, 185, yPos);
  doc.setFontSize(9);
  doc.setTextColor(darkGrey);
  doc.text('Cliente', 150, yPos + 5, { align: 'center' });
  doc.setTextColor(black);
  doc.setFontSize(8);
  doc.text(customerName, 150, yPos + 10, { align: 'center' });

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

    if (pageCount > 1) {
      doc.setFontSize(7);
      doc.text(`Pagina ${i} de ${pageCount}`, 195, 287, { align: 'right' });
    }
  }

  // ========== SAVE ==========
  const safeName = (customerName || 'Cliente').replace(/\s+/g, '_').replace(/[^\w-]/g, '');
  const safeNumber = collection.collectionNumber.replace(/\//g, '-');
  const suffix = isPrint ? '_impressao' : '';
  const fileName = `Cobranca_${safeNumber}_${safeName}${suffix}.pdf`;
  doc.save(fileName);
};
