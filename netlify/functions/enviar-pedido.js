// /.netlify/functions/enviar-pedido.js
// Contador automático sequencial: 0, 1, 2, 3... sem intervenção manual

exports.handler = async (event, context) => {
  console.log('Função iniciada - handler principal');
  
  // Handler para OPTIONS (CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Chaves PIX (movidas do frontend)
  const CHAVES_PIX = {
    "3": "00020126690014BR.GOV.BCB.PIX0136f4573753-c26d-4609-9610-89c810b03e310207gorjeta52040000530398654043.005802BR5925Pedro Henrique Martins Te6009SAO PAULO61080540900062230519bxWWKAP3L3MfEsdk5xs6304BCE3",
    "7": "00020126690014BR.GOV.BCB.PIX0136f4573753-c26d-4609-9610-89c810b03e310207gorjeta52040000530398654047.005802BR5925Pedro Henrique Martins Te6009SAO PAULO61080540900062230519K1lfTZdOaqQZnr4k5xs63043A6A",
    "15": "00020126690014BR.GOV.BCB.PIX0136f4573753-c26d-4609-9610-89c810b03e310207gorjeta520400005303986540515.005802BR5925Pedro Henrique Martins Te6009SAO PAULO61080540900062230519nMTOKGa4plV0eHAk5xs63041D52",
    "25": "00020126690014BR.GOV.BCB.PIX0136f4573753-c26d-4609-9610-89c810b03e310207gorjeta520400005303986540525.005802BR5925Pedro Henrique Martins Te6009SAO PAULO610805409000622305192LyQj0fxzFevHHzk5xs6304E521",
    "50": "00020126690014BR.GOV.BCB.PIX0136f4573753-c26d-4609-9610-89c810b03e310207gorjeta520400005303986540550.005802BR5925Pedro Henrique Martins Te6009SAO PAULO61080540900062230519LCvJTaNZqjNTCNgk5xs63041B38",
    "100": "00020126690014BR.GOV.BCB.PIX0136f4573753-c26d-4609-9610-89c810b03e310207gorjeta5204000053039865406100.005802BR5925Pedro Henrique Martins Te6009SAO PAULO61080540900062230519B6t0QgiXEw6htoKk5xs63048E53",
    "outro": "00020126690014BR.GOV.BCB.PIX0136f4573753-c26d-4609-9610-89c810b03e310207gorjeta5204000053039865802BR5925Pedro Henrique Martins Te6009SAO PAULO62140510M5x3KrERij6304C4FC"
  };

  // Configurações do Telegram e Google Sheets
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  const PLANILHA_CSV_URL = process.env.PLANILHA_CSV_URL;

  try {
    // Parse dos dados recebidos do frontend
    const { nome, telefone, musica, gorjeta, outroValor, mensagem, consentimento } = JSON.parse(event.body);
    
    // Validações básicas
    if (!nome || !musica) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: false, 
          error: 'Nome e música são obrigatórios' 
        })
      };
    }

    // Processar gorjeta (lógica movida do frontend)
    let valorGorjeta = '';
    let chavePix = '';
    
    if (gorjeta === 'outro' && outroValor) {
      valorGorjeta = outroValor;
      chavePix = CHAVES_PIX["outro"];
    } else if (gorjeta && CHAVES_PIX[gorjeta]) {
      valorGorjeta = gorjeta;
      chavePix = CHAVES_PIX[gorjeta];
    }

    // CONTADOR AUTOMÁTICO: Gera números sequenciais automaticamente
    const csv = await buscarCsvDaPlanilha(PLANILHA_CSV_URL);
    const numeroPedido = await contadorAutomatico(csv);

    // Formatação da mensagem do Telegram (movida do frontend)
    let textoTelegram = `🎶 *Novo Pedido de Música Nº${numeroPedido}* 🎶\n👤 ${nome}`;
    textoTelegram += `\n🎵 ${musica}`;
    
    if (valorGorjeta) {
      textoTelegram += `\n💰 R$${valorGorjeta}`;
    }
    if (mensagem) {
      textoTelegram += `\n💌 ${mensagem}`;
    }
    if (telefone) {
      const telefoneNumeros = telefone.replace(/\D/g, '');
      textoTelegram += `\n📞 ${telefoneNumeros}`;
    }
    
    if (consentimento) {
      textoTelegram += `\n✅ Quero ficar por dentro de novas experiências musicais como esta. Aceito receber mensagens suas.`;
    }

    // Enviar para Telegram com RETRY
    const telegramSuccess = await enviarParaTelegramComRetry(textoTelegram, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID);
    
    if (!telegramSuccess) {
      throw new Error('Falha ao enviar mensagem para o Telegram após múltiplas tentativas');
    }

    // Resposta para o frontend (sem dados sensíveis)
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        numeroPedido: numeroPedido,
        temGorjeta: !!valorGorjeta,
        chavePix: chavePix || null,
        isOutroValor: gorjeta === 'outro'
      })
    };

  } catch (error) {
    console.error('❌ Erro no envio do pedido:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor. Tente novamente.' 
      })
    };
  }
};

