import { AI_SERVICE_URL, API_URL } from '../config';

const jsonHeaders = { 'Content-Type': 'application/json' };

let runtimeAuthToken = '';

export const setAuthToken = (token) => {
  runtimeAuthToken = token || '';
  if (runtimeAuthToken) {
    sessionStorage.setItem('sigeu_token', runtimeAuthToken);
  } else {
    sessionStorage.removeItem('sigeu_token');
  }
};

export const clearAuthToken = () => {
  setAuthToken('');
};

const getStoredToken = () => {
  return runtimeAuthToken || sessionStorage.getItem('sigeu_token') || '';
};

const authHeaders = (baseHeaders = {}) => {
  const token = getStoredToken();
  return token ? { ...baseHeaders, Authorization: `Bearer ${token}` } : baseHeaders;
};

export const fetchEmergenciesByTarget = (target) => {
  return fetch(`${API_URL}/emergencies?target=${target}&t=${Date.now()}`, {
    method: 'GET',
    cache: 'no-store',
    headers: authHeaders({ 'Cache-Control': 'no-cache' }),
  });
};

export const fetchResourceSummary = (target) => {
  return fetch(`${API_URL}/emergencies/resources?target=${target}&t=${Date.now()}`, {
    method: 'GET',
    cache: 'no-store',
    headers: authHeaders({ 'Cache-Control': 'no-cache' }),
  });
};

export const loginUser = (credentials) => {
  return fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  });
};

export const registerUser = (userData) => {
  return fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(userData),
  });
};

export const recoverUser = (recoverData) => {
  return fetch(`${API_URL}/auth/recover`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(recoverData),
  });
};

export const createEmergency = (emergencyData) => {
  return fetch(`${API_URL}/emergencies`, {
    method: 'POST',
    headers: authHeaders(jsonHeaders),
    body: JSON.stringify(emergencyData),
  });
};

export const updateEmergencyStatus = (id, status) => {
  return fetch(`${API_URL}/emergencies/${id}/status`, {
    method: 'PUT',
    headers: authHeaders(jsonHeaders),
    body: JSON.stringify({ status }),
  });
};

export const deleteEmergencyById = (id) => {
  return fetch(`${API_URL}/emergencies/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
};

export const analyzeIncidentImage = (imageBase64) => {
  return fetch(AI_SERVICE_URL, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ imagen: imageBase64 }),
  });
};
