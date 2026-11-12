/** Formata data de histórico com 'Hoje, HH:MM' ou 'DD MMM, HH:MM' */
export function formatarDataHistorico(data: Date | null): string {
  if (!data) return 'Agora';

  const hoje = new Date();
  const ehHoje =
    data.getDate() === hoje.getDate() &&
    data.getMonth() === hoje.getMonth() &&
    data.getFullYear() === hoje.getFullYear();
  const horario = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (ehHoje) return `Hoje, ${horario}`;

  const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  return `${dia}, ${horario}`;
}

/** Remove acentos e padroniza caixa para buscas tolerantes em português */
export function normalizarBusca(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}
