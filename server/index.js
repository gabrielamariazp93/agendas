import { randomUUID } from 'crypto';
import cors from 'cors';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import {
  buildSessionExpiry,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  serializeUser,
  verifyPassword,
} from './lib/auth.js';
import {
  findAgendaRecord,
  normalizeAgendaPayload,
  serializeAgenda,
  toAgendaStatus,
  writeAgendaGraph,
} from './lib/agendas.js';

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const ROLE_LABELS = {
  admin: 'Administrador',
  jefe_servicio: 'Jefe de Servicio',
  referente_programacion: 'Referente de Programacion',
  admision: 'Admision',
  subdirector: 'Subdireccion',
};

const CORE_PROCESSES = ['Ambulatorio', 'Hospitalizado', 'Quirúrgico', 'Urgencia'];
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HEATMAP_START_HOUR = 8;
const HEATMAP_END_HOUR = 20;

function buildHeatmapLabels() {
  const labels = [];
  for (let minutes = HEATMAP_START_HOUR * 60; minutes < HEATMAP_END_HOUR * 60; minutes += 30) {
    const startHour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const startMinute = String(minutes % 60).padStart(2, '0');
    const end = minutes + 30;
    const endHour = String(Math.floor(end / 60)).padStart(2, '0');
    const endMinute = String(end % 60).padStart(2, '0');
    labels.push(`${startHour}:${startMinute}–${endHour}:${endMinute}`);
  }
  return labels;
}

const HEATMAP_LABELS = buildHeatmapLabels();

function parseBooleanParam(value, fallback = false) {
  if (typeof value !== 'string') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function parseOptionalDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nowLabel() {
  return new Date().toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isPrivilegedRole(role) {
  return ['admin', 'referente_programacion', 'admision', 'subdirector'].includes(role);
}

function buildEmptyHours() {
  return Object.fromEntries(CORE_PROCESSES.map((process) => [process, 0]));
}

function buildEmptyDistribution() {
  const distribution = {};
  for (const day of DAYS) {
    distribution[day] = {};
    for (const label of HEATMAP_LABELS) {
      distribution[day][label] = 0;
    }
  }
  return distribution;
}

function computeHoursFromBlocks(blocks) {
  const hours = buildEmptyHours();
  for (const block of blocks) {
    if (!block.process || !(block.process in hours)) continue;
    hours[block.process] += block.durationMinutes / 60;
  }
  return hours;
}

function computeDistributionFromBlocks(blocks) {
  const distribution = buildEmptyDistribution();
  for (const block of blocks) {
    if (!distribution[block.day]) continue;
    const start = block.startMinutes;
    const end = block.startMinutes + block.durationMinutes;
    HEATMAP_LABELS.forEach((label, index) => {
      const cellStart = HEATMAP_START_HOUR * 60 + index * 30;
      const cellEnd = cellStart + 30;
      const overlap = Math.min(end, cellEnd) - Math.max(start, cellStart);
      if (overlap > 0) {
        distribution[block.day][label] += overlap / 60;
      }
    });
  }
  return distribution;
}

function mapCatalogActivity(row) {
  return {
    id: row.id,
    sourceId: row.sourceId,
    process: row.process,
    profession: row.profession,
    specialty: row.specialty,
    activity: row.activity,
    isClinical: row.isClinical,
    hasPerformance: row.hasPerformance,
  };
}

async function resolveSpecialty({ serviceId, serviceName, specialty }) {
  if (typeof specialty === 'string' && specialty.trim()) {
    return specialty.trim();
  }

  if (typeof serviceId === 'string' && serviceId.trim()) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId.trim() },
      select: { specialtyCatalog: true },
    });
    return service?.specialtyCatalog ?? null;
  }

  if (typeof serviceName === 'string' && serviceName.trim()) {
    const service = await prisma.service.findUnique({
      where: { name: serviceName.trim() },
      select: { specialtyCatalog: true },
    });
    return service?.specialtyCatalog ?? null;
  }

  return null;
}

async function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    req.authUser = null;
    req.sessionId = null;
    next();
    return;
  }

  const token = authHeader.slice('Bearer '.length);
  const tokenHash = hashSessionToken(token);
  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: { service: true },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    req.authUser = null;
    req.sessionId = null;
    next();
    return;
  }

  req.authUser = session.user;
  req.sessionId = session.id;
  next();
}

function requireAuth(req, res) {
  if (req.authUser) return true;
  res.status(401).json({ error: 'Sesion requerida.' });
  return false;
}

function requireRoles(req, res, roles) {
  if (!requireAuth(req, res)) return false;
  if (roles.includes(req.authUser.role)) return true;
  res.status(403).json({ error: 'No autorizado para esta accion.' });
  return false;
}

