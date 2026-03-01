import { apiClient } from '../client';
import type { TrafficData, SystemHealth, YoloAction } from '../../types/api';

export const dataApi = {
  getTrafficData: (): Promise<TrafficData> => apiClient.get('/data'),
  getHealth: (): Promise<SystemHealth> => apiClient.get('/health'),
  getSummary: (): Promise<{ summary: string }> => apiClient.get('/summary'),
  getAlerts: (): Promise<unknown> => apiClient.get('/alerts'),
  getViolations: (): Promise<unknown> => apiClient.get('/violations'),
  getYoloAction: (): Promise<YoloAction> => apiClient.get('/control/yolo'),
};
