// netlify/functions/enviar-pedido.js
exports.handler = async (event, context) => {
  // Headers CORS para permitir acesso do frontend
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Responder a requisições OPTIONS (preflight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Apenas aceitar requisições POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    // Credenciais protegidas em variáveis de ambiente
    const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    // Verificar se as variáveis estão configuradas
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Variáveis de ambiente do Telegram não configuradas');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Configuração do servidor incompleta' 
        })
      };
    }

    // Parse dos dados enviados pelo frontend
    const { textoLindo } = JSON.parse(event.body);
    
    if (!textoLindo) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Mensagem não fornecida' 
        })
      };
    }

    console.log('Enviando pedido para Telegram...');

    // Enviar mensagem para o Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: textoLindo,
        parse_mode: 'Markdown'
      })
    });

    // Verificar se a resposta HTTP foi bem-sucedida
    if (!telegramResponse.ok) {
      throw new Error(`Erro HTTP do Telegram: ${telegramResponse.status}`);
    }

    // Verificar se a resposta da API do Telegram indica sucesso
    const telegramResult = await telegramResponse.json();
    if (!telegramResult.ok) {
      throw new Error(`Erro da API do Telegram: ${telegramResult.description || 'Erro desconhecido'}`);
    }

    console.log('Pedido enviado com sucesso para Telegram');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Pedido enviado com sucesso!' 
      })
    };

  } catch (error) {
    console.error('Erro na função enviar-pedido:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
};
