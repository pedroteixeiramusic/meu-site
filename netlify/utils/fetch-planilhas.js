// === fetch-planilhas.js ===
const fetch = require("node-fetch");
const Papa = require("papaparse");

let cache = { data: null, timestamp: 0 };
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutos

// Função auxiliar para esperar alguns ms (usada no retry)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função auxiliar com retry
async function fetchComRetry(url, tentativas = 3, esperaMs = 500) {
  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.text();
    } catch (err) {
      ultimoErro = err;
      console.warn(`Tentativa ${i + 1} falhou: ${err.message}`);
      if (i < tentativas - 1) await delay(esperaMs);
    }
  }
  throw ultimoErro;
}

async function fetchPlanilha() {
  // Retorna do cache se ainda válido
  if (cache.data && Date.now() - cache.timestamp < CACHE_DURATION) {
    return cache.data;
  }

  const url = process.env.PLANILHA_CSV_URL;
  if (!url) {
    console.error("❌ Variável de ambiente PLANILHA_CSV_URL não configurada.");
    return { linhas: [], disponivel: false, erro: true };
  }

  try {
    // Busca o CSV com retry
    const csv = await fetchComRetry(url);

    // Faz o parse
    const parsed = Papa.parse(csv, { skipEmptyLines: true }).data;

    // Verifica se a primeira linha contém "off" (case-insensitive)
    const primeiraLinha = parsed[0] || [];
    const repertorioOff = primeiraLinha.some(cel => (cel || "").toLowerCase().includes("off"));

    // Ignora a primeira linha (cabeçalho)
    const dadosLinhas = parsed.slice(1);

    // Filtra linhas válidas: [categoria, música]
    const linhas = dadosLinhas
      .map(l => [l[0]?.trim(), l[1]?.trim()])
      .filter(l => l[0] && l[1]);

    // Monta dados finais
    const dados = {
      linhas,
      disponivel: !repertorioOff,
      erro: false
    };

    // Atualiza cache
    cache = { data: dados, timestamp: Date.now() };

    return dados;

  } catch (err) {
    console.error("❌ Erro ao buscar planilha:", err.message);

    // Se já existe cache, retorna ele como fallback
    if (cache.data) {
      console.warn("⚠️ Usando dados do cache como fallback.");
      return cache.data;
    }

    // Fallback seguro se não houver cache
    return { linhas: [], disponivel: false, erro: true };
  }
}

module.exports = fetchPlanilha;