function ensureValidDateRange(validFrom, validTo) {
  if (!validFrom || !validTo) return true;
  return validTo.getTime() >= validFrom.getTime();
}

function buildAgendaWhereForUser(user, query) {
  const where = {};
  if (typeof query.service === 'string' && query.service) {
    where.serviceName = query.service;
  }
  if (typeof query.status === 'string' && query.status) {
    where.status = toAgendaStatus(query.status);
  }
  if (user.role === 'jefe_servicio') {
    where.serviceId = user.serviceId ?? '__no_service__';
  }
  return where;
}

async function loadAgendaOr404(externalId, res) {
  const agenda = await findAgendaRecord(prisma, externalId);
  if (!agenda) {
    res.status(404).json({ error: 'Agenda no encontrada.' });
    return null;
  }
  return agenda;
}

function canViewAgenda(user, agenda) {
  return isPrivilegedRole(user.role) || (user.role === 'jefe_servicio' && user.serviceId && user.serviceId === agenda.serviceId);
}

function canEditAgenda(user, agenda) {
  return user.role === 'admin' || (user.role === 'jefe_servicio' && user.serviceId && user.serviceId === agenda.serviceId && ['borrador', 'rechazada'].includes(agenda.status));
}

async function createAudit(tx, agendaId, actorUser, action, entityType, entityId, payload) {
  await tx.agendaAudit.create({
    data: {
      agendaId,
      actorUserId: actorUser?.id ?? null,
      userName: actorUser?.name ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      payloadJson: payload ? JSON.stringify(payload) : null,
    },
  });
}

async function createHistory(tx, agendaId, actorUser, action, { comment = null, fromStatus = null, toStatus = null, eventType = null } = {}) {
  const sortOrder = await tx.agendaHistory.count({ where: { agendaId } });
  await tx.agendaHistory.create({
    data: {
      agendaId,
      externalId: randomUUID(),
      actorUserId: actorUser?.id ?? null,
      dateLabel: nowLabel(),
      eventType,
      action,
      fromStatus,
      toStatus,
      userName: actorUser?.name ?? '',
      comment,
      sortOrder,
    },
  });
}

async function createNotification(tx, { agendaId = null, destinationRole = null, userId = null, text }) {
  await tx.notification.create({
    data: {
      agendaId,
      destinationRole,
      userId,
      text,
    },
  });
}

async function resolveCatalogActivityForBlock(tx, agenda, profession, blockInput) {
  const process = blockInput.process ?? blockInput.proceso ?? null;
  const activity = blockInput.activity ?? blockInput.actividad ?? null;
  if (!process || !activity) return null;
  const specialties = agenda.serviceSpecialty ? [agenda.serviceSpecialty, 'No Aplica'] : ['No Aplica'];
  const rows = await tx.catalogActivity.findMany({
    where: {
      process,
      profession,
      specialty: { in: specialties },
      activity,
    },
  });

  rows.sort((a, b) => {
    const aScore = a.specialty === agenda.serviceSpecialty ? 0 : 1;
    const bScore = b.specialty === agenda.serviceSpecialty ? 0 : 1;
    return aScore - bScore;
  });

  return rows[0] ?? null;
}

async function resolveSuggestedPerformance(tx, agenda, blockInput) {
  const process = blockInput.process ?? blockInput.proceso ?? null;
  const activity = blockInput.activity ?? blockInput.actividad ?? null;
  if (!activity || !process || !agenda.serviceSpecialty) {
    return { suggestedPerformance: null, performanceSource: null };
  }
  const row = await tx.referencePerformance.findUnique({
    where: {
      process_activity_specialty: {
        process,
        activity,
        specialty: agenda.serviceSpecialty,
      },
    },
  });

  if (!row) return { suggestedPerformance: null, performanceSource: null };

  return {
    suggestedPerformance: row.localValue ?? row.nationalValue ?? null,
    performanceSource: row.localValue != null ? 'local' : row.nationalValue != null ? 'national' : null,
  };
}

async function recomputeAgendaDerivedData(tx, agendaId) {
  const blocks = await tx.agendaBlock.findMany({
    where: { agendaId },
    select: {
      day: true,
      startMinutes: true,
      durationMinutes: true,
      process: true,
    },
  });

  const hours = computeHoursFromBlocks(blocks);
  const distribution = computeDistributionFromBlocks(blocks);

  await tx.agenda.update({
    where: { id: agendaId },
    data: {
      hoursJson: JSON.stringify(hours),
      distributionJson: JSON.stringify(distribution),
      lastUpdated: BigInt(Date.now()),
    },
  });
}

