const axios = require('axios');
require('dotenv').config();

const chatWithAI = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Use the working models from your test
    const workingModels = [
      'gemini-2.5-flash',                    // Stable & fast
      'gemini-2.5-flash-lite',               // Lightweight
      'gemini-flash-latest',                 // Always latest
      'gemini-2.0-flash',                    // Reliable
      'gemini-2.5-flash-preview-09-2025',    // Recent preview
      'gemma-3-4b-it'                        // Gemma model
    ];

    // Build conversation
    const contents = buildConversation(message, history);

    for (const model of workingModels) {
      try {
        console.log(`Trying model: ${model}`);
        
        const response = await callGeminiAPI(model, contents);
        
        return res.json({
          success: true,
          response: response,
          model: model
        });

      } catch (error) {
        console.log(`Model ${model} failed:`, error.response?.data?.error?.message || error.message);
        // Continue to next model
      }
    }

    // If all models failed
    res.status(500).json({
      success: false,
      message: 'All AI models are currently busy. Please try again in a moment.'
    });

  } catch (error) {
    console.error('AI Assistant error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'AI service error. Please try again later.'
    });
  }
};

// Build conversation in Gemini format
function buildConversation(message, history) {
  const contents = [];
  
  // System instruction
  contents.push({
    role: "user",
    parts: [{ 
      text: `You are KrishiGuard AI, an agricultural expert for Indian farmers. Provide practical, actionable advice about:

CROP DISEASES: Identify diseases and suggest treatments
LIVESTOCK HEALTH: Animal care and disease prevention  
SOIL MANAGEMENT: Soil health and fertilizers
PEST CONTROL: Organic and chemical pest management
WEATHER IMPACT: Farming based on weather conditions
BEST PRACTICES: Farming techniques for Indian conditions

Keep responses concise, practical, and focused on Indian agriculture.` 
    }]
  });
  
  // AI acknowledgment
  contents.push({
    role: "model",
    parts: [{ 
      text: "I understand. I'm KrishiGuard AI, ready to help with Indian farming questions about crops, livestock, soil, pests, and weather impacts." 
    }]
  });

  // Add conversation history
  history.forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  });

  // Add current message
  contents.push({
    role: "user",
    parts: [{ text: message }]
  });

  return contents;
}

// Call Gemini API
async function callGeminiAPI(model, contents) {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: contents,
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.7,
        topP: 0.8
      }
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 25000
    }
  );

  if (!response.data.candidates || !response.data.candidates[0].content) {
    throw new Error('Invalid response from Gemini API');
  }

  return response.data.candidates[0].content.parts[0].text;
}

module.exports = {
  chatWithAI
};