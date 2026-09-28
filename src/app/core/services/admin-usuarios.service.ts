import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { RolUsuario } from '../../models/usuario.model';

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
}

@Injectable({
  providedIn: 'root'
})
export class AdminUsuariosService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  async listar(): Promise<UsuarioAdmin[]> {
    const { data, error } = await this.supabaseService.client
      .from('perfiles')
      .select('id, nombre, apellido, rol')
      .order('apellido');

    return error ? [] : (data as UsuarioAdmin[]);
  }

  async cambiarRol(usuarioId: string, nuevoRol: RolUsuario): Promise<{ error: string | null }> {
    const { error } = await this.supabaseService.client
      .from('perfiles')
      .update({ rol: nuevoRol })
      .eq('id', usuarioId);

    if (!error) {
      await this.registrarLog('cambiar_rol', { usuario_id: usuarioId, nuevo_rol: nuevoRol });
    }

    return { error: error?.message ?? null };
  }

  private async registrarLog(accion: string, detalle: Record<string, unknown>) {
    const adminId = this.authService.perfil()?.id;
    if (!adminId) return;

    await this.supabaseService.client
      .from('log_actividad')
      .insert({ usuario_id: adminId, accion, detalle });
  }
}