async function resolveProfessionalOr404(tx, agendaId, professionalId, res) {
  const professional = await tx.agendaProfessional.findFirst({
    where: {
      agendaId,
      OR: [{ externalId: String(professionalId) }, { id: String(professionalId) }],
    },
  });
  if (!professional) {
    res.status(404).json({ error: 'Profesional no encontrado.' });
    return null;
  }
  return professional;
}

async function resolveBlockOr404(tx, agendaId, blockId, res) {
  const block = await tx.agendaBlock.findFirst({
    where: {
      agendaId,
      OR: [{ externalId: String(blockId) }, { id: String(blockId) }],
    },
  });
  if (!block) {
    res.status(404).json({ error: 'Bloque no encontrado.' });
    return null;
  }
  return block;
}

function transitionDefinition(targetStatus) {
  return {
    enviada: {
      roles: ['jefe_servicio', 'admin'],
      from: ['borrador', 'rechazada'],
      notificationRole: 'referente_programacion',
      action: 'Enviada a Referente',
      eventType: 'workflow',
    },
    aprobada: {
      roles: ['referente_programacion', 'subdirector', 'admin'],
      from: ['enviada', 'escalada'],
      notificationRole: 'admision',
      action: 'Aprobada',
      eventType: 'workflow',
    },
    rechazada: {
      roles: ['referente_programacion', 'subdirector', 'admin'],
      from: ['enviada', 'escalada'],
      notificationRole: 'jefe_servicio',
      action: 'Rechazada',
      eventType: 'workflow',
      requiresComment: true,
    },
    escalada: {
      roles: ['referente_programacion', 'admin'],
      from: ['enviada'],
      notificationRole: 'subdirector',
      action: 'Escalada a Subdirección',
      eventType: 'workflow',
    },
    subida_alma: {
      roles: ['admision', 'admin'],
      from: ['aprobada'],
      notificationRole: null,
      action: 'Subida a sistema ALMA',
      eventType: 'workflow',
    },
  }[targetStatus] ?? null;
}

app.use(authMiddleware);

app.get('/api/health', async (_req, res) => {
  const [serviceCount, agendaCount, professionalCount, blockCount] = await Promise.all([
    prisma.service.count(),
    prisma.agenda.count(),
    prisma.agendaProfessional.count(),
    prisma.agendaBlock.count(),
  ]);

  res.json({
    ok: true,
    database: 'sqlite',
    serviceCount,
    agendaCount,
    professionalCount,
    blockCount,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/bootstrap', async (_req, res) => {
  const [services, users] = await Promise.all([
    prisma.service.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ include: { service: true }, orderBy: { name: 'asc' } }),
  ]);

  res.json({
    roles: Object.entries(ROLE_LABELS).map(([id, label]) => ({ id, label })),
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      chiefName: service.chiefName,
      specialtyCatalog: service.specialtyCatalog,
    })),
    users: users.map(serializeUser),
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email y password son obligatorios.' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { service: true },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: 'Credenciales invalidas.' });
    return;
  }

  const token = createSessionToken();
  await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: buildSessionExpiry(),
    },
  });

  res.json({ token, user: serializeUser(user) });
});

app.post('/api/auth/demo-login', async (req, res) => {
  const role = req.body?.role;
  const fallbackRole = typeof role === 'string' && role ? role : 'jefe_servicio';

  const user = await prisma.user.findFirst({
    where: { role: fallbackRole },
    include: { service: true },
    orderBy: { name: 'asc' },
  });

  if (!user) {
    res.status(404).json({ error: 'Usuario demo no encontrado.' });
    return;
  }

  const token = createSessionToken();
  await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: buildSessionExpiry(),
    },
  });

  res.json({ token, password: 'demo123', user: serializeUser(user) });
});

app.get('/api/auth/me', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const user = await prisma.user.findUnique({
    where: { id: req.authUser.id },
    include: { service: true },
  });

  res.json({ user: serializeUser(user) });
});

app.post('/api/auth/logout', async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (req.sessionId) {
    await prisma.authSession.delete({ where: { id: req.sessionId } });
  }
  res.status(204).send();
});

