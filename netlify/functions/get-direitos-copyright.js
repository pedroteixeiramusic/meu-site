const fetch = require("node-fetch");
const Papa = require("papaparse");
const fs = require("fs");
const path = require("path");

const CACHE_DURATION_MS = 15 * 60 * 1000;
let cache = null;
let lastFetchTime = 0;

function normalize(text = "") {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[çÇ]/g, "c")
    .toLowerCase();
}

function parseCSVToJson(csv) {
  const parsed = Papa.parse(csv, { header: true });
  const data = parsed.data;

  const primeiraLinha = data[0]; // objeto com todas as células da linha 1
const valoresLinha1 = Object.values(primeiraLinha).map(v => normalize(v));

if (valoresLinha1.includes("off")) {
  return { status: "off" };
}

  const categorias = {};
  for (const row of data) {
    const categoria = row["categoria"]?.trim();
    const musica = row["música"]?.trim();
    if (!categoria || !musica) continue;

    if (!categorias[categoria]) categorias[categoria] = [];
    categorias[categoria].push(musica);
  }

  // Ordena as músicas de cada categoria
  for (const cat in categorias) {
    categorias[cat].sort((a, b) => normalize(a).localeCompare(normalize(b)));
  }

  return { status: "ok", categorias };
}

exports.handler = async function () {
  const now = Date.now();
  const isCacheValid = cache && now - lastFetchTime < CACHE_DURATION_MS;

  if (isCacheValid) {
    return {
      statusCode: 200,
      body: JSON.stringify(cache),
      headers: { "Cache-Control": "public, max-age=0" }
    };
  }

  try {
    const url = process.env.SHEET_URL;
    const response = await fetch(url);
    const text = await response.text();

    const json = parseCSVToJson(text);
    cache = json;
    lastFetchTime = now;

    return {
      statusCode: 200,
      body: JSON.stringify(json)
    };
  } catch (err) {
    console.error("Erro ao buscar planilha:", err);

    if (cache) {
      return {
        statusCode: 200,
        body: JSON.stringify(cache)
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falha ao carregar dados." })
    };
  }
};
