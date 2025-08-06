const fetch = require('node-fetch');
const Papa = require('papaparse');

let cache = {
  timestamp: 0,
  data: null
};

exports.handler = async function () {
  const CACHE_DURATION = 15 * 60 * 1000; // 15 minutos
  const now = Date.now();

  if (cache.data && now - cache.timestamp < CACHE_DURATION) {
    return {
      statusCode: 200,
      body: JSON.stringify(cache.data)
    };
  }

  const CSV_URL = process.env.CSV_URL;
  if (!CSV_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'CSV_URL não está definida no ambiente.' })
    };
  }

  try {
    const response = await fetch(CSV_URL);
    const csvText = await response.text();

    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });

    const linhas = parsed.data;

    // Verifica a palavra "off" em qualquer célula da primeira linha
    let pedidosMusicaAtivos = true; // default ativo
    if (linhas.length > 0) {
      const primeiraLinha = linhas[0];
      const valoresPrimeiraLinha = Object.values(primeiraLinha).map(v => (v || '').toString().toLowerCase());
      if (valoresPrimeiraLinha.some(celula => celula.includes('off'))) {
        pedidosMusicaAtivos = false;
      }
    }

    // Organização por categorias
    const musicasPorCategoria = {};
    const categoriasSet = new Set();

    linhas.forEach(linha => {
      const categoria = linha['categoria']?.trim();
      const titulo = linha['musica']?.trim();

      if (!categoria || !titulo) return;

      categoriasSet.add(categoria);

      if (!musicasPorCategoria[categoria]) {
        musicasPorCategoria[categoria] = [];
      }

      musicasPorCategoria[categoria].push({ titulo, categoria });
    });

    for (const cat in musicasPorCategoria) {
      musicasPorCategoria[cat].sort((a, b) => a.titulo.localeCompare(b.titulo));
    }

    const categoriasOrdenadas = Array.from(categoriasSet).sort((a, b) => a.localeCompare(b));

    const resultado = {
      categorias: categoriasOrdenadas,
      musicas: musicasPorCategoria,
      pedidosMusicaAtivos
    };

    cache = {
      timestamp: now,
      data: resultado
    };

    return {
      statusCode: 200,
      body: JSON.stringify(resultado)
    };
  } catch (err) {
    console.error('Erro ao carregar ou processar CSV:', err);

    if (cache.data) {
      return {
        statusCode: 200,
        body: JSON.stringify(cache.data)
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao buscar e processar o CSV.' })
    };
  }
};
