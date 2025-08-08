const fetchPlanilha = require("../utils/fetch-planilhas");

exports.handler = async function(event, context) {
  try {
    const query = event.queryStringParameters || {};
    const categoria = query.categoria || "";

    const dados = await fetchPlanilha();

    if (!dados.disponivel) {
      // Repertório off - retorna array vazio
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([])
      };
    }

    // Filtra músicas da categoria e ordena alfabeticamente
    const musicas = dados.linhas
      .filter(l => l[0].toLowerCase() === categoria.toLowerCase())
      .map(l => l[1])
      .sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(musicas)
    };
  } catch (err) {
    // Fallback seguro em caso de erro
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([])
    };
  }
};
