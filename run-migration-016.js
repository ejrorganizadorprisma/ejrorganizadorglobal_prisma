// Migration 016: Disable batch trigger
// Execute this SQL in Supabase Dashboard SQL Editor

console.log('='.repeat(60));
console.log('MIGRATION 016: Disable Batch Trigger');
console.log('='.repeat(60));
console.log('');
console.log('Execute o seguinte SQL no Supabase Dashboard SQL Editor:');
console.log('');
console.log('-- Desabilitar o trigger que causa conflito');
console.log('DROP TRIGGER IF EXISTS trigger_create_batch_units ON production_batches;');
console.log('');
console.log('='.repeat(60));
console.log('Após executar, a liberação de lotes funcionará corretamente.');
console.log('='.repeat(60));
