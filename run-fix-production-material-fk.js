const fs = require('fs');
const https = require('https');

const supabaseUrl = 'https://iwmksgdjblluotkwqjlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3bWtzZ2RqYmxsdW90a3dxamxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjU0MDY0MiwiZXhwIjoyMDQ4MTE2NjQyfQ.tW31_TtzNcG7TiWE71kLqA5-Sw9ySf5Uv0xNOCIwB_w';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: 'iwmksgdjblluotkwqjlp.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: body });
        } else {
          reject({ success: false, status: res.statusCode, error: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function runSQL() {
  try {
    const sql = fs.readFileSync('fix-production-material-fk.sql', 'utf8');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`Executando ${statements.length} statements...`);

    for (const statement of statements) {
      if (!statement) continue;

      console.log('\n📝 Executando:', statement.substring(0, 100) + '...');

      try {
        await executeSQL(statement);
        console.log('✅ Sucesso');
      } catch (error) {
        console.error('❌ Erro:', error);

        // Se o erro for que a constraint já existe, continuar
        if (error.error && error.error.includes('already exists')) {
          console.log('⚠️  Constraint já existe, continuando...');
          continue;
        }

        throw error;
      }
    }

    console.log('\n✅ Todas as constraints foram adicionadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar SQL:', error);
    process.exit(1);
  }
}

runSQL();
