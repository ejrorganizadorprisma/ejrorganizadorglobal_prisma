-- Migration 024: Intelligent Backup System
-- Creates tables for backup history and schedule settings

-- Backup history table
CREATE TABLE IF NOT EXISTS backup_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_size BIGINT DEFAULT 0,
  tables_count INTEGER DEFAULT 0,
  records_count INTEGER DEFAULT 0,
  backup_type VARCHAR(20) DEFAULT 'manual' CHECK (backup_type IN ('manual', 'scheduled')),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'in_progress')),
  error_message TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backup schedule settings (single row)
CREATE TABLE IF NOT EXISTS backup_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  frequency VARCHAR(20) DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  time VARCHAR(5) DEFAULT '02:00',
  day_of_week INTEGER DEFAULT 1 CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  retention_days INTEGER DEFAULT 30,
  max_backups INTEGER DEFAULT 10,
  last_backup_at TIMESTAMP WITH TIME ZONE,
  next_backup_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO backup_settings (enabled, frequency, time, retention_days, max_backups)
VALUES (false, 'daily', '02:00', 30, 10)
ON CONFLICT DO NOTHING;

-- Index for querying backup history
CREATE INDEX IF NOT EXISTS idx_backup_history_created_at ON backup_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(status);
