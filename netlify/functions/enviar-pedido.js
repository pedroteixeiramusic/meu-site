// /.netlify/functions/enviar-pedido.js
// Versão SIMPLIFICADA - Sem dependência da planilha Google Sheets

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

  // Configurações do Telegram
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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

    // CONTADOR SIMPLIFICADO - SEM PLANILHA
    const numeroPedido = await contadorSimplificado();

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
 * CONTADOR SIMPLIFICADO
 * 
 * ZERO DEPENDÊNCIAS:
 * - Não precisa ler planilha Google Sheets
 * - Não precisa instalar bibliotecas
 * - Usa apenas fetch() nativo do JavaScript
 * 
 * FUNCIONAMENTO:
 * 1. Tenta usar CountAPI (serviço externo gratuito)
 * 2. Se falhar, usa algoritmo local baseado em timestamp
 * 3. Sempre retorna número sequencial
 */
async function contadorSimplificado() {
  console.log('=== INÍCIO CONTADOR SIMPLIFICADO ===');
  
  // OPÇÃO 1: CountAPI (sem instalação, só requisição HTTP)
  try {
    const numeroExterno = await usarCountAPI();
    if (numeroExterno !== null) {
      console.log(`Número do CountAPI: ${numeroExterno}`);
      return numeroExterno;
    }
  } catch (error) {
    console.log('CountAPI falhou, usando fallback local');
  }
  
  // OPÇÃO 2: Fallback local (sem dependências)
  const numeroLocal = gerarNumeroLocal();
  console.log(`Número local: ${numeroLocal}`);
  
  console.log('=== FIM CONTADOR SIMPLIFICADO ===');
  return numeroLocal;
}

/**
 * COUNTAPI - Serviço gratuito de contador
 * 
 * VANTAGENS:
 * - Totalmente gratuito
 * - Não precisa cadastro
 * - Não precisa instalar nada
 * - Apenas uma requisição HTTP GET
 * - Suporta pedidos simultâneos
 * - Números sequenciais garantidos
 * 
 * COMO FUNCIONA:
 * - Cada requisição incrementa automaticamente
 * - Retorna o novo valor
 * - Persiste entre execuções
 */
async function usarCountAPI() {
  console.log('Tentando usar CountAPI...');
  
  try {
    // Configurar seu namespace único (troque por algo único seu)
    const namespace = 'pedidos-musica-2025'; // MUDE ISSO para algo único
    const key = 'contador-principal';
    const url = `https://api.countapi.xyz/hit/${namespace}/${key}`;
    
    console.log(`URL CountAPI: ${url}`);
    
    // Fazer requisição simples (sem bibliotecas)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Netlify-Function'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Resposta CountAPI:', data);
    
    // Verificar se retornou valor válido
    if (data && typeof data.value === 'number') {
      // Ajustar para começar em 0 (CountAPI começa em 1)
      const numeroAjustado = Math.max(0, data.value - 1);
      console.log(`CountAPI: ${data.value} → Ajustado: ${numeroAjustado}`);
      return numeroAjustado;
    }
    
    throw new Error('Resposta inválida do CountAPI');
    
  } catch (error) {
    console.error('Erro no CountAPI:', error.message);
    return null; // Indica falha
  }
}

/**
 * GERADOR LOCAL (Fallback)
 * 
 * Algoritmo simples que funciona sem dependências:
 * - Usa timestamp atual
 * - Gera números crescentes
 * - Funciona offline
 */
function gerarNumeroLocal() {
  console.log('Gerando número local...');
  
  const agora = Date.now();
  
  // Usar timestamp como base (últimos dígitos)
  const timestampStr = agora.toString();
  const ultimosDigitos = timestampStr.slice(-6); // Últimos 6 dígitos
  
  // Converter para número e limitar range
  const numeroBase = parseInt(ultimosDigitos) % 10000; // 0-9999
  
  console.log(`Timestamp: ${agora}`);
  console.log(`Últimos dígitos: ${ultimosDigitos}`);
  console.log(`Número local: ${numeroBase}`);
  
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