app.get('/api/users', async (req, res) => {
  if (!requireRoles(req, res, ['admin'])) return;

  const users = await prisma.user.findMany({
    include: { service: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  res.json(users.map(serializeUser));
});

app.post('/api/users', async (req, res) => {
  if (!requireRoles(req, res, ['admin'])) return;

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const role = typeof req.body?.role === 'string' ? req.body.role.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const serviceId = typeof req.body?.serviceId === 'string' && req.body.serviceId.trim() ? req.body.serviceId.trim() : null;

  if (!name || !email || !role || !password) {
    res.status(400).json({ error: 'name, email, role y password son obligatorios.' });
    return;
  }
  if (!Object.keys(ROLE_LABELS).includes(role) && role !== 'admin') {
    res.status(400).json({ error: 'Rol inválido.' });
    return;
  }
  if (role === 'jefe_servicio' && !serviceId) {
    res.status(400).json({ error: 'serviceId es obligatorio para Jefe de Servicio.' });
    return;
  }

  const service = serviceId ? await prisma.service.findUnique({ where: { id: serviceId } }) : null;
  if (serviceId && !service) {
    res.status(400).json({ error: 'Servicio no encontrado.' });
    return;
  }

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        passwordHash: hashPassword(password),
        serviceId: role === 'jefe_servicio' ? serviceId : null,
      },
      include: { service: true },
    });
    res.status(201).json(serializeUser(user));
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
      return;
    }
    throw error;
  }
});

app.get('/api/agendas', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const agendas = await prisma.agenda.findMany({
    where: buildAgendaWhereForUser(req.authUser, req.query),
    include: {
      professionals: true,
      blocks: true,
      historyEntries: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(agendas.map(serializeAgenda));
});

app.get('/api/agendas/:externalId', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canViewAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para ver esta agenda.' });
    return;
  }

  res.json(serializeAgenda(agenda));
});

app.post('/api/agendas', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;

  const payload = normalizeAgendaPayload(req.body);
  const service = req.authUser.role === 'jefe_servicio'
    ? req.authUser.service
    : payload.servicio
      ? await prisma.service.findUnique({ where: { name: payload.servicio } })
      : null;

  if (!service) {
    res.status(400).json({ error: 'Servicio invalido para crear agenda.' });
    return;
  }

  const validFrom = parseOptionalDate(payload.vigenciaDesde);
  const validTo = parseOptionalDate(payload.vigenciaHasta);
  if (!ensureValidDateRange(validFrom, validTo)) {
    res.status(400).json({ error: 'vigenciaHasta no puede ser anterior a vigenciaDesde.' });
    return;
  }

  const created = await prisma.$transaction(async (tx) => {
    const record = await writeAgendaGraph(
      tx,
      {
        ...payload,
        servicio: service.name,
        jefe: req.authUser.role === 'jefe_servicio' ? req.authUser.name : payload.jefe,
        vigenciaDesde: payload.vigenciaDesde,
        vigenciaHasta: payload.vigenciaHasta,
      },
      null
    );

    await tx.agenda.update({
      where: { id: record.id },
      data: {
        serviceId: service.id,
        chiefUserId: req.authUser.role === 'jefe_servicio' ? req.authUser.id : null,
        chiefName: req.authUser.role === 'jefe_servicio' ? req.authUser.name : payload.jefe,
      },
    });
    await createAudit(tx, record.id, req.authUser, 'create', 'agenda', record.externalId, payload);
    if (!payload.pendienteConfirmar) {
      await createHistory(tx, record.id, req.authUser, 'Creada', {
        eventType: 'agenda',
        toStatus: payload.estado,
      });
    }
    return record;
  });

  const hydrated = await findAgendaRecord(prisma, created.externalId);
  res.status(201).json(serializeAgenda(hydrated));
});

app.put('/api/agendas/:externalId', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;

  const existing = await loadAgendaOr404(req.params.externalId, res);
  if (!existing) return;
  if (!canEditAgenda(req.authUser, existing)) {
    res.status(403).json({ error: 'No autorizado para editar esta agenda.' });
    return;
  }

  const payload = normalizeAgendaPayload(req.body);
  const validFrom = parseOptionalDate(payload.vigenciaDesde);
  const validTo = parseOptionalDate(payload.vigenciaHasta);
  if (!ensureValidDateRange(validFrom, validTo)) {
    res.status(400).json({ error: 'vigenciaHasta no puede ser anterior a vigenciaDesde.' });
    return;
  }

  const record = await prisma.$transaction(async (tx) => {
    const updated = await writeAgendaGraph(
      tx,
      {
        ...payload,
        id: req.params.externalId,
        servicio: existing.serviceName,
        jefe: existing.chiefName,
      },
      existing.id
    );
    await createAudit(tx, existing.id, req.authUser, 'update', 'agenda', existing.externalId, payload);
    return updated;
  });

  const hydrated = await findAgendaRecord(prisma, record.externalId);
  res.json(serializeAgenda(hydrated));
});

