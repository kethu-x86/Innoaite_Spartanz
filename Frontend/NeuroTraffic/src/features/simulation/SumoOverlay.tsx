import { useQuery } from '@tanstack/react-query';
import { dataApi } from '../../api/services/data';
import { emergencyApi } from '../../api/services/simulation';

interface SumoOverlayProps {
  direction: 'North' | 'South' | 'East' | 'West';
}

const SumoOverlay = ({ direction }: SumoOverlayProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: summary } = useQuery<any>({
    queryKey: ['traffic-summary'],
    queryFn: dataApi.getSummary,
    refetchInterval: 200, // Faster polling for smooth real-time overlay
  });

  const { data: emergency } = useQuery<{direction: string, active: boolean} | null>({
    queryKey: ['emergency-state'],
    queryFn: async () => (await emergencyApi.getEmergencyState()) as {direction: string, active: boolean},
    refetchInterval: 500,
  });

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
  const tlColor = isGreen ? 'var(--color-brand-green)' : 'var(--color-brand-red)';

  // Emergency state for this direction
  const isEmergencyDir = emergency?.active && emergency?.direction === direction;

  const isEmergencyVehicle = (type: string) => {
      if (!type) return false;
      const t = type.toLowerCase();
      return t.includes('emergency') || t.includes('ambulance') || t.includes('fire') || t.includes('police');
  };

  return (
      <div className={`absolute inset-0 pointer-events-none flex flex-col items-center justify-start pt-12 overflow-hidden z-10 transition-colors duration-200 ${isEmergencyDir ? 'bg-brand-red/10' : 'bg-transparent'}`}>
          
          {/* Virtual Road / Lane */}
          <div 
            className="relative w-20 h-full border-x-2 border-brand-gray bg-brand-black/60 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]"
            style={{ transform: rotationMap[direction] }}
          >
              {/* Traffic Light Indicator - Brutalist Box style */}
              <div 
                className="absolute top-4 left-1/2 -translate-x-1/2 w-6 h-6 border-2 border-black z-10 transition-colors duration-300"
                style={{ 
                    backgroundColor: tlColor, 
                    boxShadow: isGreen ? '4px 4px 0px 0px rgba(0,0,0,1)' : '4px 4px 0px 0px rgba(0,0,0,1)' 
                }} 
              >
                  <div className={`w-full h-full ${isGreen ? 'animate-pulse' : ''} bg-white/20`} />
              </div>

              {/* Road Markings */}
              <div className="absolute inset-0 flex flex-col items-center justify-around opacity-10 py-10">
                  {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-1 h-8 bg-brand-white" />
                  ))}
              </div>

              {/* Vehicles */}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {vizData.map((veh: any, idx: number) => {
                  const isEV = isEmergencyVehicle(veh.type);
                  let vehEmoji = '🚛';
                  if (isEV) vehEmoji = '🚑';
                  else if (veh.type === 'passenger') vehEmoji = '🚗';
                  
                  return (
                      <div 
                        key={veh.id || idx} 
                        className={`absolute left-1/2 -translate-x-1/2 w-8 h-12 flex items-center justify-center text-xl transition-all duration-300 ease-linear border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${isEV ? 'bg-brand-red animate-pulse z-20' : 'bg-brand-white text-brand-black z-10'}`}
                        style={{ top: `${veh.pos * 100}%` }}
                      >
                          <span className="drop-shadow-sm">{vehEmoji}</span>
                      </div>
                  );
              })}
          </div>

          {/* Side Labels */}
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
              {isEmergencyDir && (
                  <div className="bg-brand-red border-2 border-black text-brand-black px-2 py-0.5 text-[9px] font-black tracking-tighter uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      PRIORITY_OVR_RD
                  </div>
              )}
              <div className={`border-2 border-black px-2 py-0.5 text-[9px] font-black tracking-tighter uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isEmergencyDir ? 'bg-brand-red text-black' : 'bg-brand-green text-black'}`}>
                  {isEmergencyDir ? '⚠ SYSTEM_ALERT' : 'ENG_ACTV // 0xAF'}
              </div>
          </div>
          
          <div className="absolute bottom-2 left-2 bg-brand-black border border-brand-gray px-1.5 py-0.5 text-[8px] font-mono text-brand-white/50 uppercase">
              DATA_STREAM_v1.0.4
          </div>
      </div>
  );
};

export default SumoOverlay;
