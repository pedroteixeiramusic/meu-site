// /.netlify/functions/update-contador.js
// Versão CommonJS compatível com Netlify

const { google } = require("googleapis");

exports.handler = async (event) => {
  // Log de início da função
  console.log('[update-contador] Função iniciada');
  console.log('[update-contador] Método HTTP:', event.httpMethod);
  console.log('[update-contador] Headers recebidos:', JSON.stringify(event.headers, null, 2));

  try {
    // Só permite POST para evitar chamadas não autorizadas por GET
    if (event.httpMethod !== "POST") {
      console.error('[update-contador] Método não permitido:', event.httpMethod);
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Método não permitido" }),
      };
    }

    // Chave secreta simples para evitar chamadas externas
    const AUTH_KEY = process.env.COUNTER_AUTH_KEY;
    const providedKey = event.headers["x-auth-key"];

    console.log('[update-contador] Verificando autenticação...');
    console.log('[update-contador] AUTH_KEY configurada:', !!AUTH_KEY);
    console.log('[update-contador] Chave fornecida:', !!providedKey);

    if (!providedKey || providedKey !== AUTH_KEY) {
      console.error('[update-contador] Falha na autenticação');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Não autorizado" }),
      };
    }

    console.log('[update-contador] Autenticação bem-sucedida');

    // Parse do corpo da requisição
    const requestBody = event.body || "{}";
    console.log('[update-contador] Corpo da requisição:', requestBody);
    
    const { musica } = JSON.parse(requestBody);

    if (!musica) {
      console.error('[update-contador] Nome da música não fornecido');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nome da música é obrigatório" }),
      };
    }

    console.log(`[update-contador] Processando música: "${musica}"`);

    // Validação das variáveis de ambiente do Google
    const requiredEnvVars = [
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'GOOGLE_PRIVATE_KEY',
      'SHEET_ID_CONTADOR'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.error(`[update-contador] Variável de ambiente não configurada: ${envVar}`);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Configuração incompleta: ${envVar}` }),
        };
      }
    }

    console.log('[update-contador] Configurando autenticação Google Sheets...');

    // Configura autenticação Google Sheets
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    const SPREADSHEET_ID = process.env.SHEET_ID_CONTADOR; // Planilha exclusiva do contador
    const RANGE = "Contador!A:C"; // Coluna A = música, B = contador, C = data/hora

    console.log(`[update-contador] Lendo planilha ${SPREADSHEET_ID}, range: ${RANGE}`);

    // Lê a planilha atual
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = res.data.values || [];
    console.log(`[update-contador] Planilha lida com sucesso. ${rows.length} linhas encontradas`);

    let updated = false;
    let musicaEncontrada = false;

    // Procura a música (case-insensitive, mas mantém nome original)
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] && rows[i][0].toLowerCase() === musica.toLowerCase()) {
        musicaEncontrada = true;
        const countAtual = parseInt(rows[i][1] || "0", 10);
        const novoCount = countAtual + 1;
        
        console.log(`[update-contador] Música encontrada na linha ${i + 1}. Contador atual: ${countAtual}, novo: ${novoCount}`);

        // Atualiza o contador
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Contador!B${i + 1}`,
          valueInputOption: "RAW",
          requestBody: { values: [[novoCount]] },
        });

        // Atualiza a data/hora da última solicitação
        const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Contador!C${i + 1}`,
          valueInputOption: "RAW",
          requestBody: { values: [[agora]] },
        });

        console.log(`✅ [update-contador] Contador atualizado com sucesso para "${musica}": ${novoCount}`);
        updated = true;
        break;
      }
    }

    // Se não achou, cria nova linha
    if (!updated) {
      console.log(`[update-contador] Música "${musica}" não encontrada. Criando nova entrada...`);
      
      const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: RANGE,
        valueInputOption: "RAW",
        requestBody: { 
          values: [[musica, 1, agora]] // música, contador inicial 1, data/hora
        },
      });

      console.log(`✅ [update-contador] Nova entrada criada para "${musica}" com contador inicial 1`);
    }

    console.log('[update-contador] Processamento concluído com sucesso');

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: "Contador atualizado",
        musica: musica,
        acao: updated ? "incrementado" : "criado",
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error("❌ [update-contador] Erro no processamento:", error);
    console.error("❌ [update-contador] Stack trace:", error.stack);
    
    // Retorna erro mais detalhado para debug
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Erro interno",
        message: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};

