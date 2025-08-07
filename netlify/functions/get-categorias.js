// Arquivo: get-categorias.js

const fetch = require('node-fetch');

let cache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutos

exports.handler = async () => {
  try {
    const agora = Date.now();

    // Retorna cache se estiver válido
    if (cache && cacheTimestamp && agora - cacheTimestamp < CACHE_DURATION) {
      return {
        statusCode: 200,
        body: JSON.stringify({ categorias: Object.keys(cache) })
      };
    }

    const url = process.env.CSV_URL; // <- Agora pega da variável de ambiente

    if (!url) {
      throw new Error('CSV_URL não definida nas variáveis de ambiente');
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Falha ao buscar CSV: ${response.statusText}`);
    }

    const csv = await response.text();

    const linhas = csv.trim().split('\n');
    const dados = linhas.slice(1).map(l => l.split(','));

    const categorias = {};
    for (const [cat, titulo] of dados) {
      if (!categorias[cat]) categorias[cat] = [];
      categorias[cat].push(titulo);
    }

    // Armazena cache
    cache = categorias;
    cacheTimestamp = agora;

    return {
      statusCode: 200,
      body: JSON.stringify({ categorias: Object.keys(categorias) })
    };
  } catch (erro) {
    console.error(erro);
    return {
      statusCode: 500,
      body: JSON.stringify({ erro: 'Erro ao carregar categorias' })
    };
  }
};
