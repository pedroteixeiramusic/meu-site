// functions/get-categorias.js

const getPlanilhaOrganizada = require("../utils/fetchPlanilha");

exports.handler = async function () {
  try {
    const dados = await getPlanilhaOrganizada();
    const categoriasSet = new Set();

    for (const item of dados) {
      if (item.categoria) categoriasSet.add(item.categoria.trim());
    }

    const categorias = Array.from(categoriasSet).sort();

    return {
      statusCode: 200,
      body: JSON.stringify({ categorias }),
    };
  } catch (error) {
    console.error("Erro ao obter categorias:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao obter categorias" }),
    };
  }
};
