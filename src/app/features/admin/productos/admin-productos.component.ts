import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CandyService } from '../../../core/services/candy.service';
import { AdminCandyService, CandyCategoria } from '../../../core/services/admin-candy.service';
import { CandyProducto, Combo } from '../../../models/candy.model';

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-productos.component.html',
  styleUrl: './admin-productos.component.scss'
})
export class AdminProductosComponent implements OnInit {
  private fb = inject(FormBuilder);

  productos = signal<CandyProducto[]>([]);
  categorias = signal<CandyCategoria[]>([]);
  combos = signal<Combo[]>([]);
  error = signal<string | null>(null);

  formCategoria = this.fb.group({
    nombre: ['', Validators.required]
  });

  formProducto = this.fb.group({
    nombre: ['', Validators.required],
    precio: [0, [Validators.required, Validators.min(0)]],
    categoriaId: [null as number | null, Validators.required],
    puntosCanje: [null as number | null]
  });

  formCombo = this.fb.group({
    nombre: ['', Validators.required],
    precioFijo: [0, [Validators.required, Validators.min(0)]]
  });

  constructor(
    private candyService: CandyService,
    private adminCandyService: AdminCandyService
  ) {}

  async ngOnInit() {
    await this.cargarTodo();
  }

  private async cargarTodo() {
    this.productos.set(await this.candyService.obtenerProductos());
    this.combos.set(await this.candyService.obtenerCombos());
    this.categorias.set(await this.adminCandyService.obtenerCategorias());
  }

  async guardarCategoria() {
    if (this.formCategoria.invalid) return;
    const { error } = await this.adminCandyService.crearCategoria(this.formCategoria.value.nombre!);
    if (error) { this.error.set(error); return; }
    this.formCategoria.reset();
    await this.cargarTodo();
  }

  async guardarProducto() {
    if (this.formProducto.invalid) return;
    const v = this.formProducto.value;
    const { error } = await this.adminCandyService.crearProducto(v.nombre!, v.precio!, v.categoriaId!, v.puntosCanje ?? null);
    if (error) { this.error.set(error); return; }
    this.formProducto.reset();
    await this.cargarTodo();
  }

  async guardarCombo() {
    if (this.formCombo.invalid) return;
    const v = this.formCombo.value;
    const { error } = await this.adminCandyService.crearCombo(v.nombre!, v.precioFijo!);
    if (error) { this.error.set(error); return; }
    this.formCombo.reset();
    await this.cargarTodo();
  }
}