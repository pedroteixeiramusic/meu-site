// netlify/functions/update-contador.js

import { google } from "googleapis";

export async function handler(event) {
  try {
    // Só permite POST para evitar chamadas não autorizadas por GET
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Método não permitido" }),
      };
    }

    // Chave secreta simples para evitar chamadas externas
    const AUTH_KEY = process.env.COUNTER_AUTH_KEY;
    const providedKey = event.headers["x-auth-key"];

    if (!providedKey || providedKey !== AUTH_KEY) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Não autorizado" }),
      };
    }

    const { musica } = JSON.parse(event.body || "{}");

    if (!musica) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nome da música é obrigatório" }),
      };
    }

    // Configura autenticação Google Sheets
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    const SPREADSHEET_ID = process.env.SHEET_ID_CONTADOR; // Planilha exclusiva do contador
    const RANGE = "Contador!A:B"; // Coluna A = música, B = contador

    // Lê a planilha atual
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = res.data.values || [];
    let updated = false;

    // Procura a música (case-insensitive, mas mantém nome original)
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] && rows[i][0].toLowerCase() === musica.toLowerCase()) {
        const count = parseInt(rows[i][1] || "0", 10) + 1;
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Contador!B${i + 1}`,
          valueInputOption: "RAW",
          requestBody: { values: [[count]] },
        });
        updated = true;
        break;
      }
    }

    // Se não achou, cria nova linha
    if (!updated) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: RANGE,
        valueInputOption: "RAW",
        requestBody: { values: [[musica, 1]] },
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Contador atualizado" }),
    };
  } catch (error) {
    console.error("Erro no update-contador:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro interno" }),
    };
  }
}
