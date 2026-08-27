# Sprint 1

## Objetivo

Normalizar el dominio principal de agendas y dejar autenticacion basica real sobre la base local, manteniendo compatibilidad con el frontend actual.

## Implementacion

- `Agenda` normalizada en Prisma.
- Entidades separadas:
  - `AgendaProfessional`
  - `AgendaBlock`
  - `AgendaHistory`
  - `AuthSession`
- Login con password hasheado y sesiones bearer token.
- Endpoints de autenticacion:
  - `POST /api/auth/login`
  - `POST /api/auth/demo-login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- Endpoints de dominio:
  - `GET /api/agendas`
  - `GET /api/agendas/:externalId`
  - `POST /api/agendas`
  - `PUT /api/agendas/:externalId`
  - `POST /api/agendas/sync`
  - `DELETE /api/agendas/:externalId`
  - `GET /api/profesionales`

## Resultado esperado

- Persistencia relacional real en vez de depender solo de un payload plano.
- Usuarios demo con password funcional (`demo123`).
- Base lista para conectar una pantalla de login y CRUD real por entidad en el siguiente sprint.

## Corte de alcance

- El frontend todavia usa sincronizacion completa de agendas.
- Aun no se implementan permisos finos por endpoint.
- No hay refresh token ni cookies httpOnly.
