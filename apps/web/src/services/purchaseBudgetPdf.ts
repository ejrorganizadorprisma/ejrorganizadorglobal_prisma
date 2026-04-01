import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DocumentSettingsForPdf } from './supplierOrderPdf';
import type { PurchaseBudget, Currency } from '@ejr/shared-types';
import { formatPriceValue } from '../hooks/useFormatPrice';

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

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa', NORMAL: 'Normal', HIGH: 'Alta', URGENT: 'Urgente',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', PENDING: 'Pendente', APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado', ORDERED: 'Pedido Autorizado', PURCHASED: 'Comprado',
  RECEIVED: 'Recebido', CANCELLED: 'Cancelado',
};

// ===== Helper: desenhar header reutilizavel =====
function drawHeader(
  doc: jsPDF, pageWidth: number, budget: PurchaseBudget,
  title: string, settings: DocumentSettingsForPdf | undefined,
  primaryColor: [number, number, number], secondaryColor: [number, number, number],
  print: boolean, rightLines: string[],
) {
  const hasLogo = !!settings?.companyLogo;
  const headerHeight = hasLogo ? 55 : 45;

  if (!print) {
    // Fundo colorido
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    doc.setFillColor(...secondaryColor);
    doc.rect(0, headerHeight, pageWidth, 2, 'F');
  } else {
    // Modo impressao: borda inferior
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1.5);
    doc.line(0, headerHeight, pageWidth, headerHeight);
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.5);
    doc.line(0, headerHeight + 2, pageWidth, headerHeight + 2);
  }

  // Logo
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
  doc.text(`N${String.fromCharCode(186)} ${budget.budgetNumber}`, textStartX, headerY + 12);

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

// ===== Helper: desenhar footer =====
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

// =====================================================================
// PDF COTACAO — para enviar ao fornecedor (sem valores)
// =====================================================================

