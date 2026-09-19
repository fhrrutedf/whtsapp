const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: 'apps/api/.env' });

const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const models = res.data?.models || [];
    console.log('Available models:');
    models.forEach(m => {
      if (m.supportedGenerationMethods?.includes('generateContent')) {
        console.log(`- ${m.name} (${m.displayName})`);
      }
    });
  } catch (err) {
    console.error('List models error:', err.response?.data || err.message);
  }
}

listModels();
