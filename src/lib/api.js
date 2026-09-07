const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'agenda_app_token';

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function fetchHealth() {
  return request('/health');
}

export function getAuthToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (!token) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
}

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(data.token);
  return data;
}

export async function demoLogin(role) {
  const data = await request('/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
  setAuthToken(data.token);
  return data;
}

export async function fetchMe() {
  return request('/auth/me');
}

export async function logout() {
  const result = await request('/auth/logout', { method: 'POST' });
  setAuthToken(null);
  return result;
}

export async function fetchAgendas() {
  return request('/agendas');
}

export async function fetchAgenda(externalId) {
  return request(`/agendas/${externalId}`);
}

export async function fetchBootstrap() {
  return request('/bootstrap');
}

export async function fetchServices() {
  const data = await fetchBootstrap();
  return data.services;
}

export async function fetchNotifications() {
  return request('/notifications');
}

export async function createAgenda(payload) {
  return request('/agendas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAgenda(externalId, payload) {
  return request(`/agendas/${externalId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateAgendaFields(externalId, payload) {
  return request(`/agendas/${externalId}/fields`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAgenda(externalId) {
  return request(`/agendas/${externalId}`, {
    method: 'DELETE',
  });
}

export async function confirmDraft(externalId) {
  return request(`/agendas/${externalId}/actions/confirm-draft`, {
    method: 'POST',
  });
}

export async function transitionAgenda(externalId, targetStatus, comment) {
  return request(`/agendas/${externalId}/actions/transition`, {
    method: 'POST',
    body: JSON.stringify({ targetStatus, comment }),
  });
}

export async function extendAgendaVigencia(externalId, vigenciaHasta) {
  return request(`/agendas/${externalId}/actions/extend-vigencia`, {
    method: 'POST',
    body: JSON.stringify({ vigenciaHasta }),
  });
}

export async function createProfessional(externalId, payload) {
  return request(`/agendas/${externalId}/professionals`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProfessional(externalId, professionalId, payload) {
  return request(`/agendas/${externalId}/professionals/${professionalId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteProfessional(externalId, professionalId) {
  return request(`/agendas/${externalId}/professionals/${professionalId}`, {
    method: 'DELETE',
  });
}

export async function createBlock(externalId, payload) {
  return request(`/agendas/${externalId}/blocks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBlock(externalId, blockId, payload) {
  return request(`/agendas/${externalId}/blocks/${blockId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteBlock(externalId, blockId) {
  return request(`/agendas/${externalId}/blocks/${blockId}`, {
    method: 'DELETE',
  });
}

export async function fetchUsers() {
  return request('/users');
}

export async function createUser(payload) {
  return request('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCatalogActivities(params) {
  return request(`/catalog/activities${buildQuery(params)}`);
}

export async function fetchCatalogProcesses(params) {
  return request(`/catalog/processes${buildQuery(params)}`);
}

export async function fetchCatalogProfessions() {
  return request('/catalog/professions');
}

export async function fetchReferencePerformance(params) {
  return request(`/catalog/reference-performance${buildQuery(params)}`);
}

export async function fetchShiftRoster(serviceId, from, to) {
  return request(`/services/${serviceId}/shift-roster${buildQuery({ from, to })}`);
}

export async function createShiftRotation(serviceId, payload) {
  return request(`/services/${serviceId}/shift-rotations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateShiftRotation(serviceId, rotationId, payload) {
  return request(`/services/${serviceId}/shift-rotations/${rotationId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteShiftRotation(serviceId, rotationId) {
  return request(`/services/${serviceId}/shift-rotations/${rotationId}`, {
    method: 'DELETE',
  });
}

export async function createShiftOverride(serviceId, rotationId, payload) {
  return request(`/services/${serviceId}/shift-rotations/${rotationId}/overrides`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteShiftOverride(serviceId, rotationId, overrideId) {
  return request(`/services/${serviceId}/shift-rotations/${rotationId}/overrides/${overrideId}`, {
    method: 'DELETE',
  });
}

export async function uploadHrDotacion(file) {
  const token = getAuthToken();
  const form = new FormData();
  form.append('file', file);
  // No se fija Content-Type a mano: el navegador arma el boundary de multipart solo si se lo
  // dejamos, por eso esto no pasa por request() (que siempre fuerza application/json).
  const response = await fetch(`${API_BASE}/hr/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchHrSummary(params) {
  return request(`/hr/summary${buildQuery(params)}`);
}

export async function fetchHrPersonas(q, planta) {
  return request(`/hr/personas${buildQuery({ q, planta })}`);
}

export async function uploadPabellonPlan(file) {
  const token = getAuthToken();
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${API_BASE}/pabellon/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchPabellonSummary() {
  return request('/pabellon/summary');
}

export async function fetchPabellonCapacidad(servicio) {
  return request(`/pabellon/capacidad${buildQuery({ servicio })}`);
}
