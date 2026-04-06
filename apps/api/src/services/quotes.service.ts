import { QuotesRepository } from '../repositories/quotes.repository';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { db } from '../config/database';
import type { CreateQuoteDTO, UpdateQuoteDTO, QuoteStatus } from '@ejr/shared-types';

export class QuotesService {
  private repository = new QuotesRepository();

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    status?: QuoteStatus;
    customerId?: string;
    responsibleUserId?: string;
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
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day

    if (validUntil < today) {
      throw new BadRequestError('Data de validade não pode ser anterior à data atual');
    }

    const quote = await this.repository.create(data, userId);

    // ─── GPS hook: store coordinates + log GPS event ───
    try {
      if (data.latitude != null && data.longitude != null) {
        // Store coordinates on the quote record
        await db.query(
          'UPDATE quotes SET latitude = $1, longitude = $2 WHERE id = $3',
          [data.latitude, data.longitude, quote.id]
        );

        // Insert gps_event
        const gpsId = `gps-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await db.query(
          `INSERT INTO gps_events (id, user_id, event_type, event_id, latitude, longitude)
           VALUES ($1, $2, 'QUOTE', $3, $4, $5)`,
          [gpsId, userId, quote.id, data.latitude, data.longitude]
        );
      }
    } catch (hookError) {
      console.error('Erro no hook GPS pós-criação de orçamento:', hookError);
    }

    return quote;
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
