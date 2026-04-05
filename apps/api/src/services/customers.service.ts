import { CustomersRepository } from '../repositories/customers.repository';
import { AppError } from '../utils/errors';
import type { CreateCustomerDTO, UpdateCustomerDTO, CustomerType } from '@ejr/shared-types';

export class CustomersService {
  private repository: CustomersRepository;

  constructor() {
    this.repository = new CustomersRepository();
  }

  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    type?: CustomerType;
    createdBy?: string;
  }) {
    const { page, limit, search, type, createdBy } = params;

    if (page < 1 || limit < 1 || limit > 100) {
      throw new AppError('Parâmetros de paginação inválidos', 400, 'INVALID_PAGINATION');
    }

    const [customers, total] = await Promise.all([
      this.repository.findMany({ page, limit, search, type, createdBy }),
      this.repository.count({ search, type, createdBy }),
    ]);

    return {
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const customer = await this.repository.findById(id);

    if (!customer) {
      throw new AppError('Cliente não encontrado', 404, 'CUSTOMER_NOT_FOUND');
    }

    return customer;
  }

  async findByDocument(document: string) {
    const customer = await this.repository.findByDocument(document);

    if (!customer) {
      throw new AppError('Cliente não encontrado', 404, 'CUSTOMER_NOT_FOUND');
    }

    return customer;
  }

  async create(data: CreateCustomerDTO, userId?: string) {
    let cleanDocument: string | undefined;

    // Validação de documento BR (CPF/CNPJ) - só quando documento é fornecido
    if (data.document) {
      cleanDocument = data.document.replace(/\D/g, '');

      // Verificar se já existe cliente com o mesmo documento
      const existingCustomer = await this.repository.findByDocument(cleanDocument);
      if (existingCustomer) {
        throw new AppError('Já existe um cliente com este documento', 409, 'DUPLICATE_DOCUMENT');
      }

      if (data.type === 'INDIVIDUAL') {
        // CPF deve ter 11 dígitos
        if (cleanDocument.length !== 11) {
          throw new AppError('CPF inválido', 400, 'INVALID_CPF');
        }
        if (!this.isValidCPF(cleanDocument)) {
          throw new AppError('CPF inválido', 400, 'INVALID_CPF');
        }
      } else {
        // CNPJ deve ter 14 dígitos
        if (cleanDocument.length !== 14) {
          throw new AppError('CNPJ inválido', 400, 'INVALID_CNPJ');
        }
        if (!this.isValidCNPJ(cleanDocument)) {
          throw new AppError('CNPJ inválido', 400, 'INVALID_CNPJ');
        }
      }
    }

    // Validar e-mail se fornecido
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new AppError('E-mail inválido', 400, 'INVALID_EMAIL');
      }
    }

    // Se CREDIT_CARD não está em allowedPaymentMethods, limpar creditMaxDays
    if (data.allowedPaymentMethods && !data.allowedPaymentMethods.includes('CREDIT_CARD')) {
      data.creditMaxDays = null;
    }

    return this.repository.create({
      ...data,
      document: cleanDocument || data.document,
    }, userId);
  }

  async update(id: string, data: UpdateCustomerDTO) {
    // Verificar se cliente existe
    const existingCustomer = await this.repository.findById(id);
    if (!existingCustomer) {
      throw new AppError('Cliente não encontrado', 404, 'CUSTOMER_NOT_FOUND');
    }

    // Se documento BR foi alterado, verificar se já existe outro cliente com o novo documento
    if (data.document) {
      const cleanDocument = data.document.replace(/\D/g, '');

      if (cleanDocument !== existingCustomer.document) {
        const customerWithDocument = await this.repository.findByDocument(cleanDocument);
        if (customerWithDocument) {
          throw new AppError('Já existe um cliente com este documento', 409, 'DUPLICATE_DOCUMENT');
        }
      }

      // Validar novo documento (CPF/CNPJ)
      const customerType = data.type ?? existingCustomer.type;
      if (customerType === 'INDIVIDUAL') {
        if (cleanDocument.length !== 11 || !this.isValidCPF(cleanDocument)) {
          throw new AppError('CPF inválido', 400, 'INVALID_CPF');
        }
      } else {
        if (cleanDocument.length !== 14 || !this.isValidCNPJ(cleanDocument)) {
          throw new AppError('CNPJ inválido', 400, 'INVALID_CNPJ');
        }
      }

      data.document = cleanDocument;
    }

    // CI e RUC (Paraguay) - sem validação complexa, são strings simples

    // Se CREDIT_CARD não está em allowedPaymentMethods, limpar creditMaxDays
    if (data.allowedPaymentMethods && !data.allowedPaymentMethods.includes('CREDIT_CARD')) {
      data.creditMaxDays = null;
    }

    // Validar e-mail se fornecido
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new AppError('E-mail inválido', 400, 'INVALID_EMAIL');
      }
    }

    return this.repository.update(id, data);
  }

  async delete(id: string) {
    // Verificar se cliente existe
    const existingCustomer = await this.repository.findById(id);
    if (!existingCustomer) {
      throw new AppError('Cliente não encontrado', 404, 'CUSTOMER_NOT_FOUND');
    }

    // Verificar se cliente tem orçamentos associados
    if (existingCustomer.quotes && existingCustomer.quotes.length > 0) {
      throw new AppError(
        'Não é possível excluir cliente com orçamentos associados',
        400,
        'CUSTOMER_HAS_QUOTES'
      );
    }

    return this.repository.delete(id);
  }

  // Validação de CPF
  private isValidCPF(cpf: string): boolean {
    if (cpf.length !== 11) return false;

    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    // Validar primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;

    // Validar segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  // Validação de CNPJ
  private isValidCNPJ(cnpj: string): boolean {
    if (cnpj.length !== 14) return false;

    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    // Validar primeiro dígito verificador
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (digit !== parseInt(cnpj.charAt(12))) return false;

    // Validar segundo dígito verificador
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (digit !== parseInt(cnpj.charAt(13))) return false;

    return true;
  }
}