app.post('/api/agendas/:externalId/actions/confirm-draft', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;

  const existing = await loadAgendaOr404(req.params.externalId, res);
  if (!existing) return;
  if (!canEditAgenda(req.authUser, existing)) {
    res.status(403).json({ error: 'No autorizado para confirmar esta agenda.' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.agenda.update({
      where: { id: existing.id },
      data: {
        pendingConfirm: false,
        lastUpdated: BigInt(Date.now()),
      },
    });
    await createHistory(tx, existing.id, req.authUser, 'Guardada como borrador', {
      eventType: 'agenda',
      toStatus: existing.status,
    });
    await createAudit(tx, existing.id, req.authUser, 'confirm_draft', 'agenda', existing.externalId, null);
  });

  const hydrated = await findAgendaRecord(prisma, existing.externalId);
  res.json(serializeAgenda(hydrated));
});

app.post('/api/agendas/:externalId/actions/transition', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const targetStatus = toAgendaStatus(req.body?.targetStatus);
  const definition = transitionDefinition(targetStatus);
  if (!definition) {
    res.status(400).json({ error: 'Transicion no soportada.' });
    return;
  }
  if (!definition.roles.includes(req.authUser.role)) {
    res.status(403).json({ error: 'Rol no autorizado para esta transicion.' });
    return;
  }

  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!definition.from.includes(agenda.status)) {
    res.status(400).json({ error: `No se puede pasar de ${agenda.status} a ${targetStatus}.` });
    return;
  }
  if (req.authUser.role === 'jefe_servicio' && (!req.authUser.serviceId || req.authUser.serviceId !== agenda.serviceId)) {
    res.status(403).json({ error: 'No autorizado para esta agenda.' });
    return;
  }

  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
  if (definition.requiresComment && !comment) {
    res.status(400).json({ error: 'comment es obligatorio para esta transicion.' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const nextVersion = agenda.status === 'rechazada' && targetStatus === 'enviada'
      ? agenda.version + 1
      : agenda.version;

    await tx.agenda.update({
      where: { id: agenda.id },
      data: {
        status: targetStatus,
        version: nextVersion,
        pendingConfirm: false,
        rejectionReason: targetStatus === 'rechazada' ? comment : null,
        lastUpdated: BigInt(Date.now()),
      },
    });

    await createHistory(tx, agenda.id, req.authUser, definition.action, {
      eventType: definition.eventType,
      fromStatus: agenda.status,
      toStatus: targetStatus,
      comment: comment || null,
    });
    await createAudit(tx, agenda.id, req.authUser, 'transition', 'agenda', agenda.externalId, {
      fromStatus: agenda.status,
      toStatus: targetStatus,
      comment: comment || null,
    });

    if (definition.notificationRole) {
      await createNotification(tx, {
        agendaId: agenda.id,
        destinationRole: definition.notificationRole,
        text: `${agenda.serviceName} fue ${definition.action.toLowerCase()} por ${req.authUser.name}.`,
      });
    }
  });

  const hydrated = await findAgendaRecord(prisma, agenda.externalId);
  res.json(serializeAgenda(hydrated));
});

app.post('/api/agendas/sync', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;

  const agendas = Array.isArray(req.body?.agendas) ? req.body.agendas.map(normalizeAgendaPayload) : [];

  await prisma.$transaction(async (tx) => {
    const existing = await tx.agenda.findMany({ select: { id: true, externalId: true } });
    const existingMap = new Map(existing.map((agenda) => [agenda.externalId, agenda.id]));

    for (const agenda of agendas) {
      if (req.authUser.role === 'jefe_servicio' && agenda.servicio !== req.authUser.service?.name) {
        continue;
      }
      await writeAgendaGraph(tx, agenda, existingMap.get(String(agenda.id)) ?? null);
      existingMap.delete(String(agenda.id));
    }
  });

  const stored = await prisma.agenda.findMany({
    where: buildAgendaWhereForUser(req.authUser, {}),
    include: {
      professionals: true,
      blocks: true,
      historyEntries: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({ ok: true, agendas: stored.map(serializeAgenda) });
});

app.delete('/api/agendas/:externalId', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;

  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para eliminar esta agenda.' });
    return;
  }

  await prisma.agenda.delete({ where: { id: agenda.id } });
  res.status(204).send();
});

app.get('/api/agendas/:externalId/professionals', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canViewAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para ver esta agenda.' });
    return;
  }
  res.json(
    agenda.professionals
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((professional) => ({
        id: professional.externalId || professional.id,
        nombre: professional.name,
        tipo: professional.type,
      }))
  );
});