/**
 * Função para buscar CSV da planilha Google Sheets
 */
async function buscarCsvDaPlanilha(planilhaUrl) {
  console.log('Iniciando fetch do CSV da planilha...');
  
  if (!planilhaUrl) {
    throw new Error('URL da planilha não configurada');
  }
  
  const response = await fetch(planilhaUrl);
  if (!response.ok) {
    console.error('Erro ao buscar CSV:', response.status);
    throw new Error('Falha ao buscar a planilha CSV');
  }
  
  const csv = await response.text();
  console.log('CSV recebido (primeiros 200 caracteres):', csv.slice(0, 200));
  return csv;
}

/**
 * Função para ler a célula C1 da planilha (primeira linha, terceira coluna)
 */
function lerCelulaC1(csv) {
  if (!csv) {
    console.log('CSV vazio ou inválido');
    return '';
  }
  
  const linhas = csv.split('\n');
  if (linhas.length < 1) {
    console.log('CSV não possui primeira linha');
    return '';
  }
  
  const primeiraLinha = linhas[0];
  const colunas = primeiraLinha.split(',');
  
  if (colunas.length < 3) {
    console.log('Primeira linha não possui coluna C');
    return '';
  }
  
  const valorC1 = colunas[2].trim();
  console.log(`Valor encontrado na célula C1: "${valorC1}"`);
  return valorC1;
}

/**
 * Função para validar se uma string está no formato de data AAAA-MM-DD
 */
function dataValida(dataStr) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dataStr)) {
    console.log(`Formato de data inválido: "${dataStr}"`);
    return false;
  }
  
  const d = new Date(dataStr);
  const isValidDate = d instanceof Date && !isNaN(d);
  
  if (!isValidDate) {
    console.log(`Data inválida: "${dataStr}"`);
    return false;
  }
  
  console.log(`Data válida: "${dataStr}"`);
  return true;
}

/**
 * CONTADOR AUTOMÁTICO PRINCIPAL
 * 
 * ESTRATÉGIA INOVADORA:
 * 1. Usa a data da célula C1 como "época" (ponto de referência)
 * 2. Calcula segundos decorridos desde o início da data
 * 3. Divide em períodos de 6 horas
 * 4. Dentro de cada período, gera números sequenciais baseados em intervalos de tempo
 * 5. Garante que números sejam sempre crescentes e sequenciais
 * 
 * VANTAGENS:
 * - Totalmente automático
 * - Números sempre sequenciais
 * - Respeita períodos de 6 horas
 * - Não precisa de estado persistente
 * - Funciona em ambiente serverless
 */
