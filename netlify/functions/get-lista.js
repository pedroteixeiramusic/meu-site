const fetchPlanilha = require("../utils/fetch-planilhas");

exports.handler = async function(event, context) {
  try {
    const query = event.queryStringParameters || {};
    const categoria = query.categoria || "";

    console.log("Categoria recebida:", categoria);

    const dados = await fetchPlanilha();

    console.log("Linhas carregadas:", dados.linhas);

    if (!dados.disponivel) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([])
      };
    }

    const musicas = dados.linhas
      .filter(l => l[0]?.trim().toLowerCase() === categoria.trim().toLowerCase())
      .map(l => l[1])
      .sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(musicas)
    };
  } catch (err) {
    console.error("Erro get-lista:", err);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([])
    };
  }
};
