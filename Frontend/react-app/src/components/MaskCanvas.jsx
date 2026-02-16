import React, { useRef, useState, useEffect } from 'react';
import { api } from '../services/api';

const MaskCanvas = ({ camId, onSave }) => {
    const canvasRef = useRef(null);
    const [points, setPoints] = useState([]);
    const [status, setStatus] = useState({ message: '', type: '' });

    useEffect(() => {
        draw();
    }, [points]);

    // Clear points when camera changes
    useEffect(() => {
        clearMask();
    }, [camId]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            if (points.length > 2) {
                ctx.lineTo(points[0][0], points[0][1]);
            }

            ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
            ctx.fill();

            ctx.fillStyle = "red";
            points.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    };

    const handleCanvasClick = (event) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = Math.round((event.clientX - rect.left) * scaleX);
        const y = Math.round((event.clientY - rect.top) * scaleY);

        setPoints([...points, [x, y]]);
    };

    const clearMask = () => {
        setPoints([]);
        setStatus({ message: 'Mask cleared. Draw a new one.', type: 'info' });
        setTimeout(() => setStatus({ message: '', type: '' }), 3000);
    };

    const undoLastPoint = () => {
        setPoints(points.slice(0, -1));
    };

    const saveMask = async () => {
        if (points.length < 3) {
            setStatus({ message: 'Error: A mask needs at least 3 points.', type: 'error' });
            return;
        }

        setStatus({ message: 'Saving mask...', type: 'info' });
        try {
            await api.setMask(camId, points);
            setStatus({ message: `Success: Mask saved for ${camId}!`, type: 'success' });
            if (onSave) onSave();
        } catch (err) {
            setStatus({ message: `Error: ${err.message}`, type: 'error' });
        }
    };

    return (
        <div className="mask-canvas-container" style={{ width: '100%', height: '100%' }}>
            <div className="canvas-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={640}
                    onClick={handleCanvasClick}
                    className="mask-overlay"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair' }}
                />
                
                {/* Floating Controls Overlay */}
                <div className="mask-controls-overlay" style={{ 
                    position: 'absolute', 
                    bottom: '20px', 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    display: 'flex', 
                    gap: '12px',
                    zIndex: 20,
                    background: 'rgba(15, 23, 42, 0.8)',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                }}>
                    <button className="glass-btn btn-sm" onClick={undoLastPoint} disabled={points.length === 0} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Undo</button>
                    <button className="glass-btn btn-sm" onClick={clearMask} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Clear All</button>
                    <button className="glass-btn btn-sm primary" onClick={saveMask} style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--primary)', color: 'white' }}>Save Mask</button>
                </div>

                {status.message && (
                    <div className={`status-message ${status.type}`} style={{ 
                        position: 'absolute',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: status.type === 'success' ? 'rgba(16, 185, 129, 0.8)' : status.type === 'error' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)',
                        color: 'white',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        zIndex: 25,
                        backdropFilter: 'blur(4px)'
                    }}>
                        {status.message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MaskCanvas;
