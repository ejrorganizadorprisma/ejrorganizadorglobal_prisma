# Implementação - Fase 1A: Produtos Duais

## 🎯 Objetivo
Adicionar suporte para dois tipos de produtos: FINAL (vendido ao cliente) e COMPONENT (usado em montagem).

---

## PASSO 1: Executar Migration SQL no Supabase

### 1.1 Acessar Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**

### 1.2 Copiar e Executar o SQL

Copie TODO o conteúdo do arquivo `sql/migrations/001_add_product_types.sql` e cole no editor SQL.

Ou copie diretamente daqui:

```sql
-- Migration 001: Add Product Types and Manufacturing Fields
-- Description: Extends products table to support FINAL products vs COMPONENTS
-- Date: 2025-11-16

-- Step 1: Add new columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'FINAL' CHECK (product_type IN ('FINAL', 'COMPONENT'));

ALTER TABLE products
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0';

ALTER TABLE products
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('DEVELOPMENT', 'PRODUCTION', 'ACTIVE', 'DISCONTINUED'));

-- Component-specific fields
ALTER TABLE products
ADD COLUMN IF NOT EXISTS warehouse_location TEXT;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS minimum_lot_quantity INTEGER;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS technical_description TEXT;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_type_status ON products(product_type, status);

-- Step 3: Update existing products to be FINAL type by default
UPDATE products
SET product_type = 'FINAL'
WHERE product_type IS NULL;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN products.product_type IS 'FINAL = Product sold to customers, COMPONENT = Part used in assembly';
COMMENT ON COLUMN products.status IS 'DEVELOPMENT = Being developed, PRODUCTION = Prototype phase, ACTIVE = Ready for sale, DISCONTINUED = No longer available';
COMMENT ON COLUMN products.warehouse_location IS 'Physical location in warehouse (e.g., A-12-3)';
COMMENT ON COLUMN products.lead_time_days IS 'Supplier delivery time in days (for components)';
COMMENT ON COLUMN products.minimum_lot_quantity IS 'Minimum purchase quantity (for components)';

-- Step 5: Create view for quick access to components and final products
CREATE OR REPLACE VIEW v_components AS
SELECT * FROM products WHERE product_type = 'COMPONENT';

CREATE OR REPLACE VIEW v_final_products AS
SELECT * FROM products WHERE product_type = 'FINAL';

-- Verification query
SELECT product_type, COUNT(*) as count FROM products GROUP BY product_type;
```

### 1.3 Executar

Clique em **RUN** (ou Ctrl+Enter)

### 1.4 Verificar

Você deve ver:
- Sucesso nas alterações
- No final, uma tabela mostrando a contagem por tipo (todos devem ser 'FINAL')

---

## PASSO 2: Verificar no Table Editor

1. Vá em **Table Editor** > **products**
2. Verifique que existem as novas colunas:
   - `product_type` (FINAL ou COMPONENT)
   - `version` (1.0)
   - `status` (ACTIVE, DEVELOPMENT, etc.)
   - `warehouse_location`
   - `lead_time_days`
   - `minimum_lot_quantity`
   - `technical_description`

---

## PASSO 3: Atualizar Backend - Repository

Agora vamos atualizar o código TypeScript.

### 3.1 Atualizar `apps/api/src/repositories/product.repository.ts`

Adicione estes métodos na classe `ProductRepository`:

```typescript
// Adicionar no final da classe ProductRepository

async findByType(type: 'FINAL' | 'COMPONENT') {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('product_type', type)
    .order('name');

  if (error) throw error;
  return data;
}

async findComponents() {
  return this.findByType('COMPONENT');
}

async findFinalProducts() {
  return this.findByType('FINAL');
}
```

---

## PASSO 4: Atualizar Backend - Service

### 4.1 Atualizar `apps/api/src/services/product.service.ts`

Adicione estes métodos:

```typescript
// Adicionar na classe ProductService

async getComponents() {
  return this.repository.findComponents();
}

async getFinalProducts() {
  return this.repository.findFinalProducts();
}
```

---

## PASSO 5: Atualizar Backend - Controller

### 5.1 Atualizar `apps/api/src/controllers/product.controller.ts`

Adicione estes métodos:

