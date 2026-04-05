/**
 * Script para migrar imagens de produtos do filesystem local para Supabase Storage.
 *
 * Uso: npx tsx apps/api/src/scripts/migrate-images-to-supabase.ts
 *
 * O que faz:
 * 1. Lê todos os arquivos de uploads/products/
 * 2. Faz upload de cada um para o bucket 'product-images' no Supabase
 * 3. Atualiza image_urls no banco substituindo URLs locais por URLs públicas do Supabase
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;
const BUCKET = 'product-images';
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'products');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !DATABASE_URL) {
  console.error('❌ Variáveis SUPABASE_URL, SUPABASE_SERVICE_KEY e DATABASE_URL são obrigatórias');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined,
});

function getMimeType(ext: string): string {
  const mimes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return mimes[ext.toLowerCase()] || 'application/octet-stream';
}

async function main() {
  console.log('🚀 Migração de imagens para Supabase Storage\n');

  // 1. Ler arquivos locais
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('📁 Pasta uploads/products/ não encontrada. Nada a migrar.');
    process.exit(0);
  }

  const files = fs.readdirSync(UPLOADS_DIR).filter(f => !f.startsWith('.'));
  console.log(`📁 ${files.length} arquivo(s) encontrado(s) em ${UPLOADS_DIR}\n`);

  if (files.length === 0) {
    console.log('✅ Nenhum arquivo para migrar.');
    process.exit(0);
  }

  // 2. Upload de cada arquivo para Supabase
  const urlMap: Record<string, string> = {}; // old relative URL -> new absolute URL
  let uploaded = 0;
  let skipped = 0;

  for (const filename of files) {
    const filePath = path.join(UPLOADS_DIR, filename);
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filename);
    const contentType = getMimeType(ext);

    const oldUrl = `/uploads/products/${filename}`;
    const newUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType, upsert: true });

    if (error) {
      console.error(`  ❌ ${filename}: ${error.message}`);
      skipped++;
      continue;
    }

    urlMap[oldUrl] = newUrl;
    uploaded++;
    console.log(`  ✅ ${filename} → Supabase`);
  }

  console.log(`\n📊 Upload: ${uploaded} ok, ${skipped} erro(s)\n`);

  // 3. Atualizar URLs no banco
  console.log('🔄 Atualizando URLs no banco de dados...\n');

  const { rows: products } = await pool.query<{ id: string; image_urls: string[] }>(
    `SELECT id, image_urls FROM products WHERE image_urls IS NOT NULL AND array_length(image_urls, 1) > 0`
  );

  let dbUpdated = 0;

  for (const product of products) {
    let changed = false;
    const newUrls = product.image_urls.map(url => {
      if (urlMap[url]) {
        changed = true;
        return urlMap[url];
      }
      return url;
    });

    if (changed) {
      await pool.query(
        `UPDATE products SET image_urls = $1 WHERE id = $2`,
        [newUrls, product.id]
      );
      dbUpdated++;
      console.log(`  ✅ Produto ${product.id}: ${newUrls.length} URL(s) atualizada(s)`);
    }
  }

  console.log(`\n📊 Banco: ${dbUpdated} produto(s) atualizado(s) de ${products.length} total`);
  console.log('\n✅ Migração concluída!');

  await pool.end();
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