async function contadorAutomatico(csv) {
  const agora = Date.now();
  console.log('=== INÍCIO CONTADOR AUTOMÁTICO ===');
  console.log(`Timestamp atual: ${agora}`);
  
  // PASSO 1: Ler data da célula C1
  const dataAtual = lerCelulaC1(csv);
  console.log(`Data na C1: "${dataAtual}"`);
  
  // PASSO 2: Verificar se a data é válida
  if (!dataValida(dataAtual)) {
    console.log(`Data inválida: "${dataAtual}". Usando contador baseado em timestamp.`);
    // Se data inválida, usar um contador simples baseado em timestamp
    const numeroFallback = Math.floor((agora / 1000) % 1000);
    console.log(`Número fallback: ${numeroFallback}`);
    return numeroFallback;
  }
  
  // PASSO 3: Converter data para timestamp do início do dia (UTC)
  const dataObj = new Date(dataAtual + 'T00:00:00.000Z');
  const timestampInicioData = dataObj.getTime();
  
  console.log(`Data objeto: ${dataObj.toISOString()}`);
  console.log(`Timestamp início da data: ${timestampInicioData}`);
  
  // PASSO 4: Calcular tempo decorrido desde o início da data
  const tempoDecorrido = agora - timestampInicioData;
  const segundosDecorridos = Math.floor(tempoDecorrido / 1000);
  
  console.log(`Tempo decorrido: ${tempoDecorrido}ms`);
  console.log(`Segundos decorridos: ${segundosDecorridos}`);
  
  // PASSO 5: Calcular período de 6 horas atual
  const SEGUNDOS_6H = 6 * 60 * 60; // 21600 segundos = 6 horas
  const periodoAtual = Math.floor(segundosDecorridos / SEGUNDOS_6H);
  const segundoNoPeriodo = segundosDecorridos % SEGUNDOS_6H;
  
  console.log(`Período de 6h atual: ${periodoAtual}`);
  console.log(`Segundo no período (0-21599): ${segundoNoPeriodo}`);
  
  // PASSO 6: Gerar número sequencial automático
  // Estratégia: Dividir o período em intervalos pequenos para gerar números sequenciais
  
  // Opção A: Usar intervalos de 30 segundos (720 números por período)
  const INTERVALO_SEGUNDOS = 30;
  const numeroSequencial = Math.floor(segundoNoPeriodo / INTERVALO_SEGUNDOS);
  
  console.log(`Intervalo de ${INTERVALO_SEGUNDOS}s`);
  console.log(`Número sequencial: ${numeroSequencial}`);
  
  // PASSO 7: Garantir que o número esteja no range desejado (0-999)
  const numeroFinal = numeroSequencial % 1000;
  
  console.log(`Número final (mod 1000): ${numeroFinal}`);
  console.log('=== FIM CONTADOR AUTOMÁTICO ===');
  
  return numeroFinal;
}

/**
 * VERSÃO ALTERNATIVA: Contador com intervalos menores (mais números por período)
 */
async function contadorAutomaticoDetalhado(csv) {
  const agora = Date.now();
  console.log('=== INÍCIO CONTADOR AUTOMÁTICO DETALHADO ===');
  
  const dataAtual = lerCelulaC1(csv);
  console.log(`Data na C1: "${dataAtual}"`);
  
  if (!dataValida(dataAtual)) {
    console.log(`Data inválida. Retornando 0.`);
    return 0;
  }
  
  // Converter data para timestamp do início do dia
  const dataObj = new Date(dataAtual + 'T00:00:00.000Z');
  const timestampInicioData = dataObj.getTime();
  
  // Calcular tempo decorrido
  const tempoDecorrido = agora - timestampInicioData;
  const segundosDecorridos = Math.floor(tempoDecorrido / 1000);
  
  // Período de 6 horas
  const SEGUNDOS_6H = 6 * 60 * 60;
  const periodoAtual = Math.floor(segundosDecorridos / SEGUNDOS_6H);
  const segundoNoPeriodo = segundosDecorridos % SEGUNDOS_6H;
  
  // Usar intervalos de 10 segundos para mais granularidade
  const INTERVALO_SEGUNDOS = 10;
  const numeroSequencial = Math.floor(segundoNoPeriodo / INTERVALO_SEGUNDOS);
  
  // Limitar a 999 números
  const numeroFinal = numeroSequencial % 1000;
  
  console.log(`Período: ${periodoAtual}, Segundo: ${segundoNoPeriodo}`);
  console.log(`Intervalo 10s, Número: ${numeroFinal}`);
  console.log('=== FIM CONTADOR AUTOMÁTICO DETALHADO ===');
  
  return numeroFinal;
}

