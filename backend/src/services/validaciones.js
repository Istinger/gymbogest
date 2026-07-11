// ============================================================
// services/validaciones.js
// RF-01 / RNF-01 — Validaciones de identidad COMPARTIDAS entre
// usuarioService (cuentas) y familiaService (inscripciones), para
// que un correo/cédula aceptado en un flujo nunca sea rechazado
// en el otro (p. ej. auto-vinculación tutor ↔ cuenta por correo).
// Funciones puras: cada servicio lanza su PROPIO error tipado.
// ============================================================

// Solo proveedores de correo conocidos (evita dominios inventados
// o typos tipo "gmial.com" al crear o editar).
const DOMINIOS_PERMITIDOS = [
  'gmail.com', 'googlemail.com',
  'hotmail.com', 'hotmail.es',
  'outlook.com', 'outlook.es',
  'live.com', 'msn.com',
  'yahoo.com', 'yahoo.es',
  'icloud.com', 'me.com',
  'proton.me', 'protonmail.com',
];

// Devuelve null si el correo es válido; si no, el motivo (para el error tipado)
function motivoCorreoInvalido(correo) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo || '')) {
    return 'El correo no tiene un formato válido';
  }
  const dominio = correo.split('@')[1].toLowerCase();
  if (!DOMINIOS_PERMITIDOS.includes(dominio)) {
    return `El correo debe ser de un proveedor conocido (${DOMINIOS_PERMITIDOS.join(', ')})`;
  }
  return null;
}

// Cédula ecuatoriana (personas naturales): 10 dígitos, provincia 01–24,
// tercer dígito 0–5, y dígito verificador por módulo 10 con coeficientes
// 2-1-2-1-2-1-2-1-2 (si un producto supera 9 se le resta 9).
function esCedulaEcuatorianaValida(cedula) {
  if (!/^\d{10}$/.test(cedula || '')) return false;
  const provincia = Number(cedula.slice(0, 2));
  if (provincia < 1 || provincia > 24) return false;
  if (Number(cedula[2]) > 5) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let producto = Number(cedula[i]) * coeficientes[i];
    if (producto > 9) producto -= 9;
    suma += producto;
  }
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === Number(cedula[9]);
}

module.exports = { DOMINIOS_PERMITIDOS, motivoCorreoInvalido, esCedulaEcuatorianaValida };
