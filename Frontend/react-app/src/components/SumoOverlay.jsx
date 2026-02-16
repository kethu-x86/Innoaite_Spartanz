import React from 'react';
import { useTraffic } from '../context/TrafficContext';

const SumoOverlay = ({ direction }) => {
    const { summary, emergency } = useTraffic();
    const vizData = summary?.context?.rl?.viz?.[direction] || summary?.sumo?.viz?.[direction] || [];
    const tlPhase = summary?.context?.rl?.viz?.tl_phase;

    // Map lane directions to CSS transforms
    const rotationMap = {
        'North': 'rotate(0deg)',
        'South': 'rotate(180deg)',
        'East': 'rotate(90deg)',
        'West': 'rotate(270deg)'
    };

    // Determine Traffic Light color for this direction
    const isNS = direction === 'North' || direction === 'South';
    const isGreen = isNS ? (tlPhase >= 4 && tlPhase <= 7) : (tlPhase >= 0 && tlPhase <= 3);
    const tlColor = isGreen ? 'var(--success)' : 'var(--danger)';

    // Emergency state for this direction
    const isEmergencyDir = emergency?.active && emergency?.direction === direction;

    // Helper to detect emergency vehicle types
    const isEmergencyVehicle = (type) => {
        if (!type) return false;
        const t = type.toLowerCase();
        return t.includes('emergency') || t.includes('ambulance') || t.includes('fire') || t.includes('police');
    };

    return (
        <div className="sumo-overlay" style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: isEmergencyDir ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 5, 20, 0.4)',
            backdropFilter: 'blur(2px)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: '20%',
            overflow: 'hidden',
            zIndex: 5,
            transition: 'background 0.5s ease',
        }}>
            {/* Emergency Priority Badge */}
            {isEmergencyDir && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--danger)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.6rem',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    zIndex: 20,
                    animation: 'pulse-glow 1s infinite',
                    textTransform: 'uppercase',
                }}>
                    🚨 PRIORITY
                </div>
            )}

            {/* Virtual Lane Line */}
            <div style={{
                width: '60px',
                height: '100%',
                borderLeft: '2px dashed rgba(255,255,255,0.2)',
                borderRight: '2px dashed rgba(255,255,255,0.2)',
                position: 'relative',
                background: 'rgba(0,0,0,0.2)',
                transform: rotationMap[direction]
            }}>
                {/* Traffic Light Indicator */}
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: tlColor,
                    boxShadow: `0 0 10px ${tlColor}`,
                    zIndex: 10
                }} />

                {/* Vehicles */}
                {vizData.map((veh, idx) => {
                    const isEV = isEmergencyVehicle(veh.type);
                    return (
                        <div key={veh.id || idx} style={{
                            position: 'absolute',
                            top: `${veh.pos * 100}%`,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '24px',
                            height: '36px',
                            background: isEV 
                                ? 'linear-gradient(to bottom, #ef4444, #dc2626)' 
                                : 'linear-gradient(to bottom, var(--accent), var(--primary))',
                            borderRadius: '4px',
                            boxShadow: isEV 
                                ? '0 0 12px rgba(239, 68, 68, 0.6)' 
                                : '0 0 8px var(--primary-glow)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: 'white',
                            fontWeight: 'bold',
                            transition: 'top 0.5s linear',
                            animation: isEV ? 'pulse-glow 0.5s infinite' : 'none',
                        }}>
                            {isEV ? '🚑' : veh.type === 'passenger' ? '🚗' : '🚛'}
                        </div>
                    );
                })}
            </div>

            <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                fontSize: '0.65rem',
                color: isEmergencyDir ? 'var(--danger)' : 'var(--accent)',
                fontWeight: 'bold',
                textTransform: 'uppercase'
            }}>
                {isEmergencyDir ? '⚠ Emergency Override' : 'SIM Engine Active'}
            </div>
        </div>
    );
};

export default SumoOverlay;
