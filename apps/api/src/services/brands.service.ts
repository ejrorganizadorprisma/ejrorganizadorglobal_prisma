import {
  BrandsRepository,
  CreateBrandDTO,
  UpdateBrandDTO,
  Brand,
} from '../repositories/brands.repository';

export class BrandsService {
  private repository: BrandsRepository;

  constructor() {
    this.repository = new BrandsRepository();
  }

  async findMany(params: { page: number; limit: number; search?: string; status?: string }) {
    return this.repository.findMany(params);
  }

  async findById(id: string): Promise<Brand> {
    const brand = await this.repository.findById(id);
    if (!brand) {
      throw new Error('Marca não encontrada');
    }
    return brand;
  }

  async create(data: CreateBrandDTO): Promise<Brand> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Nome é obrigatório');
    }
    const existing = await this.repository.findByName(data.name);
    if (existing) {
      throw new Error(`Marca "${existing.name}" já está cadastrada`);
    }
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateBrandDTO): Promise<Brand> {
    await this.findById(id);
    if (data.name && data.name.trim()) {
      const existing = await this.repository.findByName(data.name);
      if (existing && existing.id !== id) {
        throw new Error(`Marca "${existing.name}" já está cadastrada`);
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
