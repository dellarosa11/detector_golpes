import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

import { obterServicosFirebase } from './configuracao';

// Formato persistido em users/{uid}/analyses no Firestore.
export type TomAnalise = 'high' | 'medium' | 'low';

export type TipoAnalise = 'message' | 'image' | 'link';

export type AnaliseSalva = {
  id: string;
  title: string;
  message: string;
  risk: number;
  level: string;
  tone: TomAnalise;
  analysisType: TipoAnalise;
  warnings: string[];
  advice: string;
  modelVersion: string;
  createdAt: Date | null;
};

const chaveCacheHistorico = (idUsuario: string) => `@detector-golpes/analyses/v1/${idUsuario}`;

const cacheHistoricoEmMemoria = new Map<string, AnaliseSalva[]>();

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function interpretarAnaliseEmCache(valor: unknown): AnaliseSalva | null {
  if (!ehObjeto(valor)) return null;

  const criadoEm =
    typeof valor.createdAt === 'string'
      ? new Date(valor.createdAt)
      : valor.createdAt === null
        ? null
        : undefined;

  if (
    typeof valor.id !== 'string' ||
    typeof valor.title !== 'string' ||
    typeof valor.message !== 'string' ||
    typeof valor.risk !== 'number' ||
    !Number.isFinite(valor.risk) ||
    typeof valor.level !== 'string' ||
    (valor.tone !== 'high' && valor.tone !== 'medium' && valor.tone !== 'low') ||
    (valor.analysisType !== 'message' &&
      valor.analysisType !== 'image' &&
      valor.analysisType !== 'link') ||
    !Array.isArray(valor.warnings) ||
    !valor.warnings.every((alerta): alerta is string => typeof alerta === 'string') ||
    typeof valor.advice !== 'string' ||
    typeof valor.modelVersion !== 'string' ||
    (criadoEm !== null && (!(criadoEm instanceof Date) || !Number.isFinite(criadoEm.getTime())))
  ) {
    return null;
  }

  return {
    id: valor.id,
    title: valor.title,
    message: valor.message,
    risk: valor.risk,
    level: valor.level,
    tone: valor.tone,
    analysisType: valor.analysisType,
    warnings: valor.warnings,
    advice: valor.advice,
    modelVersion: valor.modelVersion,
    createdAt: criadoEm,
  };
}

export function consultarHistoricoEmMemoria(idUsuario: string): AnaliseSalva[] | null {
  return cacheHistoricoEmMemoria.get(idUsuario) ?? null;
}

export async function lerHistoricoLocal(idUsuario: string): Promise<AnaliseSalva[] | null> {
  const cacheEmMemoria = consultarHistoricoEmMemoria(idUsuario);
  if (cacheEmMemoria) return cacheEmMemoria;

  const chave = chaveCacheHistorico(idUsuario);
  const jsonEmCache = await AsyncStorage.getItem(chave);
  if (jsonEmCache === null) return null;

  let dadosInterpretados: unknown;
  try {
    dadosInterpretados = JSON.parse(jsonEmCache);
  } catch (erro) {
    if (!(erro instanceof SyntaxError)) throw erro;
    await AsyncStorage.removeItem(chave);
    return null;
  }

  if (!Array.isArray(dadosInterpretados)) {
    await AsyncStorage.removeItem(chave);
    return null;
  }

  const analisesValidas: AnaliseSalva[] = [];
  for (const registro of dadosInterpretados) {
    const analise = interpretarAnaliseEmCache(registro);
    if (!analise) {
      await AsyncStorage.removeItem(chave);
      return null;
    }
    analisesValidas.push(analise);
  }

  cacheHistoricoEmMemoria.set(idUsuario, analisesValidas);
  return analisesValidas;
}

function armazenarHistoricoLocal(idUsuario: string, analises: AnaliseSalva[]) {
  cacheHistoricoEmMemoria.set(idUsuario, analises);
  return AsyncStorage.setItem(chaveCacheHistorico(idUsuario), JSON.stringify(analises));
}

export async function salvarAnalise(
  idUsuario: string,
  analise: Omit<AnaliseSalva, 'id' | 'createdAt'>
) {
  const { banco } = obterServicosFirebase();
  // Cada usuário possui sua própria subcoleção; as regras impedem acesso cruzado.
  return addDoc(collection(banco, 'users', idUsuario, 'analyses'), {
    ...analise,
    createdAt: serverTimestamp(),
  });
}

export async function excluirAnalise(idUsuario: string, idAnalise: string) {
  const { banco } = obterServicosFirebase();
  return deleteDoc(doc(banco, 'users', idUsuario, 'analyses', idAnalise));
}

// Converte documentos recebidos em tempo real para o formato que as telas de histórico consomem.
export function acompanharHistorico(
  idUsuario: string,
  aoReceberDados: (analises: AnaliseSalva[]) => void,
  aoFalhar: (erro: Error) => void,
  aoFalharCache: (erro: Error) => void
) {
  const { banco } = obterServicosFirebase();
  // Escuta em tempo real as 30 análises mais recentes para atualizar a tela automaticamente.
  const consultaHistorico = query(
    collection(banco, 'users', idUsuario, 'analyses'),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  return onSnapshot(
    consultaHistorico,
    (instantaneo) => {
      const analises = instantaneo.docs.map((documento) => {
        const dados = documento.data();
        return {
          id: documento.id,
          title: dados.title ?? 'Mensagem analisada',
          message: dados.message ?? '',
          risk: dados.risk ?? 0,
          level: dados.level ?? 'Baixo',
          tone: dados.tone ?? 'low',
          analysisType: dados.analysisType ?? 'message',
          warnings: Array.isArray(dados.warnings) ? dados.warnings : [],
          advice: dados.advice ?? '',
          modelVersion: dados.modelVersion ?? 'anterior',
          createdAt: dados.createdAt?.toDate?.() ?? null,
        } as AnaliseSalva;
      });
      aoReceberDados(analises);
      void armazenarHistoricoLocal(idUsuario, analises).catch((erro: unknown) => {
        aoFalharCache(erro instanceof Error ? erro : new Error(String(erro)));
      });
    },
    aoFalhar
  );
}
