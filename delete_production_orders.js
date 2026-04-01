const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/api/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

(async () => {
  console.log('\n🔍 Verificando ordens de produção...\n');

  // Buscar as ordens
  const { data: orders, error: fetchError } = await supabase
    .from('production_orders')
    .select('id, order_number, status, product_id')
    .in('order_number', ['OP-000001', 'OP-000002']);

  if (fetchError) {
    console.error('❌ Erro ao buscar ordens:', fetchError.message);
    process.exit(1);
  }

  if (!orders || orders.length === 0) {
    console.log('⚠️  Nenhuma ordem encontrada com os números OP-000001 ou OP-000002');
    process.exit(0);
  }

  console.log(`📋 Encontradas ${orders.length} ordem(ns):\n`);
  orders.forEach(order => {
    console.log(`   • ${order.order_number} - Status: ${order.status}`);
  });
  console.log('');

  // Verificar se podem ser excluídas
  const cannotDelete = orders.filter(o => !['DRAFT', 'CANCELLED'].includes(o.status));

  if (cannotDelete.length > 0) {
    console.log('❌ ERRO: As seguintes ordens não podem ser excluídas:\n');
    cannotDelete.forEach(order => {
      console.log(`   • ${order.order_number} (Status: ${order.status})`);
    });
    console.log('\n   ℹ️  Apenas ordens em DRAFT ou CANCELLED podem ser excluídas.');
    console.log('   💡 Use o botão "Cancelar" primeiro para ordens em outros status.\n');
    process.exit(1);
  }

  // Excluir ordens
  console.log('🗑️  Excluindo ordens...\n');

  for (const order of orders) {
    // Primeiro, excluir dados relacionados
    console.log(`   Excluindo dados relacionados de ${order.order_number}...`);

    // Excluir material consumption
    await supabase
      .from('production_order_material_consumption')
      .delete()
      .eq('production_order_id', order.id);

    // Excluir reportings
    await supabase
      .from('production_order_reportings')
      .delete()
      .eq('production_order_id', order.id);

    // Excluir operations
    await supabase
      .from('production_order_operations')
      .delete()
      .eq('production_order_id', order.id);

    // Cancelar reservas (se houver)
    await supabase
      .from('stock_reservations')
      .update({ status: 'CANCELLED' })
      .eq('reserved_for_type', 'PRODUCTION_ORDER')
      .eq('reserved_for_id', order.id)
      .eq('status', 'ACTIVE');

    // Excluir a ordem
    const { error: deleteError } = await supabase
      .from('production_orders')
      .delete()
      .eq('id', order.id);

    if (deleteError) {
      console.error(`   ❌ Erro ao excluir ${order.order_number}:`, deleteError.message);
    } else {
      console.log(`   ✅ ${order.order_number} excluída com sucesso!`);
    }
  }

  console.log('\n✨ Processo concluído!\n');
})();
