import React, { useState } from 'react';

// Sub-component: Modal for viewing scan details (Generic for both Crop and Livestock)
const ScanDetailModal = ({ scan, onClose }) => {
    if (!scan) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <button className="modal-close-btn" onClick={onClose}>&times;</button>
                <h3>Scan Details</h3>
                {/* Check for 'healthy' or 'none' in disease name for styling */}
                <div className={`result-card ${scan.disease && (scan.disease.toLowerCase().includes('healthy') || scan.disease.toLowerCase().includes('none')) ? 'healthy' : 'disease-detected'}`}>
                    <h4>{scan.disease}</h4>
                    <p><strong>Date:</strong> {new Date(scan.date).toLocaleString()}</p>
                    <p><strong>File:</strong> {scan.fileName}</p>
                    <p><strong>Confidence:</strong> {(scan.confidence * 100).toFixed(1)}%</p>
                    <div className="treatment">
                        <strong>Recommended Action:</strong>
                        <p>{scan.treatment}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-component: Analysis Result Card (Customized for Livestock)
const AnalysisResultCard = ({ uploadResult, imageType }) => {
  if (uploadResult && imageType === 'animal') { // Check for 'animal'
    const result = uploadResult;
    return (
      <div className={`analysis-result-section result-card ${result.detection.detected ? 'disease-detected' : 'healthy'}`}>
        <h2>Analysis Result</h2>
        <div className="result-content">
          <h4>{result.detection.detected ? '⚠️ Disease Detected' : '✅ Healthy Animal'}</h4>
          <p><strong>Analysis Status:</strong> {result.message}</p>
          <p><strong>Detected Disease:</strong> {result.detection.disease}</p>
          <p><strong>Confidence:</strong> {(result.detection.confidence * 100).toFixed(1)}%</p>
          {result.detection.treatment && (
            <div className="treatment">
              <strong>Recommended Action:</strong>
              <p>{result.detection.treatment}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="analysis-result-section empty-state">
      <h2>Analysis Result</h2>
      <div className="empty-content">
        <span className="icon">!</span>
        <p>No analysis yet</p>
        <p>Upload an image to get started</p>
      </div>
    </div>
  );
};

// Sub-component: Renders the scan history list (Customized for Livestock)
const HistoryView = ({ history, onViewDetail }) => { 
    if (history.length === 0) {
        return (
            <div className="history-empty-state">
                <span className="icon">🕰️</span>
                <h3>No History Found</h3>
                <p>All your past livestock scans will appear here.</p>
            </div>
        );
    }

    return (
        <div className="history-list-container">
            <h3>Recent Scan History ({history.length} total)</h3>
            <table className="scan-history-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>File Name / ID</th>
                        <th>Detection</th>
                        <th>Confidence</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((scan, index) => (
                        <tr key={scan.id || index} className={`history-item ${scan.disease && (scan.disease.toLowerCase().includes('healthy') || scan.disease.toLowerCase().includes('none')) ? 'healthy' : 'disease-detected'}`}>
                            <td>{new Date(scan.date || Date.now()).toLocaleDateString()}</td>
                            <td>{scan.fileName || `Scan #${scan.id || index + 1}`}</td>
                            <td><strong>{scan.disease}</strong></td>
                            <td>{(scan.confidence * 100).toFixed(1)}%</td>
                            <td>
                                <button 
                                    className="view-detail-btn"
                                    onClick={() => onViewDetail(scan)} 
                                >
                                    View Detail
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const LivestockDetectionPage = ({ 
    selectedImage, 
    imageType, 
    uploadResult, 
    loading, 
    handleFileChange, 
    handleDetailedAnalyze,
    setUploadResult,
    livestockScanHistory // New prop name
}) => {
    const [scanTab, setScanTab] = useState('New Scan');
    const [selectedScan, setSelectedScan] = useState(null); 

    const handleLocalFileChange = (e) => {
        // Always pass 'animal' as the type when calling the parent's handler
        handleFileChange(e, 'animal');
    };
    
    const handleViewDetail = (scan) => {
        setSelectedScan(scan);
    };

    // Determine button state, checking against 'animal'
    const isAnalyzingLivestock = selectedImage && imageType === 'animal';

    return (
        <div className="livestock-detection-page"> 
            <header className="page-header">
                <h2>Livestock Health Detection</h2>
                <p>Upload or capture animal images for AI-powered health analysis</p>
            </header>
            
            <div className="tab-navigation">
                <button 
                    className={`tab ${scanTab === 'New Scan' ? 'active' : ''}`} 
                    onClick={() => { setScanTab('New Scan'); setUploadResult(null); }}
                >
                    New Scan
                </button>
                <button 
                    className={`tab ${scanTab === 'History' ? 'active' : ''}`} 
                    onClick={() => setScanTab('History')}
                >
                    History
                </button>
            </div>
            
            {scanTab === 'New Scan' ? (
                // --- New Scan View ---
                <div className="scan-content-grid">
                    {/* 1. Upload Panel (Left) */}
                    <div className="upload-panel">
                        <h3>Upload Animal Image</h3>
                        <div className="upload-dropzone" 
                        >
                            <div className="upload-icon">
                                {isAnalyzingLivestock ? '✅' : '⬆️'}
                            </div>
                            {isAnalyzingLivestock ? (
                                <p>File Selected: <strong>{selectedImage.name}</strong></p>
                            ) : (
                                <>
                                    <p>Drag & drop your image here</p>
                                    <p>or click to browse</p>
                                </>
                            )}
                            
                            {/* Hidden file input controlled by button */}
                            <label className="browse-file-btn">
                                Choose File
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLocalFileChange}
                                    style={{ display: 'none' }}
                                    onClick={(e) => { e.target.value = null; setUploadResult(null); }}
                                />
                            </label>
                        </div>
                        
                        <button 
                            className="analyze-btn primary-analyze-btn" 
                            onClick={handleDetailedAnalyze}
                            disabled={loading || !isAnalyzingLivestock}
                        >
                            {loading ? 'Analyzing...' : 'Analyze Health'}
                        </button>
                        
                        {/* Display error message if upload failed */}
                        {uploadResult && !uploadResult.success && (
                            <div className="error-message">{uploadResult.message}</div>
                        )}
                    </div>

                    {/* 2. Analysis Result Panel (Right) */}
                    <AnalysisResultCard 
                        uploadResult={uploadResult} 
                        imageType={imageType}
                    />
                </div>
            ) : (
                // --- History View ---
                <HistoryView 
                    history={livestockScanHistory} 
                    onViewDetail={handleViewDetail} 
                />
            )}

            {/* RENDER MODAL */}
            <ScanDetailModal 
                scan={selectedScan} 
                onClose={() => setSelectedScan(null)} 
            />
        </div>
    );
};

export default LivestockDetectionPage;