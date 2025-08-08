// === fetch-planilhas.js ===
const fetch = require("node-fetch");
const Papa = require("papaparse");

let cache = { data: null, timestamp: 0 };
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutos

async function fetchPlanilha() {
  if (cache.data && Date.now() - cache.timestamp < CACHE_DURATION) {
    return cache.data;
  }

  const url = "URL_DO_SEU_CSV"; // Substitua pela URL real
  const response = await fetch(url);
  const csv = await response.text();
  const parsed = Papa.parse(csv, { skipEmptyLines: true }).data;

  // Verifica se qualquer célula da primeira linha contém "off" (case-insensitive)
  const primeiraLinha = parsed[0] || [];
  const repertorioOff = primeiraLinha.some(cel => (cel || "").toLowerCase().includes("off"));

  // Filtra somente linhas com categoria e música
  const linhas = parsed
    .map(l => [l[0]?.trim(), l[1]?.trim()])
    .filter(l => l[0] && l[1]);

  const dados = {
    linhas,
    repertorioOff
  };

  cache = {
    data: dados,
    timestamp: Date.now()
  };

  return dados;
}

module.exports = fetchPlanilha;
