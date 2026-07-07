// RNF-01 — AUTENTICACIÓN (¿quién eres?) y AUTORIZACIÓN (¿qué puedes hacer?)
const jwt = require('jsonwebtoken');

// Autenticación: valida el JWT y adjunta el usuario a la petición
function verificarToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET); // { id, rol }
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Autorización: restringe por rol (LOPDP: datos de menores solo a autorizados)
// Uso: router.get('/indicadores', verificarToken, permitirRoles('PROPIETARIA'), ...)
function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario?.rol)) {
      return res.status(403).json({ error: 'No autorizado para este recurso' });
    }
    next();
  };
}

module.exports = { verificarToken, permitirRoles };
