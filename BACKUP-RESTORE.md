# Sistema de Backup e Restore - EJR Organizador

Este documento explica como usar os scripts de backup e restore do banco de dados.

## Scripts Disponíveis

### 1. `backup-database-v2.js` - Criar Backup Completo

Cria um backup completo do banco de dados incluindo:
- ENUMs (com criação condicional)
- Estrutura das tabelas (ALTER TABLE para adicionar colunas faltantes)
- Todos os dados

**Uso:**
```bash
node backup-database-v2.js
```

O backup será salvo em `backups/backup-complete-TIMESTAMP.sql`

---

### 2. `restore-backup.js` - Restaurar Backup

Restaura um backup **SEM apagar** os dados existentes. Usa `ON CONFLICT DO NOTHING` para evitar duplicatas.

**IMPORTANTE:** Este script agora prepara automaticamente o schema antes de restaurar, adicionando:
- Colunas faltantes na tabela `products` (space_id, shelf_id, section_id, preferred_supplier_id, reserved_stock)
- Valores faltantes no enum `UserRole` (COORDINATOR)

**Uso:**
```bash
node restore-backup.js backups/backup-complete-2025-11-29.sql
```

**O que acontece:**
1. Prepara o schema do banco (adiciona colunas e enums faltantes automaticamente)
2. Conecta ao banco de dados
3. Lê o arquivo de backup
4. Executa os comandos SQL
5. Ignora registros duplicados (ON CONFLICT DO NOTHING)
6. Mostra estatísticas ao final

---

### 3. `restore-clean.js` - Restore Limpo (Apaga Tudo)

**⚠️ ATENÇÃO:** Este script **APAGA TODOS OS DADOS** antes de restaurar!

Útil quando você quer voltar o banco para um estado específico do backup.

**Uso:**
```bash
node restore-clean.js backups/backup-complete-2025-11-29.sql
```

**O que acontece:**
1. Prepara o schema do banco (adiciona colunas e enums faltantes automaticamente)
2. Aguarda 3 segundos (tempo para cancelar com Ctrl+C)
3. Deleta TODOS os dados do banco (respeitando foreign keys)
4. Chama o `restore-backup.js` para restaurar o backup

---

### 4. `prepare-schema.js` - Preparar Schema

Prepara o banco de dados adicionando colunas e valores de enum que podem estar faltando.

Este script é chamado automaticamente pelos scripts de restore, mas pode ser executado manualmente se necessário.

**Uso:**
```bash
node prepare-schema.js
```

**O que faz:**
- Adiciona valores ao enum `UserRole`: OWNER, DIRECTOR, MANAGER, COORDINATOR, SALESPERSON, STOCK, TECHNICIAN
- Adiciona colunas à tabela `products`:
  - `space_id` (UUID)
  - `shelf_id` (UUID)
  - `section_id` (UUID)
  - `preferred_supplier_id` (UUID)
  - `reserved_stock` (INTEGER DEFAULT 0)

---

## Exemplos de Uso

### Criar um backup antes de fazer mudanças importantes
```bash
node backup-database-v2.js
```

### Restaurar um backup sem apagar dados existentes
```bash
node restore-backup.js backups/backup-complete-2025-11-29T14-13-51-507Z.sql
```

### Voltar o banco para um estado anterior (apaga tudo)
```bash
node restore-clean.js backups/backup-complete-2025-11-29T14-13-51-507Z.sql
```

### Preparar o banco antes de um restore manual
```bash
node prepare-schema.js
```

---

## Estrutura dos Backups

Os backups contêm três seções:

### 1. ENUMs
```sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('OWNER', 'DIRECTOR', ...);
  END IF;
END $$;
```

### 2. Estrutura das Tabelas (Colunas)
```sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'space_id'
  ) THEN
    ALTER TABLE "products" ADD COLUMN "space_id" uuid;
  END IF;
END $$;
```

### 3. Dados
```sql
INSERT INTO "products" (...) VALUES (...) ON CONFLICT DO NOTHING;
```

---

## Compatibilidade com Mudanças Futuras

O sistema foi projetado para ser **compatível com mudanças futuras** no schema:

1. **Backups incluem schema**: Os backups contêm comandos para criar ENUMs e adicionar colunas se não existirem

2. **Restore prepara o banco**: Os scripts de restore automaticamente adicionam colunas e enums faltantes antes de inserir dados

3. **ON CONFLICT DO NOTHING**: Evita erros com registros duplicados

4. **Verificações condicionais**: Todos os comandos verificam se ENUMs/colunas existem antes de criar

Isso significa que você pode:
- Restaurar backups antigos em schemas novos (colunas extras serão NULL)
- Restaurar backups novos em schemas antigos (colunas faltantes serão adicionadas)
- Executar o mesmo backup múltiplas vezes sem erros

---

## Logs e Estatísticas

Ao final do restore, você verá:

```
============================================================
✅ Restore concluído!

📊 Estatísticas:
   ✓ Registros inseridos: 72
   ⊘ Registros pulados (duplicados/incompatíveis): 2
   ✗ Erros: 0
============================================================
```

- **Registros inseridos**: Quantos INSERTs foram executados com sucesso
- **Registros pulados**: Quantos foram ignorados (duplicados ou estrutura incompatível)
- **Erros**: Quantos erros ocorreram durante o processo

---

## Troubleshooting

### Erro: "column does not exist"
**Solução:** Execute `node prepare-schema.js` antes do restore

### Erro: "invalid input value for enum"
**Solução:** Execute `node prepare-schema.js` para adicionar valores faltantes ao enum

### Backup muito grande
**Solução:** Os backups podem crescer. Considere fazer backups periódicos e manter apenas os mais recentes

### Restore lento
**Solução:** Normal para backups grandes. Aguarde a conclusão ou considere restaurar apenas tabelas específicas
