/** Nomes de todas as telas da navegação interna (estado em memória). */
export type NomeTela =
  | 'entrada'
  | 'cadastro'
  | 'inicio'
  | 'analise'
  | 'processamento'
  | 'resultado'
  | 'historico'
  | 'aprender'
  | 'conta';

/** Função de navegação tipada passada como prop para cada tela. */
export type Navegar = (tela: NomeTela) => void;
