// utils/fetchPlanilha.js

let cache = {
  data: null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos

async function fetchPlanilha() {
  const csvUrl = process.env.PLANILHA_CSV_URL;
  if (!csvUrl) {
    throw new Error('PLANILHA_CSV_URL não definida');
  }

  const agora = Date.now();
  if (cache.data && agora - cache.timestamp < CACHE_DURATION_MS) {
    return cache.data;
  }

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error('Falha ao buscar a planilha');
  }

  const textoCSV = await response.text();
  const linhas = textoCSV
    .trim()
    .split('\n')
    .map(l => l.split(',').map(c => c.trim()));

  const [cabecalho, ...corpo] = linhas;

  const dados = corpo.map(linha => {
    const item = {};
    cabecalho.forEach((col, i) => {
      item[col.toLowerCase()] = linha[i] || '';
    });
    return item;
  });

  cache = {
    data: dados,
    timestamp: agora,
  };

  return dados;
}

module.exports = fetchPlanilha;
