# Decisiones Tecnicas

## 1. Backend en Node + Express

Se eligio Node/Express porque el frontend ya esta en React/Vite y el costo de integracion es bajo para este sprint base.

## 2. Prisma + SQLite para la base inicial

El entorno actual no tiene Docker disponible, por lo que SQLite permite dejar persistencia real y ejecutar el proyecto hoy. La siguiente etapa puede migrar a PostgreSQL cambiando el datasource y ajustando migraciones.

## 3. Persistencia temporal via `payload` JSON

El prototipo actual tiene una estructura rica y grande dentro de un solo archivo. Para no bloquear el avance, la primera version guarda cada agenda completa como JSON y extrae campos clave para consulta. Esto evita reescribir todo el dominio antes de tener una base funcional.

## 4. Sincronizacion desde frontend

El prototipo mantiene mucha logica local. En vez de rehacer toda la aplicacion en este sprint, se agrego una sincronizacion hacia la API para persistir el estado actual y permitir seguir iterando.

## 5. Documentacion dentro del repo

La continuidad futura no debe depender de recordar una conversacion. Por eso el sprint, roadmap y decisiones quedan versionados dentro del proyecto.
