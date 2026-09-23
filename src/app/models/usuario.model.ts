export type RolUsuario = 'cliente' | 'empleado' | 'admin';

// Refleja la tabla `perfiles` de Supabase (no incluye la parte de auth.users)
export interface Perfil {
  id: string; // uuid, igual al id de auth.users
  nombre: string;
  apellido: string;
  fecha_nacimiento: string; // formato ISO (yyyy-mm-dd)
  tipo_sangre: string | null;
  color_ojos: string | null;
  dias_vacaciones: number | null;
  puntos_acumulados: number;
  credito_disponible: number;
  cupon_bienvenida_usado: boolean;
  rol: RolUsuario;
}

// Datos que pide el formulario de registro (todavía sin id, se lo asigna Supabase Auth)
export interface RegistroData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre?: string;
  color_ojos?: string;
  dias_vacaciones?: number;
}