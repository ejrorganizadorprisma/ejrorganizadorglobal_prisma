import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quote, QuoteItem, DocumentSettings, Currency } from '@ejr/shared-types';
import type { Customer } from '@ejr/shared-types';

interface SignerInfo {
  name: string;
  role: string;
}

interface QuoteWithProduct extends Quote {
  items: Array<QuoteItem & { product?: { name: string; code: string; factoryCode?: string } }>;
}

/**
 * Currency formatting configuration for each supported currency
 */
const CURRENCY_FORMAT_CONFIG: Record<Currency, { locale: string; currency: string; decimals: number; symbol: string }> = {
  BRL: { locale: 'pt-BR', currency: 'BRL', decimals: 2, symbol: 'R$' },
  PYG: { locale: 'es-PY', currency: 'PYG', decimals: 0, symbol: 'Gs.' },
  USD: { locale: 'en-US', currency: 'USD', decimals: 2, symbol: '$' },
};

/**
 * Formats a date in Brazilian Portuguese format
 * Example: 25 de Novembro de 2025
 */
const formatBrazilianDate = (date: Date): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const d = new Date(date);
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
};

/**
 * Formats a value in cents to the appropriate currency format
 * Examples:
 *   BRL: 123456 -> 'R$ 1.234,56'
 *   PYG: 123456 -> 'Gs. 1.234.567' (no decimals, integer currency)
 *   USD: 123456 -> '$ 1,234.56'
 */
