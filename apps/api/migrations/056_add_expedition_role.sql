-- Adiciona o valor EXPEDITION ao enum UserRole (papel Expedidor).
-- Sem isso, criar/salvar um usuário com role EXPEDITION falha no banco
-- ("invalid input value for enum UserRole"), tornando o papel inutilizável
-- mesmo com toda a UI/rotas já preparadas para ele.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'EXPEDITION';
