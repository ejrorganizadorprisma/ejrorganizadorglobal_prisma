# Changelog Detalhado - EJR Organizador

Este documento contém todas as mudanças implementadas na plataforma EJR Organizador, incluindo modificações de banco de dados, backend e frontend.

## Índice
- [Migração para PostgreSQL Local](#migração-para-postgresql-local)
- [Melhorias no Módulo de Fornecedores](#melhorias-no-módulo-de-fornecedores)
- [Scripts de Migração](#scripts-de-migração)

---

## Migração para PostgreSQL Local

### Data: Dezembro 2025

### Descrição
Migração completa do Supabase para PostgreSQL local para melhor controle e performance.

### Configuração do Banco de Dados

```bash
# Criar usuário e banco de dados
sudo -u postgres psql
CREATE USER ejr_user WITH PASSWORD 'ejr_local_2025';
CREATE DATABASE ejr_organizador_dev OWNER ejr_user;
GRANT ALL PRIVILEGES ON DATABASE ejr_organizador_dev TO ejr_user;
\q
```

### Arquivo .env
```env
NODE_ENV=development
PORT=3002

# Local PostgreSQL Database
DATABASE_URL=postgresql://ejr_user:ejr_local_2025@localhost:5432/ejr_organizador_dev

# JWT
JWT_SECRET=ejr-super-secret-jwt-key-change-this-in-production-2025

# Frontend URL (para CORS)
FRONTEND_URL=http://localhost:5173,http://localhost:5174
```

---

## Melhorias no Módulo de Fornecedores

### 1. Correção do Schema da Tabela `suppliers`

#### Data: 13/12/2025

#### Problema
A tabela `suppliers` estava com schema incompleto, faltando colunas essenciais que o código esperava.

#### Solução
Criado script de migração para adicionar todas as colunas faltantes.

#### Arquivo: `fix-suppliers-schema.sql`

```sql
-- Adicionar colunas faltantes na tabela suppliers

-- 1. Adicionar coluna code (código auto-gerado)
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

-- 2. Adicionar coluna legal_name (razão social)
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);

-- 3. Adicionar coluna tax_id (CNPJ/CPF)
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20);

-- 4. Adicionar coluna website
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- 5. Adicionar coluna payment_terms
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- 6. Adicionar coluna lead_time_days
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 0;

-- 7. Adicionar coluna minimum_order_value
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS minimum_order_value DECIMAL(15,2) DEFAULT 0;

-- 8. Adicionar coluna rating
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- 9. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_tax_id ON suppliers(tax_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_rating ON suppliers(rating);

-- 10. Gerar códigos para fornecedores existentes
DO $$
DECLARE
    supplier_record RECORD;
    new_code VARCHAR(50);
    counter INTEGER := 1;
BEGIN
    FOR supplier_record IN
        SELECT id FROM suppliers WHERE code IS NULL OR code = ''
    LOOP
        LOOP
            new_code := 'FORN-' || LPAD(counter::TEXT, 4, '0');
            EXIT WHEN NOT EXISTS (SELECT 1 FROM suppliers WHERE code = new_code);
            counter := counter + 1;
        END LOOP;
        UPDATE suppliers SET code = new_code WHERE id = supplier_record.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- 11. Tornar code obrigatório
ALTER TABLE suppliers
ALTER COLUMN code SET NOT NULL;

-- 12. Atualizar constraint de status
ALTER TABLE suppliers
DROP CONSTRAINT IF EXISTS suppliers_status_check;

ALTER TABLE suppliers
ADD CONSTRAINT suppliers_status_check
CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED'));
```

#### Como executar:
```bash
psql postgresql://ejr_user:ejr_local_2025@localhost:5432/ejr_organizador_dev -f fix-suppliers-schema.sql
```

---

### 2. Campo Fabricante (Manufacturer) com Autocomplete

#### Data: 13/12/2025

#### Descrição
Adicionado campo "Fabricante" na página de fornecedores com funcionalidade de autocomplete inteligente.

#### Mudanças no Banco de Dados

```sql
-- Adicionar coluna manufacturer
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS manufacturer TEXT;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_suppliers_manufacturer ON suppliers(manufacturer);

-- Criar registro padrão (opcional)
INSERT INTO suppliers (
  id, name, document, manufacturer, status, notes
) VALUES (
  'default-manufacturer',
  'Fabricante Genérico',
  '00000000000000',
  'Fabricante Genérico',
  'ACTIVE',
  'Fornecedor padrão para produtos sem fabricante específico'
) ON CONFLICT (id) DO NOTHING;
```

#### Mudanças no Backend (API)

##### 1. Repository - `apps/api/src/repositories/suppliers.repository.ts`

**Adicionar ao final da classe `SuppliersRepository`:**

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

**Atualizar interface Supplier:**

```typescript
export interface Supplier {
  id: string;
  code: string;
  name: string;
  legalName?: string;
  taxId?: string;
  manufacturer?: string;  // ADICIONAR ESTA LINHA
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

**Atualizar método `mapSupplier`:**

```typescript
private mapSupplier(data: any): Supplier {
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    legalName: data.legal_name || undefined,
    taxId: data.tax_id || undefined,
    manufacturer: data.manufacturer || undefined,  // ADICIONAR ESTA LINHA
    email: data.email || undefined,
    phone: data.phone || undefined,
    website: data.website || undefined,
    paymentTerms: data.payment_terms || undefined,
    leadTimeDays: data.lead_time_days || 0,
    minimumOrderValue: parseFloat(data.minimum_order_value) || 0,
    status: data.status,
    rating: data.rating || undefined,
    notes: data.notes || undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
```

**Atualizar método `create` - adicionar manufacturer na posição $6:**

```typescript
async create(data: CreateSupplierDTO): Promise<Supplier> {
  const id = `supp-${Date.now()}`;
  const code = await this.generateSupplierCode();

  const sql = `
    INSERT INTO suppliers (
      id, code, name, legal_name, tax_id, manufacturer,  -- manufacturer aqui
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
    data.manufacturer,  // ADICIONAR ESTA LINHA (posição $6)
    data.email,
    data.phone,
    data.website,
    data.paymentTerms,
    data.leadTimeDays || 0,
    data.minimumOrderValue || 0,
    data.status || 'ACTIVE',
    data.rating,
    data.notes,
  ]);

  return this.mapSupplier(result.rows[0]);
}
```

**Atualizar método `update`:**

```typescript
async update(id: string, data: UpdateSupplierDTO): Promise<Supplier> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(data.name);
  }
  if (data.legalName !== undefined) {
    fields.push(`legal_name = $${paramCount++}`);
    values.push(data.legalName);
  }
  if (data.taxId !== undefined) {
    fields.push(`tax_id = $${paramCount++}`);
    values.push(data.taxId);
  }
  if (data.manufacturer !== undefined) {  // ADICIONAR ESTE BLOCO
    fields.push(`manufacturer = $${paramCount++}`);
    values.push(data.manufacturer);
  }
  // ... resto dos campos
}
```

##### 2. Service - `apps/api/src/services/suppliers.service.ts`

**Adicionar ao final da classe:**

```typescript
// Método para buscar fabricantes únicos
async getUniqueManufacturers(search?: string): Promise<string[]> {
  return this.repository.getUniqueManufacturers(search);
}
```

##### 3. Controller - `apps/api/src/controllers/suppliers.controller.ts`

**Adicionar ao final da classe:**

```typescript
// Endpoint: Fabricantes únicos
getManufacturers = async (req: Request, res: Response) => {
  const search = req.query.search as string;
  const manufacturers = await this.service.getUniqueManufacturers(search);
  res.json({ success: true, data: manufacturers });
};
```

##### 4. Routes - `apps/api/src/routes/suppliers.routes.ts`

**Adicionar após a linha `router.get('/', asyncHandler(controller.findMany));`:**

```typescript
router.get('/manufacturers', asyncHandler(controller.getManufacturers));
```

#### Mudanças no Frontend (Web)

##### 1. Hook - `apps/web/src/hooks/useSuppliers.ts`

**Atualizar interface Supplier:**

```typescript
export interface Supplier {
  id: string;
  code: string;
  name: string;
  legalName?: string;
  taxId?: string;
  manufacturer?: string;  // ADICIONAR ESTA LINHA
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

##### 2. Componente Autocomplete - `apps/web/src/components/ManufacturerAutocomplete.tsx`

**Criar novo arquivo:**

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

##### 3. Formulário de Fornecedor - `apps/web/src/pages/SupplierFormPage.tsx`

**Adicionar import:**

```typescript
import { ManufacturerAutocomplete } from '../components/ManufacturerAutocomplete';
```

**Adicionar ao formData state:**

```typescript
const [formData, setFormData] = useState<Partial<Supplier>>({
  name: '',
  legalName: '',
  taxId: '',
  manufacturer: '',  // ADICIONAR ESTA LINHA
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
      manufacturer: supplier.manufacturer || '',  // ADICIONAR ESTA LINHA
      // ... outros campos
    });
  }
}, [supplier]);
```

**Substituir o input de fabricante pelo componente autocomplete:**

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

##### 4. Lista de Fornecedores - `apps/web/src/pages/SuppliersPage.tsx`

**Adicionar coluna na tabela (entre Telefone e Avaliação):**

```typescript
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  Fabricante
</th>
```

**Adicionar dados na linha:**

```typescript
<td className="px-6 py-4 whitespace-nowrap">
  <div className="text-sm text-gray-900">
    {supplier.manufacturer || '-'}
  </div>
</td>
```

**Atualizar colspan do estado vazio de 7 para 8.**

---

## Scripts de Migração

### Ordem de Execução

1. **Setup inicial do banco de dados**
   ```bash
   # Criar usuário e database
   sudo -u postgres psql
   CREATE USER ejr_user WITH PASSWORD 'ejr_local_2025';
   CREATE DATABASE ejr_organizador_dev OWNER ejr_user;
   GRANT ALL PRIVILEGES ON DATABASE ejr_organizador_dev TO ejr_user;
   \q
   ```

2. **Executar migrações base** (se ainda não executadas)
   ```bash
   # Execute as migrações em ordem numérica
   psql postgresql://ejr_user:ejr_local_2025@localhost:5432/ejr_organizador_dev -f apps/api/migrations/001_*.sql
   # ... continue com todas as migrações
   ```

3. **Corrigir schema de fornecedores**
   ```bash
   psql postgresql://ejr_user:ejr_local_2025@localhost:5432/ejr_organizador_dev -f fix-suppliers-schema.sql
   ```

---

## Checklist de Aplicação em Nova Instalação

### Backend

- [ ] Atualizar `apps/api/src/repositories/suppliers.repository.ts`
  - [ ] Adicionar campo `manufacturer` na interface Supplier
  - [ ] Atualizar método `mapSupplier`
  - [ ] Atualizar método `create`
  - [ ] Atualizar método `update`
  - [ ] Adicionar método `getUniqueManufacturers`

- [ ] Atualizar `apps/api/src/services/suppliers.service.ts`
  - [ ] Adicionar método `getUniqueManufacturers`

- [ ] Atualizar `apps/api/src/controllers/suppliers.controller.ts`
  - [ ] Adicionar método `getManufacturers`

- [ ] Atualizar `apps/api/src/routes/suppliers.routes.ts`
  - [ ] Adicionar rota `/manufacturers`

### Frontend

- [ ] Atualizar `apps/web/src/hooks/useSuppliers.ts`
  - [ ] Adicionar campo `manufacturer` na interface Supplier
  - [ ] Adicionar hook `useManufacturers`

- [ ] Criar `apps/web/src/components/ManufacturerAutocomplete.tsx`
  - [ ] Implementar componente completo

- [ ] Atualizar `apps/web/src/pages/SupplierFormPage.tsx`
  - [ ] Adicionar import do ManufacturerAutocomplete
  - [ ] Adicionar manufacturer ao formData
  - [ ] Substituir input por autocomplete

- [ ] Atualizar `apps/web/src/pages/SuppliersPage.tsx`
  - [ ] Adicionar coluna Fabricante
  - [ ] Atualizar colspan

### Database

- [ ] Executar `fix-suppliers-schema.sql`

---

## Notas de Desenvolvimento

### Banco de Dados

- **Formato de código de fornecedor**: `FORN-XXXX` (auto-incrementado)
- **Status permitidos**: ACTIVE, INACTIVE, BLOCKED
- **Rating**: Valores de 1 a 5
- **Índices criados** em: code, tax_id, rating, manufacturer, status

### API

- **Endpoint de fabricantes**: `GET /api/v1/suppliers/manufacturers?search=termo`
- **Autenticação**: Todas as rotas de suppliers requerem autenticação
- **Formato de resposta**: `{ success: true, data: [...] }`

### Frontend

- **Autocomplete features**:
  - Busca em tempo real
  - Navegação por teclado (setas, Enter, Escape)
  - Criação de novo fabricante digitando e pressionando Enter
  - Fechamento ao clicar fora
  - Estado de loading

---

## Histórico de Versões

### v1.1.0 - 13/12/2025
- ✅ Correção completa do schema da tabela suppliers
- ✅ Adição do campo Fabricante com autocomplete
- ✅ Migração para PostgreSQL local

---

## Contato

Para dúvidas sobre estas mudanças, consulte este documento ou os arquivos de código-fonte mencionados.

**Data da última atualização**: 13/12/2025
