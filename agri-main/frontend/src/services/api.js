import axios from 'axios';

// Node backend (Auth + Weather)
const NODE_API = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
});

// Remove the hardcoded ML_API and create dynamic instances instead
const createMLAPI = (port) => {
  return axios.create({
    baseURL: `http://127.0.0.1:${port}`,
    timeout: 30000, // Longer timeout for ML processing
  });
};

// Add response interceptor for better error handling
const addMLInterceptor = (apiInstance) => {
  apiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === 'ECONNREFUSED') {
        error.message = 'ML Service is not running. Please start the Python API.';
      }
      return Promise.reject(error);
    }
  );
  return apiInstance;
};

export const authAPI = {
  signup: (userData) => NODE_API.post('/auth/signup', userData),
  login: (userData) => NODE_API.post('/auth/login', userData),
};

export const weatherAPI = {
  getWeather: (lat, lon) => NODE_API.get(`/weather?lat=${lat}&lon=${lon}`),
};

// FIXED: Dynamic upload API that uses the correct port based on imageType
export const uploadAPI = {
  uploadImage: (formData) => {
    // Get the imageType from formData to determine which port to use
    const imageType = formData.get('imageType');
    const port = imageType === 'animal' ? 5002 : 5001;
    
    const mlApi = addMLInterceptor(createMLAPI(port));
    return mlApi.post('/predict', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Method to check specific ML API status
export const mlStatusAPI = {
  checkStatus: (port = 5001) => {
    const mlApi = createMLAPI(port);
    return mlApi.get('/');
  },
};
// Add to your existing API exports
export const aiAssistantAPI = {
  chat: (message, history) => NODE_API.post('/ai-assistant/chat', { message, history }),
};
export default { authAPI, weatherAPI, uploadAPI, mlStatusAPI };