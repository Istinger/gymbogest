// ============================================================
// prisma/seed.js — Datos de ejemplo (T02)
// Crea: 1 propietaria, 1 recepcionista, 2 educadoras, y 6 clases
// (una de ellas con 9 reservas activas, para probar el rechazo
// del cupo n.º 10 en la demo de la defensa).
// Ejecutar: npm run seed
// ============================================================
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function crearUsuario({ nombres, cedula, correo, telefono, rolPersona, rol, fechaIngreso }) {
  const persona = await prisma.persona.create({ data: { nombres, cedula, correo, telefono } });
  if (rol !== 'TUTOR') {
    await prisma.empleado.create({
      data: { personaId: persona.id, rol: rolPersona, fechaIngreso: fechaIngreso || new Date() },
    });
  }
  const passwordHash = await bcrypt.hash('semilla123', 10);
  await prisma.usuario.create({ data: { correo, passwordHash, rol, personaId: persona.id } });
  return persona;
}

async function main() {
  console.log('Sembrando datos de ejemplo...');

  // ---------- Usuarios internos (T02) ----------
  // ADMIN: gestión de cuentas y bitácora de ingresos (sin persona: no es operativo)
  await prisma.usuario.create({
    data: {
      correo: 'admin@gymbo.ec',
      passwordHash: await bcrypt.hash('admin123', 10),
      rol: 'ADMIN',
    },
  });
  await crearUsuario({
    nombres: 'Karen Vaca', cedula: '1700000001', correo: 'propietaria@gymbo.ec',
    telefono: '0990000001', rolPersona: 'propietaria', rol: 'PROPIETARIA',
  });
  await crearUsuario({
    nombres: 'María Recepción', cedula: '1700000002', correo: 'recepcion@gymbo.ec',
    telefono: '0990000002', rolPersona: 'recepcion', rol: 'RECEPCION',
  });
  const edu1 = await crearUsuario({
    nombres: 'Ana Educadora', cedula: '1700000003', correo: 'educadora1@gymbo.ec',
    telefono: '0990000003', rolPersona: 'educadora', rol: 'EDUCADORA',
  });
  const edu2 = await crearUsuario({
    nombres: 'Lucía Educadora', cedula: '1700000004', correo: 'educadora2@gymbo.ec',
    telefono: '0990000004', rolPersona: 'educadora', rol: 'EDUCADORA',
  });
  const empleado1 = await prisma.empleado.findUnique({ where: { personaId: edu1.id } });
  const empleado2 = await prisma.empleado.findUnique({ where: { personaId: edu2.id } });

  // ---------- 6 clases de ejemplo (RF-02) ----------
  const programas = ['PLAY_LEARN', 'MUSIC', 'ART', 'SCHOOL_SKILLS', 'PLAYLAB', 'PLAY_LEARN'];
  const clases = [];
  for (let i = 0; i < 6; i++) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + i);
    fecha.setHours(10, 0, 0, 0);
    const clase = await prisma.clase.create({
      data: {
        programa: programas[i],
        fechaHora: fecha,
        cupoMaximo: 9,
        empleadoId: i % 2 === 0 ? empleado1.id : empleado2.id,
      },
    });
    clases.push(clase);
  }
  console.log(`✔ ${clases.length} clases creadas.`);

  // ---------- Clases extra HOY en distintas horas (prueba visual de la agenda) ----------
  // Incluye dos pares a la MISMA hora (10:00 y 15:00) para verificar que la vista
  // de calendario diario apila clases concurrentes lado a lado sin solaparse.
  const horarioHoy = [
    { h: 9,  m: 0,  programa: 'MUSIC',         empleadoId: empleado2.id },
    { h: 10, m: 0,  programa: 'ART',           empleadoId: empleado2.id }, // misma hora que clases[0]
    { h: 11, m: 30, programa: 'SCHOOL_SKILLS', empleadoId: empleado1.id },
    { h: 15, m: 0,  programa: 'PLAYLAB',       empleadoId: empleado1.id },
    { h: 15, m: 0,  programa: 'PLAY_LEARN',    empleadoId: empleado2.id }, // concurrente con la anterior
    { h: 16, m: 30, programa: 'MUSIC',         empleadoId: empleado1.id },
    { h: 17, m: 0,  programa: 'ART',           empleadoId: empleado2.id },
  ];
  for (const { h, m, programa, empleadoId } of horarioHoy) {
    const fecha = new Date();
    fecha.setHours(h, m, 0, 0);
    await prisma.clase.create({
      data: { programa, fechaHora: fecha, cupoMaximo: 9, empleadoId },
    });
  }
  console.log(`✔ ${horarioHoy.length} clases extra creadas para HOY (agenda del día).`);

  // ---------- Catálogo de paquetes (gestionado por la Propietaria) ----------
  await prisma.paqueteCatalogo.createMany({
    data: [
      { nombre: 'Mensual 2 clases/semana', tipo: 'mensual', clasesPorSemana: 2, saldoClases: 8, precio: 120 },
      { nombre: 'Mensual 3 clases/semana', tipo: 'mensual', clasesPorSemana: 3, saldoClases: 12, precio: 160 },
      { nombre: 'Trimestral 2 clases/semana', tipo: 'trimestral', clasesPorSemana: 2, saldoClases: 24, precio: 320 },
    ],
  });
  // Prueba gratis por registro: habilitada, 3 días (regla del negocio)
  await prisma.configuracionPrueba.upsert({
    where: { id: 1 },
    create: { id: 1, habilitado: true, diasPrueba: 3 },
    update: {},
  });
  console.log('✔ Catálogo de paquetes (3) y prueba gratis (3 días) configurados.');

  // ---------- Familia + Niño + Paquete de ejemplo, para probar reservas ----------
  const familiaDemo = await prisma.familia.create({
    data: { canalOrigen: 'REFERIDO' },
  });
  const personaTutorDemo = await prisma.persona.create({
    data: { nombres: 'Tutor Demo', cedula: '1700009994', correo: 'tutor.demo@gmail.com', telefono: '0990009999' },
  });
  await prisma.tutor.create({
    data: { personaId: personaTutorDemo.id, parentesco: 'madre', familiaId: familiaDemo.id },
  });
  const paqueteDemo = await prisma.paquete.create({
    data: { tipo: 'mensual', clasesPorSemana: 3, saldoClases: 12, familiaId: familiaDemo.id },
  });

  // ---------- Escenario clave para la demo: LLENAR la clase[0] con 9 niños ----------
  // Así, en la defensa, intentar reservar un 10.º niño demuestra el rechazo por cupo (CU-02 exc.3)
  const claseLlena = clases[0];
  for (let i = 0; i < 9; i++) {
    const fam = await prisma.familia.create({ data: { canalOrigen: 'REDES' } });
    const nino = await prisma.nino.create({
      data: { nombres: `Niño Demo ${i + 1}`, fechaNacimiento: new Date('2022-01-01'), familiaId: fam.id },
    });
    const paq = await prisma.paquete.create({
      data: { tipo: 'mensual', clasesPorSemana: 2, saldoClases: 8, familiaId: fam.id },
    });
    await prisma.reserva.create({
      data: { ninoId: nino.id, claseId: claseLlena.id, paqueteId: paq.id, estado: 'ACTIVA' },
    });
  }
  console.log(`✔ Clase "${claseLlena.programa}" (id ${claseLlena.id}) llenada con 9 reservas`
    + ` — úsala para demostrar el rechazo del cupo n.º 10.`);

  // ---------- Familias con tutor identificable (probar buscador de Recepción) ----------
  // Permiten probar el filtro por tutor, niño y cédula en el panel de Recepción.
  const familiasBuscables = [
    { tutor: { nombres: 'Carla Játiva', cedula: '1710000009', correo: 'carla.jativa@gmail.com', telefono: '0991000001', parentesco: 'madre' }, nino: { nombres: 'Emilia Játiva', nacimiento: '2022-03-15' }, canal: 'REDES' },
    { tutor: { nombres: 'Diego Salazar', cedula: '1710000017', correo: 'diego.salazar@hotmail.com', telefono: '0991000002', parentesco: 'padre' }, nino: { nombres: 'Martín Salazar', nacimiento: '2021-11-02' }, canal: 'PEDIATRA_ALIADO' },
    { tutor: { nombres: 'Verónica Paz', cedula: '1710000025', correo: 'vero.paz@outlook.com', telefono: '0991000003', parentesco: 'madre' }, nino: { nombres: 'Amelia Paz', nacimiento: '2023-01-20' }, canal: 'REFERIDO' },
    { tutor: { nombres: 'Andrés Molina', cedula: '1710000033', correo: 'andres.molina@gmail.com', telefono: '0991000004', parentesco: 'padre' }, nino: { nombres: 'Julián Molina', nacimiento: '2022-07-08' }, canal: 'EMPRESA' },
  ];
  for (const { tutor, nino, canal } of familiasBuscables) {
    const fam = await prisma.familia.create({ data: { canalOrigen: canal } });
    const personaTutor = await prisma.persona.create({
      data: { nombres: tutor.nombres, cedula: tutor.cedula, correo: tutor.correo, telefono: tutor.telefono },
    });
    await prisma.tutor.create({
      data: { personaId: personaTutor.id, parentesco: tutor.parentesco, familiaId: fam.id },
    });
    await prisma.nino.create({
      data: { nombres: nino.nombres, fechaNacimiento: new Date(nino.nacimiento), familiaId: fam.id },
    });
  }
  console.log(`✔ ${familiasBuscables.length} familias con tutor creadas (probar buscador de Recepción).`);

  // Un niño de la familia demo, SIN reservar aún (para probar el flujo normal de reserva)
  const ninoDemo = await prisma.nino.create({
    data: { nombres: 'Niño Prueba Libre', fechaNacimiento: new Date('2023-05-10'), familiaId: familiaDemo.id },
  });

  console.log('\n=== Resumen para pruebas ===');
  console.log('Login (todas las cuentas): password = semilla123');
  console.log('  propietaria@gymbo.ec | recepcion@gymbo.ec | educadora1@gymbo.ec | educadora2@gymbo.ec');
  console.log(`Clase LLENA (probar rechazo de cupo):  claseId = ${claseLlena.id}`);
  console.log(`Niño sin reservar (probar reserva OK): ninoId = ${ninoDemo.id}, paqueteId = ${paqueteDemo.id}`);
  console.log(`Otra clase con cupo libre: claseId = ${clases[1].id}`);
  console.log('============================\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
