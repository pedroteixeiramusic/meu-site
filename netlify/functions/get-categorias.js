// functions/get-categorias.js

const fetchPlanilha = require('../utils/fetchPlanilha');

exports.handler = async function () {
  try {
    const dados = await fetchPlanilha();
    const categoriasSet = new Set();

    for (const linha of dados) {
      const categoria = linha['categoria'];
      const musica = linha['música']; // <- agora com acento

      if (categoria && musica && musica !== 'off') {
        categoriasSet.add(categoria);
      }
    }

    const categorias = Array.from(categoriasSet).sort();

    return {
      statusCode: 200,
      body: JSON.stringify({ categorias }),
    };
  } catch (erro) {
    console.error('Erro ao obter categorias:', erro);
    return {
      statusCode: 500,
      body: JSON.stringify({ erro: 'Erro ao carregar categorias' }),
    };
  }
};
