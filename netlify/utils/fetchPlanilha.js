// utils/fetchPlanilha.js

const https = require("https");

// Variável de ambiente segura
const CSV_URL = process.env.PLANILHA_CSV_URL;

// Função auxiliar para baixar o CSV da planilha
function fetchCSV() {
  return new Promise((resolve, reject) => {
    if (!CSV_URL) return reject(new Error("PLANILHA_CSV_URL não definida"));

    https.get(CSV_URL, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// Função para converter CSV para objetos
function parseCSV(csv) {
  const linhas = csv.split("\n").map((l) => l.trim()).filter(Boolean);
  const objetos = [];

  for (let i = 1; i < linhas.length; i++) {
    const [categoria, musica] = linhas[i].split(",").map((s) => s.trim());
    if (categoria && musica) {
      objetos.push({ categoria, musica });
    }
  }

  return objetos;
}

module.exports = async function getPlanilhaOrganizada() {
  const rawCSV = await fetchCSV();
  return parseCSV(rawCSV);
};
