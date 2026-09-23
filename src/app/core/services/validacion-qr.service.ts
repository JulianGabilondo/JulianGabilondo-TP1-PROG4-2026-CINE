import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface ResultadoValidacion {
  encontrado: boolean;
  yaValidado: boolean;
  peliculaTitulo?: string;
  salaNombre?: string;
  fecha?: string;
  horaInicio?: string;
  butacas?: string[];
  productos?: { id: number; nombre: string; cantidad: number; yaValidado: boolean }[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ValidacionQrService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  // Busca la entrada por código de QR (o el código tipeado a mano) y devuelve
  // todo lo necesario para que el empleado decida si la deja pasar,
  // sin marcarla como validada todavía — eso es un paso aparte (confirmar())
  async buscarPorCodigo(codigo: string): Promise<ResultadoValidacion> {
    const { data: entrada, error } = await this.supabaseService.client
      .from('entradas')
      .select(`
        id, qr_validado, cancelada,
        funciones ( fecha, hora_inicio, peliculas ( titulo ), salas ( nombre ) ),
        entrada_butacas ( butacas ( fila, numero ) ),
        entrada_productos ( id, cantidad, qr_validado, candy_productos ( nombre ) )
      `)
      .eq('qr_codigo', codigo.trim())
      .maybeSingle();

    if (error || !entrada) {
      return { encontrado: false, yaValidado: false, error: 'No se encontró ninguna entrada con ese código.' };
    }

    if ((entrada as any).cancelada) {
      return { encontrado: true, yaValidado: false, error: 'Esta entrada fue cancelada.' };
    }

    const funcion = (entrada as any).funciones;
    const butacas = ((entrada as any).entrada_butacas ?? []).map(
      (eb: any) => `${eb.butacas.fila}${eb.butacas.numero}`
    );
   
    const productos = ((entrada as any).entrada_productos ?? []).map((ep: any) => ({
    id: ep.id,
     nombre: ep.candy_productos.nombre,
    cantidad: ep.cantidad,
    yaValidado: ep.qr_validado
    }));

    return {
      encontrado: true,
      yaValidado: (entrada as any).qr_validado,
      peliculaTitulo: funcion?.peliculas?.titulo,
      salaNombre: funcion?.salas?.nombre,
      fecha: funcion?.fecha,
      horaInicio: funcion?.hora_inicio,
      butacas,
      productos
    };
  }

  // Marca la entrada (acceso al cine) como validada. Una vez validada,
  // este mismo QR deja de servir para volver a entrar.
  async validarEntrada(codigo: string): Promise<{ error: string | null }> {
    const { data: entrada, error: errorBusqueda } = await this.supabaseService.client
      .from('entradas')
      .select('id, qr_validado')
      .eq('qr_codigo', codigo.trim())
      .single();

    if (errorBusqueda || !entrada) {
      return { error: 'No se encontró la entrada.' };
    }

    if (entrada.qr_validado) {
      return { error: 'Esta entrada ya fue validada anteriormente.' };
    }

    const { error } = await this.supabaseService.client
      .from('entradas')
      .update({ qr_validado: true, qr_validado_at: new Date().toISOString() })
      .eq('id', entrada.id);

    if (!error) {
      await this.registrarLog('validar_qr', { entrada_id: entrada.id, tipo: 'entrada' });
    }

    return { error: error?.message ?? null };
  }

  // Marca UN producto puntual de candy bar como retirado.
  // Cada producto tiene su propio flag: retirar el pochoclo no invalida
  // la bebida del mismo pedido si todavía no la retiró.
  async validarProducto(entradaProductoId: number): Promise<{ error: string | null }> {
    const { data: item, error: errorBusqueda } = await this.supabaseService.client
      .from('entrada_productos')
      .select('id, qr_validado')
      .eq('id', entradaProductoId)
      .single();

    if (errorBusqueda || !item) {
      return { error: 'No se encontró el producto.' };
    }

    if (item.qr_validado) {
      return { error: 'Este producto ya fue retirado.' };
    }

    const { error } = await this.supabaseService.client
      .from('entrada_productos')
      .update({ qr_validado: true, qr_validado_at: new Date().toISOString() })
      .eq('id', entradaProductoId);

    if (!error) {
      await this.registrarLog('validar_qr', { entrada_producto_id: entradaProductoId, tipo: 'candy' });
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