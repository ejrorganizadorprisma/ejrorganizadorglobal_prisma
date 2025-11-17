# Acesso à Aplicação na Rede Local

## Problemas Identificados

1. **Servidor Backend**: Estava configurado para escutar apenas na interface de loopback (127.0.0.1), impedindo o acesso de outras máquinas na rede local.

2. **Frontend API URL**: Estava configurada para usar `localhost:3000`, fazendo com que outras máquinas tentassem conectar ao seu próprio localhost ao invés do servidor.

3. **CORS**: Não estava configurado para aceitar requisições do IP da rede (192.168.1.91).

## Solução Aplicada

### 1. Configuração do Backend (apps/api/src/server.ts)

**Alteração feita**: Modificado o método `app.listen()` para escutar em todas as interfaces de rede (0.0.0.0)

```typescript
// ANTES:
app.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📝 Ambiente: ${env.NODE_ENV}`);
  logger.info(`🌐 API: http://localhost:${PORT}/api/v1`);
});

// DEPOIS:
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📝 Ambiente: ${env.NODE_ENV}`);
  logger.info(`🌐 API Local: http://localhost:${PORT}/api/v1`);
  logger.info(`🌐 API Rede: http://192.168.1.91:${PORT}/api/v1`);
});
```

### 2. Configuração do Frontend - Vite Server (apps/web/vite.config.ts)

O frontend já estava corretamente configurado:

```typescript
server: {
  host: '0.0.0.0', // Permite acesso de outras máquinas na rede
  port: 5173,
}
```

### 3. Configuração da URL da API no Frontend (apps/web/.env)

**Criado arquivo `.env`**:

```env
VITE_API_URL=http://192.168.1.91:3000/api/v1
```

Isto garante que o frontend sempre use o IP da rede para fazer requisições à API, funcionando tanto localmente quanto de outras máquinas.

### 4. Configuração do CORS no Backend (apps/api/.env e apps/api/src/app.ts)

**Atualizado `.env`** para aceitar múltiplas origens:

```env
FRONTEND_URL=http://192.168.1.91:5173,http://localhost:5173
```

**Modificado `apps/api/src/app.ts`** para processar múltiplas origens:

```typescript
// Configure CORS to accept multiple origins
const allowedOrigins = env.FRONTEND_URL.split(',').map(url => url.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
```

## Status Atual

### Servidor Backend
- ✅ Porta: 3000
- ✅ Interface: 0.0.0.0 (todas as interfaces de rede)
- ✅ URL Local: http://localhost:3000
- ✅ URL Rede: http://192.168.1.91:3000

### Servidor Frontend
- ✅ Porta: 5173
- ✅ Interface: 0.0.0.0 (todas as interfaces de rede)
- ✅ URL Local: http://localhost:5173
- ✅ URL Rede: http://192.168.1.91:5173

## Como Acessar de Outras Máquinas na Rede

### Pré-requisitos
1. As máquinas devem estar na mesma rede local (192.168.1.x)
2. Os servidores devem estar rodando (pnpm dev)

### URLs de Acesso

**Aplicação Web (Frontend):**
```
http://192.168.1.91:5173
```

**API (Backend):**
```
http://192.168.1.91:3000
```

### Testando a Conectividade

De outra máquina na rede, você pode testar:

```bash
# Testar backend
curl http://192.168.1.91:3000

# Testar frontend
curl http://192.168.1.91:5173
```

Ou simplesmente abra um navegador e acesse:
- Frontend: `http://192.168.1.91:5173`
- Backend API: `http://192.168.1.91:3000`

## Verificações de Segurança

### Firewall (UFW)
O firewall UFW está instalado, mas as portas 3000 e 5173 estão acessíveis.

**IMPORTANTE**: Se você quiser restringir o acesso, pode configurar o UFW:

```bash
# Permitir apenas acesso da rede local (mais seguro)
sudo ufw allow from 192.168.1.0/24 to any port 3000
sudo ufw allow from 192.168.1.0/24 to any port 5173

# OU permitir acesso de qualquer lugar (menos seguro)
sudo ufw allow 3000/tcp
sudo ufw allow 5173/tcp
```

## Troubleshooting

### Problema: Não consigo acessar de outra máquina

1. **Verifique se os servidores estão rodando**:
```bash
lsof -ti:3000  # Backend
lsof -ti:5173  # Frontend
```

2. **Verifique se estão escutando em 0.0.0.0**:
```bash
netstat -tuln | grep -E ':(3000|5173)'
# Deve mostrar: 0.0.0.0:3000 e 0.0.0.0:5173
```

3. **Verifique o firewall**:
```bash
sudo ufw status
```

4. **Teste localmente primeiro**:
```bash
curl http://192.168.1.91:3000
curl http://192.168.1.91:5173
```

5. **Verifique o IP da máquina**:
```bash
hostname -I
```

### Problema: CORS Error ao acessar de outra máquina

Se você encontrar erros de CORS ao acessar de outra máquina, verifique a variável de ambiente `FRONTEND_URL` no arquivo `.env` do backend:

```env
FRONTEND_URL=http://192.168.1.91:5173
```

## Notas Importantes

1. **Desenvolvimento vs Produção**: Esta configuração é para ambiente de desenvolvimento. Em produção (Vercel), não é necessário fazer essas configurações.

2. **IP Dinâmico**: O IP 192.168.1.91 pode mudar se o router reiniciar. Para evitar isso, configure um IP estático no router para esta máquina.

3. **Segurança**: Estas configurações permitem acesso à aplicação de qualquer dispositivo na rede local. Se houver dados sensíveis, considere implementar autenticação adequada.

4. **Performance**: O acesso pela rede local pode ser um pouco mais lento que o acesso localhost, mas deve ser adequado para desenvolvimento e testes.
