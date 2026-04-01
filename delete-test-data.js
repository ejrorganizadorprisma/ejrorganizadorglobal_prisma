const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:Inema2000!%2323@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres';

async function deleteTestData() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco\n');

    // 1. Contar registros antes
    console.log('📊 Verificando dados atuais...\n');

    const poCount = await client.query('SELECT COUNT(*) FROM purchase_orders');
    const prCount = await client.query('SELECT COUNT(*) FROM purchase_requests');
    const poItemsCount = await client.query('SELECT COUNT(*) FROM purchase_order_items');
    const prItemsCount = await client.query('SELECT COUNT(*) FROM purchase_request_items');
    const grCount = await client.query('SELECT COUNT(*) FROM goods_receipts');
    const grItemsCount = await client.query('SELECT COUNT(*) FROM goods_receipt_items');

    console.log(`📦 Ordens de Compra: ${poCount.rows[0].count}`);
    console.log(`📝 Requisições de Compra: ${prCount.rows[0].count}`);
    console.log(`📌 Itens de Ordens: ${poItemsCount.rows[0].count}`);
    console.log(`📌 Itens de Requisições: ${prItemsCount.rows[0].count}`);
    console.log(`📥 Recebimentos: ${grCount.rows[0].count}`);
    console.log(`📌 Itens de Recebimentos: ${grItemsCount.rows[0].count}\n`);

    // Confirmar
    console.log('⚠️  ATENÇÃO: Esta operação vai deletar TODOS os registros de:');
    console.log('   - Recebimentos de Mercadorias');
    console.log('   - Ordens de Compra');
    console.log('   - Requisições de Compra');
    console.log('   - Todos os itens relacionados\n');
    console.log('🚀 Executando em 3 segundos...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. Deletar dados (respeitando foreign keys)
    await client.query('BEGIN');

    try {
      // Deletar na ordem correta para respeitar foreign keys
      console.log('🗑️  Deletando itens de recebimentos...');
      const deletedGRItems = await client.query('DELETE FROM goods_receipt_items');
      console.log(`   ✅ ${deletedGRItems.rowCount} itens deletados\n`);

      console.log('🗑️  Deletando recebimentos...');
      const deletedGR = await client.query('DELETE FROM goods_receipts');
      console.log(`   ✅ ${deletedGR.rowCount} recebimentos deletados\n`);

      console.log('🗑️  Deletando itens de ordens de compra...');
      const deletedPOItems = await client.query('DELETE FROM purchase_order_items');
      console.log(`   ✅ ${deletedPOItems.rowCount} itens deletados\n`);

      console.log('🗑️  Deletando itens de requisições...');
      const deletedPRItems = await client.query('DELETE FROM purchase_request_items');
      console.log(`   ✅ ${deletedPRItems.rowCount} itens deletados\n`);

      console.log('🔗 Removendo referências de requisições para ordens...');
      const updatedPR = await client.query('UPDATE purchase_requests SET converted_to_purchase_order_id = NULL WHERE converted_to_purchase_order_id IS NOT NULL');
      console.log(`   ✅ ${updatedPR.rowCount} referências removidas\n`);

      console.log('🗑️  Deletando ordens de compra...');
      const deletedPO = await client.query('DELETE FROM purchase_orders');
      console.log(`   ✅ ${deletedPO.rowCount} ordens deletadas\n`);

      console.log('🗑️  Deletando requisições de compra...');
      const deletedPR = await client.query('DELETE FROM purchase_requests');
      console.log(`   ✅ ${deletedPR.rowCount} requisições deletadas\n`);

      await client.query('COMMIT');
      console.log('✅ Todos os dados de teste foram deletados com sucesso!\n');

      // 3. Verificar resultado
      console.log('📊 Verificando resultado final...\n');

      const poCountAfter = await client.query('SELECT COUNT(*) FROM purchase_orders');
      const prCountAfter = await client.query('SELECT COUNT(*) FROM purchase_requests');

      console.log(`📦 Ordens de Compra restantes: ${poCountAfter.rows[0].count}`);
      console.log(`📝 Requisições restantes: ${prCountAfter.rows[0].count}\n`);

      if (poCountAfter.rows[0].count === '0' && prCountAfter.rows[0].count === '0') {
        console.log('🎉 Sucesso! Todas as ordens e requisições foram removidas!');
      }

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n❌ Erro durante a deleção:', error.message);
      console.error('   Rollback executado. Nenhuma alteração foi feita.');
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexão fechada.');
  }
}

// Executar
deleteTestData();
