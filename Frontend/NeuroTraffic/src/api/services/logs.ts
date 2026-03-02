import { apiClient } from '../client';
import type { TrafficLog, SignalSchedule, ViolationLog } from '../../types/api';

export const logsApi = {
  getTrafficLogs: (limit = 50, offset = 0): Promise<TrafficLog[]> => 
    apiClient.get('/api/logs/traffic', { params: { limit, offset } }),
    
  getSchedules: (limit = 50, offset = 0): Promise<SignalSchedule[]> => 
    apiClient.get('/api/logs/schedules', { params: { limit, offset } }),
    
  getViolationsLogs: (limit = 50, offset = 0): Promise<ViolationLog[]> => 
    apiClient.get('/api/logs/violations', { params: { limit, offset } })
};
