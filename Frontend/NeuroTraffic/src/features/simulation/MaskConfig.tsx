import { useRef, useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { configApi } from '../../api/services/webrtc';
import { Button } from '../../components/ui/Button';

const MaskConfig = ({ camId }: { camId: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [points, setPoints] = useState<number[][]>([]);
    
    const { mutateAsync: saveMask, isPending } = useMutation({
        mutationFn: () => configApi.setMask({ cam_id: camId, points }),
        onSuccess: () => alert(`MASK_UPDATED: ${camId}`),
        onError: (err: Error) => alert(`MASK_ERROR: ${err.message}`),
    });

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            if (points.length > 2) {
                ctx.lineTo(points[0][0], points[0][1]); // Close polygon
            }

            ctx.strokeStyle = "#b0ff00"; // brand-green
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "rgba(176, 255, 0, 0.2)";
            ctx.fill();

            ctx.fillStyle = "#ff2a2a"; // brand-red for points
            points.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }, [points]);

    useEffect(() => {
        draw();
    }, [draw]);

    // Clear points when camera changes
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPoints([]);
    }, [camId]);

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = Math.round((event.clientX - rect.left) * scaleX);
        const y = Math.round((event.clientY - rect.top) * scaleY);

        setPoints([...points, [x, y]]);
    };

    return (
        <div className="w-full h-full flex flex-col gap-4 relative">
            <div className="relative w-full h-full min-h-[300px] border-2 border-brand-gray overflow-hidden cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={640}
                    onClick={handleCanvasClick}
                    className="absolute inset-0 w-full h-full z-10"
                />
                <div className="absolute top-4 left-4 z-20 pointer-events-none opacity-50 font-mono text-xs uppercase text-brand-white bg-brand-black px-2 py-1">
                    [OVERLAY_MODE: {camId}] DRAW CONFIG MASK
                </div>
            </div>

            <div className="flex gap-4 justify-between items-center bg-brand-darkgray p-4 border-2 border-brand-gray">
                <div className="flex gap-4">
                    <Button variant="ghost" onClick={() => setPoints(points.slice(0, -1))} disabled={points.length === 0}>
                        UNDO_POINT
                    </Button>
                    <Button variant="ghost" className="border-brand-red text-brand-red" onClick={() => setPoints([])}>
                        CLR_ALL
                    </Button>
                </div>
                
                <Button 
                    variant="primary" 
                    onClick={() => {
                        if (points.length >= 3) saveMask();
                    }} 
                    disabled={isPending || points.length < 3}
                >
                    {isPending ? 'UPLOADING...' : 'PUSH_MASK'}
                </Button>
            </div>
            
            {points.length > 0 && points.length < 3 && (
                <p className="text-brand-red font-mono text-xs text-right uppercase animate-pulse">
                    ! MINIMUM 3 POINTS REQD.
                </p>
            )}
        </div>
    );
};

export default MaskConfig;
