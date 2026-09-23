# Cine App — TP1 Programación IV

Sistema de venta de entradas para un cine: catálogo de películas, compra con selección de butacas en tiempo real, candy bar, cupones, programa de puntos, panel de administración y validación de entradas por QR.

**URL desplegada:** _(completar con la URL de Vercel)_
**Repositorio:** _(completar con la URL de GitHub)_

## Stack

- **Frontend:** Angular (standalone components, signals, nuevo control de flujo `@if`/`@for`/`@switch`, formularios reactivos, signal inputs/outputs/model)
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime)
- **PWA:** `@angular/pwa` (manifest + service worker)
- **Generación de PDF/QR:** `jspdf` + `qrcode`
- **Exportación de reportes:** `xlsx`
- **Gráficos:** Chart.js


### Modelo de datos (Supabase)

El schema completo está versionado en `supabase/schema.sql`, las políticas de RLS en `supabase/policies.sql`, y el script de generación de salas/butacas en `supabase/seed.sql`.

Puntos clave del modelo:

- **Prevención de doble venta de butacas:** constraint `UNIQUE(funcion_id, butaca_id)` en `entrada_butacas`. Es la protección real contra que dos personas compren la misma butaca — no depende de lógica de aplicación, la rechaza el propio motor de la base.
- **Reservas temporales en tiempo real:** tabla `reservas_temporales` con `expires_at`, usada junto con Supabase Realtime para que el mapa de butacas se actualice en vivo entre compradores simultáneos sin necesidad de polling.
- **Asignación automática de sala:** al crear una función, el sistema calcula `hora_fin` (duración de la película + 30 min de margen) y busca la primera sala sin solapamiento de horario. Ver `FuncionesAdminService.buscarSalaLibre()`.
- **Roles:** columna `rol` en `perfiles` (`cliente` / `empleado` / `admin`), leída en cada policy de RLS a través de la función `rol_actual()`.
- **Log de actividad:** tabla `log_actividad`, poblada desde los services de admin en cada acción relevante (crear función, modificar precio, validar QR).

### Autenticación y roles

El perfil extendido del usuario (tabla `perfiles`) se crea automáticamente mediante un **trigger de Postgres** (`crear_perfil_nuevo_usuario`) disparado al insertarse un registro en `auth.users`. Se eligió este enfoque en vez de un segundo insert desde el cliente porque, si Supabase requiere confirmación de mail, no hay sesión activa inmediatamente después del `signUp()` — un insert hecho desde el cliente en ese momento viola RLS. El trigger corre con `security definer`, evitando esa dependencia.

## Decisiones técnicas y limitaciones conocidas

- **Sin transacciones multi-tabla reales:** el cliente de Supabase no expone transacciones SQL. La confirmación de compra (`EntradasService.confirmarCompra`) hace un *rollback manual* si falla el insert de butacas después de haber creado la entrada. Una mejora futura sería migrar esa lógica a una función `plpgsql` con `BEGIN/COMMIT`.
- **Validación de restricción de edad:** solo aplica a usuarios logueados (se compara contra su fecha de nacimiento). Para compra anónima, el control recae en el empleado que revisa el documento al validar el QR en la puerta — es un control híbrido, sistema + humano.
- **Asignación de sala en el cliente:** el chequeo de solapamiento de horarios corre en Angular, no en una constraint de base de datos. Con el volumen de uso esperado (un admin cargando funciones, no cientos de administradores concurrentes) el riesgo de condición de carrera es bajo, pero la solución robusta sería un `EXCLUDE constraint` con rangos de tiempo en Postgres.
- **`reservas_temporales` con policies permisivas de INSERT/DELETE:** decisión consciente, no descuido. La tabla no contiene datos sensibles (solo un lock efímero de 5 minutos sobre una butaca), y la protección real contra doble venta sigue siendo la constraint `UNIQUE` en `entrada_butacas`, no esta policy.

## Identidad visual

Paleta y tipografía definidas como design tokens en `src/styles.scss` (variables CSS `--color-*`, `--font-*`), aplicadas de forma consistente en toda la app. Tipografías: **Fraunces** (headlines) y **Archivo** (UI/cuerpo), cargadas vía Google Fonts.
