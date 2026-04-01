# Guia de Aplicação de Features - EJR Organizador

Este guia mostra como aplicar as novas funcionalidades desenvolvidas em outra cópia do sistema.

## Feature: Campo Fabricante com Autocomplete

### Tempo Estimado: 30-40 minutos

---

## Passo 1: Banco de Dados (2 minutos)

Execute o SQL abaixo no banco de dados:

```sql
-- Adicionar coluna manufacturer
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS manufacturer TEXT;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_suppliers_manufacturer ON suppliers(manufacturer);
```

**Como executar:**
```bash
psql <SUA_DATABASE_URL> -c "
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS manufacturer TEXT;
CREATE INDEX IF NOT EXISTS idx_suppliers_manufacturer ON suppliers(manufacturer);
"
```

---

## Passo 2: Backend (15-20 minutos)

### 2.1 Repository
**Arquivo**: `apps/api/src/repositories/suppliers.repository.ts`

#### Modificação 1: Interface Supplier
Localizar a interface `Supplier` e adicionar:
```typescript
manufacturer?: string;
```

#### Modificação 2: Método mapSupplier
Localizar o método `mapSupplier` e adicionar:
```typescript
manufacturer: data.manufacturer || undefined,
```

#### Modificação 3: Método create
Localizar o INSERT e:
1. Adicionar `manufacturer` na lista de colunas (após `tax_id`)
2. Adicionar `$6` nos VALUES
3. Adicionar `data.manufacturer` nos parâmetros (posição 6)

#### Modificação 4: Método update
Adicionar este bloco no início do método (após outros ifs):
```typescript
if (data.manufacturer !== undefined) {
  fields.push(`manufacturer = $${paramCount++}`);
  values.push(data.manufacturer);
}
```

#### Modificação 5: Novo método
Adicionar ao final da classe:
```typescript
async getUniqueManufacturers(search?: string): Promise<string[]> {
  let sql = `
    SELECT DISTINCT manufacturer
    FROM suppliers
    WHERE manufacturer IS NOT NULL AND manufacturer != ''
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

### 2.2 Service
**Arquivo**: `apps/api/src/services/suppliers.service.ts`

Adicionar ao final da classe:
```typescript
async getUniqueManufacturers(search?: string): Promise<string[]> {
  return this.repository.getUniqueManufacturers(search);
}
```

### 2.3 Controller
**Arquivo**: `apps/api/src/controllers/suppliers.controller.ts`

Adicionar ao final da classe:
```typescript
getManufacturers = async (req: Request, res: Response) => {
  const search = req.query.search as string;
  const manufacturers = await this.service.getUniqueManufacturers(search);
  res.json({ success: true, data: manufacturers });
};
```

### 2.4 Routes
**Arquivo**: `apps/api/src/routes/suppliers.routes.ts`

Adicionar após `router.get('/', asyncHandler(controller.findMany));`:
```typescript
router.get('/manufacturers', asyncHandler(controller.getManufacturers));
```

---

## Passo 3: Frontend (15-20 minutos)

### 3.1 Hook
**Arquivo**: `apps/web/src/hooks/useSuppliers.ts`

#### Modificação 1: Interface Supplier
Adicionar à interface:
```typescript
manufacturer?: string;
```

#### Modificação 2: Novo hook
Adicionar ao final do arquivo:
```typescript
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

### 3.2 Componente Autocomplete
**Arquivo**: `apps/web/src/components/ManufacturerAutocomplete.tsx` (NOVO)

Criar este arquivo com o conteúdo completo disponível em `CHANGELOG_FEATURES.md`.

### 3.3 Formulário de Fornecedor
**Arquivo**: `apps/web/src/pages/SupplierFormPage.tsx`

#### Modificação 1: Import
Adicionar no topo:
```typescript
import { ManufacturerAutocomplete } from '../components/ManufacturerAutocomplete';
```

#### Modificação 2: FormData inicial
Adicionar ao state:
```typescript
manufacturer: '',
```

#### Modificação 3: useEffect
Adicionar na carga de dados do supplier:
```typescript
manufacturer: supplier.manufacturer || '',
```

#### Modificação 4: Input
Substituir o input de fabricante por:
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

### 3.4 Lista de Fornecedores
**Arquivo**: `apps/web/src/pages/SuppliersPage.tsx`

#### Modificação 1: Header da tabela
Adicionar coluna (entre Telefone e Avaliação):
```typescript
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  Fabricante
</th>
```

#### Modificação 2: Body da tabela
Adicionar célula (mesma posição):
```typescript
<td className="px-6 py-4 whitespace-nowrap">
  <div className="text-sm text-gray-900">
    {supplier.manufacturer || '-'}
  </div>
</td>
```

#### Modificação 3: Colspan
Alterar `colSpan={7}` para `colSpan={8}` na mensagem de estado vazio.

---

## Passo 4: Testar (5 minutos)

```bash
# Reiniciar servidor
pnpm dev
```

### Verificações:

1. ✅ Acessar página de fornecedores
2. ✅ Criar novo fornecedor
3. ✅ Campo "Fabricante" aparece com autocomplete
4. ✅ Ao digitar, busca fabricantes
5. ✅ Possível criar novo fabricante
6. ✅ Lista de fornecedores mostra coluna Fabricante
7. ✅ Sem erros no console

---

## Checklist de Aplicação

### Backend
- [ ] Repository: Interface atualizada
- [ ] Repository: mapSupplier atualizado
- [ ] Repository: create atualizado
- [ ] Repository: update atualizado
- [ ] Repository: getUniqueManufacturers adicionado
- [ ] Service: getUniqueManufacturers adicionado
- [ ] Controller: getManufacturers adicionado
- [ ] Routes: rota /manufacturers adicionada

### Frontend
- [ ] Hook: Interface atualizada
- [ ] Hook: useManufacturers adicionado
- [ ] Componente: ManufacturerAutocomplete criado
- [ ] Form: Import adicionado
- [ ] Form: formData atualizado
- [ ] Form: useEffect atualizado
- [ ] Form: Input substituído por autocomplete
- [ ] Lista: Coluna header adicionada
- [ ] Lista: Coluna body adicionada
- [ ] Lista: Colspan atualizado

### Database
- [ ] Coluna manufacturer adicionada
- [ ] Índice criado

### Testes
- [ ] Autocomplete funciona
- [ ] Busca funciona
- [ ] Criar novo funciona
- [ ] Salvar fornecedor funciona
- [ ] Lista mostra fabricante

---

## Resumo Rápido

**8 arquivos modificados + 1 novo:**

1. `suppliers.repository.ts` - 5 mudanças
2. `suppliers.service.ts` - 1 método
3. `suppliers.controller.ts` - 1 método
4. `suppliers.routes.ts` - 1 rota
5. `useSuppliers.ts` - interface + hook
6. `ManufacturerAutocomplete.tsx` - **NOVO**
7. `SupplierFormPage.tsx` - 4 mudanças
8. `SuppliersPage.tsx` - 3 mudanças
9. SQL - 2 comandos

---

Para código completo de cada arquivo, consulte `CHANGELOG_FEATURES.md`.

**Data**: 13/12/2025 | **Versão**: 1.1.0
