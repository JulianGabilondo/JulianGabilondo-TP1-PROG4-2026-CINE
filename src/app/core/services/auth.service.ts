import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Perfil, RegistroData } from '../../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Signal writable con el perfil del usuario logueado (null = no hay sesión)
  private perfilSignal = signal<Perfil | null>(null);

  // Signals de solo lectura derivadas, para que los componentes
  // no puedan modificar el estado directamente
  perfil = this.perfilSignal.asReadonly();
  estaLogueado = computed(() => this.perfilSignal() !== null);
  esAdmin = computed(() => this.perfilSignal()?.rol === 'admin');
  esEmpleado = computed(() => {
    const rol = this.perfilSignal()?.rol;
    return rol === 'empleado' || rol === 'admin'; // admin puede hacer todo lo que hace un empleado
  });

  constructor(private supabaseService: SupabaseService) {
    this.restaurarSesion();
    this.escucharCambiosDeSesion();
  }

  // Al recargar la página, Supabase ya tiene la sesión guardada en localStorage;
  // acá la recuperamos y cargamos el perfil asociado
  private async restaurarSesion() {
    const { data } = await this.supabaseService.client.auth.getSession();
    if (data.session?.user) {
      await this.cargarPerfil(data.session.user.id);
    }
  }

  // Reacciona a login/logout que pasen en otra pestaña o por expiración de sesión
  private escucharCambiosDeSesion() {
    this.supabaseService.client.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await this.cargarPerfil(session.user.id);
      } else {
        this.perfilSignal.set(null);
      }
    });
  }

  private async cargarPerfil(userId: string) {
    const { data, error } = await this.supabaseService.client
      .from('perfiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      this.perfilSignal.set(data as Perfil);
    }
  }

  async registrarse(datos: RegistroData): Promise<{ error: string | null }> {
  
  const { data, error } = await this.supabaseService.client.auth.signUp({
    email: datos.email,
    password: datos.password,
    options: {
      data: {
        nombre: datos.nombre,
        apellido: datos.apellido,
        fecha_nacimiento: datos.fecha_nacimiento,
        tipo_sangre: datos.tipo_sangre ?? null,
        color_ojos: datos.color_ojos ?? null,
        dias_vacaciones: datos.dias_vacaciones ?? null
      }
    }
  });

  if (error || !data.user) {
    return { error: error?.message ?? 'No se pudo crear el usuario' };
  }

  if (data.session) {
    await this.cargarPerfil(data.user.id);
  }

  return { error: null };
}

  async login(email: string, password: string): Promise<{ error: string | null }> {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      return { error: error?.message ?? 'Credenciales inválidas' };
    }

    await this.cargarPerfil(data.user.id);
    return { error: null };
  }

  async logout() {
    await this.supabaseService.client.auth.signOut();
    this.perfilSignal.set(null);
  }
}