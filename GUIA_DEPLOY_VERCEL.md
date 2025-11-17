# 🚀 Guia Completo de Deploy no Vercel

## 📋 Pré-requisitos

1. Conta no Vercel (https://vercel.com)
2. Repositório no GitHub configurado
3. Dois arquivos criados:
   - `VERCEL_ENV_BACKEND.txt` - Variáveis para o backend
   - `VERCEL_ENV_FRONTEND.txt` - Variáveis para o frontend

---

## 🔐 Passo 1: Preparar Repositório GitHub

### Opção A: Usar HTTPS (mais simples)
```bash
git remote set-url origin https://github.com/inemaejr/EGRO.git
git push origin master
```

### Opção B: Configurar SSH
```bash
# Gerar chave SSH (se não tiver)
ssh-keygen -t ed25519 -C "seu-email@example.com"

# Copiar chave pública
cat ~/.ssh/id_ed25519.pub

# Adicionar no GitHub: Settings > SSH and GPG keys > New SSH key
```

---

## 🌐 Passo 2: Deploy do Backend (apps/api)

### 2.1 Criar Projeto no Vercel

1. Acesse https://vercel.com/dashboard
2. Clique em **"Add New..."** → **"Project"**
3. Conecte sua conta GitHub (se ainda não conectou)
4. Selecione o repositório `inemaejr/EGRO`

### 2.2 Configurar Build Settings

```
Framework Preset: Other
Root Directory: apps/api
Build Command: pnpm run build
Output Directory: dist
Install Command: pnpm install
Node.js Version: 18.x
```

### 2.3 Adicionar Variáveis de Ambiente

1. Vá para **Settings** → **Environment Variables**
2. Copie TODAS as variáveis de `VERCEL_ENV_BACKEND.txt`
3. Adicione uma por uma:
   - NODE_ENV = production
   - PORT = 3000
   - DATABASE_URL = (valor do arquivo)
   - SUPABASE_URL = (valor do arquivo)
   - SUPABASE_ANON_KEY = (valor do arquivo)
   - SUPABASE_SERVICE_KEY = (valor do arquivo)
   - JWT_SECRET = (valor do arquivo)
   - FRONTEND_URL = (será atualizado depois)
   - LOG_LEVEL = info
   - LOG_DIR = ./logs

4. Clique em **Deploy**

### 2.4 Anotar URL do Backend

Após o deploy, você receberá uma URL tipo:
```
https://egro-api.vercel.app
```
**ANOTE ESTA URL** - você precisará dela!

---

## 🎨 Passo 3: Deploy do Frontend (apps/web)

### 3.1 Criar SEGUNDO Projeto no Vercel

1. Volte para https://vercel.com/dashboard
2. Clique em **"Add New..."** → **"Project"** novamente
3. Selecione o MESMO repositório `inemaejr/EGRO`

### 3.2 Configurar Build Settings

```
Framework Preset: Vite
Root Directory: apps/web
Build Command: pnpm run build
Output Directory: dist
Install Command: pnpm install
Node.js Version: 18.x
```

### 3.3 Adicionar Variáveis de Ambiente

1. Vá para **Settings** → **Environment Variables**
2. Copie as variáveis de `VERCEL_ENV_FRONTEND.txt`
3. **IMPORTANTE**: Substitua `SEU-BACKEND-URL.vercel.app` pela URL real do backend (do Passo 2.4)

Exemplo:
```
VITE_API_URL=https://egro-api.vercel.app
VITE_SUPABASE_URL=https://pqufymtbzrhzjfowaqgt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

4. Clique em **Deploy**

### 3.4 Anotar URL do Frontend

Você receberá uma URL tipo:
```
https://egro-web.vercel.app
```

---

## 🔄 Passo 4: Atualizar CORS no Backend

1. Volte para o projeto do BACKEND no Vercel
2. Vá em **Settings** → **Environment Variables**
3. Edite a variável **FRONTEND_URL**
4. Coloque a URL do frontend:
   ```
   FRONTEND_URL=https://egro-web.vercel.app
   ```
5. Clique em **Save**
6. Vá para **Deployments** → clique nos 3 pontos do último deploy → **Redeploy**

---

## ✅ Passo 5: Verificar Funcionamento

### Backend:
```
https://egro-api.vercel.app/health
```
Deve retornar algo como:
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

### Frontend:
```
https://egro-web.vercel.app
```
Deve carregar a aplicação React

---

## 🔧 Troubleshooting

### Erro: "Cannot find module '@ejr/shared-types'"

**Solução**: Verifique se o `pnpm-workspace.yaml` está na raiz do projeto.

### Erro de TypeScript durante build

**Solução**: Os erros que corrigimos já devem ter resolvido isso. Se ainda houver problemas, rode localmente:
```bash
cd apps/api
npx tsc --noEmit
```

### CORS Error no Frontend

**Solução**: Verifique se a variável `FRONTEND_URL` no backend está correta.

### Database Connection Error

**Solução**: Verifique se o `DATABASE_URL` está correto e se o Supabase está acessível.

---

## 📊 Estrutura Final

```
Vercel Dashboard:
├── Projeto 1: egro-api (Backend)
│   ├── URL: https://egro-api.vercel.app
│   ├── Root Directory: apps/api
│   └── Environment Variables: 10 variáveis
│
└── Projeto 2: egro-web (Frontend)
    ├── URL: https://egro-web.vercel.app
    ├── Root Directory: apps/web
    └── Environment Variables: 3 variáveis
```

---

## 🎯 Próximos Passos

1. Configure domínio customizado (opcional)
2. Configure SSL/HTTPS (automático no Vercel)
3. Configure alertas e monitoramento
4. Configure CI/CD para deploys automáticos no push

---

## ⚠️ Segurança IMPORTANTE

Antes de ir para produção:

1. **Gere novo JWT_SECRET**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Revise permissões do Supabase**

3. **Configure Rate Limiting**

4. **Habilite HTTPS Only**

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no Vercel Dashboard
2. Teste localmente primeiro
3. Verifique as variáveis de ambiente

Bom deploy! 🚀
