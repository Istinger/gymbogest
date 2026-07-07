// RNF-01 — Login con bcrypt (contraseñas nunca en texto plano) y JWT
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
  const { correo, password } = req.body;
  const usuario = await prisma.usuario.findUnique({ where: { correo } });
  // mensaje genérico: no revelar si el correo existe
  if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = jwt.sign({ id: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, rol: usuario.rol }); // el frontend redirige al menú por rol
});

module.exports = router;
