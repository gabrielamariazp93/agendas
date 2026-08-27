# Seguimiento de Agendas

Base inicial para convertir el prototipo JSX en una aplicacion real con frontend React/Vite, API Node/Express y base de datos Prisma + SQLite.

## Camino recomendado a produccion

- App web completa en un solo servicio `Render`
- Base de datos en `Neon Postgres`
- Dominio propio conectado en Render

En este paso la app ya queda preparada para que el backend Express pueda servir tambien el `dist` del frontend en produccion.

## Stack actual

- Frontend: React + Vite
- Backend: Node.js + Express
- ORM: Prisma
- BBDD objetivo: Neon Postgres
- Auth base: bearer token + sesiones en base de datos
- IA opcional: Anthropic via `VITE_ANTHROPIC_API_KEY`

## Arranque local

1. Instalar dependencias:

```bash
npm install
```

2. Crear variables de entorno:

```bash
cp .env.example .env
```

3. Completar en `.env` tus credenciales reales de Neon:

- `DATABASE_URL`: URL pooler
- `DIRECT_URL`: URL directa

4. Generar cliente Prisma y crear el esquema en Neon:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

5. Levantar backend y frontend en terminales separadas:

```bash
npm run dev:server
npm run dev:client
```

Tambien puedes usar:

```bash
npm run dev:full
```

## URLs locales

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:4000/api`
- Healthcheck: `http://127.0.0.1:4000/api/health`

## Produccion

Despues de ejecutar `npm run build`, el servidor Express servira tambien los archivos de `dist`.

- App completa: `https://tu-dominio.com`
- API: `https://tu-dominio.com/api`

## Deploy en Render

El repositorio ya incluye [render.yaml](/Users/pabloabarca/Desktop/Proyecto/render.yaml:1) con una configuracion base para un `Web Service`.

Valores principales:

- `buildCommand`: `npm ci && npm run db:generate && npm run build`
- `startCommand`: `npm start`
- `healthCheckPath`: `/healthz`

Variables que debes definir en Render:

- `DATABASE_URL`: la URL pooled de Neon
- `DIRECT_URL`: la URL directa de Neon

Variables ya contempladas:

- `APP_ENV=production`
- `HOST=0.0.0.0`
- `VITE_API_URL=/api`
- `SESSION_SECRET` generado por Render

## Comandos de base de datos

- `npm run db:generate`: genera Prisma Client
- `npm run db:push`: crea o sincroniza el esquema rapidamente
- `npm run db:migrate -- --name init`: crea migraciones versionadas
- `npm run db:deploy`: aplica migraciones en servidor
- `npm run db:seed`: carga servicios y usuarios base

## Credenciales demo

Endpoints:

- `POST /api/auth/login`
- `POST /api/auth/demo-login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

- Password comun de desarrollo: `demo123`
- Usuarios seeded:
  - `admin@hospital.local`
  - `referente@hospital.local`
  - `admision@hospital.local`
  - `subdireccion@hospital.local`
  - `cardiologia@hospital.local`
  - `oftalmologia@hospital.local`
  - `traumatologia@hospital.local`

## Documentacion

- [docs/sprint-base.md](/Users/pabloabarca/Desktop/Proyecto/docs/sprint-base.md:1)
- [docs/sprint-1.md](/Users/pabloabarca/Desktop/Proyecto/docs/sprint-1.md:1)
- [docs/roadmap.md](/Users/pabloabarca/Desktop/Proyecto/docs/roadmap.md:1)
- [docs/decisiones-tecnicas.md](/Users/pabloabarca/Desktop/Proyecto/docs/decisiones-tecnicas.md:1)
# agendas
