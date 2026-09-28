import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface CanjeConDetalle {
  id: number;
  puntosUsados: number;
  createdAt: string;
  // null cuando el canje fue por una entrada gratis, no por un producto
  productoNombre: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CanjesService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  async obtenerMisCanjes(): Promise<CanjeConDetalle[]> {
    const usuarioId = this.authService.perfil()?.id;
    if (!usuarioId) return [];

    const { data, error } = await this.supabaseService.client
      .from('canjes_puntos')
      .select('id, puntos_usados, created_at, candy_productos ( nombre )')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return (data as any[]).map(c => ({
      id: c.id,
      puntosUsados: c.puntos_usados,
      createdAt: c.created_at,
      productoNombre: c.candy_productos?.nombre ?? null
    }));
  }
}