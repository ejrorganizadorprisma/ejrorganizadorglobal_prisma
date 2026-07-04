import { CarriersRepository } from '../repositories/carriers.repository';
import type { Carrier, CreateCarrierDTO, UpdateCarrierDTO } from '@ejr/shared-types';
import { NotFoundError, BadRequestError } from '../utils/errors';

export class CarriersService {
  private repository = new CarriersRepository();

  async findMany(params: { page: number; limit: number; search?: string; status?: string }) {
    return this.repository.findMany(params);
  }

  async findById(id: string): Promise<Carrier> {
    const carrier = await this.repository.findById(id);
    if (!carrier) throw new NotFoundError('Transportadora não encontrada');
    return carrier;
  }

  async create(data: CreateCarrierDTO): Promise<Carrier> {
    if (!data.name || !data.name.trim()) throw new BadRequestError('Nome é obrigatório');
    const existing = await this.repository.findByName(data.name);
    if (existing) throw new BadRequestError(`Transportadora "${existing.name}" já está cadastrada`);
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateCarrierDTO): Promise<Carrier> {
    await this.findById(id);
    if (data.name && data.name.trim()) {
      const existing = await this.repository.findByName(data.name);
      if (existing && existing.id !== id) throw new BadRequestError(`Transportadora "${existing.name}" já está cadastrada`);
    }
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repository.delete(id);
  }
}
