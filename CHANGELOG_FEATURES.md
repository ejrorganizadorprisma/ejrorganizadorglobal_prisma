# Changelog de Features - EJR Organizador

Este documento contém apenas as **novas funcionalidades** adicionadas à plataforma EJR Organizador.

## Índice
- [Campo Fabricante com Autocomplete](#campo-fabricante-com-autocomplete)

---

## Campo Fabricante com Autocomplete

### Data: 13/12/2025
### Versão: 1.1.0

### Descrição
Adicionado campo "Fabricante" na página de fornecedores com funcionalidade de autocomplete inteligente que permite buscar fabricantes existentes ou criar novos.

### Funcionalidades

✨ **Autocomplete Inteligente**
- Busca em tempo real conforme o usuário digita
- Lista de fabricantes já cadastrados
- Criação de novos fabricantes digitando e pressionando Enter
- Navegação por teclado (setas ↑↓, Enter, Escape)
- Fechamento automático ao clicar fora do campo

### Mudanças no Banco de Dados

```sql
-- Adicionar coluna manufacturer à tabela suppliers
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS manufacturer TEXT;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_suppliers_manufacturer ON suppliers(manufacturer);
```

### Mudanças no Backend (API)

#### 1. Repository - `apps/api/src/repositories/suppliers.repository.ts`

**Atualizar interface Supplier (adicionar linha):**

```typescript
export interface Supplier {
  id: string;
  code: string;
  name: string;
  legalName?: string;
  taxId?: string;
  manufacturer?: string;  // ← ADICIONAR ESTA LINHA
  email?: string;
  phone?: string;
  website?: string;
  paymentTerms?: string;
  leadTimeDays: number;
  minimumOrderValue: number;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  rating?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Atualizar método mapSupplier (adicionar linha):**

```typescript
private mapSupplier(data: any): Supplier {
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    legalName: data.legal_name || undefined,
    taxId: data.tax_id || undefined,
    manufacturer: data.manufacturer || undefined,  // ← ADICIONAR ESTA LINHA
    email: data.email || undefined,
    // ... resto do código
  };
}
```

**Atualizar método create (adicionar manufacturer como $6):**

Localizar o INSERT e adicionar `manufacturer` entre `tax_id` e `email`:

```typescript
const sql = `
  INSERT INTO suppliers (
    id, code, name, legal_name, tax_id, manufacturer,  -- ← manufacturer aqui
    email, phone, website, payment_terms,
    lead_time_days, minimum_order_value, status, rating, notes
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
  RETURNING *
`;

const result = await db.query(sql, [
  id,
  code,
  data.name,
  data.legalName,
  data.taxId,
  data.manufacturer,  // ← ADICIONAR ESTA LINHA (posição $6)
  data.email,
  // ... resto dos parâmetros
]);
```

**Atualizar método update (adicionar bloco):**

```typescript
async update(id: string, data: UpdateSupplierDTO): Promise<Supplier> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  // ... outros campos ...

  if (data.manufacturer !== undefined) {  // ← ADICIONAR ESTE BLOCO
    fields.push(`manufacturer = $${paramCount++}`);
    values.push(data.manufacturer);
  }

  // ... resto do código
}
```

**Adicionar novo método ao final da classe:**

```typescript
// Método para buscar fabricantes únicos
async getUniqueManufacturers(search?: string): Promise<string[]> {
  let sql = `
    SELECT DISTINCT manufacturer
    FROM suppliers
    WHERE manufacturer IS NOT NULL
      AND manufacturer != ''
  `;
  const params: any[] = [];

  if (search && search.trim() !== '') {
    sql += ` AND manufacturer ILIKE $1`;
    params.push(`%${search.trim()}%`);
  }

  sql += ` ORDER BY manufacturer ASC`;

  const result = await db.query(sql, params);
  return result.rows.map(row => row.manufacturer);
}
```

#### 2. Service - `apps/api/src/services/suppliers.service.ts`

**Adicionar método ao final da classe:**

```typescript
// Método para buscar fabricantes únicos
async getUniqueManufacturers(search?: string): Promise<string[]> {
  return this.repository.getUniqueManufacturers(search);
}
```

#### 3. Controller - `apps/api/src/controllers/suppliers.controller.ts`

**Adicionar método ao final da classe:**

```typescript
// Endpoint: Fabricantes únicos
getManufacturers = async (req: Request, res: Response) => {
  const search = req.query.search as string;
  const manufacturers = await this.service.getUniqueManufacturers(search);
  res.json({ success: true, data: manufacturers });
};
```

#### 4. Routes - `apps/api/src/routes/suppliers.routes.ts`

**Adicionar rota após `router.get('/', asyncHandler(controller.findMany));`:**

```typescript
router.get('/manufacturers', asyncHandler(controller.getManufacturers));
```

### Mudanças no Frontend (Web)

#### 1. Hook - `apps/web/src/hooks/useSuppliers.ts`

**Atualizar interface Supplier (adicionar linha):**

```typescript
export interface Supplier {
  id: string;
  code: string;
  name: string;
  legalName?: string;
  taxId?: string;
  manufacturer?: string;  // ← ADICIONAR ESTA LINHA
  email?: string;
  // ... resto dos campos
}
```

**Adicionar hook ao final do arquivo:**

```typescript
// Manufacturers hooks
export function useManufacturers(search?: string) {
  return useQuery({
    queryKey: ['manufacturers', search],
    queryFn: async () => {
      const { data } = await api.get('/suppliers/manufacturers', {
        params: search ? { search } : {},
      });
      return data.data as string[];
    },
  });
}
```

#### 2. Componente Autocomplete - `apps/web/src/components/ManufacturerAutocomplete.tsx`

**Criar novo arquivo com o seguinte conteúdo:**

```typescript
import { useState, useEffect, useRef } from 'react';
import { useManufacturers } from '../hooks/useSuppliers';

