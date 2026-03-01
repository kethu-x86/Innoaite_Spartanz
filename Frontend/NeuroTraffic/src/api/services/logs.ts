import { apiClient } from '../client';

export const logsApi = {
  getTrafficLogs: (limit = 50, offset = 0): Promise<unknown> => 
    apiClient.get('/api/logs/traffic', { params: { limit, offset } }),
    
  getSchedules: (limit = 50, offset = 0): Promise<unknown> => 
    apiClient.get('/api/logs/schedules', { params: { limit, offset } }),
    
  getViolationsLogs: (limit = 50, offset = 0): Promise<unknown> => 
    apiClient.get('/api/logs/violations', { params: { limit, offset } })
};
