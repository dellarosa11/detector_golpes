import { paleta } from '@/src/estilos/aplicativo';

const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validações locais que dão retorno imediato antes de enviar formulários ao Firebase. */
export function validarEmail(valor: string): string | undefined {
  if (!valor.trim()) return 'Informe seu e-mail.';
  if (!formatoEmail.test(valor.trim())) return 'Digite um e-mail válido, como voce@exemplo.com.';
  return undefined;
}

export type ResultadoForcaSenha = {
  pontuacao: number;
  rotulo: string;
  cor: string;
};

/** Avalia a força da senha de acordo com regras de complexidade. */
export function avaliarForcaSenha(senha: string): ResultadoForcaSenha {
  const verificacoes = [
    senha.length >= 8,
    /[a-z]/.test(senha) && /[A-Z]/.test(senha),
    /\d/.test(senha),
    /[^A-Za-z0-9]/.test(senha),
  ];
  const pontuacao = verificacoes.filter(Boolean).length;

  if (!senha) return { pontuacao: 0, rotulo: 'Ainda não informada', cor: paleta.authMuted };
  if (pontuacao <= 1) return { pontuacao, rotulo: 'Fraca', cor: paleta.red };
  if (pontuacao <= 3) return { pontuacao, rotulo: 'Média', cor: paleta.amber };
  return { pontuacao, rotulo: 'Forte', cor: paleta.greenSuccess };
}
