# Sprint Base

## Objetivo

Transformar el prototipo `prototipo_seguimiento_agendas.jsx` en una base de producto operable, con persistencia real, API local y estructura de trabajo que permita iterar por sprints.

## Alcance implementado

- Frontend Vite funcionando con el prototipo actual.
- Backend Express inicial con endpoints REST.
- Base de datos SQLite via Prisma.
- Seed de servicios y usuarios demo.
- Sincronizacion inicial del prototipo hacia la BBDD.
- Variables de entorno y scripts operativos.
- Documentacion para continuidad del trabajo.

## Historias cubiertas

1. Como equipo de producto, necesito una base tecnica ejecutable para seguir desarrollando sin partir desde un archivo JSX aislado.
2. Como usuario interno, necesito que las agendas puedan persistirse fuera del navegador.
3. Como equipo tecnico, necesito una estructura clara para retomar el trabajo en sesiones futuras.

## Entregables

- API en `server/index.js`
- Esquema Prisma en `prisma/schema.prisma`
- Seed inicial en `prisma/seed.js`
- Conector frontend/API en `src/lib/api.js`
- Prototipo sincronizado con backend

## Riesgos diferidos

- La agenda aun se persiste como `payload` JSON; la normalizacion fina del dominio queda para el siguiente sprint.
- No hay autenticacion real con sesiones o JWT, solo login demo.
- No hay pruebas automaticas aun.
- No hay Docker disponible en este entorno; la base local se resolvio con SQLite.

## Definicion de listo para este sprint

- `npm run db:push` funciona
- `npm run db:seed` funciona
- `npm run build` funciona
- `GET /api/health` responde
- El frontend carga agendas desde API cuando existen
- El frontend sincroniza cambios hacia la base
