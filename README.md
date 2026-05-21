# SIGEU Frontend

SIGEU es una interfaz web para reportar y gestionar emergencias entre ciudadanos y entidades operativas. La app permite registrar incidentes con ubicación, evidencia visual, análisis por IA y seguimiento por estado desde un panel de entidad.

## Funcionalidades

- Inicio de sesión por perfil ciudadano o entidad.
- Registro de ciudadanos y entidades operativas.
- Reporte ciudadano con asunto, ubicación GPS, descripción, imagen y entidades a notificar.
- Análisis de imagen mediante servicio de IA.
- Panel operativo para Policía, Bomberos y Hospital.
- Filtros por estado, prioridad, evidencia y mapa.
- Vista de detalle con evidencia, coordenadas, mapa y acciones de estado.
- Tema claro/oscuro para el formulario ciudadano.

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

Si no defines estas variables, la app usa esos servicios por defecto.

## Ejecución Local

En Windows PowerShell, si `npm run dev` está bloqueado por la política de scripts, usa:

```powershell
npm.cmd run dev
```

Luego abre:

```text
http://localhost:5173/
```

## Verificación

```powershell
npm.cmd run lint
npm.cmd run build
```

## Notas De Entrega

El frontend está preparado para funcionar con los endpoints actuales del backend. Algunas mejoras de producto, como permisos reales de entidad, historial ciudadano, número de caso y trazabilidad completa, requieren cambios coordinados en backend.
