// netlify/functions/get-songs.js
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
    const { categoria } = event.queryStringParameters || {};
    
    if (!categoria) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Categoria não fornecida' })
      };
    }

    // Buscar dados (mesmo processo da API de categorias)
    const SHEET_URL = process.env.GOOGLE_SHEETS_URL || '/api/get-sheet-data';
    
const SITE_URL = `https://${event.headers.host}`;
const response = await fetch(`${SITE_URL}/api/get-sheet-data`, {
      headers: { 'User-Agent': 'Netlify-Function' }
    });
    
    if (!response.ok) {
      throw new Error('Erro ao buscar dados');
    }
    
    const csvText = await response.text();
    
    // Processar CSV (mesmo código da API anterior)
    const linhas = csvText.split('\n').filter(linha => linha.trim() !== '');
    const dadosProcessados = [];
    
    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (!linha) continue;
      
      const campos = [];
      let campoAtual = '';
      let dentroDeAspas = false;
      
      for (let j = 0; j < linha.length; j++) {
        const char = linha[j];
        if (char === '"') {
          dentroDeAspas = !dentroDeAspas;
        } else if (char === ',' && !dentroDeAspas) {
          campos.push(campoAtual.trim());
          campoAtual = '';
        } else {
          campoAtual += char;
        }
      }
      campos.push(campoAtual.trim());
      
      if (campos.length >= 2) {
        const cat = campos[0].replace(/^"|"$/g, '').trim();
        const musica = campos[1].replace(/^"|"$/g, '').trim();
        
        if (cat && musica) {
          dadosProcessados.push({ categoria: cat, musica });
        }
      }
    }
    
    // Filtrar por categoria e ordenar (lógica antes no frontend)
    const musicasCategoria = dadosProcessados
      .filter(item => item.categoria === categoria)
      .sort((a, b) => a.musica.localeCompare(b.musica));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ musicas: musicasCategoria })
    };

  } catch (error) {
    console.error('Erro ao buscar músicas:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno do servidor' })
    };
  }
};
