import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const WebRTCPlayer = ({ camId }) => {
    const videoRef = useRef(null);
    const peerConnection = useRef(null);
    const [status, setStatus] = useState('connecting');
    const [error, setError] = useState(null);

    useEffect(() => {
        const startStream = async () => {
            try {
                setStatus('connecting');

                // Create RTCPeerConnection
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                peerConnection.current = pc;

                // Handle incoming tracks
                pc.ontrack = (event) => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = event.streams[0];
                        setStatus('connected');
                    }
                };

                pc.onconnectionstatechange = () => {
                    if (pc.connectionState === 'failed') {
                        setStatus('failed');
                        setError('Connection failed');
                    }
                };

                // Add transceiver to receive video only
                pc.addTransceiver('video', { direction: 'recvonly' });

                // Create Offer
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                // Wait for ICE gathering to complete
                await new Promise((resolve) => {
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
                });

                const offerSdp = pc.localDescription.sdp;

                // Send offer to backend via API service
                const answer = await api.sendOffer(offerSdp, 'offer', camId);
                await pc.setRemoteDescription(answer);

            } catch (err) {
                console.error('WebRTC Error:', err);
                setStatus('error');
                setError(err.message);
            }
        };

        startStream();

        return () => {
            if (peerConnection.current) {
                peerConnection.current.close();
            }
        };
    }, [camId]); // Re-run if camId changes

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
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: status === 'error' || status === 'failed' ? '#ff4444' : '#fff',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    zIndex: 10
                }}>
                    {status === 'connecting' ? 'Connecting...' : error || 'Stream Offline'}
                </div>
            )}
        </div>
    );
};

export default WebRTCPlayer;