app.post('/api/agendas/:externalId/professionals', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para editar profesionales.' });
    return;
  }

  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  const tipo = typeof req.body?.tipo === 'string' ? req.body.tipo.trim() : '';
  if (!nombre || !tipo) {
    res.status(400).json({ error: 'nombre y tipo son obligatorios.' });
    return;
  }

  const created = await prisma.$transaction(async (tx) => {
    const currentCount = await tx.agendaProfessional.count({ where: { agendaId: agenda.id } });
    const professional = await tx.agendaProfessional.create({
      data: {
        agendaId: agenda.id,
        externalId: String(req.body?.id || randomUUID()),
        name: nombre,
        type: tipo,
        professionCatalog: tipo,
        sortOrder: currentCount,
      },
    });
    await createAudit(tx, agenda.id, req.authUser, 'create', 'professional', professional.externalId, req.body);
    await recomputeAgendaDerivedData(tx, agenda.id);
    return professional;
  });

  res.status(201).json({
    id: created.externalId || created.id,
    nombre: created.name,
    tipo: created.type,
  });
});

app.put('/api/agendas/:externalId/professionals/:professionalId', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para editar profesionales.' });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const professional = await resolveProfessionalOr404(tx, agenda.id, req.params.professionalId, res);
    if (!professional) return null;
    const next = await tx.agendaProfessional.update({
      where: { id: professional.id },
      data: {
        name: typeof req.body?.nombre === 'string' ? req.body.nombre.trim() || professional.name : professional.name,
        type: typeof req.body?.tipo === 'string' ? req.body.tipo.trim() || professional.type : professional.type,
        professionCatalog: typeof req.body?.tipo === 'string' ? req.body.tipo.trim() || professional.type : professional.type,
      },
    });
    await createAudit(tx, agenda.id, req.authUser, 'update', 'professional', professional.externalId || professional.id, req.body);
    return next;
  });
  if (!updated) return;

  res.json({
    id: updated.externalId || updated.id,
    nombre: updated.name,
    tipo: updated.type,
  });
});

app.delete('/api/agendas/:externalId/professionals/:professionalId', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para editar profesionales.' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const professional = await resolveProfessionalOr404(tx, agenda.id, req.params.professionalId, res);
    if (!professional) return;
    await tx.agendaProfessional.delete({ where: { id: professional.id } });
    await createAudit(tx, agenda.id, req.authUser, 'delete', 'professional', professional.externalId || professional.id, null);
    await recomputeAgendaDerivedData(tx, agenda.id);
  });

  res.status(204).send();
});

app.get('/api/agendas/:externalId/blocks', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canViewAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para ver esta agenda.' });
    return;
  }
  res.json(
    agenda.blocks.map((block) => ({
      id: block.externalId || block.id,
      profesionalId: agenda.professionals.find((p) => p.id === block.professionalId)?.externalId || block.professionalId,
      dia: block.day,
      inicioMin: block.startMinutes,
      duracionMin: block.durationMinutes,
      proceso: block.process,
      actividad: block.activity,
      clinica: block.isClinical,
      tieneRendimiento: block.hasPerformance,
      rendimiento: block.performance,
      rendimientoSugerido: block.suggestedPerformance,
      fuenteRendimiento: block.performanceSource,
    }))
  );
});

app.post('/api/agendas/:externalId/blocks', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para editar bloques.' });
    return;
  }

  const professional = await prisma.agendaProfessional.findFirst({
    where: {
      agendaId: agenda.id,
      OR: [{ externalId: String(req.body?.profesionalId) }, { id: String(req.body?.profesionalId) }],
    },
  });
  if (!professional) {
    res.status(404).json({ error: 'Profesional no encontrado para este bloque.' });
    return;
  }

  const block = await prisma.$transaction(async (tx) => {
    const freshAgenda = await tx.agenda.findUnique({ where: { id: agenda.id } });
    const catalogActivity = await resolveCatalogActivityForBlock(tx, freshAgenda, professional.type, req.body);
    if (req.body?.activity && !catalogActivity) {
      throw new Error('ACTIVITY_NOT_ALLOWED');
    }
    const perf = await resolveSuggestedPerformance(tx, freshAgenda, req.body);
    const created = await tx.agendaBlock.create({
      data: {
        agendaId: agenda.id,
        professionalId: professional.id,
        externalId: String(req.body?.id || randomUUID()),
        catalogActivityId: catalogActivity?.id ?? null,
        day: String(req.body?.dia || 'Lunes'),
        startMinutes: Number(req.body?.inicioMin ?? 480),
        durationMinutes: Number(req.body?.duracionMin ?? 30),
        process: req.body?.proceso ?? null,
        activity: req.body?.actividad ?? null,
        isClinical: req.body?.clinica ?? catalogActivity?.isClinical ?? true,
        hasPerformance: req.body?.tieneRendimiento ?? catalogActivity?.hasPerformance ?? true,
        performance: Number(req.body?.rendimiento ?? perf.suggestedPerformance ?? 0),
        suggestedPerformance: perf.suggestedPerformance,
        performanceSource: perf.performanceSource,
      },
    });
    await recomputeAgendaDerivedData(tx, agenda.id);
    await createAudit(tx, agenda.id, req.authUser, 'create', 'block', created.externalId || created.id, req.body);
    return created;
  }).catch((error) => {
    if (error.message === 'ACTIVITY_NOT_ALLOWED') {
      res.status(400).json({ error: 'La actividad no existe en el catalogo para esa profesion y especialidad.' });
      return null;
    }
    throw error;
  });

  if (!block) return;
  res.status(201).json({
    id: block.externalId || block.id,
    profesionalId: req.body?.profesionalId,
    dia: block.day,
    inicioMin: block.startMinutes,
    duracionMin: block.durationMinutes,
    proceso: block.process,
    actividad: block.activity,
    clinica: block.isClinical,
    tieneRendimiento: block.hasPerformance,
    rendimiento: block.performance,
    rendimientoSugerido: block.suggestedPerformance,
    fuenteRendimiento: block.performanceSource,
  });
});

