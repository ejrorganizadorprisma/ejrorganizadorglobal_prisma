-- Novos campos no cadastro de produto
ALTER TABLE products ADD COLUMN IF NOT EXISTS factory_code varchar(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_expiration_date date;
ALTER TABLE products ADD COLUMN IF NOT EXISTS observations text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_per_box integer DEFAULT 1;
