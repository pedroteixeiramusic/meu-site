// functions/get-lista.js

const getPlanilhaOrganizada = require("../utils/fetchPlanilha");

exports.handler = async function (event) {
  const categoria = decodeURIComponent(event.queryStringParameters?.categoria || "").trim();

  if (!categoria) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Categoria não fornecida" }),
    };
  }

  try {
    const dados = await getPlanilhaOrganizada();
    const musicas = dados
      .filter((item) => item.categoria === categoria)
      .map((item) => item.musica)
      .sort();

    return {
      statusCode: 200,
      body: JSON.stringify({ lista: musicas }),
    };
  } catch (error) {
    console.error("Erro ao obter lista:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao obter lista de músicas" }),
    };
  }
};