```typescript
// Adicionar na classe ProductController

getComponents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const components = await this.service.getComponents();
    res.json({ success: true, data: components });
  } catch (error) {
    next(error);
  }
};

getFinalProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const finalProducts = await this.service.getFinalProducts();
    res.json({ success: true, data: finalProducts });
  } catch (error) {
    next(error);
  }
};
```

---

## PASSO 6: Atualizar Backend - Routes

### 6.1 Atualizar `apps/api/src/routes/product.routes.ts`

Adicione estas rotas:

```typescript
// Adicionar antes das rotas /:id

router.get('/components', controller.getComponents);
router.get('/final-products', controller.getFinalProducts);
```

**IMPORTANTE:** Estas rotas devem vir ANTES de `router.get('/:id')` para evitar conflito!

---

## PASSO 7: Atualizar Frontend - Form

### 7.1 Atualizar `apps/web/src/pages/ProductFormPage.tsx`

Encontre o formulário e adicione estes campos ANTES do campo de nome:

```tsx
{/* TIPO DE PRODUTO */}
<div>
  <label htmlFor="product_type" className="block text-sm font-medium text-gray-700">
    Tipo de Produto *
  </label>
  <select
    id="product_type"
    name="product_type"
    value={formData.product_type || 'FINAL'}
    onChange={handleChange}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
  >
    <option value="FINAL">Produto Final (vendido ao cliente)</option>
    <option value="COMPONENT">Componente/Peça (usado em montagem)</option>
  </select>
  <p className="mt-1 text-sm text-gray-500">
    Produto Final: item vendido ao cliente. Componente: peça usada para montar produtos.
  </p>
</div>

{/* STATUS */}
<div>
  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
    Status *
  </label>
  <select
    id="status"
    name="status"
    value={formData.status || 'ACTIVE'}
    onChange={handleChange}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
  >
    <option value="DEVELOPMENT">Em Desenvolvimento</option>
    <option value="PRODUCTION">Em Produção (protótipo)</option>
    <option value="ACTIVE">Ativo</option>
    <option value="DISCONTINUED">Descontinuado</option>
  </select>
</div>

{/* VERSÃO */}
<div>
  <label htmlFor="version" className="block text-sm font-medium text-gray-700">
    Versão
  </label>
  <input
    type="text"
    id="version"
    name="version"
    value={formData.version || '1.0'}
    onChange={handleChange}
    placeholder="Ex: 1.0, 2.1, etc."
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
  />
</div>

{/* CAMPOS ESPECÍFICOS PARA COMPONENTES */}
{formData.product_type === 'COMPONENT' && (
  <>
    <div className="col-span-2 border-t pt-4 mt-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Informações Específicas de Componente
      </h3>
    </div>

    <div>
      <label htmlFor="warehouse_location" className="block text-sm font-medium text-gray-700">
        Localização no Armazém
      </label>
      <input
        type="text"
        id="warehouse_location"
        name="warehouse_location"
        value={formData.warehouse_location || ''}
        onChange={handleChange}
        placeholder="Ex: A-12-3, Prateleira B2"
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
      <p className="mt-1 text-sm text-gray-500">
        Onde este componente está armazenado no depósito
      </p>
    </div>

    <div>
      <label htmlFor="lead_time_days" className="block text-sm font-medium text-gray-700">
        Lead Time (dias)
      </label>
      <input
        type="number"
        id="lead_time_days"
        name="lead_time_days"
        value={formData.lead_time_days || ''}
        onChange={handleChange}
        min="0"
        placeholder="Ex: 15"
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
      <p className="mt-1 text-sm text-gray-500">
        Tempo de entrega do fornecedor em dias
      </p>
    </div>

    <div>
      <label htmlFor="minimum_lot_quantity" className="block text-sm font-medium text-gray-700">
        Lote Mínimo de Compra
      </label>
      <input
        type="number"
        id="minimum_lot_quantity"
        name="minimum_lot_quantity"
        value={formData.minimum_lot_quantity || ''}
        onChange={handleChange}
        min="1"
        placeholder="Ex: 100"
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
      <p className="mt-1 text-sm text-gray-500">
        Quantidade mínima que deve ser comprada por pedido
      </p>
    </div>

    <div className="col-span-2">
      <label htmlFor="technical_description" className="block text-sm font-medium text-gray-700">
        Descrição Técnica
      </label>
      <textarea
        id="technical_description"
        name="technical_description"
        value={formData.technical_description || ''}
        onChange={handleChange}
        rows={3}
        placeholder="Especificações técnicas detalhadas do componente..."
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
    </div>
  </>
)}
```

