import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

export const authAPI = {
  signup: (userData) => API.post('/auth/signup', userData),
  login: (userData) => API.post('/auth/login', userData),
};

export const weatherAPI = {
  getWeather: (lat, lon) => API.get(`/weather?lat=${lat}&lon=${lon}`),
};

export const uploadAPI = {
  uploadImage: (formData) => API.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

export default API;