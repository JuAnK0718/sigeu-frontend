# SIGEU Frontend

SIGEU es una aplicación web diseñada para facilitar el reporte y la gestión de emergencias entre ciudadanos y entidades de respuesta. Permite registrar incidentes incluyendo ubicación, evidencia fotográfica, análisis automático por IA y seguimiento del estado desde un panel dedicado por entidad.

## Funcionalidades

- Acceso diferenciado según perfil: ciudadano o entidad operativa.
- Creación de cuentas para ciudadanos y entidades de respuesta.
- Formulario ciudadano para reportar emergencias con asunto, coordenadas GPS, descripción, imagen adjunta y selección de entidades a alertar.
- Evaluación automática de imágenes a través de un servicio de inteligencia artificial.
- Panel de gestión para Policía, Bomberos y Hospital.
- Herramientas de filtrado por estado, prioridad, evidencia visual y vista de mapa.
- Vista detallada del incidente con evidencia, coordenadas, mapa integrado y controles de cambio de estado.
- Soporte de tema claro y oscuro en el formulario ciudadano.

## Tecnologías

- React
- Vite
- Tailwind CSS
- Lucide React
- OpenStreetMap embebido

## Estructura Principal

- `src/App.jsx`: composición de vistas y estado principal de la interfaz.
- `src/config.js`: URLs de servicios y límites de carga.
- `src/services/sigeuApi.js`: llamadas al backend y al servicio de IA.
- `src/utils/emergencies.js`: helpers de coordenadas, mapas, prioridad, estado y fechas.

## Requisitos

- Node.js
- npm

## Configuración

Crea un archivo `.env` tomando como base `.env.example`:

```env
VITE_API_URL=https://sigeu-backend-production.up.railway.app/api
VITE_AI_SERVICE_URL=https://sigeu-ai-service-production.up.railway.app/analizar
```

Si no defines estas variables, la app utilizará esos servicios de forma predeterminada.

## Ejecución Local

En Windows PowerShell, si `npm run dev` está bloqueado por la política de ejecución de scripts, utiliza:

```powershell
npm.cmd run dev
```

Luego abre en el navegador:

```
http://localhost:5173/
```

## Verificación

```powershell
npm.cmd run lint
npm.cmd run build
```

## Notas de Entrega

El frontend está listo para operar con los endpoints disponibles del backend actual. Ciertas mejoras futuras —como permisos por entidad, historial de reportes ciudadanos, numeración de casos y trazabilidad completa— requerirán ajustes coordinados en el lado del backend.
