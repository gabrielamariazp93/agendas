import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Bell, FileText, MessageSquare, LayoutGrid, Plus, X, ChevronDown, Pencil,
  CheckCircle2, XCircle, ArrowUpCircle, UploadCloud, Send, Sparkles, Loader2, BarChart3, History, Users
} from 'lucide-react';
import {
  createAgenda,
  createBlock,
  createProfessional,
  createUser,
  deleteAgenda,
  deleteBlock,
  deleteProfessional,
  demoLogin,
  fetchAgendas,
  fetchAgenda,
  fetchBootstrap,
  fetchCatalogActivities,
  fetchHealth,
  fetchMe,
  fetchNotifications,
  fetchReferencePerformance,
  fetchUsers,
  login,
  logout,
  confirmDraft,
  syncAgendas,
  transitionAgenda,
  updateBlock,
  updateProfessional,
} from './src/lib/api.js';

/* ---------------------------------------------------------
   Taxonomía real: proceso -> actividades trazadoras
   (Atención Quirúrgica se diferencia además por pabellón)
--------------------------------------------------------- */

/* ---------------------------------------------------------
   Catálogo real de actividades por profesión y especialidad
--------------------------------------------------------- */

const SERVICIOS = ['Cardiología', 'Oftalmología', 'Traumatología', 'Medicina Interna', 'Otorrinolaringología', 'Ginecología'];

