# EJR Organizador - Sistema de Gestão Empresarial

Sistema fullstack de gestão empresarial com foco em estoque, vendas, produção e relacionamento com clientes.

## 🏗️ Arquitetura

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js 20 + Express + TypeScript + Prisma
- **Database:** PostgreSQL (Supabase)
- **Monorepo:** pnpm workspaces

## 📁 Estrutura do Projeto

```
/
├── apps/
│   ├── web/          # Frontend React
│   └── api/          # Backend Express
├── packages/
│   └── shared-types/ # Types compartilhados
├── docs/             # Documentação
│   ├── prd.md
│   └── architecture.md
└── doc/              # Análises
```

## 🚀 Setup Inicial

### 1. Instalar Dependências

```bash
npx pnpm install
```

### 2. Configurar Banco de Dados

Edite o arquivo `apps/api/.env` e substitua `[SUA_SENHA]` pela senha do seu banco Supabase:

```env
DATABASE_URL=postgresql://postgres.pqufymtbzrhzjfowaght:SUA_SENHA_AQUI@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### 3. Executar Migrations

```bash
pnpm db:generate
pnpm db:migrate
```

### 4. Popular Banco com Dados Iniciais

```bash
pnpm db:seed
```

Isso criará 3 usuários:
- **Owner:** owner@ejr.com / admin123
- **Director:** director@ejr.com / director123
- **Manager:** manager@ejr.com / manager123

## 💻 Desenvolvimento

### Rodar Backend e Frontend Simultaneamente

```bash
pnpm dev
```

Ou separadamente:

```bash
# Backend (porta 3000)
pnpm dev:api

# Frontend (porta 5173)
pnpm dev:web
```

### Acessar a Aplicação

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000
- **API Docs:** http://localhost:3000/api/v1/health

## 🔑 Autenticação

O sistema usa JWT com HTTP-only cookies para autenticação segura.

### Endpoints Disponíveis

- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Criar usuário
- `GET /api/v1/auth/me` - Dados do usuário atual
- `POST /api/v1/auth/logout` - Logout

## 📊 Prisma Studio

Para visualizar e editar dados:

```bash
pnpm db:studio
```

Abre em: http://localhost:5555

## 🧪 Testes

```bash
# Verificar tipos
pnpm typecheck

# Lint
pnpm lint
```

## 📦 Build

```bash
# Build completo
pnpm build

# Build específico
pnpm build:web
pnpm build:api
```

## 🗂️ Scripts Disponíveis

```bash
pnpm dev              # Dev de todos os apps
pnpm dev:web          # Dev do frontend
pnpm dev:api          # Dev do backend
pnpm build            # Build de tudo
pnpm build:web        # Build do frontend
pnpm build:api        # Build do backend
pnpm lint             # Lint de tudo
pnpm typecheck        # Check de tipos
pnpm db:migrate       # Rodar migrations
pnpm db:generate      # Gerar Prisma Client
pnpm db:studio        # Abrir Prisma Studio
pnpm db:seed          # Popular banco
```

## 📚 Documentação

- **PRD:** `/docs/prd.md` - Product Requirements Document
- **Arquitetura:** `/docs/architecture.md` - Arquitetura Fullstack Completa
- **Análises:** `/doc/` - Análises de negócio e viabilidade

## 🔒 Variáveis de Ambiente

### Backend (`apps/api/.env`)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173
```

### Frontend (`apps/web/.env`)

```env
VITE_API_URL=http://localhost:3000/api/v1
```

## 🤝 Contribuindo

1. Clone o repositório
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Próximos Passos

- [ ] Implementar cadastro de produtos
- [ ] Implementar gestão de clientes
- [ ] Implementar sistema de orçamentos
- [ ] Implementar sistema de pedidos
- [ ] Implementar controle de estoque
- [ ] Implementar dashboard com KPIs

## 🐛 Troubleshooting

### Erro de conexão com banco

Verifique se:
1. A senha do Supabase está correta no `.env`
2. O IP do servidor está autorizado no Supabase
3. A connection string está correta

### Erro ao rodar migrations

```bash
# Resetar banco (CUIDADO: apaga todos os dados)
pnpm db:migrate reset

# Depois popular novamente
pnpm db:seed
```

## 📄 Licença

ISC

---

**Desenvolvido com BMad Method Framework**
