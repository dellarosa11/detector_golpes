import { palette } from '@/src/theme';

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validações locais que dão retorno imediato antes de enviar formulários ao Firebase. */
export function emailError(value: string): string | undefined {
  if (!value.trim()) return 'Informe seu e-mail.';
  if (!emailPattern.test(value.trim())) return 'Digite um e-mail válido, como voce@exemplo.com.';
  return undefined;
}

export type PasswordStrengthResult = {
  score: number;
  label: string;
  color: string;
};

/** Avalia a força da senha de acordo com regras de complexidade. */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  if (!password) return { score: 0, label: 'Ainda não informada', color: palette.authMuted };
  if (score <= 1) return { score, label: 'Fraca', color: palette.red };
  if (score <= 3) return { score, label: 'Média', color: palette.amber };
  return { score, label: 'Forte', color: palette.greenSuccess };
}