app.put('/api/agendas/:externalId/blocks/:blockId', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para editar bloques.' });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const freshAgenda = await tx.agenda.findUnique({ where: { id: agenda.id } });
    const block = await resolveBlockOr404(tx, agenda.id, req.params.blockId, res);
    if (!block) return null;
    const professional = await tx.agendaProfessional.findUnique({ where: { id: block.professionalId } });
    const nextInput = {
      proceso: req.body?.proceso ?? block.process,
      actividad: req.body?.actividad ?? block.activity,
    };
    const catalogActivity = await resolveCatalogActivityForBlock(tx, freshAgenda, professional.type, nextInput);
    if (nextInput.actividad && !catalogActivity) {
      throw new Error('ACTIVITY_NOT_ALLOWED');
    }
    const perf = await resolveSuggestedPerformance(tx, freshAgenda, {
      process: nextInput.proceso,
      activity: nextInput.actividad,
    });
    const next = await tx.agendaBlock.update({
      where: { id: block.id },
      data: {
        catalogActivityId: catalogActivity?.id ?? null,
        day: typeof req.body?.dia === 'string' ? req.body.dia : block.day,
        startMinutes: req.body?.inicioMin != null ? Number(req.body.inicioMin) : block.startMinutes,
        durationMinutes: req.body?.duracionMin != null ? Number(req.body.duracionMin) : block.durationMinutes,
        process: nextInput.proceso,
        activity: nextInput.actividad,
        isClinical: req.body?.clinica ?? catalogActivity?.isClinical ?? block.isClinical,
        hasPerformance: req.body?.tieneRendimiento ?? catalogActivity?.hasPerformance ?? block.hasPerformance,
        performance: req.body?.rendimiento != null ? Number(req.body.rendimiento) : block.performance,
        suggestedPerformance: perf.suggestedPerformance,
        performanceSource: perf.performanceSource,
      },
    });
    await recomputeAgendaDerivedData(tx, agenda.id);
    await createAudit(tx, agenda.id, req.authUser, 'update', 'block', block.externalId || block.id, req.body);
    return next;
  }).catch((error) => {
    if (error.message === 'ACTIVITY_NOT_ALLOWED') {
      res.status(400).json({ error: 'La actividad no existe en el catalogo para esa profesion y especialidad.' });
      return null;
    }
    throw error;
  });

  if (!updated) return;
  res.json({
    id: updated.externalId || updated.id,
    dia: updated.day,
    inicioMin: updated.startMinutes,
    duracionMin: updated.durationMinutes,
    proceso: updated.process,
    actividad: updated.activity,
    clinica: updated.isClinical,
    tieneRendimiento: updated.hasPerformance,
    rendimiento: updated.performance,
    rendimientoSugerido: updated.suggestedPerformance,
    fuenteRendimiento: updated.performanceSource,
  });
});

app.delete('/api/agendas/:externalId/blocks/:blockId', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para editar bloques.' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const block = await resolveBlockOr404(tx, agenda.id, req.params.blockId, res);
    if (!block) return;
    await tx.agendaBlock.delete({ where: { id: block.id } });
    await recomputeAgendaDerivedData(tx, agenda.id);
    await createAudit(tx, agenda.id, req.authUser, 'delete', 'block', block.externalId || block.id, null);
  });

  res.status(204).send();
});

app.get('/api/profesionales', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const where = req.authUser.role === 'jefe_servicio'
    ? { agenda: { serviceId: req.authUser.serviceId ?? '__no_service__' } }
    : {};

  const professionals = await prisma.agendaProfessional.findMany({
    where,
    include: {
      agenda: {
        select: {
          externalId: true,
          serviceName: true,
          monthLabel: true,
        },
      },
    },
    orderBy: [{ name: 'asc' }],
  });

  res.json(
    professionals.map((professional) => ({
      id: professional.externalId || professional.id,
      nombre: professional.name,
      tipo: professional.type,
      agendaId: professional.agenda.externalId,
      servicio: professional.agenda.serviceName,
      mes: professional.agenda.monthLabel,
    }))
  );
});