export function generatePurchaseBudgetPdf(budget: PurchaseBudget, settings?: DocumentSettingsForPdf, printMode = false, _currency: Currency = 'BRL') {
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

  const rightLines = [`Data: ${formatDate(budget.createdAt)}`];
  if (budget.leadTimeDays) rightLines.push(`Prazo desejado: ${budget.leadTimeDays} dias`);

  const headerHeight = drawHeader(doc, pageWidth, budget, 'SOLICITACAO DE COTACAO', settings, primaryColor, secondaryColor, print, rightLines);

  let yPos = headerHeight + 10;

  // ===== DADOS GERAIS =====
  doc.setTextColor(...textColor);

  const infoLines: string[] = [];
  infoLines.push(`Titulo: ${budget.title}`);
  if (budget.department) infoLines.push(`Departamento: ${budget.department}`);
  if (budget.manufacturers && budget.manufacturers.length > 0) {
    infoLines.push(`Fabricante(s): ${budget.manufacturers.join(', ')}`);
  }
  if (budget.description) infoLines.push(`Descricao: ${budget.description}`);
  if (budget.justification) infoLines.push(`Justificativa: ${budget.justification}`);

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

  const items = budget.items || [];
  const tableData = items.map((item, index) => [
    (index + 1).toString(),
    item.factoryCode || '-',
    item.productName,
    item.quantity.toString(),
    UNIT_LABELS[item.unit] || item.unit,
    item.notes || '',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Cod. Fab.', 'Produto', 'Qtd', 'Unidade', 'Observacoes']],
    body: tableData,
    theme: print ? 'grid' : 'striped',
    headStyles: print
      ? { fillColor: [255, 255, 255], textColor: primaryColor, fontStyle: 'bold', fontSize: 9, lineWidth: 0.5, lineColor: [200, 200, 200] }
      : { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: textColor },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 45 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Pagina ${doc.getCurrentPageInfo().pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de itens: ${items.length}`, 14, finalY);

  drawFooter(doc, pageWidth, pageHeight, settings, secondaryColor);

  const suffix = print ? '_print' : '';
  doc.save(`Cotacao_${budget.budgetNumber}${suffix}.pdf`);
}

// =====================================================================
// PDF COMPLETO — uso interno com todos os dados financeiros
// =====================================================================

export function generatePurchaseBudgetFullPdf(budget: PurchaseBudget, settings?: DocumentSettingsForPdf, printMode = false, currency: Currency = 'BRL') {
  // Taxas de câmbio do orçamento: rate1 = BRL_PYG, rate2 = USD_PYG, rate3 = USD_BRL
  const rate1 = budget.exchangeRate1 || 0;
  const rate2 = budget.exchangeRate2 || 0;
  const rate3 = budget.exchangeRate3 || 0;
  const hasRates = rate1 > 0 && rate2 > 0 && rate3 > 0;

  // Converte BRL centavos para a moeda de exibição (conversão DIRETA)
  const brlCentsToDisplay = (centsBRL: number): number => {
    const brl = centsBRL / 100;
    if (!hasRates || currency === 'BRL') return brl;
    if (currency === 'PYG') return brl * rate1;
    // USD
    return brl * (1 / rate3);
  };

  // Formata um valor já convertido na moeda de exibição
  const formatDisplayAmount = (amount: number): string => {
    if (currency === 'PYG') return formatPriceValue(Math.round(amount), 'PYG');
    if (currency === 'USD') return formatPriceValue(Math.round(amount * 100), 'USD');
    return formatPriceValue(Math.round(amount * 100), 'BRL');
  };

  // Converte preço unitário BRL cents → moeda de exibição (arredondado) × quantidade
  const calcItemSubtotal = (unitPriceCents: number, quantity: number): number => {
    const unitDisplay = brlCentsToDisplay(unitPriceCents);
    if (currency === 'PYG') return Math.round(unitDisplay) * quantity;
    return Math.round(unitDisplay * 100) * quantity / 100;
  };

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

  const rightLines = [`Data: ${formatDate(budget.createdAt)}`, `Status: ${STATUS_LABELS[budget.status] || budget.status}`];

  const headerHeight = drawHeader(doc, pageWidth, budget, 'ORCAMENTO DE COMPRA', settings, primaryColor, secondaryColor, print, rightLines);

  let yPos = headerHeight + 10;

  // ===== DADOS GERAIS (2 colunas) =====
  doc.setTextColor(...textColor);

  const fields: Array<{ label: string; value: string }> = [];
  fields.push({ label: 'Titulo', value: budget.title });
  fields.push({ label: 'Prioridade', value: PRIORITY_LABELS[budget.priority] || budget.priority });
  if (budget.department) fields.push({ label: 'Departamento', value: budget.department });
  if (budget.supplierName) fields.push({ label: 'Fornecedor', value: budget.supplierName });
  if (budget.manufacturers && budget.manufacturers.length > 0) {
    fields.push({ label: 'Fabricante(s)', value: budget.manufacturers.join(', ') });
  }
  if (budget.paymentTerms) fields.push({ label: 'Cond. Pagamento', value: budget.paymentTerms });
  if (budget.leadTimeDays) fields.push({ label: 'Prazo Entrega', value: `${budget.leadTimeDays} dias` });
  if (budget.createdByUser) fields.push({ label: 'Criado por', value: budget.createdByUser.name });
  if (budget.approvedByUser && budget.approvedAt) {
    fields.push({ label: 'Aprovado por', value: `${budget.approvedByUser.name} em ${formatDate(budget.approvedAt)}` });
  }
  if (budget.description) fields.push({ label: 'Descricao', value: budget.description });
  if (budget.justification) fields.push({ label: 'Justificativa', value: budget.justification });

  const rowCount = Math.ceil(fields.length / 2);
  const rowH = 7;
  const boxHeight = 10 + rowCount * rowH;
  const colWidth = (pageWidth - 28) / 2;

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

  doc.setFontSize(8);
  let infoY = yPos + 14;
  for (let i = 0; i < fields.length; i += 2) {
    const labelL = `${fields[i].label}:  `;
    doc.setFont('helvetica', 'bold');
    const labelLW = doc.getTextWidth(labelL);
    doc.text(labelL, 18, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(fields[i].value, 18 + labelLW, infoY);

    if (i + 1 < fields.length) {
      const rightX = 18 + colWidth;
      const labelR = `${fields[i + 1].label}:  `;
      doc.setFont('helvetica', 'bold');
      const labelRW = doc.getTextWidth(labelR);
      doc.text(labelR, rightX, infoY);
      doc.setFont('helvetica', 'normal');
      doc.text(fields[i + 1].value, rightX + labelRW, infoY);
    }
    infoY += rowH;
  }

  yPos += boxHeight + 10;

  // ===== TABELA DE ITENS COM VALORES =====
  const items = budget.items || [];
  const tableData = items.map((item, index) => {
    const selectedQuote = item.selectedQuoteId && item.quotes
      ? item.quotes.find(q => q.id === item.selectedQuoteId) : null;
    const unitPriceCents = selectedQuote ? selectedQuote.unitPrice : 0;
    const unitDisplay = unitPriceCents ? brlCentsToDisplay(unitPriceCents) : 0;
    const subtotalDisplay = unitPriceCents ? calcItemSubtotal(unitPriceCents, item.quantity) : 0;
    return [
      (index + 1).toString(), item.factoryCode || '-', item.productName, item.quantity.toString(),
      UNIT_LABELS[item.unit] || item.unit,
      selectedQuote ? (selectedQuote.supplierName || '-') : '-',
      unitDisplay ? formatDisplayAmount(unitDisplay) : '-',
      subtotalDisplay ? formatDisplayAmount(subtotalDisplay) : '-',
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Cod. Fab.', 'Produto', 'Qtd', 'Un', 'Fornecedor Cotacao', 'Preco Unit.', 'Total']],
    body: tableData,
    theme: print ? 'grid' : 'striped',
    headStyles: print
      ? { fillColor: [255, 255, 255], textColor: primaryColor, fontStyle: 'bold', fontSize: 8, lineWidth: 0.5, lineColor: [200, 200, 200] }
      : { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: textColor },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 24 }, 2: { cellWidth: 'auto' },
      3: { cellWidth: 12, halign: 'center' }, 4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 32 }, 6: { cellWidth: 24, halign: 'right' }, 7: { cellWidth: 24, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Pagina ${doc.getCurrentPageInfo().pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // ===== Calcular subtotal na moeda de exibição =====
  const additionalCosts = budget.additionalCosts || [];
  let subtotalDisplay = 0;
  items.forEach((item) => {
    if (item.selectedQuoteId && item.quotes) {
      const q = item.quotes.find(q => q.id === item.selectedQuoteId);
      if (q) subtotalDisplay += calcItemSubtotal(q.unitPrice, item.quantity);
    }
  });
  const totalPct = additionalCosts.reduce((s: number, c: any) => s + (c.percentage || 0), 0);
  const totalWithCostsDisplay = currency === 'PYG'
    ? Math.round(subtotalDisplay * (1 + totalPct / 100))
    : subtotalDisplay * (1 + totalPct / 100);

  // ===== CUSTOS ADICIONAIS =====
  if (additionalCosts.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('Custos Adicionais', 14, finalY);
    finalY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    additionalCosts.forEach((cost: any) => {
      const costValue = subtotalDisplay * (cost.percentage || 0) / 100;
      const costRounded = currency === 'PYG' ? Math.round(costValue) : costValue;
      doc.text(`${cost.name}: ${cost.percentage}%`, 18, finalY);
      doc.setTextColor(120, 120, 120);
      doc.text(`(${formatDisplayAmount(costRounded)})`, 18 + doc.getTextWidth(`${cost.name}: ${cost.percentage}%`) + 3, finalY);
      doc.setTextColor(...textColor);
      finalY += 5;
    });
    const totalCostDisplay = totalWithCostsDisplay - subtotalDisplay;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total custos adicionais: ${totalPct}%`, 18, finalY);
    doc.setTextColor(120, 120, 120);
    doc.text(`(${formatDisplayAmount(totalCostDisplay)})`, 18 + doc.getTextWidth(`Total custos adicionais: ${totalPct}%`) + 3, finalY);
    doc.setTextColor(...textColor);
    finalY += 10;
  }

  // ===== TOTAIS =====
  const totalsX = pageWidth - 80;

  if (subtotalDisplay > 0) {
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX, finalY);
    doc.text(formatDisplayAmount(subtotalDisplay), pageWidth - 14, finalY, { align: 'right' });
    finalY += 7;

    if (totalPct > 0) {
      doc.text(`Custos adicionais (${totalPct}%):`, totalsX, finalY);
      doc.text(formatDisplayAmount(totalWithCostsDisplay - subtotalDisplay), pageWidth - 14, finalY, { align: 'right' });
      finalY += 7;
    }

    doc.setDrawColor(...secondaryColor);
    doc.line(totalsX - 5, finalY, pageWidth - 14, finalY);
    finalY += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', totalsX, finalY);
    if (!print) doc.setTextColor(...primaryColor);
    doc.text(formatDisplayAmount(totalWithCostsDisplay), pageWidth - 14, finalY, { align: 'right' });
    finalY += 15;
  }

  // ===== PARCELAS =====
  const installments = budget.paymentInstallments || [];
  if (installments.length > 0) {
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Parcelas de Pagamento', 14, finalY);
    finalY += 2;

    const instData = installments.map((inst: any) => [
      `${inst.installmentNumber}`, formatDisplayAmount(brlCentsToDisplay(inst.amount)), formatDate(inst.dueDate),
      inst.status === 'PAID' ? 'Pago' : inst.status === 'OVERDUE' ? 'Vencido' : 'Pendente',
    ]);

    autoTable(doc, {
      startY: finalY,
      head: [['#', 'Valor', 'Vencimento', 'Status']],
      body: instData,
      theme: print ? 'grid' : 'striped',
      headStyles: print
        ? { fillColor: [255, 255, 255], textColor: primaryColor, fontStyle: 'bold', fontSize: 8, lineWidth: 0.5, lineColor: [200, 200, 200] }
        : { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: textColor },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 30, halign: 'center' }, 3: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });
    finalY = (doc as any).lastAutoTable.finalY + 10;
  }

  drawFooter(doc, pageWidth, pageHeight, settings, secondaryColor);

  const suffix = print ? '_print' : '';
  doc.save(`OC_${budget.budgetNumber}${suffix}.pdf`);
}
