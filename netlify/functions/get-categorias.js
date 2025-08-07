// Arquivo: get-categorias.js

const fetch = require('node-fetch');
let cache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutos

exports.handler = async () => {
  try {
    const agora = Date.now();
    if (cache && cacheTimestamp && agora - cacheTimestamp < CACHE_DURATION) {
      return {
        statusCode: 200,
        body: JSON.stringify({ categorias: Object.keys(cache) })
      };
    }

    const url = 'URL_DO_CSV_PUBLICO'; // Substitua aqui pelo link correto do CSV
    const response = await fetch(url);
    const csv = await response.text();

    const linhas = csv.trim().split('\n');
    const dados = linhas.slice(1).map(l => l.split(','));

    const categorias = {};
    for (const [cat, titulo] of dados) {
      if (!categorias[cat]) categorias[cat] = [];
      categorias[cat].push(titulo);
    }

    cache = categorias;
    cacheTimestamp = agora;

    return {
      statusCode: 200,
      body: JSON.stringify({ categorias: Object.keys(categorias) })
    };
  } catch (erro) {
    return {
      statusCode: 500,
      body: JSON.stringify({ erro: 'Erro ao carregar categorias' })
    };
  }
};

// O front-end usará /get-categorias para exibir os nomes das categorias
// O CSV deve conter ao menos duas colunas: categoria e título
