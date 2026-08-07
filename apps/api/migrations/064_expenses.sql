-- 064: despesas avulsas (Contas a Pagar que não vêm de compra)
--
-- Até aqui, Contas a Pagar só existia se houvesse um Orçamento de Compra.
-- Aluguel, salário, imposto, energia, frete e contador não tinham onde ser
-- lançados — ficavam fora do caixa, do calendário e das projeções.
--
-- Valores ficam na MOEDA BASE do sistema (mesma unidade de sale_payments),
-- diferente das parcelas de compra, que são centavos de BRL convertidos na
-- leitura. Aqui não há câmbio: a despesa é lançada na moeda em que se paga.

CREATE TABLE IF NOT EXISTS expenses (
  id               text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  expense_number   varchar(20) NOT NULL UNIQUE,
  description      text NOT NULL,
  category         text NOT NULL,
  supplier_id      text REFERENCES suppliers(id) ON DELETE SET NULL,
  total_amount     bigint NOT NULL CHECK (total_amount > 0),
  issue_date       date NOT NULL DEFAULT CURRENT_DATE,
  notes            text,
  document_number  text,

  -- Recorrência: gera a próxima despesa automaticamente ao quitar a última parcela
  recurrence       text NOT NULL DEFAULT 'NONE',
  recurrence_day   int,
  recurrence_until date,
  recurrence_parent_id text REFERENCES expenses(id) ON DELETE SET NULL,

  status           text NOT NULL DEFAULT 'OPEN',
  created_by       text REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT expenses_category_check CHECK (category IN (
    'RENT', 'PAYROLL', 'TAX', 'UTILITIES', 'FREIGHT', 'SERVICES',
    'MAINTENANCE', 'MARKETING', 'FEES', 'OTHER'
  )),
  CONSTRAINT expenses_recurrence_check CHECK (recurrence IN ('NONE', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
  CONSTRAINT expenses_status_check CHECK (status IN ('OPEN', 'PAID', 'CANCELLED'))
);

-- Uma linha por vencimento — é o que aparece em Contas a Pagar
CREATE TABLE IF NOT EXISTS expense_installments (
  id                 text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  expense_id         text NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  installment_number int NOT NULL,
  amount             bigint NOT NULL CHECK (amount > 0),
  due_date           date NOT NULL,
  paid_date          date,
  status             text NOT NULL DEFAULT 'PENDING',
  payment_method     text,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT expense_installments_status_check CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
  CONSTRAINT expense_installments_unique UNIQUE (expense_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_expenses_status        ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category      ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier      ON expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expense_inst_expense   ON expense_installments(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_inst_due_date  ON expense_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_expense_inst_status    ON expense_installments(status);

COMMENT ON TABLE  expenses IS 'Despesas avulsas (aluguel, salário, imposto...) — Contas a Pagar fora do fluxo de compras';
COMMENT ON COLUMN expenses.total_amount IS 'Moeda BASE do sistema (PYG inteiro, BRL/USD centavos) — sem conversão de câmbio';
COMMENT ON COLUMN expenses.recurrence_day IS 'Dia do vencimento na repetição (1-31); ausente usa o dia da 1a parcela';
COMMENT ON COLUMN expenses.recurrence_parent_id IS 'Despesa que originou esta, quando gerada pela recorrência';
COMMENT ON TABLE  expense_installments IS 'Vencimentos da despesa — cada linha vira uma conta a pagar';
