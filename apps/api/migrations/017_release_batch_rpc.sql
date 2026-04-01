-- Migration: 017_release_batch_rpc
-- Description: Create RPC function to release batch without triggering create_batch_units
-- This bypasses the trigger by using session_replication_role
-- Date: 2024-12-10

-- Function to release a batch without firing triggers
-- The units are created manually by the API before calling this function
CREATE OR REPLACE FUNCTION release_batch_bypass_trigger(
  p_batch_id TEXT,
  p_user_id TEXT
)
RETURNS JSON AS $$
DECLARE
  v_batch RECORD;
  v_previous_status TEXT;
BEGIN
  -- Get current batch status
  SELECT status INTO v_previous_status
  FROM production_batches
  WHERE id = p_batch_id;

  IF v_previous_status IS NULL THEN
    RAISE EXCEPTION 'Lote não encontrado';
  END IF;

  IF v_previous_status NOT IN ('DRAFT', 'PLANNED') THEN
    RAISE EXCEPTION 'Lote deve estar em rascunho ou planejado para ser liberado';
  END IF;

  -- Temporarily disable triggers for this session
  SET session_replication_role = replica;

  -- Update batch status to RELEASED
  UPDATE production_batches
  SET
    status = 'RELEASED',
    actual_start_date = COALESCE(actual_start_date, NOW()),
    updated_at = NOW()
  WHERE id = p_batch_id;

  -- Re-enable triggers
  SET session_replication_role = DEFAULT;

  -- Add history entry
  INSERT INTO production_history (entity_type, entity_id, action, previous_value, new_value, performed_by)
  VALUES ('BATCH', p_batch_id, 'STATUS_CHANGED', v_previous_status, 'RELEASED', p_user_id);

  -- Return updated batch
  SELECT
    pb.*,
    json_build_object(
      'id', p.id,
      'code', p.code,
      'name', p.name,
      'is_assembly', p.is_assembly
    ) as product
  INTO v_batch
  FROM production_batches pb
  LEFT JOIN products p ON pb.product_id = p.id
  WHERE pb.id = p_batch_id;

  RETURN row_to_json(v_batch);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION release_batch_bypass_trigger TO authenticated;
GRANT EXECUTE ON FUNCTION release_batch_bypass_trigger TO service_role;

COMMENT ON FUNCTION release_batch_bypass_trigger IS 'Releases a production batch without firing the create_batch_units trigger. Units should be created manually before calling this function.';
