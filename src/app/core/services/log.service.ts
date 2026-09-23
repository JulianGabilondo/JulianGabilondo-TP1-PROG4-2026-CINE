import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface LogEntry {
  id: number;
  accion: string;
  detalle: Record<string, unknown>;
  created_at: string;
  // Nombre del usuario que hizo la acción, resuelto vía join
  usuario_nombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LogService {
  constructor(private supabaseService: SupabaseService) {}

  async obtenerUltimos(cantidad = 50): Promise<LogEntry[]> {
    const { data, error } = await this.supabaseService.client
      .from('log_actividad')
      .select('*, perfiles(nombre, apellido)')
      .order('created_at', { ascending: false })
      .limit(cantidad);

    if (error || !data) return [];

    return data.map((r: any) => ({
      ...r,
      usuario_nombre: r.perfiles ? `${r.perfiles.nombre} ${r.perfiles.apellido}` : 'Sistema'
    }));
  }
}