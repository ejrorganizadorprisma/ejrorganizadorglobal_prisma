import { FinancialRepository } from '../repositories/financial.repository';
import { BadRequestError } from '../utils/errors';
import type {
  FinancialSummary,
  CashFlowResponse,
  CalendarResponse,
  FinancialFilters,
  FinancialListResponse,
  DebtorFilters,
  DebtorListResponse,
} from '@ejr/shared-types';

export class FinancialService {
  private repository = new FinancialRepository();

  /**
   * Obter resumo financeiro geral
   */
  async getSummary(): Promise<FinancialSummary> {
    return this.repository.getSummary();
  }

  /**
   * Obter fluxo de caixa para os próximos N dias
   */
  async getCashFlow(days: number): Promise<CashFlowResponse> {
    if (!days || days < 1) {
      throw new BadRequestError('O número de dias deve ser pelo menos 1');
    }

    if (days > 365) {
      throw new BadRequestError('O número máximo de dias é 365');
    }

    return this.repository.getCashFlow(days);
  }

  /**
   * Obter calendário financeiro de um mês
   */
  async getCalendar(month: string): Promise<CalendarResponse> {
    // Validar formato YYYY-MM
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!month || !monthRegex.test(month)) {
      throw new BadRequestError('O mês deve estar no formato YYYY-MM');
    }

    return this.repository.getCalendar(month);
  }

  /**
   * Listar contas a receber com filtros e paginação
   */
  async getReceivables(filters: FinancialFilters): Promise<FinancialListResponse> {
    return this.repository.getReceivables(filters);
  }

  /**
   * Listar contas a pagar com filtros e paginação
   */
  async getPayables(filters: FinancialFilters): Promise<FinancialListResponse> {
    return this.repository.getPayables(filters);
  }

  /**
   * Listar devedores com filtros e paginação
   */
  async getDebtors(filters: DebtorFilters): Promise<DebtorListResponse> {
    return this.repository.getDebtors(filters);
  }
}
