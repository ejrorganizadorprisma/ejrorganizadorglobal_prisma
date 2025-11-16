import { Request, Response } from 'express';
import { SuppliersService } from '../services/suppliers.service';
import { AuthRequest } from '../middleware/auth';

export class SuppliersController {
  private service: SuppliersService;

  constructor() {
    this.service = new SuppliersService();
  }

  // Endpoints principais de Suppliers
  findMany = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const result = await this.service.findMany({ page, limit, search, status });
    res.json({ success: true, data: result });
  };

  findById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const supplier = await this.service.findById(id);
    res.json({ success: true, data: supplier });
  };

  findByCode = async (req: Request, res: Response) => {
    const { code } = req.params;
    const supplier = await this.service.findByCode(code);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: { message: 'Fornecedor não encontrado' },
      });
    }

    res.json({ success: true, data: supplier });
  };

  create = async (req: AuthRequest, res: Response) => {
    const supplier = await this.service.create(req.body);
    res.status(201).json({ success: true, data: supplier });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const supplier = await this.service.update(id, req.body);
    res.json({ success: true, data: supplier });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);
    res.json({ success: true, message: 'Fornecedor deletado com sucesso' });
  };

  // Endpoints nested: Addresses
  getAddresses = async (req: Request, res: Response) => {
    const { id } = req.params;
    const addresses = await this.service.getAddresses(id);
    res.json({ success: true, data: addresses });
  };

  addAddress = async (req: Request, res: Response) => {
    const { id } = req.params;
    const address = await this.service.addAddress(id, req.body);
    res.status(201).json({ success: true, data: address });
  };

  updateAddress = async (req: Request, res: Response) => {
    const { addressId } = req.params;
    const address = await this.service.updateAddress(addressId, req.body);
    res.json({ success: true, data: address });
  };

  deleteAddress = async (req: Request, res: Response) => {
    const { addressId } = req.params;
    await this.service.deleteAddress(addressId);
    res.json({ success: true, message: 'Endereço deletado com sucesso' });
  };

  // Endpoints nested: Contacts
  getContacts = async (req: Request, res: Response) => {
    const { id } = req.params;
    const contacts = await this.service.getContacts(id);
    res.json({ success: true, data: contacts });
  };

  addContact = async (req: Request, res: Response) => {
    const { id } = req.params;
    const contact = await this.service.addContact(id, req.body);
    res.status(201).json({ success: true, data: contact });
  };

  updateContact = async (req: Request, res: Response) => {
    const { contactId } = req.params;
    const contact = await this.service.updateContact(contactId, req.body);
    res.json({ success: true, data: contact });
  };

  deleteContact = async (req: Request, res: Response) => {
    const { contactId } = req.params;
    await this.service.deleteContact(contactId);
    res.json({ success: true, message: 'Contato deletado com sucesso' });
  };

  // Endpoint: Produtos do fornecedor
  getProducts = async (req: Request, res: Response) => {
    const { id } = req.params;
    const products = await this.service.getProductSuppliers(id);
    res.json({ success: true, data: products });
  };
}
