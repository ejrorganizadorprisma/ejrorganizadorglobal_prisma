# Frontend Changes - Fase 1A

## ✅ Backend Completo!

O backend foi 100% atualizado com:
- ✅ Repository com métodos `findComponents()` e `findFinalProducts()`
- ✅ Service com métodos `getComponents()` e `getFinalProducts()`
- ✅ Controller com endpoints `getComponents` e `getFinalProducts`
- ✅ Routes `/api/products/components` e `/api/products/final-products`

---

## 📝 Frontend - Mudanças Necessárias

### ARQUIVO 1: ProductFormPage.tsx

**Localização:** `/home/nmaldaner/projetos/estoque/apps/web/src/pages/ProductFormPage.tsx`

**O que fazer:**
1. Adicionar novos campos ao formulário (logo após os imports ou no início do formulário)
2. Adicionar lógica condicional para mostrar campos de componentes

**Código para adicionar:**

```tsx
// Logo após o campo "nome", adicionar:

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
    placeholder="Ex: 1.0, 2.1"
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
        placeholder="Ex: A-12-3"
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
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
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
    </div>

    <div>
      <label htmlFor="minimum_lot_quantity" className="block text-sm font-medium text-gray-700">
        Lote Mínimo
      </label>
      <input
        type="number"
        id="minimum_lot_quantity"
        name="minimum_lot_quantity"
        value={formData.minimum_lot_quantity || ''}
        onChange={handleChange}
        min="1"
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
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
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
    </div>
  </>
)}
```

---

### ARQUIVO 2: ProductsPage.tsx

**Localização:** `/home/nmaldaner/projetos/estoque/apps/web/src/pages/ProductsPage.tsx`

**O que fazer:**
1. Adicionar state para filtro de tipo
2. Adicionar botões de filtro
3. Adicionar coluna "Tipo" na tabela
4. Adicionar badge visual do tipo

**Código para adicionar:**

```tsx
// No início do componente, adicionar state:
const [typeFilter, setTypeFilter] = useState<'ALL' | 'FINAL' | 'COMPONENT'>('ALL');

// Adicionar função de filtro (antes do return):
const filteredProducts = products?.filter(product => {
  if (typeFilter === 'ALL') return true;
  return product.product_type === typeFilter;
}) || [];

// No JSX, ANTES da tabela, adicionar botões de filtro:
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

// Na TABELA, adicionar coluna TIP O no <thead>:
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
  Tipo
</th>

// Na linha da tabela (<tbody>), adicionar coluna com badge:
<td className="px-6 py-4 whitespace-nowrap">
  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
    product.product_type === 'FINAL'
      ? 'bg-green-100 text-green-800'
      : 'bg-purple-100 text-purple-800'
  }`}>
    {product.product_type === 'FINAL' ? 'Produto Final' : 'Componente'}
  </span>
</td>

// IMPORTANTE: Trocar products.map() por filteredProducts.map()
{filteredProducts.map(product => (
  // ... resto do código da linha
))}
```

---

## 🎯 Resumo das Mudanças

### Backend (✅ CONCLUÍDO):
1. ✅ products.repository.ts - Métodos find By Type, findComponents, findFinalProducts
2. ✅ products.service.ts - Métodos getComponents, getFinalProducts
3. ✅ products.controller.ts - Endpoints getComponents, getFinalProducts
4. ✅ products.routes.ts - Rotas /components e /final-products

### Frontend (⏳ PENDENTE):
5. ⏳ ProductFormPage.tsx - Adicionar campos de tipo, status, versão e campos condicionais
6. ⏳ ProductsPage.tsx - Adicionar filtros e coluna de tipo

---

## 📋 Instruções de Implementação

### Opção 1: Manual
1. Abra `/apps/web/src/pages/ProductFormPage.tsx`
2. Copie o código acima e cole nos locais indicados
3. Abra `/apps/web/src/pages/ProductsPage.tsx`
4. Copie o código acima e cole nos locais indicados
5. Salve os arquivos
6. O hot reload deve atualizar automaticamente

### Opção 2: Deixar Claude continuar
- Posso continuar fazendo as alterações nos arquivos frontend automaticamente

---

## ✅ Como Testar

1. Acesse http://localhost:5173
2. Vá em **Produtos**
3. Clique em **Novo Produto**
4. Veja os novos campos: Tipo, Status, Versão
5. Selecione "Componente" → Campos adicionais aparecem
6. Crie um componente de teste
7. Volte na listagem → Use os filtros
8. Veja o badge de tipo na tabela

---

## 🐛 Possíveis Erros

### "product_type is not defined"
- SQL não foi executado no Supabase
- Solução: Execute o SQL em Supabase SQL Editor

### "Cannot read property 'product_type'"
- Produtos antigos não têm o campo
- Solução: Use `product.product_type || 'FINAL'` com fallback

### Filtros não funcionam
- Verifique se está usando `filteredProducts.map()` e não `products.map()`

---

Quer que eu continue e faça as alterações no frontend automaticamente? Ou prefere fazer manualmente seguindo este guia?
