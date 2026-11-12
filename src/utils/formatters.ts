/** Formata data de histórico com 'Hoje, HH:MM' ou 'DD MMM, HH:MM' */
export function formatHistoryDate(date: Date | null): string {
  if (!date) return 'Agora';

  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Hoje, ${time}`;

  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  return `${day}, ${time}`;
}

/** Remove acentos e padroniza caixa para buscas tolerantes em português */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}
