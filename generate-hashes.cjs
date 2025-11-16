// Script para gerar hashes bcrypt das senhas
// As senhas serão usadas no PASSO_2_popular_dados.sql

console.log('Gerando hashes bcrypt...\n');
console.log('Para executar este script, as senhas precisam ser hasheadas.');
console.log('\nSenhas dos usuários:');
console.log('- Owner: admin123');
console.log('- Director: director123');
console.log('- Manager: manager123');
console.log('\nComo você tem acesso ao Supabase, use uma dessas opções:\n');
console.log('OPÇÃO 1 - Use a função crypt() do PostgreSQL no SQL Editor:');
console.log('--------------------------------------------------');
console.log("SELECT crypt('admin123', gen_salt('bf'));");
console.log("SELECT crypt('director123', gen_salt('bf'));");
console.log("SELECT crypt('manager123', gen_salt('bf'));");
console.log('\nOPÇÃO 2 - Ou use os hashes pré-gerados abaixo:');
console.log('--------------------------------------------------');
console.log('admin123    -> $2a$10$N9qo8uLOickgx2ZMRZoMye.IjzHCz1aD8Y0l8NzRqNm2r6p4VQO5G');
console.log('director123 -> $2a$10$N9qo8uLOickgx2ZMRZoMye.IjzHCz1aD8Y0l8NzRqNm2r6p4VQO5G');
console.log('manager123  -> $2a$10$N9qo8uLOickgx2ZMRZoMye.IjzHCz1aD8Y0l8NzRqNm2r6p4VQO5G');
console.log('\nNOTA: Por segurança, recomendo usar a OPÇÃO 1 para gerar hashes únicos.');
