# SIGEU Frontend

SIGEU es una aplicacion web orientada al reporte ciudadano y la gestion operativa de emergencias. La interfaz permite registrar incidentes, adjuntar evidencia, consultar el seguimiento del reporte y administrar alertas desde paneles especializados para entidades de respuesta.

El frontend se integra con un backend propio desplegado en Railway y con un servicio independiente de inteligencia artificial encargado del analisis de imagenes.

## Objetivo del proyecto

El objetivo principal de SIGEU es centralizar la comunicacion entre ciudadanos y entidades de atencion, reduciendo la perdida de informacion al momento de reportar una emergencia. El sistema permite que cada reporte incluya descripcion, ubicacion, evidencia visual, analisis automatico y seguimiento por estado.

## Alcance funcional

- Registro e inicio de sesion para ciudadanos y entidades.
- Creacion de reportes con asunto, coordenadas GPS, descripcion e imagen.
- Analisis de imagenes mediante un servicio externo de IA.
- Envio del mismo reporte a una o varias entidades.
- Seguimiento ciudadano de los reportes enviados.
- Panel operativo para Policia, Bomberos y Hospital.
- Filtros por estado, prioridad, evidencia, mapa y busqueda textual.
- Vista detallada del caso con descripcion, evidencia, ubicacion y trazabilidad.
- Gestion de recursos operativos disponibles, ocupados y en espera.
- Altas y retiros diarios de personal con limites de control.
- Automatizacion del ciclo operativo: espera, atencion, resolucion y limpieza.

## Arquitectura general

El sistema esta dividido en tres servicios principales:

- Frontend: aplicacion React encargada de la experiencia de usuario.
- Backend: API REST en Spring Boot responsable de autenticacion, reportes, recursos, validaciones y flujo operativo.
- Servicio de IA: API independiente que analiza imagenes y genera una descripcion inicial del incidente.

Esta separacion permite mantener desacoplada la logica visual, la persistencia de datos y el procesamiento de imagenes.

## Tecnologias utilizadas

- React 19
- Vite 8
- Tailwind CSS 4
- Lucide React
- OpenStreetMap embebido
- Java 17 y Spring Boot en backend
- PostgreSQL en Railway
- Servicio externo de IA para analisis de imagenes

## Estructura del frontend

- `src/App.jsx`: composicion principal de vistas, estados y flujos de usuario.
- `src/config.js`: configuracion de URLs y limites de carga.
- `src/services/sigeuApi.js`: cliente para consumir backend y servicio de IA.
- `src/models/EmergencyReport.js`: modelo de reporte, filtros, prioridad y estadisticas.
- `src/models/SigeuUser.js`: modelo de usuario autenticado.
- `src/utils/emergencies.js`: utilidades de coordenadas, mapas, fechas, estados y prioridad.

## Seguridad y validaciones

- Las contrasenas no se almacenan en texto plano en la base de datos.
- El backend aplica hashing con BCrypt.
- La autenticacion entrega token JWT y el frontend lo envia como `Bearer token`.
- La exigencia obligatoria del token puede activarse gradualmente desde Railway.
- El backend cuenta con limites de peticiones para reducir abuso.
- Los formularios aplican limites de longitud en frontend y backend.
- Los reportes validan datos requeridos antes de registrarse.

## Variables de entorno

El frontend puede configurarse con las siguientes variables:

```env
VITE_API_URL=https://sigeu-backend-production.up.railway.app/api
VITE_AI_SERVICE_URL=https://sigeu-ai-service-production.up.railway.app/analizar
```

Si no se definen, la aplicacion utiliza los valores por defecto configurados en `src/config.js`.

## Ejecucion local

Requisitos:

- Node.js
- npm

Comandos:

```powershell
npm.cmd install
npm.cmd run dev
```

URL local:

```text
http://localhost:5173/
```

## Verificacion

```powershell
npm.cmd run lint
npm.cmd run build
```

## Despliegue

El proyecto esta preparado para desplegarse en Vercel.

- Build command: `npm run build`
- Output directory: `dist`
- Variables requeridas: `VITE_API_URL` y `VITE_AI_SERVICE_URL`

## Consideraciones tecnicas

SIGEU conserva una estrategia de autenticacion gradual para evitar bloqueos durante la integracion entre frontend, backend y servicio de IA. El sistema ya emite y envia tokens, mientras que la restriccion obligatoria puede activarse cuando el entorno desplegado este completamente verificado.

La gestion operativa se apoya en reglas del backend para asignar recursos, dejar reportes en espera si no hay disponibilidad, estimar tiempos segun el tipo de emergencia y liberar unidades cuando el caso se resuelve.
