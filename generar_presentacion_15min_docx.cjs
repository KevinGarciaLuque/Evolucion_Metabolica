const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const fs = require('fs');
const path = require('path');

function h1(t){ return new Paragraph({ text:t, heading: HeadingLevel.HEADING_1, spacing:{ before:280, after:120 } }); }
function h2(t){ return new Paragraph({ text:t, heading: HeadingLevel.HEADING_2, spacing:{ before:220, after:80 } }); }
function p(t){ return new Paragraph({ children:[new TextRun({ text:t, size:22 })], spacing:{ before:40, after:60 } }); }
function b(t){ return new Paragraph({ children:[new TextRun({ text:t, bold:true, size:22 })], spacing:{ before:40, after:40 } }); }
function bullet(t){ return new Paragraph({ children:[new TextRun({ text:t, size:22 })], bullet:{ level:0 }, spacing:{ before:20, after:20 } }); }

const doc = new Document({
  sections:[{
    children:[
      new Paragraph({ text:'Guion de Exposicion - Evolucion Metabolica (15 min)', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing:{ after:220 } }),
      new Paragraph({ text:'Incluye texto para hablar por modulo y por pestanas', alignment: AlignmentType.CENTER, spacing:{ after:400 } }),

      h1('1. Apertura (texto que puedes decir)'),
      p('Hoy les presento Evolucion Metabolica, una plataforma clinica para diabetes pediatrica que integra pacientes, consultas, analisis de monitor continuo de glucosa, mensajeria y auditoria en un solo sistema. El objetivo es reducir tiempo operativo, mejorar decisiones clinicas y dar seguimiento oportuno a los pacientes con mayor riesgo.'),

      h1('2. Ventajas para el doctor (mensaje directo)'),
      bullet('Reduce tiempo de consulta porque la informacion ya esta consolidada en un expediente unico.'),
      bullet('Disminuye errores de transcripcion al extraer metricas del PDF de forma automatica.'),
      bullet('Facilita priorizacion clinica con clasificacion ISPAD visible (Optimo, Moderado, Alto Riesgo).'),
      bullet('Permite seguimiento activo por WhatsApp sin salir del flujo clinico.'),
      bullet('Da trazabilidad medico-legal con auditoria de acciones y control de permisos.'),

      h1('3. Texto para exponer por modulo del sidebar'),

      h2('Dashboard'),
      p('En Dashboard vemos una fotografia clinica global del programa: total de pacientes, TIR promedio, GMI, glucosa promedio y analisis recientes. Esto me ayuda a tomar decisiones de gestion, no solo de un paciente individual, sino de toda la poblacion en seguimiento.'),

      h2('Consolidado'),
      p('En Consolidado analizamos datos poblacionales de forma mas profunda. Sirve para identificar patrones, comparar grupos y respaldar decisiones institucionales con evidencia real del programa de diabetes.'),

      h2('Pacientes'),
      p('Pacientes es el nucleo operativo. Aqui registro nuevos pacientes, consulto el historial clinico y entro al detalle integral de cada caso. Es donde se concentra la continuidad asistencial de cada nino o adolescente.'),

      h2('Analizar PDF'),
      p('Este modulo acelera mucho la consulta. Subimos el PDF del monitor, el sistema extrae automaticamente TIR, TAR, TBR, GMI, CV y otros indicadores. Luego el medico valida, corrige si hace falta y confirma. Asi evitamos digitacion manual y ganamos precision.'),

      h2('Consultas'),
      p('En Consultas registro la evolucion clinica estructurada: medidas, HbA1c, observaciones, tratamiento y proxima cita. Esto deja estandarizada la nota medica y mejora la comunicacion entre profesionales del equipo.'),

      h2('Mapa'),
      p('En Mapa visualizamos distribucion geografica de pacientes. Esto apoya decisiones de cobertura, seguimiento territorial y planificacion de jornadas o estrategias por departamento.'),

      h2('Mensajes'),
      p('Mensajes permite enviar comunicacion individual o masiva por clasificacion de riesgo. Para el doctor, esto convierte el seguimiento en una accion concreta y oportuna, especialmente en pacientes de alto riesgo.'),

      h2('Permisos (admin)'),
      p('Permisos controla que cada usuario vea solo lo que le corresponde. Esto fortalece seguridad de datos y ordena el trabajo por responsabilidades dentro del equipo de salud.'),

      h2('Usuarios (admin)'),
      p('Usuarios permite administrar cuentas, roles y acceso del personal. Es clave para crecimiento institucional porque evita dependencias tecnicas para altas o cambios de personal.'),

      h2('Auditoria (admin)'),
      p('Auditoria registra acciones relevantes como inicios de sesion, cambios y eliminaciones. Esto aporta trazabilidad, control de calidad y respaldo en auditorias internas o externas.'),

      h1('4. Texto para exponer por pestanas del Detalle de Paciente'),
      p('Dentro del perfil del paciente tenemos pestañas que ordenan la informacion por eje clinico:'),

      h2('Pestana: Informacion'),
      p('Aqui tengo la ficha completa del paciente: identificacion, datos clinicos base y contexto familiar. Esta vista me permite iniciar la consulta con contexto claro sin buscar datos en varios lugares.'),

      h2('Pestana: Consultas'),
      p('En esta pestaña veo la cronologia de consultas y la evolucion del plan terapeutico. Me ayuda a evaluar adherencia, respuesta al tratamiento y decisiones previas del equipo.'),

      h2('Pestana: Analisis MCG'),
      p('Aqui reviso todos los analisis del monitor continuo de glucosa con su clasificacion ISPAD. Esta es la base para ajustar tratamiento, identificar riesgo temprano y medir avance real del control metabolico.'),

      h2('Pestana: Curvas de Crecimiento'),
      p('Esta pestaña integra crecimiento con referencias OMS y z-scores. Es muy importante en pediatria porque no solo evaluamos glucosa: tambien vigilamos desarrollo nutricional y antropometrico.'),

      h2('Pestana: Insulina'),
      p('Aqui llevo trazabilidad de tipos de insulina, dosis y cambios. Me facilita comparar si los ajustes terapeuticos se relacionan con mejoras o deterioro en TIR y GMI.'),

      h2('Pestana: Alimentacion'),
      p('En alimentacion registro recomendaciones y seguimiento nutricional. Esto ayuda a alinear la parte medica con educacion diabetologica y habitos del paciente/familia.'),

      h1('5. Tiempo por paciente (texto para explicar en vivo)'),
      p('Con este sistema, un control con datos ya cargados puede tomar entre 6 y 10 minutos. Si incluye analisis nuevo de PDF, suele estar entre 9 y 14 minutos. Frente al proceso manual tradicional, el ahorro operativo estimado ronda entre 25% y 40%, dependiendo de la complejidad del caso.'),

      h1('6. Fases de expansion (Honduras primero)'),
      b('Fase 1: Honduras'),
      bullet('Piloto e implementacion institucional en Honduras.'),
      bullet('Estandarizacion de flujo clinico y validacion de resultados.'),

      b('Fase 2: expansion a otros paises'),
      bullet('Replica por pais con parametros locales y normativa de datos de salud.'),
      bullet('Comparativos regionales por institucion y por pais.'),

      b('Fase 3: plataforma LATAM'),
      bullet('Operacion regional con arquitectura multi-tenant, particion de datos y alta disponibilidad.'),

      h1('7. AWS y escalabilidad (texto ejecutivo)'),
      p('Si, AWS es totalmente viable para este proyecto. La ruta recomendada es iniciar con una arquitectura simple pero bien diseñada y luego escalar por fases. Para nivel latinoamericano se requiere aislamiento por pais, replicacion de base de datos, cache y procesamiento asincrono para mantener rendimiento y seguridad.'),

      h1('8. Cierre (texto final sugerido)'),
      p('Evolucion Metabolica ayuda al doctor a decidir mejor y mas rapido, porque transforma datos dispersos en informacion clinica accionable. Iniciamos en Honduras y luego escalamos por pais, manteniendo calidad clinica, seguridad de datos y sostenibilidad operativa.'),
    ]
  }]
});

const out = path.join(process.cwd(), 'Guion_Presentacion_Evolucion_Metabolica_15min.docx');
Packer.toBuffer(doc).then((buffer)=>{
  fs.writeFileSync(out, buffer);
  console.log('OK DOCX ACTUALIZADO:', out);
}).catch((e)=>{
  console.error(e);
  process.exit(1);
});
