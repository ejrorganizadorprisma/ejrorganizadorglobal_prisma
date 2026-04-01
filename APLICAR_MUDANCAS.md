# Guia Rápido - Aplicar Mudanças em Nova Cópia

Este documento fornece um resumo executivo para aplicar todas as mudanças documentadas em `CHANGELOG_DETALHADO.md` em outra cópia do sistema.

## Pré-requisitos

- PostgreSQL 16 instalado
- Node.js e pnpm instalados
- Acesso ao código-fonte da aplicação

## Passo 1: Configurar Banco de Dados

```bash
# 1.1 Criar usuário e database
sudo -u postgres psql <<EOF
CREATE USER ejr_user WITH PASSWORD 'ejr_local_2025';
CREATE DATABASE ejr_organizador_dev OWNER ejr_user;
GRANT ALL PRIVILEGES ON DATABASE ejr_organizador_dev TO ejr_user;
\q
EOF

# 1.2 Configurar .env
cat > apps/api/.env <<EOF
NODE_ENV=development
PORT=3002
DATABASE_URL=postgresql://ejr_user:ejr_local_2025@localhost:5432/ejr_organizador_dev
JWT_SECRET=ejr-super-secret-jwt-key-change-this-in-production-2025
FRONTEND_URL=http://localhost:5173,http://localhost:5174
LOG_LEVEL=info
LOG_DIR=./logs
EOF
```

## Passo 2: Executar Migrações SQL

```bash
# 2.1 Executar migração de correção de schema
psql postgresql://ejr_user:ejr_local_2025@localhost:5432/ejr_organizador_dev -f fix-suppliers-schema.sql
```

## Passo 3: Arquivos do Backend a Modificar

### 3.1 Repository
**Arquivo**: `apps/api/src/repositories/suppliers.repository.ts`

**Localizar e modificar**:
1. Interface `Supplier` - adicionar `manufacturer?: string;`
2. Método `mapSupplier` - adicionar `manufacturer: data.manufacturer || undefined,`
3. Método `create` - adicionar `manufacturer` como $6 no INSERT
4. Método `update` - adicionar bloco if para manufacturer
5. Adicionar método `getUniqueManufacturers` ao final da classe

### 3.2 Service
**Arquivo**: `apps/api/src/services/suppliers.service.ts`

**Adicionar ao final**:
```typescript
async getUniqueManufacturers(search?: string): Promise<string[]> {
  return this.repository.getUniqueManufacturers(search);
}
```

### 3.3 Controller
**Arquivo**: `apps/api/src/controllers/suppliers.controller.ts`

**Adicionar ao final**:
```typescript
getManufacturers = async (req: Request, res: Response) => {
  const search = req.query.search as string;
  const manufacturers = await this.service.getUniqueManufacturers(search);
  res.json({ success: true, data: manufacturers });
};
```

### 3.4 Routes
**Arquivo**: `apps/api/src/routes/suppliers.routes.ts`

**Adicionar após** `router.get('/', asyncHandler(controller.findMany));`:
```typescript
router.get('/manufacturers', asyncHandler(controller.getManufacturers));
```

## Passo 4: Arquivos do Frontend a Modificar

### 4.1 Hook
**Arquivo**: `apps/web/src/hooks/useSuppliers.ts`

**Modificar**:
1. Interface `Supplier` - adicionar `manufacturer?: string;`
2. Adicionar hook ao final:
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

### 4.2 Componente Autocomplete
**Criar arquivo**: `apps/web/src/components/ManufacturerAutocomplete.tsx`

Copiar todo o conteúdo do arquivo da documentação detalhada.

### 4.3 Formulário de Fornecedor
**Arquivo**: `apps/web/src/pages/SupplierFormPage.tsx`

**Modificar**:
1. Adicionar import: `import { ManufacturerAutocomplete } from '../components/ManufacturerAutocomplete';`
2. Adicionar `manufacturer: ''` ao formData inicial
3. Adicionar `manufacturer: supplier.manufacturer || ''` no useEffect de carregamento
4. Substituir o input de fabricante por:
```typescript
<ManufacturerAutocomplete
  value={formData.manufacturer || ''}
  onChange={(value) => setFormData({ ...formData, manufacturer: value })}
  placeholder="Digite o nome do fabricante..."
  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
/>
```

### 4.4 Lista de Fornecedores
**Arquivo**: `apps/web/src/pages/SuppliersPage.tsx`

**Modificar**:
1. Adicionar coluna no header da tabela (entre Telefone e Avaliação):
```typescript
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  Fabricante
</th>
```

2. Adicionar célula no body (mesma posição):
```typescript
<td className="px-6 py-4 whitespace-nowrap">
  <div className="text-sm text-gray-900">
    {supplier.manufacturer || '-'}
  </div>
</td>
```

3. Atualizar colspan de 7 para 8 na mensagem de "nenhum fornecedor"

## Passo 5: Testar

```bash
# 5.1 Instalar dependências
pnpm install

# 5.2 Iniciar servidor
pnpm dev

# 5.3 Acessar aplicação
# Frontend: http://localhost:5173
# API: http://localhost:3002/api/v1
```

## Passo 6: Verificar

### 6.1 Banco de Dados
```bash
psql postgresql://ejr_user:ejr_local_2025@localhost:5432/ejr_organizador_dev -c "\d suppliers"
```

Verificar se todas as colunas estão presentes:
- code
- legal_name
- tax_id
- website
- payment_terms
- lead_time_days
- minimum_order_value
- rating
- manufacturer

### 6.2 Aplicação
1. Acessar página de fornecedores
2. Criar novo fornecedor
3. Testar campo Fabricante com autocomplete
4. Verificar se não há erros no console do navegador
5. Verificar se não há erros nos logs da API

## Troubleshooting

### Erro: "column X does not exist"
**Solução**: Execute novamente o script `fix-suppliers-schema.sql`

### Erro: "relation suppliers does not exist"
**Solução**: Execute as migrações base primeiro

### Erro: "authentication failed"
**Solução**: Verifique as credenciais do PostgreSQL no arquivo .env

### Autocomplete não funciona
**Solução**:
1. Verificar se a rota `/manufacturers` foi adicionada
2. Verificar se o hook `useManufacturers` foi criado
3. Verificar console do navegador para erros

## Checklist Final

- [ ] Banco de dados criado
- [ ] Arquivo .env configurado
- [ ] Migration SQL executada
- [ ] Repository atualizado (5 mudanças)
- [ ] Service atualizado (1 método)
- [ ] Controller atualizado (1 método)
- [ ] Routes atualizado (1 rota)
- [ ] Hook atualizado (interface + 1 hook)
- [ ] Componente ManufacturerAutocomplete criado
- [ ] SupplierFormPage atualizado (3 mudanças)
- [ ] SuppliersPage atualizado (3 mudanças)
- [ ] Servidor inicia sem erros
- [ ] Criar fornecedor funciona
- [ ] Autocomplete funciona

## Arquivos de Referência

Para detalhes completos do código, consulte:
- `CHANGELOG_DETALHADO.md` - Documentação completa com todo o código
- `fix-suppliers-schema.sql` - Script SQL de migração

## Tempo Estimado

- Configuração do banco: 5 minutos
- Migração SQL: 1 minuto
- Modificações no Backend: 15-20 minutos
- Modificações no Frontend: 20-25 minutos
- Testes: 10 minutos

**Total**: Aproximadamente 50-60 minutos

---

**Última atualização**: 13/12/2025
