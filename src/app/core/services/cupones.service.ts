import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Cupon } from '../../models/candy.model';

@Injectable({
  providedIn: 'root'
})
export class CuponesService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  // Busca cupón por código escrito a mano (promocional)
  async buscarPorCodigo(codigo: string): Promise<{ cupon: Cupon | null; error: string | null }> {
    const { data, error } = await this.supabaseService.client
      .from('cupones')
      .select('*')
      .eq('codigo', codigo)
      .eq('activo', true)
      .single();

    if (error || !data) {
      return { cupon: null, error: 'Cupón inválido o vencido' };
    }
    return { cupon: data as Cupon, error: null };
  }

  // Cupones automáticos a los que el usuario logueado tiene derecho
  // (bienvenida si no lo usó, o por edad si es mayor de 50)
  cuponesAutomaticosDisponibles(): { tipo: string; label: string }[] {
    const perfil = this.authService.perfil();
    if (!perfil) return [];

    const disponibles: { tipo: string; label: string }[] = [];

    if (!perfil.cupon_bienvenida_usado) {
      disponibles.push({ tipo: 'bienvenida', label: '20% de descuento — primera compra' });
    }

    const edad = this.calcularEdad(perfil.fecha_nacimiento);
    if (edad >= 50) {
      disponibles.push({ tipo: 'edad_mayor_50', label: 'Descuento por edad' });
    }

    return disponibles;
  }

  private calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mesActual = hoy.getMonth() - nacimiento.getMonth();
    if (mesActual < 0 || (mesActual === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }

  async obtenerCuponPorTipo(tipo: string): Promise<Cupon | null> {
    const { data, error } = await this.supabaseService.client
      .from('cupones')
      .select('*')
      .eq('tipo', tipo)
      .eq('activo', true)
      .single();

    return error ? null : (data as Cupon);
  }
}