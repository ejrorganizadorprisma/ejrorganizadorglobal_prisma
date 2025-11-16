import {
  SuppliersRepository,
  CreateSupplierDTO,
  UpdateSupplierDTO,
  Supplier
} from '../repositories/suppliers.repository';

export class SuppliersService {
  private repository: SuppliersRepository;

  constructor() {
    this.repository = new SuppliersRepository();
  }

  // Validação de CNPJ (simplificada)
  private validateCNPJ(cnpj: string): boolean {
    if (!cnpj) return true; // CNPJ é opcional

    // Remove caracteres não numéricos
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');

    // CNPJ deve ter 14 dígitos
    if (cleanCNPJ.length !== 14) return false;

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cleanCNPJ)) return false;

    return true;
  }

  // Validação de CPF (simplificada)
  private validateCPF(cpf: string): boolean {
    if (!cpf) return true; // CPF é opcional

    // Remove caracteres não numéricos
    const cleanCPF = cpf.replace(/[^\d]/g, '');

    // CPF deve ter 11 dígitos
    if (cleanCPF.length !== 11) return false;

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cleanCPF)) return false;

    return true;
  }

  // Validação de Tax ID (CNPJ ou CPF)
  private validateTaxId(taxId?: string): void {
    if (!taxId) return;

    const cleanTaxId = taxId.replace(/[^\d]/g, '');

    if (cleanTaxId.length === 14) {
      if (!this.validateCNPJ(taxId)) {
        throw new Error('CNPJ inválido');
      }
    } else if (cleanTaxId.length === 11) {
      if (!this.validateCPF(taxId)) {
        throw new Error('CPF inválido');
      }
    } else if (cleanTaxId.length > 0) {
      throw new Error('Tax ID deve ser um CNPJ (14 dígitos) ou CPF (11 dígitos)');
    }
  }

  // Validação de código único
  private async validateUniqueCode(code: string, excludeId?: string): Promise<void> {
    const existing = await this.repository.findByCode(code);

    if (existing && existing.id !== excludeId) {
      throw new Error(`Código ${code} já está em uso`);
    }
  }

  // Validação de rating
  private validateRating(rating?: number): void {
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new Error('Rating deve estar entre 1 e 5');
    }
  }

  async findMany(params: { page: number; limit: number; search?: string; status?: string }) {
    return this.repository.findMany(params);
  }

  async findById(id: string): Promise<Supplier | null> {
    const supplier = await this.repository.findById(id);

    if (!supplier) {
      throw new Error('Fornecedor não encontrado');
    }

    return supplier;
  }

  async findByCode(code: string): Promise<Supplier | null> {
    return this.repository.findByCode(code);
  }

  async create(data: CreateSupplierDTO): Promise<Supplier> {
    // Validações
    if (!data.code) {
      throw new Error('Código é obrigatório');
    }

    if (!data.name) {
      throw new Error('Nome é obrigatório');
    }

    await this.validateUniqueCode(data.code);
    this.validateTaxId(data.taxId);
    this.validateRating(data.rating);

    return this.repository.create(data);
  }

  async update(id: string, data: UpdateSupplierDTO): Promise<Supplier> {
    // Verifica se o fornecedor existe
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Fornecedor não encontrado');
    }

    // Validações
    if (data.code) {
      await this.validateUniqueCode(data.code, id);
    }

    this.validateTaxId(data.taxId);
    this.validateRating(data.rating);

    return this.repository.update(id, data);
  }

  async delete(id: string) {
    // Verifica se o fornecedor existe
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Fornecedor não encontrado');
    }

    return this.repository.delete(id);
  }

  // Métodos para endereços
  async getAddresses(supplierId: string) {
    // Verifica se o fornecedor existe
    await this.findById(supplierId);

    return this.repository.getAddresses(supplierId);
  }

  async addAddress(supplierId: string, addressData: any) {
    // Verifica se o fornecedor existe
    await this.findById(supplierId);

    // Validações
    if (!addressData.type) {
      throw new Error('Tipo de endereço é obrigatório');
    }

    return this.repository.addAddress({
      ...addressData,
      supplierId,
    });
  }

  async updateAddress(addressId: string, addressData: any) {
    return this.repository.updateAddress(addressId, addressData);
  }

  async deleteAddress(addressId: string) {
    return this.repository.deleteAddress(addressId);
  }

  // Métodos para contatos
  async getContacts(supplierId: string) {
    // Verifica se o fornecedor existe
    await this.findById(supplierId);

    return this.repository.getContacts(supplierId);
  }

  async addContact(supplierId: string, contactData: any) {
    // Verifica se o fornecedor existe
    await this.findById(supplierId);

    // Validações
    if (!contactData.name) {
      throw new Error('Nome do contato é obrigatório');
    }

    return this.repository.addContact({
      ...contactData,
      supplierId,
    });
  }

  async updateContact(contactId: string, contactData: any) {
    return this.repository.updateContact(contactId, contactData);
  }

  async deleteContact(contactId: string) {
    return this.repository.deleteContact(contactId);
  }

  // Método para buscar produtos do fornecedor
  async getProductSuppliers(supplierId: string) {
    // Verifica se o fornecedor existe
    await this.findById(supplierId);

    return this.repository.getProductSuppliers(supplierId);
  }
}
