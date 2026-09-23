import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface CandyCategoria {
  id: number;
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminCandyService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  async obtenerCategorias(): Promise<CandyCategoria[]> {
    const { data, error } = await this.supabaseService.client
      .from('candy_categorias')
      .select('*')
      .order('nombre');

    return error ? [] : (data as CandyCategoria[]);
  }

  async crearCategoria(nombre: string): Promise<{ error: string | null }> {
    const { error } = await this.supabaseService.client
      .from('candy_categorias')
      .insert({ nombre });

    return { error: error?.message ?? null };
  }

  async crearProducto(nombre: string, precio: number, categoriaId: number, puntosCanje: number | null): Promise<{ error: string | null }> {
    const { error } = await this.supabaseService.client
      .from('candy_productos')
      .insert({ nombre, precio, categoria_id: categoriaId, puntos_canje: puntosCanje });

    if (!error) {
      await this.registrarLog('crear_producto_candy', { nombre, precio });
    }

    return { error: error?.message ?? null };
  }

  async crearCombo(nombre: string, precioFijo: number): Promise<{ error: string | null }> {
    const { error } = await this.supabaseService.client
      .from('combos')
      .insert({ nombre, precio_fijo: precioFijo });

    if (!error) {
      await this.registrarLog('crear_combo', { nombre, precio_fijo: precioFijo });
    }

    return { error: error?.message ?? null };
  }

  private async registrarLog(accion: string, detalle: Record<string, unknown>) {
    const usuarioId = this.authService.perfil()?.id;
    if (!usuarioId) return;

    await this.supabaseService.client
      .from('log_actividad')
      .insert({ usuario_id: usuarioId, accion, detalle });
  }
}