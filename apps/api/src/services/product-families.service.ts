import { ProductFamiliesRepository } from '../repositories/product-families.repository';
import type { ProductFamily, CreateProductFamilyDTO, UpdateProductFamilyDTO } from '@ejr/shared-types';

export class ProductFamiliesService {
  private repository: ProductFamiliesRepository;

  constructor() {
    this.repository = new ProductFamiliesRepository();
  }

  async getAll(): Promise<ProductFamily[]> {
    return this.repository.findAll();
  }

  async getActive(): Promise<ProductFamily[]> {
    return this.repository.findActive();
  }

  async getById(id: string): Promise<ProductFamily | null> {
    return this.repository.findById(id);
  }

  async create(data: CreateProductFamilyDTO): Promise<ProductFamily> {
    const existing = await this.repository.findByName(data.name);
    if (existing) {
      throw new Error('Já existe uma família com este nome');
    }

    return this.repository.create(data);
  }

  async update(id: string, data: UpdateProductFamilyDTO): Promise<ProductFamily> {
    const family = await this.repository.findById(id);
    if (!family) {
      throw new Error('Família não encontrada');
    }

    if (data.name && data.name.toLowerCase() !== family.name.toLowerCase()) {
      const existing = await this.repository.findByName(data.name);
      if (existing) {
        throw new Error('Já existe uma família com este nome');
      }
    }

    return this.repository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    const family = await this.repository.findById(id);
    if (!family) {
      throw new Error('Família não encontrada');
    }

    return this.repository.delete(id);
  }
}
