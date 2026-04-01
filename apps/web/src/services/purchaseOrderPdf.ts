import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Currency } from '@ejr/shared-types';
import { formatPriceValue } from '../hooks/useFormatPrice';
import type { DocumentSettingsForPdf } from './supplierOrderPdf';

interface PurchaseOrderItem {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku?: string;
    code?: string;
  };
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountPercentage: number;
  totalPrice: number;
  supplierId?: string;
  supplier?: {
    id: string;
    name: string;
  };
  notes?: string;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  name?: string;
  supplierId?: string;
  supplier?: {
    id: string;
    name: string;
    taxId?: string;
  };
  status: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  paymentTerms?: string;
  notes?: string;
  items?: PurchaseOrderItem[];
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [11, 92, 154]; // Default blue
};

export function generatePurchaseOrderPdf(order: PurchaseOrder, settings?: DocumentSettingsForPdf, currency: Currency = 'BRL') {
  const formatPrice = (value: number) => formatPriceValue(value, currency);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Cores (usar configuracoes ou padrao)
  const primaryColor: [number, number, number] = settings?.primaryColor
    ? hexToRgb(settings.primaryColor)
    : [11, 92, 154]; // #0B5C9A
  const textColor: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [245, 245, 245];

  // Header com fundo colorido
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');

  let headerY = 12;

  // Nome da empresa ou titulo
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const titleX = 14;

  if (settings?.companyName) {
    doc.text(settings.companyName, titleX, headerY);
    headerY += 6;
  }

  // Titulo do documento
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEM DE COMPRA', titleX, headerY + 6);

  // Numero da ordem
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`N${String.fromCharCode(186)} ${order.orderNumber}`, titleX, headerY + 14);

  // Data no canto direito
  doc.setFontSize(10);
  doc.text(`Data: ${formatDate(order.orderDate)}`, pageWidth - 14, 15, { align: 'right' });
  if (order.expectedDeliveryDate) {
    doc.text(`Entrega Prevista: ${formatDate(order.expectedDeliveryDate)}`, pageWidth - 14, 23, { align: 'right' });
  }

  let yPos = 55;

  // Nome da Ordem (se houver)
  if (order.name) {
    doc.setTextColor(...textColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(order.name, 14, yPos);
    yPos += 10;
  }

  // Informacoes do Fornecedor (se definido)
  if (order.supplier) {
    doc.setTextColor(...textColor);
    doc.setFillColor(...lightGray);
    doc.rect(14, yPos, pageWidth - 28, 30, 'F');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FORNECEDOR', 18, yPos + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(order.supplier.name, 18, yPos + 18);
    if (order.supplier.taxId) {
      doc.setFontSize(9);
      doc.text(`CNPJ/CPF: ${order.supplier.taxId}`, 18, yPos + 25);
    }

    yPos += 40;
  }

  // Tabela de Itens
  doc.setTextColor(...textColor);

  const tableData = order.items?.map((item, index) => [
    (index + 1).toString(),
    item.product?.code || item.product?.sku || '-',
    item.product?.name || '-',
    (item.quantity ?? 0).toString(),
    formatPrice(item.unitPrice ?? 0),
    (item.discountPercentage ?? 0) > 0 ? `${item.discountPercentage}%` : '-',
    formatPrice(item.totalPrice ?? 0),
  ]) || [];

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Codigo', 'Produto', 'Qtd', 'Preco Unit.', 'Desc.', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 25 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      // Footer em cada pagina
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Pagina ${doc.getCurrentPageInfo().pageNumber}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    },
  });

  // Posicao apos a tabela
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totais
  const totalsX = pageWidth - 80;
  let totalsY = finalY;

  doc.setFontSize(10);
  doc.setTextColor(...textColor);

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, totalsY);
  doc.text(formatPrice(order.subtotal), pageWidth - 14, totalsY, { align: 'right' });
  totalsY += 7;

  // Desconto (se houver)
  if (order.discountAmount > 0) {
    doc.text('Desconto:', totalsX, totalsY);
    doc.setTextColor(200, 0, 0);
    doc.text(`-${formatPrice(order.discountAmount)}`, pageWidth - 14, totalsY, { align: 'right' });
    doc.setTextColor(...textColor);
    totalsY += 7;
  }

  // Impostos (se houver)
  if (order.taxAmount > 0) {
    doc.text('Impostos:', totalsX, totalsY);
    doc.text(formatPrice(order.taxAmount), pageWidth - 14, totalsY, { align: 'right' });
    totalsY += 7;
  }

  // Frete (se houver)
  if (order.shippingCost > 0) {
    doc.text('Frete:', totalsX, totalsY);
    doc.text(formatPrice(order.shippingCost), pageWidth - 14, totalsY, { align: 'right' });
    totalsY += 7;
  }

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX - 5, totalsY, pageWidth - 14, totalsY);
  totalsY += 7;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', totalsX, totalsY);
  doc.setTextColor(...primaryColor);
  doc.text(formatPrice(order.totalAmount), pageWidth - 14, totalsY, { align: 'right' });

  totalsY += 15;

  // Condicoes de Pagamento (se houver)
  if (order.paymentTerms) {
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Condicoes de Pagamento:', 14, totalsY);
    doc.setFont('helvetica', 'normal');
    doc.text(order.paymentTerms, 14, totalsY + 6);
    totalsY += 15;
  }

  // Observacoes (se houver)
  if (order.notes) {
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Observacoes:', 14, totalsY);
    doc.setFont('helvetica', 'normal');

    // Quebra de linha para observacoes longas
    const splitNotes = doc.splitTextToSize(order.notes, pageWidth - 28);
    doc.text(splitNotes, 14, totalsY + 6);
    totalsY += 6 + (splitNotes.length * 5);
  }

  // Rodape com dados da empresa (se configurado)
  if (settings?.footerAddress || settings?.footerPhone || settings?.footerEmail || settings?.footerWebsite || settings?.footerText) {
    // Linha separadora do rodape
    const footerStartY = pageHeight - 35;

    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(14, footerStartY, pageWidth - 14, footerStartY);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');

    let footerY = footerStartY + 6;
    const footerLines: string[] = [];

    if (settings.footerAddress) {
      footerLines.push(settings.footerAddress);
    }

    const contactParts: string[] = [];
    if (settings.footerPhone) contactParts.push(`Tel: ${settings.footerPhone}`);
    if (settings.footerEmail) contactParts.push(settings.footerEmail);
    if (settings.footerWebsite) contactParts.push(settings.footerWebsite);

    if (contactParts.length > 0) {
      footerLines.push(contactParts.join(' | '));
    }

    footerLines.forEach((line) => {
      doc.text(line, pageWidth / 2, footerY, { align: 'center' });
      footerY += 5;
    });
  }

  // Salvar o PDF
  doc.save(`OC_${order.orderNumber}.pdf`);
}
