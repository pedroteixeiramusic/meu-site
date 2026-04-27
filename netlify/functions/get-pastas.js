const rateLimit = require('./utils/rateLimit');
const fetchPlanilha = require("../utils/fetch-planilhas");

exports.handler = async function(event, context) {
  // 🔒 RATE LIMIT (colocar aqui)
  const ip = event.headers['x-forwarded-for'] || 'unknown';

  const allowed = rateLimit(ip, 150, 60000);

  if (!allowed) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: "Muitas requisições" })
    };
  }
  try {
    const dados = await fetchPlanilha();

    // Extrai categorias únicas e ordena alfabeticamente
    const categoriasSet = new Set(dados.linhas.map(l => l[0]));
    const categorias = Array.from(categoriasSet).sort((a, b) =>
      a.localeCompare(b, "pt", { sensitivity: "base" })
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: categorias,
        disponivel: dados.disponivel
      })
    };
  } catch (err) {
    // Fallback seguro em caso de erro
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [],
        disponivel: false
      })
    };
  }
};
