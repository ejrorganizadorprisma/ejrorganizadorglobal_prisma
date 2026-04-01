#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://postgres:Inema2000!%2323@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres';

async function syncPermissions() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');

    console.log('📝 Lendo permissões do arquivo...');
    const permissionsPath = path.join(__dirname, 'apps/api/data/permissions.json');
    const permissions = JSON.parse(fs.readFileSync(permissionsPath, 'utf8'));

    console.log('🔄 Atualizando permissões no banco de dados...\n');

    // Atualizar as permissões
    const { data, error } = await client.query(
      `UPDATE app_config SET value = $1::jsonb WHERE key = 'permissions'`,
      [JSON.stringify(permissions)]
    );

    if (error) {
      throw error;
    }

    console.log('✅ Permissões sincronizadas com sucesso!\n');

    // Verificar as permissões do MANAGER
    const result = await client.query(
      `SELECT value FROM app_config WHERE key = 'permissions'`
    );

    if (result.rows.length > 0) {
      const currentPermissions = result.rows[0].value;
      const managerPerms = currentPermissions.permissions.find(p => p.role === 'MANAGER');

      console.log('📊 Permissões do MANAGER (Admin TI):');
      console.log('Páginas:', managerPerms.pages);
      console.log('\n✅ Verificação: "users" está nas permissões do MANAGER?', managerPerms.pages.includes('users') ? 'SIM (❌ PROBLEMA!)' : 'NÃO (✅ CORRETO)');
    }

  } catch (error) {
    console.error('\n❌ Erro ao sincronizar permissões:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

syncPermissions();
