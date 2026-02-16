import React, { useState } from 'react';
import MaskCanvas from '../components/MaskCanvas';
import WebRTCPlayer from '../components/WebRTCPlayer';
import { Settings, Camera } from 'lucide-react';

const Configuration = () => {
    const [camId, setCamId] = useState('CAM_00');

    const handleCameraChange = (e) => {
        setCamId(e.target.value);
    };

    return (
        <div className="configuration-container">
            <header className="page-header">
                <h2><Settings className="icon" /> Mask Configuration</h2>
            </header>

            <div className="controls-section card">
                <label htmlFor="cam-select" className="label">Select Camera:</label>
                <div className="select-wrapper">
                    <Camera className="select-icon" size={18} />
                    <select id="cam-select" value={camId} onChange={handleCameraChange} className="camera-select">
                        <option value="CAM_00">Camera 0</option>
                        <option value="CAM_01">Camera 1</option>
                        <option value="CAM_02">Camera 2</option>
                        <option value="CAM_03">Camera 3</option>
                    </select>
                </div>
            </div>

            <div className="editor-section card">
                <h3>Camera View & Mask Editor</h3>
                <div className="canvas-container" style={{ position: 'relative', width: '640px', height: '640px', margin: '0 auto', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                        <WebRTCPlayer camId={camId} />
                    </div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
                        <MaskCanvas camId={camId} />
                    </div>
                </div>
                <p className="instruction-text">Click to add points. Minimal 3 points required. Click "Save Mask" to apply.</p>
            </div>
        </div>
    );
};

export default Configuration;
