-- Adicionar o valor PRODUCTION ao enum UserRole

-- Verificar se o tipo existe e adicionar o novo valor
DO $$
BEGIN
    -- Adicionar PRODUCTION ao enum se ainda não existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'PRODUCTION'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
    ) THEN
        ALTER TYPE "UserRole" ADD VALUE 'PRODUCTION';
        RAISE NOTICE 'Valor PRODUCTION adicionado ao enum UserRole';
    ELSE
        RAISE NOTICE 'Valor PRODUCTION já existe no enum UserRole';
    END IF;
END $$;
