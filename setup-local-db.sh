#!/bin/bash

echo "🔧 Configurando PostgreSQL local para EJR Organizador..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está rodando como root ou com sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Por favor, execute com sudo:${NC}"
    echo "   sudo bash setup-local-db.sh"
    exit 1
fi

# 1. Instalar PostgreSQL
echo -e "${BLUE}📦 Instalando PostgreSQL...${NC}"
apt update
apt install postgresql postgresql-contrib -y

# 2. Iniciar serviço
echo -e "${BLUE}🚀 Iniciando PostgreSQL...${NC}"
systemctl start postgresql
systemctl enable postgresql

# 3. Aguardar PostgreSQL iniciar
sleep 2

# 4. Criar banco de dados e usuário
echo -e "${BLUE}🗄️  Criando banco de dados e usuário...${NC}"
sudo -u postgres psql << EOF
-- Remover banco/usuário se já existir
DROP DATABASE IF EXISTS ejr_organizador_dev;
DROP USER IF EXISTS ejr_user;

-- Criar novo banco e usuário
CREATE DATABASE ejr_organizador_dev;
CREATE USER ejr_user WITH PASSWORD 'ejr_local_2025';
GRANT ALL PRIVILEGES ON DATABASE ejr_organizador_dev TO ejr_user;

-- Conectar ao banco
\c ejr_organizador_dev

-- Dar permissões completas
GRANT ALL ON SCHEMA public TO ejr_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ejr_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ejr_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ejr_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ejr_user;

\q
EOF

# 5. Verificar instalação
echo ""
echo -e "${BLUE}🔍 Verificando instalação...${NC}"
sudo -u postgres psql -c "SELECT version();" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PostgreSQL instalado com sucesso!${NC}"
    echo -e "${GREEN}✅ Banco 'ejr_organizador_dev' criado!${NC}"
    echo -e "${GREEN}✅ Usuário 'ejr_user' criado!${NC}"
    echo ""
    echo -e "${BLUE}📋 Credenciais do banco:${NC}"
    echo "   Database: ejr_organizador_dev"
    echo "   User: ejr_user"
    echo "   Password: ejr_local_2025"
    echo "   Host: localhost"
    echo "   Port: 5432"
    echo ""
    echo -e "${GREEN}✅ Configuração concluída!${NC}"
    echo -e "${BLUE}➡️  Próximo passo: Atualizar o arquivo .env${NC}"
else
    echo -e "${RED}❌ Erro ao configurar PostgreSQL${NC}"
    exit 1
fi
