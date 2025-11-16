import { SalesRepository } from '../repositories/sales.repository';
import { QuotesRepository } from '../repositories/quotes.repository';
import { NotFoundError, BadRequestError } from '../utils/errors';

export class SalesService {
  private repository = new SalesRepository();
  private quotesRepo = new QuotesRepository();

  async convertQuoteToSale(quoteId: string, userId: string) {
    const quote = await this.quotesRepo.findById(quoteId);
    if (!quote) {
      throw new NotFoundError('Orçamento não encontrado');
    }

    if (quote.status !== 'APPROVED') {
      throw new BadRequestError('Apenas orçamentos aprovados podem ser convertidos');
    }

    if (quote.status === 'CONVERTED') {
      throw new BadRequestError('Orçamento já foi convertido');
    }

    return this.repository.create(quoteId, userId);
  }
}
