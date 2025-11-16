import { QuotesRepository } from '../repositories/quotes.repository';
import { NotFoundError, BadRequestError } from '../utils/errors';
import type { CreateQuoteDTO, UpdateQuoteDTO, QuoteStatus } from '@ejr/shared-types';

export class QuotesService {
  private repository = new QuotesRepository();

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    status?: QuoteStatus;
    customerId?: string;
  }) {
    return this.repository.findMany(params);
  }

  async getById(id: string) {
    const quote = await this.repository.findById(id);
    if (!quote) {
      throw new NotFoundError('Orçamento não encontrado');
    }
    return quote;
  }

  async create(data: CreateQuoteDTO, userId: string) {
    // Validar data de validade
    const validUntil = new Date(data.validUntil);
    if (validUntil <= new Date()) {
      throw new BadRequestError('Data de validade deve ser futura');
    }

    return this.repository.create(data, userId);
  }

  async update(id: string, data: UpdateQuoteDTO) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Orçamento não encontrado');
    }

    // Não permite editar se já foi convertido
    if (existing.status === 'CONVERTED') {
      throw new BadRequestError('Não é possível editar um orçamento já convertido');
    }

    return this.repository.update(id, data);
  }

  async delete(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Orçamento não encontrado');
    }

    // Não permite deletar se já foi convertido
    if (existing.status === 'CONVERTED') {
      throw new BadRequestError('Não é possível deletar um orçamento já convertido');
    }

    return this.repository.delete(id);
  }

  async updateStatus(id: string, status: QuoteStatus) {
    return this.repository.update(id, { status });
  }
}
