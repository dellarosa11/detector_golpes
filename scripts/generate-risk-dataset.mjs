import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Gerador da primeira base sintética usada para prototipar o treinamento.
 * Ele produz exemplos balanceados de risco baixo, médio e alto, além das divisões
 * fixas de treino, validação e teste. A base real usada depois não é gerada aqui.
 */

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(scriptDirectory, '..', 'data');

// Cada rótulo recebe a mesma quantidade para evitar desbalanceamento artificial.
const TARGET_PER_LABEL = 800;
const SPLIT_COUNTS = {
  treino: 560,
  validacao: 120,
  teste: 120,
};

// Semente fixa: executar novamente gera os mesmos dados e facilita reproduzir resultados.
let randomState = 0x5eed2026;

function random() {
  randomState = (1664525 * randomState + 1013904223) >>> 0;
  return randomState / 0x100000000;
}

function pick(items) {
  return items[Math.floor(random() * items.length)];
}

function maybe(items, chance = 0.5) {
  return random() < chance ? pick(items) : '';
}

function compact(parts) {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

// Blocos de vocabulário são combinados pelos cenários para criar variação controlada.
const greetings = ['Oi!', 'Olá!', 'Bom dia!', 'Boa tarde!', 'Boa noite!', 'Ei, tudo bem?', 'Opa!', 'Olá, tudo certo?'];
const names = ['Ana', 'Bruno', 'Carla', 'Diego', 'Fernanda', 'Gabriel', 'Helena', 'João', 'Larissa', 'Marcos', 'Patrícia', 'Rafael', 'Renata', 'Tiago'];
const days = ['hoje', 'amanhã', 'segunda-feira', 'terça-feira', 'quarta-feira', 'sexta-feira', 'sábado'];
const times = ['às 8h', 'às 9h30', 'às 11h', 'às 14h', 'às 16h30', 'às 18h', 'depois do almoço', 'no fim da tarde'];
const values = ['R$ 18,90', 'R$ 42,00', 'R$ 75,50', 'R$ 120,00', 'R$ 189,90', 'R$ 250,00', 'R$ 480,00', 'R$ 1.200,00'];
const orderNumbers = ['10482', '23817', '35109', '46722', '58340', '61973', '74518', '89206'];
const devices = ['celular Android', 'iPhone', 'computador Windows', 'tablet', 'notebook'];
const officialChannels = ['aplicativo oficial', 'site oficial digitado no navegador', 'telefone que está no cartão', 'canal oficial de atendimento', 'menu de segurança do aplicativo'];
const harmlessDomains = ['agenda-servicos.example', 'portal-cliente.example', 'minha-reserva.example', 'acompanhamento-pedido.example'];
const suspiciousDomains = ['confirmacao-imediata.example', 'conta-pendente.example', 'premio-resgate.example', 'suporte-verificacao.example', 'entrega-atualiza.example'];
const products = ['livro', 'fone de ouvido', 'tênis', 'carregador', 'relógio', 'computador', 'teclado', 'casaco'];
const places = ['faculdade', 'empresa', 'academia', 'clínica', 'biblioteca', 'loja', 'sala de estudos'];
const banks = ['seu banco', 'a instituição financeira', 'a central bancária', 'o setor de segurança da conta'];
const benefits = ['benefício social', 'reembolso tributário', 'auxílio emergencial', 'saldo esquecido', 'indenização'];

// Mensagens comuns ou informativas, sem tentativa de obter credenciais ou dinheiro.
const lowRiskScenarios = [
  {
    category: 'conversa_cotidiana',
    build: () => compact([
      pick(greetings),
      pick([
        `Você consegue me encontrar na ${pick(places)} ${pick(days)} ${pick(times)}?`,
        `Vou chegar ${pick(times)}. Se mudar alguma coisa, eu aviso por aqui.`,
        `Você pode trazer o caderno quando vier ${pick(days)}?`,
        `A reunião foi confirmada para ${pick(days)} ${pick(times)}.`,
        `Passei no mercado e já comprei o que estava na lista.`,
      ]),
      maybe(['Obrigado!', 'Até mais.', 'Me avise quando puder.', 'Tudo certo por aqui.'], 0.6),
    ]),
  },
  {
    category: 'pagamento_conhecido',
    build: () => compact([
      pick(greetings),
      pick([
        `Fiz o Pix de ${pick(values)} referente à nossa compra combinada. Confira quando puder.`,
        `Recebi o pagamento de ${pick(values)} que você tinha avisado. Está tudo certo.`,
        `A mensalidade de ${pick(values)} apareceu normalmente no aplicativo do banco.`,
        `O comprovante da transferência combinada está salvo no aplicativo. Não precisa clicar em nenhum link.`,
        `A divisão da conta ficou em ${pick(values)} para cada pessoa.`,
      ]),
    ]),
  },
  {
    category: 'aviso_seguranca',
    build: () => pick([
      `Lembrete de segurança: nunca informe sua senha ou código de verificação por mensagem. Consulte sempre o ${pick(officialChannels)}.`,
      `Seu banco não solicita transferência para cancelar uma compra. Em caso de dúvida, abra o ${pick(officialChannels)}.`,
      `Não compartilhe o código recebido por SMS, mesmo que alguém diga ser funcionário do banco.`,
      `Se receber uma cobrança inesperada, confirme diretamente pelo ${pick(officialChannels)} antes de pagar.`,
      `O atendimento foi encerrado. Nenhum funcionário pedirá sua senha depois desta conversa.`,
    ]),
  },
  {
    category: 'entrega_esperada',
    build: () => compact([
      pick(greetings),
      pick([
        `O pedido ${pick(orderNumbers)} com o ${pick(products)} saiu para entrega. Você já estava acompanhando pelo aplicativo.`,
        `Sua compra de ${pick(products)} será entregue ${pick(days)}. Não é necessário realizar pagamento adicional.`,
        `A entrega que combinamos foi reagendada para ${pick(days)} ${pick(times)}.`,
        `Recebi o ${pick(products)} do pedido ${pick(orderNumbers)}. A caixa chegou em boas condições.`,
        `O endereço do pedido ${pick(orderNumbers)} foi confirmado no momento da compra.`,
      ]),
    ]),
  },
  {
    category: 'suporte_solicitado',
    build: () => pick([
      `Conforme o chamado que você abriu, o atendimento está agendado para ${pick(days)} ${pick(times)}. Não enviaremos pedido de senha.`,
      `Seu protocolo ${pick(orderNumbers)} foi atualizado. Consulte o andamento pelo ${pick(officialChannels)}.`,
      `A troca do ${pick(products)} solicitada por você foi aprovada e não possui taxa adicional.`,
      `Confirmamos o cancelamento pedido por você. O estorno de ${pick(values)} aparecerá na próxima fatura.`,
      `O suporte encerrou o chamado. Caso o problema continue, responda pelo canal em que você iniciou o atendimento.`,
    ]),
  },
  {
    category: 'trabalho_estudo',
    build: () => compact([
      pick(greetings),
      pick([
        `Enviei a versão atualizada do trabalho para o grupo da turma.`,
        `A apresentação ficou marcada para ${pick(days)} ${pick(times)}.`,
        `O professor colocou as orientações da atividade no portal da faculdade.`,
        `A equipe vai revisar o documento ${pick(days)} antes da reunião.`,
        `Você consegue conferir os slides e deixar seus comentários até ${pick(times)}?`,
      ]),
      maybe(['Qualquer dúvida, me chama.', 'Depois conversamos sobre os ajustes.', 'Não precisa responder agora.'], 0.5),
    ]),
  },
  {
    category: 'recuperacao_solicitada',
    build: () => pick([
      `Você iniciou uma recuperação de senha no ${pick(officialChannels)}. Digite o código somente na tela que você abriu e não o compartilhe.`,
      `A alteração de senha solicitada por você foi concluída. Se não reconhecer, entre no ${pick(officialChannels)} sem usar links da mensagem.`,
      `O código de acesso foi enviado porque você pediu. Nenhum atendente solicitará esse código por telefone ou conversa.`,
      `Seu acesso pelo ${pick(devices)} foi confirmado no aplicativo que você abriu.`,
      `A verificação em duas etapas foi ativada por você. Guarde os códigos de recuperação em local seguro.`,
    ]),
  },
  {
    category: 'compra_presencial',
    build: () => compact([
      pick(greetings),
      pick([
        `Separei o ${pick(products)} que você viu na loja. Pode passar aqui ${pick(days)}.`,
        `A reserva está confirmada para ${pick(days)} ${pick(times)} e o pagamento será feito no local.`,
        `A nota fiscal da compra de ${pick(values)} foi entregue junto com o produto.`,
        `O orçamento solicitado ficou em ${pick(values)}. Você pode analisar sem compromisso.`,
        `O produto está disponível, mas confirme pessoalmente antes de efetuar qualquer pagamento.`,
      ]),
    ]),
  },
  {
    category: 'lembrete_pessoal',
    build: () => pick([
      `${pick(names)}, lembre-se da consulta ${pick(days)} ${pick(times)}. A clínica já confirmou por telefone.`,
      `O aniversário da ${pick(names)} será ${pick(days)} ${pick(times)}. Cada pessoa pode levar alguma coisa.`,
      `Não esqueça de levar o documento para a matrícula na ${pick(places)}.`,
      `A reserva para ${pick(days)} está no nome de ${pick(names)} e será paga no local.`,
      `Deixei a chave com ${pick(names)}. Pode buscar ${pick(days)} ${pick(times)}.`,
    ]),
  },
  {
    category: 'informativo_financeiro',
    build: () => pick([
      `A fatura fechou em ${pick(values)}. Confira os lançamentos diretamente no aplicativo antes do vencimento.`,
      `O banco informa que não existe taxa para liberar estorno ou cancelar transferência.`,
      `O investimento apresentou variação neste mês; rentabilidade passada não garante retorno futuro.`,
      `A compra de ${pick(values)} feita por você já aparece no histórico do cartão.`,
      `Seu extrato mensal está disponível no ${pick(officialChannels)}. Esta mensagem não contém link de acesso.`,
    ]),
  },
];

// Mensagens com sinais suspeitos, mas sem evidência suficiente para classificar como golpe direto.
const mediumRiskScenarios = [
  {
    category: 'link_nao_solicitado',
    build: () => compact([
      pick(greetings),
      pick([
        `Encontramos uma pendência no seu cadastro. Veja os detalhes em ${pick(suspiciousDomains)}.`,
        `Há uma atualização disponível para sua conta em ${pick(suspiciousDomains)}.`,
        `Você recebeu um documento para consultar no endereço ${pick(suspiciousDomains)}.`,
        `Acesse ${pick(suspiciousDomains)} para conferir uma informação importante.`,
      ]),
      maybe(['Caso já tenha resolvido, ignore.', 'O acesso ficará disponível por algumas horas.', 'Estamos aguardando sua confirmação.'], 0.7),
    ]),
  },
  {
    category: 'entrega_pendente',
    build: () => pick([
      `Sua encomenda não pôde ser entregue por dados incompletos. Atualize o endereço em ${pick(suspiciousDomains)}.`,
      `O pedido ${pick(orderNumbers)} está parado no centro de distribuição. Consulte a pendência em ${pick(suspiciousDomains)}.`,
      `Encontramos uma divergência no CEP da sua entrega. Confirme as informações ainda hoje.`,
      `Uma entrega está aguardando sua confirmação, mas a mensagem não informa qual compra originou o envio.`,
      `Seu pacote pode ser devolvido ao remetente. Verifique o status no link recebido nesta conversa.`,
    ]),
  },
  {
    category: 'contato_desconhecido',
    build: () => compact([
      pick(greetings),
      pick([
        `Sou ${pick(names)}, troquei de número. Salva este contato para falarmos depois.`,
        `Peguei seu contato com um conhecido, mas prefiro explicar o assunto por mensagem.`,
        `Estou falando em nome da empresa sobre uma solicitação no seu CPF.`,
        `Temos um assunto particular para tratar com você. Confirme se este número é seu.`,
        `Sou do atendimento e preciso validar algumas informações antes de continuar.`,
      ]),
    ]),
  },
  {
    category: 'oferta_improvavel',
    build: () => pick([
      `Oferta exclusiva: o ${pick(products)} está com 80% de desconto somente hoje. Consulte ${pick(suspiciousDomains)}.`,
      `Você foi selecionado para comprar um ${pick(products)} por ${pick(values)}. A quantidade é limitada.`,
      `Uma promoção reservada para seu número termina em poucas horas. Clique para conhecer as condições.`,
      `Temos uma oportunidade com preço muito abaixo do mercado e entrega imediata.`,
      `Desconto especial liberado sem que você tenha feito cadastro. Confirme se deseja receber a oferta.`,
    ]),
  },
  {
    category: 'cobranca_duvidosa',
    build: () => pick([
      `Identificamos uma cobrança de ${pick(values)} vinculada ao seu nome. Entre em contato para consultar.`,
      `Existe um débito pendente com vencimento ${pick(days)}. A origem não foi informada nesta mensagem.`,
      `Seu CPF pode ter uma pendência financeira. Consulte as condições no endereço enviado.`,
      `A negociação de uma dívida no valor de ${pick(values)} está disponível por tempo limitado.`,
      `Recebemos uma solicitação de cobrança, mas precisamos confirmar se os dados estão corretos.`,
    ]),
  },
  {
    category: 'acesso_incomum',
    build: () => pick([
      `Detectamos uma tentativa de acesso por um ${pick(devices)}. Verifique a atividade no link desta mensagem.`,
      `Um novo dispositivo tentou acessar sua conta. Confirme se reconhece o acesso.`,
      `Sua sessão pode ter expirado. Faça uma nova validação para continuar utilizando o serviço.`,
      `Houve uma alteração nas configurações da conta. Consulte o atendimento caso não reconheça.`,
      `Recebemos várias tentativas de entrada. A mensagem pede confirmação, mas não informa o canal oficial.`,
    ]),
  },
  {
    category: 'vaga_duvidosa',
    build: () => pick([
      `Temos uma vaga de trabalho remoto com início imediato. Não é necessário processo seletivo.`,
      `Seu currículo foi selecionado para uma oportunidade de ${pick(values)} por semana. Responda para saber mais.`,
      `Uma empresa encontrou seu perfil e quer fazer a entrevista somente por mensagens.`,
      `Trabalho simples pelo celular, horários livres e pagamento diário. Peça as instruções.`,
      `Você foi aprovado para uma vaga à qual não se lembra de ter se candidatado. Confirme seu interesse.`,
    ]),
  },
  {
    category: 'investimento_duvidoso',
    build: () => pick([
      `Conheça uma oportunidade de investimento com retorno acima da média. Fale com nosso consultor.`,
      `Um grupo privado está ensinando uma estratégia que promete resultados rápidos no mercado financeiro.`,
      `Temos poucas vagas para uma operação de investimento automatizada.`,
      `Comece investindo ${pick(values)} e acompanhe os resultados pelo grupo de mensagens.`,
      `Recebi uma dica exclusiva de investimento e posso incluir você, se responder ainda hoje.`,
    ]),
  },
  {
    category: 'pesquisa_com_premio',
    build: () => pick([
      `Responda a uma pesquisa rápida e concorra a um ${pick(products)}. Acesse ${pick(suspiciousDomains)}.`,
      `Sua opinião vale um cupom de ${pick(values)}. Preencha o formulário enviado por mensagem.`,
      `Você foi convidado para avaliar nosso atendimento e poderá receber uma recompensa.`,
      `Participe de um questionário e desbloqueie uma oferta especial no final.`,
      `Uma pesquisa não solicitada pede informações de contato para liberar um brinde.`,
    ]),
  },
  {
    category: 'atualizacao_cadastral',
    build: () => pick([
      `Seus dados cadastrais precisam ser atualizados. Inicie a revisão em ${pick(suspiciousDomains)}.`,
      `O cadastro pode ficar limitado por falta de confirmação. Responda para receber as instruções.`,
      `Precisamos validar seu telefone e endereço para manter o serviço ativo.`,
      `A atualização anual da conta está disponível por meio do link enviado.`,
      `Há informações incompletas no seu perfil. Confirme os dados para evitar problemas futuros.`,
    ]),
  },
];

// Pedidos explícitos de dinheiro, senha, código, dados financeiros ou acesso remoto.
const highRiskScenarios = [
  {
    category: 'phishing_credenciais',
    build: () => pick([
      `Acesse ${pick(suspiciousDomains)} e informe usuário, senha e CPF para evitar a suspensão da conta.`,
      `Sua conta será bloqueada. Confirme agora a senha e os dados do cartão no formulário enviado.`,
      `Para concluir a atualização, digite sua senha bancária completa e a data de nascimento.`,
      `Entre no link e valide número do cartão, código de segurança e senha eletrônica.`,
      `O acesso foi limitado. Envie seus dados de login nesta conversa para liberar novamente.`,
    ]),
  },
  {
    category: 'pix_urgente',
    build: () => compact([
      pick(greetings),
      pick([
        `Preciso que faça um Pix de ${pick(values)} agora. Depois explico o motivo.`,
        `Meu aplicativo travou e preciso pagar uma conta urgente. Transfira ${pick(values)} para esta chave nova.`,
        `Faça o pagamento imediatamente para evitar uma multa maior. Use a chave enviada nesta conversa.`,
        `Não consigo falar por telefone. Mande ${pick(values)} por Pix e não avise mais ninguém.`,
        `A transferência precisa ser feita nos próximos minutos para resolver o problema.`,
      ]),
    ]),
  },
  {
    category: 'falso_familiar',
    build: () => pick([
      `Mãe, troquei de número e estou sem acesso ao banco. Faz um Pix de ${pick(values)} para meu amigo?`,
      `Pai, este é meu contato novo. Preciso pagar uma conta urgente e depois devolvo o dinheiro.`,
      `Sou eu, ${pick(names)}. Meu celular quebrou; não liga agora. Transfira ${pick(values)} para esta chave.`,
      `Salva meu número novo e apaga o antigo. Também preciso que pague um boleto para mim agora.`,
      `Estou em uma emergência e só consigo falar por mensagem. Envie dinheiro sem comentar com ninguém.`,
    ]),
  },
  {
    category: 'falso_banco',
    build: () => pick([
      `${pick(banks)} identificou uma fraude. Para cancelar a compra, faça uma transferência para a conta de segurança.`,
      `Um funcionário ligará para recolher seu cartão e pedirá a senha para concluir o cancelamento.`,
      `Para bloquear uma operação de ${pick(values)}, instale o aplicativo de segurança indicado pelo atendente.`,
      `Sua conta está sob investigação. Envie uma foto do cartão e do documento para provar sua identidade.`,
      `O setor antifraude solicita um Pix de teste, que será devolvido após a verificação.`,
    ]),
  },
  {
    category: 'codigo_verificacao',
    build: () => pick([
      `Acabei de enviar um código de seis dígitos para seu celular. Informe o código aqui para confirmar o atendimento.`,
      `Para cancelar a compra, preciso que você diga o token que apareceu no aplicativo.`,
      `Compartilhe o código recebido por SMS para provar que a linha pertence a você.`,
      `A leitura do QR Code gerou um número. Envie esse número ao atendente para liberar a conta.`,
      `Seu código de recuperação chegou. Passe todos os dígitos agora antes que ele expire.`,
    ]),
  },
  {
    category: 'acesso_remoto',
    build: () => pick([
      `Instale o aplicativo de acesso remoto e informe o código da tela para remover o vírus do seu celular.`,
      `O suporte precisa controlar seu ${pick(devices)}. Baixe o programa enviado e aceite todas as permissões.`,
      `Para corrigir a conta, compartilhe sua tela enquanto abre o aplicativo do banco.`,
      `Instale esta ferramenta de segurança fora da loja oficial e desative a proteção do aparelho.`,
      `Autorize o atendente a movimentar o cursor e não feche o aplicativo durante a transferência.`,
    ]),
  },
  {
    category: 'premio_com_taxa',
    build: () => pick([
      `Parabéns, você ganhou um ${pick(products)}. Pague ${pick(values)} de taxa para receber o prêmio.`,
      `Seu número foi sorteado. Envie um Pix de liberação antes de resgatar o valor.`,
      `Um prêmio de R$ 50.000 está reservado, mas é necessário pagar o imposto antecipadamente.`,
      `Você ganhou sem participar de sorteio. Confirme os dados do cartão para receber.`,
      `A recompensa expira hoje. Faça o depósito da taxa e envie o comprovante nesta conversa.`,
    ]),
  },
  {
    category: 'investimento_garantido',
    build: () => pick([
      `Invista ${pick(values)} hoje e receba o dobro amanhã, com lucro garantido e sem risco.`,
      `Nossa plataforma garante 20% ao dia. Transfira o valor para a conta do consultor.`,
      `O robô nunca perde dinheiro. Faça o depósito inicial e indique amigos para aumentar o retorno.`,
      `Temos informação privilegiada e retorno garantido. Esta oportunidade deve permanecer em segredo.`,
      `Pegue um empréstimo e invista conosco; o lucro certo pagará todas as parcelas.`,
    ]),
  },
  {
    category: 'boleto_falso',
    build: () => pick([
      `O boleto anterior foi cancelado. Pague somente o novo código enviado por este número desconhecido.`,
      `Troque o beneficiário do pagamento e ignore o documento recebido pelo canal oficial.`,
      `Seu acordo só será mantido se o boleto de ${pick(values)} for pago nos próximos minutos.`,
      `O código de barras mudou por erro no sistema. Faça o pagamento para uma pessoa física.`,
      `Desconsidere a cobrança original e use este QR Code para quitar a parcela imediatamente.`,
    ]),
  },
  {
    category: 'vaga_com_taxa',
    build: () => pick([
      `Você foi contratado sem entrevista. Pague ${pick(values)} pelo material obrigatório para começar.`,
      `A vaga é sua, mas precisamos de um Pix para liberar o exame admissional.`,
      `Deposite a taxa do uniforme hoje e receba o contrato somente depois do pagamento.`,
      `Para trabalhar de casa, compre um kit diretamente com o recrutador e envie o comprovante.`,
      `A empresa exige pagamento antecipado para cadastrar seu salário e confirmar a contratação.`,
    ]),
  },
  {
    category: 'beneficio_com_taxa',
    build: () => pick([
      `Seu ${pick(benefits)} foi aprovado. Pague ${pick(values)} para liberar o depósito.`,
      `Há um valor público disponível no seu CPF. Informe a senha bancária para receber.`,
      `O pagamento do benefício depende de uma taxa via Pix para este atendente.`,
      `Você tem um reembolso a receber. Envie foto do documento, cartão e senha.`,
      `O prazo para sacar o ${pick(benefits)} termina hoje. Faça o depósito de validação agora.`,
    ]),
  },
  {
    category: 'ameaca_bloqueio',
    build: () => pick([
      `Se não pagar ${pick(values)} agora, seu CPF será bloqueado e a polícia será acionada.`,
      `Sua conta será encerrada em dez minutos. Envie a senha para impedir o bloqueio.`,
      `Existe uma ordem contra você. Faça o Pix solicitado para evitar consequências legais.`,
      `Seu aparelho será bloqueado permanentemente se você não instalar o aplicativo indicado.`,
      `Último aviso: pague por esta chave desconhecida ou todos os seus dados serão divulgados.`,
    ]),
  },
  {
    category: 'fraude_marketplace',
    build: () => pick([
      `O pagamento do ${pick(products)} está preso. Pague uma taxa fora da plataforma para liberar a venda.`,
      `Enviei um comprovante, mas você precisa devolver a diferença por Pix antes de conferir o saldo.`,
      `Para receber pela venda, informe número do cartão, senha e código de segurança.`,
      `O comprador pagou a mais por engano. Transfira ${pick(values)} imediatamente para uma terceira pessoa.`,
      `Continue a negociação fora do aplicativo e clique no link para cadastrar sua conta bancária.`,
    ]),
  },
  {
    category: 'fraude_romantica',
    build: () => pick([
      `Quero muito encontrar você, mas preciso de ${pick(values)} para comprar a passagem. Não conte a ninguém.`,
      `Meu presente ficou retido na alfândega. Pague a taxa para que ele seja entregue a você.`,
      `Estou no exterior e minha conta foi bloqueada. Envie dinheiro para um conhecido até eu voltar.`,
      `Depois de nossa conversa, confio em você. Faça um empréstimo para me ajudar nesta emergência.`,
      `Para provar seu amor, transfira o valor solicitado e mantenha isso em segredo.`,
    ]),
  },
  {
    category: 'fraude_executivo',
    build: () => pick([
      `Sou o diretor e estou em reunião. Faça um Pix de ${pick(values)} para este fornecedor novo sem avisar a equipe.`,
      `Preciso que compre cartões-presente agora e envie os códigos por mensagem. É confidencial.`,
      `Mude os dados bancários do fornecedor e processe o pagamento antes da aprovação normal.`,
      `Ignore o procedimento da empresa; esta transferência é urgente e deve ficar em segredo.`,
      `Estou usando um número pessoal. Pague a nota enviada e não confirme com mais ninguém.`,
    ]),
  },
];

const scenarioCatalog = {
  baixo: lowRiskScenarios,
  medio: mediumRiskScenarios,
  alto: highRiskScenarios,
};

// Acrescenta saudações, encerramentos e pequenas mudanças de pontuação.
function addNaturalVariation(text) {
  const neutralSuffixes = [
    '',
    'Aguardo seu retorno.',
    'Obrigado.',
    'Me avise quando puder.',
    'Confira quando puder.',
    'Fico à disposição.',
    'Atenciosamente.',
    'Qualquer dúvida, responda por aqui.',
    'Tudo bem?',
    'Responda quando puder.',
    'Pode confirmar o recebimento?',
  ];
  const alreadyHasGreeting = greetings.some((greeting) => text.startsWith(greeting));
  const prefix = alreadyHasGreeting ? '' : maybe(greetings, 0.45);
  const suffix = pick(neutralSuffixes);
  const punctuationVariant = random() < 0.2 ? text.replace(/\.$/, '!') : text;
  return compact([prefix, punctuationVariant, suffix]);
}

function normalizedText(text) {
  // Remove diferenças cosméticas antes de verificar se uma mensagem já foi usada.
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function generateRowsForLabel(label) {
  // Distribui exemplos entre categorias e garante textos únicos dentro do rótulo.
  const scenarios = scenarioCatalog[label];
  const rows = [];
  const usedTexts = new Set();

  for (const [scenarioIndex, scenario] of scenarios.entries()) {
    const baseCount = Math.floor(TARGET_PER_LABEL / scenarios.length);
    const categoryTarget = baseCount + (scenarioIndex < TARGET_PER_LABEL % scenarios.length ? 1 : 0);
    let categoryCount = 0;
    let attempts = 0;

    while (categoryCount < categoryTarget) {
      attempts += 1;
      if (attempts > categoryTarget * 200) {
        throw new Error(`Não foi possível gerar exemplos únicos suficientes para ${label}/${scenario.category}.`);
      }

      const text = addNaturalVariation(scenario.build());
      const normalized = normalizedText(text);
      if (!normalized || usedTexts.has(normalized)) continue;

      usedTexts.add(normalized);
      rows.push({
        texto: text,
        nivel: label,
        categoria: scenario.category,
        origem: 'sintetico_v1',
      });
      categoryCount += 1;
    }
  }

  // Faz a divisão somente depois da geração para reduzir agrupamentos por categoria.
  const randomizedRows = shuffle(rows);
  let cursor = 0;
  for (const [split, count] of Object.entries(SPLIT_COUNTS)) {
    for (let index = 0; index < count; index += 1) {
      randomizedRows[cursor].split = split;
      cursor += 1;
    }
  }

  return randomizedRows;
}

function csvEscape(value) {
  // Protege vírgulas, aspas e quebras de linha para produzir CSV válido.
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows) {
  const headers = ['id', 'texto', 'nivel', 'categoria', 'origem', 'split'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

// Grava a base completa e os três arquivos usados pelas etapas do treinamento.
mkdirSync(outputDirectory, { recursive: true });

const allRows = shuffle([
  ...generateRowsForLabel('baixo'),
  ...generateRowsForLabel('medio'),
  ...generateRowsForLabel('alto'),
]).map((row, index) => ({ id: `msg_${String(index + 1).padStart(5, '0')}`, ...row }));

writeFileSync(join(outputDirectory, 'mensagens_risco.csv'), toCsv(allRows), 'utf8');

for (const split of Object.keys(SPLIT_COUNTS)) {
  writeFileSync(
    join(outputDirectory, `${split}.csv`),
    toCsv(allRows.filter((row) => row.split === split)),
    'utf8',
  );
}

// Estatísticas permitem conferir equilíbrio de rótulos, splits e categorias sem abrir os CSVs.
const labelCounts = Object.fromEntries(
  Object.keys(scenarioCatalog).map((label) => [label, allRows.filter((row) => row.nivel === label).length]),
);
const splitCounts = Object.fromEntries(
  Object.keys(SPLIT_COUNTS).map((split) => [split, allRows.filter((row) => row.split === split).length]),
);
const splitByLabel = Object.fromEntries(
  Object.keys(SPLIT_COUNTS).map((split) => [
    split,
    Object.fromEntries(
      Object.keys(scenarioCatalog).map((label) => [
        label,
        allRows.filter((row) => row.split === split && row.nivel === label).length,
      ]),
    ),
  ]),
);
const categoryCounts = Object.fromEntries(
  [...new Set(allRows.map((row) => row.categoria))]
    .sort()
    .map((category) => [category, allRows.filter((row) => row.categoria === category).length]),
);

writeFileSync(
  join(outputDirectory, 'estatisticas.json'),
  `${JSON.stringify({
    versao: 1,
    semente: '0x5eed2026',
    total: allRows.length,
    rotulos: labelCounts,
    divisoes: splitCounts,
    divisoesPorRotulo: splitByLabel,
    categorias: categoryCounts,
  }, null, 2)}\n`,
  'utf8',
);

console.log(`Base gerada em ${outputDirectory}`);
console.log(`Total: ${allRows.length}`);
console.log(JSON.stringify({ labelCounts, splitCounts, splitByLabel }, null, 2));
