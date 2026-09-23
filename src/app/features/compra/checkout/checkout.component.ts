import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MapaButacasComponent } from '../mapa-butacas/mapa-butacas.component';
import { FuncionesService } from '../../../core/services/funciones.service';
import { CandyService } from '../../../core/services/candy.service';
import { CuponesService } from '../../../core/services/cupones.service';
import { EntradasService, ItemCandyCarrito, DatosCompra } from '../../../core/services/entradas.service';
import { AuthService } from '../../../core/services/auth.service';
import { ButacaConEstado } from '../../../models/butaca.model';
import { CandyProducto } from '../../../models/candy.model';
import { Funcion } from '../../../models/resena.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, MapaButacasComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit {
  funcion = signal<Funcion | null>(null);
  peliculaTitulo = signal('');
  restriccionEdad = signal<number | null>(null); // SPRINT: agregado para validar edad mínima en checkout
  salaId = signal<number>(0);
  salaNombre = signal('');

  butacasSeleccionadas = signal<ButacaConEstado[]>([]);
  productosCandy = signal<CandyProducto[]>([]);
  carritoCandy = signal<ItemCandyCarrito[]>([]);

  codigoCuponManual = signal('');
  cuponAplicado = signal<{ id: number; tipo: string; porcentaje: number } | null>(null);
  errorCupon = signal<string | null>(null);
  usarCredito = signal(false);

  procesando = signal(false);
  errorCompra = signal<string | null>(null);

  cuponesAutomaticos = computed(() => this.cuponesService.cuponesAutomaticosDisponibles());

  creditoDisponible = computed(() => this.authService.perfil()?.credito_disponible ?? 0);

  totalButacas = computed(() => {
    const func = this.funcion();
    if (!func) return 0;
    return this.butacasSeleccionadas().reduce(
      (suma, b) => suma + (b.tipo === 'vip' ? func.precio_vip : func.precio_base),
      0
    );
  });

  totalCandy = computed(() =>
    this.carritoCandy().reduce((suma, i) => suma + i.precio * i.cantidad, 0)
  );

  totalFinal = computed(() => {
    const subtotal = this.totalButacas() + this.totalCandy();
    const porcentaje = this.cuponAplicado()?.porcentaje ?? 0;
    const conDescuento = subtotal * (1 - porcentaje / 100);
    const credito = this.usarCredito() ? this.creditoDisponible() : 0;
    return Math.max(0, conDescuento - credito);
  });

  // Edad del usuario logueado, null si no hay sesión (compra anónima)
  edadUsuario = computed(() => {
    const perfil = this.authService.perfil();
    if (!perfil) return null;
    return this.calcularEdad(perfil.fecha_nacimiento);
  });

  // true si la función tiene restricción y el usuario logueado no la cumple.
  // Para compra anónima (edadUsuario === null) NO bloqueamos acá: no hay forma
  // de saber la edad de un anónimo, así que el control real queda para el
  // empleado en la puerta (pide documento al validar el QR).
  bloqueadoPorEdad = computed(() => {
    const restriccion = this.restriccionEdad();
    const edad = this.edadUsuario();
    return restriccion !== null && edad !== null && edad < restriccion;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private funcionesService: FuncionesService,
    private candyService: CandyService,
    private cuponesService: CuponesService,
    private entradasService: EntradasService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    const funcionId = Number(this.route.snapshot.paramMap.get('funcionId'));
    if (!funcionId) return;

    const [resultado, productos] = await Promise.all([
      this.funcionesService.obtenerPorId(funcionId),
      this.candyService.obtenerProductos()
    ]);

    this.productosCandy.set(productos);

    if (resultado) {
      this.funcion.set(resultado.funcion);
      this.peliculaTitulo.set(resultado.peliculaTitulo);
      this.restriccionEdad.set(resultado.restriccionEdad);
      this.salaId.set(resultado.salaId);
      this.salaNombre.set(resultado.salaNombre);
    } else {
      this.errorCompra.set('No se encontró la función seleccionada.');
    }
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

  onSeleccionButacasCambio(butacas: ButacaConEstado[]) {
    this.butacasSeleccionadas.set(butacas);
  }

  agregarCandy(producto: CandyProducto) {
    this.carritoCandy.update(carrito => {
      const existente = carrito.find(i => i.producto_id === producto.id);
      if (existente) {
        return carrito.map(i =>
          i.producto_id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...carrito, { producto_id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 }];
    });
  }

  quitarCandy(productoId: number) {
    this.carritoCandy.update(carrito =>
      carrito
        .map(i => i.producto_id === productoId ? { ...i, cantidad: i.cantidad - 1 } : i)
        .filter(i => i.cantidad > 0)
    );
  }

  async aplicarCuponAutomatico(tipo: string) {
    const cupon = await this.cuponesService.obtenerCuponPorTipo(tipo);
    if (cupon) {
      this.cuponAplicado.set({ id: cupon.id, tipo: cupon.tipo, porcentaje: cupon.porcentaje_descuento });
      this.errorCupon.set(null);
    }
  }

  async aplicarCuponManual() {
    const { cupon, error } = await this.cuponesService.buscarPorCodigo(this.codigoCuponManual());
    if (error || !cupon) {
      this.errorCupon.set(error);
      return;
    }
    this.cuponAplicado.set({ id: cupon.id, tipo: cupon.tipo, porcentaje: cupon.porcentaje_descuento });
    this.errorCupon.set(null);
  }

  async confirmarCompra() {
    const func = this.funcion();
    if (!func || this.butacasSeleccionadas().length === 0) {
      this.errorCompra.set('Seleccioná al menos una butaca para continuar.');
      return;
    }

    // SPRINT: bloqueo de compra si el usuario logueado no cumple la edad mínima
    if (this.bloqueadoPorEdad()) {
      this.errorCompra.set(`Esta función es apta para mayores de ${this.restriccionEdad()} años.`);
      return;
    }

    this.procesando.set(true);
    this.errorCompra.set(null);

    const datos: DatosCompra = {
      funcionId: func.id,
      peliculaTitulo: this.peliculaTitulo(),
      salaNombre: this.salaNombre(),
      fecha: func.fecha,
      horaInicio: func.hora_inicio,
      butacas: this.butacasSeleccionadas(),
      precioBase: func.precio_base,
      precioVip: func.precio_vip,
      candyCarrito: this.carritoCandy(),
      cuponId: this.cuponAplicado()?.id ?? null,
      porcentajeDescuento: this.cuponAplicado()?.porcentaje ?? 0,
      creditoAUsar: this.usarCredito() ? this.creditoDisponible() : 0
    };

    const { pdfBlob, error } = await this.entradasService.confirmarCompra(datos);

    this.procesando.set(false);

    if (error || !pdfBlob) {
      this.errorCompra.set(error ?? 'Ocurrió un error al confirmar la compra.');
      return;
    }

    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `entrada-${func.id}.pdf`;
    link.click();
    URL.revokeObjectURL(url);

    this.router.navigate(['/']);
  }
}