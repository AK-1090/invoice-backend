// backend/utils/openaiClient.js
const { Configuration, OpenAIApi } = require("openai");

const conf = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new OpenAIApi(conf);

module.exports = client;
