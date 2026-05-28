# Guia corta para defender SIGEU

## Que es SIGEU

SIGEU es un sistema de gestion de emergencias que conecta ciudadanos con entidades operativas como Policia, Bomberos y Hospital. El ciudadano reporta una emergencia con ubicacion, evidencia e IA; la entidad recibe, prioriza, atiende y hace seguimiento del caso.

## Que puedes mostrar en la demo

1. Crear o iniciar sesion como ciudadano.
2. Enviar un reporte con GPS, descripcion e imagen.
3. Ver el seguimiento ciudadano del reporte.
4. Entrar como entidad y mostrar filtros, mapa y detalle operativo.
5. Mostrar recursos disponibles, ocupados y gestion diaria de personal.
6. Explicar que el backend mueve casos entre espera, atencion, resuelto y limpieza automatica.

## Puntos fuertes

- Frontend en React con componentes y modelos POO.
- Backend en Java Spring Boot con entidades, repositorios, servicios y controladores.
- PostgreSQL en Railway para persistencia.
- IA separada del backend para analizar imagenes.
- JWT gradual para autenticacion sin bloquear toda la app de golpe.
- Rate limit para reducir abuso de peticiones.
- Validaciones de longitud en frontend y backend.
- Passwords hasheadas con BCrypt.
- Paneles diferenciados para ciudadano y entidades.

## Preguntas dificiles y respuestas

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

## Antes de presentar

- Probar Vercel desde el celular.
- Probar Railway con al menos un reporte nuevo.
- Tener usuarios demo listos para ciudadano y entidades.
- Tener una imagen de emergencia preparada.
- No cambiar variables de entorno minutos antes de exponer.