const formatCurrency = (value: number, currency: Currency = 'BRL'): string => {
  const config = CURRENCY_FORMAT_CONFIG[currency];
  const realValue = config.decimals === 0 ? value : value / 100;

  // For PYG, Intl uses the guarani symbol which may not render in PDF fonts,
  // so we manually format with the 'Gs.' prefix
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

/**
 * Formats a CPF or CNPJ document
 */
const formatDocument = (document: string): string => {
  if (!document) return '';

  // Remove any non-digit characters
  const cleaned = document.replace(/\D/g, '');

  // CPF: 123.456.789-00
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  // CNPJ: 12.345.678/0001-00
  if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  return document;
};

/**
 * Converts hex color to RGB values
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 37, g: 99, b: 235 }; // Default blue
};

/**
 * Generates a professional PDF for a quote
 */
export const generateQuotePDF = (
  quote: QuoteWithProduct,
  customer: Customer,
  signer: SignerInfo,
  settings?: DocumentSettings,
  currency: Currency = 'BRL'
): void => {
  const doc = new jsPDF();

  // Use settings or defaults
  const _companyName = settings?.companyName || 'EJR ORGANIZADOR';
  const companyLogo = settings?.companyLogo;
  const primaryColor = settings?.primaryColor || '#2563eb';
  const footerText = settings?.footerText || 'Obrigado pela preferência!';
  const footerAddress = settings?.footerAddress;
  const footerPhone = settings?.footerPhone;
  const footerEmail = settings?.footerEmail;
  const footerWebsite = settings?.footerWebsite;
  const signatureImage = settings?.signatureImage;
  const signerName = settings?.signatureName || signer.name;
  const signerRole = settings?.signatureRole || signer.role;

  // Define colors
  const primaryRgb = hexToRgb(primaryColor);
  const lightGrey = '#f3f4f6';
  const darkGrey = '#6b7280';
  const black = '#000000';

  let yPos = 20;

  // ========== HEADER SECTION ==========
  // Company name with background
  doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor('#ffffff');

  // Add logo if available (larger size)
  if (companyLogo) {
    try {
      doc.addImage(companyLogo, 'PNG', 10, 3, 70, 30);
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }

  // EJR Organizador discretamente na parte inferior direita
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('EJR Organizador Global', 205, 32, { align: 'right' });

  yPos = 45;

  // ========== QUOTE INFO SECTION ==========
  doc.setTextColor(black);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', 20, yPos);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGrey);
  doc.text(`Nº ${quote.quoteNumber}`, 20, yPos + 7);

  // Date on the right
  doc.setFontSize(10);
  doc.text(`Data: ${formatBrazilianDate(new Date(quote.createdAt))}`, 190, yPos + 7, { align: 'right' });

  yPos += 20;

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
    const docLabel = customer.document.length === 11 ? 'CPF' : 'CNPJ';
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
  doc.text('ITENS DO ORÇAMENTO', 20, yPos + 5.5);

  yPos += 12;

  // Prepare table data
  const tableData: any[] = [];

  quote.items.forEach((item: QuoteItem & { product?: { name: string; code: string; factoryCode?: string } }) => {
    if (item.itemType === 'PRODUCT' && item.product) {
      tableData.push([
        item.product.code || '-',
        item.product.factoryCode || '-',
        item.product.name,
        item.quantity.toString(),
        formatCurrency(item.unitPrice, currency),
        formatCurrency(item.total, currency),
      ]);
    } else if (item.itemType === 'SERVICE') {
      tableData.push([
        '-',
        '-',
        item.serviceName || 'Servico',
        item.quantity.toString(),
        formatCurrency(item.unitPrice, currency),
        formatCurrency(item.total, currency),
      ]);
    }
  });

  // Generate table
  autoTable(doc, {
    startY: yPos,
    head: [['Cod.', 'Cod. Fab.', 'Produto', 'Qtd', 'Valor Unit.', 'Total']],
    body: tableData,
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
      1: { cellWidth: 28 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
    didDrawPage: function(data) {
      // Update yPos after table is drawn
      yPos = data.cursor?.y || yPos;
    }
  });

  // Update yPos after table
  const finalY = (doc as any).lastAutoTable.finalY;
  yPos = finalY + 10;

  // ========== TOTALS SECTION ==========
  const totalsX = 130;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Subtotal
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(formatCurrency(quote.subtotal, currency), 190, yPos, { align: 'right' });
  yPos += 6;

  // Discount
  if (quote.discount > 0) {
    doc.text('Desconto:', totalsX, yPos);
    doc.text(`- ${formatCurrency(quote.discount, currency)}`, 190, yPos, { align: 'right' });
    yPos += 6;
  }

  // Draw line
  doc.setDrawColor(darkGrey);
  doc.line(totalsX, yPos, 195, yPos);
  yPos += 5;

  // Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', totalsX, yPos);
  doc.text(formatCurrency(quote.total, currency), 190, yPos, { align: 'right' });

  yPos += 10;

  // ========== VALIDITY SECTION ==========
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(darkGrey);
  doc.text(`Validade do orçamento: ${formatBrazilianDate(new Date(quote.validUntil))}`, 20, yPos);

  yPos += 10;

  // ========== NOTES SECTION ==========
  if (quote.notes && quote.notes.trim()) {
    doc.setFillColor(lightGrey);
    doc.rect(15, yPos, 180, 8, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black);
    doc.text('OBSERVAÇÕES', 20, yPos + 5.5);

    yPos += 12;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Split notes into lines if too long
    const notesLines = doc.splitTextToSize(quote.notes, 170);
    doc.text(notesLines, 20, yPos);

    yPos += (notesLines.length * 5) + 5;
  }

  // ========== SIGNATURE SECTION ==========
  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos += 10;
  }

  // Add signature image if available
  if (signatureImage) {
    try {
      doc.addImage(signatureImage, 'PNG', 75, yPos, 60, 20);
      yPos += 25;
    } catch (error) {
      console.error('Error adding signature image:', error);
    }
  }

  // Signature line
  const signatureLineY = yPos + (signatureImage ? 0 : 15);
  doc.setDrawColor(black);
  doc.line(70, signatureLineY, 140, signatureLineY);

  yPos = signatureLineY + 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(black);
  doc.text(signerName, 105, yPos, { align: 'center' });

  yPos += 5;

  doc.setFontSize(9);
  doc.setTextColor(darkGrey);
  doc.text(signerRole, 105, yPos, { align: 'center' });

  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGrey);

    let footerY = 287;

    // Footer text
    if (footerText) {
      doc.text(footerText, 105, footerY, { align: 'center' });
      footerY -= 3;
    }

    // Contact info
    const contactInfo: string[] = [];
    if (footerAddress) contactInfo.push(footerAddress);
    if (footerPhone) contactInfo.push(`Tel: ${footerPhone}`);
    if (footerEmail) contactInfo.push(footerEmail);
    if (footerWebsite) contactInfo.push(footerWebsite);

    if (contactInfo.length > 0) {
      const contactLine = contactInfo.join(' | ');
      doc.text(contactLine, 105, footerY, { align: 'center' });
    }
  }

  // ========== SAVE PDF ==========
  const fileName = `Orcamento_${quote.quoteNumber.replace(/\//g, '-')}_${customer.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
