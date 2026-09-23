import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { GenerosService } from './generos.service';

export interface DatosPelicula {
  titulo: string;
  sinopsis: string;
  duracionMinutos: number;
  formato: '2d' | '3d' | '4d' | '5d';
  idioma: 'castellano' | 'subtitulada';
  restriccionEdad: number | null;
  fechaEstreno: string;
  precioPreventa: number | null;
  diasPreventa: number;
  generos: string[]; // nombres, no ids — se resuelven/crean acá adentro
}

@Injectable({
  providedIn: 'root'
})
export class AdminPeliculasService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private generosService: GenerosService
  ) {}

  // Sube el poster a Supabase Storage y devuelve la URL pública.
  // Se llama antes de crear/actualizar la película, para tener la URL lista.
  async subirImagen(archivo: File): Promise<{ url: string | null; error: string | null }> {
    const nombreArchivo = `${crypto.randomUUID()}-${archivo.name}`;

    const { error } = await this.supabaseService.client.storage
      .from('posters') // bucket que hay que crear una vez desde el dashboard de Supabase
      .upload(nombreArchivo, archivo);

    if (error) {
      return { url: null, error: error.message };
    }

    const { data } = this.supabaseService.client.storage
      .from('posters')
      .getPublicUrl(nombreArchivo);

    return { url: data.publicUrl, error: null };
  }

  async crear(datos: DatosPelicula, imagenUrl: string): Promise<{ id: number | null; error: string | null }> {
    const { data: pelicula, error } = await this.supabaseService.client
      .from('peliculas')
      .insert({
        titulo: datos.titulo,
        sinopsis: datos.sinopsis,
        imagen_url: imagenUrl,
        duracion_minutos: datos.duracionMinutos,
        formato: datos.formato,
        idioma: datos.idioma,
        restriccion_edad: datos.restriccionEdad,
        fecha_estreno: datos.fechaEstreno,
        precio_preventa: datos.precioPreventa,
        dias_preventa: datos.diasPreventa
      })
      .select()
      .single();

    if (error || !pelicula) {
      return { id: null, error: error?.message ?? 'No se pudo crear la película' };
    }

    await this.asociarGeneros(pelicula.id, datos.generos);
    await this.registrarLog('crear_pelicula', { pelicula_id: pelicula.id, titulo: datos.titulo });

    return { id: pelicula.id, error: null };
  }

  async actualizar(id: number, datos: DatosPelicula, imagenUrl: string): Promise<{ error: string | null }> {
    const { error } = await this.supabaseService.client
      .from('peliculas')
      .update({
        titulo: datos.titulo,
        sinopsis: datos.sinopsis,
        imagen_url: imagenUrl,
        duracion_minutos: datos.duracionMinutos,
        formato: datos.formato,
        idioma: datos.idioma,
        restriccion_edad: datos.restriccionEdad,
        fecha_estreno: datos.fechaEstreno,
        precio_preventa: datos.precioPreventa,
        dias_preventa: datos.diasPreventa
      })
      .eq('id', id);

    if (error) return { error: error.message };

    // Reemplazo simple: borro todas las relaciones previas y creo las nuevas.
    // Para la cantidad de géneros por película (unos pocos), es más simple
    // que calcular el diff entre lista vieja y nueva.
    await this.supabaseService.client.from('pelicula_generos').delete().eq('pelicula_id', id);
    await this.asociarGeneros(id, datos.generos);

    await this.registrarLog('modificar_pelicula', { pelicula_id: id });
    return { error: null };
  }

  // "Eliminar" en realidad desactiva (activa = false), para no romper
  // el historial de entradas/reseñas ya asociadas a esa película
  async desactivar(id: number): Promise<{ error: string | null }> {
    const { error } = await this.supabaseService.client
      .from('peliculas')
      .update({ activa: false })
      .eq('id', id);

    if (!error) {
      await this.registrarLog('desactivar_pelicula', { pelicula_id: id });
    }

    return { error: error?.message ?? null };
  }

  private async asociarGeneros(peliculaId: number, nombresGeneros: string[]) {
    for (const nombre of nombresGeneros) {
      const genero = await this.generosService.obtenerOCrear(nombre.trim());
      if (genero) {
        await this.supabaseService.client
          .from('pelicula_generos')
          .insert({ pelicula_id: peliculaId, genero_id: genero.id });
      }
    }
  }

  private async registrarLog(accion: string, detalle: Record<string, unknown>) {
    const usuarioId = this.authService.perfil()?.id;
    if (!usuarioId) return;

    await this.supabaseService.client
      .from('log_actividad')
      .insert({ usuario_id: usuarioId, accion, detalle });
  }
}