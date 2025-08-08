// === get-categorias.js ===
const fetchPlanilha = require('../utils/fetch-planilhas');

// Esta função organiza e retorna as categorias únicas da planilha
exports.handler = async function () {
  try {
    const { linhas, repertorioOff } = await fetchPlanilha();

    if (repertorioOff) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "off" })
      };
    }

    const categorias = Array.from(new Set(
      linhas.map(([categoria]) => categoria.trim())
    ));

    return {
      statusCode: 200,
      body: JSON.stringify(categorias)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao carregar categorias." })
    };
  }
};
