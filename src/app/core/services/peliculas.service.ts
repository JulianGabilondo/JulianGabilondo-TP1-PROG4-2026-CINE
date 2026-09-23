import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Pelicula {
  id: number;
  titulo: string;
  sinopsis: string;
  imagen_url: string;
  duracion_minutos: number;
  formato: '2d' | '3d' | '4d' | '5d';
  idioma: 'castellano' | 'subtitulada';
  restriccion_edad: number | null;
  fecha_estreno: string;
  precio_preventa: number | null;
  dias_preventa: number;
  activa: boolean;
  // Campos calculados que no vienen directo de la tabla `peliculas`,
  // se completan con joins/queries adicionales
  generos?: string[];
  promedio_estrellas?: number;
  entradas_vendidas?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PeliculasService {
  // Cache simple en memoria para el catálogo del home. No es reactividad
  // en tiempo real (a diferencia de las butacas), porque el catálogo
  // no cambia mientras el usuario navega una sesión de compra.
  private peliculasSignal = signal<Pelicula[]>([]);
  peliculas = this.peliculasSignal.asReadonly();

  constructor(private supabaseService: SupabaseService) {}

  // Trae el catálogo completo con géneros y promedio de estrellas ya resueltos.
  // Se usa una vista SQL (ver nota abajo) en vez de armar el join a mano acá.
  async cargarCatalogo(): Promise<void> {
    const { data, error } = await this.supabaseService.client
      .from('vista_peliculas_catalogo')
      .select('*')
      .eq('activa', true)
      .order('fecha_estreno', { ascending: false });

    if (!error && data) {
      this.peliculasSignal.set(data as Pelicula[]);
    }
  }

  // Top 3 más vendidas para el home. Se calcula en el cliente a partir del
  // catálogo ya cargado, para no pegarle una query aparte a Supabase.
  top3MasVendidas(): Pelicula[] {
    return [...this.peliculasSignal()]
      .sort((a, b) => (b.entradas_vendidas ?? 0) - (a.entradas_vendidas ?? 0))
      .slice(0, 3);
  }

  // Filtra en memoria por texto libre (título) y por género.
  // Con el volumen de datos de un cine (decenas de películas, no miles),
  // filtrar client-side es más simple que armar full-text search en Supabase.
  buscar(textoLibre: string, generoFiltro: string | null): Pelicula[] {
    return this.peliculasSignal().filter(p => {
      const coincideTexto = p.titulo.toLowerCase().includes(textoLibre.toLowerCase());
      const coincideGenero = !generoFiltro || (p.generos ?? []).includes(generoFiltro);
      return coincideTexto && coincideGenero;
    });
  }

  async obtenerPorId(id: number): Promise<Pelicula | null> {
    const { data, error } = await this.supabaseService.client
      .from('vista_peliculas_catalogo')
      .select('*')
      .eq('id', id)
      .single();

    return error ? null : (data as Pelicula);
  }

  async proximosEstrenos(): Promise<Pelicula[]> {
    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabaseService.client
      .from('vista_peliculas_catalogo')
      .select('*')
      .gt('fecha_estreno', hoy)
      .order('fecha_estreno', { ascending: true });

    return error ? [] : (data as Pelicula[]);
  }
}