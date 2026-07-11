-- ============================================================
-- AUDITORÍA POR TRIGGERS — GymboGest (RNF-07, apoya LOPDP)
-- Ejecutar UNA VEZ, DESPUÉS de aplicar las migraciones de Prisma
-- (npx prisma migrate dev / migrate deploy), nunca antes:
--
--   docker compose exec -T db psql -U gymbo -d gymbogest < database/triggers_auditoria.sql
--
-- No se incluye como migración de Prisma porque Prisma no gestiona
-- bien triggers/funciones PL/pgSQL puros dentro de su sistema de
-- migraciones versionadas (rompe la validación de shadow database).
-- No requiere ningún paso manual de psql.
--
-- El backend identifica al usuario por transacción con:
--   SET LOCAL app.usuario_id = '<id>';
-- El trigger lo lee con current_setting(..., true) → NULL si no está.
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_auditoria() RETURNS trigger AS $$
DECLARE
  v_usuario INT := NULLIF(current_setting('app.usuario_id', true), '')::INT;
  v_id INT;
  v_detalle JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_id := OLD.id;
    v_detalle := jsonb_build_object('anterior', to_jsonb(OLD));
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := NEW.id;
    v_detalle := jsonb_build_object('anterior', to_jsonb(OLD), 'nuevo', to_jsonb(NEW));
  ELSE
    v_id := NEW.id;
    v_detalle := jsonb_build_object('nuevo', to_jsonb(NEW));
  END IF;

  INSERT INTO "Auditoria" ("accion", "entidad", "entidadId", "detalle", "usuarioId", "fecha")
  VALUES (TG_OP, TG_TABLE_NAME, v_id, v_detalle, v_usuario, now());

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers en las tablas críticas (datos de menores, dinero y cupos)
DO $$
DECLARE t TEXT;
BEGIN
  -- Persona incluida: nombres/cédula/correo del tutor viven ahí y ahora son editables (extensión CU-01)
  FOREACH t IN ARRAY ARRAY['Persona','Familia','Nino','Tutor','Paquete','Reserva','Pago','MaterialDidactico','Asistencia']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_auditoria_%s ON %I', lower(t), t);
    EXECUTE format(
      'CREATE TRIGGER trg_auditoria_%s AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION registrar_auditoria()', lower(t), t);
  END LOOP;
END $$;

-- Verificación rápida:
--   SELECT accion, entidad, "entidadId", "usuarioId", fecha FROM "Auditoria" ORDER BY id DESC LIMIT 10;
