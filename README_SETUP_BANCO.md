# 🚀 SETUP DO BANCO DE DADOS - EJR ORGANIZADOR

## 📋 INSTRUÇÕES PARA EXECUTAR NO SUPABASE

### PASSO 1: Criar as Tabelas

1. **Acesse o SQL Editor do Supabase:**
   - URL: https://supabase.com/dashboard/project/pqufymtbzrhzjfowaqgt/sql/new

2. **Abra o arquivo:**
   ```
   /home/nmaldaner/projetos/estoque/PASSO_1_criar_tabelas.sql
   ```

3. **Copie TODO o conteúdo do arquivo e cole no SQL Editor**

4. **Clique em RUN** (botão verde no canto inferior direito)

5. **Aguarde a confirmação de sucesso** - você deve ver mensagens de sucesso para cada comando

---

### PASSO 2: Popular os Dados

1. **No mesmo SQL Editor do Supabase** (https://supabase.com/dashboard/project/pqufymtbzrhzjfowaqgt/sql/new)

2. **Abra o arquivo:**
   ```
   /home/nmaldaner/projetos/estoque/PASSO_2_popular_dados.sql
   ```

3. **Copie TODO o conteúdo e cole no SQL Editor**

4. **Clique em RUN**

5. **Verifique a mensagem de sucesso** mostrando:
   - 3 usuários criados
   - 4 produtos criados
   - 2 clientes criados

---

## 📊 DADOS QUE SERÃO CRIADOS:

### Usuários (para login):
- **Owner:** owner@ejr.com / admin123
- **Director:** director@ejr.com / director123
- **Manager:** manager@ejr.com / manager123

### Produtos:
- Notebook Dell Inspiron 15 (R$ 3.500,00)
- Mouse Logitech MX Master 3 (R$ 499,00)
- Teclado Mecânico Keychron K2 (R$ 650,00)
- Monitor LG 27" 4K (R$ 2.200,00)

### Clientes:
- João Silva (CPF)
- Tech Solutions LTDA (CNPJ)

---

## ✅ APÓS EXECUTAR OS 2 PASSOS:

Digite "pronto" ou "executei" para que eu possa:
1. Testar a conexão do backend
2. Iniciar o servidor (API + Frontend)
3. Validar que tudo está funcionando

---

## ⚠️ SE HOUVER ERROS:

- Se um tipo (ENUM) já existir, pode ignorar o erro
- Se uma tabela já existir, pode ignorar o erro
- Me avise sobre qualquer outro tipo de erro

---

## 📁 ARQUIVOS CRIADOS:

- ✅ `PASSO_1_criar_tabelas.sql` - Cria ENUMs, tabelas, índices e foreign keys
- ✅ `PASSO_2_popular_dados.sql` - Insere dados iniciais (users, products, customers)
- ✅ `setup_database.sql` - Backup (mesma coisa que PASSO_1)

---

**Aguardo sua confirmação para prosseguir!** 🎯
