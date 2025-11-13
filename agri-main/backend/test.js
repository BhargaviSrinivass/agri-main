const axios = require('axios');

const GEMINI_API_KEY = 'AIzaSyDj-sQjm_ZviL7Z6Y21eFgZ79hJSonx8AE';

async function discoverModels() {
  try {
    console.log('🔍 Discovering available Gemini models...\n');
    
    // Get list of all available models
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      }
    );

    console.log('✅ Available models:');
    response.data.models.forEach(model => {
      console.log(`📌 Name: ${model.name}`);
      console.log(`   Display: ${model.displayName}`);
      console.log(`   Description: ${model.description}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'None'}`);
      console.log('---');
    });

    // Test which models support generateContent
    const generateContentModels = response.data.models.filter(model => 
      model.supportedGenerationMethods?.includes('generateContent')
    );

    console.log('\n🎯 Models supporting generateContent:');
    generateContentModels.forEach(model => {
      console.log(`✅ ${model.name} - ${model.displayName}`);
    });

    return generateContentModels;

  } catch (error) {
    console.error('❌ Error discovering models:', error.response?.data || error.message);
    return [];
  }
}

async function testModel(modelName) {
  try {
    console.log(`\n🧪 Testing model: ${modelName}`);
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          role: "user",
          parts: [{ text: "Hello! Say 'KrishiGuard AI is working!' in one sentence." }]
        }],
        generationConfig: {
          maxOutputTokens: 50
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    const result = response.data.candidates[0].content.parts[0].text;
    console.log(`✅ ${modelName}: SUCCESS - ${result}`);
    return true;
    
  } catch (error) {
    console.log(`❌ ${modelName}: FAILED - ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function main() {
  const availableModels = await discoverModels();
  
  if (availableModels.length === 0) {
    console.log('\n💥 No models found or API key invalid.');
    console.log('Please check:');
    console.log('1. API key validity');
    console.log('2. Billing setup in Google AI Studio');
    console.log('3. Regional restrictions');
    return;
  }

  console.log('\n🚀 Testing available models...');
  
  for (const model of availableModels) {
    const modelName = model.name.replace('models/', '');
    await testModel(modelName);
  }
}

main();