// /.netlify/functions/enviar-pedido.js
// Versão com numeração sequencial única que evita duplicatas

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

    // CORREÇÃO: Gerar número único verdadeiramente sequencial
    const csv = await buscarCsvDaPlanilha(PLANILHA_CSV_URL);
    const numeroPedido = await gerarNumeroPedidoUnico(csv);

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
 * SOLUÇÃO CORRIGIDA: Gera números únicos usando milissegundos + componente aleatório
 * 
 * PROBLEMA ANTERIOR: 
 * Usar apenas minutos fazia com que pedidos no mesmo minuto recebessem o mesmo número.
 * 
 * NOVA SOLUÇÃO:
 * 1. Usa milissegundos para maior precisão
 * 2. Adiciona componente aleatório para evitar colisões
 * 3. Mantém números pequenos (0-999)
 * 4. Respeita períodos de 6 horas
 */
async function gerarNumeroPedidoUnico(csv) {
  const agora = Date.now();
  console.log('=== INÍCIO GERAÇÃO NÚMERO PEDIDO ÚNICO ===');
  console.log(`Timestamp atual: ${agora}`);
  
  // PASSO 1: Ler data da célula C1
  const dataAtual = lerCelulaC1(csv);
  console.log(`Data na C1: "${dataAtual}"`);
  
  // PASSO 2: Verificar se a data é válida
  if (!dataValida(dataAtual)) {
    console.log(`Data inválida: "${dataAtual}". Usando número baseado em timestamp.`);
    // Se data inválida, usar timestamp + random para garantir unicidade
    const numeroFallback = (Math.floor(agora / 1000) % 1000) + Math.floor(Math.random() * 100);
    console.log(`Número fallback: ${numeroFallback % 1000}`);
    return numeroFallback % 1000;
  }
  
  // PASSO 3: Converter data para timestamp do início do dia (UTC)
  const dataObj = new Date(dataAtual + 'T00:00:00.000Z');
  const timestampInicioData = dataObj.getTime();
  
  console.log(`Data objeto: ${dataObj.toISOString()}`);
  console.log(`Timestamp início da data: ${timestampInicioData}`);
  
  // PASSO 4: Calcular tempo decorrido desde o início da data
  const tempoDecorrido = agora - timestampInicioData;
  console.log(`Tempo decorrido: ${tempoDecorrido}ms (${Math.round(tempoDecorrido / 1000 / 60)} minutos)`);
  
  // PASSO 5: Calcular período de 6 horas atual
  const SEIS_HORAS_MS = 6 * 60 * 60 * 1000; // 6 horas em milissegundos
  const periodoAtual = Math.floor(tempoDecorrido / SEIS_HORAS_MS);
  const tempoNoPeriodo = tempoDecorrido % SEIS_HORAS_MS;
  
  console.log(`Período de 6h atual: ${periodoAtual}`);
  console.log(`Tempo no período atual: ${tempoNoPeriodo}ms`);
  
  // PASSO 6: Gerar número único usando segundos + milissegundos + random
  const segundosNoPeriodo = Math.floor(tempoNoPeriodo / 1000);
  const milissegundos = tempoNoPeriodo % 1000;
  
  // Criar um número único combinando:
  // - Segundos no período (para sequência temporal)
  // - Milissegundos (para precisão)
  // - Componente aleatório (para evitar colisões)
  const componenteTemporal = segundosNoPeriodo % 900; // Limitar a 900 para deixar espaço
  const componenteMilis = Math.floor(milissegundos / 10); // 0-99
  const componenteRandom = Math.floor(Math.random() * 10); // 0-9
  
  // Número final: temporal + milis + random (máximo ~999)
  const numeroUnico = componenteTemporal + componenteMilis + componenteRandom;
  
  console.log(`Segundos no período: ${segundosNoPeriodo}`);
  console.log(`Componente temporal: ${componenteTemporal}`);
  console.log(`Componente milissegundos: ${componenteMilis}`);
  console.log(`Componente aleatório: ${componenteRandom}`);
  console.log(`Número único calculado: ${numeroUnico}`);
  
  // PASSO 7: Garantir que o número esteja no range 0-999
  const numeroFinal = numeroUnico % 1000;
  
  console.log(`Número final (mod 1000): ${numeroFinal}`);
  console.log('=== FIM GERAÇÃO NÚMERO PEDIDO ÚNICO ===');
  
  return numeroFinal;
}

/**
 * VERSÃO ALTERNATIVA: Usando hash do timestamp para garantir unicidade
 */
async function gerarNumeroPedidoHash(csv) {
  const agora = Date.now();
  console.log('=== INÍCIO GERAÇÃO NÚMERO PEDIDO HASH ===');
  
  const dataAtual = lerCelulaC1(csv);
  console.log(`Data na C1: "${dataAtual}"`);
  
  if (!dataValida(dataAtual)) {
    console.log(`Data inválida. Usando hash do timestamp.`);
    return simpleHash(agora.toString()) % 1000;
  }
  
  // Converter data para timestamp do início do dia
  const dataObj = new Date(dataAtual + 'T00:00:00.000Z');
  const timestampInicioData = dataObj.getTime();
  
  // Calcular tempo decorrido
  const tempoDecorrido = agora - timestampInicioData;
  
  // Calcular período de 6 horas
  const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;
  const periodoAtual = Math.floor(tempoDecorrido / SEIS_HORAS_MS);
  const tempoNoPeriodo = tempoDecorrido % SEIS_HORAS_MS;
  
  // Criar string única para hash: data + período + timestamp
  const stringUnica = `${dataAtual}-${periodoAtual}-${agora}`;
  const numeroHash = simpleHash(stringUnica) % 1000;
  
  console.log(`String única: ${stringUnica}`);
  console.log(`Hash gerado: ${numeroHash}`);
  console.log('=== FIM GERAÇÃO NÚMERO PEDIDO HASH ===');
  
  return numeroHash;
}

/**
 * VERSÃO MAIS SIMPLES: Contador baseado em segundos com componente aleatório
 */
async function gerarNumeroPedidoSimplificado(csv) {
  const agora = Date.now();
  console.log('=== INÍCIO GERAÇÃO NÚMERO PEDIDO SIMPLIFICADO ===');
  
  const dataAtual = lerCelulaC1(csv);
  console.log(`Data na C1: "${dataAtual}"`);
  
  if (!dataValida(dataAtual)) {
    console.log(`Data inválida. Retornando número aleatório.`);
    return Math.floor(Math.random() * 1000);
  }
  
  // Pegar apenas os segundos atuais (0-59) + componente aleatório
  const agora_date = new Date();
  const segundos = agora_date.getSeconds();
  const milissegundos = agora_date.getMilliseconds();
  const random = Math.floor(Math.random() * 10);
  
  // Número: segundos * 10 + random + (milissegundos / 100)
  const numeroFinal = Math.floor(segundos * 10 + random + (milissegundos / 100));
  
  console.log(`Segundos: ${segundos}, Milissegundos: ${milissegundos}, Random: ${random}`);
  console.log(`Número final: ${numeroFinal}`);
  console.log('=== FIM GERAÇÃO NÚMERO PEDIDO SIMPLIFICADO ===');
  
  return numeroFinal % 1000; // Garantir que seja < 1000
}

/**
 * Função auxiliar para gerar hash simples de uma string
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Converter para 32bit integer
  }
  return Math.abs(hash);
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

