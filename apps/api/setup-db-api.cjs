const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://pqufymtbzrhzjfowaqgt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdWZ5bXRienJoempmb3dhcWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIyNzQ0NSwiZXhwIjoyMDc4ODAzNDQ1fQ.3o5MhmtXGq-SGqQvnvmXyu2FDxKx309xMZoWhzVJz_g';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: 'pqufymtbzrhzjfowaqgt.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseData);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function setupDatabase() {
  try {
    console.log('📝 Lendo arquivo SQL...');
    const sqlPath = path.join(__dirname, '../../setup_database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Dividir em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`\n🔌 Executando ${commands.length} comandos SQL via API Supabase...\n`);

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      if (cmd) {
        try {
          await executeSQL(cmd);
          console.log(`  ✓ Comando ${i + 1}/${commands.length} executado`);
        } catch (error) {
          console.error(`  ✗ Erro no comando ${i + 1}:`, error.message);
        }
      }
    }

    console.log('\n✅ Processo concluído!');
    console.log('\n💡 Nota: Se houver erros, você pode executar o SQL manualmente no SQL Editor do Supabase');
    console.log('   Acesse: https://supabase.com/dashboard/project/pqufymtbzrhzjfowaqgt/sql/new');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setupDatabase();
