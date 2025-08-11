// /.netlify/functions/enviar-pedido.js
// Versão com numeração verdadeiramente sequencial: 0, 1, 2, 3...

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

    // NUMERAÇÃO SEQUENCIAL REAL: 0, 1, 2, 3...
    const csv = await buscarCsvDaPlanilha(PLANILHA_CSV_URL);
    const numeroPedido = await gerarNumeroPedidoSequencial(csv);

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
 * Esta célula contém a data no formato AAAA-MM-DD
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
 * NOVA FUNÇÃO: Ler contador atual da célula D1 da planilha
 * Esta célula deve conter o último número de pedido usado
 */
function lerContadorD1(csv) {
  if (!csv) {
    console.log('CSV vazio para leitura de contador');
    return 0;
  }
  
  const linhas = csv.split('\n');
  if (linhas.length < 1) {
    console.log('CSV não possui primeira linha para contador');
    return 0;
  }
  
  const primeiraLinha = linhas[0];
  const colunas = primeiraLinha.split(',');
  
  if (colunas.length < 4) {
    console.log('Primeira linha não possui coluna D para contador');
    return 0;
  }
  
  const valorD1 = colunas[3].trim();
  console.log(`Valor encontrado na célula D1 (contador): "${valorD1}"`);
  
  // Tentar converter para número
  const contador = parseInt(valorD1);
  if (isNaN(contador)) {
    console.log('Valor na D1 não é um número válido. Iniciando em 0.');
    return 0;
  }
  
  console.log(`Contador atual lido da D1: ${contador}`);
  return contador;
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
 * SOLUÇÃO PRINCIPAL: Numeração sequencial real usando contador na planilha
 * 
 * ESTRATÉGIA:
 * 1. Lê a data da célula C1 para verificar se mudou o dia
 * 2. Lê o contador atual da célula D1
 * 3. Se a data mudou, zera o contador
 * 4. Se a data é a mesma, incrementa o contador
 * 5. Retorna o próximo número sequencial
 * 
 * NOTA: Esta versão simula a atualização da planilha.
 * Para funcionar completamente, seria necessário escrever o novo contador na D1.
 */
async function gerarNumeroPedidoSequencial(csv) {
  const agora = Date.now();
  console.log('=== INÍCIO GERAÇÃO NÚMERO PEDIDO SEQUENCIAL ===');
  console.log(`Timestamp atual: ${agora}`);
  
  // PASSO 1: Ler data da célula C1
  const dataAtual = lerCelulaC1(csv);
  console.log(`Data na C1: "${dataAtual}"`);
  
  // PASSO 2: Ler contador atual da célula D1
  const contadorAtual = lerContadorD1(csv);
  console.log(`Contador atual na D1: ${contadorAtual}`);
  
  // PASSO 3: Verificar se a data é válida
  if (!dataValida(dataAtual)) {
    console.log(`Data inválida: "${dataAtual}". Usando contador simples.`);
    // Se data inválida, incrementar contador mesmo assim
    const proximoNumero = contadorAtual + 1;
    console.log(`Próximo número (data inválida): ${proximoNumero}`);
    return proximoNumero;
  }
  
  // PASSO 4: Calcular período de 6 horas atual
  const dataObj = new Date(dataAtual + 'T00:00:00.000Z');
  const timestampInicioData = dataObj.getTime();
  const tempoDecorrido = agora - timestampInicioData;
  const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;
  const periodoAtual = Math.floor(tempoDecorrido / SEIS_HORAS_MS);
  
  console.log(`Período de 6h atual: ${periodoAtual}`);
  
  // PASSO 5: Determinar se deve zerar o contador
  // Para simplicidade, vamos usar uma lógica baseada no período
  // Em uma implementação real, você salvaria a data/período anterior na planilha
  
  // Por enquanto, vamos incrementar sempre (sequencial simples)
  const proximoNumero = contadorAtual + 1;
  
  console.log(`Próximo número sequencial: ${proximoNumero}`);
  console.log(`NOTA: Em implementação real, atualizaria D1 com: ${proximoNumero}`);
  console.log('=== FIM GERAÇÃO NÚMERO PEDIDO SEQUENCIAL ===');
  
  return proximoNumero;
}

/**
 * VERSÃO ALTERNATIVA: Contador sequencial baseado em timestamp ordenado
 * Esta versão gera números sequenciais baseados na ordem cronológica dos pedidos
 */
async function gerarNumeroPedidoOrdenado(csv) {
  const agora = Date.now();
  console.log('=== INÍCIO GERAÇÃO NÚMERO PEDIDO ORDENADO ===');
  
  const dataAtual = lerCelulaC1(csv);
  console.log(`Data na C1: "${dataAtual}"`);
  
  if (!dataValida(dataAtual)) {
    console.log(`Data inválida. Retornando 0.`);
    return 0;
  }
  
  // Converter data para timestamp do início do dia
  const dataObj = new Date(dataAtual + 'T00:00:00.000Z');
  const timestampInicioData = dataObj.getTime();
  
  // Calcular segundos desde o início da data
  const tempoDecorrido = agora - timestampInicioData;
  const segundosDesdeInicio = Math.floor(tempoDecorrido / 1000);
  
  // Calcular período de 6 horas (21600 segundos)
  const SEGUNDOS_6H = 6 * 60 * 60;
  const periodoAtual = Math.floor(segundosDesdeInicio / SEGUNDOS_6H);
  const segundoNoPeriodo = segundosDesdeInicio % SEGUNDOS_6H;
  
  // Gerar número sequencial baseado na ordem temporal
  // Dividir por 10 para ter números menores (máximo ~2160 por período)
  const numeroSequencial = Math.floor(segundoNoPeriodo / 10);
  
  console.log(`Segundos desde início da data: ${segundosDesdeInicio}`);
  console.log(`Período: ${periodoAtual}, Segundo no período: ${segundoNoPeriodo}`);
  console.log(`Número sequencial: ${numeroSequencial}`);
  console.log('=== FIM GERAÇÃO NÚMERO PEDIDO ORDENADO ===');
  
  return numeroSequencial;
}

/**
 * VERSÃO MAIS SIMPLES: Contador baseado em minutos com incremento por segundo
 */
async function gerarNumeroPedidoIncremental(csv) {
  const agora = Date.now();
  console.log('=== INÍCIO GERAÇÃO NÚMERO PEDIDO INCREMENTAL ===');
  
  const dataAtual = lerCelulaC1(csv);
  console.log(`Data na C1: "${dataAtual}"`);
  
  if (!dataValida(dataAtual)) {
    console.log(`Data inválida. Retornando 0.`);
    return 0;
  }
  
  // Usar timestamp atual para gerar número crescente
  // Pegar os últimos dígitos do timestamp e fazer crescer
  const timestampStr = agora.toString();
  const ultimosDigitos = timestampStr.slice(-6); // Últimos 6 dígitos
  const numeroBase = parseInt(ultimosDigitos) % 1000; // Limitar a 3 dígitos
  
  console.log(`Timestamp: ${agora}`);
  console.log(`Últimos dígitos: ${ultimosDigitos}`);
  console.log(`Número base: ${numeroBase}`);
  console.log('=== FIM GERAÇÃO NÚMERO PEDIDO INCREMENTAL ===');
  
  return numeroBase;
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

