export function toAgendaStatus(value) {
  const allowed = ['borrador', 'enviada', 'aprobada', 'rechazada', 'escalada', 'subida_alma'];
  return allowed.includes(value) ? value : 'borrador';
}

export function normalizeAgendaPayload(rawAgenda) {
  const agenda = { ...rawAgenda };

  return {
    ...agenda,
    id: agenda.id,
    servicio: agenda.servicio ?? 'Servicio sin nombre',
    jefe: agenda.jefe ?? 'Sin jefe',
    mes: agenda.mes ?? 'Sin mes',
    vigenciaDesde: agenda.vigenciaDesde ?? agenda.validFrom ?? null,
    vigenciaHasta: agenda.vigenciaHasta ?? agenda.validTo ?? null,
    estado: toAgendaStatus(agenda.estado),
    version: Number(agenda.version ?? 1),
    cnePct: Number(agenda.cnePct ?? 0),
    atenciones: Number(agenda.atenciones ?? 0),
    pendienteConfirmar: Boolean(agenda.pendienteConfirmar),
    lastUpdated: Number(agenda.lastUpdated ?? Date.now()),
    resumenIA: agenda.resumenIA ?? null,
    motivoRechazo: agenda.motivoRechazo ?? null,
    historial: Array.isArray(agenda.historial) ? agenda.historial : [],
    profesionales: Array.isArray(agenda.profesionales) ? agenda.profesionales : [],
    bloquesProf: Array.isArray(agenda.bloquesProf) ? agenda.bloquesProf : [],
    horas: agenda.horas ?? {},
    distribucionHoraria: agenda.distribucionHoraria ?? {},
  };
}

export function serializeAgenda(record) {
  const professionals = [...record.professionals]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((professional) => ({
      id: professional.externalId || professional.id,
      nombre: professional.name,
      tipo: professional.type,
    }));

  const professionalIdMap = new Map(
    record.professionals.map((professional) => [professional.id, professional.externalId || professional.id])
  );

  const history = [...record.historyEntries]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry) => ({
      id: entry.externalId || entry.id,
      fecha: entry.dateLabel,
      accion: entry.action,
      usuario: entry.userName,
      comentario: entry.comment ?? undefined,
    }));

  const blocks = [...record.blocks]
    .sort((a, b) => a.day.localeCompare(b.day) || a.startMinutes - b.startMinutes)
    .map((block) => ({
      id: block.externalId || block.id,
      profesionalId: professionalIdMap.get(block.professionalId) || block.professionalId,
      dia: block.day,
      inicioMin: block.startMinutes,
      duracionMin: block.durationMinutes,
      proceso: block.process,
      actividad: block.activity,
      clinica: block.isClinical,
      tieneRendimiento: block.hasPerformance,
      rendimiento: block.performance,
    }));

  return {
    id: isNaN(Number(record.externalId)) ? record.externalId : Number(record.externalId),
    servicio: record.serviceName,
    jefe: record.chiefName,
    mes: record.monthLabel,
    vigenciaDesde: record.validFrom ? record.validFrom.toISOString().slice(0, 10) : null,
    vigenciaHasta: record.validTo ? record.validTo.toISOString().slice(0, 10) : null,
    estado: record.status,
    version: record.version,
    cnePct: record.cnePct,
    atenciones: record.appointments,
    pendienteConfirmar: record.pendingConfirm,
    lastUpdated: Number(record.lastUpdated),
    resumenIA: record.summaryAI,
    motivoRechazo: record.rejectionReason,
    historial: history,
    profesionales: professionals,
    bloquesProf: blocks,
    horas: JSON.parse(record.hoursJson || '{}'),
    distribucionHoraria: JSON.parse(record.distributionJson || '{}'),
  };
}

export async function ensureServiceByName(prismaOrTx, name, chiefName) {
  if (!name) return null;
  return prismaOrTx.service.upsert({
    where: { name },
    update: { chiefName: chiefName ?? undefined },
    create: { name, chiefName },
  });
}

