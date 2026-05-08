/**
 * Labels amigáveis dos métodos de pagamento (chaves usadas no banco).
 * Compartilhado entre CustomerFormPage, SalesOrderFormPage etc.
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'Pix',
  CASH: 'Efectivo',
  CREDIT: 'Crédito',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Tarjeta Débito',
  BANK_TRANSFER: 'Transferencia',
  BOLETO: 'Boleto',
  CHECK: 'Cheque',
  PROMISSORY: 'Pagaré',
  OTHER: 'Otro',
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] || method;
}
