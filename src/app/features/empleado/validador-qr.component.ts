import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ValidacionQrService, ResultadoValidacion } from '../../core/services/validacion-qr.service';

@Component({
  selector: 'app-validador-qr',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './validador-qr.component.html',
  styleUrl: './validador-qr.component.scss'
})
export class ValidadorQrComponent {
  codigoIngresado = signal('');
  resultado = signal<ResultadoValidacion | null>(null);
  buscando = signal(false);
  mensaje = signal<string | null>(null);

  constructor(private validacionQrService: ValidacionQrService) {}

  // Se llama tanto al tipear el código a mano como al leerlo desde un lector
  // físico de QR (que en general funciona como un teclado que "tipea" el código)
  async buscar() {
    if (!this.codigoIngresado().trim()) return;

    this.buscando.set(true);
    this.mensaje.set(null);
    this.resultado.set(await this.validacionQrService.buscarPorCodigo(this.codigoIngresado()));
    this.buscando.set(false);
  }

  async confirmarEntrada() {
    const { error } = await this.validacionQrService.validarEntrada(this.codigoIngresado());

    if (error) {
      this.mensaje.set(error);
      return;
    }

    this.mensaje.set('Entrada validada correctamente.');
    await this.buscar(); // refresca el estado en pantalla
  }

  async confirmarProducto(entradaProductoId: number) {
    const { error } = await this.validacionQrService.validarProducto(entradaProductoId);

    if (error) {
      this.mensaje.set(error);
      return;
    }

    this.mensaje.set('Producto entregado.');
    await this.buscar();
  }

  limpiar() {
    this.codigoIngresado.set('');
    this.resultado.set(null);
    this.mensaje.set(null);
  }
}