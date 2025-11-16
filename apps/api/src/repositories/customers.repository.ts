import { supabase } from '../config/supabase';
import type { Customer, CustomerType, CreateCustomerDTO, UpdateCustomerDTO } from '@ejr/shared-types';

export class CustomersRepository {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    type?: CustomerType;
  }) {
    const { page, limit, search, type } = params;

    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Filtro de busca
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,document.ilike.%${search}%`);
    }

    // Filtro de tipo
    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar clientes: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return (data || []).map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      document: customer.document,
      type: customer.type,
      address: customer.address,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
    }));
  }

  async count(params: { search?: string; type?: CustomerType }) {
    const { search, type } = params;

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // Filtro de busca
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,document.ilike.%${search}%`);
    }

    // Filtro de tipo
    if (type) {
      query = query.eq('type', type);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Erro ao contar clientes: ${error.message}`);
    }

    return count || 0;
  }

  async findById(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Não encontrado
      }
      throw new Error(`Erro ao buscar cliente: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      document: data.document,
      type: data.type,
      address: data.address,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async findByDocument(document: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('document', document)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Não encontrado
      }
      throw new Error(`Erro ao buscar cliente: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      document: data.document,
      type: data.type,
      address: data.address,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async create(customerData: CreateCustomerDTO) {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        document: customerData.document,
        type: customerData.type,
        address: customerData.address,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar cliente: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      document: data.document,
      type: data.type,
      address: data.address,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async update(id: string, customerData: UpdateCustomerDTO) {
    const updateData: any = {};

    if (customerData.name !== undefined) updateData.name = customerData.name;
    if (customerData.email !== undefined) updateData.email = customerData.email;
    if (customerData.phone !== undefined) updateData.phone = customerData.phone;
    if (customerData.document !== undefined) updateData.document = customerData.document;
    if (customerData.type !== undefined) updateData.type = customerData.type;
    if (customerData.address !== undefined) updateData.address = customerData.address;

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar cliente: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      document: data.document,
      type: data.type,
      address: data.address,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async delete(id: string) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar cliente: ${error.message}`);
    }

    return { success: true };
  }
}
