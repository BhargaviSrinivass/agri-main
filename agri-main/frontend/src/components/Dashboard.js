import React, { useState, useEffect } from 'react';
import { authAPI, weatherAPI, uploadAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageType, setImageType] = useState('crop');
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Default to a farm location (e.g., Kansas coordinates)
          fetchWeather(39.0997, -94.5786);
        }
      );
    } else {
      fetchWeather(39.0997, -94.5786); // Default location
    }
  };

  const fetchWeather = async (lat, lon) => {
    try {
      const response = await weatherAPI.getWeather(lat, lon);
      if (response.data.success) {
        setWeather(response.data.data);
        setAlerts(response.data.alerts);
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    if (!selectedImage) {
      alert('Please select an image first');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('imageType', imageType);

    try {
      const response = await uploadAPI.uploadImage(formData);
      if (response.data.success) {
        setUploadResult(response.data);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + (error.response?.data?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedImage(e.target.files[0]);
    setUploadResult(null);
  };

  const getAlertClass = (alert) => {
    switch (alert.type) {
      case 'warning': return 'alert-warning';
      case 'info': return 'alert-info';
      case 'success': return 'alert-success';
      default: return 'alert-info';
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome, {user.username}!</h1>
          <p>Farm Management Dashboard</p>
        </div>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        {/* Weather Alerts Section */}
        <section className="weather-section">
          <h2>Weather Alerts</h2>
          {weather && (
            <div className="weather-info">
              <div className="weather-basic">
                <h3>{weather.name}</h3>
                <p>Temperature: {weather.main.temp}°C</p>
                <p>Humidity: {weather.main.humidity}%</p>
                <p>Condition: {weather.weather[0].description}</p>
              </div>
              
              <div className="weather-alerts">
                <h4>Farm Alerts:</h4>
                {alerts.map((alert, index) => (
                  <div key={index} className={`alert ${getAlertClass(alert)}`}>
                    {alert.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Image Upload Section */}
        <section className="upload-section">
          <h2>Disease Detection</h2>
          <div className="upload-options">
            <button 
              className={`option-btn ${imageType === 'crop' ? 'active' : ''}`}
              onClick={() => setImageType('crop')}
            >
              Crop Image
            </button>
            <button 
              className={`option-btn ${imageType === 'animal' ? 'active' : ''}`}
              onClick={() => setImageType('animal')}
            >
              Animal Image
            </button>
          </div>

          <form onSubmit={handleImageUpload} className="upload-form">
            <div className="file-input">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
              />
            </div>
            
            <button type="submit" disabled={loading} className="upload-btn">
              {loading ? 'Analyzing...' : `Upload ${imageType} Image`}
            </button>
          </form>

          {uploadResult && (
            <div className="upload-result">
              <h3>Analysis Result</h3>
              <div className={`result-card ${uploadResult.detection.detected ? 'disease-detected' : 'healthy'}`}>
                <h4>{uploadResult.detection.detected ? '⚠️ Disease Detected' : '✅ Healthy'}</h4>
                <p><strong>Disease:</strong> {uploadResult.detection.disease}</p>
                <p><strong>Confidence:</strong> {(uploadResult.detection.confidence * 100).toFixed(1)}%</p>
                <p><strong>Message:</strong> {uploadResult.detection.message}</p>
                {uploadResult.detection.treatment && (
                  <div className="treatment">
                    <strong>Recommended Treatment:</strong>
                    <p>{uploadResult.detection.treatment}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;