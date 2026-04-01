import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SupplierOrder } from '../hooks/useSupplierOrders';
import type { Currency } from '@ejr/shared-types';
import { formatPriceValue } from '../hooks/useFormatPrice';

export interface DocumentSettingsForPdf {
  companyLogo?: string;
  companyName?: string;
  footerText?: string;
  footerAddress?: string;
  footerPhone?: string;
  footerEmail?: string;
  footerWebsite?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [11, 92, 154];
};

const UNIT_LABELS: Record<string, string> = {
  UNIT: 'Un', METER: 'm', KG: 'kg', LITER: 'L',
  BOX: 'Cx', PACK: 'Pct', ROLL: 'Rolo', PAIR: 'Par', SET: 'Jogo',
};

// ===== Helper: desenhar header (mesmo estilo do PDF Cotação) =====
function drawHeader(
  doc: jsPDF, pageWidth: number, title: string, orderNumber: string,
  settings: DocumentSettingsForPdf | undefined,
  primaryColor: [number, number, number], secondaryColor: [number, number, number],
  print: boolean, rightLines: string[],
) {
  const hasLogo = !!settings?.companyLogo;
  const headerHeight = hasLogo ? 55 : 45;

  if (!print) {
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    doc.setFillColor(...secondaryColor);
    doc.rect(0, headerHeight, pageWidth, 2, 'F');
  } else {
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1.5);
    doc.line(0, headerHeight, pageWidth, headerHeight);
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.5);
    doc.line(0, headerHeight + 2, pageWidth, headerHeight + 2);
  }

  let textStartX = 14;
  if (hasLogo) {
    try {
      const logoX = 14;
      const logoY = 5;
      const imgProps = doc.getImageProperties(settings!.companyLogo!);
      const aspect = imgProps.width / imgProps.height;
      let logoW = 30 * aspect;
      let logoH = 30;
      if (logoW > 50) { logoW = 50; logoH = logoW / aspect; }
      doc.addImage(settings!.companyLogo!, 'PNG', logoX, logoY, logoW, logoH);
      textStartX = logoX + logoW + 8;
    } catch { /* ignora */ }
  }

  const headerTextColor: [number, number, number] = print ? primaryColor : [255, 255, 255];
  doc.setTextColor(...headerTextColor);
  let headerY = 12;

  if (settings?.companyName) {
    doc.setFontSize(hasLogo ? 16 : 14);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.companyName, textStartX, headerY);
    headerY += hasLogo ? 9 : 8;
  }

  doc.setFontSize(hasLogo ? 14 : 18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, textStartX, headerY + 4);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`N${String.fromCharCode(186)} ${orderNumber}`, textStartX, headerY + 12);

  // Direita
  doc.setFontSize(10);
  let ry = 15;
  rightLines.forEach((line) => {
    doc.text(line, pageWidth - 14, ry, { align: 'right' });
    ry += 8;
  });

  // EJR Organizador Global
  doc.setFontSize(6);
  doc.setFont('helvetica', 'italic');
  if (!print) {
    doc.setTextColor(255, 255, 255);
  } else {
    doc.setTextColor(180, 180, 180);
  }
  doc.text('EJR Organizador Global', pageWidth - 4, headerHeight - 2, { align: 'right' });

  return headerHeight;
}

// ===== Helper: desenhar footer (mesmo estilo do PDF Cotação) =====
function drawFooter(
  doc: jsPDF, pageWidth: number, pageHeight: number,
  settings: DocumentSettingsForPdf | undefined,
  secondaryColor: [number, number, number],
) {
  if (!settings?.footerAddress && !settings?.footerPhone && !settings?.footerEmail && !settings?.footerWebsite && !settings?.footerText) return;

  const footerStartY = pageHeight - 35;
  doc.setDrawColor(...secondaryColor);
  doc.setLineWidth(1);
  doc.line(14, footerStartY, pageWidth - 14, footerStartY);

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');

  let footerY = footerStartY + 6;
  const lines: string[] = [];
  if (settings!.footerAddress) lines.push(settings!.footerAddress);
  const parts: string[] = [];
  if (settings!.footerPhone) parts.push(`Tel: ${settings!.footerPhone}`);
  if (settings!.footerEmail) parts.push(settings!.footerEmail);
  if (settings!.footerWebsite) parts.push(settings!.footerWebsite);
  if (parts.length > 0) lines.push(parts.join(' | '));

  lines.forEach((line) => {
    doc.text(line, pageWidth / 2, footerY, { align: 'center' });
    footerY += 5;
  });
}

