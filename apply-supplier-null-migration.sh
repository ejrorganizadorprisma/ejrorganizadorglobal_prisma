#!/bin/bash

echo "🔧 Aplicando migration: Allow NULL supplier_id in purchase_orders"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Execute este SQL no painel do Supabase (SQL Editor):"
echo ""
cat apps/api/migrations/011_allow_null_supplier_in_purchase_orders.sql
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Passos:"
echo "1. Acesse https://supabase.com/dashboard"
echo "2. Selecione seu projeto"
echo "3. Vá em 'SQL Editor'"
echo "4. Cole o SQL acima"
echo "5. Clique em 'Run'"
echo ""