interface ManufacturerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ManufacturerAutocomplete({
  value,
  onChange,
  placeholder = 'Digite o nome do fabricante...',
  className = '',
}: ManufacturerAutocompleteProps) {
  const [search, setSearch] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: manufacturers = [], isLoading } = useManufacturers(search);

  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    onChange(newValue);
    setShowDropdown(true);
    setSelectedIndex(-1);
  };

  const handleSelectManufacturer = (manufacturer: string) => {
    setSearch(manufacturer);
    onChange(manufacturer);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown') {
        setShowDropdown(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < manufacturers.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && manufacturers[selectedIndex]) {
          handleSelectManufacturer(manufacturers[selectedIndex]);
        } else if (search.trim()) {
          setShowDropdown(false);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={search}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Carregando...
            </div>
          ) : manufacturers.length > 0 ? (
            <>
              {manufacturers.map((manufacturer, index) => (
                <div
                  key={manufacturer}
                  onClick={() => handleSelectManufacturer(manufacturer)}
                  className={`px-4 py-2 cursor-pointer text-sm ${
                    index === selectedIndex
                      ? 'bg-blue-100 text-blue-900'
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  {manufacturer}
                </div>
              ))}
              {search && !manufacturers.includes(search) && (
                <div className="px-4 py-2 text-sm text-gray-500 border-t border-gray-200">
                  Pressione Enter para criar "{search}"
                </div>
              )}
            </>
          ) : search ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Nenhum fabricante encontrado. Digite e pressione Enter para criar "{search}".
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              Digite para buscar fabricantes...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### 3. Formulário de Fornecedor - `apps/web/src/pages/SupplierFormPage.tsx`

**Adicionar import no início do arquivo:**

```typescript
import { ManufacturerAutocomplete } from '../components/ManufacturerAutocomplete';
```

**Adicionar manufacturer ao formData inicial:**

```typescript
const [formData, setFormData] = useState<Partial<Supplier>>({
  name: '',
  legalName: '',
  taxId: '',
  manufacturer: '',  // ← ADICIONAR ESTA LINHA
  email: '',
  phone: '',
  // ... outros campos
});
```

**Atualizar useEffect de carregamento:**

```typescript
useEffect(() => {
  if (supplier) {
    setFormData({
      name: supplier.name,
      legalName: supplier.legalName || '',
      taxId: supplier.taxId || '',
      manufacturer: supplier.manufacturer || '',  // ← ADICIONAR ESTA LINHA
      // ... outros campos
    });
  }
}, [supplier]);
```

**Substituir o campo de fabricante no formulário:**

Localizar o input de fabricante e substituir por:

```typescript
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
```

#### 4. Lista de Fornecedores - `apps/web/src/pages/SuppliersPage.tsx`

**Adicionar coluna na tabela (entre Telefone e Avaliação):**

No `<thead>`:
```typescript
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  Fabricante
</th>
```

No `<tbody>`:
```typescript
<td className="px-6 py-4 whitespace-nowrap">
  <div className="text-sm text-gray-900">
    {supplier.manufacturer || '-'}
  </div>
</td>
```

**Atualizar colspan:**
Localizar `colSpan={7}` na mensagem de "nenhum fornecedor" e alterar para `colSpan={8}`

---

## Resumo das Alterações

### Arquivos Modificados

**Backend (4 arquivos)**
1. `apps/api/src/repositories/suppliers.repository.ts` - 5 modificações
2. `apps/api/src/services/suppliers.service.ts` - 1 método adicionado
3. `apps/api/src/controllers/suppliers.controller.ts` - 1 método adicionado
4. `apps/api/src/routes/suppliers.routes.ts` - 1 rota adicionada

**Frontend (4 arquivos)**
1. `apps/web/src/hooks/useSuppliers.ts` - Interface + 1 hook
2. `apps/web/src/components/ManufacturerAutocomplete.tsx` - **NOVO ARQUIVO**
3. `apps/web/src/pages/SupplierFormPage.tsx` - 3 modificações
4. `apps/web/src/pages/SuppliersPage.tsx` - 3 modificações

**Banco de Dados**
1. Script SQL para adicionar coluna `manufacturer`

### Endpoint Criado

**GET** `/api/v1/suppliers/manufacturers?search=termo`

Retorna lista de fabricantes únicos, opcionalmente filtrados por termo de busca.

**Resposta:**
```json
{
  "success": true,
  "data": ["Fabricante A", "Fabricante B", "Fabricante C"]
}
```

---

## Como Funciona

1. **Ao digitar**: O componente busca automaticamente fabricantes que correspondem ao texto
2. **Seleção**: Usuário pode clicar ou usar setas + Enter
3. **Novo fabricante**: Digite um nome novo e pressione Enter
4. **Navegação**:
   - `↑` `↓` - Navegar pela lista
   - `Enter` - Selecionar
   - `Escape` - Fechar dropdown

---

**Data da implementação**: 13/12/2025
**Versão**: 1.1.0
