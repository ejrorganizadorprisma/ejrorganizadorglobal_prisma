import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const pool = new Pool({
  connectionString: 'postgresql://ejr_user:ejr_local_2025@localhost:5432/ejr_organizador_dev',
});

const users = [
  {
    email: 'admin@ejr.com',
    password: 'admin123',
    name: 'Administrador',
    role: 'OWNER',
  },
  {
    email: 'owner@ejr.com',
    password: 'admin123',
    name: 'Owner',
    role: 'OWNER',
  },
  {
    email: 'director@ejr.com',
    password: 'director123',
    name: 'Diretor',
    role: 'DIRECTOR',
  },
  {
    email: 'manager@ejr.com',
    password: 'manager123',
    name: 'Gerente',
    role: 'MANAGER',
  },
  {
    email: 'salesperson@ejr.com',
    password: 'sales123',
    name: 'Vendedor',
    role: 'SALESPERSON',
  },
  {
    email: 'stock@ejr.com',
    password: 'stock123',
    name: 'Estoquista',
    role: 'STOCK',
  },
  {
    email: 'technician@ejr.com',
    password: 'tech123',
    name: 'Técnico',
    role: 'TECHNICIAN',
  },
];

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados local...');

  try {
    // Verifica conexão
    await pool.query('SELECT NOW()');
    console.log('✅ Conectado ao banco de dados');

    // Limpa usuários existentes (opcional)
    await pool.query('DELETE FROM users');
    console.log('🗑️  Usuários anteriores removidos');

    // Insere novos usuários
    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      const userId = randomUUID();

      await pool.query(
        `INSERT INTO users (id, email, password_hash, name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, user.email, passwordHash, user.name, user.role, true]
      );

      console.log(`✅ Usuário criado: ${user.email} (${user.role})`);
    }

    console.log('');
    console.log('🎉 Seed concluído com sucesso!');
    console.log('');
    console.log('📋 Credenciais de acesso:');
    users.forEach(u => {
      console.log(`   ${u.email} / ${u.password} (${u.role})`);
    });

  } catch (error) {
    console.error('❌ Erro ao fazer seed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