app.get('/api/catalog/activities', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const profession = typeof req.query.profession === 'string' ? req.query.profession.trim() : '';
  if (!profession) {
    res.status(400).json({ error: 'profession es obligatorio.' });
    return;
  }

  const specialty = await resolveSpecialty({
    serviceId: req.query.serviceId,
    serviceName: req.query.serviceName,
    specialty: req.query.specialty,
  });
  const includeTransversal = parseBooleanParam(req.query.includeTransversal, true);
  const process = typeof req.query.process === 'string' && req.query.process.trim()
    ? req.query.process.trim()
    : null;
  const clinicalOnly = parseBooleanParam(req.query.clinicalOnly, false);
  const performanceOnly = parseBooleanParam(req.query.performanceOnly, false);

  const specialtyFilter = specialty
    ? includeTransversal
      ? { in: [specialty, 'No Aplica'] }
      : specialty
    : includeTransversal
      ? { in: ['No Aplica'] }
      : undefined;

  const rows = await prisma.catalogActivity.findMany({
    where: {
      profession,
      ...(specialtyFilter ? { specialty: specialtyFilter } : {}),
      ...(process ? { process } : {}),
      ...(clinicalOnly ? { isClinical: true } : {}),
      ...(performanceOnly ? { hasPerformance: true } : {}),
    },
    orderBy: [{ process: 'asc' }, { specialty: 'asc' }, { activity: 'asc' }],
  });

  res.json({
    profession,
    specialty: specialty ?? null,
    includeTransversal,
    process,
    total: rows.length,
    items: rows.map(mapCatalogActivity),
  });
});

app.get('/api/catalog/processes', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const profession = typeof req.query.profession === 'string' ? req.query.profession.trim() : '';
  const specialty = await resolveSpecialty({
    serviceId: req.query.serviceId,
    serviceName: req.query.serviceName,
    specialty: req.query.specialty,
  });

  const rows = await prisma.catalogActivity.findMany({
    where: {
      ...(profession ? { profession } : {}),
      ...(specialty ? { specialty: { in: [specialty, 'No Aplica'] } } : {}),
    },
    distinct: ['process'],
    select: { process: true },
    orderBy: { process: 'asc' },
  });

  res.json(rows.map((row) => row.process));
});

app.get('/api/catalog/professions', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const rows = await prisma.catalogActivity.findMany({
    distinct: ['profession'],
    select: { profession: true },
    orderBy: { profession: 'asc' },
  });

  res.json(rows.map((row) => row.profession));
});

app.get('/api/catalog/reference-performance', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const activity = typeof req.query.activity === 'string' ? req.query.activity.trim() : '';
  if (!activity) {
    res.status(400).json({ error: 'activity es obligatorio.' });
    return;
  }

  const specialty = await resolveSpecialty({
    serviceId: req.query.serviceId,
    serviceName: req.query.serviceName,
    specialty: req.query.specialty,
  });
  const process = typeof req.query.process === 'string' && req.query.process.trim()
    ? req.query.process.trim()
    : 'Ambulatorio';

  if (!specialty) {
    res.json({
      activity,
      process,
      specialty: null,
      suggestion: null,
      source: null,
      nationalValue: null,
      localValue: null,
    });
    return;
  }

  const row = await prisma.referencePerformance.findUnique({
    where: {
      process_activity_specialty: {
        process,
        activity,
        specialty,
      },
    },
  });

  res.json({
    activity,
    process,
    specialty,
    suggestion: row?.localValue ?? row?.nationalValue ?? null,
    source: row?.localValue != null ? 'local' : row?.nationalValue != null ? 'national' : null,
    nationalValue: row?.nationalValue ?? null,
    localValue: row?.localValue ?? null,
    notes: row?.notes ?? null,
  });
});

app.get('/api/notifications', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const where = isPrivilegedRole(req.authUser.role)
    ? { OR: [{ destinationRole: req.authUser.role }, { userId: req.authUser.id }] }
    : { OR: [{ destinationRole: req.authUser.role }, { userId: req.authUser.id }] };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  res.json(
    notifications.map((item) => ({
      id: item.id,
      agendaId: item.agendaId,
      destinoRol: item.destinationRole,
      texto: item.text,
      leida: item.read,
      fecha: item.createdAt.toISOString(),
    }))
  );
});

app.listen(port, '127.0.0.1', () => {
  console.log(`API listening on http://127.0.0.1:${port}`);
});