---

## PASSO 8: Atualizar Frontend - Lista de Produtos

### 8.1 Atualizar `apps/web/src/pages/ProductsPage.tsx`

Adicione filtros e badges para mostrar o tipo:

```tsx
// Adicionar no topo do componente, depois do useState dos produtos
const [typeFilter, setTypeFilter] = useState<'ALL' | 'FINAL' | 'COMPONENT'>('ALL');

// Adicionar função de filtro
const filteredProducts = products?.filter(product => {
  if (typeFilter === 'ALL') return true;
  return product.product_type === typeFilter;
}) || [];

// No JSX, adicionar antes da tabela:
<div className="mb-4 flex gap-2">
  <button
    onClick={() => setTypeFilter('ALL')}
    className={`px-4 py-2 rounded-md ${
      typeFilter === 'ALL'
        ? 'bg-blue-600 text-white'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`}
  >
    Todos
  </button>
  <button
    onClick={() => setTypeFilter('FINAL')}
    className={`px-4 py-2 rounded-md ${
      typeFilter === 'FINAL'
        ? 'bg-green-600 text-white'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`}
  >
    Produtos Finais
  </button>
  <button
    onClick={() => setTypeFilter('COMPONENT')}
    className={`px-4 py-2 rounded-md ${
      typeFilter === 'COMPONENT'
        ? 'bg-purple-600 text-white'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`}
  >
    Componentes
  </button>
</div>

// Na tabela, adicionar coluna de Tipo:
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
  Tipo
</th>

// Na linha da tabela:
<td className="px-6 py-4 whitespace-nowrap">
  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
    product.product_type === 'FINAL'
      ? 'bg-green-100 text-green-800'
      : 'bg-purple-100 text-purple-800'
  }`}>
    {product.product_type === 'FINAL' ? 'Produto Final' : 'Componente'}
  </span>
</td>
```

---

## PASSO 9: Testar

### 9.1 Reiniciar servidor (se necessário)

```bash
cd /home/nmaldaner/projetos/estoque
# O servidor deve reiniciar automaticamente, mas se não:
# Ctrl+C e depois: pnpm dev
```

### 9.2 Acessar o sistema

1. Acesse http://localhost:5173
2. Vá em **Produtos**
3. Clique em **Novo Produto**
4. Veja os novos campos: Tipo, Status, Versão
5. Selecione "Componente" e veja campos adicionais aparecerem

### 9.3 Criar um componente de teste

- Tipo: Componente
- Nome: Resistor 10K Ohm
- Código: RES-10K
- Localização: A-05-2
- Lead Time: 7 dias
- Lote Mínimo: 100

### 9.4 Criar um produto final de teste

- Tipo: Produto Final
- Nome: Placa Controladora v2.0
- Código: PCB-CTRL-02
- Status: Ativo
- Versão: 2.0

### 9.5 Ver a listagem

- Use os filtros para alternar entre todos/finais/componentes
- Veja os badges de tipo

---

## ✅ Checklist de Conclusão

- [ ] SQL executado no Supabase SQL Editor
- [ ] Verificado no Table Editor que colunas existem
- [ ] Backend atualizado (repository, service, controller, routes)
- [ ] Frontend atualizado (form e listagem)
- [ ] Servidor reiniciado
- [ ] Testado criação de componente
- [ ] Testado criação de produto final
- [ ] Filtros funcionando na listagem

---

## 🐛 Troubleshooting

### Erro: Column does not exist
- Verifique que executou o SQL no Supabase
- Vá no Table Editor e confirme que as colunas existem

### Campos não aparecem no formulário
- Verifique que atualizou o ProductFormPage.tsx
- Verifique que não há erros no console do navegador (F12)

### API retorna erro
- Verifique que atualizou repository, service, controller e routes
- Verifique que as rotas `/components` e `/final-products` estão ANTES de `/:id`

---

## 📊 Próximo Passo

Depois de testar e confirmar que tudo funciona:

**FASE 1B: Estoque Reservado**

Ou você pode:
- Criar mais produtos de teste
- Explorar a UI
- Reportar bugs/melhorias
