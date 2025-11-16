-- ============================================
-- PASSO 3: CRIAR FUNÇÕES PARA SENHAS
-- ============================================
-- Execute este SQL no SQL Editor do Supabase
-- URL: https://supabase.com/dashboard/project/pqufymtbzrhzjfowaqgt/sql/new
-- ============================================

-- Função para criar hash de senha
CREATE OR REPLACE FUNCTION hash_password(p_password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(p_password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar senha
CREATE OR REPLACE FUNCTION verify_password(p_email TEXT, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_password_hash TEXT;
BEGIN
  -- Busca o hash da senha do usuário
  SELECT password_hash INTO v_password_hash
  FROM users
  WHERE email = p_email;

  -- Se não encontrar o usuário, retorna FALSE
  IF v_password_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verifica se a senha bate com o hash usando crypt
  RETURN (crypt(p_password, v_password_hash) = v_password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
