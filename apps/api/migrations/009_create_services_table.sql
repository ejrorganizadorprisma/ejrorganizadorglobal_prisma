-- Migration 009: Create services table
-- Creates a catalog of services that can be used in quotes

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  default_price INTEGER NOT NULL DEFAULT 0, -- em centavos
  unit VARCHAR(20) DEFAULT 'HORA', -- HORA, DIA, SERVICO, etc
  duration_minutes INTEGER, -- duração estimada em minutos
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_services_code ON services(code);
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

-- Comentários
COMMENT ON TABLE services IS 'Catálogo de serviços (aulas, palestras, consultorias, etc)';
COMMENT ON COLUMN services.code IS 'Código único do serviço (ex: AULA-001, PALESTRA-002)';
COMMENT ON COLUMN services.name IS 'Nome do serviço';
COMMENT ON COLUMN services.description IS 'Descrição detalhada do serviço';
COMMENT ON COLUMN services.category IS 'Categoria do serviço (Educação, Consultoria, etc)';
COMMENT ON COLUMN services.default_price IS 'Preço padrão em centavos';
COMMENT ON COLUMN services.unit IS 'Unidade de cobrança (HORA, DIA, SERVICO)';
COMMENT ON COLUMN services.duration_minutes IS 'Duração estimada em minutos';

-- Trigger para updated_at
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Dados de exemplo (opcional - pode remover se não quiser)
INSERT INTO services (id, code, name, description, category, default_price, unit, duration_minutes) VALUES
  ('serv-001', 'AULA-PROG-001', 'Aula de Programação', 'Aula particular de programação (Python, JavaScript, Java)', 'Educação', 15000, 'HORA', 60),
  ('serv-002', 'PALESTRA-IA', 'Palestra sobre IA', 'Palestra introdutória sobre Inteligência Artificial', 'Educação', 50000, 'SERVICO', 120),
  ('serv-003', 'CONSULT-TI', 'Consultoria em TI', 'Consultoria técnica em infraestrutura e desenvolvimento', 'Consultoria', 20000, 'HORA', 60)
ON CONFLICT (code) DO NOTHING;
