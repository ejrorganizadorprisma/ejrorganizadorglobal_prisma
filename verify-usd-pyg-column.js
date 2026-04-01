const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkColumn() {
  try {
    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'system_settings' 
      AND column_name LIKE '%exchange%'
      ORDER BY column_name
    `);
    
    console.log('✅ Exchange rate columns in system_settings table:');
    console.table(result.rows);
    
    const hasUsdPyg = result.rows.some(row => row.column_name === 'exchange_rate_usd_to_pyg');
    
    if (hasUsdPyg) {
      console.log('\n✅ SUCCESS: exchange_rate_usd_to_pyg column exists!');
      
      // Get current value
      const settingsResult = await pool.query('SELECT * FROM system_settings LIMIT 1');
      if (settingsResult.rows.length > 0) {
        const settings = settingsResult.rows[0];
        console.log('\n📊 Current exchange rates:');
        console.log(`  BRL → USD: ${settings.exchange_rate_brl_to_usd}`);
        console.log(`  BRL → PYG: ${settings.exchange_rate_brl_to_pyg}`);
        console.log(`  USD → PYG: ${settings.exchange_rate_usd_to_pyg}`);
      }
    } else {
      console.log('\n❌ ERROR: exchange_rate_usd_to_pyg column NOT found!');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkColumn();
