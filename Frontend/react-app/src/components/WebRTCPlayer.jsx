import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../services/api';
import { RotateCw } from 'lucide-react';

const WebRTCPlayer = ({ camId }) => {
    const videoRef = useRef(null);
    const peerConnection = useRef(null);
    const [status, setStatus] = useState('connecting');
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;

    const startStream = useCallback(async () => {
        try {
            setStatus('connecting');
            setError(null);

            // Cleanup previous connection
            if (peerConnection.current) {
                peerConnection.current.close();
            }

            // Create RTCPeerConnection with STUN server
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            peerConnection.current = pc;

            // Handle incoming tracks
            pc.ontrack = (event) => {
                console.log('WebRTC: Received track', event.track.kind);
                if (videoRef.current) {
                    if (event.streams && event.streams[0]) {
                        videoRef.current.srcObject = event.streams[0];
                    } else {
                        // Fallback: create a new MediaStream if one isn't provided
                        console.log('WebRTC: No stream in event, creating one from track');
                        const stream = new MediaStream([event.track]);
                        videoRef.current.srcObject = stream;
                    }
                    setStatus('connected');
                    setRetryCount(0); // Reset retries on success
                }
            };

            pc.onconnectionstatechange = () => {
                console.log('WebRTC: Connection state:', pc.connectionState);
                if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                    if (retryCount < MAX_RETRIES) {
                        console.log(`Connection ${pc.connectionState}, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
                        setRetryCount(prev => prev + 1);
                    } else {
                        setStatus('failed');
                        setError('Connection lost. Please retry manually.');
                    }
                }
            };

            // Add transceiver to receive video only
            pc.addTransceiver('video', { direction: 'recvonly' });

            // Create Offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Wait for ICE gathering to complete with 10s timeout
            try {
                await Promise.race([
                    new Promise((resolve) => {
                        if (pc.iceGatheringState === 'complete') {
                            resolve();
                        } else {
                            const checkState = () => {
                                if (pc.iceGatheringState === 'complete') {
                                    pc.removeEventListener('icegatheringstatechange', checkState);
                                    resolve();
                                }
                            };
                            pc.addEventListener('icegatheringstatechange', checkState);
                        }
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('ICE Gathering Timeout')), 10000))
                ]);
            } catch (iceErr) {
                console.warn('ICE gathering timed out or failed, proceeding with partial offer');
            }

            const offerSdp = pc.localDescription.sdp;

            // Send offer to backend via API service
            const answer = await api.sendOffer(offerSdp, 'offer', camId);
            
            // Critical check: if PC was closed during the await, abort
            if (pc.signalingState === 'closed') {
                console.warn('WebRTC connection closed before remote description could be set.');
                return;
            }
            
            await pc.setRemoteDescription(answer);

        } catch (err) {
            console.error('WebRTC Error:', err);
            setStatus('error');
            setError(err.message);
            
            // Auto-retry on initial connection error
            if (retryCount < MAX_RETRIES) {
                const timeout = Math.pow(2, retryCount) * 1000;
                setTimeout(() => setRetryCount(prev => prev + 1), timeout);
            }
        }
    }, [camId, retryCount]);

    useEffect(() => {
        startStream();

        return () => {
            if (peerConnection.current) {
                peerConnection.current.close();
            }
        };
    }, [camId, retryCount, startStream]);

    return (
        <div className="webrtc-player" style={{ width: '100%', height: '100%', background: '#000', position: 'relative' }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {status !== 'connected' && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: status === 'error' || status === 'failed' ? '#ff4444' : '#fff',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    zIndex: 10,
                    gap: '1rem',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <span>{status === 'connecting' ? `Connecting... ${retryCount > 0 ? `(Retry ${retryCount})` : ''}` : error || 'Stream Offline'}</span>
                    {(status === 'failed' || status === 'error') && (
                        <button 
                            onClick={() => { setRetryCount(0); startStream(); }}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: 'white',
                                padding: '6px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <RotateCw size={14} /> Retry
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default WebRTCPlayer;
