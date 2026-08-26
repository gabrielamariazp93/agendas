# Seguimiento de Agendas

Base inicial para convertir el prototipo JSX en una aplicacion real con frontend React/Vite, API Node/Express y base de datos Prisma + SQLite.

## Stack actual

- Frontend: React + Vite
- Backend: Node.js + Express
- ORM: Prisma
- BBDD local: SQLite
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

3. Generar cliente Prisma y crear la base local:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

4. Levantar backend y frontend en terminales separadas:

```bash
npm run dev:server
npm run dev:client
```

Tambien puedes usar:

```bash
npm run dev:full
```

## URLs

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:4000/api`
- Healthcheck: `http://127.0.0.1:4000/api/health`

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
