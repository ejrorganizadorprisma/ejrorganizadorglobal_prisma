// Presets e cores do status de logística do pedido.
// As cores são escolhidas para NÃO conflitar com as do status do pedido
// (amarelo=Pendente, azul=Enviado, verde=Confirmado, laranja=Parcial,
// esmeralda=Recebido, vermelho/cinza=Cancelado). Aqui usamos cyan, violeta,
// fúcsia e índigo — todas distintas das acima.

export const LOGISTICS_PRESETS = [
  'Em trânsito',
  'Foz do Iguaçu (Exportadora)',
  'Despachada para PY',
];

export interface LogisticsStyle {
  key: string;
  label: string; // rótulo curto p/ chip na lista
  chip: string; // classes de chip (bg + texto)
  dot: string; // cor do ponto (bg)
  text: string; // cor do texto/ícone de destaque
}

// Mapeia uma localidade (texto livre) para um estilo de cor coerente.
// Casamento tolerante (case-insensitive / por palavra-chave) p/ aceitar edições.
export function logisticsStyle(location?: string | null): LogisticsStyle | null {
  if (!location) return null;
  const s = location.toLowerCase();

  if (s.includes('trânsito') || s.includes('transito')) {
    return { key: 'transito', label: 'Em trânsito', chip: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500', text: 'text-cyan-600' };
  }
  if (s.includes('foz')) {
    return { key: 'foz', label: 'Foz do Iguaçu', chip: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500', text: 'text-violet-600' };
  }
  if (s.includes('despach') || /\bpy\b/.test(s) || s.includes('paraguai') || s.includes('paraguay')) {
    return { key: 'py', label: 'Despachada p/ PY', chip: 'bg-fuchsia-100 text-fuchsia-700', dot: 'bg-fuchsia-500', text: 'text-fuchsia-600' };
  }
  // Localidade personalizada (digitada): cor neutra de logística
  return { key: 'custom', label: location, chip: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500', text: 'text-indigo-600' };
}
