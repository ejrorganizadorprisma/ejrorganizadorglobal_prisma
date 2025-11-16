#!/bin/bash

echo "🚀 Executando setup do banco de dados..."
echo ""

# Variáveis
DB_URL="postgresql://postgres:inemaejr2024\$@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres"
PASSO1="/home/nmaldaner/projetos/estoque/PASSO_1_criar_tabelas.sql"
PASSO2="/home/nmaldaner/projetos/estoque/PASSO_2_popular_dados.sql"

# Verificar se os arquivos existem
if [ ! -f "$PASSO1" ]; then
    echo "❌ Arquivo PASSO_1 não encontrado!"
    exit 1
fi

if [ ! -f "$PASSO2" ]; then
    echo "❌ Arquivo PASSO_2 não encontrado!"
    exit 1
fi

# Tentar instalar psql se não existir
if ! command -v psql &> /dev/null; then
    echo "📦 psql não encontrado. Tentando instalar..."
    sudo apt-get update -qq && sudo apt-get install -y postgresql-client 2>/dev/null || {
        echo "⚠️  Não foi possível instalar psql automaticamente"
        echo "💡 Por favor, execute os arquivos SQL manualmente no Supabase:"
        echo "   1. Acesse: https://supabase.com/dashboard/project/pqufymtbzrhzjfowaqgt/sql/new"
        echo "   2. Execute: $PASSO1"
        echo "   3. Execute: $PASSO2"
        exit 1
    }
fi

echo "📝 Executando PASSO 1: Criar tabelas..."
psql "$DB_URL" -f "$PASSO1" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ PASSO 1 concluído!"
else
    echo "⚠️  PASSO 1 teve erros (pode ser normal se tabelas já existem)"
fi

echo ""
echo "📝 Executando PASSO 2: Popular dados..."
psql "$DB_URL" -f "$PASSO2" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ PASSO 2 concluído!"
else
    echo "⚠️  PASSO 2 teve erros"
fi

echo ""
echo "🎉 Setup finalizado!"
echo ""
echo "🔐 Credenciais de acesso:"
echo "   - Owner: owner@ejr.com / admin123"
echo "   - Director: director@ejr.com / director123"
echo "   - Manager: manager@ejr.com / manager123"
