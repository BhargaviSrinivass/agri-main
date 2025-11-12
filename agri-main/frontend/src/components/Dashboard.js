import React, { useState, useEffect } from 'react';
import { weatherAPI, uploadAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageType, setImageType] = useState('crop');
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  
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

  const handleImageUpload = async (e, type) => {
    e.preventDefault();
    if (!selectedImage) {
      alert('Please select an image first');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedImage); // Changed from 'file' to 'image'
    formData.append('imageType', imageType);

    try {
      const response = await uploadAPI.uploadImage(formData);
      if (response.data.success) {
        setUploadResult(response.data);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + (error.response?.data?.message || error.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setSelectedImage(null);
    }
  };

  // FIXED: This function was missing in your code
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImageType(type);
      setUploadResult(null); // Reset result on new file selection
    }
  };

  const getAlertClass = (alert) => {
    switch (alert.type) {
      case 'warning': return 'alert-warning';
      case 'info': return 'alert-info';
      case 'success': return 'alert-success';
      default: return 'alert-info';
    }
  };

  const renderContent = () => {
    // Hardcoded metrics placeholders as requested
    const cropMetrics = { status: '92%', scans: 47 };
    const livestockMetrics = { status: '87%', scans: 34 };

    switch (activeTab) {
      case 'Dashboard':
        return (
          <div className="dashboard-grid">
            <div className="feature-card crop-card">
              <div className="card-icon crop-icon"></div>
              <div className="card-content">
                <h3>Crop Disease Detection</h3>
                <p>Upload crop images for AI-powered disease analysis</p>
                <div className="card-stats">
                    <span>Health Status: <strong>{cropMetrics.status}</strong></span>
                    <span>This Month: <strong>{cropMetrics.scans} scans</strong></span>
                </div>
                <div className="card-actions">
                  <label className="upload-btn">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'crop')}
                      style={{ display: 'none' }}
                      onClick={(e) => { 
                        e.target.value = null; 
                        setUploadResult(null); 
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            
            <div className="feature-card livestock-card">
              <div className="card-icon livestock-icon"></div>
              <div className="card-content">
                <h3>Livestock Health Detection</h3>
                <p>Monitor animal health with AI disease prediction</p>
                <div className="card-stats">
                    <span>Health Status: <strong>{livestockMetrics.status}</strong></span>
                    <span>This Month: <strong>{livestockMetrics.scans} scans</strong></span>
                </div>
                <div className="card-actions">
                  <label className="upload-btn">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'animal')}
                      style={{ display: 'none' }}
                      onClick={(e) => { 
                        e.target.value = null; 
                        setUploadResult(null); 
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            
            {/* Consolidated Weather & Upload Result Section */}
            <div className="full-width-section">
                <section className="weather-section">
                    <h2>Weather Alerts</h2>
                    {weather ? (
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
                    ) : (
                        <p>Loading weather data...</p>
                    )}
                </section>

                {/* Combined Upload Status Display */}
                {selectedImage && (
                    <section className="upload-status-section">
                        <h2>File Upload Status</h2>
                        <form onSubmit={(e) => handleImageUpload(e, imageType)} className="upload-form">
                            <p>Selected File: <strong>{selectedImage.name}</strong> ({imageType} image)</p>
                            <button type="submit" disabled={loading} className="analyze-btn">
                                {loading ? 'Uploading...' : `Upload & Analyze ${imageType} Image`}
                            </button>
                        </form>
                    </section>
                )}

                {/* Analysis Result Section */}
                {uploadResult && (
                    <section className="analysis-result-section">
                        <h2>Analysis Result</h2>
                        <div className={`result-card ${uploadResult.detection.detected ? 'disease-detected' : 'healthy'}`}>
                            <h4>{uploadResult.detection.detected ? '⚠️ Detection Status' : '✅ Upload Successful'}</h4>
                            <p><strong>Analysis Status:</strong> {uploadResult.message}</p>
                            <p><strong>Detected Disease:</strong> {uploadResult.detection.disease}</p>
                            <p><strong>Confidence:</strong> {(uploadResult.detection.confidence * 100).toFixed(1)}%</p>
                            {uploadResult.detection.treatment && (
                            <div className="treatment">
                                <strong>Recommended Action:</strong>
                                <p>{uploadResult.detection.treatment}</p>
                            </div>
                            )}
                        </div>
                    </section>
                )}
            </div>
          </div>
        );

      case 'Crop Detection':
        return <h2>Crop Detection (Detailed View)</h2>;
      case 'Livestock':
        return <h2>Livestock Management (Detailed View)</h2>;
      case 'Weather':
        return <h2>Weather Forecast (Detailed View)</h2>;
      case 'AI Assistant':
        return <h2>AI Assistant (Chat/Query Interface)</h2>;
      case 'Profile':
        return (
            <section>
                <h2>User Profile</h2>
                <p>Username: {user.username}</p>
                <p>Email: {user.email}</p>
            </section>
        );
      default:
        return <h2>Content not found</h2>;
    }
  };

  return (
    <div className="app-layout">
        {/* Sidebar Navigation */}
        <aside className="sidebar">
            <div className="logo">
                <span className="logo-icon">🌿</span>
                <span className="logo-text">KrishiGuard</span>
            </div>
            <nav className="nav-links">
                <a 
                    className={`nav-link ${activeTab === 'Dashboard' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('Dashboard')}
                >
                    <span className="icon">📊</span> Dashboard
                </a>
                <a 
                    className={`nav-link ${activeTab === 'Crop Detection' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('Crop Detection')}
                >
                    <span className="icon">🌱</span> Crop Detection
                </a>
                <a 
                    className={`nav-link ${activeTab === 'Livestock' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('Livestock')}
                >
                    <span className="icon">🐄</span> Livestock
                </a>
                <a 
                    className={`nav-link ${activeTab === 'Weather' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('Weather')}
                >
                    <span className="icon">🌤️</span> Weather
                </a>
                <a 
                    className={`nav-link ${activeTab === 'AI Assistant' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('AI Assistant')}
                >
                    <span className="icon">🤖</span> AI Assistant
                </a>
                <a 
                    className={`nav-link ${activeTab === 'Profile' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('Profile')}
                >
                    <span className="icon">👤</span> Profile
                </a>
            </nav>
            <button onClick={onLogout} className="sidebar-logout-btn">
                Logout
            </button>
        </aside>

        {/* Main Content Area */}
        <div className="dashboard-main-content">
            <header className="dashboard-header">
                <div className="dashboard-title-group">
                    <h1>Welcome, {user.username}!</h1>
                    <p>Your centralized dashboard for farm management and analysis.</p>
                </div>
            </header>
            <div className="dashboard-content">
                {renderContent()}
            </div>
        </div>
    </div>
  );
};

export default Dashboard;