export async function writeAgendaGraph(prismaOrTx, agenda, existingId = null) {
  const service = await ensureServiceByName(prismaOrTx, agenda.servicio, agenda.jefe);

  const agendaRecord = existingId
    ? await prismaOrTx.agenda.update({
        where: { id: existingId },
        data: {
          serviceId: service?.id ?? null,
          serviceSpecialty: service?.specialtyCatalog ?? null,
          serviceName: agenda.servicio,
          chiefName: agenda.jefe,
          monthLabel: agenda.mes,
          validFrom: agenda.vigenciaDesde ? new Date(agenda.vigenciaDesde) : null,
          validTo: agenda.vigenciaHasta ? new Date(agenda.vigenciaHasta) : null,
          status: agenda.estado,
          version: agenda.version,
          cnePct: agenda.cnePct,
          appointments: agenda.atenciones,
          pendingConfirm: agenda.pendienteConfirmar,
          lastUpdated: BigInt(agenda.lastUpdated),
          summaryAI: agenda.resumenIA,
          rejectionReason: agenda.motivoRechazo,
          hoursJson: JSON.stringify(agenda.horas ?? {}),
          distributionJson: JSON.stringify(agenda.distribucionHoraria ?? {}),
          sourceSnapshot: JSON.stringify(agenda),
        },
      })
    : await prismaOrTx.agenda.create({
        data: {
          externalId: String(agenda.id),
          serviceId: service?.id ?? null,
          serviceSpecialty: service?.specialtyCatalog ?? null,
          serviceName: agenda.servicio,
          chiefName: agenda.jefe,
          monthLabel: agenda.mes,
          validFrom: agenda.vigenciaDesde ? new Date(agenda.vigenciaDesde) : null,
          validTo: agenda.vigenciaHasta ? new Date(agenda.vigenciaHasta) : null,
          status: agenda.estado,
          version: agenda.version,
          cnePct: agenda.cnePct,
          appointments: agenda.atenciones,
          pendingConfirm: agenda.pendienteConfirmar,
          lastUpdated: BigInt(agenda.lastUpdated),
          summaryAI: agenda.resumenIA,
          rejectionReason: agenda.motivoRechazo,
          hoursJson: JSON.stringify(agenda.horas ?? {}),
          distributionJson: JSON.stringify(agenda.distribucionHoraria ?? {}),
          sourceSnapshot: JSON.stringify(agenda),
        },
      });

  await prismaOrTx.agendaHistory.deleteMany({ where: { agendaId: agendaRecord.id } });
  await prismaOrTx.agendaBlock.deleteMany({ where: { agendaId: agendaRecord.id } });
  await prismaOrTx.agendaProfessional.deleteMany({ where: { agendaId: agendaRecord.id } });

  const professionalMap = new Map();
  for (let index = 0; index < agenda.profesionales.length; index += 1) {
    const professional = agenda.profesionales[index];
    const created = await prismaOrTx.agendaProfessional.create({
      data: {
        agendaId: agendaRecord.id,
        externalId: String(professional.id),
        name: professional.nombre,
        type: professional.tipo,
        professionCatalog: professional.tipo,
        sortOrder: index,
      },
    });
    professionalMap.set(String(professional.id), created.id);
  }

  for (let index = 0; index < agenda.bloquesProf.length; index += 1) {
    const block = agenda.bloquesProf[index];
    const professionalId = professionalMap.get(String(block.profesionalId));
    if (!professionalId) continue;

    await prismaOrTx.agendaBlock.create({
      data: {
        agendaId: agendaRecord.id,
        professionalId,
        externalId: String(block.id),
        day: block.dia,
        startMinutes: Number(block.inicioMin ?? 0),
        durationMinutes: Number(block.duracionMin ?? 0),
        process: block.proceso ?? null,
        activity: block.actividad ?? null,
        isClinical: Boolean(block.clinica ?? true),
        hasPerformance: Boolean(block.tieneRendimiento ?? true),
        performance: Number(block.rendimiento ?? 0),
      },
    });
  }

  for (let index = 0; index < agenda.historial.length; index += 1) {
    const entry = agenda.historial[index];
    await prismaOrTx.agendaHistory.create({
      data: {
        agendaId: agendaRecord.id,
        externalId: entry.id ? String(entry.id) : null,
        dateLabel: entry.fecha ?? '',
        action: entry.accion ?? '',
        userName: entry.usuario ?? '',
        comment: entry.comentario ?? null,
        sortOrder: index,
      },
    });
  }

  return agendaRecord;
}

export async function findAgendaRecord(prismaOrTx, externalId) {
  return prismaOrTx.agenda.findUnique({
    where: { externalId: String(externalId) },
    include: {
      professionals: true,
      blocks: true,
      historyEntries: true,
    },
  });
}
