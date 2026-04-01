#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATABASE_URL = 'postgresql://postgres:Inema2000!%2323@db.pqufymtbzrhzjfowaqgt.supabase.co:5432/postgres';

async function restoreBackup(backupFilePath, skipSchemaPrep = false) {
  // Prepara o schema antes de restaurar (se não for pulado)
  if (!skipSchemaPrep) {
    console.log('🔧 Preparando schema do banco...\n');
    try {
      const prepareSchemaScript = path.join(__dirname, 'prepare-schema.js');
      execSync(`node "${prepareSchemaScript}"`, {
        stdio: 'inherit',
        cwd: __dirname
      });
      console.log('');
    } catch (error) {
      console.log('⚠️  Aviso: Não foi possível preparar o schema automaticamente');
      console.log('   Continuando com o restore...\n');
    }
  }

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

    // Verifica se o arquivo existe
    const fullPath = path.isAbsolute(backupFilePath)
      ? backupFilePath
      : path.join(__dirname, backupFilePath);

    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Arquivo de backup não encontrado: ${fullPath}`);
      process.exit(1);
    }

    console.log(`📄 Lendo arquivo de backup: ${path.basename(fullPath)}`);
    const backupContent = fs.readFileSync(fullPath, 'utf8');

    // Extrai informações do cabeçalho
    const lines = backupContent.split('\n');
    const dateMatch = lines[0].match(/-- Database Backup: (.+)/);
    if (dateMatch) {
      console.log(`📅 Data do backup: ${dateMatch[1]}\n`);
    }

    // Divide em comandos SQL individuais
    const sqlStatements = backupContent
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed &&
               !trimmed.startsWith('--') &&
               trimmed.length > 0;
      })
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📊 Total de comandos SQL: ${sqlStatements.length}\n`);
    console.log('⏳ Executando restore...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    let currentTable = '';

    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];

      try {
        await client.query(statement);
        successCount++;

        // Detecta a tabela atual
        const tableMatch = statement.match(/INSERT INTO (\w+)/i);
        if (tableMatch && tableMatch[1] !== currentTable) {
          currentTable = tableMatch[1];
          console.log(`  📦 Processando tabela: ${currentTable}`);
        }

        // Mostra progresso a cada 50 comandos
        if ((i + 1) % 50 === 0) {
          console.log(`     ✓ ${i + 1}/${sqlStatements.length} comandos processados...`);
        }
      } catch (error) {
        const errorMessage = error.message;

        // Ignora erros esperados
        if (errorMessage.includes('duplicate key') ||
            errorMessage.includes('already exists') ||
            errorMessage.includes('violates unique constraint')) {
          skipCount++;
        } else if (errorMessage.includes('column') &&
                   (errorMessage.includes('does not exist') ||
                    errorMessage.includes('not found'))) {
          // Ignora erros de colunas que não existem (compatibilidade com versões diferentes)
          skipCount++;
          console.log(`     ⚠️  Pulando registro com estrutura incompatível`);
        } else {
          errorCount++;
          // Mostra apenas primeiros 150 caracteres do erro
          const shortError = errorMessage.substring(0, 150);
          console.log(`     ❌ Erro: ${shortError}${errorMessage.length > 150 ? '...' : ''}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Restore concluído!\n');
    console.log(`📊 Estatísticas:`);
    console.log(`   ✓ Registros inseridos: ${successCount}`);
    console.log(`   ⊘ Registros pulados (duplicados/incompatíveis): ${skipCount}`);
    console.log(`   ✗ Erros: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    if (errorCount > 0) {
      console.log('⚠️  Alguns erros ocorreram, mas o restore foi concluído.');
      console.log('   Os dados que puderam ser restaurados foram inseridos com sucesso.\n');
    }

  } catch (error) {
    console.error('\n❌ Erro crítico durante o restore:');
    console.error(error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexão encerrada.\n');
  }
}

// Processa argumentos da linha de comando
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         Script de Restore de Backup - EJR Organizador    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log('Uso: node restore-backup.js <caminho-do-arquivo-backup>\n');
  console.log('Exemplos:');
  console.log('  node restore-backup.js backups/backup-dados-organizador-2025-11-29T13-48-20-121Z.sql');
  console.log('  node restore-backup.js backups/backup-2025-11-28T19-06-37-075Z.sql\n');

  // Lista backups disponíveis
  const backupsDir = path.join(__dirname, 'backups');
  if (fs.existsSync(backupsDir)) {
    const backupFiles = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.sql'))
      .map(f => {
        const stats = fs.statSync(path.join(backupsDir, f));
        return {
          name: f,
          size: (stats.size / 1024).toFixed(2) + ' KB',
          date: stats.mtime
        };
      })
      .sort((a, b) => b.date - a.date);

    if (backupFiles.length > 0) {
      console.log('📦 Backups disponíveis:\n');
      backupFiles.forEach(file => {
        console.log(`   • ${file.name}`);
        console.log(`     Tamanho: ${file.size}, Data: ${file.date.toLocaleString('pt-BR')}\n`);
      });
    }
  }

  process.exit(0);
}

const backupFile = args[0];
restoreBackup(backupFile);
