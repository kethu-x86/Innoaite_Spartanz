import React, { useRef, useState, useEffect } from 'react';
import { ENDPOINTS } from '../config';

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

    const saveMask = async () => {
        if (points.length < 3) {
            setStatus({ message: 'Error: A mask needs at least 3 points.', type: 'error' });
            return;
        }

        try {
            const response = await fetch(ENDPOINTS.SET_MASK, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    cam_id: camId,
                    points: points,
                }),
            });

            if (response.ok) {
                setStatus({ message: `Success: Mask saved for ${camId}!`, type: 'success' });
                if (onSave) onSave();
            } else {
                const error = await response.text();
                setStatus({ message: `Error: ${error}`, type: 'error' });
            }
        } catch (err) {
            setStatus({ message: `Network Error: ${err.message}`, type: 'error' });
        }
    };

    return (
        <div className="mask-canvas-container">
            <div className="canvas-wrapper">
                {/* The image is handled by the parent or is a background, but here we need to overlay. 
                     Ideally, the stream is an IMG tag behind the canvas. */}
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={640}
                    onClick={handleCanvasClick}
                    className="mask-overlay"
                />
            </div>

            <div className="controls">
                <button className="btn secondary" onClick={clearMask}>Clear Mask</button>
                <button className="btn primary" onClick={saveMask}>Save Mask</button>
            </div>
            {status.message && (
                <div className={`status-message ${status.type}`}>
                    {status.message}
                </div>
            )}
        </div>
    );
};

export default MaskCanvas;
