// /.netlify/functions/enviar-pedido.js
// Implementação corrigida com numeração sequencial global e verificação de data na célula C1

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

    // CORREÇÃO: Buscar CSV da planilha e gerar número do pedido corretamente
    const csv = await buscarCsvDaPlanilha(PLANILHA_CSV_URL);
    const numeroPedido = await gerarNumeroPedido(csv);

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
 * CORREÇÃO: Função para buscar CSV da planilha Google Sheets
 * Agora recebe a URL como parâmetro para evitar erro de variável não definida
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
 * Cache global para controle de numeração sequencial
 * Mantém estado entre diferentes execuções da função
 */
let cache = {
  dataCache: null,        // Data atual armazenada no cache
  contador: 0,           // Contador sequencial global
  ultimoTimestamp: 0     // Timestamp da última atualização do cache
};

// Duração do cache: 6 horas em milissegundos
const CACHE_DURACAO_MS = 6 * 60 * 60 * 1000;

/**
 * CORREÇÃO: Função para ler a célula C1 da planilha (primeira linha, terceira coluna)
 * Lê especificamente a primeira linha e terceira coluna conforme especificado
 */
function lerCelulaC1(csv) {
  if (!csv) {
    console.log('CSV vazio ou inválido');
    return '';
  }
  
  const linhas = csv.split('\n');
  console.log(`Total de linhas no CSV: ${linhas.length}`);
  
  // Verificar se existe a primeira linha (índice 0)
  if (linhas.length < 1) {
    console.log('CSV não possui primeira linha');
    return '';
  }
  
  // Pegar a primeira linha (índice 0)
  const primeiraLinha = linhas[0];
  const colunas = primeiraLinha.split(',');
  console.log(`Colunas na primeira linha: ${colunas.length}`);
  
  // Verificar se existe a coluna C (índice 2)
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
 * Verifica tanto o formato quanto se é uma data válida
 */
function dataValida(dataStr) {
  // Verificar formato AAAA-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dataStr)) {
    console.log(`Formato de data inválido: "${dataStr}"`);
    return false;
  }
  
  // Verificar se é uma data válida
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
 * CORREÇÃO: Função principal para gerar número sequencial do pedido
 * Implementa lógica de cache de 6 horas e verificação de data na célula C1
 */
async function gerarNumeroPedido(csv) {
  const agora = Date.now();
  console.log('=== INÍCIO GERAÇÃO NÚMERO PEDIDO ===');
  console.log(`Timestamp atual: ${agora}`);
  console.log(`Cache atual - Data: ${cache.dataCache}, Contador: ${cache.contador}, Último timestamp: ${cache.ultimoTimestamp}`);
  
  // VERIFICAÇÃO 1: Cache ainda válido (menos de 6 horas)?
  const cacheValido = cache.dataCache && (agora - cache.ultimoTimestamp) < CACHE_DURACAO_MS;
  console.log(`Cache válido (< 6h): ${cacheValido}`);
  
  if (cacheValido) {
    // Cache ainda válido, apenas incrementar contador
    cache.contador++;
    const numeroAtual = cache.contador;
    console.log(`Usando cache válido. Novo número: ${numeroAtual}`);
    console.log('=== FIM GERAÇÃO NÚMERO PEDIDO ===');
    return numeroAtual;
  }
  
  // VERIFICAÇÃO 2: Cache expirado ou inexistente, verificar célula C1
  console.log('Cache expirado ou inexistente. Verificando célula C1...');
  const valorC1 = lerCelulaC1(csv);
  
  // VERIFICAÇÃO 3: Valor da célula C1 é uma data válida?
  if (dataValida(valorC1)) {
    console.log(`Data válida encontrada na C1: ${valorC1}`);
    
    // VERIFICAÇÃO 4: É a mesma data do cache anterior?
    if (valorC1 === cache.dataCache) {
      // Mesma data, continuar contagem
      cache.contador++;
      console.log(`Mesma data do cache. Continuando contagem: ${cache.contador}`);
    } else {
      // Data diferente, zerar contador
      cache.contador = 1; // CORREÇÃO: Começar em 1, não 0
      cache.dataCache = valorC1;
      console.log(`Data diferente. Zerando contador. Nova data: ${valorC1}, Contador: ${cache.contador}`);
    }
  } else {
    // Valor inválido na C1, zerar tudo
    console.log(`Valor inválido na C1: "${valorC1}". Zerando cache.`);
    cache.contador = 1; // CORREÇÃO: Começar em 1, não 0
    cache.dataCache = null;
  }
  
  // Atualizar timestamp do cache
  cache.ultimoTimestamp = agora;
  
  const numeroFinal = cache.contador;
  console.log(`Número final do pedido: ${numeroFinal}`);
  console.log(`Cache atualizado - Data: ${cache.dataCache}, Contador: ${cache.contador}, Timestamp: ${cache.ultimoTimestamp}`);
  console.log('=== FIM GERAÇÃO NÚMERO PEDIDO ===');
  
  return numeroFinal;
}

/**
 * Função para enviar mensagem ao Telegram com sistema de retry
 * Implementa múltiplas tentativas com delays progressivos
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
        
        // Se for erro de rate limit, aguardar mais tempo
        if (response.status === 429) {
          const retryAfter = data.parameters?.retry_after || 1;
          console.log(`⏳ Rate limit detectado. Aguardando ${retryAfter} segundos...`);
          await sleep(retryAfter * 1000);
        } else if (tentativa < maxTentativas) {
          // Para outros erros, aguardar tempo progressivo
          const delayMs = tentativa * 1000; // 1s, 2s, 3s...
          console.log(`⏳ Aguardando ${delayMs}ms antes da próxima tentativa...`);
          await sleep(delayMs);
        }
      }
    } catch (error) {
      console.error(`❌ Erro de rede na tentativa ${tentativa}:`, error);
      
      if (tentativa < maxTentativas) {
        const delayMs = tentativa * 2000; // 2s, 4s, 6s...
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

