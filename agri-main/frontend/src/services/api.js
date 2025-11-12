import axios from 'axios';

// Node backend (Auth + Weather)
const NODE_API = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
});

// Flask backend (ML model)
const ML_API = axios.create({
  baseURL: 'http://127.0.0.1:5001',
  timeout: 30000, // Longer timeout for ML processing
});

// Add response interceptor for better error handling
ML_API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED') {
      error.message = 'ML Service is not running. Please start the Python API on port 5001.';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: (userData) => NODE_API.post('/auth/signup', userData),
  login: (userData) => NODE_API.post('/auth/login', userData),
};

export const weatherAPI = {
  getWeather: (lat, lon) => NODE_API.get(`/weather?lat=${lat}&lon=${lon}`),
};

export const uploadAPI = {
  uploadImage: (formData) =>
    ML_API.post('/predict', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
      },
    }),
};

// Add a method to check ML API status
export const mlStatusAPI = {
  checkStatus: () => ML_API.get('/status'),
};

export default { authAPI, weatherAPI, uploadAPI, mlStatusAPI };