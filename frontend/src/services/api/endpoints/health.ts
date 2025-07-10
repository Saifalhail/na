import { api } from '../client';
import { API_ENDPOINTS } from '../config';
import { HealthStatus, ReadinessStatus, ApiMetrics } from '@types/api';

export const healthApi = {
  /**
   * Check if API is healthy
   */
  async checkHealth(): Promise<HealthStatus> {
    return await api.get<HealthStatus>(API_ENDPOINTS.health.check);
  },
  
  /**
   * Check if API is ready to serve requests
   */
  async checkReadiness(): Promise<ReadinessStatus> {
    return await api.get<ReadinessStatus>(API_ENDPOINTS.health.ready);
  },
  
  /**
   * Check if API is alive (minimal check)
   */
  async checkLiveness(): Promise<{ status: string }> {
    return await api.get<{ status: string }>(API_ENDPOINTS.health.live);
  },
  
  /**
   * Get API metrics
   */
  async getMetrics(): Promise<ApiMetrics> {
    return await api.get<ApiMetrics>(API_ENDPOINTS.health.metrics);
  },
  
  /**
   * Ping API to check connectivity
   */
  async ping(): Promise<boolean> {
    try {
      await this.checkLiveness();
      return true;
    } catch (error) {
      return false;
    }
  },
};