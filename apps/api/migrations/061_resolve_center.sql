-- Resolve — Central de Demandas / tickets (portado do EJR Hub).
-- Bug tracker interno: abrir demanda (BUG/SUGESTÃO), triagem, atribuição,
-- comentários, histórico de eventos, resolver→confirmar→fechar, mural + votos, equipe.

DO $$ BEGIN CREATE TYPE "TicketType" AS ENUM ('BUG','SUGGESTION'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "TicketStatus" AS ENUM ('NEW','TRIAGE','IN_PROGRESS','AWAITING_CONFIRMATION','RESOLVED','REOPENED','CLOSED','REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "TicketPriority" AS ENUM ('P1','P2','P3','P4'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ResolveRole" AS ENUM ('DEV','ADMIN'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Código sequencial exibido como RES-0042
CREATE SEQUENCE IF NOT EXISTS resolve_tickets_code_seq START 1;

CREATE TABLE IF NOT EXISTS resolve_team_members (
  id         text PRIMARY KEY,
  user_id    text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role       "ResolveRole" NOT NULL DEFAULT 'DEV',
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id             text PRIMARY KEY,
  code           integer NOT NULL UNIQUE DEFAULT nextval('resolve_tickets_code_seq'),
  type           "TicketType" NOT NULL,
  title          text NOT NULL,
  description    text NOT NULL,
  url            text,
  platform       text NOT NULL,
  severity       text,
  priority       "TicketPriority",
  status         "TicketStatus" NOT NULL DEFAULT 'NEW',
  reporter_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignee_id    text REFERENCES users(id) ON DELETE SET NULL,
  resolved_by_id text REFERENCES users(id) ON DELETE SET NULL,
  resolved_at    timestamptz,
  confirmed_at   timestamptz,
  closed_at      timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tickets_reporter_status ON tickets(reporter_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_status ON tickets(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_type_status ON tickets(type, status);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id         text PRIMARY KEY,
  ticket_id  text NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       text NOT NULL,
  internal   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id, created_at);

CREATE TABLE IF NOT EXISTS ticket_events (
  id         text PRIMARY KEY,
  ticket_id  text NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id   text REFERENCES users(id) ON DELETE SET NULL,
  action     text NOT NULL,
  from_value text,
  to_value   text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket ON ticket_events(ticket_id, created_at);

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id          text PRIMARY KEY,
  ticket_id   text NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url  text NOT NULL,
  mime_type   text NOT NULL,
  size        integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket ON ticket_attachments(ticket_id);

CREATE TABLE IF NOT EXISTS ticket_votes (
  ticket_id  text NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, user_id)
);
