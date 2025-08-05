const fetch = require('node-fetch');
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTsLoHEPL1FQ4XbSL19nvdF1yARqiFG2nWcO028obh9lRbbGohcBz7EhubyN74dwrcIh5sgk0LLDBob/pub?output=csv'; // <-- SUBSTITUA PELA SUA URL

exports.handler = async function(event, context) {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      return { statusCode: response.status, body: response.statusText };
    }
    const data = await response.text();
    return {
      statusCode: 200,
      body: data,
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};
