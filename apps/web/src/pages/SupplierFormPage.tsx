import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useSupplier,
  useCreateSupplier,
  useUpdateSupplier,
  useSupplierAddresses,
  useCreateSupplierAddress,
  useUpdateSupplierAddress,
  useDeleteSupplierAddress,
  useSupplierContacts,
  useCreateSupplierContact,
  useUpdateSupplierContact,
  useDeleteSupplierContact,
  useSupplierProducts,
  Supplier,
  SupplierAddress,
  SupplierContact,
  ProductSupplier,
} from '../hooks/useSuppliers';
import { useSupplierOrders, SupplierOrder } from '../hooks/useSupplierOrders';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { generateSupplierOrderPdf, type DocumentSettingsForPdf } from '../services/supplierOrderPdf';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { ManufacturerAutocomplete } from '../components/ManufacturerAutocomplete';

type TabType = 'general' | 'addresses' | 'contacts' | 'products' | 'orders';

export function SupplierFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { formatPrice, defaultCurrency } = useFormatPrice();

  const [activeTab, setActiveTab] = useState<TabType>('general');

  const { data: systemSettings } = useSystemSettings();
  const country = systemSettings?.country || 'PY';

  const { data: supplier, isLoading: loadingSupplier } = useSupplier(id);
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const [ci, setCi] = useState('');
  const [ruc, setRuc] = useState('');

  // Nested resources
  const { data: addresses = [] } = useSupplierAddresses(id);
  const createAddress = useCreateSupplierAddress();
  const updateAddress = useUpdateSupplierAddress();
  const deleteAddress = useDeleteSupplierAddress();

  const { data: contacts = [] } = useSupplierContacts(id);
  const createContact = useCreateSupplierContact();
  const updateContact = useUpdateSupplierContact();
  const deleteContact = useDeleteSupplierContact();

  const { data: products = [] } = useSupplierProducts(id);

  // Pedidos do fornecedor
  const { data: ordersData, isLoading: loadingOrders } = useSupplierOrders({
    supplierId: id,
    limit: 100,
  });
  const supplierOrders = ordersData?.data || [];

  // Configurações de documento para PDF
  const { data: documentSettings } = useDefaultDocumentSettings();

  // General form data
  const [formData, setFormData] = useState<Partial<Supplier>>({
    // code is auto-generated, not needed in form state for new suppliers
    name: '',
    legalName: '',
    taxId: '',
    manufacturer: '',
    email: '',
    phone: '',
    website: '',
    paymentTerms: '',
    leadTimeDays: 0,
    minimumOrderValue: 0,
    status: 'ACTIVE',
    rating: undefined,
    notes: '',
  });

  // Address form data
  const [addressForm, setAddressForm] = useState<Partial<SupplierAddress>>({
    type: 'BOTH',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'BR',
    isDefault: false,
  });
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Contact form data
  const [contactForm, setContactForm] = useState<Partial<SupplierContact>>({
    name: '',
    role: '',
    email: '',
    phone: '',
    mobile: '',
    isPrimary: false,
    notes: '',
  });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        code: supplier.code,
        name: supplier.name,
        legalName: supplier.legalName || '',
        taxId: supplier.taxId || '',
        manufacturer: supplier.manufacturer || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        website: supplier.website || '',
        paymentTerms: supplier.paymentTerms || '',
        leadTimeDays: supplier.leadTimeDays,
        minimumOrderValue: supplier.minimumOrderValue,
        status: supplier.status,
        rating: supplier.rating,
        notes: supplier.notes || '',
      });
      setCi(supplier.ci || '');
      setRuc(supplier.ruc || '');
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only name is required - code is auto-generated
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      const payload: any = { ...formData };

      if (country === 'PY') {
        payload.ci = ci || undefined;
        payload.ruc = ruc || undefined;
      }

      if (isEditing) {
        await updateSupplier.mutateAsync({ id: id!, data: payload });
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        const newSupplier = await createSupplier.mutateAsync(payload);
        toast.success('Fornecedor criado com sucesso!');
        navigate(`/suppliers/${newSupplier.id}/edit`);
        return;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar fornecedor');
    }
  };

  // Address handlers
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      if (editingAddressId) {
        await updateAddress.mutateAsync({
          supplierId: id,
          addressId: editingAddressId,
          data: addressForm,
        });
        toast.success('Endereço atualizado!');
      } else {
        await createAddress.mutateAsync({
          supplierId: id,
          data: addressForm,
        });
        toast.success('Endereço adicionado!');
      }
      resetAddressForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar endereço');
    }
  };

  const handleEditAddress = (address: SupplierAddress) => {
    setAddressForm(address);
    setEditingAddressId(address.id);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!id || !window.confirm('Tem certeza que deseja excluir este endereço?')) return;

    try {
      await deleteAddress.mutateAsync({ supplierId: id, addressId });
      toast.success('Endereço excluído!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao excluir endereço');
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      type: 'BOTH',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'BR',
      isDefault: false,
    });
    setEditingAddressId(null);
    setShowAddressForm(false);
  };

  // Contact handlers
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!contactForm.name) {
      toast.error('Nome do contato é obrigatório');
      return;
    }

    try {
      if (editingContactId) {
        await updateContact.mutateAsync({
          supplierId: id,
          contactId: editingContactId,
          data: contactForm,
        });
        toast.success('Contato atualizado!');
      } else {
        await createContact.mutateAsync({
          supplierId: id,
          data: contactForm,
        });
        toast.success('Contato adicionado!');
      }
      resetContactForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar contato');
    }
  };

  const handleEditContact = (contact: SupplierContact) => {
    setContactForm(contact);
    setEditingContactId(contact.id);
    setShowContactForm(true);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!id || !window.confirm('Tem certeza que deseja excluir este contato?')) return;

    try {
      await deleteContact.mutateAsync({ supplierId: id, contactId });
      toast.success('Contato excluído!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao excluir contato');
    }
  };

  const resetContactForm = () => {
    setContactForm({
      name: '',
      role: '',
      email: '',
      phone: '',
      mobile: '',
      isPrimary: false,
      notes: '',
    });
    setEditingContactId(null);
    setShowContactForm(false);
  };

  if (loadingSupplier && isEditing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <button
                onClick={() => navigate('/suppliers')}
                className="text-blue-600 hover:text-blue-800 mb-2 text-sm"
              >
                ← Voltar para Fornecedores
              </button>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab('general')}
                className={`${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Dados Gerais
              </button>
              {isEditing && (
                <>
                  <button
                    onClick={() => setActiveTab('addresses')}
                    className={`${
                      activeTab === 'addresses'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Endereços ({addresses.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('contacts')}
                    className={`${
                      activeTab === 'contacts'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Contatos ({contacts.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('products')}
                    className={`${
                      activeTab === 'products'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Produtos ({products.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`${
                      activeTab === 'orders'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Pedidos ({supplierOrders.length})
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'general' && (
            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Show code field only when editing (read-only) */}
                    {isEditing && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Código (auto-gerado)
                        </label>
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={formData.code}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Código gerado automaticamente pelo sistema
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="ACTIVE">Ativo</option>
                        <option value="INACTIVE">Inativo</option>
                        <option value="BLOCKED">Bloqueado</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Nome <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Razão Social
                      </label>
                      <input
                        type="text"
                        value={formData.legalName}
                        onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {country === 'PY' ? (
                      <div className="sm:col-span-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              CI (Cédula de Identidad)
                            </label>
                            <input
                              type="text"
                              value={ci}
                              onChange={(e) => setCi(e.target.value.replace(/[^\d.]/g, ''))}
                              placeholder="Ej: 1.234.567"
                              maxLength={15}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              RUC
                            </label>
                            <input
                              type="text"
                              value={ruc}
                              onChange={(e) => setRuc(e.target.value.replace(/[^\d\-]/g, ''))}
                              placeholder="Ej: 80012345-6"
                              maxLength={20}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          CNPJ/CPF
                        </label>
                        <input
                          type="text"
                          value={formData.taxId}
                          onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Fabricante
                      </label>
                      <ManufacturerAutocomplete
                        value={formData.manufacturer || ''}
                        onChange={(value) => setFormData({ ...formData, manufacturer: value })}
                        placeholder="Digite o nome do fabricante..."
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Avaliação (1-5)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.rating || ''}
                        onChange={(e) => setFormData({ ...formData, rating: e.target.value ? Number(e.target.value) : undefined })}
                        onFocus={(e) => e.target.select()}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Informações de Contato</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Telefone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Website</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Business Terms */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Termos Comerciais</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Prazo de Entrega (dias)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.leadTimeDays}
                        onChange={(e) => setFormData({ ...formData, leadTimeDays: Number(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Pedido Mínimo (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.minimumOrderValue / 100}
                        onChange={(e) => setFormData({ ...formData, minimumOrderValue: Math.round(parseFloat(e.target.value || '0') * 100) })}
                        onFocus={(e) => e.target.select()}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Condições de Pagamento
                      </label>
                      <input
                        type="text"
                        value={formData.paymentTerms}
                        onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                        placeholder="Ex: 30/60/90 dias"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Observações</label>
                  <textarea
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="px-4 lg:px-6 py-3 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/suppliers')}
                  className="w-full sm:w-auto inline-flex justify-center py-2 px-4 min-h-[44px] border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createSupplier.isPending || updateSupplier.isPending}
                  className="w-full sm:w-auto inline-flex justify-center py-2 px-4 min-h-[44px] border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {createSupplier.isPending || updateSupplier.isPending
                    ? 'Salvando...'
                    : isEditing
                    ? 'Atualizar'
                    : 'Criar Fornecedor'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'addresses' && isEditing && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Endereços</h3>
                  {!showAddressForm && (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      Adicionar Endereço
                    </button>
                  )}
                </div>

                {showAddressForm && (
                  <form onSubmit={handleAddressSubmit} className="mb-6 p-4 border border-gray-200 rounded-md">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo</label>
                        <select
                          value={addressForm.type}
                          onChange={(e) => setAddressForm({ ...addressForm, type: e.target.value as any })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="BILLING">Cobrança</option>
                          <option value="SHIPPING">Entrega</option>
                          <option value="BOTH">Ambos</option>
                        </select>
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={addressForm.isDefault}
                            onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Endereço padrão</span>
                        </label>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">CEP</label>
                        <input
                          type="text"
                          value={addressForm.postalCode}
                          onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Rua</label>
                        <input
                          type="text"
                          value={addressForm.street}
                          onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Número</label>
                        <input
                          type="text"
                          value={addressForm.number}
                          onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Complemento</label>
                        <input
                          type="text"
                          value={addressForm.complement}
                          onChange={(e) => setAddressForm({ ...addressForm, complement: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bairro</label>
                        <input
                          type="text"
                          value={addressForm.neighborhood}
                          onChange={(e) => setAddressForm({ ...addressForm, neighborhood: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Cidade</label>
                        <input
                          type="text"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Estado</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value.toUpperCase() })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        {editingAddressId ? 'Atualizar' : 'Adicionar'}
                      </button>
                      <button
                        type="button"
                        onClick={resetAddressForm}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {addresses.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      Nenhum endereço cadastrado.
                    </p>
                  ) : (
                    addresses.map((address) => (
                      <div key={address.id} className="border border-gray-200 rounded-md p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {address.type === 'BILLING' ? 'Cobrança' : address.type === 'SHIPPING' ? 'Entrega' : 'Ambos'}
                              </span>
                              {address.isDefault && (
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                  Padrão
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {address.street}, {address.number}
                              {address.complement && ` - ${address.complement}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {address.neighborhood} - {address.city}/{address.state}
                            </p>
                            <p className="text-sm text-gray-600">CEP: {address.postalCode}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditAddress(address)}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address.id)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && isEditing && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Contatos</h3>
                  {!showContactForm && (
                    <button
                      onClick={() => setShowContactForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      Adicionar Contato
                    </button>
                  )}
                </div>

                {showContactForm && (
                  <form onSubmit={handleContactSubmit} className="mb-6 p-4 border border-gray-200 rounded-md">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Nome <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Cargo</label>
                        <input
                          type="text"
                          value={contactForm.role}
                          onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Telefone</label>
                        <input
                          type="text"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Celular</label>
                        <input
                          type="text"
                          value={contactForm.mobile}
                          onChange={(e) => setContactForm({ ...contactForm, mobile: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={contactForm.isPrimary}
                            onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Contato principal</span>
                        </label>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Observações</label>
                        <textarea
                          rows={3}
                          value={contactForm.notes}
                          onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        {editingContactId ? 'Atualizar' : 'Adicionar'}
                      </button>
                      <button
                        type="button"
                        onClick={resetContactForm}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {contacts.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      Nenhum contato cadastrado.
                    </p>
                  ) : (
                    contacts.map((contact) => (
                      <div key={contact.id} className="border border-gray-200 rounded-md p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {contact.name}
                              </span>
                              {contact.isPrimary && (
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                  Principal
                                </span>
                              )}
                            </div>
                            {contact.role && (
                              <p className="text-sm text-gray-600">{contact.role}</p>
                            )}
                            {contact.email && (
                              <p className="text-sm text-gray-600">Email: {contact.email}</p>
                            )}
                            {contact.phone && (
                              <p className="text-sm text-gray-600">Tel: {contact.phone}</p>
                            )}
                            {contact.mobile && (
                              <p className="text-sm text-gray-600">Cel: {contact.mobile}</p>
                            )}
                            {contact.notes && (
                              <p className="text-sm text-gray-500 mt-2">{contact.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditContact(contact)}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteContact(contact.id)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && isEditing && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Produtos Fornecidos
                </h3>

                {products.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 mb-4">
                      Nenhum produto vinculado a este fornecedor.
                    </p>
                    <p className="text-sm text-gray-400">
                      Os produtos são vinculados através do cadastro de produtos.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Código Fornecedor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Preço Unitário
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Qtd. Mínima
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Prazo (dias)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Preferido
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {product.supplierSku || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              R$ {product.unitPrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {product.minimumQuantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {product.leadTimeDays}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {product.isPreferred ? (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                  Sim
                                </span>
                              ) : (
                                <span className="text-gray-500">Não</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'orders' && isEditing && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Histórico de Pedidos
                </h3>

                {loadingOrders ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : supplierOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 mb-4">
                      Nenhum pedido encontrado para este fornecedor.
                    </p>
                    <p className="text-sm text-gray-400">
                      Os pedidos são gerados através das ordens de compra.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Pedido
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Ordem de Compra
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Data
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {supplierOrders.map((order: SupplierOrder) => (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {order.orderNumber}
                              </div>
                              <div className="text-xs text-gray-500">
                                Grupo: {order.groupCode?.split('-').slice(-1)[0] || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {order.purchaseOrder?.orderNumber || '-'}
                              </div>
                              {order.purchaseOrder?.name && (
                                <div className="text-xs text-gray-500 truncate max-w-[150px]" title={order.purchaseOrder.name}>
                                  {order.purchaseOrder.name}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(order.orderDate).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatPrice(order.totalAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                  order.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                  order.status === 'PARTIAL' ? 'bg-orange-100 text-orange-800' :
                                  order.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-800' :
                                  order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {order.status === 'PENDING' ? 'Pendente' :
                                 order.status === 'SENT' ? 'Enviado' :
                                 order.status === 'CONFIRMED' ? 'Confirmado' :
                                 order.status === 'PARTIAL' ? 'Parcial' :
                                 order.status === 'RECEIVED' ? 'Recebido' :
                                 order.status === 'CANCELLED' ? 'Cancelado' :
                                 order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => navigate(`/supplier-orders/${order.id}`)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Ver detalhes"
                                >
                                  Ver
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      const { data } = await api.get(`/supplier-orders/${order.id}`);
                                      const pdfSettings: DocumentSettingsForPdf | undefined = documentSettings ? {
                                        companyLogo: documentSettings.companyLogo || undefined,
                                        companyName: documentSettings.companyName || undefined,
                                        footerText: documentSettings.footerText || undefined,
                                        footerAddress: documentSettings.footerAddress || undefined,
                                        footerPhone: documentSettings.footerPhone || undefined,
                                        footerEmail: documentSettings.footerEmail || undefined,
                                        footerWebsite: documentSettings.footerWebsite || undefined,
                                        primaryColor: documentSettings.primaryColor || undefined,
                                        secondaryColor: documentSettings.secondaryColor || undefined,
                                      } : undefined;
                                      generateSupplierOrderPdf(data.data, pdfSettings, defaultCurrency);
                                      toast.success('PDF gerado com sucesso!');
                                    } catch (error: any) {
                                      toast.error('Erro ao gerar PDF');
                                    }
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                  title="Gerar PDF"
                                >
                                  PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totalizadores */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-end gap-8 text-sm">
                        <div className="text-right">
                          <span className="text-gray-500">Total de Pedidos:</span>{' '}
                          <span className="font-medium text-gray-900">{supplierOrders.length}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500">Valor Total:</span>{' '}
                          <span className="font-bold text-gray-900">
                            {formatPrice(supplierOrders.reduce((sum: number, o: SupplierOrder) => sum + o.totalAmount, 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
