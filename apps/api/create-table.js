import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados');
  process.exit(1);
}

console.log('🚀 Criando tabela document_settings via REST API...\n');

// Use postgres connection with direct SQL
import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL não configurado');
  process.exit(1);
}

const client = new Client({ connectionString });

async function createTable() {
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL\n');

    // Create table
    console.log('📝 Criando tabela document_settings...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_settings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        profile_name VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT false,
        company_logo TEXT,
        company_name VARCHAR(255),
        footer_text TEXT,
        footer_address TEXT,
        footer_phone VARCHAR(50),
        footer_email VARCHAR(255),
        footer_website VARCHAR(255),
        signature_image TEXT,
        signature_name VARCHAR(255),
        signature_role VARCHAR(100),
        default_quote_validity_days INTEGER DEFAULT 30,
        primary_color VARCHAR(7) DEFAULT '#2563eb',
        secondary_color VARCHAR(7) DEFAULT '#1e40af',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by TEXT,
        CONSTRAINT valid_hex_color_primary CHECK (primary_color ~* '^#[0-9A-F]{6}$'),
        CONSTRAINT valid_hex_color_secondary CHECK (secondary_color ~* '^#[0-9A-F]{6}$'),
        CONSTRAINT positive_validity_days CHECK (default_quote_validity_days > 0)
      );
    `);
    console.log('✅ Tabela criada\n');

    // Create index
    console.log('📝 Criando índice...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_settings_default
      ON document_settings(is_default) WHERE is_default = true;
    `);
    console.log('✅ Índice criado\n');

    // Create function
    console.log('📝 Criando função...');
    await client.query(`
      CREATE OR REPLACE FUNCTION ensure_single_default_document_settings()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.is_default = true THEN
          UPDATE document_settings SET is_default = false
          WHERE id != NEW.id AND is_default = true;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Função criada\n');

    // Create trigger
    console.log('📝 Criando trigger...');
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_single_default_document_settings ON document_settings;
      CREATE TRIGGER trigger_single_default_document_settings
        BEFORE INSERT OR UPDATE ON document_settings
        FOR EACH ROW
        WHEN (NEW.is_default = true)
        EXECUTE FUNCTION ensure_single_default_document_settings();
    `);
    console.log('✅ Trigger criado\n');

    // Create update trigger
    console.log('📝 Criando trigger de atualização...');
    await client.query(`
      DROP TRIGGER IF EXISTS update_document_settings_updated_at ON document_settings;
      CREATE TRIGGER update_document_settings_updated_at
        BEFORE UPDATE ON document_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Trigger de atualização criado\n');

    // Insert default record
    console.log('📝 Inserindo configuração padrão...');
    await client.query(`
      INSERT INTO document_settings (
        profile_name, is_default, company_name, footer_text, signature_role,
        default_quote_validity_days, primary_color, secondary_color
      ) VALUES (
        'Configuração Padrão', true, 'EJR ORGANIZADOR', 'Obrigado pela preferência!',
        'Diretor', 30, '#2563eb', '#1e40af'
      ) ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Configuração padrão inserida\n');

    console.log('🎉 Migration concluída com sucesso!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTable();
