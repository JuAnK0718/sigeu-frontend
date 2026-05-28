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

## Guia de defensa

### Que es SIGEU

SIGEU es un sistema de gestion de emergencias que conecta ciudadanos con entidades operativas como Policia, Bomberos y Hospital. El ciudadano reporta una emergencia con ubicacion, evidencia e IA; la entidad recibe, prioriza, atiende y hace seguimiento del caso.

### Que puedes mostrar en la demo

1. Crear o iniciar sesion como ciudadano.
2. Enviar un reporte con GPS, descripcion e imagen.
3. Ver el seguimiento ciudadano del reporte.
4. Entrar como entidad y mostrar filtros, mapa y detalle operativo.
5. Mostrar recursos disponibles, ocupados y gestion diaria de personal.
6. Explicar que el backend mueve casos entre espera, atencion, resuelto y limpieza automatica.

### Puntos fuertes

- Frontend en React con componentes y modelos POO.
- Backend en Java Spring Boot con entidades, repositorios, servicios y controladores.
- PostgreSQL en Railway para persistencia.
- IA separada del backend para analizar imagenes.
- JWT gradual para autenticacion sin bloquear toda la app de golpe.
- Rate limit para reducir abuso de peticiones.
- Validaciones de longitud en frontend y backend.
- Passwords hasheadas con BCrypt.
- Paneles diferenciados para ciudadano y entidades.

### Preguntas dificiles y respuestas

- Si preguntan si la contrasena se puede ver con F12:
  La contrasena puede verse si el usuario cambia el input en su propio navegador, pero no se envia ni se guarda en texto plano en la base de datos. En backend se hashea con BCrypt.

- Si preguntan por muchas peticiones:
  El backend tiene rate limit por IP para login, reportes y API general.

- Si preguntan por datos reales:
  El sistema usa PostgreSQL en Railway y no depende de datos temporales del navegador para los reportes.

- Si preguntan por IA:
  La IA de imagen esta en un servicio independiente y el frontend solo consume su endpoint. La IA operativa del backend aplica reglas de asignacion y tiempos sobre la descripcion recibida.

- Si preguntan por seguridad pendiente:
  La autenticacion JWT esta lista de forma gradual. Para endurecer produccion se activa `SIGEU_AUTH_REQUIRE_TOKEN=true` despues de confirmar usuarios y despliegue.

### Antes de presentar

- Probar Vercel desde el celular.
- Probar Railway con al menos un reporte nuevo.
- Tener usuarios demo listos para ciudadano y entidades.
- Tener una imagen de emergencia preparada.
- No cambiar variables de entorno minutos antes de exponer.
