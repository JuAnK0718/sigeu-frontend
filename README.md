# SIGEU Frontend

Interfaz web de SIGEU para reporte ciudadano y gestion operativa de emergencias. El frontend consume el backend en Railway y el servicio de IA desplegado aparte.

## Funcionalidades principales

- Registro e inicio de sesion para ciudadanos y entidades.
- Envio de reportes con asunto, GPS, descripcion, evidencia fotografica y entidades destino.
- Analisis de imagen por IA antes de enviar el reporte.
- Seguimiento ciudadano de reportes enviados.
- Panel por entidad con filtros, detalle operativo, mapa, recursos, personal e IA operativa.
- Gestion diaria de recursos: agregar y retirar personal con limites.
- Flujo automatico de atencion, resolucion y limpieza coordinado por el backend.
- Modo claro/oscuro en la vista ciudadana.

## Tecnologias

- React 19
- Vite 8
- Tailwind CSS 4
- Lucide React
- OpenStreetMap embebido
- API REST propia en Spring Boot

## Estructura

- `src/App.jsx`: vistas principales, estado de UI y flujos de usuario.
- `src/config.js`: URLs de backend, IA y limites de imagen.
- `src/services/sigeuApi.js`: llamadas al backend y al servicio de IA.
- `src/models/EmergencyReport.js`: modelo POO para reportes y estadisticas.
- `src/models/SigeuUser.js`: modelo POO para usuario autenticado.
- `src/utils/emergencies.js`: prioridad, mapas, coordenadas, fechas y estados.

## Variables de entorno

Copia `.env.example` si vas a correr localmente:

```env
VITE_API_URL=https://sigeu-backend-production.up.railway.app/api
VITE_AI_SERVICE_URL=https://sigeu-ai-service-production.up.railway.app/analizar
```

Si no defines estas variables, la app usa esos valores por defecto.

## Ejecucion local

En Windows, usa `npm.cmd` si PowerShell bloquea `npm.ps1`:

```powershell
npm.cmd install
npm.cmd run dev
```

Abre:

```text
http://localhost:5173/
```

## Verificacion

```powershell
npm.cmd run lint
npm.cmd run build
```

## Despliegue

Vercel puede desplegar el proyecto con:

- Build command: `npm run build`
- Output directory: `dist`
- Variables: `VITE_API_URL` y `VITE_AI_SERVICE_URL`

## Notas de entrega

El frontend no guarda contrasenas en texto plano. El token de sesion se mantiene en `sessionStorage` y se envia al backend como `Bearer token` cuando existe. La proteccion fuerte de rutas depende de activar `SIGEU_AUTH_REQUIRE_TOKEN=true` en Railway cuando ya este probado.
