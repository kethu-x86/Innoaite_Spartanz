import { apiClient } from '../client';
import type { EmergencyRequest } from '../../types/api';

export const simulationApi = {
  start: (): Promise<unknown> => apiClient.get('/control/sumo/start'),
  step: (): Promise<unknown> => apiClient.get('/control/sumo/step'),
  stop: (): Promise<unknown> => apiClient.get('/control/sumo/stop'),
};

export const emergencyApi = {
  getEmergencyState: (): Promise<unknown> => apiClient.get('/control/emergency'),
  setEmergencyPriority: (payload: EmergencyRequest): Promise<unknown> =>
    apiClient.post('/control/emergency', payload),
};
