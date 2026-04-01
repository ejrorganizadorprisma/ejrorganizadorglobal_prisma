-- Adiciona o valor COORDINATOR ao enum UserRole
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COORDINATOR';