export function generateSupplierOrderPdf(order: SupplierOrder, settings?: DocumentSettingsForPdf, currency: Currency = 'BRL', printMode = false) {
  const formatPrice = (value: number) => formatPriceValue(value, currency);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const print = printMode;

  const primaryColor: [number, number, number] = settings?.primaryColor ? hexToRgb(settings.primaryColor) : [11, 92, 154];
  const textColor: [number, number, number] = [51, 51, 51];
  const secondaryColor: [number, number, number] = settings?.secondaryColor ? hexToRgb(settings.secondaryColor) : [183, 167, 164];
  const lightBg: [number, number, number] = [
    Math.round(secondaryColor[0] + (255 - secondaryColor[0]) * 0.7),
    Math.round(secondaryColor[1] + (255 - secondaryColor[1]) * 0.7),
    Math.round(secondaryColor[2] + (255 - secondaryColor[2]) * 0.7),
  ];

  const rightLines = [`Data: ${formatDate(order.orderDate)}`];
  if (order.expectedDeliveryDate) rightLines.push(`Entrega: ${formatDate(order.expectedDeliveryDate)}`);

  const headerHeight = drawHeader(doc, pageWidth, 'PEDIDO DE COMPRA', order.orderNumber, settings, primaryColor, secondaryColor, print, rightLines);

  let yPos = headerHeight + 10;

  // ===== DADOS GERAIS =====
  doc.setTextColor(...textColor);

  const infoLines: string[] = [];
  if (order.supplier?.name) infoLines.push(`Fornecedor: ${order.supplier.name}`);
  if (order.supplier?.document) infoLines.push(`Documento: ${order.supplier.document}`);
  if (order.purchaseOrder) {
    infoLines.push(`Ref. Ordem de Compra: ${order.purchaseOrder.orderNumber}${order.purchaseOrder.name ? ` - ${order.purchaseOrder.name}` : ''}`);
  }
  if (order.paymentTerms) infoLines.push(`Cond. Pagamento: ${order.paymentTerms}`);

  const boxHeight = 8 + infoLines.length * 7;
  if (!print) {
    doc.setFillColor(...lightBg);
    doc.rect(14, yPos, pageWidth - 28, boxHeight, 'F');
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, yPos, pageWidth - 28, boxHeight, 'S');
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS GERAIS', 18, yPos + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let infoY = yPos + 14;
  infoLines.forEach((line) => {
    doc.text(line, 18, infoY);
    infoY += 7;
  });

  yPos += boxHeight + 10;

  // ===== TABELA DE ITENS =====
  doc.setTextColor(...textColor);

  const items = order.items || [];
  const tableData = items.map((item, index) => [
    (index + 1).toString(),
    item.product?.factoryCode || '-',
    item.product?.name || '-',
    item.quantity.toString(),
    UNIT_LABELS['UNIT'],
    formatPrice(item.unitPrice ?? 0),
    (item.discountPercentage ?? 0) > 0 ? `${item.discountPercentage}%` : '-',
    formatPrice(item.totalPrice ?? 0),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Cod. Fab.', 'Produto', 'Qtd', 'Un', 'Preco Unit.', 'Desc.', 'Total']],
    body: tableData,
    theme: print ? 'grid' : 'striped',
    headStyles: print
      ? { fillColor: [255, 255, 255], textColor: primaryColor, fontStyle: 'bold', fontSize: 9, lineWidth: 0.5, lineColor: [200, 200, 200] }
      : { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: textColor },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Pagina ${doc.getCurrentPageInfo().pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // ===== TOTAIS =====
  const totalsX = pageWidth - 80;

  doc.setFontSize(10);
  doc.setTextColor(...textColor);

  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, finalY);
  doc.text(formatPrice(order.subtotal), pageWidth - 14, finalY, { align: 'right' });
  finalY += 7;

  if (order.discountAmount > 0) {
    doc.text('Desconto:', totalsX, finalY);
    doc.setTextColor(200, 0, 0);
    doc.text(`-${formatPrice(order.discountAmount)}`, pageWidth - 14, finalY, { align: 'right' });
    doc.setTextColor(...textColor);
    finalY += 7;
  }

  if (order.shippingCost > 0) {
    doc.text('Frete:', totalsX, finalY);
    doc.text(formatPrice(order.shippingCost), pageWidth - 14, finalY, { align: 'right' });
    finalY += 7;
  }

  doc.setDrawColor(...secondaryColor);
  doc.line(totalsX - 5, finalY, pageWidth - 14, finalY);
  finalY += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', totalsX, finalY);
  if (!print) doc.setTextColor(...primaryColor);
  doc.text(formatPrice(order.totalAmount), pageWidth - 14, finalY, { align: 'right' });
  finalY += 10;

  // ===== TOTAL DE ITENS =====
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de itens: ${items.length}`, 14, finalY);
  finalY += 15;

  // ===== OBSERVACOES =====
  if (order.notes) {
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Observacoes:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(order.notes, pageWidth - 28);
    doc.text(splitNotes, 14, finalY + 6);
  }

  drawFooter(doc, pageWidth, pageHeight, settings, secondaryColor);

  const suffix = print ? '_print' : '';
  doc.save(`Pedido_${order.orderNumber}${suffix}.pdf`);
}
