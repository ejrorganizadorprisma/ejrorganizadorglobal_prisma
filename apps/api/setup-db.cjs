const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:inemaejr2024$@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres'
      }
    }
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    await prisma.$connect();
    console.log('✅ Conectado com sucesso!');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '../../setup_database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Dividir em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Executando ${commands.length} comandos SQL...`);

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      if (cmd) {
        try {
          await prisma.$executeRawUnsafe(cmd);
          console.log(`  ✓ Comando ${i + 1}/${commands.length} executado`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`  ⚠ Comando ${i + 1}/${commands.length} - objeto já existe`);
          } else {
            console.error(`  ✗ Erro no comando ${i + 1}:`, error.message);
          }
        }
      }
    }

    console.log('\n✅ Tabelas criadas com sucesso!');
    console.log('\n🎉 Banco de dados configurado!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase();
