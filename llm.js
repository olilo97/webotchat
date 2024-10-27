require('dotenv').config();
const axios = require('axios');

const SILICONCLOUD_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

async function chatWithLLM(message) {
  try {
    const response = await axios.post(
      SILICONCLOUD_API_URL,
      {
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: [
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SILICONCLOUD_API_KEY}`
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error chatting with LLM:', error.response ? error.response.data : error.message);
    return 'Sorry, I encountered an error while processing your request.';
  }
}

module.exports = { chatWithLLM };
