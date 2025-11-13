import React, { useState } from 'react';

// 🚨 NEW SUB-COMPONENT: Modal for viewing scan details
const ScanDetailModal = ({ scan, onClose }) => {
    if (!scan) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <button className="modal-close-btn" onClick={onClose}>&times;</button>
                <h3>Scan Details</h3>
                <div className={`result-card ${scan.disease && scan.disease.toLowerCase().includes('healthy') ? 'healthy' : 'disease-detected'}`}>
                    <h4>{scan.disease}</h4>
                    <p><strong>Date:</strong> {new Date(scan.date).toLocaleString()}</p>
                    <p><strong>File:</strong> {scan.fileName}</p>
                    <p><strong>Confidence:</strong> {(scan.confidence * 100).toFixed(1)}%</p>
                    {/* Add an image preview area if you store the image URL */}
                    {/* {scan.imageUrl && <img src={scan.imageUrl} alt="Scan Preview" className="scan-preview-img" />} */}
                    <div className="treatment">
                        <strong>Recommended Action:</strong>
                        <p>{scan.treatment}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-component to render the analysis result on the 'New Scan' tab
const AnalysisResultCard = ({ uploadResult, imageType }) => {
  if (uploadResult && imageType === 'crop') {
    const result = uploadResult;
    return (
      <div className={`analysis-result-section result-card ${result.detection.detected ? 'disease-detected' : 'healthy'}`}>
        <h2>Analysis Result</h2>
        <div className="result-content">
          <h4>{result.detection.detected ? '⚠️ Disease Detected' : '✅ Healthy Crop'}</h4>
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

// Sub-component: Renders the scan history list
const HistoryView = ({ history, onViewDetail }) => { // 🚨 Accept onViewDetail prop
    // FIX: Condition relies on history.length, which is now correctly managed in Dashboard.js
    if (history.length === 0) {
        return (
            <div className="history-empty-state">
                <span className="icon">🕰️</span>
                <h3>No History Found</h3>
                <p>All your past scans will appear here.</p>
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
                        // Check confidence to correctly format the percentage for display
                        <tr key={scan.id || index} className={`history-item ${scan.disease && scan.disease.toLowerCase().includes('healthy') ? 'healthy' : 'disease-detected'}`}>
                            <td>{new Date(scan.date || Date.now()).toLocaleDateString()}</td>
                            <td>{scan.fileName || `Scan #${scan.id || index + 1}`}</td>
                            <td><strong>{scan.disease}</strong></td>
                            <td>{(scan.confidence * 100).toFixed(1)}%</td>
                            <td>
                                <button 
                                    className="view-detail-btn"
                                    onClick={() => onViewDetail(scan)} // 🚨 Call handler on click
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


const CropDetectionPage = ({ 
    selectedImage, 
    imageType, 
    uploadResult, 
    loading, 
    handleFileChange, 
    handleDetailedAnalyze,
    setUploadResult,
    scanHistory
}) => {
    const [scanTab, setScanTab] = useState('New Scan');
    // 🚨 NEW STATE: To manage the visibility and content of the modal
    const [selectedScan, setSelectedScan] = useState(null); 

    // Handler specific to this page's file input
    const handleLocalFileChange = (e) => {
        // Always pass 'crop' as the type when calling the parent's handler
        handleFileChange(e, 'crop');
    };
    
    // Handler for opening the modal
    const handleViewDetail = (scan) => {
        setSelectedScan(scan);
    };

    // Determine button state
    const isAnalyzingCrop = selectedImage && imageType === 'crop';

    return (
        <div className="crop-detection-page">
            <header className="page-header">
                <h2>Crop Disease Detection</h2>
                <p>Upload or capture crop images for AI-powered disease analysis</p>
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
                        <h3>Upload Crop Image</h3>
                        <div className="upload-dropzone" 
                        >
                            <div className="upload-icon">
                                {isAnalyzingCrop ? '✅' : '⬆️'}
                            </div>
                            {isAnalyzingCrop ? (
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
                            disabled={loading || !isAnalyzingCrop}
                        >
                            {loading ? 'Analyzing...' : 'Analyze Disease'}
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
                    history={scanHistory} 
                    onViewDetail={handleViewDetail} // 🚨 Pass handler to HistoryView
                />
            )}

            {/* 🚨 RENDER MODAL */}
            <ScanDetailModal 
                scan={selectedScan} 
                onClose={() => setSelectedScan(null)} 
            />
        </div>
    );
};

export default CropDetectionPage;