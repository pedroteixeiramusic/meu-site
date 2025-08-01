// netlify/functions/get-app-config.js
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Configurações da aplicação (antes expostas no frontend)
    const config = {
      cacheTimeout: 600000, // 10 minutos
      retryAttempts: 3,
      retryDelays: [3000, 6000],
      requestTimeout: 15000,
      version: '2.0'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(config)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno do servidor' })
    };
  }
};
