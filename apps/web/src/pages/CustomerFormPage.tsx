import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCustomer, useCreateCustomer, useUpdateCustomer } from '../hooks/useCustomers';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export function CustomerFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: systemSettings } = useSystemSettings();
  const country = systemSettings?.country || 'PY';

  const { user } = useAuth();
  const canAssignResponsible =
    !!user && ['OWNER', 'DIRECTOR', 'MANAGER'].includes(user.role);

  const { data: customer, isLoading: loadingCustomer } = useCustomer(isEditing ? id : undefined);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  // Carregar vendedores (SALESPERSON) apenas se o usuario atual pode atribuir
  const { data: sellersData } = useUsers(
    canAssignResponsible ? { role: 'SALESPERSON' as any, limit: 100, isActive: true } : {}
  );
  const sellers = (canAssignResponsible ? sellersData?.data : undefined) ?? [];

  const DEFAULT_PAYMENT_METHODS = ['CASH'];

  const ALL_PAYMENT_METHODS = [
    { value: 'PIX', label: 'Pix' },
    { value: 'CASH', label: 'Efectivo' },
    { value: 'CREDIT', label: 'Crédito' },
    { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
    { value: 'DEBIT_CARD', label: 'Tarjeta Débito' },
    { value: 'BANK_TRANSFER', label: 'Transferencia' },
    { value: 'BOLETO', label: 'Boleto' },
    { value: 'CHECK', label: 'Cheque' },
    { value: 'PROMISSORY', label: 'Pagaré' },
    { value: 'OTHER', label: 'Otro' },
  ];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BUSINESS',
    rg: '',
    birthDate: '',
    gender: '',
    maritalStatus: '',
    profession: '',
    whatsapp: '',
    phoneAlt: '',
    emailAlt: '',
    notes: '',
    address: {
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      zipCode: '',
    },
    allowedPaymentMethods: DEFAULT_PAYMENT_METHODS as string[],
    creditMaxDays: null as number | null,
    responsibleUserId: null as string | null,
  });

  const [ci, setCi] = useState('');
  const [ruc, setRuc] = useState('');

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        document: customer.document || '',
        type: customer.type,
        rg: customer.rg || '',
        birthDate: customer.birthDate ? String(customer.birthDate).slice(0, 10) : '',
        gender: customer.gender || '',
        maritalStatus: customer.maritalStatus || '',
        profession: customer.profession || '',
        whatsapp: customer.whatsapp || '',
        phoneAlt: customer.phoneAlt || '',
        emailAlt: customer.emailAlt || '',
        notes: customer.notes || '',
        address: customer.address
          ? {
              street: customer.address.street,
              number: customer.address.number,
              complement: customer.address.complement || '',
              district: customer.address.district,
              city: customer.address.city,
              state: customer.address.state,
              zipCode: customer.address.zipCode || '',
            }
          : {
              street: '',
              number: '',
              complement: '',
              district: '',
              city: '',
              state: '',
              zipCode: '',
            },
        allowedPaymentMethods: (customer as any).allowedPaymentMethods ?? DEFAULT_PAYMENT_METHODS,
        creditMaxDays: (customer as any).creditMaxDays ?? null,
        responsibleUserId: (customer as any).responsibleUserId ?? null,
      });
      setCi(customer.ci || '');
      setRuc(customer.ruc || '');
    }
  }, [customer]);

  const validateCPF = (cpf: string) => {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    return true;
  };

  const validateCNPJ = (cnpj: string) => {
    cnpj = cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar nome obrigatório
    if (!formData.name) {
      toast.error('Preencha o nome do cliente');
      return;
    }

    // Validar email se preenchido
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Email inválido');
      return;
    }

    // Validar email alternativo se preenchido
    if (formData.emailAlt && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAlt)) {
      toast.error('Email alternativo inválido');
      return;
    }

    try {
      const baseData: any = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        type: formData.type,
        rg: formData.rg || null,
        birthDate: formData.birthDate || null,
        gender: formData.gender || null,
        maritalStatus: formData.maritalStatus || null,
        profession: formData.profession || null,
        whatsapp: formData.whatsapp || null,
        phoneAlt: formData.phoneAlt || null,
        emailAlt: formData.emailAlt || null,
        notes: formData.notes || null,
        address: formData.address.street ? formData.address : null,
        allowedPaymentMethods: formData.allowedPaymentMethods,
        creditMaxDays:
          formData.allowedPaymentMethods.includes('CREDIT') ||
          formData.allowedPaymentMethods.includes('CREDIT_CARD')
            ? formData.creditMaxDays
            : null,
      };

      // Admin/gerente pode atribuir vendedor responsavel
      if (canAssignResponsible) {
        baseData.responsibleUserId = formData.responsibleUserId ?? null;
      }

      let payload: any;

      if (country === 'PY') {
        // PY: validar CI ou RUC
        if (!ci && !ruc) {
          toast.error('Informe o CI ou RUC do cliente');
          return;
        }
        payload = {
          ...baseData,
          ci: ci || undefined,
          ruc: ruc || undefined,
        };
      } else {
        // BR: validar CPF/CNPJ
        if (!formData.document) {
          toast.error('Preencha todos os campos obrigatórios');
          return;
        }
        const cleanDocument = formData.document.replace(/\D/g, '');
        if (formData.type === 'INDIVIDUAL') {
          if (!validateCPF(cleanDocument)) {
            toast.error('CPF inválido');
            return;
          }
        } else {
          if (!validateCNPJ(cleanDocument)) {
            toast.error('CNPJ inválido');
            return;
          }
        }
        payload = {
          ...baseData,
          document: cleanDocument,
        };
      }

      if (isEditing) {
        await updateCustomer.mutateAsync({
          id: id!,
          data: payload,
        });
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await createCustomer.mutateAsync(payload);
        toast.success('Cliente criado com sucesso!');
      }
      navigate('/customers');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar cliente');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [addressField]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePaymentMethodToggle = (method: string) => {
    setFormData((prev) => {
      const isCurrentlySelected = prev.allowedPaymentMethods.includes(method);
      let newMethods: string[];
      let newCreditMaxDays = prev.creditMaxDays;

      if (isCurrentlySelected) {
        newMethods = prev.allowedPaymentMethods.filter((m) => m !== method);
      } else {
        newMethods = [...prev.allowedPaymentMethods, method];
      }

      // creditMaxDays só faz sentido se CREDIT ou CREDIT_CARD estiver na lista
      const hasCreditOption =
        newMethods.includes('CREDIT') || newMethods.includes('CREDIT_CARD');
      if (!hasCreditOption) {
        newCreditMaxDays = null;
      }

      return {
        ...prev,
        allowedPaymentMethods: newMethods,
        creditMaxDays: newCreditMaxDays,
      };
    });
  };

  const formatDocument = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (formData.type === 'INDIVIDUAL') {
      // CPF: 000.000.000-00
      return clean
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ: 00.000.000/0000-00
      return clean
        .slice(0, 14)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const formatPhone = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (country === 'PY') {
      // PY: 0981 123 456 or (021) 123-4567
      return clean.slice(0, 12);
    }
    // BR: (00) 00000-0000 ou (00) 0000-0000
    if (clean.length <= 10) {
      return clean
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    } else {
      return clean
        .slice(0, 11)
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    }
  };

  const formatZipCode = (value: string) => {
    const clean = value.replace(/\D/g, '');
    // 00000-000
    return clean.slice(0, 8).replace(/(\d{5})(\d{1,3})$/, '$1-$2');
  };

  if (loadingCustomer) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Voltar para Clientes
        </button>
        <h1 className="text-2xl lg:text-3xl font-bold">
          {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 lg:p-6">
        {/* Dados Básicos */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Dados Básicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipo - only show for BR */}
            {country === 'BR' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  disabled={isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="INDIVIDUAL">Pessoa Física</option>
                  <option value="BUSINESS">Pessoa Jurídica</option>
                </select>
              </div>
            )}

            {/* Documento - conditional by country */}
            {country === 'PY' ? (
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CI (Cédula de Identidad)
                    </label>
                    <input
                      type="text"
                      value={ci}
                      onChange={(e) => setCi(e.target.value.replace(/[^\d.]/g, ''))}
                      placeholder="Ej: 1.234.567"
                      maxLength={15}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RUC
                    </label>
                    <input
                      type="text"
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value.replace(/[^\d\-]/g, ''))}
                      placeholder="Ej: 80012345-6"
                      maxLength={20}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.type === 'INDIVIDUAL' ? 'CPF' : 'CNPJ'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="document"
                  value={formatDocument(formData.document)}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, document: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    formData.type === 'INDIVIDUAL' ? '000.000.000-00' : '00.000.000/0000-00'
                  }
                />
              </div>
            )}

            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {country === 'BR' && formData.type === 'BUSINESS'
                  ? 'Razão Social'
                  : 'Nome Completo'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={
                  country === 'PY'
                    ? 'Nombre completo o razón social'
                    : 'Nome completo ou razão social'
                }
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@exemplo.com"
              />
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {country === 'PY' ? 'Teléfono' : 'Telefone'}
              </label>
              <input
                type="text"
                name="phone"
                value={formatPhone(formData.phone)}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={country === 'PY' ? '0981 123 456' : '(00) 00000-0000'}
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp
              </label>
              <input
                type="text"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={country === 'PY' ? '0981 123 456' : '(00) 00000-0000'}
              />
            </div>

            {/* Telefone Alternativo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {country === 'PY' ? 'Teléfono alternativo' : 'Telefone alternativo'}
              </label>
              <input
                type="text"
                name="phoneAlt"
                value={formData.phoneAlt}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={country === 'PY' ? '0981 123 456' : '(00) 00000-0000'}
              />
            </div>

            {/* Email Alternativo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail alternativo
              </label>
              <input
                type="email"
                name="emailAlt"
                value={formData.emailAlt}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email2@exemplo.com"
              />
            </div>

            {/* Vendedor Responsavel - apenas para admin/gerente */}
            {canAssignResponsible && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendedor Responsável
                  <span className="ml-2 text-xs text-gray-500 font-normal">
                    (quem poderá vender para este cliente pelo app mobile)
                  </span>
                </label>
                <select
                  value={formData.responsibleUserId ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      responsibleUserId: e.target.value || null,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Sem vendedor atribuído (apenas web) —</option>
                  {sellers.map((seller: any) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name} ({seller.email})
                    </option>
                  ))}
                </select>
                {sellers.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    Nenhum vendedor cadastrado. Crie usuários com papel SALESPERSON em
                    "Usuários" para poder atribuir.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dados pessoais complementares */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Dados pessoais complementares</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RG */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RG
              </label>
              <input
                type="text"
                name="rg"
                value={formData.rg}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="00.000.000-0"
              />
            </div>

            {/* Data de nascimento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {country === 'PY' ? 'Fecha de nacimiento' : 'Data de nascimento'}
              </label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Gênero */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {country === 'PY' ? 'Género' : 'Gênero'}
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Selecione —</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
                <option value="Não informar">Não informar</option>
              </select>
            </div>

            {/* Estado Civil */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {country === 'PY' ? 'Estado civil' : 'Estado civil'}
              </label>
              <select
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Selecione —</option>
                <option value="Solteiro">Solteiro</option>
                <option value="Casado">Casado</option>
                <option value="Divorciado">Divorciado</option>
                <option value="Viúvo">Viúvo</option>
                <option value="União estável">União estável</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* Profissão */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {country === 'PY' ? 'Profesión' : 'Profissão'}
              </label>
              <input
                type="text"
                name="profession"
                value={formData.profession}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={country === 'PY' ? 'Ej: Comerciante' : 'Ex: Comerciante'}
              />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {country === 'PY' ? 'Dirección (Opcional)' : 'Endereço (Opcional)'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CEP - only for BR */}
            {country === 'BR' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  name="address.zipCode"
                  value={formatZipCode(formData.address.zipCode)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: { ...prev.address, zipCode: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="00000-000"
                />
              </div>
            )}

            {/* Rua */}
            <div className={country === 'PY' ? 'md:col-span-2' : 'md:col-span-1'}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {country === 'PY' ? 'Calle/Avenida' : 'Rua/Avenida'}
              </label>
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={country === 'PY' ? 'Nombre de la calle' : 'Nome da rua'}
              />
            </div>

            {/* Número */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {country === 'PY' ? 'Número' : 'Número'}
              </label>
              <input
                type="text"
                name="address.number"
                value={formData.address.number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123"
              />
            </div>

            {/* Complemento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {country === 'PY' ? 'Referencia' : 'Complemento'}
              </label>
              <input
                type="text"
                name="address.complement"
                value={formData.address.complement}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={country === 'PY' ? 'Depto, piso, etc' : 'Apto, sala, etc'}
              />
            </div>

            {/* Bairro */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {country === 'PY' ? 'Barrio' : 'Bairro'}
              </label>
              <input
                type="text"
                name="address.district"
                value={formData.address.district}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={country === 'PY' ? 'Nombre del barrio' : 'Nome do bairro'}
              />
            </div>

            {/* Cidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {country === 'PY' ? 'Ciudad' : 'Cidade'}
              </label>
              <input
                type="text"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={country === 'PY' ? 'Nombre de la ciudad' : 'Nome da cidade'}
              />
            </div>

            {/* Estado / Departamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {country === 'PY' ? 'Departamento' : 'Estado'}
              </label>
              <input
                type="text"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                maxLength={country === 'PY' ? 30 : 2}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={country === 'PY' ? 'Ej: Central' : 'SP'}
              />
            </div>
          </div>
        </div>

        {/* Credito / Pagamento */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Credito / Pagamento</h2>

          {formData.allowedPaymentMethods.length === 0 && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800 text-sm">
              Atención: No hay métodos de pago seleccionados para este cliente.
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ALL_PAYMENT_METHODS.map((method) => {
              const isSelected = formData.allowedPaymentMethods.includes(method.value);
              // CREDIT (crediário/fiado) é destacado em amber porque habilita dias de prazo
              const isCreditOption = method.value === 'CREDIT';

              return (
                <label
                  key={method.value}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isCreditOption
                      ? isSelected
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                        : 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                      : isSelected
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handlePaymentMethodToggle(method.value)}
                    className={`h-4 w-4 rounded ${
                      isCreditOption
                        ? 'text-amber-600 focus:ring-amber-500'
                        : 'text-blue-600 focus:ring-blue-500'
                    } border-gray-300`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      isCreditOption ? 'text-amber-800' : 'text-gray-700'
                    }`}
                  >
                    {method.label}
                  </span>
                </label>
              );
            })}
          </div>

          {(formData.allowedPaymentMethods.includes('CREDIT') ||
            formData.allowedPaymentMethods.includes('CREDIT_CARD')) && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <label className="block text-sm font-medium text-amber-800 mb-2">
                Maximo de dias de credito
              </label>
              <input
                type="number"
                min={1}
                value={formData.creditMaxDays ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    creditMaxDays: e.target.value ? parseInt(e.target.value, 10) : null,
                  }))
                }
                placeholder="Ej: 30"
                className="w-full max-w-xs px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Observações</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {country === 'PY' ? 'Notas internas' : 'Notas internas'}
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={
                country === 'PY'
                  ? 'Información adicional sobre el cliente...'
                  : 'Informações adicionais sobre o cliente...'
              }
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="submit"
            disabled={createCustomer.isPending || updateCustomer.isPending}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 min-h-[44px] rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createCustomer.isPending || updateCustomer.isPending
              ? 'Salvando...'
              : isEditing
              ? 'Atualizar'
              : 'Criar Cliente'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="w-full sm:w-auto bg-gray-200 text-gray-700 px-6 py-2 min-h-[44px] rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
