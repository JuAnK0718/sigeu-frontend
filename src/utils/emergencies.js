export const parseEmergencyCoordinates = (location) => {
  const matches = String(location || '').match(/-?\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length < 2) return null;

  const [lat, lng] = matches.slice(0, 2).map(value => Number(value.replace(',', '.')));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
};

export const getIncidentMapEmbedUrl = ({ lat, lng }) => {
  const margin = 0.006;
  const bbox = `${lng - margin},${lat - margin},${lng + margin},${lat + margin}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
};

export const getIncidentMapUrl = ({ lat, lng }) => {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
};

export const getEmergencyPriority = (emergency, role) => {
  const text = `${emergency.title || ''} ${emergency.description || ''} ${emergency.type || ''}`.toLowerCase();
  const highByRole = {
    POLICIA: ['arma', 'disparo', 'robo', 'asalto', 'violencia', 'secuestro', 'herido'],
    BOMBEROS: ['incendio', 'fuego', 'humo', 'explosion', 'explosión', 'gas', 'atrapado'],
    HOSPITAL: ['herido', 'sangre', 'ambulancia', 'inconsciente', 'grave', 'fractura', 'medico', 'médico'],
  };
  const mediumWords = ['accidente', 'choque', 'emergencia', 'riesgo', 'auxilio'];
  const highWords = highByRole[role] || ['emergencia', 'grave', 'herido'];

  if (highWords.some(word => text.includes(word))) {
    return { label: 'Alta', className: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' };
  }
  if (mediumWords.some(word => text.includes(word))) {
    return { label: 'Media', className: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
  }
  return { label: 'Normal', className: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
};

export const getStatusConfig = (status) => {
  switch (status) {
    case 'RESOLVED':
      return { label: 'Resuelto', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    case 'IN_PROGRESS':
      return { label: 'En atención', className: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    default:
      return { label: 'Nueva alerta', className: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' };
  }
};

const APP_TIME_ZONE = 'America/Bogota';

const parseEmergencyDate = (value) => {
  if (!value) return 'Sin fecha';

  if (typeof value === 'string') {
    const hasExplicitTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
    const looksLikeIsoDateTime = /^\d{4}-\d{2}-\d{2}T/.test(value);
    const normalizedValue = looksLikeIsoDateTime && !hasExplicitTimeZone ? `${value}Z` : value;
    return new Date(normalizedValue);
  }

  return new Date(value);
};

export const formatEmergencyTime = (value) => {
  const date = parseEmergencyDate(value);
  if (date === 'Sin fecha' || Number.isNaN(date.getTime())) return 'Sin fecha';

  return date.toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: APP_TIME_ZONE,
  });
};