// Catálogo real de actividades disponibles por profesión y especialidad (fuente: Listado_de_actividades.xlsx)
const PROCESOS_CAT = ["Ambulatorio", "Hospitalizado", "Quirúrgico", "Urgencia"];
const PROFESIONES_CAT = ["Médico(a) Cirujano(a)", "Enfermero(a)", "Matrón(a)", "Kinesiólogo(a)", "Fonoaudiólogo(a)", "Nutricionista", "Psicólogo(a) Clínica", "Psicopedagogo(a)", "Terapeuta Ocupacional"];
const ESPECIALIDADES_CAT = ["No Aplica", "CARDIOLOGÍA ADULTO", "OFTALMOLOGÍA", "TRAUMATOLOGÍA Y ORTOPEDIA ADULTO", "MEDICINA INTERNA", "OTORRINOLARINGOLOGÍA", "GINECOLOGÍA ADULTO"];
// [procesoIdx, profesionIdx, especialidadIdx, actividad, esClinica(1/0), tieneRendimiento(1/0)]
const CATALOGO_RAW = [
[0,0,1,"Administración de medicamentos",1,1],
[0,0,1,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,0,1,"Comité Clínico",1,0],
[0,0,1,"Comité de apoyo a la gestión",0,0],
[0,0,1,"Comité de programación",0,0],
[0,0,1,"Comité Oncológico",1,0],
[0,0,1,"Consulta Abreviada Médica Presencial",1,1],
[0,0,1,"Consulta Control de especialidad Presencial",1,1],
[0,0,1,"Consulta de ingreso a equipo PRAIS",1,1],
[0,0,1,"Consulta Nueva de especialidad Presencial",1,1],
[0,0,1,"Consultoría en salud presencial",1,1],
[0,0,1,"Contacto telefónico: Consulta Abreviada",1,1],
[0,0,1,"Contacto telefónico: Consulta Control",1,1],
[0,0,1,"Contacto telefónico: Consultoría",1,1],
[0,0,1,"Docencia e Investigación",1,0],
[0,0,1,"E.C.G. continuo (Holter)",1,0],
[0,0,1,"Educación Grupal",1,0],
[0,0,1,"Educación remota a usuario y/o cuidador",1,1],
[0,0,1,"Evaluación Intermedia remota",1,1],
[0,0,1,"Gestión de Casos",1,1],
[0,0,1,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,0,1,"Otras Actividades Clínicas",1,0],
[0,0,1,"Otras Actividades No Clínicas",0,0],
[0,0,1,"Otros procedimientos médicos",1,0],
[0,0,1,"Pertinencia (IC)",1,1],
[0,0,1,"Policlínico de choque",1,0],
[0,0,1,"Priorización y otorgamiento de modalidad de atención",1,1],
[0,0,1,"Procedimientos especialidad",1,0],
[0,0,1,"Procedimientos Imagenológicos (Médico)",1,1],
[0,0,1,"Reunión Clínica",1,0],
[0,0,1,"Reunión Técnica Administrativa",0,0],
[0,0,1,"Ronda otro establecimiento",1,0],
[0,0,1,"Telecomité",1,1],
[0,0,1,"Teleconsultoria OTRAS ESPECIALIDADES",1,1],
[0,0,1,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,0,1,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,0,1,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[0,0,1,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[0,0,1,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,0,1,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,0,1,"Telemedicina: Teleconsulta Control",1,1],
[0,0,1,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,0,1,"Telemedicina: Teleconsulta Nueva",1,1],
[0,0,1,"Test de Esfuerzo",1,1],
[0,0,1,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,0,1,"Trabajo sectorial de información y sensibilización",0,1],
[0,0,1,"Visita Domiciliaria",1,1],
[0,0,6,"Administración de medicamentos",1,1],
[0,0,6,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,0,6,"Comité Clínico",1,0],
[0,0,6,"Comité de apoyo a la gestión",0,0],
[0,0,6,"Comité de programación",0,0],
[0,0,6,"Comité Oncológico",1,0],
[0,0,6,"Consulta Abreviada Médica Presencial",1,1],
[0,0,6,"Consulta Control de especialidad Presencial",1,1],
[0,0,6,"Consulta de ingreso a equipo PRAIS",1,1],
[0,0,6,"Consulta Nueva de especialidad Presencial",1,1],
[0,0,6,"Consultoría en salud presencial",1,1],
[0,0,6,"Contacto telefónico: Consulta Abreviada",1,1],
[0,0,6,"Contacto telefónico: Consulta Control",1,1],
[0,0,6,"Docencia e Investigación",1,0],
[0,0,6,"Educación Grupal",1,0],
[0,0,6,"Educación remota a usuario y/o cuidador",1,1],
[0,0,6,"Gestión de Casos",1,1],
[0,0,6,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,0,6,"Otras Actividades Clínicas",1,0],
[0,0,6,"Otras Actividades No Clínicas",0,0],
[0,0,6,"Otros procedimientos médicos",1,0],
[0,0,6,"Pertinencia (IC)",1,1],
[0,0,6,"Policlínico de choque",1,0],
[0,0,6,"Priorización y otorgamiento de modalidad de atención",1,1],
[0,0,6,"Procedimientos especialidad",1,0],
[0,0,6,"Procedimientos Imagenológicos (Médico)",1,1],
[0,0,6,"Reunión Clínica",1,0],
[0,0,6,"Reunión Técnica Administrativa",0,0],
[0,0,6,"Ronda otro establecimiento",1,0],
[0,0,6,"Telecomité",1,1],
[0,0,6,"Teleconsultoria OTRAS ESPECIALIDADES",1,1],
[0,0,6,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,0,6,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,0,6,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[0,0,6,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[0,0,6,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,0,6,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,0,6,"Telemedicina: Teleconsulta Control",1,1],
[0,0,6,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,0,6,"Telemedicina: Teleconsulta Nueva",1,1],
[0,0,6,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,0,6,"Trabajo sectorial de información y sensibilización",0,1],
[0,0,6,"Visita Domiciliaria",1,1],
[0,0,4,"Administración de medicamentos",1,1],
[0,0,4,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,0,4,"Comité Clínico",1,0],
[0,0,4,"Comité de apoyo a la gestión",0,0],
[0,0,4,"Comité de programación",0,0],
[0,0,4,"Comité Oncológico",1,0],
[0,0,4,"Consulta Abreviada Médica Presencial",1,1],
[0,0,4,"Consulta Control de especialidad Presencial",1,1],
[0,0,4,"Consulta de ingreso a equipo PRAIS",1,1],
[0,0,4,"Consulta Nueva de especialidad Presencial",1,1],
[0,0,4,"Consultoría en salud presencial",1,1],
[0,0,4,"Contacto telefónico: Consulta Abreviada",1,1],
[0,0,4,"Contacto telefónico: Consulta Control",1,1],
[0,0,4,"Contacto telefónico: Consultoría",1,1],
[0,0,4,"Docencia e Investigación",1,0],
[0,0,4,"E.C.G. continuo (Holter)",1,0],
[0,0,4,"Educación Grupal",1,0],
[0,0,4,"Educación remota a usuario y/o cuidador",1,1],
[0,0,4,"Evaluación Intermedia remota",1,1],
[0,0,4,"Gestión de Casos",1,1],
[0,0,4,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,0,4,"Otras Actividades Clínicas",1,0],
[0,0,4,"Otras Actividades No Clínicas",0,0],
[0,0,4,"Otros procedimientos médicos",1,0],
[0,0,4,"Pertinencia (IC)",1,1],
[0,0,4,"Policlínico de choque",1,0],
[0,0,4,"Priorización y otorgamiento de modalidad de atención",1,1],
[0,0,4,"Procedimientos especialidad",1,0],
[0,0,4,"Procedimientos Imagenológicos (Médico)",1,1],
[0,0,4,"Reunión Clínica",1,0],
[0,0,4,"Reunión Técnica Administrativa",0,0],
[0,0,4,"Ronda otro establecimiento",1,0],
[0,0,4,"Telecomité",1,1],
[0,0,4,"Teleconsulta abreviada (Videollamada)",1,1],
[0,0,4,"Teleconsultoria OTRAS ESPECIALIDADES",1,1],
[0,0,4,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,0,4,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,0,4,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[0,0,4,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[0,0,4,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,0,4,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,0,4,"Telemedicina: Teleconsulta Control",1,1],
[0,0,4,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,0,4,"Telemedicina: Teleconsulta Nueva",1,1],
[0,0,4,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,0,4,"Trabajo sectorial de información y sensibilización",0,1],
[0,0,4,"Visita Domiciliaria",1,1],
[0,0,2,"Administración de medicamentos",1,1],
[0,0,2,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,0,2,"Comité Clínico",1,0],
[0,0,2,"Comité de apoyo a la gestión",0,0],
[0,0,2,"Comité de programación",0,0],
[0,0,2,"Comité Oncológico",1,0],
[0,0,2,"Consulta Abreviada Médica Presencial",1,1],
[0,0,2,"Consulta Control de especialidad Presencial",1,1],
[0,0,2,"Consulta de ingreso a equipo PRAIS",1,1],
[0,0,2,"Consulta Nueva de especialidad Presencial",1,1],
[0,0,2,"Consultoría en salud presencial",1,1],
[0,0,2,"Contacto telefónico: Consulta Abreviada",1,1],
[0,0,2,"Contacto telefónico: Consulta Control",1,1],
[0,0,2,"Docencia e Investigación",1,0],
[0,0,2,"Educación Grupal",1,0],
[0,0,2,"Educación remota a usuario y/o cuidador",1,1],
[0,0,2,"Gestión de Casos",1,1],
[0,0,2,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,0,2,"Infiltraciones (rehabilitación)",1,0],
[0,0,2,"Otras Actividades Clínicas",1,0],
[0,0,2,"Otras Actividades No Clínicas",0,0],
[0,0,2,"Otros procedimientos médicos",1,0],
[0,0,2,"Pertinencia (IC)",1,1],
[0,0,2,"Policlínico de choque",1,0],
[0,0,2,"Priorización y otorgamiento de modalidad de atención",1,1],
[0,0,2,"Procedimientos especialidad",1,0],
[0,0,2,"Procedimientos Imagenológicos (Médico)",1,1],
[0,0,2,"Reunión Clínica",1,0],
[0,0,2,"Reunión Técnica Administrativa",0,0],
[0,0,2,"Ronda otro establecimiento",1,0],
[0,0,2,"Telecomité",1,1],
[0,0,2,"Teleconsultoria OTRAS ESPECIALIDADES",1,1],
[0,0,2,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,0,2,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,0,2,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[0,0,2,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[0,0,2,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,0,2,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,0,2,"Telemedicina: Teleconsulta Control",1,1],
[0,0,2,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,0,2,"Telemedicina: Teleconsulta Nueva",1,1],
[0,0,2,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,0,2,"Trabajo sectorial de información y sensibilización",0,1],
[0,0,2,"Visita Domiciliaria",1,1],
[0,0,5,"Administración de medicamentos",1,1],
[0,0,5,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,0,5,"Comité Clínico",1,0],
[0,0,5,"Comité de apoyo a la gestión",0,0],
[0,0,5,"Comité de programación",0,0],
[0,0,5,"Comité Oncológico",1,0],
[0,0,5,"Consulta Abreviada Médica Presencial",1,1],
[0,0,5,"Consulta Control de especialidad Presencial",1,1],
[0,0,5,"Consulta de ingreso a equipo PRAIS",1,1],
[0,0,5,"Consulta Nueva de especialidad Presencial",1,1],
[0,0,5,"Consultoría en salud presencial",1,1],
[0,0,5,"Contacto telefónico: Consulta Abreviada",1,1],
[0,0,5,"Contacto telefónico: Consulta Control",1,1],
[0,0,5,"Docencia e Investigación",1,0],
[0,0,5,"Educación Grupal",1,0],
[0,0,5,"Educación remota a usuario y/o cuidador",1,1],
[0,0,5,"Gestión de Casos",1,1],
[0,0,5,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,0,5,"Infiltraciones (rehabilitación)",1,0],
[0,0,5,"Otras Actividades Clínicas",1,0],
[0,0,5,"Otras Actividades No Clínicas",0,0],
[0,0,5,"Otros procedimientos médicos",1,0],
[0,0,5,"Pertinencia (IC)",1,1],
[0,0,5,"Policlínico de choque",1,0],
[0,0,5,"Priorización y otorgamiento de modalidad de atención",1,1],
[0,0,5,"Procedimientos especialidad",1,0],
[0,0,5,"Reunión Clínica",1,0],
[0,0,5,"Reunión Técnica Administrativa",0,0],
[0,0,5,"Ronda otro establecimiento",1,0],
[0,0,5,"Telecomité",1,1],
[0,0,5,"Teleconsultoria OTRAS ESPECIALIDADES",1,1],
[0,0,5,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,0,5,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,0,5,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[0,0,5,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[0,0,5,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,0,5,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,0,5,"Telemedicina: Teleconsulta Control",1,1],
[0,0,5,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,0,5,"Telemedicina: Teleconsulta Nueva",1,1],
[0,0,5,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,0,5,"Trabajo sectorial de información y sensibilización",0,1],
[0,0,5,"Visita Domiciliaria",1,1],
[0,0,3,"Administración de medicamentos",1,1],
[0,0,3,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,0,3,"Comité Clínico",1,0],
[0,0,3,"Comité de apoyo a la gestión",0,0],
[0,0,3,"Comité de programación",0,0],
[0,0,3,"Comité Oncológico",1,0],
[0,0,3,"Consulta Abreviada Médica Presencial",1,1],
[0,0,3,"Consulta Control de especialidad Presencial",1,1],
[0,0,3,"Consulta de ingreso a equipo PRAIS",1,1],
[0,0,3,"Consulta Nueva de especialidad Presencial",1,1],
[0,0,3,"Consultoría en salud presencial",1,1],
[0,0,3,"Contacto telefónico: Consulta Abreviada",1,1],
[0,0,3,"Contacto telefónico: Consulta Control",1,1],
[0,0,3,"Docencia e Investigación",1,0],
[0,0,3,"Educación Grupal",1,0],
[0,0,3,"Educación remota a usuario y/o cuidador",1,1],
[0,0,3,"Gestión de Casos",1,1],
[0,0,3,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,0,3,"Infiltraciones (rehabilitación)",1,0],
[0,0,3,"Otras Actividades Clínicas",1,0],
[0,0,3,"Otras Actividades No Clínicas",0,0],
[0,0,3,"Otros procedimientos médicos",1,0],
[0,0,3,"Pertinencia (IC)",1,1],
[0,0,3,"Policlínico de choque",1,0],
[0,0,3,"Priorización y otorgamiento de modalidad de atención",1,1],
[0,0,3,"Procedimientos especialidad",1,0],
[0,0,3,"Procedimientos Imagenológicos (Médico)",1,1],
[0,0,3,"Reunión Clínica",1,0],
[0,0,3,"Reunión Técnica Administrativa",0,0],
[0,0,3,"Ronda otro establecimiento",1,0],
[0,0,3,"Telecomité",1,1],
[0,0,3,"Teleconsultoria OTRAS ESPECIALIDADES",1,1],
[0,0,3,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,0,3,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,0,3,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[0,0,3,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[0,0,3,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,0,3,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,0,3,"Telemedicina: Teleconsulta Control",1,1],
[0,0,3,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,0,3,"Telemedicina: Teleconsulta Nueva",1,1],
[0,0,3,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,0,3,"Trabajo sectorial de información y sensibilización",0,1],
[0,0,3,"Visita Domiciliaria",1,1],
[1,0,6,"Administración de medicamentos",1,1],
[1,0,6,"Comité Clínico",1,0],
[1,0,6,"Comité Oncológico",1,0],
[1,0,6,"Docencia e Investigación",1,0],
[1,0,6,"Educación Grupal",1,0],
[1,0,6,"Gestión de camas",1,0],
[1,0,6,"Gestión de Casos",1,0],
[1,0,6,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,0,6,"Otras Actividades Clínicas",1,0],
[1,0,6,"Otras Actividades No Clínicas",0,0],
[1,0,6,"Otros procedimientos médicos",1,0],
[1,0,6,"Procedimientos especialidad",1,0],
[1,0,6,"Procedimientos Imagenológicos (Médico)",1,1],
[1,0,6,"Reunión Clínica",1,0],
[1,0,6,"Reunión Técnica Administrativa",0,0],
[1,0,6,"Telecomité",1,1],
[1,0,4,"Administración de medicamentos",1,1],
[1,0,4,"Comité Clínico",1,0],
[1,0,4,"Comité Oncológico",1,0],
[1,0,4,"Docencia e Investigación",1,0],
[1,0,4,"Educación Grupal",1,0],
[1,0,4,"Gestión de camas",1,0],
[1,0,4,"Gestión de Casos",1,0],
[1,0,4,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,0,4,"Otras Actividades Clínicas",1,0],
[1,0,4,"Otras Actividades No Clínicas",0,0],
[1,0,4,"Otros procedimientos médicos",1,0],
[1,0,4,"Procedimientos especialidad",1,0],
[1,0,4,"Procedimientos Imagenológicos (Médico)",1,1],
[1,0,4,"Reunión Clínica",1,0],
[1,0,4,"Reunión Técnica Administrativa",0,0],
[1,0,4,"Telecomité",1,1],
[1,0,2,"Administración de medicamentos",1,1],
[1,0,2,"Comité Clínico",1,0],
[1,0,2,"Comité Oncológico",1,0],
[1,0,2,"Docencia e Investigación",1,0],
[1,0,2,"Educación Grupal",1,0],
[1,0,2,"Gestión de camas",1,0],
[1,0,2,"Gestión de Casos",1,0],
[1,0,2,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,0,2,"Infiltraciones (rehabilitación)",1,0],
[1,0,2,"Otras Actividades Clínicas",1,0],
[1,0,2,"Otras Actividades No Clínicas",0,0],
[1,0,2,"Otros procedimientos médicos",1,0],
[1,0,2,"Procedimientos especialidad",1,0],
[1,0,2,"Procedimientos Imagenológicos (Médico)",1,1],
[1,0,2,"Reunión Clínica",1,0],
[1,0,2,"Reunión Técnica Administrativa",0,0],
[1,0,2,"Telecomité",1,1],
[1,0,5,"Administración de medicamentos",1,1],
[1,0,5,"Comité Clínico",1,0],
[1,0,5,"Comité Oncológico",1,0],
[1,0,5,"Docencia e Investigación",1,0],
[1,0,5,"Educación Grupal",1,0],
[1,0,5,"Gestión de camas",1,0],
[1,0,5,"Gestión de Casos",1,0],
[1,0,5,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,0,5,"Infiltraciones (rehabilitación)",1,0],
[1,0,5,"Otras Actividades Clínicas",1,0],
[1,0,5,"Otras Actividades No Clínicas",0,0],
[1,0,5,"Otros procedimientos médicos",1,0],
[1,0,5,"Procedimientos especialidad",1,0],
[1,0,5,"Reunión Clínica",1,0],
[1,0,5,"Reunión Técnica Administrativa",0,0],
[1,0,5,"Telecomité",1,1],
[1,0,3,"Administración de medicamentos",1,1],
[1,0,3,"Comité Clínico",1,0],
[1,0,3,"Comité Oncológico",1,0],
[1,0,3,"Docencia e Investigación",1,0],
[1,0,3,"Educación Grupal",1,0],
[1,0,3,"Gestión de camas",1,0],
[1,0,3,"Gestión de Casos",1,0],
[1,0,3,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,0,3,"Infiltraciones (rehabilitación)",1,0],
[1,0,3,"Otras Actividades Clínicas",1,0],
[1,0,3,"Otras Actividades No Clínicas",0,0],
[1,0,3,"Otros procedimientos médicos",1,0],
[1,0,3,"Procedimientos especialidad",1,0],
[1,0,3,"Procedimientos Imagenológicos (Médico)",1,1],
[1,0,3,"Reunión Clínica",1,0],
[1,0,3,"Reunión Técnica Administrativa",0,0],
[1,0,3,"Telecomité",1,1],
[2,0,6,"Administración de medicamentos",1,1],
[2,0,6,"Cistoscopia y/o uretrocistoscopia y/o uretroscopia",1,0],
[2,0,6,"Docencia e Investigación",1,0],
[2,0,6,"Gestión de Casos",1,0],
[2,0,6,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,0,6,"Otras Actividades Clínicas",1,0],
[2,0,6,"Otras Actividades No Clínicas",0,0],
[2,0,6,"Otros procedimientos médicos",1,0],
[2,0,6,"Pabellon Cirugía Mayor",1,1],
[2,0,6,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,0,6,"Pabellon Cirugía Menor",1,0],
[2,0,6,"Pabellon Cirugía Obstétrica",1,0],
[2,0,6,"Procedimientos especialidad",1,0],
[2,0,6,"Procedimientos Imagenológicos (Médico)",1,1],
[2,0,6,"Reunión Clínica",1,0],
[2,0,6,"Reunión Técnica Administrativa",0,0],
[2,0,2,"Administración de medicamentos",1,1],
[2,0,2,"Docencia e Investigación",1,0],
[2,0,2,"Gestión de Casos",1,0],
[2,0,2,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,0,2,"Otras Actividades Clínicas",1,0],
[2,0,2,"Otras Actividades No Clínicas",0,0],
[2,0,2,"Otros procedimientos médicos",1,0],
[2,0,2,"Pabellon Cirugía Mayor",1,1],
[2,0,2,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,0,2,"Pabellon Cirugía Menor",1,0],
[2,0,2,"Procedimientos especialidad",1,0],
[2,0,2,"Procedimientos Imagenológicos (Médico)",1,1],
[2,0,2,"Reunión Clínica",1,0],
[2,0,2,"Reunión Técnica Administrativa",0,0],
[2,0,5,"Administración de medicamentos",1,1],
[2,0,5,"Docencia e Investigación",1,0],
[2,0,5,"Gestión de Casos",1,0],
[2,0,5,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,0,5,"Nasofaringolaringofibroscopia",1,0],
[2,0,5,"Otras Actividades Clínicas",1,0],
[2,0,5,"Otras Actividades No Clínicas",0,0],
[2,0,5,"Otros procedimientos médicos",1,0],
[2,0,5,"Pabellon Cirugía Mayor",1,1],
[2,0,5,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,0,5,"Pabellon Cirugía Menor",1,0],
[2,0,5,"Procedimientos especialidad",1,0],
[2,0,5,"Procedimientos Imagenológicos (Médico)",1,1],
[2,0,5,"Reunión Clínica",1,0],
[2,0,5,"Reunión Técnica Administrativa",0,0],
[2,0,3,"Administración de medicamentos",1,1],
[2,0,3,"Docencia e Investigación",1,0],
[2,0,3,"Gestión de Casos",1,0],
[2,0,3,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,0,3,"Nasofaringolaringofibroscopia",1,0],
[2,0,3,"Otras Actividades Clínicas",1,0],
[2,0,3,"Otras Actividades No Clínicas",0,0],
[2,0,3,"Otros procedimientos médicos",1,0],
[2,0,3,"Pabellon Cirugía Mayor",1,1],
[2,0,3,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,0,3,"Pabellon Cirugía Menor",1,0],
[2,0,3,"Procedimientos especialidad",1,0],
[2,0,3,"Procedimientos Imagenológicos (Médico)",1,1],
[2,0,3,"Reunión Clínica",1,0],
[2,0,3,"Reunión Técnica Administrativa",0,0],
[3,0,1,"Administración de medicamentos",1,0],
[3,0,1,"Docencia e Investigación",1,0],
[3,0,1,"Ecocardiograma con/sin Doppler",1,0],
[3,0,1,"Gestión de camas",1,0],
[3,0,1,"Gestión de Casos",1,0],
[3,0,1,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,0,1,"Otras Actividades Clínicas",1,0],
[3,0,1,"Otras Actividades No Clínicas",0,0],
[3,0,1,"Otros procedimientos médicos",1,0],
[3,0,1,"Pabellon Cirugía Urgencia",1,0],
[3,0,1,"Procedimientos especialidad",1,0],
[3,0,1,"Procedimientos Imagenológicos (Médico)",1,0],
[3,0,1,"Reunión Clínica",1,0],
[3,0,1,"Reunión Técnica Administrativa",0,0],
[3,0,1,"Triage",1,1],
[3,0,6,"Administración de medicamentos",1,0],
[3,0,6,"Docencia e Investigación",1,0],
[3,0,6,"Gestión de camas",1,0],
[3,0,6,"Gestión de Casos",1,0],
[3,0,6,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,0,6,"Otras Actividades Clínicas",1,0],
[3,0,6,"Otras Actividades No Clínicas",0,0],
[3,0,6,"Otros procedimientos médicos",1,0],
[3,0,6,"Pabellon Cirugía Urgencia",1,0],
[3,0,6,"Procedimientos especialidad",1,0],
[3,0,6,"Procedimientos Imagenológicos (Médico)",1,0],
[3,0,6,"Reunión Clínica",1,0],
[3,0,6,"Reunión Técnica Administrativa",0,0],
[3,0,6,"Triage",1,1],
[3,0,4,"Administración de medicamentos",1,0],
[3,0,4,"Docencia e Investigación",1,0],
[3,0,4,"Ecocardiograma con/sin Doppler",1,0],
[3,0,4,"Gestión de camas",1,0],
[3,0,4,"Gestión de Casos",1,0],
[3,0,4,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,0,4,"Otras Actividades Clínicas",1,0],
[3,0,4,"Otras Actividades No Clínicas",0,0],
[3,0,4,"Otros procedimientos médicos",1,0],
[3,0,4,"Pabellon Cirugía Urgencia",1,0],
[3,0,4,"Procedimientos especialidad",1,0],
[3,0,4,"Procedimientos Imagenológicos (Médico)",1,0],
[3,0,4,"Reunión Clínica",1,0],
[3,0,4,"Reunión Técnica Administrativa",0,0],
[3,0,4,"Triage",1,1],
[3,0,2,"Administración de medicamentos",1,0],
[3,0,2,"Docencia e Investigación",1,0],
[3,0,2,"Gestión de camas",1,0],
[3,0,2,"Gestión de Casos",1,0],
[3,0,2,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,0,2,"Otras Actividades Clínicas",1,0],
[3,0,2,"Otras Actividades No Clínicas",0,0],
[3,0,2,"Otros procedimientos médicos",1,0],
[3,0,2,"Pabellon Cirugía Urgencia",1,0],
[3,0,2,"Procedimientos especialidad",1,0],
[3,0,2,"Procedimientos Imagenológicos (Médico)",1,0],
[3,0,2,"Reunión Clínica",1,0],
[3,0,2,"Reunión Técnica Administrativa",0,0],
[3,0,2,"Triage",1,1],
[3,0,5,"Administración de medicamentos",1,0],
[3,0,5,"Docencia e Investigación",1,0],
[3,0,5,"Gestión de camas",1,0],
[3,0,5,"Gestión de Casos",1,0],
[3,0,5,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,0,5,"Otras Actividades Clínicas",1,0],
[3,0,5,"Otras Actividades No Clínicas",0,0],
[3,0,5,"Otros procedimientos médicos",1,0],
[3,0,5,"Pabellon Cirugía Urgencia",1,0],
[3,0,5,"Procedimientos especialidad",1,0],
[3,0,5,"Reunión Clínica",1,0],
[3,0,5,"Reunión Técnica Administrativa",0,0],
[3,0,5,"Triage",1,1],
[3,0,3,"Administración de medicamentos",1,0],
[3,0,3,"Docencia e Investigación",1,0],
[3,0,3,"Gestión de camas",1,0],
[3,0,3,"Gestión de Casos",1,0],
[3,0,3,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,0,3,"Otras Actividades Clínicas",1,0],
[3,0,3,"Otras Actividades No Clínicas",0,0],
[3,0,3,"Otros procedimientos médicos",1,0],
[3,0,3,"Pabellon Cirugía Urgencia",1,0],
[3,0,3,"Procedimientos especialidad",1,0],
[3,0,3,"Procedimientos Imagenológicos (Médico)",1,0],
[3,0,3,"Reunión Clínica",1,0],
[3,0,3,"Reunión Técnica Administrativa",0,0],
[3,0,3,"Triage",1,1],
[1,0,1,"Administración de medicamentos",1,1],
[1,0,1,"Comité Clínico",1,0],
[1,0,1,"Comité Oncológico",1,0],
[1,0,1,"Docencia e Investigación",1,0],
[1,0,1,"Educación Grupal",1,0],
[1,0,1,"Gestión de camas",1,0],
[1,0,1,"Gestión de Casos",1,0],
[1,0,1,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,0,1,"Otras Actividades Clínicas",1,0],
[1,0,1,"Otras Actividades No Clínicas",0,0],
[1,0,1,"Otros procedimientos médicos",1,0],
[1,0,1,"Procedimientos especialidad",1,0],
[1,0,1,"Procedimientos Imagenológicos (Médico)",1,1],
[1,0,1,"Reunión Clínica",1,0],
[1,0,1,"Reunión Técnica Administrativa",0,0],
[1,0,1,"Telecomité",1,1],
[2,0,1,"Administración de medicamentos",1,1],
[2,0,1,"Docencia e Investigación",1,0],
[2,0,1,"Gestión de Casos",1,0],
[2,0,1,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,0,1,"Nasofaringolaringofibroscopia",1,0],
[2,0,1,"Otras Actividades Clínicas",1,0],
[2,0,1,"Otras Actividades No Clínicas",0,0],
[2,0,1,"Otros procedimientos médicos",1,0],
[2,0,1,"Pabellon Cirugía Mayor",1,1],
[2,0,1,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,0,1,"Pabellon Cirugía Menor",1,0],
[2,0,1,"Procedimientos especialidad",1,0],
[2,0,1,"Procedimientos Imagenológicos (Médico)",1,1],
[2,0,1,"Reunión Clínica",1,0],
[2,0,1,"Reunión Técnica Administrativa",0,0],
[0,0,1,"Ecocardiograma con/sin Doppler",1,1],
[0,0,4,"Actividades de cuidado del equipo (SM)",0,0],
[0,0,5,"Nasofaringolaringofibroscopia",1,1],
[0,0,3,"Nasofaringolaringofibroscopia",1,1],
[0,0,1,"Nasofaringolaringofibroscopia",1,1],
[1,0,4,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[1,0,4,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[3,0,1,"Atención de Servicio de Urgencia C1-C2",1,1],
[3,0,4,"Atención de Servicio de Urgencia C1-C2",1,1],
[3,0,2,"Atención de Servicio de Urgencia C1-C2",1,1],
[3,0,5,"Atención de Servicio de Urgencia C1-C2",1,1],
[3,0,3,"Atención de Servicio de Urgencia C1-C2",1,1],
[3,0,1,"Atención de Servicio de Urgencia C3",1,1],
[3,0,4,"Atención de Servicio de Urgencia C3",1,1],
[3,0,2,"Atención de Servicio de Urgencia C3",1,1],
[3,0,5,"Atención de Servicio de Urgencia C3",1,1],
[3,0,3,"Atención de Servicio de Urgencia C3",1,1],
[3,0,1,"Atención de Servicio de Urgencia C4-C5",1,1],
[3,0,4,"Atención de Servicio de Urgencia C4-C5",1,1],
[3,0,2,"Atención de Servicio de Urgencia C4-C5",1,1],
[3,0,5,"Atención de Servicio de Urgencia C4-C5",1,1],
[3,0,3,"Atención de Servicio de Urgencia C4-C5",1,1],
[1,0,6,"Egresos cama básica pediátrica",1,1],
[1,0,6,"Egresos cama media pediátrica",1,1],
[1,0,6,"Egresos cama UCI pediátrica",1,1],
[1,0,6,"Egresos cama UTI pediátrica",1,1],
[1,0,6,"Egresos cama básica Neo",1,1],
[1,0,6,"Egresos cama UTI Neo",1,1],
[1,0,6,"Egresos cama UCI Neo",1,1],
[1,0,6,"Egresos cama UTI Adulto",1,1],
[1,0,6,"Egresos cama UCI Adulto",1,1],
[1,0,6,"Egresos cama media Adulto",1,1],
[1,0,6,"Egresos cama básica Adulto",1,1],
[1,0,6,"Egresos cama Psiquiátrica",1,1],
[1,0,4,"Egresos cama básica pediátrica",1,1],
[1,0,4,"Egresos cama media pediátrica",1,1],
[1,0,4,"Egresos cama UCI pediátrica",1,1],
[1,0,4,"Egresos cama UTI pediátrica",1,1],
[1,0,4,"Egresos cama básica Neo",1,1],
[1,0,4,"Egresos cama UTI Neo",1,1],
[1,0,4,"Egresos cama UCI Neo",1,1],
[1,0,4,"Egresos cama UTI Adulto",1,1],
[1,0,4,"Egresos cama UCI Adulto",1,1],
[1,0,4,"Egresos cama media Adulto",1,1],
[1,0,4,"Egresos cama básica Adulto",1,1],
[1,0,4,"Egresos cama Psiquiátrica",1,1],
[1,0,2,"Egresos cama básica pediátrica",1,1],
[1,0,2,"Egresos cama media pediátrica",1,1],
[1,0,2,"Egresos cama UCI pediátrica",1,1],
[1,0,2,"Egresos cama UTI pediátrica",1,1],
[1,0,2,"Egresos cama básica Neo",1,1],
[1,0,2,"Egresos cama UTI Neo",1,1],
[1,0,2,"Egresos cama UCI Neo",1,1],
[1,0,2,"Egresos cama UTI Adulto",1,1],
[1,0,2,"Egresos cama UCI Adulto",1,1],
[1,0,2,"Egresos cama media Adulto",1,1],
[1,0,2,"Egresos cama básica Adulto",1,1],
[1,0,2,"Egresos cama Psiquiátrica",1,1],
[1,0,5,"Egresos cama básica pediátrica",1,1],
[1,0,5,"Egresos cama media pediátrica",1,1],
[1,0,5,"Egresos cama UCI pediátrica",1,1],
[1,0,5,"Egresos cama UTI pediátrica",1,1],
[1,0,5,"Egresos cama básica Neo",1,1],
[1,0,5,"Egresos cama UTI Neo",1,1],
[1,0,5,"Egresos cama UCI Neo",1,1],
[1,0,5,"Egresos cama UTI Adulto",1,1],
[1,0,5,"Egresos cama UCI Adulto",1,1],
[1,0,5,"Egresos cama media Adulto",1,1],
[1,0,5,"Egresos cama básica Adulto",1,1],
[1,0,5,"Egresos cama Psiquiátrica",1,1],
[1,0,3,"Egresos cama básica pediátrica",1,1],
[1,0,3,"Egresos cama media pediátrica",1,1],
[1,0,3,"Egresos cama UCI pediátrica",1,1],
[1,0,3,"Egresos cama UTI pediátrica",1,1],
[1,0,3,"Egresos cama básica Neo",1,1],
[1,0,3,"Egresos cama UTI Neo",1,1],
[1,0,3,"Egresos cama UCI Neo",1,1],
[1,0,3,"Egresos cama UTI Adulto",1,1],
[1,0,3,"Egresos cama UCI Adulto",1,1],
[1,0,3,"Egresos cama media Adulto",1,1],
[1,0,3,"Egresos cama básica Adulto",1,1],
[1,0,3,"Egresos cama Psiquiátrica",1,1],
[1,0,1,"Egresos cama básica pediátrica",1,1],
[1,0,1,"Egresos cama media pediátrica",1,1],
[1,0,1,"Egresos cama UCI pediátrica",1,1],
[1,0,1,"Egresos cama UTI pediátrica",1,1],
[1,0,1,"Egresos cama básica Neo",1,1],
[1,0,1,"Egresos cama UTI Neo",1,1],
[1,0,1,"Egresos cama UCI Neo",1,1],
[1,0,1,"Egresos cama UTI Adulto",1,1],
[1,0,1,"Egresos cama UCI Adulto",1,1],
[1,0,1,"Egresos cama media Adulto",1,1],
[1,0,1,"Egresos cama básica Adulto",1,1],
[1,0,1,"Egresos cama Psiquiátrica",1,1],
[0,0,6,"Egresos cama básica pediátrica",1,1],
[0,0,6,"Egresos cama media pediátrica",1,1],
[0,0,6,"Egresos cama UCI pediátrica",1,1],
[0,0,6,"Egresos cama UTI pediátrica",1,1],
[0,0,6,"Egresos cama básica Neo",1,1],
[0,0,6,"Egresos cama UTI Neo",1,1],
[0,0,6,"Egresos cama UCI Neo",1,1],
[0,0,6,"Egresos cama UTI Adulto",1,1],
[0,0,6,"Egresos cama UCI Adulto",1,1],
[0,0,6,"Egresos cama media Adulto",1,1],
[0,0,6,"Egresos cama básica Adulto",1,1],
[0,0,6,"Egresos cama Psiquiátrica",1,1],
[0,0,4,"Egresos cama básica pediátrica",1,1],
[0,0,4,"Egresos cama media pediátrica",1,1],
[0,0,4,"Egresos cama UCI pediátrica",1,1],
[0,0,4,"Egresos cama UTI pediátrica",1,1],
[0,0,4,"Egresos cama básica Neo",1,1],
[0,0,4,"Egresos cama UTI Neo",1,1],
[0,0,4,"Egresos cama UCI Neo",1,1],
[0,0,4,"Egresos cama UTI Adulto",1,1],
[0,0,4,"Egresos cama UCI Adulto",1,1],
[0,0,4,"Egresos cama media Adulto",1,1],
[0,0,4,"Egresos cama básica Adulto",1,1],
[0,0,4,"Egresos cama Psiquiátrica",1,1],
[0,0,2,"Egresos cama básica pediátrica",1,1],
[0,0,2,"Egresos cama media pediátrica",1,1],
[0,0,2,"Egresos cama UCI pediátrica",1,1],
[0,0,2,"Egresos cama UTI pediátrica",1,1],
[0,0,2,"Egresos cama básica Neo",1,1],
[0,0,2,"Egresos cama UTI Neo",1,1],
[0,0,2,"Egresos cama UCI Neo",1,1],
[0,0,2,"Egresos cama UTI Adulto",1,1],
[0,0,2,"Egresos cama UCI Adulto",1,1],
[0,0,2,"Egresos cama media Adulto",1,1],
[0,0,2,"Egresos cama básica Adulto",1,1],
[0,0,2,"Egresos cama Psiquiátrica",1,1],
[0,0,5,"Egresos cama básica pediátrica",1,1],
[0,0,5,"Egresos cama media pediátrica",1,1],
[0,0,5,"Egresos cama UCI pediátrica",1,1],
[0,0,5,"Egresos cama UTI pediátrica",1,1],
[0,0,5,"Egresos cama básica Neo",1,1],
[0,0,5,"Egresos cama UTI Neo",1,1],
[0,0,5,"Egresos cama UCI Neo",1,1],
[0,0,5,"Egresos cama UTI Adulto",1,1],
[0,0,5,"Egresos cama UCI Adulto",1,1],
[0,0,5,"Egresos cama media Adulto",1,1],
[0,0,5,"Egresos cama básica Adulto",1,1],
[0,0,5,"Egresos cama Psiquiátrica",1,1],
[0,0,3,"Egresos cama básica pediátrica",1,1],
[0,0,3,"Egresos cama media pediátrica",1,1],
[0,0,3,"Egresos cama UCI pediátrica",1,1],
[0,0,3,"Egresos cama UTI pediátrica",1,1],
[0,0,3,"Egresos cama básica Neo",1,1],
[0,0,3,"Egresos cama UTI Neo",1,1],
[0,0,3,"Egresos cama UCI Neo",1,1],
[0,0,3,"Egresos cama UTI Adulto",1,1],
[0,0,3,"Egresos cama UCI Adulto",1,1],
[0,0,3,"Egresos cama media Adulto",1,1],
[0,0,3,"Egresos cama básica Adulto",1,1],
[0,0,3,"Egresos cama Psiquiátrica",1,1],
[0,0,1,"Egresos cama básica pediátrica",1,1],
[0,0,1,"Egresos cama media pediátrica",1,1],
[0,0,1,"Egresos cama UCI pediátrica",1,1],
[0,0,1,"Egresos cama UTI pediátrica",1,1],
[0,0,1,"Egresos cama básica Neo",1,1],
[0,0,1,"Egresos cama UTI Neo",1,1],
[0,0,1,"Egresos cama UCI Neo",1,1],
[0,0,1,"Egresos cama UTI Adulto",1,1],
[0,0,1,"Egresos cama UCI Adulto",1,1],
[0,0,1,"Egresos cama media Adulto",1,1],
[0,0,1,"Egresos cama básica Adulto",1,1],
[0,0,1,"Egresos cama Psiquiátrica",1,1],
[2,0,6,"Pabellon Cirugía Mayor (segundo o tercer cirujano)",1,1],
[2,0,6,"Pabellon Cirugía Mayor Ambulatoria (segundo o tercer cirujano)",1,1],
[2,0,2,"Pabellon Cirugía Mayor (segundo o tercer cirujano)",1,1],
[2,0,2,"Pabellon Cirugía Mayor Ambulatoria (segundo o tercer cirujano)",1,1],
[2,0,5,"Pabellon Cirugía Mayor (segundo o tercer cirujano)",1,1],
[2,0,5,"Pabellon Cirugía Mayor Ambulatoria (segundo o tercer cirujano)",1,1],
[2,0,3,"Pabellon Cirugía Mayor (segundo o tercer cirujano)",1,1],
[2,0,3,"Pabellon Cirugía Mayor Ambulatoria (segundo o tercer cirujano)",1,1],
[2,0,1,"Pabellon Cirugía Mayor (segundo o tercer cirujano)",1,1],
[2,0,1,"Pabellon Cirugía Mayor Ambulatoria (segundo o tercer cirujano)",1,1],
[2,0,6,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,1,"Pabellon Cirugía Urgencia (segundo o tercer cirujano)",1,0],
[3,0,6,"Pabellon Cirugía Urgencia (segundo o tercer cirujano)",1,0],
[3,0,4,"Pabellon Cirugía Urgencia (segundo o tercer cirujano)",1,0],
[3,0,2,"Pabellon Cirugía Urgencia (segundo o tercer cirujano)",1,0],
[3,0,5,"Pabellon Cirugía Urgencia (segundo o tercer cirujano)",1,0],
[3,0,3,"Pabellon Cirugía Urgencia (segundo o tercer cirujano)",1,0],
[1,0,6,"Atención en sala cama básica pediátrica",1,1],
[1,0,6,"Atención en sala cama media pediátrica",1,1],
[1,0,6,"Atención en sala cama UCI pediátrica",1,1],
[1,0,6,"Atención en sala cama UTI pediátrica",1,1],
[1,0,6,"Atención en sala cama básica Neo",1,1],
[1,0,6,"Atención en sala cama UTI Neo",1,1],
[1,0,6,"Atención en sala cama UCI Neo",1,1],
[1,0,4,"Atención en sala cama básica pediátrica",1,1],
[1,0,4,"Atención en sala cama media pediátrica",1,1],
[1,0,4,"Atención en sala cama UCI pediátrica",1,1],
[1,0,4,"Atención en sala cama UTI pediátrica",1,1],
[1,0,4,"Atención en sala cama básica Neo",1,1],
[1,0,4,"Atención en sala cama UTI Neo",1,1],
[1,0,4,"Atención en sala cama UCI Neo",1,1],
[1,0,2,"Atención en sala cama básica pediátrica",1,1],
[1,0,2,"Atención en sala cama media pediátrica",1,1],
[1,0,2,"Atención en sala cama UCI pediátrica",1,1],
[1,0,2,"Atención en sala cama UTI pediátrica",1,1],
[1,0,2,"Atención en sala cama básica Neo",1,1],
[1,0,2,"Atención en sala cama UTI Neo",1,1],
[1,0,2,"Atención en sala cama UCI Neo",1,1],
[1,0,5,"Atención en sala cama básica pediátrica",1,1],
[1,0,5,"Atención en sala cama media pediátrica",1,1],
[1,0,5,"Atención en sala cama UCI pediátrica",1,1],
[1,0,5,"Atención en sala cama UTI pediátrica",1,1],
[1,0,5,"Atención en sala cama básica Neo",1,1],
[1,0,5,"Atención en sala cama UTI Neo",1,1],
[1,0,5,"Atención en sala cama UCI Neo",1,1],
[1,0,3,"Atención en sala cama básica pediátrica",1,1],
[1,0,3,"Atención en sala cama media pediátrica",1,1],
[1,0,3,"Atención en sala cama UCI pediátrica",1,1],
[1,0,3,"Atención en sala cama UTI pediátrica",1,1],
[1,0,3,"Atención en sala cama básica Neo",1,1],
[1,0,3,"Atención en sala cama UTI Neo",1,1],
[1,0,3,"Atención en sala cama UCI Neo",1,1],
[1,0,1,"Atención en sala cama básica pediátrica",1,1],
[1,0,1,"Atención en sala cama media pediátrica",1,1],
[1,0,1,"Atención en sala cama UCI pediátrica",1,1],
[1,0,1,"Atención en sala cama UTI pediátrica",1,1],
[1,0,1,"Atención en sala cama básica Neo",1,1],
[1,0,1,"Atención en sala cama UTI Neo",1,1],
[1,0,1,"Atención en sala cama UCI Neo",1,1],
[0,0,1,"Visita a sala Hospitalizado cama básica pediátrica",1,1],
[0,0,1,"Visita a sala Hospitalizado cama media pediátrica",1,1],
[0,0,1,"Visita a sala Hospitalizado cama UCI pediátrica",1,1],
[0,0,1,"Visita a sala Hospitalizado cama UTI pediátrica",1,1],
[0,0,1,"Visita a sala Hospitalizado cama básica Neo",1,1],
[0,0,1,"Visita a sala Hospitalizado cama UTI Neo",1,1],
[0,0,1,"Visita a sala Hospitalizado cama UCI Neo",1,1],
[0,0,6,"Visita a sala Hospitalizado cama básica pediátrica",1,1],
[0,0,6,"Visita a sala Hospitalizado cama media pediátrica",1,1],
[0,0,6,"Visita a sala Hospitalizado cama UCI pediátrica",1,1],
[0,0,6,"Visita a sala Hospitalizado cama UTI pediátrica",1,1],
[0,0,6,"Visita a sala Hospitalizado cama básica Neo",1,1],
[0,0,6,"Visita a sala Hospitalizado cama UTI Neo",1,1],
[0,0,6,"Visita a sala Hospitalizado cama UCI Neo",1,1],
[0,0,4,"Visita a sala Hospitalizado cama básica pediátrica",1,1],
[0,0,4,"Visita a sala Hospitalizado cama media pediátrica",1,1],
[0,0,4,"Visita a sala Hospitalizado cama UCI pediátrica",1,1],
[0,0,4,"Visita a sala Hospitalizado cama UTI pediátrica",1,1],
[0,0,4,"Visita a sala Hospitalizado cama básica Neo",1,1],
[0,0,4,"Visita a sala Hospitalizado cama UTI Neo",1,1],
[0,0,4,"Visita a sala Hospitalizado cama UCI Neo",1,1],
[0,0,2,"Visita a sala Hospitalizado cama básica pediátrica",1,1],
[0,0,2,"Visita a sala Hospitalizado cama media pediátrica",1,1],
[0,0,2,"Visita a sala Hospitalizado cama UCI pediátrica",1,1],
[0,0,2,"Visita a sala Hospitalizado cama UTI pediátrica",1,1],
[0,0,2,"Visita a sala Hospitalizado cama básica Neo",1,1],
[0,0,2,"Visita a sala Hospitalizado cama UTI Neo",1,1],
[0,0,2,"Visita a sala Hospitalizado cama UCI Neo",1,1],
[0,0,5,"Visita a sala Hospitalizado cama básica pediátrica",1,1],
[0,0,5,"Visita a sala Hospitalizado cama media pediátrica",1,1],
[0,0,5,"Visita a sala Hospitalizado cama UCI pediátrica",1,1],
[0,0,5,"Visita a sala Hospitalizado cama UTI pediátrica",1,1],
[0,0,5,"Visita a sala Hospitalizado cama básica Neo",1,1],
[0,0,5,"Visita a sala Hospitalizado cama UTI Neo",1,1],
[0,0,5,"Visita a sala Hospitalizado cama UCI Neo",1,1],
[0,0,3,"Visita a sala Hospitalizado cama básica pediátrica",1,1],
[0,0,3,"Visita a sala Hospitalizado cama media pediátrica",1,1],
[0,0,3,"Visita a sala Hospitalizado cama UCI pediátrica",1,1],
[0,0,3,"Visita a sala Hospitalizado cama UTI pediátrica",1,1],
[0,0,3,"Visita a sala Hospitalizado cama básica Neo",1,1],
[0,0,3,"Visita a sala Hospitalizado cama UTI Neo",1,1],
[0,0,3,"Visita a sala Hospitalizado cama UCI Neo",1,1],
[0,0,2,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,1,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,3,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,4,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,5,"Visita a sala Hospitalizado cama básica Adulto",1,1],
[0,0,5,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,3,"Visita a sala Hospitalizado cama básica Adulto",1,1],
[0,0,6,"Visita a sala Hospitalizado cama básica Adulto",1,1],
[0,0,4,"Visita a sala Hospitalizado cama básica Adulto",1,1],
[0,0,1,"Visita a sala Hospitalizado cama básica Adulto",1,1],
[0,0,6,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,2,"Visita a sala Hospitalizado cama básica Adulto",1,1],
[0,0,1,"Visita a sala Hospitalizado cama UTI Adulto",1,1],
[0,0,1,"Visita a sala Hospitalizado cama UCI Adulto",1,1],
[1,0,4,"Atención en sala cama media Adulto",1,1],
[1,0,4,"Atención en sala cama básica Adulto",1,1],
[1,0,6,"Atención en sala cama media Adulto",1,1],
[1,0,3,"Atención en sala cama básica Adulto",1,1],
[1,0,3,"Atención en sala cama media Adulto",1,1],
[1,0,4,"Atención en sala cama UCI Adulto",1,1],
[1,0,1,"Atención en sala cama UCI Adulto",1,1],
[1,0,2,"Atención en sala cama media Adulto",1,1],
[1,0,6,"Atención en sala cama básica Adulto",1,1],
[1,0,1,"Atención en sala cama media Adulto",1,1],
[1,0,4,"Atención en sala cama UTI Adulto",1,1],
[1,0,5,"Atención en sala cama media Adulto",1,1],
[1,0,1,"Atención en sala cama UTI Adulto",1,1],
[1,0,1,"Atención en sala cama básica Adulto",1,1],
[1,0,4,"Atención en sala cama Psiquiátrica",1,1],
[1,0,4,"Egresos cama básica Psiquiátrica",1,1],
[1,0,2,"Atención en sala cama básica Adulto",1,1],
[1,0,5,"Atención en sala cama básica Adulto",1,1],
[0,0,4,"Colonoscopía larga (incluye sigmoidoscopía y ....)",1,1],
[0,0,4,"Ecocardiograma con/sin Doppler",1,1],
[0,0,6,"Ecografía Obstétrica",1,1],
[3,0,1,"Pabellon Cirugía Obstétrica",1,0],
[3,0,6,"Pabellon Cirugía Obstétrica",1,0],
[3,0,4,"Pabellon Cirugía Obstétrica",1,0],
[3,0,2,"Pabellon Cirugía Obstétrica",1,0],
[3,0,5,"Pabellon Cirugía Obstétrica",1,0],
[3,0,3,"Pabellon Cirugía Obstétrica",1,0],
[3,0,1,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,6,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,4,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,2,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,5,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,3,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,6,"Atención de Servicio de Urgencia C1 (Obs)",1,1],
[3,0,6,"Atención de Servicio de Urgencia C2 (Obs)",1,1],
[3,0,6,"Atención de Servicio de Urgencia C3 (Obs)",1,1],
[3,0,6,"Atención de Servicio de Urgencia C4 (Obs)",1,1],
[3,0,6,"Atención de Servicio de Urgencia C5 (Obs)",1,1],
[0,0,1,"Consulta nueva presencial (Acto Único)",1,1],
[0,0,6,"Consulta nueva presencial (Acto Único)",1,1],
[0,0,4,"Consulta nueva presencial (Acto Único)",1,1],
[0,0,2,"Consulta nueva presencial (Acto Único)",1,1],
[0,0,5,"Consulta nueva presencial (Acto Único)",1,1],
[0,0,3,"Consulta nueva presencial (Acto Único)",1,1],
[0,0,1,"Atención domiciliaria",1,1],
[0,0,6,"Atención domiciliaria",1,1],
[0,0,4,"Atención domiciliaria",1,1],
[0,0,2,"Atención domiciliaria",1,1],
[0,0,5,"Atención domiciliaria",1,1],
[0,0,3,"Atención domiciliaria",1,1],
[3,0,6,"Atención de Servicio de Urgencia C3",1,1],
[3,0,6,"Atención de Servicio de Urgencia C1-C2",1,1],
[3,0,6,"Atención de Servicio de Urgencia C4-C5",1,1],
[3,0,3,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,1,"Capacitación avance tecnológico",1,1],
[0,0,6,"Capacitación avance tecnológico",1,1],
[0,0,4,"Capacitación avance tecnológico",1,1],
[0,0,2,"Capacitación avance tecnológico",1,1],
[0,0,5,"Capacitación avance tecnológico",1,1],
[0,0,3,"Capacitación avance tecnológico",1,1],
[1,0,6,"Capacitación avance tecnológico",1,1],
[1,0,4,"Capacitación avance tecnológico",1,1],
[1,0,2,"Capacitación avance tecnológico",1,1],
[1,0,5,"Capacitación avance tecnológico",1,1],
[1,0,3,"Capacitación avance tecnológico",1,1],
[2,0,6,"Capacitación avance tecnológico",1,1],
[2,0,2,"Capacitación avance tecnológico",1,1],
[2,0,5,"Capacitación avance tecnológico",1,1],
[2,0,3,"Capacitación avance tecnológico",1,1],
[3,0,1,"Capacitación avance tecnológico",1,1],
[3,0,6,"Capacitación avance tecnológico",1,1],
[3,0,4,"Capacitación avance tecnológico",1,1],
[3,0,2,"Capacitación avance tecnológico",1,1],
[3,0,5,"Capacitación avance tecnológico",1,1],
[3,0,3,"Capacitación avance tecnológico",1,1],
[1,0,1,"Capacitación avance tecnológico",1,1],
[2,0,1,"Capacitación avance tecnológico",1,1],
[0,1,0,"Actividad Comunitaria (SM)",0,0],
[0,1,0,"Actividades con organizaciones de usuarios y familiares (SM)",0,0],
[0,1,0,"Actividades de cuidado del equipo",0,1],
[0,1,0,"Administración de medicamentos",1,1],
[0,1,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,1,0,"Colaboración y formación con grupos de autoayuda (SM)",0,0],
[0,1,0,"Comité Articulador de Continuidad de Cuidados (SM)",1,0],
[0,1,0,"Comité clínico",1,0],
[0,1,0,"Comité de ingreso a atención cerrada (SM)",1,0],
[0,1,0,"Comité Oncológico",1,0],
[0,1,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[0,1,0,"Consejeria en salud",1,0],
[0,1,0,"Consulta Abreviada no Médica",1,1],
[0,1,0,"Consulta Control Presencial (ESPECIALIDADES)",1,1],
[0,1,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[0,1,0,"Consulta Control Salud Mental",1,1],
[0,1,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[0,1,0,"Consulta Nueva Presencial (ESPECIALIDADES)",1,1],
[0,1,0,"Consulta Nueva Presencial (SM)",1,1],
[0,1,0,"Consultoría en salud",1,1],
[0,1,0,"Contacto telefónico: Consulta Abreviada",1,1],
[0,1,0,"Contacto telefónico: Consulta Control",1,1],
[0,1,0,"Contacto telefónico: Consultoría",1,1],
[0,1,0,"Contrareferencia",1,1],
[0,1,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[0,1,0,"Coordinación pacientes GES/LRS",1,1],
[0,1,0,"Curaciones control",1,1],
[0,1,0,"Curaciones ingreso",1,1],
[0,1,0,"Derivación Asistida SM",1,0],
[0,1,0,"Docencia e Investigación",1,0],
[0,1,0,"Educación Grupal",1,0],
[0,1,0,"Educación Individual",1,1],
[0,1,0,"Educación remota a usuario y/o cuidador",1,1],
[0,1,0,"Gestión de Casos",1,1],
[0,1,0,"Gestión de Casos SM",1,0],
[0,1,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,1,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[0,1,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[0,1,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[0,1,0,"OANC Registros clínicos",0,0],
[0,1,0,"OANC Actividades administrativas",0,0],
[0,1,0,"OANC Administración de personal",0,0],
[0,1,0,"OANC Comité de apoyo a la gestión",0,0],
[0,1,0,"Otras Actividades Clínicas",1,0],
[0,1,0,"Otras Actividades No Clínicas",0,0],
[0,1,0,"Pertinencia (IC)",1,1],
[0,1,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[0,1,0,"Procedimientos Invasivos (Propios)",1,0],
[0,1,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[0,1,0,"Procedimientos No Invasivos (Propios)",1,0],
[0,1,0,"Rescate en Domicilio (SM)",1,0],
[0,1,0,"Rescate no presencial (SM)",1,1],
[0,1,0,"Reunión Clínica",1,0],
[0,1,0,"Reunión Técnica Administrativa",0,0],
[0,1,0,"Taller Grupal",1,0],
[0,1,0,"Teleconsulta abreviada (Videollamada)",1,1],
[0,1,0,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,1,0,"Trabajo intersectorial (SM)",0,0],
[0,1,0,"Trabajo sectorial (SM)",0,0],
[0,1,0,"Visita Domiciliaria",1,1],
[0,1,0,"Visita Integral de Salud Mental (SM)",1,0],
[0,1,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[0,4,0,"Actividad Comunitaria (SM)",0,0],
[0,4,0,"Actividades con organizaciones de usuarios y familiares (SM)",0,0],
[0,4,0,"Actividades de cuidado del equipo",0,1],
[0,4,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,4,0,"Colaboración y formación con grupos de autoayuda (SM)",0,0],
[0,4,0,"Comité Articulador de Continuidad de Cuidados (SM)",1,0],
[0,4,0,"Comité clínico",1,0],
[0,4,0,"Comité de ingreso a atención cerrada (SM)",1,0],
[0,4,0,"Comité Oncológico",1,0],
[0,4,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[0,4,0,"Consejeria en salud",1,0],
[0,4,0,"Consulta Abreviada no Médica",1,1],
[0,4,0,"Consulta Control Presencial (ESPECIALIDADES)",1,1],
[0,4,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[0,4,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[0,4,0,"Consulta Nueva Presencial (ESPECIALIDADES)",1,1],
[0,4,0,"Consultoría en salud",1,1],
[0,4,0,"Contacto telefónico: Consulta Abreviada",1,1],
[0,4,0,"Contacto telefónico: Consulta Control",1,1],
[0,4,0,"Contrareferencia",1,1],
[0,4,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[0,4,0,"Derivación Asistida SM",1,0],
[0,4,0,"Docencia e Investigación",1,0],
[0,4,0,"Educación Individual",1,1],
[0,4,0,"Educación remota a usuario y/o cuidador",1,1],
[0,4,0,"Evaluación inicial PRESENCIAL",1,1],
[0,4,0,"Evaluación intermedia PRESENCIAL",1,1],
[0,4,0,"Evaluación Intermedia remota",1,1],
[0,4,0,"Gestión de Casos",1,1],
[0,4,0,"Gestión de Casos SM",1,0],
[0,4,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,4,0,"Hospitalización Domiciliaria",1,0],
[0,4,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[0,4,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[0,4,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[0,4,0,"Otras Actividades Clínicas",1,0],
[0,4,0,"Otras Actividades No Clínicas",0,0],
[0,4,0,"Pertinencia (IC)",1,1],
[0,4,0,"Procedimientos No Invasivos (Propios)",1,0],
[0,4,0,"Rescate en Domicilio (SM)",1,0],
[0,4,0,"Rescate no presencial (SM)",1,1],
[0,4,0,"Reunión Clínica",1,0],
[0,4,0,"Reunión Técnica Administrativa",0,0],
[0,4,0,"Ronda otro establecimiento",1,0],
[0,4,0,"Sesión de rehabilitación vía remota (Telerehabilitación)",1,1],
[0,4,0,"Sesiones de Rehabilitación PRESENCIAL",1,1],
[0,4,0,"Taller Grupal",1,0],
[0,4,0,"Teleconsultoria Salud Mental",1,1],
[0,4,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,4,0,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,4,0,"Telemedicina: Teleconsulta Control",1,1],
[0,4,0,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,4,0,"Telemedicina: Teleconsulta Nueva",1,1],
[0,4,0,"Trabajo intersectorial (SM)",0,0],
[0,4,0,"Trabajo sectorial (SM)",0,0],
[0,4,0,"Visita Domiciliaria",1,1],
[0,4,0,"Visita Integral de Salud Mental (SM)",1,0],
[0,4,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[0,3,0,"Actividad Comunitaria (SM)",0,0],
[0,3,0,"Actividades con organizaciones de usuarios y familiares (SM)",0,0],
[0,3,0,"Actividades de cuidado del equipo",0,1],
[0,3,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,3,0,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,3,0,"Colaboración y formación con grupos de autoayuda (SM)",0,0],
[0,3,0,"Comité Articulador de Continuidad de Cuidados (SM)",1,0],
[0,3,0,"Comité clínico",1,0],
[0,3,0,"Comité de ingreso a atención cerrada (SM)",1,0],
[0,3,0,"Comité Oncológico",1,0],
[0,3,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[0,3,0,"Consulta Abreviada no Médica",1,1],
[0,3,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[0,3,0,"Consulta de ingreso a equipo PRAIS",1,1],
[0,3,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[0,3,0,"Consultoría en salud",1,1],
[0,3,0,"Contacto telefónico: Consulta Abreviada",1,1],
[0,3,0,"Contacto telefónico: Consulta Control",1,1],
[0,3,0,"Contacto telefónico: Consultoría",1,1],
[0,3,0,"Contrareferencia",1,1],
[0,3,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[0,3,0,"Derivación Asistida SM",1,0],
[0,3,0,"Docencia e Investigación",1,0],
[0,3,0,"Educación Individual",1,1],
[0,3,0,"Educación remota a usuario y/o cuidador",1,1],
[0,3,0,"Evaluación inicial PRESENCIAL",1,1],
[0,3,0,"Evaluación integral de daño",1,1],
[0,3,0,"Evaluación intermedia PRESENCIAL",1,1],
[0,3,0,"Evaluación Intermedia remota",1,1],
[0,3,0,"Gestión de Casos",1,1],
[0,3,0,"Gestión de Casos SM",1,0],
[0,3,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,3,0,"Hospitalización Domiciliaria",1,0],
[0,3,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[0,3,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[0,3,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[0,3,0,"OANC Registros clínicos",0,0],
[0,3,0,"OANC Actividades administrativas",0,0],
[0,3,0,"OANC Administración de personal",0,0],
[0,3,0,"OANC Comité de apoyo a la gestión",0,0],
[0,3,0,"OANC Comité de programación",0,0],
[0,3,0,"OANC Comité paritario",0,0],
[0,3,0,"Otras Actividades Clínicas",1,0],
[0,3,0,"Otras Actividades No Clínicas",0,0],
[0,3,0,"Pertinencia (IC)",1,1],
[0,3,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[0,3,0,"Procedimientos Invasivos (Propios)",1,0],
[0,3,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[0,3,0,"Procedimientos No Invasivos (Propios)",1,0],
[0,3,0,"Rescate en Domicilio (SM)",1,0],
[0,3,0,"Rescate no presencial (SM)",1,1],
[0,3,0,"Reunión Clínica",1,0],
[0,3,0,"Reunión Técnica Administrativa",0,0],
[0,3,0,"Ronda otro establecimiento",1,0],
[0,3,0,"Sesión de rehabilitación vía remota (Telerehabilitación)",1,1],
[0,3,0,"Sesiones de Rehabilitación a distancia",1,1],
[0,3,0,"Sesiones de Rehabilitación PRESENCIAL",1,1],
[0,3,0,"Taller Grupal",1,0],
[0,3,0,"Taller Grupal a Distancia",1,0],
[0,3,0,"Teleconsultoria Salud Mental",1,1],
[0,3,0,"Telemedicina: Teleconsulta Control",1,1],
[0,3,0,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,3,0,"Telemedicina: Teleconsulta Nueva",1,1],
[0,3,0,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,3,0,"Trabajo intersectorial (SM)",0,0],
[0,3,0,"Trabajo sectorial (SM)",0,0],
[0,3,0,"Trabajo sectorial de información y sensibilización",0,1],
[0,3,0,"Visita Integral de Salud Mental (SM)",1,0],
[0,3,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[0,2,0,"Actividades de cuidado del equipo",0,1],
[0,2,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,2,0,"Comité clínico",1,0],
[0,2,0,"Comité Oncológico",1,0],
[0,2,0,"Consejeria en salud",1,0],
[0,2,0,"Consulta Abreviada no Médica",1,1],
[0,2,0,"Consulta Matrona ARO",1,1],
[0,2,0,"Consulta Matrona ARO POR LEY IVE",1,1],
[0,2,0,"Consulta matrona ginecología y otros",1,1],
[0,2,0,"Consulta matrona infertilidad",1,1],
[0,2,0,"Consultoría en salud",1,1],
[0,2,0,"Contacto telefónico: Consulta Abreviada",1,1],
[0,2,0,"Contacto telefónico: Consulta Control",1,1],
[0,2,0,"Contacto telefónico: Consultoría",1,1],
[0,2,0,"Contrareferencia",1,1],
[0,2,0,"Docencia e Investigación",1,0],
[0,2,0,"Educación Grupal",1,0],
[0,2,0,"Educación Individual",1,1],
[0,2,0,"Educación remota a usuario y/o cuidador",1,1],
[0,2,0,"Gestión de camas",1,1],
[0,2,0,"Gestión de Casos",1,1],
[0,2,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,2,0,"OANC Registros clínicos",0,0],
[0,2,0,"OANC Actividades administrativas",0,0],
[0,2,0,"OANC Administración de personal",0,0],
[0,2,0,"OANC Comité de apoyo a la gestión",0,0],
[0,2,0,"OANC Comité de programación",0,0],
[0,2,0,"OANC Comité paritario",0,0],
[0,2,0,"Otras Actividades Clínicas",1,0],
[0,2,0,"Otras Actividades No Clínicas",0,0],
[0,2,0,"Pertinencia (IC)",1,1],
[0,2,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[0,2,0,"Procedimientos Invasivos (Propios)",1,0],
[0,2,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[0,2,0,"Procedimientos No Invasivos (Propios)",1,0],
[0,2,0,"Reunión Clínica",1,0],
[0,2,0,"Reunión Técnica Administrativa",0,0],
[0,2,0,"Taller Grupal",1,0],
[0,2,0,"Telecomité",1,1],
[0,2,0,"Teleconsulta abreviada (Videollamada)",1,1],
[0,2,0,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,2,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,2,0,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,2,0,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,2,0,"Telemedicina: Teleconsulta Control",1,1],
[0,2,0,"Telemedicina: Teleconsulta Nueva",1,1],
[0,2,0,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,2,0,"Trabajo sectorial de información y sensibilización",0,1],
[0,2,0,"Visita Domiciliaria",1,1],
[0,5,0,"Actividades de cuidado del equipo",0,1],
[0,5,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,5,0,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,5,0,"Atención Nutricional en Sala",1,1],
[0,5,0,"Atención Nutricional Intensiva (ANI)",1,1],
[0,5,0,"Comité clínico",1,0],
[0,5,0,"Comité Oncológico",1,0],
[0,5,0,"Consejeria en salud",1,0],
[0,5,0,"Consulta Abreviada no Médica",1,1],
[0,5,0,"Consulta Control Presencial (ESPECIALIDADES)",1,1],
[0,5,0,"Consulta Nueva Presencial (ESPECIALIDADES)",1,1],
[0,5,0,"Consultoría en salud",1,1],
[0,5,0,"Contacto telefónico: Consulta Abreviada",1,1],
[0,5,0,"Contacto telefónico: Consulta Control",1,1],
[0,5,0,"Docencia e Investigación",1,0],
[0,5,0,"Educación Individual",1,1],
[0,5,0,"Educación nutricional establecimiento o/y espacios públicos.",1,1],
[0,5,0,"Educación remota a usuario y/o cuidador",1,1],
[0,5,0,"Gestión de Casos",1,1],
[0,5,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,5,0,"Hospitalización Domiciliaria",1,0],
[0,5,0,"OANC Registros clínicos",0,0],
[0,5,0,"OANC Actividades administrativas",0,0],
[0,5,0,"OANC Administración de personal",0,0],
[0,5,0,"OANC Comité de apoyo a la gestión",0,0],
[0,5,0,"Otras Actividades Clínicas",1,0],
[0,5,0,"Otras Actividades No Clínicas",0,0],
[0,5,0,"Pertinencia (IC)",1,1],
[0,5,0,"Procedimientos No Invasivos (Propios)",1,0],
[0,5,0,"Reunión Clínica",1,0],
[0,5,0,"Reunión Técnica Administrativa",0,0],
[0,5,0,"Ronda otro establecimiento",1,0],
[0,5,0,"Sesiones de Rehabilitación PRESENCIAL",1,1],
[0,5,0,"Taller Grupal",1,0],
[0,5,0,"Telecomité",1,1],
[0,5,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,5,0,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,5,0,"Telemedicina: Teleconsulta Control",1,1],
[0,5,0,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,5,0,"Telemedicina: Teleconsulta Nueva",1,1],
[0,5,0,"Visita Domiciliaria",1,1],
[0,6,0,"Actividad Comunitaria (SM)",0,0],
[0,6,0,"Actividades con organizaciones de usuarios y familiares (SM)",0,0],
[0,6,0,"Actividades de cuidado del equipo",0,1],
[0,6,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,6,0,"Colaboración y formación con grupos de autoayuda (SM)",0,0],
[0,6,0,"Comité Articulador de Continuidad de Cuidados (SM)",1,0],
[0,6,0,"Comité clínico",1,0],
[0,6,0,"Comité de ingreso a atención cerrada (SM)",1,0],
[0,6,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[0,6,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[0,6,0,"Consulta Control Salud Mental",1,1],
[0,6,0,"Consulta e Interconsulta en Unidades de Emergencia Hospitalaria (UEH) (Equipo de enlace)",1,1],
[0,6,0,"Consulta Ingreso Equipo de Salud Mental",1,1],
[0,6,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[0,6,0,"Consulta Nueva Presencial (SM)",1,1],
[0,6,0,"Consultoría en Salud Mental (Presencial)",1,0],
[0,6,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[0,6,0,"Derivación Asistida SM",1,0],
[0,6,0,"Docencia e Investigación",1,0],
[0,6,0,"Evaluación inicial PRESENCIAL",1,1],
[0,6,0,"Evaluación intermedia PRESENCIAL",1,1],
[0,6,0,"Gestión de Casos SM",1,0],
[0,6,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,6,0,"Gestion Terapeutica",1,1],
[0,6,0,"Intervención en Crisis",1,0],
[0,6,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[0,6,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[0,6,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[0,6,0,"OANC Actividades administrativas",0,0],
[0,6,0,"Otras Actividades Clínicas",1,0],
[0,6,0,"Otras Actividades No Clínicas",0,0],
[0,6,0,"Pertinencia (IC)",1,1],
[0,6,0,"Psicodiagnóstico",1,1],
[0,6,0,"Psicoterapia Familiar (SM) (incluye presencial y remoto)",1,1],
[0,6,0,"Psicoterapia Grupal (SM) (incluye presencial y remoto)",1,1],
[0,6,0,"Psicoterapia Individual (SM) (incluye presencial y remoto)",1,1],
[0,6,0,"Rescate en Domicilio (SM)",1,0],
[0,6,0,"Rescate no presencial (SM)",1,1],
[0,6,0,"Reunión Técnica Administrativa",0,0],
[0,6,0,"Sesiones de Rehabilitación PRESENCIAL",1,1],
[0,6,0,"Teleconsulta Control Salud Mental",1,1],
[0,6,0,"Teleconsultoria Salud Mental",1,1],
[0,6,0,"Trabajo intersectorial (SM)",0,0],
[0,6,0,"Trabajo sectorial (SM)",0,0],
[0,6,0,"Visita Domiciliaria",1,1],
[0,6,0,"Visita Integral de Salud Mental (SM)",1,0],
[0,6,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[0,7,0,"Actividad Comunitaria (SM)",0,0],
[0,7,0,"Actividades con organizaciones de usuarios y familiares (SM)",0,0],
[0,7,0,"Actividades de cuidado del equipo",0,1],
[0,7,0,"Colaboración y formación con grupos de autoayuda (SM)",0,0],
[0,7,0,"Comité Articulador de Continuidad de Cuidados (SM)",1,0],
[0,7,0,"Comité clínico",1,0],
[0,7,0,"Comité de ingreso a atención cerrada (SM)",1,0],
[0,7,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[0,7,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[0,7,0,"Consulta Control Salud Mental",1,1],
[0,7,0,"Consulta Ingreso Equipo de Salud Mental",1,1],
[0,7,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[0,7,0,"Consultoría en Salud Mental (Presencial)",1,0],
[0,7,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[0,7,0,"Derivación Asistida SM",1,0],
[0,7,0,"Docencia e Investigación",1,0],
[0,7,0,"Evaluación Diagnóstica de Otros Profesionales",1,1],
[0,7,0,"Gestión de Casos SM",1,0],
[0,7,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,7,0,"Intervención en Crisis",1,0],
[0,7,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[0,7,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[0,7,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[0,7,0,"OANC Registros clínicos",0,0],
[0,7,0,"OANC Actividades administrativas",0,0],
[0,7,0,"OANC Administración de personal",0,0],
[0,7,0,"OANC Comité de apoyo a la gestión",0,0],
[0,7,0,"Otras Actividades Clínicas",1,0],
[0,7,0,"Otras Actividades No Clínicas",0,0],
[0,7,0,"Rescate en Domicilio (SM)",1,0],
[0,7,0,"Rescate no presencial (SM)",1,1],
[0,7,0,"Reunión Técnica Administrativa",0,0],
[0,7,0,"Teleconsulta Control Salud Mental",1,1],
[0,7,0,"Teleconsultoria Salud Mental",1,1],
[0,7,0,"Trabajo intersectorial (SM)",0,0],
[0,7,0,"Trabajo sectorial (SM)",0,0],
[0,7,0,"Visita Integral de Salud Mental (SM)",1,0],
[0,7,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[0,8,0,"Actividad Comunitaria (SM)",0,0],
[0,8,0,"Actividades con organizaciones de usuarios y familiares (SM)",0,0],
[0,8,0,"Actividades de cuidado del equipo",0,1],
[0,8,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,8,0,"Colaboración y formación con grupos de autoayuda (SM)",0,0],
[0,8,0,"Comité Articulador de Continuidad de Cuidados (SM)",1,0],
[0,8,0,"Comité clínico",1,0],
[0,8,0,"Comité de ingreso a atención cerrada (SM)",1,0],
[0,8,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[0,8,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[0,8,0,"Consulta Control Salud Mental",1,1],
[0,8,0,"Consulta e Interconsulta en Unidades de Emergencia Hospitalaria (UEH) (Equipo de enlace)",1,1],
[0,8,0,"Consulta Ingreso Equipo de Salud Mental",1,1],
[0,8,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[0,8,0,"Consulta Nueva Presencial (SM)",1,1],
[0,8,0,"Consultoría en Salud Mental (Presencial)",1,0],
[0,8,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[0,8,0,"Derivación Asistida SM",1,0],
[0,8,0,"Docencia e Investigación",1,0],
[0,8,0,"Evaluación Diagnóstica de Otros Profesionales",1,1],
[0,8,0,"Gestión de Casos SM",1,0],
[0,8,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,8,0,"Gestion Terapeutica",1,1],
[0,8,0,"Intervención en Crisis",1,0],
[0,8,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[0,8,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[0,8,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[0,8,0,"OANC Registros clínicos",0,0],
[0,8,0,"OANC Actividades administrativas",0,0],
[0,8,0,"OANC Administración de personal",0,0],
[0,8,0,"OANC Comité de apoyo a la gestión",0,0],
[0,8,0,"Otras Actividades Clínicas",1,0],
[0,8,0,"Otras Actividades No Clínicas",0,0],
[0,8,0,"Rescate en Domicilio (SM)",1,0],
[0,8,0,"Rescate no presencial (SM)",1,1],
[0,8,0,"Reunión Técnica Administrativa",0,0],
[0,8,0,"Teleconsulta Control Salud Mental",1,1],
[0,8,0,"Teleconsultoria Salud Mental",1,1],
[0,8,0,"Trabajo intersectorial (SM)",0,0],
[0,8,0,"Trabajo sectorial (SM)",0,0],
[0,8,0,"Visita Integral de Salud Mental (SM)",1,0],
[0,8,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[1,1,0,"Comité clínico",1,0],
[1,1,0,"Comité Oncológico",1,0],
[1,1,0,"Contrareferencia",1,0],
[1,1,0,"Docencia e Investigación",1,0],
[1,1,0,"Educación Grupal",1,0],
[1,1,0,"Educación Individual",1,0],
[1,1,0,"Educación remota a usuario y/o cuidador",1,1],
[1,1,0,"Gestión de camas",1,0],
[1,1,0,"Gestión de Casos",1,0],
[1,1,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,1,0,"Hospitalización Domiciliaria",1,0],
[1,1,0,"OANC Registros clínicos",0,0],
[1,1,0,"OANC Actividades administrativas",0,0],
[1,1,0,"OANC Administración de personal",0,0],
[1,1,0,"OANC Comité de apoyo a la gestión",0,0],
[1,1,0,"Otras Actividades Clínicas",1,0],
[1,1,0,"Otras Actividades No Clínicas",0,0],
[1,1,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[1,1,0,"Procedimientos Invasivos (Propios)",1,0],
[1,1,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[1,1,0,"Procedimientos No Invasivos (Propios)",1,0],
[1,1,0,"Reunión Clínica",1,0],
[1,1,0,"Taller Grupal",1,0],
[1,1,0,"Telecomité",0,1],
[1,1,0,"Teleconsulta abreviada (Videollamada)",1,1],
[1,1,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[1,1,0,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[1,3,0,"Docencia e Investigación",1,0],
[1,3,0,"Gestión de Casos",1,0],
[1,3,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,3,0,"OANC Registros clínicos",0,0],
[1,3,0,"OANC Actividades administrativas",0,0],
[1,3,0,"OANC Administración de personal",0,0],
[1,3,0,"OANC Comité de apoyo a la gestión",0,0],
[1,3,0,"Otras Actividades Clínicas",1,0],
[1,3,0,"Otras Actividades No Clínicas",0,0],
[1,3,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[1,3,0,"Procedimientos Invasivos (Propios)",1,0],
[1,3,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[1,3,0,"Procedimientos No Invasivos (Propios)",1,0],
[1,3,0,"Reunión Clínica",1,0],
[1,2,0,"Actividades de cuidado del equipo",0,0],
[1,2,0,"Atención de Enlace o Interconsulta a sala",1,0],
[1,2,0,"Comité clínico",1,0],
[1,2,0,"Comité Oncológico",1,0],
[1,2,0,"Consejeria en salud",1,0],
[1,2,0,"Docencia e Investigación",1,0],
[1,2,0,"Educación Grupal",1,0],
[1,2,0,"Educación Individual",1,0],
[1,2,0,"Educación remota a usuario y/o cuidador",1,1],
[1,2,0,"Gestión de camas",1,0],
[1,2,0,"Gestión de Casos",1,0],
[1,2,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,2,0,"OANC Registros clínicos",0,0],
[1,2,0,"OANC Actividades administrativas",0,0],
[1,2,0,"OANC Administración de personal",0,0],
[1,2,0,"OANC Comité de apoyo a la gestión",0,0],
[1,2,0,"OANC Comité de programación",0,0],
[1,2,0,"OANC Comité paritario",0,0],
[1,2,0,"Otras Actividades Clínicas",1,0],
[1,2,0,"Otras Actividades No Clínicas",0,0],
[1,2,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[1,2,0,"Procedimientos Invasivos (Propios)",1,0],
[1,2,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[1,2,0,"Procedimientos No Invasivos (Propios)",1,0],
[1,2,0,"Reunión Clínica",1,0],
[1,2,0,"Reunión Técnica Administrativa",0,0],
[1,2,0,"Taller Grupal",1,0],
[1,2,0,"Telecomité",0,1],
[1,2,0,"Teleconsulta abreviada (Videollamada)",1,1],
[1,2,0,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[1,2,0,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[1,2,0,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[1,2,0,"Trabajo sectorial de información y sensibilización",0,1],
[2,1,0,"Docencia e Investigación",1,0],
[2,1,0,"Gestión de Casos",1,0],
[2,1,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,1,0,"OANC Registros clínicos",0,0],
[2,1,0,"OANC Actividades administrativas",0,0],
[2,1,0,"OANC Administración de personal",0,0],
[2,1,0,"OANC Comité de apoyo a la gestión",0,0],
[2,1,0,"Otras Actividades Clínicas",1,0],
[2,1,0,"Otras Actividades No Clínicas",0,0],
[2,1,0,"Pabellon Cirugía Mayor",1,0],
[2,1,0,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,1,0,"Pabellon Cirugía Menor",1,0],
[2,1,0,"Pabellon Cirugía Obstetrica",1,0],
[2,1,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[2,1,0,"Procedimientos Invasivos (Propios)",1,0],
[2,1,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[2,1,0,"Procedimientos No Invasivos (Propios)",1,0],
[2,1,0,"Reunión Clínica",1,0],
[2,2,0,"Actividades de cuidado del equipo",0,0],
[2,2,0,"Atención de Enlace o Interconsulta a sala",1,0],
[2,2,0,"Comité clínico",1,0],
[2,2,0,"Comité Oncológico",1,0],
[2,2,0,"Docencia e Investigación",1,0],
[2,2,0,"Educación Individual",1,0],
[2,2,0,"Gestión de Casos",1,0],
[2,2,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,2,0,"OANC Registros clínicos",0,0],
[2,2,0,"OANC Actividades administrativas",0,0],
[2,2,0,"OANC Administración de personal",0,0],
[2,2,0,"OANC Comité de apoyo a la gestión",0,0],
[2,2,0,"OANC Comité de programación",0,0],
[2,2,0,"OANC Comité paritario",0,0],
[2,2,0,"Otras Actividades Clínicas",1,0],
[2,2,0,"Otras Actividades No Clínicas",0,0],
[2,2,0,"Pabellon Cirugía Mayor",1,0],
[2,2,0,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,2,0,"Pabellon Cirugía Menor",1,0],
[2,2,0,"Pabellon Cirugía Obstetrica",1,0],
[2,2,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[2,2,0,"Procedimientos Invasivos (Propios)",1,0],
[2,2,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[2,2,0,"Procedimientos No Invasivos (Propios)",1,0],
[2,2,0,"Reunión Clínica",1,0],
[2,2,0,"Reunión Técnica Administrativa",0,0],
[3,1,0,"Docencia e Investigación",1,0],
[3,1,0,"Gestión de Casos",1,0],
[3,1,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,1,0,"OANC Registros clínicos",0,0],
[3,1,0,"OANC Actividades administrativas",0,0],
[3,1,0,"OANC Administración de personal",0,0],
[3,1,0,"OANC Comité de apoyo a la gestión",0,0],
[3,1,0,"Otras Actividades Clínicas",1,0],
[3,1,0,"Otras Actividades No Clínicas",0,0],
[3,1,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[3,1,0,"Procedimientos Invasivos (Propios)",1,0],
[3,1,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[3,1,0,"Procedimientos No Invasivos (Propios)",1,0],
[3,1,0,"Reunión Clínica",1,0],
[3,1,0,"Triage",1,1],
[3,3,0,"Docencia e Investigación",1,0],
[3,3,0,"Gestión de Casos",1,0],
[3,3,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,3,0,"OANC Registros clínicos",0,0],
[3,3,0,"OANC Actividades administrativas",0,0],
[3,3,0,"OANC Administración de personal",0,0],
[3,3,0,"OANC Comité de apoyo a la gestión",0,0],
[3,3,0,"Otras Actividades Clínicas",1,0],
[3,3,0,"Otras Actividades No Clínicas",0,0],
[3,3,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[3,3,0,"Procedimientos Invasivos (Propios)",1,0],
[3,3,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[3,3,0,"Procedimientos No Invasivos (Propios)",1,0],
[3,3,0,"Reunión Clínica",1,0],
[3,2,0,"Actividades de cuidado del equipo",0,0],
[3,2,0,"Atención de Enlace o Interconsulta a sala",1,0],
[3,2,0,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[3,2,0,"Consejeria en salud",1,0],
[3,2,0,"Consulta Abreviada no Médica",1,0],
[3,2,0,"Consulta Matrona ARO",1,0],
[3,2,0,"Consulta Matrona ARO POR LEY IVE",1,0],
[3,2,0,"Consulta matrona ginecología y otros",1,0],
[3,2,0,"Consultoría en salud",1,0],
[3,2,0,"Contrareferencia",1,0],
[3,2,0,"Docencia e Investigación",1,0],
[3,2,0,"Educación Individual",1,0],
[3,2,0,"Gestión de camas",1,0],
[3,2,0,"Gestión de Casos",1,0],
[3,2,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,2,0,"OANC Registros clínicos",0,0],
[3,2,0,"OANC Actividades administrativas",0,0],
[3,2,0,"OANC Administración de personal",0,0],
[3,2,0,"OANC Comité de apoyo a la gestión",0,0],
[3,2,0,"OANC Comité de programación",0,0],
[3,2,0,"OANC Comité paritario",0,0],
[3,2,0,"Otras Actividades Clínicas",1,0],
[3,2,0,"Otras Actividades No Clínicas",0,0],
[3,2,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[3,2,0,"Procedimientos Invasivos (Propios)",1,0],
[3,2,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[3,2,0,"Procedimientos No Invasivos (Propios)",1,0],
[3,2,0,"Reunión Clínica",1,0],
[3,2,0,"Reunión Técnica Administrativa",0,0],
[0,6,0,"Comité Oncológico",1,0],
[0,6,0,"Reunión Clínica",1,0],
[0,7,0,"Reunión Clínica",1,0],
[0,8,0,"Reunión Clínica",1,0],
[1,3,0,"Evaluación inicial PRESENCIAL",1,0],
[1,3,0,"Evaluación intermedia PRESENCIAL",1,0],
[1,3,0,"Sesiones de Rehabilitación PRESENCIAL",1,0],
[0,8,0,"Evaluación inicial PRESENCIAL",1,1],
[0,8,0,"Sesiones de Rehabilitación PRESENCIAL",1,1],
[0,8,0,"Evaluación Intermedia remota",1,1],
[0,8,0,"Sesiones de Rehabilitación a distancia",1,1],
[1,5,0,"Atención Nutricional",1,0],
[0,8,0,"Consulta Control Presencial (ESPECIALIDADES)",1,1],
[0,8,0,"Consulta Nueva Presencial (ESPECIALIDADES)",1,1],
[0,8,0,"Gestión de Casos",1,1],
[0,8,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,8,0,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,8,0,"Telemedicina: Teleconsulta Control",1,1],
[0,8,0,"Telemedicina: Teleconsulta Nueva",1,1],
[0,8,0,"Visita Domiciliaria",1,1],
[0,8,0,"Contacto telefónico: Consulta Control",1,1],
[0,1,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,1,0,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,1,0,"Telemedicina: Teleconsulta Control",1,1],
[0,1,0,"Telemedicina: Teleconsulta Nueva",1,1],
[0,1,0,"Consulta Ingreso Equipo de Salud Mental",1,1],
[0,1,0,"Consultoría en Salud Mental (Presencial)",1,0],
[0,3,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,3,0,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,8,0,"Sesión de rehabilitación vía remota (Telerehabilitación)",1,1],
[0,3,0,"Evaluación de Ayuda Técnica (NUEVA )",1,1],
[0,3,0,"Entrega de Ayuda Técnica (NUEVA )",1,1],
[0,3,0,"Entrenamiento de Ayuda Técnica (NUEVA )",1,1],
[1,3,0,"Evaluación de Ayuda Técnica (NUEVA )",1,1],
[1,3,0,"Entrega de Ayuda Técnica (NUEVA )",1,1],
[1,3,0,"Entrenamiento de Ayuda Técnica (NUEVA )",1,1],
[1,4,0,"Docencia e Investigación",1,0],
[1,4,0,"Evaluación de Ayuda Técnica (NUEVA )",1,1],
[1,4,0,"Entrega de Ayuda Técnica (NUEVA )",1,1],
[1,4,0,"Entrenamiento de Ayuda Técnica (NUEVA )",1,1],
[1,4,0,"Evaluación inicial PRESENCIAL",1,0],
[1,4,0,"Evaluación intermedia PRESENCIAL",1,0],
[1,4,0,"Gestión de Casos",1,0],
[1,4,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,4,0,"OANC Registros clínicos",0,0],
[1,4,0,"OANC Actividades administrativas",0,0],
[1,4,0,"OANC Administración de personal",0,0],
[1,4,0,"OANC Comité de apoyo a la gestión",0,0],
[1,4,0,"Otras Actividades Clínicas",1,0],
[1,4,0,"Otras Actividades No Clínicas",0,0],
[1,4,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[1,4,0,"Procedimientos Invasivos (Propios)",1,0],
[1,4,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[1,4,0,"Procedimientos No Invasivos (Propios)",1,0],
[1,4,0,"Reunión Clínica",1,0],
[1,4,0,"Sesiones de Rehabilitación PRESENCIAL",1,0],
[0,4,0,"Entrega de Ayuda Técnica (NUEVA )",1,1],
[0,4,0,"Entrenamiento de Ayuda Técnica (NUEVA )",1,1],
[0,4,0,"Evaluación de Ayuda Técnica (NUEVA )",1,1],
[0,8,0,"Taller Grupal",1,0],
[0,8,0,"Entrega de Ayuda Técnica (NUEVA )",1,1],
[0,8,0,"Entrenamiento de Ayuda Técnica (NUEVA )",1,1],
[0,8,0,"Evaluación de Ayuda Técnica (NUEVA )",1,1],
[0,7,0,"Consulta Nueva Presencial (SM)",1,1],
[1,8,0,"Sesiones de Rehabilitación PRESENCIAL",1,0],
[1,8,0,"Otras Actividades Clínicas",1,0],
[1,8,0,"OANC Actividades administrativas",0,0],
[1,8,0,"Atención de Enlace o Interconsulta a sala",1,0],
[1,8,0,"Reunión Técnica Administrativa",0,0],
[1,8,0,"Otras Actividades No Clínicas",0,0],
[1,8,0,"Reunión Clínica",1,0],
[1,8,0,"Evaluación inicial PRESENCIAL",1,0],
[1,8,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,0],
[1,8,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[1,8,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,8,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[1,8,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[1,8,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[1,8,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[1,8,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,0],
[1,8,0,"Evaluación intermedia PRESENCIAL",1,0],
[1,8,0,"Comité clínico",1,0],
[1,8,0,"Docencia e Investigación",1,0],
[1,8,0,"Actividades de cuidado del equipo",0,0],
[1,8,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[1,4,0,"Actividades de cuidado del equipo",0,0],
[1,4,0,"Reunión Técnica Administrativa",0,0],
[1,3,0,"Actividades de cuidado del equipo",0,0],
[1,3,0,"Reunión Técnica Administrativa",0,0],
[1,1,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,0],
[1,1,0,"Reunión Técnica Administrativa",0,0],
[1,1,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,0],
[1,6,0,"Otras Actividades Clínicas",1,0],
[1,6,0,"Atención de Enlace o Interconsulta a sala",1,0],
[1,6,0,"Psicoterapia Individual (SM) (incluye presencial y remoto)",1,0],
[1,6,0,"Psicodiagnóstico",1,0],
[1,6,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,6,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,0],
[1,6,0,"Otras Actividades No Clínicas",0,0],
[1,6,0,"Reunión Clínica",1,0],
[1,6,0,"Reunión Técnica Administrativa",0,0],
[1,6,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[1,6,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[1,6,0,"Ronda otro establecimiento",1,0],
[1,6,0,"Sesiones de Rehabilitación PRESENCIAL",1,0],
[1,6,0,"Actividades de cuidado del equipo",0,0],
[1,6,0,"Gestión de Casos SM",1,0],
[1,6,0,"Educación Individual",1,0],
[1,5,0,"Otras Actividades No Clínicas",0,0],
[1,5,0,"Reunión Clínica",1,0],
[1,5,0,"Otras Actividades Clínicas",1,0],
[1,5,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,5,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,0],
[1,5,0,"Reunión Técnica Administrativa",0,0],
[1,5,0,"Procedimientos No Invasivos (Propios)",1,0],
[1,5,0,"OANC Actividades administrativas",0,0],
[1,5,0,"Docencia e Investigación",1,0],
[1,5,0,"Atención Nutricional en Sala",1,0],
[1,5,0,"Educación nutricional establecimiento o/y espacios públicos.",1,0],
[1,5,0,"Atención Nutricional Intensiva (ANI)",1,0],
[1,5,0,"OANC Administración de personal",0,0],
[1,5,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,0],
[1,6,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,0],
[0,6,0,"Consulta Control Presencial (ESPECIALIDADES)",1,1],
[0,6,0,"Consulta Nueva Presencial (ESPECIALIDADES)",1,1],
[2,1,0,"Gestión prequirúrgica",1,0],
[2,1,0,"Gestión tabla quirúrgica",1,0],
[2,2,0,"Gestión prequirúrgica",1,0],
[2,2,0,"Gestión tabla quirúrgica",1,0],
[0,1,0,"Evaluación inicial PRESENCIAL",1,1],
[0,1,0,"Consulta Control Presencial (SM)",1,1],
[0,3,0,"Visita Domiciliaria",1,1],
[0,2,0,"Consulta Control Presencial (SM)",1,1],
[0,2,0,"Consulta Control Salud Mental",1,1],
[0,6,0,"Consulta Control Presencial (SM)",1,1],
[0,8,0,"Consulta Control Presencial (SM)",1,1],
[0,8,0,"Evaluación intermedia PRESENCIAL",1,1],
[0,8,0,"Consultoría en salud",1,0],
[0,6,0,"Consulta Abreviada no Médica",1,1],
[0,8,0,"Confección de ortesis.",1,0],
[1,8,0,"Confección de ortesis.",1,0],
[1,1,0,"Atención de Enlace o Interconsulta a sala",1,0],
[0,3,0,"Evaluación inicial remota",1,1],
[0,8,0,"Evaluación inicial remota",1,1],
[0,4,0,"Evaluación inicial remota",1,1],
[0,6,0,"Evaluación inicial remota",1,1],
[0,1,0,"Evaluación inicial remota",1,1],
[0,3,0,"Evaluación inicial en domicilio (NUEVA)",1,1],
[0,8,0,"Evaluación inicial en domicilio (NUEVA)",1,1],
[0,4,0,"Evaluación inicial en domicilio (NUEVA)",1,1],
[0,6,0,"Evaluación inicial en domicilio (NUEVA)",1,1],
[0,1,0,"Evaluación inicial en domicilio (NUEVA)",1,1],
[0,3,0,"Evaluación intermedia en domicilio (NUEVA)",1,1],
[0,8,0,"Evaluación intermedia en domicilio (NUEVA)",1,1],
[0,4,0,"Evaluación intermedia en domicilio (NUEVA)",1,1],
[0,6,0,"Evaluación intermedia en domicilio (NUEVA)",1,1],
[0,3,0,"Sesiones de Rehabilitación en domicilio (NUEVA)",1,1],
[0,8,0,"Sesiones de Rehabilitación en domicilio (NUEVA)",1,1],
[0,4,0,"Sesiones de Rehabilitación en domicilio (NUEVA)",1,1],
[0,6,0,"Sesiones de Rehabilitación en domicilio (NUEVA)",1,1],
[3,2,0,"Atención de Servicio de Urgencia C1 (Obs)",1,1],
[3,2,0,"Atención de Servicio de Urgencia C2 (Obs)",1,1],
[3,2,0,"Atención de Servicio de Urgencia C3 (Obs)",1,1],
[3,2,0,"Atención de Servicio de Urgencia C4 (Obs)",1,1],
[3,2,0,"Atención de Servicio de Urgencia C5 (Obs)",1,1],
[3,2,0,"Triage Gineco Obstétrico C1-C5",1,1],
[1,2,0,"Categorización CUDYR",1,1],
[1,1,0,"Categorización CUDYR",1,1],
[1,1,0,"Atención en sala cama básica pediátrica",1,1],
[1,1,0,"Atención en sala cama media pediátrica",1,1],
[1,1,0,"Atención en sala cama UCI pediátrica",1,1],
[1,1,0,"Atención en sala cama UTI pediátrica",1,1],
[1,1,0,"Atención en sala cama básica Neo",1,1],
[1,1,0,"Atención en sala cama UTI Neo",1,1],
[1,1,0,"Atención en sala cama UCI Neo",1,1],
[1,1,0,"Atención en sala cama UTI Adulto",1,1],
[1,1,0,"Atención en sala cama UCI Adulto",1,1],
[1,1,0,"Atención en sala cama media Adulto",1,1],
[1,1,0,"Atención en sala cama básica Adulto",1,1],
[1,1,0,"Atención en sala cama Psiquiátrica",1,1],
[0,1,0,"Atención domiciliaria",1,1],
[0,4,0,"Atención domiciliaria",1,1],
[0,2,0,"Atención domiciliaria",1,1],
[0,5,0,"Atención domiciliaria",1,1],
[0,6,0,"Atención domiciliaria",1,1],
[0,8,0,"Atención domiciliaria",1,1],
[0,3,0,"Atención domiciliaria",1,1],
[0,6,0,"Acreditación por ingreso a PRAIS",1,1],
[0,6,0,"Consulta de ingreso a equipo PRAIS",1,1],
[0,6,0,"Consulta Nueva PRAIS",1,1],
[0,6,0,"Consulta Control PRAIS",1,1],
[0,6,0,"Psicoterapia Individual PRAIS",1,1],
[0,6,0,"Acompañamiento Psicosocial PRAIS",1,1],
[0,6,0,"Atención Domiciliaria Integral PRAIS",1,1],
[0,6,0,"Psicoterapia Familiar PRAIS",1,1],
[0,6,0,"Psicoterapia Grupal PRAIS",1,1],
[0,6,0,"Intervención Psicosocial Grupal PRAIS",1,1],
[0,6,0,"Acompañamiento a familias en proceso de restitución de restos óseos identificados a sus familiares",1,1],
[0,6,0,"Acompañamiento en terreno en sitios de interés",1,1],
[0,6,0,"Atención domiciliaria para búsqueda activa de familiares",1,1],
[3,1,0,"Atención de Servicio de Urgencia C1 (Obs)",1,1],
[3,1,0,"Atención de Servicio de Urgencia C2 (Obs)",1,1],
[3,1,0,"Atención de Servicio de Urgencia C3 (Obs)",1,1],
[3,1,0,"Atención de Servicio de Urgencia C5 (Obs)",1,1],
[3,1,0,"Atención de Servicio de Urgencia C4 (Obs)",1,1],
[1,2,0,"Atención en sala cama básica pediátrica",1,1],
[1,2,0,"Atención en sala cama media pediátrica",1,1],
[1,2,0,"Atención en sala cama UCI pediátrica",1,1],
[1,2,0,"Atención en sala cama UTI pediátrica",1,1],
[1,2,0,"Atención en sala cama básica Neo",1,1],
[1,2,0,"Atención en sala cama UTI Neo",1,1],
[1,2,0,"Atención en sala cama UCI Neo",1,1],
[1,2,0,"Atención en sala cama UTI Adulto",1,1],
[1,2,0,"Atención en sala cama UCI Adulto",1,1],
[1,2,0,"Atención en sala cama media Adulto",1,1],
[1,2,0,"Atención en sala cama básica Adulto",1,1],
[1,2,0,"Atención en sala cama Psiquiátrica",1,1],
[0,1,0,"Capacitación avance tecnológico",1,1],
[0,4,0,"Capacitación avance tecnológico",1,1],
[0,3,0,"Capacitación avance tecnológico",1,1],
[0,2,0,"Capacitación avance tecnológico",1,1],
[0,5,0,"Capacitación avance tecnológico",1,1],
[0,6,0,"Capacitación avance tecnológico",1,1],
[0,7,0,"Capacitación avance tecnológico",1,1],
[0,8,0,"Capacitación avance tecnológico",1,1],
[1,1,0,"Capacitación avance tecnológico",1,1],
[1,3,0,"Capacitación avance tecnológico",1,1],
[1,2,0,"Capacitación avance tecnológico",1,1],
[2,1,0,"Capacitación avance tecnológico",1,1],
[2,2,0,"Capacitación avance tecnológico",1,1],
[3,1,0,"Capacitación avance tecnológico",1,1],
[3,3,0,"Capacitación avance tecnológico",1,1],
[3,2,0,"Capacitación avance tecnológico",1,1],
[1,5,0,"Capacitación avance tecnológico",1,1],
[1,4,0,"Capacitación avance tecnológico",1,1],
[1,8,0,"Capacitación avance tecnológico",1,1],
[1,6,0,"Capacitación avance tecnológico",1,1]
];

let CATALOGO_ACTIVIDADES = CATALOGO_RAW.map(([p, pr, e, act, clin, rend]) => ({
  proceso: PROCESOS_CAT[p],
  profesion: PROFESIONES_CAT[pr],
  especialidad: ESPECIALIDADES_CAT[e],
  actividad: act,
  clinica: !!clin,
  tieneRendimiento: !!rend,
}));

// El listado original trae "Egresos cama X" y "Atención en sala cama X" desglosados por tipo de cama
// (pediátrica, Neo, UCI, UTI, Adulto, Psiquiátrica), pero en la práctica nadie programa a ese nivel de detalle.
// Se quitan los egresos por completo y se deja "Atención en sala" como una sola prestación genérica,
// más "Interconsulta" (que tampoco existía de forma simple), para cada especialidad médica real.
CATALOGO_ACTIVIDADES = CATALOGO_ACTIVIDADES.filter(
  (a) => !a.actividad.startsWith('Egresos cama') && !a.actividad.startsWith('Atención en sala cama')
);
ESPECIALIDADES_CAT.filter((e) => e !== 'No Aplica').forEach((especialidad) => {
  CATALOGO_ACTIVIDADES.push(
    { proceso: 'Hospitalizado', profesion: 'Médico(a) Cirujano(a)', especialidad, actividad: 'Atención en sala', clinica: true, tieneRendimiento: true },
    { proceso: 'Hospitalizado', profesion: 'Médico(a) Cirujano(a)', especialidad, actividad: 'Interconsulta', clinica: true, tieneRendimiento: true }
  );
});

const ESPECIALIDAD_POR_SERVICIO = {
  'Cardiología': 'CARDIOLOGÍA ADULTO',
  'Oftalmología': 'OFTALMOLOGÍA',
  'Traumatología': 'TRAUMATOLOGÍA Y ORTOPEDIA ADULTO',
  'Medicina Interna': 'MEDICINA INTERNA',
  'Otorrinolaringología': 'OTORRINOLARINGOLOGÍA',
  'Ginecología': 'GINECOLOGÍA ADULTO',
};

// Rendimientos oficiales por hora (RPE N°21 - Orientaciones para la Planificación y Programación en Red, MINSAL 2026)
// para consulta nueva, consulta control y teleconsulta/teleinterconsulta sincrónica presencial, por especialidad médica.
// También el % de horas médicas que la orientación sugiere destinar a atención ambulatoria. Es la referencia NACIONAL.
const RENDIMIENTO_MINSAL_MEDICO = {
  'CARDIOLOGÍA ADULTO': { consultaNueva: 3, consultaControl: 4, telesincronica: 3, pctAmbulatorio: 60 },
  'OFTALMOLOGÍA': { consultaNueva: 3, consultaControl: 4, telesincronica: 4, pctAmbulatorio: 60 },
  'TRAUMATOLOGÍA Y ORTOPEDIA ADULTO': { consultaNueva: 4, consultaControl: 4, telesincronica: 4, pctAmbulatorio: 50 },
  'MEDICINA INTERNA': { consultaNueva: 3.5, consultaControl: 4, telesincronica: 4, pctAmbulatorio: 70 },
  'OTORRINOLARINGOLOGÍA': { consultaNueva: 3, consultaControl: 4, telesincronica: 4, pctAmbulatorio: 50 },
  'GINECOLOGÍA ADULTO': { consultaNueva: 3, consultaControl: 4, telesincronica: 3, pctAmbulatorio: 50 },
};

// Rendimientos LOCALES vigentes para Servicio de Salud Coquimbo (Ord. N°0214, 03-feb-2025), que ajustan el estándar
// nacional a la realidad local — este es el que rige para el Hospital San Juan de Dios de La Serena. Incluye el tiempo
// por paciente sugerido (minutos). Según el propio oficio, rige igual para atención presencial y remota (teleconsulta).
const RENDIMIENTO_LOCAL_COQUIMBO = {
  'CARDIOLOGÍA ADULTO': { consultaNueva: 3, consultaControl: 3, duracionNueva: 20, duracionControl: 20 },
  'OFTALMOLOGÍA': { consultaNueva: 4, consultaControl: 4, duracionNueva: 15, duracionControl: 15 },
  'TRAUMATOLOGÍA Y ORTOPEDIA ADULTO': { consultaNueva: 3, consultaControl: 4, duracionNueva: 20, duracionControl: 15 },
  'MEDICINA INTERNA': { consultaNueva: 3, consultaControl: 3, duracionNueva: 20, duracionControl: 20 },
  'OTORRINOLARINGOLOGÍA': { consultaNueva: 3, consultaControl: 4, duracionNueva: 20, duracionControl: 15 },
  'GINECOLOGÍA ADULTO': { consultaNueva: 3, consultaControl: 4, duracionNueva: 20, duracionControl: 15 },
};

// Determina el rendimiento sugerido para una actividad médica: prioriza el estándar LOCAL de Coquimbo (Ord. N°0214)
// por sobre el nacional MINSAL, ya que es el vigente y de implementación obligatoria para este hospital.
// Si no corresponde a una prestación con rendimiento oficial (consulta nueva, control o teleconsulta), devuelve null.
function rendimientoSugeridoMinsal(tipoProfesional, especialidad, actividad) {
  if (tipoProfesional !== 'Médico(a) Cirujano(a)') return null;
  const local = RENDIMIENTO_LOCAL_COQUIMBO[especialidad];
  const nacional = RENDIMIENTO_MINSAL_MEDICO[especialidad];
  if (actividad === 'Consulta Nueva de especialidad Presencial') {
    return local ? local.consultaNueva : (nacional ? nacional.consultaNueva : null);
  }
  if (actividad === 'Consulta Control de especialidad Presencial') {
    return local ? local.consultaControl : (nacional ? nacional.consultaControl : null);
  }
  if (actividad === 'Telemedicina Control (Teleinterconsulta sincrónica)') {
    // El Ord. N°0214 indica que el mismo rendimiento aplica a atención presencial y remota (punto 1.5)
    return local ? local.consultaControl : (nacional ? nacional.telesincronica : null);
  }
  return null;
}

const COLOR_PROCESO = { Ambulatorio: '#3B6FA0', Hospitalizado: '#0F6E56', Quirúrgico: '#7A5CC7', Urgencia: '#B6522F' };

// Actividades disponibles para un profesional (según su profesión) dentro de la especialidad del servicio,
// más las actividades transversales ("No Aplica") de esa misma profesión.
function actividadesPara(tipoProfesional, especialidad) {
  return CATALOGO_ACTIVIDADES.filter(
    (a) => a.profesion === tipoProfesional && (a.especialidad === especialidad || a.especialidad === 'No Aplica')
  );
}

const TIPOS_PROFESIONAL = PROFESIONES_CAT;

// Jefe de Servicio asociado a la cuenta con la que se inicia sesión (simulado aquí vía el selector de servicio)
const JEFES_POR_SERVICIO = {
  'Cardiología': 'Dr. Rojas',
  'Oftalmología': 'Dra. Molina',
  'Traumatología': 'Dr. Peña',
  'Medicina Interna': 'Dra. Vidal',
  'Otorrinolaringología': 'Dr. Campos',
  'Ginecología': 'Dra. Herrera',
};

// Personas reales del Comité de Programación, Oferta y Demanda (Resolución RES/2226-2026, HSJD La Serena)
const PERSONA_POR_ROL = {
  referente_programacion: 'Ing. Gabriela Zapata Pinto',
  subdirector: 'Dr. Roger Bitrán Parada',
  admision: 'MT. Alejandra Ríos Espinoza',
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Bloques de media hora entre las 08:00 y las 20:00
function generarBloques(horaInicio, horaFin, pasoMin) {
  const out = [];
  const fmt = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  for (let t = horaInicio * 60; t < horaFin * 60; t += pasoMin) {
    out.push(`${fmt(t)}–${fmt(t + pasoMin)}`);
  }
  return out;
}
const BLOQUES = generarBloques(8, 20, 30);

// Capacidad de infraestructura disponible por bloque (horas-box). Ajustar según boxes/pabellones reales del hospital.
function capacidadPorBloque(dia, bloque) {
  const horaInicio = parseInt(bloque.slice(0, 2), 10);
  if (dia === 'Sábado') return horaInicio < 13 ? 3 : 0;
  if (horaInicio === 13) return 1; // colación, capacidad reducida
  return 5;
}
const INFRAESTRUCTURA_CAPACIDAD = {};
DIAS.forEach((dia) => {
  INFRAESTRUCTURA_CAPACIDAD[dia] = {};
  BLOQUES.forEach((b) => { INFRAESTRUCTURA_CAPACIDAD[dia][b] = capacidadPorBloque(dia, b); });
});

const ROLES = {
  jefe_servicio: { label: 'Jefe de Servicio', color: '#4C7C74' },
  referente_programacion: { label: 'Referente de Programación', color: '#B8862E' },
  admision: { label: 'Admisión', color: '#3B6FA0' },
  subdirector: { label: 'Subdirector Atención Ambulatoria', color: '#7A5CC7' },
};

const ESTADOS = {
  borrador: { label: 'Borrador', color: '#8A97A0', bg: '#F1F3F4' },
  enviada: { label: 'Enviada', color: '#3B6FA0', bg: '#EAF1F8' },
  escalada: { label: 'Escalada a Subdirección', color: '#7A5CC7', bg: '#F1EDFB' },
  rechazada: { label: 'Rechazada', color: '#B6522F', bg: '#FBEEE8' },
  aprobada: { label: 'Aprobada', color: '#4C7C74', bg: '#EBF5F2' },
  subida_alma: { label: 'Subida a ALMA', color: '#1E2E33', bg: '#EAECED' },
};

const COLUMN_ORDER = ['borrador', 'enviada', 'escalada', 'rechazada', 'aprobada', 'subida_alma'];

const DOCS_NORMATIVOS = [
  {
    titulo: 'PAC EAR 2025 — Plan de Acción Correctivo',
    resumen: 'Establece los compromisos institucionales tras la evaluación EAR 2025 (59,82% de cumplimiento BSC). Define que toda agenda ambulatoria debe quedar registrada y trazable desde su envío por el Jefe de Servicio hasta su carga en ALMA, con responsable y fecha en cada etapa.',
  },
  {
    titulo: 'Procedimiento de aprobación de agendas — Referente de Programación',
    resumen: 'El Referente de Programación revisa la coherencia de horas programadas en los cuatro procesos del catálogo institucional (Ambulatorio, Hospitalizado, Quirúrgico y Urgencia), según las prestaciones reales habilitadas para cada profesión y especialidad. Si el requerimiento excede sus atribuciones, debe escalar a Subdirección de Atención Ambulatoria o Cerrada según corresponda.',
  },
  {
    titulo: 'Estándar de indicadores de agenda ambulatoria',
    resumen: 'El %CNE (Consultas No Efectuadas) se reporta directamente desde el sistema de agendamiento; no debería superar el 8% como referencia de buen funcionamiento, y un valor mayor al 15% debe quedar destacado para seguimiento de DDI. El rendimiento se calcula como atenciones realizadas dividido por el total de horas programadas en la agenda, sumando los cuatro procesos.',
  },
  {
    titulo: 'RPE N°21 (MINSAL 2026) — Criterios Técnicos para la Programación de la Atención Ambulatoria de Especialidades',
    resumen: 'Orientación oficial del Ministerio de Salud con dos referencias: (1) % de horas médicas sugerido para atención ambulatoria por especialidad — Cardiología 60%, Oftalmología 60%, Traumatología y Ortopedia 50%, Medicina Interna 70%, Otorrinolaringología 50%, Ginecología 50% — y (2) rendimientos oficiales por hora para consulta médica presencial: Cardiología (nueva 3, control 4), Oftalmología (nueva 3, control 4), Traumatología (nueva 4, control 4), Medicina Interna (nueva 3 a 4, control 4), Otorrinolaringología (nueva 3, control 4), Ginecología (nueva 3, control 4); teleconsulta/teleinterconsulta sincrónica entre 3 y 4 según especialidad. Para profesionales no médicos también fija rendimientos: Enfermería (consulta nueva 2, control 3, consulta abreviada 8), Kinesiología (visita a sala 3, evaluación inicial 1,3), Nutrición (control 2, consulta nueva 45 minutos), entre otros. La definición de rendimientos puede ajustarse a la realidad local, pero esa decisión debe ser validada por el Comité de Programación del establecimiento y por el Servicio de Salud respectivo.',
  },
  {
    titulo: 'Ord. N°0214 (03-feb-2025) — Rendimientos locales de consulta nueva y control, Servicio de Salud Coquimbo',
    resumen: 'Oficio del Director del Servicio de Salud Coquimbo a los hospitales de mediana y alta complejidad de la red (incluye Hospital San Juan de Dios de La Serena), que fija los rendimientos MÍNIMOS locales para consulta nueva y consulta control, ajustados a la realidad de la red de Coquimbo, con implementación total exigida en las agendas médicas. Este estándar LOCAL prevalece por sobre la referencia nacional del RPE N°21 para este hospital, y fue definido de común acuerdo con los establecimientos. Valores para las especialidades de este servicio: Cardiología Adulto (nueva 3 y control 3, 20 min cada una), Oftalmología (nueva 4 y control 4, 15 min cada una), Traumatología y Ortopedia Adulto (nueva 3 y control 4, 20 y 15 min), Medicina Interna (nueva 3 y control 3, 20 min cada una — con rendimiento diferenciado para pacientes NANEAS), Otorrinolaringología (nueva 3 y control 4, 20 y 15 min), Ginecología Adulto (nueva 3 y control 4, 20 y 15 min). Los rendimientos aplican igual para atención presencial y remota (teleconsulta), y serán evaluados anualmente según el comportamiento de la demanda. Si una especialidad ya rinde por sobre el mínimo, se le solicita mantener su rendimiento actual — no bajarlo a este piso.',
  },
  {
    titulo: 'Resolución RES/2226-2026 — Comité de Programación, Oferta y Demanda, Hospital San Juan de Dios de La Serena',
    resumen: 'Actualiza la constitución del Comité de Programación del hospital. El Director (Ing. Luis Marín Campusano) es responsable de la programación definitiva. El Subdirector de Gestión Clínica de Atención Ambulatoria (Dr. Roger Bitrán Parada) y el Subdirector de Gestión Clínica de Atención Cerrada (Dr. Sergio Puebla Molina) son responsables de la gestión y ajustes de programación de sus áreas. La Referente Institucional del Proceso de Programación (Ing. Gabriela Zapata Pinto) es responsable técnico y operativo de la programación médica y no médica de la institución. El proceso institucional sigue el flujo: Comité de Programación (determina demanda, oferta y brechas) → Referente de Programación (recibe orientaciones, coordina con equipos, elabora y envía la planilla de programación al Servicio de Salud Coquimbo) → Jefes de Servicio (envían y ejecutan su propuesta de programación) → Admisión/Gestión de Camas (operativiza la programación) → Subdirectores (implementan y hacen seguimiento de estrategias). El comité debe reunirse periódicamente, dar seguimiento a indicadores de gestión, listas de espera y cumplimiento de la programación anual.',
  },
];

let idCounter = 100;

function nowStr() {
  return new Date().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/* ---------------------------------------------------------
   Helpers para la estructura anidada de horas
--------------------------------------------------------- */

function horasVacias() {
  const h = {};
  PROCESOS_CAT.forEach((p) => (h[p] = 0));
  return h;
}

function totalHorasAgenda(horas) {
  return Object.values(horas).reduce((a, b) => a + b, 0);
}

function distribucionVacia() {
  const d = {};
  DIAS.forEach((dia) => {
    d[dia] = {};
    BLOQUES.forEach((b) => (d[dia][b] = 0));
  });
  return d;
}

// Patrón horario típico (más carga a media mañana y media tarde, baja en colación) para poblar datos de ejemplo
function patronBloque(bloque) {
  const h = parseInt(bloque.slice(0, 2), 10);
  if (h === 13) return 0.2;
  if (h >= 9 && h < 12) return 1;
  if (h >= 15 && h < 17) return 1;
  return 0.6;
}
function generarDistribucionEjemplo(escala) {
  const d = distribucionVacia();
  DIAS.forEach((dia) => {
    BLOQUES.forEach((b) => {
      let base = patronBloque(b) * escala;
      if (dia === 'Sábado') base = parseInt(b.slice(0, 2), 10) < 13 ? base * 0.4 : 0;
      d[dia][b] = Math.round(base * 10) / 10;
    });
  });
  return d;
}

// Escala continua de color para el mapa de calor: teal (bajo uso) -> ámbar -> rojo (sobre capacidad)
function heatColor(pct) {
  const clamped = Math.max(0, Math.min(pct, 130));
  const hue = 165 - (clamped / 130) * 165;
  const lightness = 88 - (clamped / 130) * 48;
  return { bg: `hsl(${hue}, 62%, ${lightness}%)`, text: lightness < 62 ? '#FFFFFF' : '#1E2E33' };
}

// Escala simple (casi blanco -> teal sólido) para mostrar la ocupación semanal de un solo profesional
function heatColorOcupacion(horasEnBloque) {
  const pct = Math.max(0, Math.min(1, horasEnBloque / 0.5));
  const lightness = 92 - pct * 50;
  return { bg: `hsl(165, 45%, ${lightness}%)` };
}

// Agrupa las horas por actividad real (dinámico: depende de lo que cada profesional tenga cargado)
function horasPorActividad(bloques) {
  const map = {};
  bloques.forEach((b) => {
    const key = b.actividad;
    map[key] = (map[key] || 0) + b.duracionMin / 60;
  });
  return Object.entries(map)
    .map(([actividad, horas]) => ({ actividad, horas: Math.round(horas * 10) / 10 }))
    .sort((a, b) => b.horas - a.horas);
}

const HORA_INICIO_DIA = 8;

function hhmmDesdeMin(mins) {
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

let bloqueIdCounter = 1000;
function nuevoBloqueId() { bloqueIdCounter += 1; return `bl${bloqueIdCounter}`; }
let profesionalIdCounter = 100;
function nuevoProfesionalId() { profesionalIdCounter += 1; return `prof${profesionalIdCounter}`; }
function M(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }

// Calcula día/hora/actividad por defecto para una fila nueva insertada entre "anterior" y "siguiente" (cualquiera puede ser null).
// Si no hay referencia, deja la prestación sin definir para que el profesional la elija explícitamente.
function calcularInsercion(anterior, siguiente) {
  const ref = anterior || siguiente;
  const duracion = ref ? ref.duracionMin : 30;
  let dia, inicioMin;
  if (anterior) {
    dia = anterior.dia;
    inicioMin = anterior.inicioMin + anterior.duracionMin;
  } else if (siguiente) {
    dia = siguiente.dia;
    inicioMin = Math.max(HORA_INICIO_DIA * 60, siguiente.inicioMin - duracion);
  } else {
    dia = 'Lunes';
    inicioMin = M('08:00');
  }
  return {
    dia, inicioMin, duracionMin: duracion,
    proceso: ref ? ref.proceso : null,
    actividad: ref ? ref.actividad : null,
    clinica: ref ? ref.clinica : true,
    tieneRendimiento: ref ? ref.tieneRendimiento : true,
    rendimiento: ref ? ref.rendimiento : 2,
  };
}

// Clona profesionales y bloques de una agenda base (última versión) generando ids nuevos, sin perder la referencia entre ambos
function clonarProfesionalesYBloques(base) {
  const mapaIds = {};
  const profesionales = base.profesionales.map((p) => {
    const nuevoId = nuevoProfesionalId();
    mapaIds[p.id] = nuevoId;
    return { id: nuevoId, nombre: p.nombre, tipo: p.tipo };
  });
  const bloques = base.bloquesProf.map((b) => ({ ...b, id: nuevoBloqueId(), profesionalId: mapaIds[b.profesionalId] }));
  return { profesionales, bloques };
}

// Deriva horas por proceso desde los bloques reales de cada profesional (duración variable)
function horasDesdeBloquesProf(bloques) {
  const h = horasVacias();
  bloques.forEach((b) => {
    if (!b.proceso) return;
    h[b.proceso] = (h[b.proceso] || 0) + b.duracionMin / 60;
  });
  return h;
}

// Distribuye cada bloque (duración variable) proporcionalmente entre los tramos de 30 min del mapa de calor
function distribucionDesdeBloquesProf(bloques) {
  const d = distribucionVacia();
  bloques.forEach((b) => {
    const inicio = b.inicioMin;
    const fin = b.inicioMin + b.duracionMin;
    BLOQUES.forEach((label, idx) => {
      const cellStart = HORA_INICIO_DIA * 60 + idx * 30;
      const cellEnd = cellStart + 30;
      const overlap = Math.min(fin, cellEnd) - Math.max(inicio, cellStart);
      if (overlap > 0) d[b.dia][label] += overlap / 60;
    });
  });
  return d;
}

function makeAgenda(servicio, jefe, horas, mes, cnePct, atenciones, distribucionHoraria, profesionales, bloquesProf, pendienteConfirmar, vigenciaDesde, vigenciaHasta) {
  idCounter += 1;
  return {
    id: idCounter,
    servicio,
    jefe,
    mes,
    vigenciaDesde: vigenciaDesde || null,
    vigenciaHasta: vigenciaHasta || null,
    version: 1,
    estado: 'borrador',
    horas,
    cnePct: cnePct ?? 8,
    atenciones: atenciones ?? 0,
    distribucionHoraria: distribucionHoraria || distribucionVacia(),
    profesionales: profesionales || [],
    bloquesProf: bloquesProf || [],
    pendienteConfirmar: !!pendienteConfirmar,
    createdAt: nowStr(),
    lastUpdated: Date.now(),
    historial: [{ fecha: nowStr(), accion: 'Creada', usuario: jefe, comentario: 'Agenda creada en borrador.' }],
    resumenIA: null,
    motivoRechazo: null,
  };
}

// Última versión conocida de Cardiología: 3 médicos con bloques de duración real y prestaciones reales del catálogo
const CARDIO_PROFESIONALES = [
  { id: 'p1', nombre: 'Dr. Rojas', tipo: 'Médico(a) Cirujano(a)' },
  { id: 'p2', nombre: 'Dra. Fuentes', tipo: 'Médico(a) Cirujano(a)' },
  { id: 'p3', nombre: 'Dr. Soto', tipo: 'Médico(a) Cirujano(a)' },
];

function bloqueCardio(profesionalId, dia, horaInicio, duracionMin, proceso, actividad) {
  const item = CATALOGO_ACTIVIDADES.find((a) => a.proceso === proceso && a.actividad === actividad && a.especialidad === 'CARDIOLOGÍA ADULTO');
  const sugerido = rendimientoSugeridoMinsal('Médico(a) Cirujano(a)', 'CARDIOLOGÍA ADULTO', actividad);
  return {
    id: nuevoBloqueId(), profesionalId, dia, inicioMin: M(horaInicio), duracionMin,
    proceso, actividad,
    clinica: item ? item.clinica : true,
    tieneRendimiento: item ? item.tieneRendimiento : true,
    rendimiento: item && item.tieneRendimiento ? (sugerido ?? 2) : 0,
  };
}

const CARDIO_BLOQUES = [
  bloqueCardio('p1', 'Lunes', '08:00', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p1', 'Lunes', '08:30', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p1', 'Lunes', '09:00', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p1', 'Lunes', '09:20', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p1', 'Lunes', '09:40', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p1', 'Lunes', '10:00', 45, 'Ambulatorio', 'Ecocardiograma con/sin Doppler'),
  bloqueCardio('p1', 'Miércoles', '08:00', 180, 'Quirúrgico', 'Pabellon Cirugía Mayor'),
  bloqueCardio('p1', 'Viernes', '09:00', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p1', 'Viernes', '09:30', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p1', 'Viernes', '09:50', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p2', 'Martes', '08:00', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p2', 'Martes', '08:30', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p2', 'Martes', '09:00', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p2', 'Martes', '10:00', 20, 'Ambulatorio', 'Telemedicina Control (Teleinterconsulta sincrónica)'),
  bloqueCardio('p2', 'Jueves', '08:00', 60, 'Quirúrgico', 'Pabellon Cirugía Menor'),
  bloqueCardio('p2', 'Jueves', '09:00', 60, 'Quirúrgico', 'Pabellon Cirugía Menor'),
  bloqueCardio('p2', 'Jueves', '10:30', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p2', 'Jueves', '10:50', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p2', 'Sábado', '08:00', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p2', 'Sábado', '08:30', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p3', 'Lunes', '08:00', 15, 'Hospitalizado', 'Atención en sala'),
  bloqueCardio('p3', 'Lunes', '08:15', 15, 'Hospitalizado', 'Atención en sala'),
  bloqueCardio('p3', 'Lunes', '08:30', 15, 'Hospitalizado', 'Atención en sala'),
  bloqueCardio('p3', 'Lunes', '09:00', 20, 'Hospitalizado', 'Interconsulta'),
  bloqueCardio('p3', 'Miércoles', '08:00', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p3', 'Miércoles', '08:30', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p3', 'Miércoles', '09:00', 45, 'Ambulatorio', 'Ecocardiograma con/sin Doppler'),
  bloqueCardio('p3', 'Viernes', '08:00', 120, 'Quirúrgico', 'Pabellon Cirugía Mayor Ambulatoria'),
];

const SEED_AGENDAS = [
  makeAgenda(
    'Cardiología', 'Dr. Rojas',
    horasDesdeBloquesProf(CARDIO_BLOQUES),
    'Septiembre 2026', 9.5, 180,
    distribucionDesdeBloquesProf(CARDIO_BLOQUES),
    CARDIO_PROFESIONALES, CARDIO_BLOQUES
  ),
  makeAgenda(
    'Oftalmología', 'Dra. Molina',
    { Ambulatorio: 85, Hospitalizado: 8, Quirúrgico: 20, Urgencia: 5 },
    'Septiembre 2026', 17.2, 210,
    generarDistribucionEjemplo(3.4)
  ),
  makeAgenda(
    'Traumatología', 'Dr. Peña',
    { Ambulatorio: 73, Hospitalizado: 18, Quirúrgico: 18, Urgencia: 8 },
    'Septiembre 2026', 7.1, 150,
    generarDistribucionEjemplo(2.1)
  ),
];
SEED_AGENDAS[1].estado = 'enviada';
SEED_AGENDAS[1].historial.push({ fecha: nowStr(), accion: 'Enviada a Referente', usuario: 'Dra. Molina', comentario: 'Lista para revisión.' });

/* ---------------------------------------------------------
   Llamadas a la API de Claude (resumen IA y chat)
--------------------------------------------------------- */

async function callClaude(messages, system) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return 'La integración IA no está configurada. Define VITE_ANTHROPIC_API_KEY para habilitarla.';
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system,
        messages,
      }),
    });
    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    return text || 'No se obtuvo respuesta.';
  } catch (e) {
    return 'Ocurrió un error al conectar con el servicio de IA. Intenta nuevamente.';
  }
}

function buildResumenPrompt(agenda) {
  const porProceso = PROCESOS_CAT.map((p) => `${p}: ${(agenda.horas[p] || 0).toFixed(1)} hrs`).join(', ');
  const actividadesTop = horasPorActividad(agenda.bloquesProf).slice(0, 6).map((t) => `${t.actividad}: ${t.horas} hrs`).join(', ');
  const total = totalHorasAgenda(agenda.horas);
  const rendimiento = total > 0 ? (agenda.atenciones / total).toFixed(2) : '0.00';

  let picoDia = null, picoBloque = null, picoHoras = -1;
  DIAS.forEach((dia) => {
    BLOQUES.forEach((b) => {
      const v = agenda.distribucionHoraria[dia][b];
      if (v > picoHoras) { picoHoras = v; picoDia = dia; picoBloque = b; }
    });
  });

  return `Eres un asistente para un Departamento de Desarrollo Institucional de un hospital chileno. Genera un resumen ESTANDARIZADO y breve (máximo 7 líneas, en español, sin markdown) de la siguiente agenda ambulatoria, para que un Jefe de Servicio y un Referente de Programación lo lean en segundos. Incluye: distribución de horas por proceso (Ambulatorio, Hospitalizado, Quirúrgico, Urgencia), un comentario sobre las prestaciones más relevantes, el %CNE y si está sobre el umbral de 8% (referencial) o de alerta 15%, el rendimiento (atenciones por hora total), el día/bloque de mayor concentración horaria, y una observación breve sobre el balance de la agenda.

Servicio: ${agenda.servicio}
Mes: ${agenda.mes}
Horas por proceso: ${porProceso}
Prestaciones con más horas cargadas: ${actividadesTop || 'sin datos'}
Total horas: ${total.toFixed(1)}
%CNE reportado: ${agenda.cnePct}%
Atenciones realizadas: ${agenda.atenciones}
Rendimiento (atenciones/hora): ${rendimiento}
Bloque de mayor concentración horaria: ${picoDia} ${picoBloque} (${picoHoras} hrs)`;
}

/* ---------------------------------------------------------
   Componentes de UI
--------------------------------------------------------- */

function PromptDialog({ titulo, placeholder, valorInicial, onConfirmar, onCancelar }) {
  const [valor, setValor] = useState(valorInicial || '');
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[80] p-4" style={{ background: 'rgba(30,46,51,0.5)' }} onClick={onCancelar}>
      <div className="bg-white rounded-xl w-full max-w-xs p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-semibold text-slate-800 mb-3">{titulo}</div>
        <input
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valor.trim()) onConfirmar(valor.trim());
            if (e.key === 'Escape') onCancelar();
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none"
        />
        <button
          onClick={() => { if (valor.trim()) onConfirmar(valor.trim()); }}
          style={{ background: '#4C7C74' }}
          className="w-full text-white text-sm font-medium py-2 rounded-lg mt-3"
        >
          Confirmar
        </button>
        <button onClick={onCancelar} className="w-full text-slate-500 text-sm py-2 rounded-lg mt-1.5">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ConfirmDialog({ mensaje, onConfirmar, onCancelar, destructivo }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[80] p-4" style={{ background: 'rgba(30,46,51,0.5)' }} onClick={onCancelar}>
      <div className="bg-white rounded-xl w-full max-w-xs p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm text-slate-700 mb-4">{mensaje}</div>
        <button
          onClick={onConfirmar}
          style={{ background: destructivo ? '#B6522F' : '#4C7C74' }}
          className="w-full text-white text-sm font-medium py-2 rounded-lg"
        >
          Confirmar
        </button>
        <button onClick={onCancelar} className="w-full text-slate-500 text-sm py-2 rounded-lg mt-1.5">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, loading, error }) {
  const [email, setEmail] = useState('admin@hospital.local');
  const [password, setPassword] = useState('demo123');

  const demoRoles = [
    { id: 'jefe_servicio', label: 'Jefe de Servicio' },
    { id: 'referente_programacion', label: 'Referente de Programación' },
    { id: 'admision', label: 'Admisión' },
    { id: 'subdirector', label: 'Subdirector Atención Ambulatoria' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F2ED] flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid md:grid-cols-[1.1fr_0.9fr] overflow-hidden rounded-3xl border border-slate-200 shadow-2xl bg-white">
        <div className="bg-[#1E2E33] p-8 md:p-10 text-white">
          <div className="text-xs tracking-[0.24em] uppercase text-[#9FB0B5]">HSJD La Serena</div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">Seguimiento y Programación de Agendas Institucionales</h1>
          <p className="mt-4 text-sm text-[#CBD5D9] max-w-md">
            Frontend conectado a API real con autenticación, catálogo institucional y persistencia en base de datos.
          </p>
          <div className="mt-8 space-y-2">
            {demoRoles.map((item) => (
              <button
                key={item.id}
                onClick={() => onLogin({ mode: 'demo', role: item.id })}
                disabled={loading}
                className="block w-full rounded-xl border border-[#3E545B] bg-[#2A3E44] px-4 py-3 text-left text-sm hover:bg-[#31474E] disabled:opacity-50"
              >
                Entrar como {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-8 md:p-10">
          <div className="text-sm font-semibold text-slate-800">Acceso con credenciales</div>
          <div className="text-xs text-slate-500 mt-1">Puedes usar las cuentas demo seeded en la base local.</div>
          <div className="mt-5 space-y-3">
            <label className="block text-xs font-medium text-slate-600">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            {error && <div className="rounded-xl bg-[#FBEEE8] px-3 py-2 text-xs text-[#B6522F]">{error}</div>}
            <button
              onClick={() => onLogin({ mode: 'credentials', email, password })}
              disabled={loading}
              style={{ background: '#4C7C74' }}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfesionalDialog({ titulo, nombreInicial, tipoInicial, onConfirmar, onCancelar }) {
  const [nombre, setNombre] = useState(nombreInicial || '');
  const [tipo, setTipo] = useState(tipoInicial || TIPOS_PROFESIONAL[0]);
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[80] p-4" style={{ background: 'rgba(30,46,51,0.5)' }} onClick={onCancelar}>
      <div className="bg-white rounded-xl w-full max-w-xs p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-semibold text-slate-800 mb-3">{titulo}</div>
        <label className="text-xs text-slate-600 font-medium block mb-2.5">
          Nombre
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Dr./Dra. ..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none"
          />
        </label>
        <label className="text-xs text-slate-600 font-medium block">
          Tipo de profesional
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm bg-white">
            {TIPOS_PROFESIONAL.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <button
          onClick={() => { if (nombre.trim()) onConfirmar(nombre.trim(), tipo); }}
          style={{ background: '#4C7C74' }}
          className="w-full text-white text-sm font-medium py-2 rounded-lg mt-3"
        >
          Confirmar
        </button>
        <button onClick={onCancelar} className="w-full text-slate-500 text-sm py-2 rounded-lg mt-1.5">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Badge({ estado }) {
  const cfg = ESTADOS[estado];
  return (
    <span
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + '55' }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function AgendaCard({ agenda, onOpen }) {
  const total = totalHorasAgenda(agenda.horas);
  const ultimoEvento = agenda.historial[agenda.historial.length - 1];
  return (
    <button
      onClick={() => onOpen(agenda)}
      className="w-full text-left bg-white rounded-xl border border-slate-200 p-3.5 hover:border-slate-400 hover:shadow-sm transition-all relative"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-[15px] text-slate-800 leading-tight">{agenda.servicio}</div>
          <div className="text-xs text-slate-500 mt-0.5">{agenda.jefe} · {agenda.mes}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[11px] font-mono text-slate-400">#{agenda.id}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${agenda.version > 1 ? 'bg-[#F1EDFB] text-[#7A5CC7]' : 'bg-slate-100 text-slate-400'}`}>
            v{agenda.version}
          </span>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
        <span>{total} hrs totales</span>
        <span className="text-slate-400">Act. {ultimoEvento.fecha}</span>
      </div>
    </button>
  );
}

function TablaAgendaProfesional({ profesional, especialidad, servicio, bloques, soloLectura, onAgregarFila, onEditarFila, onEliminarFila, onLimpiar, onEliminarProfesional }) {
  const totalHrs = bloques.reduce((s, b) => s + b.duracionMin / 60, 0);
  const totalCupos = bloques.reduce((s, b) => s + (b.rendimiento || 0) * (b.duracionMin / 60), 0);
  const filas = bloques.slice().sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || a.inicioMin - b.inicioMin);
  const [opciones, setOpciones] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const wrapperRef = useRef(null);
  const bodyRef = useRef(null);
  const [insertPos, setInsertPos] = useState(null); // { idx, y }

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setCatalogLoading(true);
      try {
        const response = await fetchCatalogActivities({
          profession: profesional.tipo,
          serviceName: servicio,
          specialty: especialidad,
        });
        if (!cancelled) {
          setOpciones(
            response.items.map((item) => ({
              proceso: item.process,
              actividad: item.activity,
              clinica: item.isClinical,
              tieneRendimiento: item.hasPerformance,
            }))
          );
        }
      } catch (_error) {
        if (!cancelled) {
          setOpciones(actividadesPara(profesional.tipo, especialidad));
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [profesional.tipo, especialidad, servicio]);

  function handleMouseMove(e) {
    if (soloLectura) return;
    const wrapper = wrapperRef.current;
    const body = bodyRef.current;
    if (!wrapper || !body) return;
    const filasEl = Array.from(body.querySelectorAll('tr[data-fila]'));
    const contRect = wrapper.getBoundingClientRect();
    if (filasEl.length === 0) {
      setInsertPos({ idx: 0, y: body.getBoundingClientRect().top - contRect.top });
      return;
    }
    let idx = filasEl.length;
    let y = filasEl[filasEl.length - 1].getBoundingClientRect().bottom - contRect.top;
    for (let i = 0; i < filasEl.length; i++) {
      const r = filasEl[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        idx = i;
        y = r.top - contRect.top;
        break;
      }
    }
    setInsertPos({ idx, y });
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-800">{profesional.nombre} <span className="text-xs font-normal text-slate-400">· {profesional.tipo || 'Sin tipo'}</span></div>
          <div className="text-[11px] text-slate-500">
            {soloLectura ? 'Programación de solo lectura.' : 'Esta es la última programación cargada para este profesional. Edita cualquier celda directamente, como en una planilla.'}
          </div>
        </div>
        {!soloLectura && (
          <div className="flex gap-3 shrink-0">
            <button onClick={onLimpiar} className="text-xs text-slate-500 hover:text-slate-700 underline">
              Comenzar en blanco
            </button>
            <button onClick={onEliminarProfesional} className="text-xs text-[#B6522F] hover:underline">
              Eliminar profesional
            </button>
          </div>
        )}
      </div>

      {!soloLectura && (
        <div className="text-[11px] text-slate-400 mb-1.5">
          Mueve el mouse sobre la tabla para insertar una fila en esa posición · usa el círculo rojo de cada fila para eliminarla · la lista de prestaciones es la real para {profesional.tipo}.
          {catalogLoading ? ' Cargando catálogo...' : ''}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div ref={wrapperRef} className="relative" onMouseMove={handleMouseMove} onMouseLeave={() => setInsertPos(null)}>
          <table className="w-full text-xs min-w-[680px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-2.5 py-2 font-medium">Día</th>
                <th className="text-left px-2.5 py-2 font-medium">Hora inicio</th>
                <th className="text-left px-2.5 py-2 font-medium">Hora término</th>
                <th className="text-left px-2.5 py-2 font-medium">Prestación</th>
                <th className="text-right px-2.5 py-2 font-medium">Rendimiento (at/hr)</th>
                <th className="text-right px-2.5 py-2 font-medium">Cupos est.</th>
                {!soloLectura && <th className="w-10 text-center font-medium">Borrar</th>}
              </tr>
            </thead>
            <tbody ref={bodyRef}>
              {filas.length === 0 && (
                <tr><td colSpan={soloLectura ? 6 : 7} className="px-2.5 py-6 text-center text-slate-400 italic">
                  {soloLectura ? 'Sin actividades cargadas.' : 'Sin actividades cargadas. Mueve el mouse sobre esta área y haz clic para agregar la primera.'}
                </td></tr>
              )}
              {filas.map((b) => {
                const cupos = b.tieneRendimiento ? Math.round((b.rendimiento || 0) * (b.duracionMin / 60) * 10) / 10 : null;
                if (soloLectura) {
                  return (
                    <tr key={b.id} data-fila className="border-t border-slate-100">
                      <td className="px-2.5 py-1.5 text-slate-600">{b.dia}</td>
                      <td className="px-2.5 py-1.5 text-slate-600">{hhmmDesdeMin(b.inicioMin)}</td>
                      <td className="px-2.5 py-1.5 text-slate-600">{hhmmDesdeMin(b.inicioMin + b.duracionMin)}</td>
                      <td className="px-2.5 py-1.5" style={{ color: b.proceso ? COLOR_PROCESO[b.proceso] : '#94a3b8' }}>{b.actividad || '—'}</td>
                      <td className="px-2.5 py-1.5 text-right text-slate-600">{b.tieneRendimiento ? (b.rendimiento ?? 0) : 'N/A'}</td>
                      <td className="px-2.5 py-1.5 text-right text-slate-600 font-medium">{cupos === null ? '—' : cupos}</td>
                    </tr>
                  );
                }
                return (
                  <tr key={b.id} data-fila className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-1 py-1">
                      <select value={b.dia} onChange={(e) => onEditarFila(b.id, { dia: e.target.value })} className="text-xs bg-transparent focus:outline-none focus:bg-white rounded px-1 py-1 w-full">
                        {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="time"
                        value={hhmmDesdeMin(b.inicioMin)}
                        onChange={(e) => onEditarFila(b.id, { inicioMin: M(e.target.value) })}
                        className="text-xs bg-transparent focus:outline-none focus:bg-white rounded px-1 py-1 w-[86px]"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="time"
                        value={hhmmDesdeMin(b.inicioMin + b.duracionMin)}
                        onChange={(e) => onEditarFila(b.id, { duracionMin: Math.max(5, M(e.target.value) - b.inicioMin) })}
                        className="text-xs bg-transparent focus:outline-none focus:bg-white rounded px-1 py-1 w-[86px]"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <select
                        value={b.proceso && b.actividad ? `${b.proceso}|||${b.actividad}` : ''}
                        onChange={async (e) => {
                          if (!e.target.value) return;
                          const [proceso, actividad] = e.target.value.split('|||');
                          const item = opciones.find((o) => o.proceso === proceso && o.actividad === actividad);
                          let sugerido = null;
                          try {
                            const ref = await fetchReferencePerformance({ activity: actividad, serviceName: servicio, specialty: especialidad, process: proceso });
                            sugerido = ref.suggestion;
                          } catch (_error) {
                            sugerido = rendimientoSugeridoMinsal(profesional.tipo, especialidad, actividad);
                          }
                          onEditarFila(b.id, {
                            proceso, actividad,
                            clinica: item ? item.clinica : true,
                            tieneRendimiento: item ? item.tieneRendimiento : true,
                            rendimiento: item && item.tieneRendimiento ? (sugerido ?? (b.tieneRendimiento ? b.rendimiento : 2)) : 0,
                          });
                        }}
                        className="text-xs bg-transparent focus:outline-none focus:bg-white rounded px-1 py-1 w-full"
                        style={{ color: b.proceso ? COLOR_PROCESO[b.proceso] : '#94a3b8' }}
                      >
                        {!b.proceso && <option value="">— Selecciona prestación —</option>}
                        {PROCESOS_CAT.filter((p) => opciones.some((o) => o.proceso === p)).map((proceso) => (
                          <optgroup key={proceso} label={proceso}>
                            {opciones.filter((o) => o.proceso === proceso).map((o) => (
                              <option key={o.actividad} value={`${o.proceso}|||${o.actividad}`}>{o.actividad}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      {b.tieneRendimiento ? (() => {
                        const ref = rendimientoSugeridoMinsal(profesional.tipo, especialidad, b.actividad);
                        return (
                          <input
                            type="number" min={0} step={0.1}
                            value={b.rendimiento ?? 0}
                            onChange={(e) => onEditarFila(b.id, { rendimiento: Number(e.target.value) })}
                            title={ref != null ? `Referencia oficial: ${ref} at/hr (estándar local Servicio de Salud Coquimbo, Ord. N°0214)` : undefined}
                            className="text-xs text-right bg-transparent focus:outline-none focus:bg-white rounded px-1 py-1 w-16"
                            style={ref != null ? { boxShadow: 'inset 0 0 0 1px #C9E0D8' } : undefined}
                          />
                        );
                      })() : (
                        <div className="text-xs text-slate-300 text-right pr-1">N/A</div>
                      )}
                    </td>
                    <td className="px-2.5 py-1 text-right text-slate-600 font-medium">{cupos === null ? '—' : cupos}</td>
                    <td className="text-center">
                      <button
                        onClick={() => onEliminarFila(b.id)}
                        title="Eliminar esta fila"
                        style={{ background: '#FBEEE8', color: '#B6522F' }}
                        className="rounded-full w-6 h-6 inline-flex items-center justify-center"
                      >
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filas.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={5} className="px-2.5 py-2 text-right text-slate-500 font-medium">Totales</td>
                  <td className="px-2.5 py-2 text-right font-semibold text-slate-700">{totalCupos.toFixed(1)}</td>
                  {!soloLectura && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>

          {!soloLectura && insertPos && (
            <>
              <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ top: insertPos.y, borderTop: '2px dashed #4C7C74' }} />
              <button
                onClick={() => onAgregarFila(filas[insertPos.idx - 1] || null, filas[insertPos.idx] || null)}
                style={{ top: Math.max(insertPos.y - 8, 2), background: '#4C7C74' }}
                className="absolute left-2 z-20 flex items-center gap-1 text-[9px] text-white px-2 py-0.5 rounded-full shadow whitespace-nowrap"
              >
                <Plus size={9} /> Insertar fila aquí
              </button>
            </>
          )}
        </div>
      </div>
      <div className="text-[11px] text-slate-400 mt-2">Total horas programadas: {totalHrs.toFixed(1)} hrs</div>
    </div>
  );
}

// Parámetros de proyección de producción anual
const SEMANAS_POR_ANIO = 52;
const AUSENTISMO_PCT = 15;

function ResumenProfesionalPanel({ bloques }) {
  const horas = horasDesdeBloquesProf(bloques);
  const totalHrs = totalHorasAgenda(horas);
  const porProceso = PROCESOS_CAT.map((p) => ({ proceso: p, horas: horas[p] || 0 }));
  const dist = distribucionDesdeBloquesProf(bloques);
  const cuposSemanales = bloques.reduce((s, b) => s + (b.rendimiento || 0) * (b.duracionMin / 60), 0);
  const produccionAnualBruta = cuposSemanales * SEMANAS_POR_ANIO;
  const produccionAnualNeta = produccionAnualBruta * (1 - AUSENTISMO_PCT / 100);

  return (
    <div className="w-72 shrink-0 space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3">
        <div className="text-[11px] text-slate-500">Horas programadas</div>
        <div className="text-xl font-semibold text-slate-800 mt-0.5">{totalHrs.toFixed(1)} hrs</div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Distribución por proceso</div>
        <div className="bg-white rounded-xl border border-slate-200 p-2.5" style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porProceso} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="proceso" tick={{ fontSize: 8 }} interval={0} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="horas" fill="#4C7C74" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Mapa de calor semanal</div>
        <div className="bg-white rounded-xl border border-slate-200 p-2.5 overflow-y-auto" style={{ maxHeight: 260 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `26px repeat(${DIAS.length}, 1fr)`, gap: 1 }}>
            <div />
            {DIAS.map((dia) => (
              <div key={dia} className="text-[7px] text-slate-500 font-medium text-center">{dia.slice(0, 2)}</div>
            ))}
            {BLOQUES.map((b) => (
              <React.Fragment key={b}>
                <div className="text-[6px] text-slate-400 text-right pr-0.5">{b.slice(3, 5) === '00' ? b.slice(0, 2) : ''}</div>
                {DIAS.map((dia) => {
                  const h = dist[dia][b];
                  const color = heatColorOcupacion(h);
                  return <div key={dia} title={`${dia} ${b} — ${h.toFixed(2)} hrs`} style={{ background: color.bg, height: 8, borderRadius: 1 }} />;
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Proyección de producción anual</div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Cupos semanales (rendimiento × hrs)</span>
            <span className="font-medium text-slate-700">{cuposSemanales.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">× {SEMANAS_POR_ANIO} semanas/año</span>
            <span className="font-medium text-slate-700">{produccionAnualBruta.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-xs pt-1.5 border-t border-slate-100">
            <span className="text-slate-500">− {AUSENTISMO_PCT}% ausentismo</span>
            <span className="font-semibold text-slate-800">{produccionAnualNeta.toFixed(0)} at/año</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 mt-1.5">Estimación referencial: cupos semanales × {SEMANAS_POR_ANIO} semanas, descontando un {AUSENTISMO_PCT}% de ausentismo esperado. Ajustable según la realidad de cada servicio.</div>
      </div>
    </div>
  );
}

function EditorProgramacion({ titulo, subtitulo, estado, role, esNueva, especialidad, profesionales, bloques, onDescartar, onGuardarBorrador, onEnviar, onAgregarProfesional, onEliminarProfesional, onRenombrarProfesional, onLimpiarProfesional, onAgregarBloque, onEditarBloque, onEliminarBloque }) {
  const [activoId, setActivoId] = useState(profesionales[0]?.id || null);
  const [dialogo, setDialogo] = useState(null);
  const profesional = profesionales.find((p) => p.id === activoId) || null;
  const soloLectura = !(role === 'jefe_servicio' && estado === 'borrador');

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col">
      <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0 bg-white">
        <div>
          <div className="font-semibold text-slate-800">Programación — {titulo}</div>
          <div className="text-xs text-slate-500">{subtitulo}{soloLectura ? ' · Solo lectura' : ''}</div>
        </div>
        <div className="flex items-center gap-2">
          {esNueva && (
            <button onClick={() => setDialogo({ tipo: 'descartar' })} className="text-xs text-[#B6522F] hover:underline mr-1">
              Descartar
            </button>
          )}
          {!soloLectura && (
            <button onClick={onEnviar} style={{ background: '#4C7C74' }} className="flex items-center gap-1.5 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
              <Send size={13} /> Enviar a Referente
            </button>
          )}
          {soloLectura ? (
            <button onClick={onGuardarBorrador} className="text-xs text-slate-600 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
              Cerrar
            </button>
          ) : (
            <button onClick={onGuardarBorrador} className="text-xs text-slate-600 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
              Guardar borrador
            </button>
          )}
          <button onClick={onGuardarBorrador} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden bg-white">
        <div className="w-48 shrink-0 border-r border-slate-200 bg-white overflow-y-auto py-2">
          <div className="px-3 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Profesionales</div>
          {profesionales.map((p) => (
            <div key={p.id} className={`group flex items-center border-l-2 transition-colors ${p.id === activoId ? 'bg-[#EBF5F2] border-[#4C7C74]' : 'border-transparent hover:bg-slate-50'}`}>
              <button
                onClick={() => setActivoId(p.id)}
                className={`flex-1 text-left px-3 py-2 truncate ${p.id === activoId ? 'text-slate-800' : 'text-slate-500'}`}
              >
                <div className={`text-xs truncate ${p.id === activoId ? 'font-semibold' : ''}`}>{p.nombre}</div>
                <div className="text-[10px] text-slate-400">{p.tipo || 'Sin tipo'}</div>
              </button>
              {!soloLectura && (
                <button
                  onClick={() => setDialogo({ tipo: 'editar', profesionalId: p.id, nombreInicial: p.nombre, tipoInicial: p.tipo })}
                  className="pr-2 text-slate-400 hover:text-[#4C7C74]"
                  title="Editar"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          ))}
          {!soloLectura && (
            <button
              onClick={() => setDialogo({ tipo: 'agregar' })}
              className="w-full text-left px-3 py-2.5 text-xs text-[#4C7C74] font-medium flex items-center gap-1.5 hover:bg-slate-50 mt-1 border-t border-slate-100"
            >
              <Plus size={13} /> Nuevo profesional
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-white">
          {!profesional ? (
            <div className="text-sm text-slate-400 italic text-center py-10">Sin profesionales cargados en esta agenda.</div>
          ) : (
            <div className="flex gap-5 items-start">
              <div className="flex-1 min-w-0">
                <TablaAgendaProfesional
                  profesional={profesional}
                  especialidad={especialidad}
                  servicio={titulo}
                  soloLectura={soloLectura}
                  bloques={bloques.filter((b) => b.profesionalId === profesional.id)}
                  onAgregarFila={(anterior, siguiente) => onAgregarBloque(profesional.id, anterior, siguiente)}
                  onEditarFila={(id, cambios) => onEditarBloque(id, cambios)}
                  onEliminarFila={(id) => onEliminarBloque(id)}
                  onLimpiar={() => setDialogo({ tipo: 'limpiar', profesionalId: profesional.id, nombre: profesional.nombre })}
                  onEliminarProfesional={() => setDialogo({ tipo: 'eliminarProfesional', profesionalId: profesional.id, nombre: profesional.nombre })}
                />
              </div>
              <ResumenProfesionalPanel bloques={bloques.filter((b) => b.profesionalId === profesional.id)} />
            </div>
          )}
        </div>
      </div>

      {dialogo?.tipo === 'agregar' && (
        <ProfesionalDialog
          titulo="Nuevo profesional"
          onCancelar={() => setDialogo(null)}
          onConfirmar={async (nombre, tipoProf) => {
            const nuevoId = await onAgregarProfesional(nombre, tipoProf);
            setActivoId(nuevoId);
            setDialogo(null);
          }}
        />
      )}
      {dialogo?.tipo === 'editar' && (
        <ProfesionalDialog
          titulo="Editar profesional"
          nombreInicial={dialogo.nombreInicial}
          tipoInicial={dialogo.tipoInicial}
          onCancelar={() => setDialogo(null)}
          onConfirmar={async (nombre, tipoProf) => {
            await onRenombrarProfesional(dialogo.profesionalId, nombre, tipoProf);
            setDialogo(null);
          }}
        />
      )}
      {dialogo?.tipo === 'limpiar' && (
        <ConfirmDialog
          mensaje={`¿Vaciar la programación de ${dialogo.nombre} y comenzar en blanco?`}
          destructivo
          onCancelar={() => setDialogo(null)}
          onConfirmar={async () => {
            await onLimpiarProfesional(dialogo.profesionalId);
            setDialogo(null);
          }}
        />
      )}
      {dialogo?.tipo === 'eliminarProfesional' && (
        <ConfirmDialog
          mensaje={`¿Eliminar a ${dialogo.nombre} de esta agenda?`}
          destructivo
          onCancelar={() => setDialogo(null)}
          onConfirmar={async () => {
            await onEliminarProfesional(dialogo.profesionalId);
            setActivoId((profesionales.find((p) => p.id !== dialogo.profesionalId) || {}).id || null);
            setDialogo(null);
          }}
        />
      )}
      {dialogo?.tipo === 'descartar' && (
        <ConfirmDialog
          mensaje="¿Descartar esta agenda? No quedará guardada ni aparecerá en el tablero."
          destructivo
          onCancelar={() => setDialogo(null)}
          onConfirmar={onDescartar}
        />
      )}
    </div>
  );
}

function AgendaDetail({ agenda, role, onClose, onAction, onGenerarResumen, resumenLoading, onAbrirEditor }) {
  const chartProceso = PROCESOS_CAT.map((p) => ({ proceso: p, horas: agenda.horas[p] || 0 }));
  const chartTrazadoras = horasPorActividad(agenda.bloquesProf).slice(0, 10);
  const total = totalHorasAgenda(agenda.horas);
  const rendimiento = total > 0 ? (agenda.atenciones / total).toFixed(2) : '0.00';
  const puedeEditar = agenda.estado === 'borrador' && role === 'jefe_servicio';
  const cuposSemanalesAgenda = agenda.bloquesProf.reduce((s, b) => s + (b.rendimiento || 0) * (b.duracionMin / 60), 0);
  const produccionAnual = Math.round(cuposSemanalesAgenda * SEMANAS_POR_ANIO * (1 - AUSENTISMO_PCT / 100));

  return (
    <div className="fixed inset-0 flex items-stretch justify-end z-50" style={{ background: 'rgba(30,46,51,0.45)' }} onClick={onClose}>
      <div
        className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-800">{agenda.servicio}</div>
            <div className="text-xs text-slate-500 font-mono">#{agenda.id} · v{agenda.version} · {agenda.mes}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <Badge estado={agenda.estado} />

          {agenda.motivoRechazo && (
            <div className="text-xs bg-[#FBEEE8] border border-[#B6522F]/30 text-[#B6522F] rounded-lg p-3">
              <span className="font-semibold">Motivo de rechazo: </span>{agenda.motivoRechazo}
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Horas por proceso</div>
            <div className="bg-white rounded-xl border border-slate-200 p-3" style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartProceso} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="proceso" tick={{ fontSize: 8 }} interval={0} angle={-10} textAnchor="end" height={36} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="horas" fill="#4C7C74" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-slate-500 mt-2">Total: <b className="text-slate-700">{total.toFixed(1)} hrs</b></div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Horas por prestación (top 10)</div>
            <div className="bg-white rounded-xl border border-slate-200 p-3" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartTrazadoras} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="actividad" tick={{ fontSize: 9 }} width={130} />
                  <Tooltip />
                  <Bar dataKey="horas" fill="#7A5CC7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Indicadores</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="text-[11px] text-slate-500">%CNE</div>
                {puedeEditar ? (
                  <input
                    type="number" min={0} max={100} step={0.1}
                    value={agenda.cnePct}
                    onChange={(e) => onAction('editar_cne', agenda, { valor: Number(e.target.value) })}
                    className={`text-lg font-semibold mt-0.5 w-full bg-transparent focus:outline-none ${agenda.cnePct > 15 ? 'text-[#B6522F]' : 'text-slate-800'}`}
                  />
                ) : (
                  <div className={`text-lg font-semibold mt-0.5 ${agenda.cnePct > 15 ? 'text-[#B6522F]' : 'text-slate-800'}`}>{agenda.cnePct}%</div>
                )}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="text-[11px] text-slate-500">Rendimiento</div>
                <div className="text-lg font-semibold mt-0.5 text-slate-800">{rendimiento} <span className="text-[11px] font-normal text-slate-400">at/hr</span></div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 col-span-2">
                <div className="text-[11px] text-slate-500">Proyección de producción anual</div>
                <div className="text-lg font-semibold mt-0.5 text-slate-800">{produccionAnual.toLocaleString('es-CL')} <span className="text-[11px] font-normal text-slate-400">atenciones/año</span></div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">Rendimiento = atenciones realizadas ({agenda.atenciones}) / horas totales programadas ({total.toFixed(1)}). Proyección anual = cupos semanales × {SEMANAS_POR_ANIO} semanas, descontando {AUSENTISMO_PCT}% de ausentismo.</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resumen estandarizado (IA)</div>
              {!agenda.resumenIA && (
                <button
                  onClick={() => onGenerarResumen(agenda)}
                  disabled={resumenLoading}
                  className="text-xs flex items-center gap-1 text-[#4C7C74] font-medium hover:underline disabled:opacity-50"
                >
                  {resumenLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generar
                </button>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-sm text-slate-700 min-h-[60px]">
              {agenda.resumenIA || <span className="text-slate-400 italic text-xs">Aún no generado.</span>}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Historial de versiones</div>
            <div className="space-y-2">
              {agenda.historial.slice().reverse().map((h, i) => (
                <div key={i} className="flex gap-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                  <div>
                    <div className="text-slate-700"><b>{h.accion}</b> — {h.usuario}</div>
                    <div className="text-slate-400">{h.fecha}{h.comentario ? ` · ${h.comentario}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Programación (reemplaza el Excel)</div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                {agenda.profesionales.length} profesional{agenda.profesionales.length === 1 ? '' : 'es'} · {agenda.bloquesProf.length} actividades cargadas
              </div>
              <button onClick={onAbrirEditor} className="text-xs font-medium text-[#4C7C74] hover:underline">
                {puedeEditar ? 'Abrir editor' : 'Ver programación'}
              </button>
            </div>
          </div>
          {puedeEditar && (
            <label className="text-xs text-slate-600 font-medium block">
              Atenciones realizadas
              <input
                type="number" min={0}
                value={agenda.atenciones}
                onChange={(e) => onAction('editar_atenciones', agenda, { valor: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4C7C74]/40"
              />
            </label>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3.5 flex flex-wrap gap-2">
          {role === 'jefe_servicio' && agenda.estado === 'borrador' && (
            <button onClick={() => onAction('enviar', agenda)} style={{ background: '#4C7C74' }} className="flex items-center gap-1.5 text-white text-sm font-medium px-3.5 py-2 rounded-lg">
              <Send size={14} /> Enviar a Referente
            </button>
          )}
          {role === 'jefe_servicio' && agenda.estado === 'rechazada' && (
            <button onClick={() => onAction('reenviar', agenda)} style={{ background: '#4C7C74' }} className="flex items-center gap-1.5 text-white text-sm font-medium px-3.5 py-2 rounded-lg">
              <Send size={14} /> Editar y reenviar
            </button>
          )}
          {role === 'referente_programacion' && agenda.estado === 'enviada' && (
            <>
              <button onClick={() => onAction('aprobar', agenda)} style={{ background: '#4C7C74' }} className="flex items-center gap-1.5 text-white text-sm font-medium px-3 py-2 rounded-lg">
                <CheckCircle2 size={14} /> Aprobar
              </button>
              <button onClick={() => onAction('rechazar', agenda)} style={{ borderColor: '#B6522F', color: '#B6522F' }} className="flex items-center gap-1.5 bg-white border text-sm font-medium px-3 py-2 rounded-lg">
                <XCircle size={14} /> Rechazar
              </button>
              <button onClick={() => onAction('escalar', agenda)} style={{ borderColor: '#7A5CC7', color: '#7A5CC7' }} className="flex items-center gap-1.5 bg-white border text-sm font-medium px-3 py-2 rounded-lg">
                <ArrowUpCircle size={14} /> Escalar a Subdirección
              </button>
            </>
          )}
          {role === 'subdirector' && agenda.estado === 'escalada' && (
            <>
              <button onClick={() => onAction('aprobar', agenda)} style={{ background: '#4C7C74' }} className="flex items-center gap-1.5 text-white text-sm font-medium px-3 py-2 rounded-lg">
                <CheckCircle2 size={14} /> Aprobar
              </button>
              <button onClick={() => onAction('rechazar', agenda)} style={{ borderColor: '#B6522F', color: '#B6522F' }} className="flex items-center gap-1.5 bg-white border text-sm font-medium px-3 py-2 rounded-lg">
                <XCircle size={14} /> Rechazar
              </button>
            </>
          )}
          {role === 'admision' && agenda.estado === 'aprobada' && (
            <button onClick={() => onAction('subir_alma', agenda)} style={{ background: '#1E2E33' }} className="flex items-center gap-1.5 text-white text-sm font-medium px-3.5 py-2 rounded-lg">
              <UploadCloud size={14} /> Marcar subida a ALMA
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatoFechaCorta(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function NuevaAgendaModal({ servicio, jefeNombre, agendaBase, onClose, onCreate }) {
  const [vigenciaDesde, setVigenciaDesde] = useState('');
  const [vigenciaHasta, setVigenciaHasta] = useState('');
  const [usarBase, setUsarBase] = useState(!!agendaBase);
  const clonBaseRef = useRef(agendaBase ? clonarProfesionalesYBloques(agendaBase) : null);

  function toggleUsarBase(checked) {
    setUsarBase(checked);
  }

  function handleCrear() {
    const profesionales = usarBase && clonBaseRef.current ? clonBaseRef.current.profesionales : [];
    const bloques = usarBase && clonBaseRef.current ? clonBaseRef.current.bloques : [];
    const vigenciaLabel = vigenciaDesde && vigenciaHasta
      ? `${formatoFechaCorta(vigenciaDesde)} – ${formatoFechaCorta(vigenciaHasta)}`
      : (vigenciaDesde ? `Desde ${formatoFechaCorta(vigenciaDesde)}` : 'Vigencia sin definir');
    onCreate(servicio, jefeNombre, horasDesdeBloquesProf(bloques), vigenciaLabel, null, null, distribucionDesdeBloquesProf(bloques), profesionales, bloques, vigenciaDesde, vigenciaHasta);
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(30,46,51,0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="font-semibold text-slate-800">Nueva agenda</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="space-y-3 px-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="text-xs text-slate-600 font-medium block">
              Servicio
              <div className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-sm text-slate-500">{servicio}</div>
            </div>
            <div className="text-xs text-slate-600 font-medium block">
              Jefe de Servicio
              <div className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-sm text-slate-500">{jefeNombre} <span className="text-[10px] text-slate-400">(tu sesión)</span></div>
            </div>
          </div>
          <div className="text-xs text-slate-600 font-medium block">Vigencia de la agenda</div>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="text-xs text-slate-500 block">
              Desde
              <input type="date" value={vigenciaDesde} onChange={(e) => setVigenciaDesde(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7C74]/40" />
            </label>
            <label className="text-xs text-slate-500 block">
              Hasta
              <input type="date" value={vigenciaHasta} onChange={(e) => setVigenciaHasta(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7C74]/40" />
            </label>
          </div>

          {agendaBase ? (
            <label className="flex items-start gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-2.5 cursor-pointer">
              <input type="checkbox" checked={usarBase} onChange={(e) => toggleUsarBase(e.target.checked)} className="mt-0.5" />
              <span>
                Comenzar desde la última versión ({agendaBase.mes}, v{agendaBase.version}) — {agendaBase.profesionales.length} profesional{agendaBase.profesionales.length === 1 ? '' : 'es'} y {agendaBase.bloquesProf.length} actividades ya cargadas, listas para ajustar.
              </span>
            </label>
          ) : (
            <div className="text-[11px] text-slate-400 italic">No hay una versión anterior de este servicio; la programación partirá en blanco.</div>
          )}

          <div className="text-[11px] text-slate-400 pb-1">El %CNE y las atenciones se completan más adelante, dentro del editor de programación. Al crear la agenda se abrirá directamente para ingresar o ajustar la agenda de cada especialista.</div>
        </div>
        <div className="px-5 py-4 shrink-0 border-t border-slate-100">
          <button
            disabled={!vigenciaDesde}
            onClick={handleCrear}
            style={{ background: '#4C7C74' }}
            className="w-full text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-40"
          >
            Crear agenda
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatIA() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hola, puedo responder consultas sobre el proceso de programación de agendas usando los documentos normativos cargados. ¿Qué necesitas saber?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    const context = DOCS_NORMATIVOS.map((d) => `- ${d.titulo}: ${d.resumen}`).join('\n');
    const system = `Eres un asistente institucional para el Departamento de Desarrollo Institucional (DDI) de un hospital chileno. Responde SOLO en base a los siguientes documentos normativos del proceso de programación de agendas. Sé breve, claro y en español. Si la pregunta no se puede responder con estos documentos, dilo honestamente.\n\nDocumentos:\n${context}`;

    const reply = await callClaude([{ role: 'user', content: userMsg }], system);
    setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'bg-[#4C7C74] text-white ml-auto' : 'bg-white border border-slate-200 text-slate-700'}`}>
            {m.text}
          </div>
        ))}
        {loading && <div className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Pensando…</div>}
        <div ref={endRef} />
      </div>
      <div className="p-3 border-t border-slate-200 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ej: ¿cuándo debo escalar una agenda a Subdirección?"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7C74]/40"
        />
        <button onClick={send} className="bg-[#4C7C74] text-white px-3.5 rounded-lg hover:opacity-90"><Send size={16} /></button>
      </div>
    </div>
  );
}

function DocsTab() {
  return (
    <div className="p-5 space-y-3 overflow-y-auto h-full">
      {DOCS_NORMATIVOS.map((d, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-2.5">
            <FileText size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-sm text-slate-800">{d.titulo}</div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">{d.resumen}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResumenDashboardTab({ agendas }) {
  const [filtroServicio, setFiltroServicio] = useState('todos');
  const [filtroMes, setFiltroMes] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const servicios = useMemo(() => Array.from(new Set(agendas.map((a) => a.servicio))).sort(), [agendas]);
  const meses = useMemo(() => Array.from(new Set(agendas.map((a) => a.mes))).sort(), [agendas]);

  const filtradas = useMemo(
    () =>
      agendas.filter(
        (a) =>
          (filtroServicio === 'todos' || a.servicio === filtroServicio) &&
          (filtroMes === 'todos' || a.mes === filtroMes) &&
          (filtroEstado === 'todos' || a.estado === filtroEstado)
      ),
    [agendas, filtroServicio, filtroMes, filtroEstado]
  );

  const totalHoras = filtradas.reduce((sum, a) => sum + totalHorasAgenda(a.horas), 0);
  const totalAtenciones = filtradas.reduce((sum, a) => sum + (a.atenciones || 0), 0);
  const rendimientoProm = totalHoras ? (totalAtenciones / totalHoras).toFixed(2) : '0.00';
  const cnePctGlobal = useMemo(() => {
    const pesoTotal = filtradas.reduce((sum, a) => sum + totalHorasAgenda(a.horas), 0);
    if (!pesoTotal) return '0.0';
    const ponderado = filtradas.reduce((sum, a) => sum + a.cnePct * totalHorasAgenda(a.horas), 0);
    return (ponderado / pesoTotal).toFixed(1);
  }, [filtradas]);

  const porServicio = useMemo(() => {
    const map = {};
    filtradas.forEach((a) => {
      map[a.servicio] = (map[a.servicio] || 0) + totalHorasAgenda(a.horas);
    });
    return Object.entries(map).map(([servicio, horas]) => ({ servicio, horas }));
  }, [filtradas]);

  const porProceso = useMemo(() => {
    return PROCESOS_CAT.map((p) => ({
      proceso: p,
      horas: filtradas.reduce((sum, a) => sum + (a.horas[p] || 0), 0),
    }));
  }, [filtradas]);

  const porTrazadora = useMemo(() => {
    const todosBloques = filtradas.flatMap((a) => a.bloquesProf);
    return horasPorActividad(todosBloques).slice(0, 12);
  }, [filtradas]);

  const distribucionAgregada = useMemo(() => {
    const acc = distribucionVacia();
    filtradas.forEach((a) => {
      DIAS.forEach((dia) => {
        BLOQUES.forEach((b) => {
          acc[dia][b] += a.distribucionHoraria[dia][b] || 0;
        });
      });
    });
    return acc;
  }, [filtradas]);

  return (
    <div className="p-5 h-full overflow-y-auto space-y-5">
      <div className="flex flex-wrap gap-2">
        <select value={filtroServicio} onChange={(e) => setFiltroServicio(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white">
          <option value="todos">Todos los servicios</option>
          {servicios.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white">
          <option value="todos">Todos los meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white">
          <option value="todos">Todos los estados</option>
          {COLUMN_ORDER.map((e2) => (
            <option key={e2} value={e2}>{ESTADOS[e2].label}</option>
          ))}
        </select>
        {(filtroServicio !== 'todos' || filtroMes !== 'todos' || filtroEstado !== 'todos') && (
          <button
            onClick={() => { setFiltroServicio('todos'); setFiltroMes('todos'); setFiltroEstado('todos'); }}
            className="text-xs text-slate-400 hover:text-slate-600 underline px-1"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Agendas</div>
          <div className="text-2xl font-semibold text-slate-800 mt-1">{filtradas.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Horas programadas</div>
          <div className="text-2xl font-semibold text-slate-800 mt-1">{totalHoras.toFixed(1)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">%CNE global</div>
          <div className="text-2xl font-semibold mt-1" style={{ color: cnePctGlobal > 15 ? '#B6522F' : '#1E2E33' }}>{cnePctGlobal}%</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Rendimiento prom.</div>
          <div className="text-2xl font-semibold text-slate-800 mt-1">{rendimientoProm} <span className="text-xs font-normal text-slate-400">at/hr</span></div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Horas por servicio</div>
        <div className="bg-white rounded-xl border border-slate-200 p-3" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porServicio} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="servicio" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="horas" fill="#3B6FA0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Horas por proceso</div>
        <div className="bg-white rounded-xl border border-slate-200 p-3" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porProceso} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="proceso" tick={{ fontSize: 9 }} interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="horas" fill="#4C7C74" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Horas por prestación (top 12)</div>
        <div className="bg-white rounded-xl border border-slate-200 p-3" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porTrazadora} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey="actividad" tick={{ fontSize: 9 }} width={130} />
              <Tooltip />
              <Bar dataKey="horas" fill="#7A5CC7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Distribución horaria vs. infraestructura disponible</div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 overflow-x-auto">
          <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${BLOQUES.length}, 22px)`, gap: 3, width: 'max-content' }}>
            <div />
            {BLOQUES.map((b) => (
              <div key={b} className="text-[8px] text-slate-400 text-center">{b.slice(3, 5) === '00' ? b.slice(0, 2) : ''}</div>
            ))}
            {DIAS.map((dia) => (
              <React.Fragment key={dia}>
                <div className="text-[11px] text-slate-600 font-medium flex items-center">{dia.slice(0, 3)}</div>
                {BLOQUES.map((b) => {
                  const horasProgramadas = distribucionAgregada[dia][b];
                  const capacidad = INFRAESTRUCTURA_CAPACIDAD[dia][b];
                  const pct = capacidad > 0 ? (horasProgramadas / capacidad) * 100 : (horasProgramadas > 0 ? 999 : 0);
                  const color = heatColor(pct);
                  return (
                    <div
                      key={b}
                      title={`${dia} ${b} — ${horasProgramadas.toFixed(1)} / ${capacidad} hrs (${capacidad > 0 ? pct.toFixed(0) + '%' : 'sin capacidad'})`}
                      style={{ background: color.bg, height: 20, borderRadius: 3 }}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 px-1 max-w-xs">
            <span className="text-[10px] text-slate-400">0%</span>
            <div className="flex-1 h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, hsl(165,62%,88%), hsl(82,62%,64%), hsl(41,62%,52%), hsl(0,62%,40%))' }} />
            <span className="text-[10px] text-slate-400">≥130%</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5">Color = % de uso respecto a la capacidad de infraestructura (boxes/pabellones) disponible por día y bloque de 30 min. Pasa el mouse sobre una celda para ver el detalle. La capacidad es una referencia ajustable, no un dato real de infraestructura.</div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Detalle</div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Servicio</th>
                <th className="text-left px-3 py-2 font-medium">Mes</th>
                <th className="text-left px-3 py-2 font-medium">Estado</th>
                <th className="text-right px-3 py-2 font-medium">Horas</th>
                <th className="text-right px-3 py-2 font-medium">%CNE</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{a.servicio}</td>
                  <td className="px-3 py-2 text-slate-500">{a.mes}</td>
                  <td className="px-3 py-2"><Badge estado={a.estado} /></td>
                  <td className="px-3 py-2 text-right text-slate-700 font-medium">{totalHorasAgenda(a.horas)}</td>
                  <td className="px-3 py-2 text-right text-slate-700 font-medium">{a.cnePct}%</td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400 italic">Sin agendas para este filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   App principal
--------------------------------------------------------- */

function HistorialAgendasTab({ agendas, onAbrir }) {
  const [filtroServicio, setFiltroServicio] = useState('todos');
  const servicios = useMemo(() => Array.from(new Set(agendas.map((a) => a.servicio))).sort(), [agendas]);

  const filtradas = useMemo(() => {
    return agendas
      .filter((a) => filtroServicio === 'todos' || a.servicio === filtroServicio)
      .slice()
      .sort((a, b) => {
        if (a.vigenciaDesde && b.vigenciaDesde) return a.vigenciaDesde.localeCompare(b.vigenciaDesde);
        return a.id - b.id;
      });
  }, [agendas, filtroServicio]);

  return (
    <div className="p-5 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="text-sm font-semibold text-slate-700">Historial de agendas</div>
        <select value={filtroServicio} onChange={(e) => setFiltroServicio(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white">
          <option value="todos">Todos los servicios</option>
          {servicios.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="text-[11px] text-slate-400 mb-4">En orden cronológico según su vigencia — así se ve cómo fue cambiando la planificación mes a mes, no los cambios internos de una sola agenda.</div>

      {filtradas.length === 0 && (
        <div className="text-sm text-slate-400 italic text-center py-10 border border-dashed border-slate-300 rounded-xl">Aún no hay agendas confirmadas para mostrar.</div>
      )}

      <div>
        {filtradas.map((a, idx) => {
          const totalHrs = totalHorasAgenda(a.horas);
          return (
            <button
              key={a.id}
              onClick={() => onAbrir(a)}
              className="w-full text-left flex gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-slate-50/70"
            >
              <div className="flex flex-col items-center pt-1 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: ESTADOS[a.estado].color }} />
                {idx < filtradas.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-sm font-semibold text-slate-800">{a.servicio} <span className="text-xs font-normal text-slate-400">· v{a.version} · #{a.id}</span></div>
                  <Badge estado={a.estado} />
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{a.mes} · {a.jefe} · {totalHrs.toFixed(1)} hrs · {a.profesionales.length} profesional{a.profesionales.length === 1 ? '' : 'es'}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UsuariosAdminTab({ users, services, onCreateUser }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo123');
  const [role, setRole] = useState('jefe_servicio');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!serviceId && services[0]?.id) {
      setServiceId(services[0].id);
    }
  }, [serviceId, services]);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    setFeedback('');
    try {
      await onCreateUser({
        name,
        email,
        password,
        role,
        serviceId: role === 'jefe_servicio' ? serviceId : null,
      });
      setName('');
      setEmail('');
      setPassword('demo123');
      setFeedback('Usuario creado correctamente.');
    } catch (submitError) {
      setError(submitError.message || 'No fue posible crear el usuario.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full overflow-auto p-4 md:p-5">
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-800">Crear usuario</div>
          <div className="mt-1 text-xs text-slate-500">Sprint 1: alta manual de usuarios base para pruebas.</div>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-slate-600">
              Nombre
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Rol
              <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white">
                <option value="admin">Administrador</option>
                <option value="jefe_servicio">Jefe de Servicio</option>
                <option value="referente_programacion">Referente de Programación</option>
                <option value="admision">Admisión</option>
                <option value="subdirector">Subdirector Atención Ambulatoria</option>
              </select>
            </label>
            {role === 'jefe_servicio' && (
              <label className="block text-xs font-medium text-slate-600">
                Servicio
                <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white">
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </label>
            )}
            {error && <div className="rounded-xl bg-[#FBEEE8] px-3 py-2 text-xs text-[#B6522F]">{error}</div>}
            {feedback && <div className="rounded-xl bg-[#EBF5F2] px-3 py-2 text-xs text-[#2F6C5D]">{feedback}</div>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ background: '#4C7C74' }}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-semibold text-slate-800">Usuarios creados</div>
            <div className="text-xs text-slate-500 mt-1">{users.length} usuarios en la base local.</div>
          </div>
          <div className="divide-y divide-slate-100">
            {users.map((user) => (
              <div key={user.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-slate-600">{ROLES[user.role]?.label || user.role}</div>
                    <div className="text-[11px] text-slate-400">{user.serviceName || 'Sin servicio'}</div>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-400 italic">No hay usuarios cargados.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState('jefe_servicio');
  const [miServicio, setMiServicio] = useState(SERVICIOS[0]);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [services, setServices] = useState(SERVICIOS.map((name) => ({ name, specialtyCatalog: ESPECIALIDAD_POR_SERVICIO[name] || 'No Aplica' })));
  const [agendas, setAgendas] = useState(SEED_AGENDAS);
  const [backendStatus, setBackendStatus] = useState('connecting');
  const [syncLabel, setSyncLabel] = useState('Conectando...');
  const [isHydrated, setIsHydrated] = useState(false);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('tablero');
  const [showNuevo, setShowNuevo] = useState(false);
  const [showEditorFor, setShowEditorFor] = useState(null);
  const [pendingReject, setPendingReject] = useState(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showServicioMenu, setShowServicioMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [resumenLoading, setResumenLoading] = useState(false);
  const [usersCatalog, setUsersCatalog] = useState([]);

  async function hydrateAuthenticatedApp(sessionUser = null) {
    const currentUser = sessionUser || (await fetchMe()).user;
    const [health, bootstrap, storedAgendas, notifications] = await Promise.all([
      fetchHealth(),
      fetchBootstrap(),
      fetchAgendas(),
      fetchNotifications(),
    ]);

    setAuthUser(currentUser);
    setRole(currentUser.role);
    setMiServicio(currentUser.serviceName || bootstrap.services[0]?.name || SERVICIOS[0]);
    setServices(bootstrap.services);
    setUsersCatalog(bootstrap.users || []);
    setAgendas(storedAgendas.length > 0 ? storedAgendas : []);
    setNotifs(notifications.map((item) => ({ text: item.texto, role: item.destinoRol || currentUser.role, fecha: item.fecha })));
    setBackendStatus(health.ok ? 'online' : 'offline');
    setSyncLabel(storedAgendas.length > 0 ? 'Sincronizado con API' : 'API lista para primer guardado');
    setIsHydrated(true);
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        if (cancelled) return;
        await hydrateAuthenticatedApp();
      } catch (_error) {
        if (cancelled) return;
        setBackendStatus('offline');
        setSyncLabel('Inicia sesión para usar la API');
      } finally {
        if (!cancelled) {
          setAuthReady(true);
          setIsHydrated(true);
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || backendStatus !== 'online' || !authUser) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        setSyncLabel('Guardando cambios...');
        await syncAgendas(agendas);
        setSyncLabel(`Guardado ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`);
      } catch (_error) {
        setSyncLabel('Error al guardar en API');
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [agendas, isHydrated, backendStatus]);

  async function handleLogin(payload) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const result = payload.mode === 'demo'
        ? await demoLogin(payload.role)
        : await login(payload.email, payload.password);
      await hydrateAuthenticatedApp(result.user);
    } catch (error) {
      setAuthError('No fue posible iniciar sesión.');
    } finally {
      setAuthLoading(false);
      setAuthReady(true);
    }
  }

  async function handleLogout() {
    await logout();
    setAuthUser(null);
    setAuthReady(true);
    setAgendas([]);
    setNotifs([]);
    setUsersCatalog([]);
    setBackendStatus('offline');
    setSyncLabel('Sesión cerrada');
  }

  if (authReady && !authUser) {
    return <LoginScreen onLogin={handleLogin} loading={authLoading} error={authError} />;
  }

  const agendasVisibles = useMemo(() => {
    const confirmadas = agendas.filter((a) => !a.pendienteConfirmar);
    if (role === 'jefe_servicio') return confirmadas.filter((a) => a.servicio === miServicio);
    return confirmadas; // referente, admisión y subdirección ven todas las agendas confirmadas
  }, [agendas, role, miServicio]);

  const columnas = useMemo(() => {
    const map = {};
    COLUMN_ORDER.forEach((e) => (map[e] = []));
    agendasVisibles.forEach((a) => map[a.estado].push(a));
    COLUMN_ORDER.forEach((e) => map[e].sort((a, b) => b.lastUpdated - a.lastUpdated));
    return map;
  }, [agendasVisibles]);

  function notify(text, targetRole) {
    setNotifs((n) => [{ text, role: targetRole, fecha: nowStr() }, ...n]);
  }

  function updateAgenda(id, updater) {
    setAgendas((prev) => prev.map((a) => (a.id === id ? updater({ ...a }) : a)));
  }

  function replaceAgendaState(nextAgenda) {
    setAgendas((prev) => {
      const exists = prev.some((item) => item.id === nextAgenda.id);
      if (!exists) return [nextAgenda, ...prev];
      return prev.map((item) => (item.id === nextAgenda.id ? nextAgenda : item));
    });
    setSelected((current) => (current?.id === nextAgenda.id ? nextAgenda : current));
    return nextAgenda;
  }

  async function refreshAgendaState(externalId) {
    const refreshed = await fetchAgenda(externalId);
    replaceAgendaState(refreshed);
    return refreshed;
  }

  async function refreshUsersCatalog() {
    if (!authUser || authUser.role !== 'admin') return;
    const users = await fetchUsers();
    setUsersCatalog(users);
  }

  async function handleCreateUser(payload) {
    const created = await createUser(payload);
    await refreshUsersCatalog();
    return created;
  }

  async function refreshNotifications() {
    try {
      const notifications = await fetchNotifications();
      setNotifs(notifications.map((item) => ({ text: item.texto, role: item.destinoRol || role, fecha: item.fecha })));
    } catch (_error) {
      // Preserve local notifications if the API call fails.
    }
  }

  async function handleAction(action, agenda, payload) {
    if (action === 'editar_cne') {
      updateAgenda(agenda.id, (a) => {
        a.cnePct = payload.valor;
        a.lastUpdated = Date.now();
        return a;
      });
      setSelected((s) => (s ? { ...s, cnePct: payload.valor } : s));
      return;
    }
    if (action === 'editar_atenciones') {
      updateAgenda(agenda.id, (a) => {
        a.atenciones = payload.valor;
        a.lastUpdated = Date.now();
        return a;
      });
      setSelected((s) => (s ? { ...s, atenciones: payload.valor } : s));
      return;
    }
    if (action === 'editar_distribucion') {
      updateAgenda(agenda.id, (a) => {
        a.distribucionHoraria = { ...a.distribucionHoraria, [payload.dia]: { ...a.distribucionHoraria[payload.dia], [payload.bloque]: payload.valor } };
        a.lastUpdated = Date.now();
        return a;
      });
      setSelected((s) => (s ? { ...s, distribucionHoraria: { ...s.distribucionHoraria, [payload.dia]: { ...s.distribucionHoraria[payload.dia], [payload.bloque]: payload.valor } } } : s));
      return;
    }
    if (action === 'agregar_profesional') {
      const newId = payload.idPrefijado || nuevoProfesionalId();
      await createProfessional(agenda.id, {
        id: newId,
        nombre: payload.nombre,
        tipo: payload.tipo || TIPOS_PROFESIONAL[0],
      });
      await refreshAgendaState(agenda.id);
      return newId;
    }
    if (action === 'quitar_profesional') {
      await deleteProfessional(agenda.id, payload.profesionalId);
      await refreshAgendaState(agenda.id);
      return;
    }
    if (action === 'confirmar_creacion') {
      const updated = await confirmDraft(agenda.id);
      replaceAgendaState(updated);
      return;
    }
    if (action === 'renombrar_profesional') {
      await updateProfessional(agenda.id, payload.profesionalId, {
        nombre: payload.nombre,
        tipo: payload.tipo,
      });
      await refreshAgendaState(agenda.id);
      return;
    }
    if (action === 'limpiar_bloques_profesional') {
      const blocksToDelete = agenda.bloquesProf.filter((b) => b.profesionalId === payload.profesionalId);
      await Promise.all(blocksToDelete.map((block) => deleteBlock(agenda.id, block.id)));
      await refreshAgendaState(agenda.id);
      return;
    }
    if (action === 'agregar_bloque_prof') {
      await createBlock(agenda.id, {
        id: nuevoBloqueId(),
        profesionalId: payload.profesionalId,
        dia: payload.dia,
        inicioMin: payload.inicioMin,
        duracionMin: payload.duracionMin,
        proceso: payload.proceso ?? null,
        actividad: payload.actividad ?? null,
        clinica: payload.clinica ?? true,
        tieneRendimiento: payload.tieneRendimiento ?? true,
        rendimiento: payload.rendimiento ?? 0,
      });
      await refreshAgendaState(agenda.id);
      return;
    }
    if (action === 'editar_bloque_prof') {
      await updateBlock(agenda.id, payload.bloqueId, payload.cambios);
      await refreshAgendaState(agenda.id);
      return;
    }
    if (action === 'eliminar_bloque_prof') {
      await deleteBlock(agenda.id, payload.bloqueId);
      await refreshAgendaState(agenda.id);
      return;
    }
    if (action === 'enviar' || action === 'reenviar') {
      try {
        const updated = await transitionAgenda(agenda.id, 'enviada');
        replaceAgendaState(updated);
        setSelected(null);
        await refreshNotifications();
      } catch (_error) {
        setSyncLabel('Error al enviar agenda');
      }
      return;
    }
    if (action === 'aprobar') {
      try {
        const updated = await transitionAgenda(agenda.id, 'aprobada');
        replaceAgendaState(updated);
        setSelected(null);
        await refreshNotifications();
      } catch (_error) {
        setSyncLabel('Error al aprobar agenda');
      }
      return;
    }
    if (action === 'rechazar') {
      setPendingReject(agenda);
      return;
    }
    if (action === 'escalar') {
      try {
        const updated = await transitionAgenda(agenda.id, 'escalada');
        replaceAgendaState(updated);
        setSelected(null);
        await refreshNotifications();
      } catch (_error) {
        setSyncLabel('Error al escalar agenda');
      }
      return;
    }
    if (action === 'subir_alma') {
      try {
        const updated = await transitionAgenda(agenda.id, 'subida_alma');
        replaceAgendaState(updated);
        setSelected(null);
        await refreshNotifications();
      } catch (_error) {
        setSyncLabel('Error al marcar subida a ALMA');
      }
      return;
    }
  }

  async function ejecutarRechazo(agenda, motivo) {
    try {
      const updated = await transitionAgenda(agenda.id, 'rechazada', motivo);
      replaceAgendaState(updated);
      setSelected(null);
      await refreshNotifications();
    } catch (_error) {
      setSyncLabel('Error al rechazar agenda');
    }
  }

  async function generarResumen(agenda) {
    setResumenLoading(true);
    const prompt = buildResumenPrompt(agenda);
    const texto = await callClaude([{ role: 'user', content: prompt }], 'Responde siempre en español, en texto plano, sin markdown.');
    updateAgenda(agenda.id, (a) => {
      a.resumenIA = texto;
      return a;
    });
    setSelected((s) => (s ? { ...s, resumenIA: texto } : s));
    setResumenLoading(false);
  }

  const selectedFresh = selected ? agendas.find((a) => a.id === selected.id) : null;
  const notifsForRole = notifs.filter((n) => n.role === role);
  const agendaBaseParaNuevo = agendas.filter((a) => a.servicio === miServicio && !a.pendienteConfirmar).sort((a, b) => b.lastUpdated - a.lastUpdated)[0] || null;
  const agendaEnEditor = showEditorFor ? agendas.find((a) => a.id === showEditorFor) : null;

  return (
    <div className="w-full h-[720px] bg-[#F4F2ED] flex flex-col font-sans text-slate-800 rounded-2xl overflow-hidden border border-slate-200">
      <div className="bg-[#1E2E33] px-5 py-3 flex items-center justify-between shrink-0">
        <div>
          <div className="text-white font-semibold text-sm tracking-tight">Seguimiento de Agendas Institucionales</div>
          <div className="text-[#9FB0B5] text-[11px] font-mono">DDI · Hospital San Juan de Dios de La Serena</div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`hidden md:inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border ${
            backendStatus === 'online'
              ? 'bg-[#29453C] text-[#D6F5E7] border-[#4C7C74]'
              : backendStatus === 'offline'
                ? 'bg-[#4A352D] text-[#F5DED6] border-[#B6522F]'
                : 'bg-[#2A3E44] text-[#CBD5D9] border-[#3E545B]'
          }`}>
            {syncLabel}
          </div>
          <div className="relative">
            <button onClick={() => setShowNotifs((s) => !s)} className="relative text-[#CBD5D9] hover:text-white p-1.5">
              <Bell size={18} />
              {notifsForRole.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#B6522F] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{notifsForRole.length}</span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-9 w-72 bg-white rounded-xl border border-slate-200 shadow-lg z-50 max-h-72 overflow-y-auto">
                <div className="px-3.5 py-2.5 border-b border-slate-100 text-xs font-semibold text-slate-500">Notificaciones para este perfil</div>
                {notifsForRole.length === 0 && <div className="px-3.5 py-4 text-xs text-slate-400 italic">Sin notificaciones.</div>}
                {notifsForRole.map((n, i) => (
                  <div key={i} className="px-3.5 py-2.5 border-b border-slate-50 text-xs text-slate-600">
                    <div>{n.text}</div>
                    <div className="text-slate-400 mt-0.5">{n.fecha}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {role === 'jefe_servicio' && !authUser && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#9FB0B5] hidden sm:inline">Sesión: {JEFES_POR_SERVICIO[miServicio] || 'Jefe de Servicio'}</span>
              <div className="relative">
                <button
                  onClick={() => setShowServicioMenu((s) => !s)}
                  style={{ background: '#2A3E44', border: '1px solid #3E545B' }}
                  className="text-white text-xs font-medium rounded-lg pl-3 pr-7 py-2 relative"
                >
                  {miServicio}
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9FB0B5]" />
                </button>
                {showServicioMenu && (
                  <div className="absolute right-0 top-9 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                    {SERVICIOS.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setMiServicio(s); setShowServicioMenu(false); }}
                        className={`block w-full text-left px-3.5 py-2 text-xs ${s === miServicio ? 'font-semibold text-slate-800 bg-slate-50' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {PERSONA_POR_ROL[role] && (
            <span className="text-[11px] text-[#9FB0B5] hidden sm:inline">Sesión: {PERSONA_POR_ROL[role]}</span>
          )}
          <span className="hidden sm:inline text-[11px] text-[#CBD5D9]">{ROLES[role].label}</span>
          {authUser && (
            <button
              onClick={handleLogout}
              className="rounded-lg border border-[#3E545B] px-3 py-2 text-xs text-white hover:bg-[#2A3E44]"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 px-5 pt-3 shrink-0">
        {[
          { id: 'tablero', label: 'Tablero', icon: LayoutGrid },
          { id: 'resumen', label: 'Resumen de Horas', icon: BarChart3 },
          { id: 'historial', label: 'Historial', icon: History },
          ...(role === 'admin' ? [{ id: 'usuarios', label: 'Usuarios', icon: Users }] : []),
          { id: 'docs', label: 'Documentos normativos', icon: FileText },
          { id: 'chat', label: 'Chat IA', icon: MessageSquare },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg ${tab === t.id ? 'bg-white text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white overflow-hidden">
        {tab === 'tablero' && (
          <div className="h-full overflow-x-auto p-4">
            <div className="flex gap-3 h-full min-w-max">
              {COLUMN_ORDER.map((estado) => (
                <div key={estado} className="w-60 flex flex-col shrink-0">
                  <div className="flex items-center justify-between mb-2 px-0.5">
                    <span className="text-xs font-semibold" style={{ color: ESTADOS[estado].color }}>{ESTADOS[estado].label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{columnas[estado].length}</span>
                  </div>
                  <div className="space-y-2 overflow-y-auto flex-1 pb-2">
                    {columnas[estado].map((a) => (
                      <AgendaCard key={a.id} agenda={a} onOpen={setSelected} />
                    ))}
                    {estado === 'borrador' && role === 'jefe_servicio' && (
                      <button
                        onClick={() => setShowNuevo(true)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl py-2.5 hover:border-slate-400 hover:text-slate-600"
                      >
                        <Plus size={13} /> Nueva agenda
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'resumen' && <ResumenDashboardTab agendas={agendasVisibles} />}
        {tab === 'historial' && <HistorialAgendasTab agendas={agendasVisibles} onAbrir={setSelected} />}
        {tab === 'usuarios' && role === 'admin' && (
          <UsuariosAdminTab
            users={usersCatalog}
            services={services}
            onCreateUser={handleCreateUser}
          />
        )}
        {tab === 'docs' && <DocsTab />}
        {tab === 'chat' && <ChatIA />}
      </div>

      {selectedFresh && (
        <AgendaDetail
          agenda={selectedFresh}
          role={role}
          onClose={() => setSelected(null)}
          onAction={handleAction}
          onGenerarResumen={generarResumen}
          resumenLoading={resumenLoading}
          onAbrirEditor={() => { setShowEditorFor(selectedFresh.id); setSelected(null); }}
        />
      )}
      {showNuevo && (
        <NuevaAgendaModal
          servicio={miServicio}
          jefeNombre={JEFES_POR_SERVICIO[miServicio] || 'Jefe de Servicio'}
          agendaBase={agendaBaseParaNuevo}
          onClose={() => setShowNuevo(false)}
          onCreate={async (servicio, jefe, horas, mes, cnePct, atenciones, distribucion, profesionales, bloquesProf, vigenciaDesde, vigenciaHasta) => {
            const nueva = makeAgenda(servicio, jefe, horas, mes, cnePct, atenciones, distribucion, profesionales, bloquesProf, true, vigenciaDesde, vigenciaHasta);
            try {
              const creada = await createAgenda(nueva);
              setAgendas((a) => [...a.filter((item) => item.id !== creada.id), creada]);
              setShowNuevo(false);
              setShowEditorFor(creada.id);
            } catch (_error) {
              setAgendas((a) => [...a, nueva]);
              setShowNuevo(false);
              setShowEditorFor(nueva.id);
              setSyncLabel('Agenda creada en local; la API la sincronizará al guardar');
            }
          }}
        />
      )}
      {agendaEnEditor && (
        <EditorProgramacion
          titulo={agendaEnEditor.servicio}
          subtitulo={`${agendaEnEditor.mes} · v${agendaEnEditor.version}`}
          estado={agendaEnEditor.estado}
          role={role}
          esNueva={agendaEnEditor.pendienteConfirmar}
          especialidad={ESPECIALIDAD_POR_SERVICIO[agendaEnEditor.servicio] || 'No Aplica'}
          profesionales={agendaEnEditor.profesionales}
          bloques={agendaEnEditor.bloquesProf}
          onGuardarBorrador={async () => {
            await handleAction('confirmar_creacion', agendaEnEditor, {});
            setShowEditorFor(null);
          }}
          onDescartar={async () => {
            try {
              await deleteAgenda(agendaEnEditor.id);
            } catch (_error) {
              setSyncLabel('No fue posible descartar la agenda en API');
            }
            setAgendas((prev) => prev.filter((a) => a.id !== agendaEnEditor.id));
            setShowEditorFor(null);
          }}
          onEnviar={async () => {
            await handleAction('enviar', agendaEnEditor);
            setShowEditorFor(null);
          }}
          onAgregarProfesional={async (nombre, tipoProf) => {
            const nuevoId = nuevoProfesionalId();
            return handleAction('agregar_profesional', agendaEnEditor, { nombre, tipo: tipoProf, idPrefijado: nuevoId });
          }}
          onEliminarProfesional={async (profesionalId) => handleAction('quitar_profesional', agendaEnEditor, { profesionalId })}
          onRenombrarProfesional={async (profesionalId, nombre, tipoProf) => handleAction('renombrar_profesional', agendaEnEditor, { profesionalId, nombre, tipo: tipoProf })}
          onLimpiarProfesional={async (profesionalId) => handleAction('limpiar_bloques_profesional', agendaEnEditor, { profesionalId })}
          onAgregarBloque={(profesionalId, anterior, siguiente) => {
            const valores = calcularInsercion(anterior, siguiente);
            return handleAction('agregar_bloque_prof', agendaEnEditor, { profesionalId, ...valores });
          }}
          onEditarBloque={(bloqueId, cambios) => handleAction('editar_bloque_prof', agendaEnEditor, { bloqueId, cambios })}
          onEliminarBloque={(bloqueId) => handleAction('eliminar_bloque_prof', agendaEnEditor, { bloqueId })}
        />
      )}
      {pendingReject && (
        <PromptDialog
          titulo="Motivo del rechazo"
          placeholder="Ej: faltan horas de procedimientos"
          onCancelar={() => setPendingReject(null)}
          onConfirmar={(motivo) => { ejecutarRechazo(pendingReject, motivo); setPendingReject(null); }}
        />
      )}
    </div>
  );
}
