import { usePagePermissions } from './usePagePermissions';
import { AccessDenied } from '../components/AccessDenied';
import type { AppPage } from '@ejr/shared-types';

interface UseRequirePermissionOptions {
  page: AppPage;
  message?: string;
}

/**
 * Hook que verifica se o usuário tem permissão para acessar uma página.
 * Se não tiver, retorna o componente AccessDenied com botão de voltar.
 *
 * @example
 * export function MyPage() {
 *   const permissionCheck = useRequirePermission({
 *     page: 'products',
 *     message: 'Você não tem permissão para acessar produtos.'
 *   });
 *
 *   if (permissionCheck) return permissionCheck;
 *
 *   // Restante do código da página...
 * }
 */
export function useRequirePermission({ page, message }: UseRequirePermissionOptions) {
  const { hasPermission, isLoading } = usePagePermissions();

  // Enquanto carrega, não mostra nada (ou poderia mostrar um loading)
  if (isLoading) {
    return null;
  }

  // Se não tem permissão, retorna o componente AccessDenied
  if (!hasPermission(page)) {
    return <AccessDenied message={message} />;
  }

  // Tem permissão, retorna null para continuar renderizando a página
  return null;
}
