const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pqufymtbzrhzjfowaqgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdWZ5bXRienJoempmb3dhcWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI2MDE3NywiZXhwIjoyMDc4NjIwMTc3fQ.ezqCii2DX0HV2ADLVOwl_iHj_Gfg7RpGjWLAioVWaVs'
);

async function runMigration() {
  console.log('Por favor, execute o seguinte SQL no Supabase Dashboard:');
  console.log('');
  console.log('ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS name TEXT;');
  console.log('ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS purchase_request_id TEXT REFERENCES purchase_requests(id) ON DELETE SET NULL;');
  console.log('');
}

runMigration();
