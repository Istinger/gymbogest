// RNF-01 — Login con bcrypt (contraseñas nunca en texto plano) y JWT
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma'); // singleton inyectado (SOLID-D)
const { crearUsuarioService, UsuarioInvalidoError, CorreoDuplicadoError } =
  require('../services/usuarioService');

const usuarios = crearUsuarioService(prisma);

router.post('/login', async (req, res) => {
  const { correo, password } = req.body;
  const usuario = await prisma.usuario.findUnique({ where: { correo } });
  const exito = !!usuario && await bcrypt.compare(password || '', usuario.passwordHash);

  // Bitácora de ingresos (panel ADMIN): se registra todo intento, exitoso o no
  await usuarios.registrarAcceso({ correo, exito, ip: req.ip });

  // mensaje genérico: no revelar si el correo existe
  if (!exito) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = jwt.sign({ id: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, rol: usuario.rol }); // el frontend redirige al menú por rol
});

// POST /api/auth/registro — Sign up público, rol TUTOR por defecto.
// La Propietaria eleva el rol después desde /api/usuarios (T22).
router.post('/registro', async (req, res) => {
  try {
    const cuenta = await usuarios.registrarCuenta(req.body);
    res.status(201).json(cuenta);
  } catch (e) {
    if (e instanceof UsuarioInvalidoError) return res.status(400).json({ error: e.message });
    if (e instanceof CorreoDuplicadoError) return res.status(409).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
