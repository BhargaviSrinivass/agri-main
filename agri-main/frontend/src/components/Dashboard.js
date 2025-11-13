import React, { useState, useEffect } from 'react';
import { weatherAPI, uploadAPI } from '../services/api';
import './Dashboard.css';
import CropDetectionPage from './CropDetectionPage'; 
import LivestockDetectionPage from './LivestockDetectionPage'; 

// --- Constants for Local Storage Persistence ---
const CROP_SCANS_KEY = 'krishiGuardCropScans';
const LIVESTOCK_SCANS_KEY = 'krishiGuardLivestockScans';

const Dashboard = ({ user, onLogout }) => {
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageType, setImageType] = useState('crop');
  
  // STATE 1: Dashboard Result (only shown on Dashboard)
  const [uploadResult, setUploadResult] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  
  // FIX: Initialize scanMetrics from localStorage for persistence
  const initialCropScans = parseInt(localStorage.getItem(CROP_SCANS_KEY) || 0);
  const initialLivestockScans = parseInt(localStorage.getItem(LIVESTOCK_SCANS_KEY) || 0);

  const [scanMetrics, setScanMetrics] = useState({ 
    cropScans: initialCropScans, 
    livestockScans: initialLivestockScans
  });
  
  // History arrays initialized as empty.
  const [cropScanHistory, setCropScanHistory] = useState([]); 
  const [livestockScanHistory, setLivestockScanHistory] = useState([]); 

  // STATE 3: Detailed Page Result (only shown on CropDetectionPage/Livestock)
  const [pageUploadResult, setPageUploadResult] = useState(null); 

  useEffect(() => {
    getCurrentLocation();
    fetchScanMetrics(); 
    
    // 🚨 NEW FIX: Synchronize local storage count with empty history arrays on load
    if (initialCropScans > 0 && cropScanHistory.length === 0) {
        setScanMetrics(prev => ({ ...prev, cropScans: 0 }));
        localStorage.setItem(CROP_SCANS_KEY, 0);
    }
    if (initialLivestockScans > 0 && livestockScanHistory.length === 0) {
        setScanMetrics(prev => ({ ...prev, livestockScans: 0 }));
        localStorage.setItem(LIVESTOCK_SCANS_KEY, 0);
    }

    // Cleanup function to save the current optimistic counts before unmount
    return () => {
        localStorage.setItem(CROP_SCANS_KEY, scanMetrics.cropScans);
        localStorage.setItem(LIVESTOCK_SCANS_KEY, scanMetrics.livestockScans);
    };
  }, [scanMetrics]); 

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          fetchWeather(39.0997, -94.5786);
        }
      );
    } else {
      fetchWeather(39.0997, -94.5786);
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

  const fetchScanMetrics = async () => {
    try {
      // Assuming uploadAPI.getMetrics() fetches the real count from backend
      const response = await uploadAPI.getMetrics(); 
      
      if (response.data.success) {
        setScanMetrics({
          cropScans: response.data.cropScans || 0,
          livestockScans: response.data.livestockScans || 0,
        });
      }
    } catch (error) {
      console.error('Scan metrics fetch error: API endpoint not ready or defined in ../services/api', error);
    }
  };
  
  // History fetch functions are stubs for your API implementation
  const fetchCropScanHistory = async () => {};
  const fetchLivestockScanHistory = async () => {};


  // FIX 1: Separated result state handling via sourcePage
  const handleAnalyzeRequest = async (e, type, sourcePage) => {
    e.preventDefault();
    if (!selectedImage) {
      alert('Please select an image first');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('imageType', type);

    try {
      const response = await uploadAPI.uploadImage(formData);
      if (response.data.success) {
        
        // --- RESULT ISOLATION FIX ---
        if (sourcePage === 'Dashboard') {
            setUploadResult(response.data);
            setPageUploadResult(null); 
            setSelectedImage(null); 
        } else {
            setPageUploadResult(response.data); 
            setUploadResult(null); 
        }
        
        // --- HISTORY/METRICS UPDATE ---
        setScanMetrics(prevMetrics => {
          const key = type === 'crop' ? 'cropScans' : 'livestockScans';
          return { ...prevMetrics, [key]: prevMetrics[key] + 1 };
        });
        
        // Optimistically add new scan to history 
        const newScan = {
            id: Date.now(),
            date: new Date().toISOString(),
            fileName: selectedImage.name,
            disease: response.data.detection.disease,
            confidence: response.data.detection.confidence,
            treatment: response.data.detection.treatment
        };

        if (type === 'crop') {
            setCropScanHistory(prevHistory => [newScan, ...prevHistory]); 
        } else if (type === 'animal') {
            setLivestockScanHistory(prevHistory => [newScan, ...prevHistory]);
        }

        fetchScanMetrics(); 
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + (error.response?.data?.message || error.message || 'Unknown error'));
      
      const errorResult = { success: false, message: 'Upload failed due to API error.' };
      if (sourcePage === 'Dashboard') {
          setUploadResult(errorResult);
      } else {
          setPageUploadResult(errorResult);
      }
      
    } finally {
      setLoading(false);
    }
  };

  // FIX: Ensure both results are cleared on file change
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImageType(type);
      setUploadResult(null); // Clear dashboard result
      setPageUploadResult(null); // Clear detailed page result
    }
  };

  // HANDLER FOR CROP DETAILED PAGE
  const handleDetailedAnalyze = (e) => {
    handleAnalyzeRequest(e, 'crop', 'Detailed');
  };

  // NEW HANDLER FOR LIVESTOCK DETAILED PAGE
  const handleLivestockAnalyze = (e) => {
    handleAnalyzeRequest(e, 'animal', 'Detailed');
  };

  // HANDLER FOR DASHBOARD
  const handleDashboardAnalyze = (e) => {
    handleAnalyzeRequest(e, imageType, 'Dashboard'); 
  }

  const getAlertClass = (alert) => {
    switch (alert.type) {
      case 'warning': return 'alert-warning';
      case 'info': return 'alert-info';
      case 'success': return 'alert-success';
      default: return 'alert-info';
    }
  };
  
  // Common JSX for Dashboard Analysis Result
  const DashboardAnalysisResult = ({ result }) => {
    if (result) {
        const displayResult = result;
        return (
            <section className="analysis-result-section">
                <h2>Analysis Result</h2>
                <div className={`result-card ${displayResult.detection.detected ? 'disease-detected' : 'healthy'}`}>
                    <h4>{displayResult.detection.detected ? '⚠️ Detection Status' : '✅ Upload Successful'}</h4>
                    <p><strong>Analysis Status:</strong> {displayResult.message}</p>
                    <p><strong>Detected Disease:</strong> {displayResult.detection.disease}</p>
                    <p><strong>Confidence:</strong> {(displayResult.detection.confidence * 100).toFixed(1)}%</p>
                    {displayResult.detection.treatment && (
                    <div className="treatment">
                        <strong>Recommended Action:</strong>
                        <p>{displayResult.detection.treatment}</p>
                    </div>
                    )}
                </div>
            </section>
        );
    }
    return null;
  };
  
  // Common JSX for Dashboard Upload Status
  const DashboardUploadStatus = () => {
    if (selectedImage && activeTab === 'Dashboard') { 
        return (
            <section className="upload-status-section">
                <h2>File Upload Status</h2>
                <form onSubmit={handleDashboardAnalyze} className="upload-form">
                    <p>Selected File: <strong>{selectedImage.name}</strong> ({imageType} image)</p>
                    <button type="submit" disabled={loading} className="analyze-btn">
                        {loading ? 'Uploading...' : `Upload & Analyze ${imageType} Image`}
                    </button>
                </form>
            </section>
        );
    }
    return null;
  };


  const renderContent = () => {
    const cropMetrics = { scans: scanMetrics.cropScans };
    const livestockMetrics = { scans: scanMetrics.livestockScans };

    switch (activeTab) {
      case 'Dashboard':
        return (
          <div className="dashboard-grid">
            {/* 1. Feature Cards */}
            <div className="feature-card crop-card">
              <div className="card-icon crop-icon"></div>
              <div className="card-content">
                <h3>Crop Disease Detection</h3>
                <p>Upload crop images for AI-powered disease analysis</p>
                <div className="card-stats">
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
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            
            {/* 2. Full Width Sections (Weather, Upload Status, Result) */}
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
                
                <DashboardUploadStatus />
                <DashboardAnalysisResult result={uploadResult} />
            </div>
          </div>
        );

      case 'Crop Detection':
        // RENDER CROP COMPONENT
        return (
          <CropDetectionPage
            selectedImage={selectedImage}
            imageType={imageType}
            uploadResult={pageUploadResult} // Uses dedicated page result state
            loading={loading}
            handleFileChange={handleFileChange}
            handleDetailedAnalyze={handleDetailedAnalyze}
            setUploadResult={setPageUploadResult} // Pass the setter for the page
            scanHistory={cropScanHistory} 
          />
        );

      case 'Livestock':
        // RENDER NEW LIVESTOCK COMPONENT
        return (
          <LivestockDetectionPage
            selectedImage={selectedImage}
            imageType={imageType}
            uploadResult={pageUploadResult} 
            loading={loading}
            handleFileChange={handleFileChange}
            handleDetailedAnalyze={handleLivestockAnalyze} // Pass the new handler
            setUploadResult={setPageUploadResult} 
            livestockScanHistory={livestockScanHistory} // Pass livestock history
          />
        );

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
                    onClick={() => { setActiveTab('Dashboard'); setPageUploadResult(null); }} // Clear detailed page result on switch
                >
                    <span className="icon">📊</span> Dashboard
                </a>
                <a 
                    className={`nav-link ${activeTab === 'Crop Detection' ? 'active' : ''}`} 
                    onClick={() => { setActiveTab('Crop Detection'); setUploadResult(null); }} // Clear dashboard result on switch
                >
                    <span className="icon">🌱</span> Crop Detection
                </a>
                <a 
                    className={`nav-link ${activeTab === 'Livestock' ? 'active' : ''}`} 
                    onClick={() => { setActiveTab('Livestock'); setUploadResult(null); }}
                >
                    <span className="icon">🐄</span> Livestock
                </a>
                <a 
                    className={`nav-link ${activeTab === 'Weather' ? 'active' : ''}`} 
                    onClick={() => { setActiveTab('Weather'); setUploadResult(null); }}
                >
                    <span className="icon">🌤️</span> Weather
                </a>
                <a 
                    className={`nav-link ${activeTab === 'AI Assistant' ? 'active' : ''}`} 
                    onClick={() => { setActiveTab('AI Assistant'); setUploadResult(null); }}
                >
                    <span className="icon">🤖</span> AI Assistant
                </a>
                <a 
                    className={`nav-link ${activeTab === 'Profile' ? 'active' : ''}`} 
                    onClick={() => { setActiveTab('Profile'); setUploadResult(null); }}
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