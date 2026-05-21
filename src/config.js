export const DEFAULT_API_URL = 'https://sigeu-backend-production.up.railway.app/api';
export const DEFAULT_AI_SERVICE_URL = 'https://sigeu-ai-service-production.up.railway.app/analizar';

export const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
export const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL;

export const MAX_IMAGE_SIZE_MB = 4;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
