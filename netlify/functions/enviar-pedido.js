// /.netlify/functions/enviar-pedido.js
// Versão com numeração sequencial simples: 0, 1, 2, 3...

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

    // NUMERAÇÃO SIMPLES: Gerar número do pedido no formato 0, 1, 2, 3...
    const csv = await buscarCsvDaPlanilha(PLANILHA_CSV_URL);
    const numeroPedido = await gerarNumeroPedidoSimples(csv);

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
 * NUMERAÇÃO SIMPLES: Gera números sequenciais 0, 1, 2, 3...
 * 
 * ESTRATÉGIA:
 * 1. Lê a data da célula C1
 * 2. Calcula minutos desde o início da data
 * 3. Divide em períodos de 6 horas (360 minutos)
 * 4. Dentro de cada período, gera números sequenciais simples baseados em minutos
 * 5. Reinicia em 0 a cada novo período de 6 horas
 */
async function gerarNumeroPedidoSimples(csv) {
  const agora = Date.now();
  console.log('=== INÍCIO GERAÇÃO NÚMERO PEDIDO SIMPLES (0, 1, 2...) ===');
  console.log(`Timestamp atual: ${agora}`);
  
  // PASSO 1: Ler data da célula C1
  const dataAtual = lerCelulaC1(csv);
  console.log(`Data na C1: "${dataAtual}"`);
  
  // PASSO 2: Verificar se a data é válida
  if (!dataValida(dataAtual)) {
    console.log(`Data inválida: "${dataAtual}". Retornando 0.`);
    return 0; // Sempre começar em 0 quando data inválida
  }
  
  // PASSO 3: Converter data para timestamp do início do dia (UTC)
  const dataObj = new Date(dataAtual + 'T00:00:00.000Z');
  const timestampInicioData = dataObj.getTime();
  
  console.log(`Data objeto: ${dataObj.toISOString()}`);
  console.log(`Timestamp início da data: ${timestampInicioData}`);
  
  // PASSO 4: Calcular minutos desde o início da data
  const tempoDecorrido = agora - timestampInicioData;
  const minutosDesdeInicio = Math.floor(tempoDecorrido / (60 * 1000));
  
  console.log(`Tempo decorrido: ${tempoDecorrido}ms`);
  console.log(`Minutos desde início da data: ${minutosDesdeInicio}`);
  
  // PASSO 5: Calcular período de 6 horas atual
  const MINUTOS_6H = 6 * 60; // 360 minutos = 6 horas
  const periodoAtual = Math.floor(minutosDesdeInicio / MINUTOS_6H);
  const minutoNoPeriodo = minutosDesdeInicio % MINUTOS_6H;
  
  console.log(`Período de 6h atual: ${periodoAtual}`);
  console.log(`Minuto no período (0-359): ${minutoNoPeriodo}`);
  
  // PASSO 6: Gerar número sequencial simples
  // Usar segundos dentro do minuto para ter mais granularidade
  const segundosNoMinuto = Math.floor((tempoDecorrido % (60 * 1000)) / 1000);
  
  // Número sequencial: minuto no período * 60 + segundos
  // Isso gera números de 0 a 21599 por período (360 * 60 - 1)
  const numeroSequencial = minutoNoPeriodo * 60 + segundosNoMinuto;
  
  console.log(`Segundos no minuto atual: ${segundosNoMinuto}`);
  console.log(`Número sequencial calculado: ${numeroSequencial}`);
  
  // PASSO 7: Limitar a um range menor para números mais simples
  // Usar apenas os minutos (0-359) para ter números menores
  const numeroFinal = minutoNoPeriodo;
  
  console.log(`Número final (apenas minutos): ${numeroFinal}`);
  console.log('=== FIM GERAÇÃO NÚMERO PEDIDO SIMPLES ===');
  
  return numeroFinal;
}

/**
 * VERSÃO ALTERNATIVA: Números ainda mais simples (0-99)
 * Reinicia a cada 100 minutos dentro do período de 6 horas
 */
async function gerarNumeroPedidoMuitoSimples(csv) {
  const agora = Date.now();
  console.log('=== INÍCIO GERAÇÃO NÚMERO MUITO SIMPLES (0-99) ===');
  
  const dataAtual = lerCelulaC1(csv);
  console.log(`Data na C1: "${dataAtual}"`);
  
  if (!dataValida(dataAtual)) {
    console.log(`Data inválida. Retornando 0.`);
    return 0;
  }
  
  // Converter data para timestamp do início do dia
  const dataObj = new Date(dataAtual + 'T00:00:00.000Z');
  const timestampInicioData = dataObj.getTime();
  
  // Calcular minutos desde o início da data
  const tempoDecorrido = agora - timestampInicioData;
  const minutosDesdeInicio = Math.floor(tempoDecorrido / (60 * 1000));
  
  // Período de 6 horas = 360 minutos
  const MINUTOS_6H = 6 * 60;
  const periodoAtual = Math.floor(minutosDesdeInicio / MINUTOS_6H);
  const minutoNoPeriodo = minutosDesdeInicio % MINUTOS_6H;
  
  // Limitar a 100 números (0-99) por período
  const numeroFinal = minutoNoPeriodo % 100;
  
  console.log(`Período: ${periodoAtual}, Minuto no período: ${minutoNoPeriodo}`);
  console.log(`Número final (0-99): ${numeroFinal}`);
  console.log('=== FIM GERAÇÃO NÚMERO MUITO SIMPLES ===');
  
  return numeroFinal;
}

/**
 * VERSÃO ULTRA SIMPLES: Apenas 0, 1, 2, 3, 4... até 59, depois reinicia
 * Baseado apenas no minuto atual da hora
 */
async function gerarNumeroPedidoUltraSimples(csv) {
  const agora = Date.now();
  console.log('=== INÍCIO GERAÇÃO NÚMERO ULTRA SIMPLES (0-59) ===');
  
  const dataAtual = lerCelulaC1(csv);
  console.log(`Data na C1: "${dataAtual}"`);
  
  if (!dataValida(dataAtual)) {
    console.log(`Data inválida. Retornando 0.`);
    return 0;
  }
  
  // Pegar apenas o minuto atual (0-59)
  const agora_date = new Date();
  const minutoAtual = agora_date.getMinutes();
  
  console.log(`Minuto atual: ${minutoAtual}`);
  console.log(`Número final: ${minutoAtual}`);
  console.log('=== FIM GERAÇÃO NÚMERO ULTRA SIMPLES ===');
  
  return minutoAtual;
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

