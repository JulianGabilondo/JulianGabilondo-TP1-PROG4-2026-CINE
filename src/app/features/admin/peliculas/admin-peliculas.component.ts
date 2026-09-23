import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PeliculasService, Pelicula } from '../../../core/services/peliculas.service';
import { AdminPeliculasService } from '../../../core/services/admin-peliculas.service';

@Component({
  selector: 'app-admin-peliculas',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-peliculas.component.html',
  styleUrl: './admin-peliculas.component.scss'
})
export class AdminPeliculasComponent implements OnInit {
  private fb = inject(FormBuilder);

  peliculas = signal<Pelicula[]>([]);
  editandoId = signal<number | null>(null);
  archivoImagen = signal<File | null>(null);
  guardando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    titulo: ['', Validators.required],
    sinopsis: ['', Validators.required],
    duracionMinutos: [90, [Validators.required, Validators.min(1)]],
    formato: ['2d', Validators.required],
    idioma: ['castellano', Validators.required],
    restriccionEdad: [null as number | null],
    fechaEstreno: ['', Validators.required],
    precioPreventa: [null as number | null],
    diasPreventa: [7],
    generosTexto: ['', Validators.required]
  });

  constructor(
    private peliculasService: PeliculasService,
    private adminPeliculasService: AdminPeliculasService
  ) {}

  async ngOnInit() {
    await this.cargarPeliculas();
  }

  private async cargarPeliculas() {
    await this.peliculasService.cargarCatalogo();
    this.peliculas.set(this.peliculasService.peliculas());
  }

  onArchivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    this.archivoImagen.set(input.files?.[0] ?? null);
  }

  editar(pelicula: Pelicula) {
    this.editandoId.set(pelicula.id);
    this.form.patchValue({
      titulo: pelicula.titulo,
      sinopsis: pelicula.sinopsis,
      duracionMinutos: pelicula.duracion_minutos,
      formato: pelicula.formato,
      idioma: pelicula.idioma,
      restriccionEdad: pelicula.restriccion_edad,
      fechaEstreno: pelicula.fecha_estreno,
      precioPreventa: pelicula.precio_preventa,
      diasPreventa: pelicula.dias_preventa,
      generosTexto: (pelicula.generos ?? []).join(', ')
    });
  }

  cancelarEdicion() {
    this.editandoId.set(null);
    this.form.reset({ formato: '2d', idioma: 'castellano', diasPreventa: 7 });
    this.archivoImagen.set(null);
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    const valores = this.form.value;
    const generos = (valores.generosTexto ?? '').split(',').map(g => g.trim()).filter(g => g.length > 0);

    let imagenUrl = this.peliculas().find(p => p.id === this.editandoId())?.imagen_url ?? '';

    if (this.archivoImagen()) {
      const { url, error } = await this.adminPeliculasService.subirImagen(this.archivoImagen()!);
      if (error || !url) {
        this.error.set(error ?? 'No se pudo subir la imagen');
        this.guardando.set(false);
        return;
      }
      imagenUrl = url;
    }

    if (!imagenUrl) {
      this.error.set('Falta subir una imagen para la película.');
      this.guardando.set(false);
      return;
    }

    const datos = {
      titulo: valores.titulo!,
      sinopsis: valores.sinopsis!,
      duracionMinutos: valores.duracionMinutos!,
      formato: valores.formato as '2d' | '3d' | '4d' | '5d',
      idioma: valores.idioma as 'castellano' | 'subtitulada',
      restriccionEdad: valores.restriccionEdad ?? null,
      fechaEstreno: valores.fechaEstreno!,
      precioPreventa: valores.precioPreventa ?? null,
      diasPreventa: valores.diasPreventa ?? 7,
      generos
    };

    const idActual = this.editandoId();
    const resultado = idActual
      ? await this.adminPeliculasService.actualizar(idActual, datos, imagenUrl)
      : await this.adminPeliculasService.crear(datos, imagenUrl);

    this.guardando.set(false);

    if (resultado.error) {
      this.error.set(resultado.error);
      return;
    }

    this.cancelarEdicion();
    await this.cargarPeliculas();
  }

  async desactivar(id: number) {
    if (!confirm('¿Ocultar esta película del catálogo?')) return;
    await this.adminPeliculasService.desactivar(id);
    await this.cargarPeliculas();
  }
}