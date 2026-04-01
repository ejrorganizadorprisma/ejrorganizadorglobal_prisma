const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:Inema2000!%2323@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres';

async function checkOrders() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco\n');

    // Verificar ordens de compra criadas hoje
    const result = await client.query(`
      SELECT
        id,
        order_number,
        supplier_id,
        status,
        total_amount,
        internal_notes,
        created_at
      FROM purchase_orders
      WHERE created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log('❌ Nenhuma ordem de compra criada nas últimas 24 horas');
    } else {
      console.log(`📦 ${result.rows.length} ordens de compra encontradas:\n`);
      result.rows.forEach((order, i) => {
        console.log(`${i + 1}. ${order.order_number}`);
        console.log(`   ID: ${order.id}`);
        console.log(`   Fornecedor: ${order.supplier_id || 'NULL (correto!)'}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Total: R$ ${(order.total_amount / 100).toFixed(2)}`);
        console.log(`   Criada em: ${new Date(order.created_at).toLocaleString('pt-BR')}`);
        if (order.internal_notes) {
          console.log(`   Notas: ${order.internal_notes.substring(0, 100)}...`);
        }
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkOrders();