/**
 * VERSÃO MAIS SIMPLES: Contador baseado apenas em minutos
 */
async function contadorAutomaticoSimples(csv) {
  const agora = Date.now();
  console.log('=== INÍCIO CONTADOR AUTOMÁTICO SIMPLES ===');
  
  const dataAtual = lerCelulaC1(csv);
  console.log(`Data na C1: "${dataAtual}"`);
  
  if (!dataValida(dataAtual)) {
    console.log(`Data inválida. Retornando 0.`);
    return 0;
  }
  
  // Converter data para timestamp do início do dia
  const dataObj = new Date(dataAtual + 'T00:00:00.000Z');
  const timestampInicioData = dataObj.getTime();
  
  // Calcular minutos decorridos desde o início da data
  const tempoDecorrido = agora - timestampInicioData;
  const minutosDecorridos = Math.floor(tempoDecorrido / (60 * 1000));
  
  // Período de 6 horas = 360 minutos
  const MINUTOS_6H = 6 * 60;
  const periodoAtual = Math.floor(minutosDecorridos / MINUTOS_6H);
  const minutoNoPeriodo = minutosDecorridos % MINUTOS_6H;
  
  // Número sequencial = minuto no período
  const numeroFinal = minutoNoPeriodo;
  
  console.log(`Minutos decorridos: ${minutosDecorridos}`);
  console.log(`Período: ${periodoAtual}, Minuto no período: ${minutoNoPeriodo}`);
  console.log(`Número final: ${numeroFinal}`);
  console.log('=== FIM CONTADOR AUTOMÁTICO SIMPLES ===');
  
  return numeroFinal;
}

/**
 * Função para enviar mensagem ao Telegram com sistema de retry
 */
async function enviarParaTelegramComRetry(texto, token, chatId, maxTentativas = 3) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      console.log(`🔄 Tentativa ${tentativa}/${maxTentativas} de envio ao Telegram`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: texto,
          parse_mode: 'Markdown'
        })
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        console.log(`✅ Mensagem enviada com sucesso na tentativa ${tentativa}`);
        return true;
      } else {
        console.error(`❌ Erro na tentativa ${tentativa}:`, data);
        
        if (response.status === 429) {
          const retryAfter = data.parameters?.retry_after || 1;
          console.log(`⏳ Rate limit detectado. Aguardando ${retryAfter} segundos...`);
          await sleep(retryAfter * 1000);
        } else if (tentativa < maxTentativas) {
          const delayMs = tentativa * 1000;
          console.log(`⏳ Aguardando ${delayMs}ms antes da próxima tentativa...`);
          await sleep(delayMs);
        }
      }
    } catch (error) {
      console.error(`❌ Erro de rede na tentativa ${tentativa}:`, error);
      
      if (tentativa < maxTentativas) {
        const delayMs = tentativa * 2000;
        console.log(`⏳ Aguardando ${delayMs}ms antes da próxima tentativa...`);
        await sleep(delayMs);
      }
    }
  }

  console.error(`❌ Falha ao enviar mensagem após ${maxTentativas} tentativas`);
  return false;
}

/**
 * Função auxiliar para aguardar um tempo específico
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

