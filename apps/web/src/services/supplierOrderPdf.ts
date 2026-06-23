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
  // ===== Conversão de moeda — mesmas regras da página do pedido =====
  // Valores ficam armazenados em centavos de BRL; convertemos via câmbio do orçamento.
  const budget: any = (order as any).budget;
  const primary = (budget?.currency || currency || 'BRL') as 'BRL' | 'USD' | 'PYG';
  const r1 = budget?.exchangeRate1 || 0; // 1 BRL = X PYG
  const r2 = budget?.exchangeRate2 || 0; // 1 USD = X PYG
  const r3 = budget?.exchangeRate3 || 0; // 1 USD = X BRL
  const hasRates = r1 > 0 && r2 > 0 && r3 > 0;
  const directRates: Record<string, number> | null = hasRates
    ? { BRL_PYG: r1, PYG_BRL: 1 / r1, USD_PYG: r2, PYG_USD: 1 / r2, USD_BRL: r3, BRL_USD: 1 / r3 }
    : null;
  const convertDirect = (amount: number, from: string, to: string): number => {
    if (from === to || !directRates) return amount;
    return amount * (directRates[`${from}_${to}`] ?? 1);
  };
  const fmtCur = (amount: number, cur: string) => {
    if (cur === 'PYG') return formatPriceValue(Math.round(amount), 'PYG');
    if (cur === 'USD') return formatPriceValue(Math.round(amount * 100), 'USD');
    return formatPriceValue(Math.round(amount * 100), 'BRL');
  };
  const toPrimary = (centsBRL: number): number => {
    const amt = convertDirect((centsBRL || 0) / 100, 'BRL', primary);
    return primary === 'PYG' ? Math.round(amt) : Math.round(amt * 100) / 100;
  };
  const showPrice = (centsBRL: number) => fmtCur(toPrimary(centsBRL), primary);
  const otherCurrencies = (['BRL', 'USD', 'PYG'] as const).filter((c) => c !== primary);
  const secondary = (centsBRL: number): string => {
    if (!hasRates) return '';
    const p = toPrimary(centsBRL);
    return otherCurrencies.map((c) => fmtCur(convertDirect(p, primary, c), c)).join(' / ');
  };
  // Custos adicionais (igual ao orçamento) e preço unitário em Guaraní com custos
  const totalAdditionalPct = ((budget?.additionalCosts || []) as any[]).reduce((s, c) => s + (c?.percentage || 0), 0);
  const costMult = 1 + totalAdditionalPct / 100;
  const pygOf = (centsBRL: number): string => fmtCur(convertDirect((centsBRL || 0) / 100, 'BRL', 'PYG'), 'PYG');
  const brlUsdOf = (centsBRL: number): string => {
    if (!hasRates) return '';
    const brl = (centsBRL || 0) / 100;
    return `${fmtCur(brl, 'BRL')} / ${fmtCur(convertDirect(brl, 'BRL', 'USD'), 'USD')}`;
  };
  // Subtotal = soma exata dos subtotais de linha (cru); Total geral fecha com as linhas
  const subtotalRaw = ((order.items || []) as any[]).reduce((s, it) => s + (it?.totalPrice || 0), 0) || order.subtotal || 0;
  const totalWithCosts = Math.round(subtotalRaw * costMult);

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
  const unitGsHeader = `Unit. c/ custos ${String.fromCharCode(0x20B2)}`; // ₲
  const tableData = items.map((item, index) => {
    const unitCents = item.unitPrice ?? 0;
    const totCents = item.totalPrice ?? 0;
    const sec = secondary(unitCents);
    const secTot = secondary(totCents);
    const gs = pygOf(unitCents * costMult);
    const gsSec = brlUsdOf(unitCents * costMult);
    const addPctLine = totalAdditionalPct > 0 ? `\n+${totalAdditionalPct.toFixed(1)}%` : '';
    return [
      (index + 1).toString(),
      item.product?.factoryCode || '-',
      item.product?.name || '-',
      item.quantity.toString(),
      showPrice(unitCents) + (sec ? `\n${sec}` : ''),
      gs + (gsSec ? `\n${gsSec}` : '') + addPctLine,
      showPrice(totCents) + (secTot ? `\n${secTot}` : ''),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Cod. Forn.', 'Produto', 'Qtd', 'Preco Unit.', unitGsHeader, 'Total']],
    body: tableData,
    theme: print ? 'grid' : 'striped',
    headStyles: print
      ? { fillColor: [255, 255, 255], textColor: primaryColor, fontStyle: 'bold', fontSize: 8.5, lineWidth: 0.5, lineColor: [200, 200, 200] }
      : { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: textColor },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 40, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Pagina ${doc.getCurrentPageInfo().pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // ===== TOTAIS (mesmas regras da página: Total = soma dos subtotais) =====
  const totalsX = pageWidth - 90;

  doc.setFontSize(10);
  doc.setTextColor(...textColor);

  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, finalY);
  doc.text(showPrice(subtotalRaw), pageWidth - 14, finalY, { align: 'right' });
  finalY += 7;

  doc.setDrawColor(...secondaryColor);
  doc.line(totalsX - 5, finalY, pageWidth - 14, finalY);
  finalY += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', totalsX, finalY);
  if (!print) doc.setTextColor(...primaryColor);
  doc.text(showPrice(subtotalRaw), pageWidth - 14, finalY, { align: 'right' });
  doc.setTextColor(...textColor);
  finalY += 6;

  // Outras moedas do total
  const secTotal = secondary(subtotalRaw);
  if (secTotal) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(secTotal, pageWidth - 14, finalY, { align: 'right' });
    doc.setTextColor(...textColor);
    finalY += 6;
  }

  // Referência: valor com custos adicionais (+X%)
  if (totalAdditionalPct > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(190, 120, 20);
    const ref = `c/ custos adicionais (+${totalAdditionalPct.toFixed(1)}%): ${showPrice(totalWithCosts)}`;
    doc.text(ref, pageWidth - 14, finalY, { align: 'right' });
    finalY += 5;
    const secRef = secondary(totalWithCosts);
    if (secRef) {
      doc.setFontSize(7.5);
      doc.text(secRef, pageWidth - 14, finalY, { align: 'right' });
      finalY += 5;
    }
    doc.setTextColor(...textColor);
  }
  finalY += 6;

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
