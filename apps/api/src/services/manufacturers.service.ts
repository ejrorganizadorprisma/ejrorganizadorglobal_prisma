import {
  ManufacturersRepository,
  CreateManufacturerDTO,
  UpdateManufacturerDTO,
  Manufacturer,
} from '../repositories/manufacturers.repository';

export class ManufacturersService {
  private repository: ManufacturersRepository;

  constructor() {
    this.repository = new ManufacturersRepository();
  }

  async findMany(params: { page: number; limit: number; search?: string; status?: string }) {
    return this.repository.findMany(params);
  }

  async findById(id: string): Promise<Manufacturer> {
    const manufacturer = await this.repository.findById(id);
    if (!manufacturer) {
      throw new Error('Indústria não encontrada');
    }
    return manufacturer;
  }

  async create(data: CreateManufacturerDTO): Promise<Manufacturer> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Nome é obrigatório');
    }
    const existing = await this.repository.findByName(data.name);
    if (existing) {
      throw new Error(`Indústria "${existing.name}" já está cadastrada`);
    }
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateManufacturerDTO): Promise<Manufacturer> {
    await this.findById(id);
    if (data.name && data.name.trim()) {
      const existing = await this.repository.findByName(data.name);
      if (existing && existing.id !== id) {
        throw new Error(`Indústria "${existing.name}" já está cadastrada`);
      }
    }
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repository.delete(id);
  }

  async listNames(search?: string): Promise<string[]> {
    return this.repository.listNames(search);
  }
}
