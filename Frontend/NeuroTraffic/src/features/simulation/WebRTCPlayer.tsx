import { useEffect, useRef, useState, useCallback } from 'react';
import { webrtcApi } from '../../api/services/webrtc';
import { Button } from '../../components/ui/Button';

const WebRTCPlayer = ({ camId }: { camId: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'failed' | 'error'>('connecting');
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;

    const startStream = useCallback(async () => {
        try {
            setStatus('connecting');
            setError(null);

            if (peerConnection.current) {
                peerConnection.current.close();
            }

            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            peerConnection.current = pc;

            pc.ontrack = (event) => {
                if (videoRef.current) {
                    if (event.streams?.[0]) {
                        videoRef.current.srcObject = event.streams[0];
                    } else {
                        const stream = new MediaStream([event.track]);
                        videoRef.current.srcObject = stream;
                    }
                    setStatus('connected');
                    setRetryCount(0);
                }
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                    if (retryCount < MAX_RETRIES) {
                        setRetryCount(prev => prev + 1);
                    } else {
                        setStatus('failed');
                        setError('Connection lost.');
                    }
                }
            };

            pc.addTransceiver('video', { direction: 'recvonly' });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            try {
                await Promise.race([
                    new Promise<void>((resolve) => {
                        if (pc.iceGatheringState === 'complete') resolve();
                        else {
                            const checkState = () => {
                                if (pc.iceGatheringState === 'complete') {
                                    pc.removeEventListener('icegatheringstatechange', checkState);
                                    resolve();
                                }
                            };
                            pc.addEventListener('icegatheringstatechange', checkState);
                        }
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('ICE Timeout')), 10000))
                ]);
            } catch {
                console.warn('ICE gathering timeout override');
            }

            const offerSdp = pc.localDescription?.sdp;
            if (!offerSdp) throw new Error("No SDP Offer generated");

            const answer = await webrtcApi.sendOffer(offerSdp, 'offer', camId);
            
            if (pc.signalingState === 'closed') return;
            
            await pc.setRemoteDescription(answer as RTCSessionDescriptionInit);

        } catch (err: unknown) {
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Unknown connection error');
            
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

    const getStatusMessage = () => {
        if (status === 'connecting') {
            return `CONNECTING_RTC... ${retryCount > 0 ? `(RETRY_${retryCount})` : ''}`;
        }
        return error || 'STREAM_OFFLINE';
    };

    return (
        <div className="w-full h-full bg-brand-black relative border-2 border-brand-gray overflow-hidden">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
            />
            {status !== 'connected' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-black/90 p-4 text-center z-10 gap-4">
                    <span className={`font-mono uppercase tracking-widest ${status === 'error' || status === 'failed' ? 'text-brand-red' : 'text-brand-white'}`}>
                       {getStatusMessage()}
                    </span>
                    {(status === 'failed' || status === 'error') && (
                        <Button variant="ghost" className="border-brand-gray text-brand-white" onClick={() => { setRetryCount(0); startStream(); }}>
                            MANUAL_RETRY
                        </Button>
                    )}
                </div>
            )}
            
            {/* Brutalist accents */}
            <div className="absolute top-4 left-4 flex gap-2 z-20">
               <span className="w-3 h-3 bg-brand-red rounded-full animate-pulse" /> 
            </div>
        </div>
    );
};

export default WebRTCPlayer;
