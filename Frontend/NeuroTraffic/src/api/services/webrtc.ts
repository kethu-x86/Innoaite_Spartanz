import { apiClient } from '../client';
import type { MaskConfig } from '../../types/api';

export const webrtcApi = {
  sendOffer: (sdp: string, type: string, camId?: string | null): Promise<unknown> =>
    apiClient.post('/offer', { sdp, type, cam_id: camId }),
};

export const configApi = {
  setMask: (payload: MaskConfig): Promise<unknown> =>
    apiClient.post('/config/mask', payload),
};
