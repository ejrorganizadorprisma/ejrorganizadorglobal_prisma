# Troubleshooting - EJR Organizador

Guia de resolução de problemas comuns do projeto.

---

## Frontend não exibe dados do banco de dados

**Sintomas:**
- Frontend carrega mas não mostra dados
- API está funcionando e retornando dados corretamente
- Requisições aparecem nos logs do servidor

**Causas e Soluções:**

### 1. Arquivo .env do frontend com nome incorreto

**Problema:** O Vite só carrega arquivos `.env` (com ponto no início), não `env`.

**Solução:**
```bash
# Renomear o arquivo
mv apps/web/env apps/web/.env

# Reiniciar servidores
pnpm dev
```

**Como identificar:**
- Variável `import.meta.env.VITE_API_URL` retorna `undefined`
- Frontend não consegue conectar à API

---

### 2. Configuração incorreta do CORS

**Problema:** A variável `FRONTEND_URL` no backend está como string com vírgulas, mas o CORS precisa de um array.

**Arquivo:** `apps/api/src/config/env.ts`

**Solução:**
```typescript
// ❌ ERRADO - String com vírgulas
FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

// ✅ CORRETO - Converte para array
FRONTEND_URL: process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'],
```

**Como identificar:**
- Erros de CORS no console do navegador
- API responde mas navegador bloqueia a resposta
- Headers `Access-Control-Allow-Origin` incorretos

---

### 3. Variáveis de ambiente não carregadas após mudanças

**Problema:** Mudanças em arquivos `.env` não são aplicadas automaticamente.

**Solução:**
```bash
# 1. Reiniciar servidores (backend recarrega automaticamente com tsx watch)
# Matar processo atual e reiniciar
pnpm dev

# 2. No navegador, fazer Hard Refresh
# Windows/Linux: Ctrl + Shift + R
# Mac: Cmd + Shift + R
```

---

## Configurações importantes

### Backend (.env)
```bash
# Supabase
DATABASE_URL=postgresql://postgres:SENHA@db.PROJECT.supabase.co:5432/postgres
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# CORS - Múltiplas URLs separadas por vírgula
FRONTEND_URL=http://192.168.0.134:5173,http://localhost:5173,http://192.168.0.134:5174,http://localhost:5174
```

### Frontend (.env)
```bash
# API URL
VITE_API_URL=http://localhost:3000/api/v1

# Supabase (se necessário)
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

---

## Comandos úteis para debug

### Testar conexão com API
```bash
# Testar endpoint de produtos
curl http://localhost:3000/api/v1/products

# Testar com headers CORS
curl -H "Origin: http://localhost:5174" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:3000/api/v1/products
```

### Verificar processos nas portas
```bash
# Ver o que está usando a porta 3000
lsof -ti:3000

# Ver o que está usando a porta 5173/5174
lsof -ti:5173
lsof -ti:5174

# Matar processo em uma porta
kill -9 $(lsof -ti:3000)
```

### Verificar logs do servidor
```bash
# Ver logs em tempo real do background process
# (verificar ID do processo com /bashes no Claude Code)
```

---

## Checklist de verificação quando dados não aparecem

- [ ] Arquivo `apps/web/.env` existe (com ponto no início)?
- [ ] Variável `VITE_API_URL` está definida corretamente?
- [ ] Backend está rodando na porta 3000?
- [ ] Frontend está rodando (porta 5173 ou 5174)?
- [ ] CORS está configurado como array em `apps/api/src/config/env.ts`?
- [ ] API retorna dados ao testar com curl?
- [ ] Console do navegador mostra erros de CORS?
- [ ] Fez Hard Refresh no navegador após mudanças?

---

## Data da última atualização
2025-11-17
