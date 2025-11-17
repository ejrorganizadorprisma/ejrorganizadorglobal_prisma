#!/bin/bash

# Script para testar criação de ordem de compra

echo "Testando criação de ordem de compra..."

# Usar um dos IDs válidos do banco
SUPPLIER_ID="867292ef-d158-4cfb-b3b7-24ae895ebfe3"  # Jair Passo Fundo

# Buscar um produto para testar
PRODUCT_ID=$(curl -s "http://localhost:3000/api/v1/products?limit=1" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') and len(data['data']) > 0 else '')")

if [ -z "$PRODUCT_ID" ]; then
  echo "Erro: Nenhum produto encontrado no banco de dados"
  exit 1
fi

echo "Usando fornecedor: $SUPPLIER_ID"
echo "Usando produto: $PRODUCT_ID"

# Criar ordem de compra
curl -X POST "http://localhost:3000/api/v1/purchase-orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"supplierId\": \"$SUPPLIER_ID\",
    \"expectedDeliveryDate\": \"2025-11-20\",
    \"paymentTerms\": \"30 dias\",
    \"notes\": \"Teste de ordem\",
    \"shippingCost\": 1000,
    \"discountAmount\": 0,
    \"subtotal\": 10000,
    \"totalAmount\": 11000,
    \"items\": [
      {
        \"productId\": \"$PRODUCT_ID\",
        \"quantity\": 10,
        \"unitPrice\": 1000,
        \"totalPrice\": 10000
      }
    ]
  }" | python3 -m json.tool

echo ""
echo "Teste concluído!"
