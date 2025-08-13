// /.netlify/functions/enviar-pedido.js
// Nova implementação com toda a lógica movida do frontend

exports.handler = async (event, context) => {
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

    // Gerar número do pedido (lógica movida do frontend)
    const numeroPedido = await gerarNumeroPedido();

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

let contador = 0;
let dataAtual = new Date().toISOString().slice(0, 10);

async function gerarNumeroPedido() {
  const hoje = new Date().toISOString().slice(0, 10);
  if (hoje !== dataAtual) {
    contador = 0;
    dataAtual = hoje;
  }
  return contador++;  // retorna o número atual e incrementa para o próximo
}

// Função para enviar ao Telegram COM RETRY
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
        // Chama o contador antes de retornar
  await fetch(`${process.env.URL_BASE}/.netlify/functions/update-contador`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-auth-key": process.env.COUNTER_AUTH_KEY,
    },
    body: JSON.stringify({ musica: dados.musica }), // precisa ter o nome da música aqui disponível
  });
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

// Função auxiliar para aguardar
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
