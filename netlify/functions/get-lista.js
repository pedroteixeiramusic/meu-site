// functions/get-lista.js

const fetchPlanilha = require('../utils/fetchPlanilha');

exports.handler = async function (event) {
  const categoriaAlvo = event.queryStringParameters?.categoria;

  if (!categoriaAlvo) {
    return {
      statusCode: 400,
      body: JSON.stringify({ erro: 'Categoria não especificada' }),
    };
  }

  try {
    const dados = await fetchPlanilha();

    const lista = dados
      .filter(linha =>
        linha['categoria'] === categoriaAlvo &&
        linha['música'] &&
        linha['música'] !== 'off'
      )
      .map(linha => linha['música']) // agora acessando com colchetes e acento
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return {
      statusCode: 200,
      body: JSON.stringify({ lista }),
    };
  } catch (erro) {
    console.error('Erro ao obter lista:', erro);
    return {
      statusCode: 500,
      body: JSON.stringify({ erro: 'Erro ao carregar lista' }),
    };
  }
};
