import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PeliculasService, Pelicula } from '../../../core/services/peliculas.service';
import { FuncionesAdminService, FuncionAdmin } from '../../../core/services/funciones-admin.service';
import { SalasService } from '../../../core/services/salas.service';
import { Sala } from '../../../models/sala.model';

@Component({
  selector: 'app-admin-funciones',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-funciones.component.html',
  styleUrl: './admin-funciones.component.scss'
})
export class AdminFuncionesComponent implements OnInit {
  // inject() en vez de constructor injection: se resuelve antes de que
  // se evalúen los campos de clase, así form.get de abajo no falla
  private fb = inject(FormBuilder);

  peliculas = signal<Pelicula[]>([]);
  salas = signal<Sala[]>([]);
  funciones = signal<FuncionAdmin[]>([]);

  guardando = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);

  form = this.fb.group({
    peliculaId: [null as number | null, Validators.required],
    fecha: ['', Validators.required],
    horaInicio: ['', Validators.required],
    precioBase: [1500, [Validators.required, Validators.min(0)]],
    precioVip: [2200, [Validators.required, Validators.min(0)]]
  });

  peliculaSeleccionada = computed(() => {
    const id = this.form.get('peliculaId')?.value;
    return this.peliculas().find(p => p.id === id) ?? null;
  });

  constructor(
    private peliculasService: PeliculasService,
    private funcionesAdminService: FuncionesAdminService,
    private salasService: SalasService
  ) {}

  async ngOnInit() {
    await this.peliculasService.cargarCatalogo();
    this.peliculas.set(this.peliculasService.peliculas());
    this.salas.set(await this.salasService.obtenerTodas());
    await this.cargarFunciones();
  }

  private async cargarFunciones() {
    this.funciones.set(await this.funcionesAdminService.listar());
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const peli = this.peliculaSeleccionada();
    if (!peli) return;

    this.guardando.set(true);
    this.error.set(null);
    this.exito.set(null);

    const valores = this.form.value;

    const { error } = await this.funcionesAdminService.crearFuncion({
      peliculaId: peli.id,
      duracionMinutos: peli.duracion_minutos,
      fecha: valores.fecha!,
      horaInicio: valores.horaInicio!,
      precioBase: valores.precioBase!,
      precioVip: valores.precioVip!
    });

    this.guardando.set(false);

    if (error) {
      this.error.set(error);
      return;
    }

    this.exito.set('Función creada. La sala se asignó automáticamente.');
    this.form.reset({ precioBase: 1500, precioVip: 2200 });
    await this.cargarFunciones();
  }
}