const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Usar a URL do banco diretamente
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ejr_organizer';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando migration 023...');

    // Ler e executar a migration
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'apps/api/migrations/023_add_currency_to_prices.sql'),
      'utf8'
    );

    await client.query(migrationSQL);
    console.log('✅ Migration 023 executada com sucesso!');

    // Obter a moeda padrão do sistema
    const systemSettingsResult = await client.query(
      'SELECT default_currency FROM system_settings LIMIT 1'
    );

    const defaultCurrency = systemSettingsResult.rows[0]?.default_currency || 'BRL';
    console.log(`💱 Moeda padrão do sistema: ${defaultCurrency}`);

    // Atualizar todos os produtos existentes com a moeda padrão
    const updateResult = await client.query(
      `UPDATE products
       SET cost_price_currency = $1,
           sale_price_currency = $1,
           wholesale_price_currency = $1
       WHERE cost_price_currency IS NULL
          OR sale_price_currency IS NULL
          OR wholesale_price_currency IS NULL`,
      [defaultCurrency]
    );

    console.log(`✅ ${updateResult.rowCount} produtos atualizados com moeda ${defaultCurrency}`);
    console.log('🎉 Migration completada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
