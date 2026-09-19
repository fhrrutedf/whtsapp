const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: 'apps/api/.env' });

const apiKey = process.env.GEMINI_API_KEY;

async function testModels() {
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];
  for (const model of models) {
    console.log(`\nTesting ${model}...`);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await axios.post(
        url,
        {
          contents: [{ role: 'user', parts: [{ text: 'مرحبا، عرف عن نفسك بجملة واحدة.' }] }],
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
      );
      console.log(`✓ ${model} SUCCESS:`, res.data?.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch (err) {
      console.log(`✗ ${model} FAILED:`, err.response?.status, err.response?.data?.error?.message || err.message);
    }
  }
}

testModels();
