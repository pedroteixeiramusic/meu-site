const https = require('https');
const Papa = require('papaparse');

let cache = {
  data: null,
  timestamp: 0,
};

const CSV_URL = process.env.CSV_URL;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutos

function baixarCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCSV(csv) {
  return Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
  }).data;
}

exports.handler = async function (event) {
  const categoriaParam = event.queryStringParameters?.categoria;
  if (!categoriaParam) {
    return {
      statusCode: 400,
      body: JSON.stringify({ erro: 'Categoria não informada' }),
    };
  }

  try {
    const agora = Date.now();
    if (!cache.data || agora - cache.timestamp > CACHE_DURATION) {
      const csv = await baixarCSV(CSV_URL);
      cache.data = parseCSV(csv);
      cache.timestamp = agora;
    }

    const musicas = cache.data
      .filter(item => item['Categoria']?.trim() === categoriaParam)
      .map(item => item['Título']?.trim())
      .filter(Boolean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lista: musicas }),
    };
  } catch (erro) {
    return {
      statusCode: 500,
      body: JSON.stringify({ erro: 'Erro ao processar dados' }),
    };
  }
};
