import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { ButacaConEstado } from '../../models/butaca.model';
import * as QRCode from 'qrcode';
import jsPDF from 'jspdf';

export interface ItemCandyCarrito {
  producto_id: number;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface DatosCompra {
  funcionId: number;
  peliculaTitulo: string;
  salaNombre: string;
  fecha: string;
  horaInicio: string;
  butacas: ButacaConEstado[];
  precioBase: number;
  precioVip: number;
  candyCarrito: ItemCandyCarrito[];
  cuponId: number | null;
  porcentajeDescuento: number;
  creditoAUsar: number;
}

@Injectable({
  providedIn: 'root'
})
export class EntradasService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  calcularTotal(datos: DatosCompra): number {
    const totalButacas = datos.butacas.reduce(
      (suma, b) => suma + (b.tipo === 'vip' ? datos.precioVip : datos.precioBase),
      0
    );
    const totalCandy = datos.candyCarrito.reduce((suma, i) => suma + i.precio * i.cantidad, 0);
    const subtotal = totalButacas + totalCandy;
    const conDescuento = subtotal * (1 - datos.porcentajeDescuento / 100);
    return Math.max(0, conDescuento - datos.creditoAUsar);
  }

  // Confirma la compra: crea la entrada, las butacas asociadas y los productos,
  // genera el QR y el PDF, y libera las reservas temporales.
  async confirmarCompra(datos: DatosCompra): Promise<{ pdfBlob: Blob | null; error: string | null }> {
    const usuarioId = this.authService.perfil()?.id ?? null;
    const total = this.calcularTotal(datos);
    const qrCodigo = crypto.randomUUID();

    // 1. Crear la entrada (cabecera de la compra)
    const { data: entrada, error: errorEntrada } = await this.supabaseService.client
      .from('entradas')
      .insert({
        usuario_id: usuarioId,
        funcion_id: datos.funcionId,
        cupon_id: datos.cuponId,
        credito_usado: datos.creditoAUsar,
        total,
        qr_codigo: qrCodigo
      })
      .select()
      .single();

    if (errorEntrada || !entrada) {
      return { pdfBlob: null, error: 'No se pudo generar la compra. Puede que alguna butaca ya no esté disponible.' };
    }

    // 2. Insertar las butacas de esta entrada.
    // El UNIQUE(funcion_id, butaca_id) es la última línea de defensa contra doble venta:
    // si algo falla acá, ya perdimos la carrera contra otro comprador.
    const filasButacas = datos.butacas.map(b => ({
      entrada_id: entrada.id,
      funcion_id: datos.funcionId,
      butaca_id: b.id,
      precio: b.tipo === 'vip' ? datos.precioVip : datos.precioBase
    }));

    const { error: errorButacas } = await this.supabaseService.client
      .from('entrada_butacas')
      .insert(filasButacas);

    if (errorButacas) {
      // Rollback manual: Supabase no soporta transacciones multi-tabla desde el cliente,
      // así que si falló acá, borramos la entrada recién creada para no dejarla huérfana
      await this.supabaseService.client.from('entradas').delete().eq('id', entrada.id);
      return { pdfBlob: null, error: 'Una de las butacas seleccionadas ya fue vendida. Volvé a intentar.' };
    }

    // 3. Insertar productos de candy bar, si los hay
    if (datos.candyCarrito.length > 0) {
      const filasProductos = datos.candyCarrito.map(i => ({
        entrada_id: entrada.id,
        candy_producto_id: i.producto_id,
        cantidad: i.cantidad
      }));

      await this.supabaseService.client.from('entrada_productos').insert(filasProductos);
    }

    // 4. Descontar el crédito usado y marcar el cupón de bienvenida como usado, si aplica
    if (usuarioId) {
      await this.aplicarEfectosEnPerfil(usuarioId, datos, total);
    }

    // 5. Liberar las reservas temporales de este usuario para esta función
    await this.supabaseService.client
      .from('reservas_temporales')
      .delete()
      .eq('funcion_id', datos.funcionId);

    // 6. Generar el PDF con QR
    const pdfBlob = await this.generarPdf(qrCodigo, datos, total);

    return { pdfBlob, error: null };
  }

  private async aplicarEfectosEnPerfil(usuarioId: string, datos: DatosCompra, total: number) {
    const perfil = this.authService.perfil();
    if (!perfil) return;

    const puntosGanados = Math.floor(total); // 1 punto por peso gastado

    const actualizaciones: Record<string, unknown> = {
      credito_disponible: Math.max(0, perfil.credito_disponible - datos.creditoAUsar),
      puntos_acumulados: perfil.puntos_acumulados + puntosGanados
    };

    // Si usó el cupón de bienvenida, lo marcamos consumido para que no lo vuelva a ver disponible
    const cuponUsadoEsBienvenida = datos.cuponId !== null; // simplificado: se valida el tipo en el checkout antes de llegar acá
    if (cuponUsadoEsBienvenida) {
      actualizaciones['cupon_bienvenida_usado'] = true;
    }

    await this.supabaseService.client
      .from('perfiles')
      .update(actualizaciones)
      .eq('id', usuarioId);
  }

  // Genera un PDF simple con los datos de la entrada + el QR como imagen embebida
  private async generarPdf(qrCodigo: string, datos: DatosCompra, total: number): Promise<Blob> {
    const qrDataUrl = await QRCode.toDataURL(qrCodigo, { width: 300 });

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(datos.peliculaTitulo, 20, 20);

    doc.setFontSize(11);
    doc.text(`Sala: ${datos.salaNombre}`, 20, 32);
    doc.text(`Fecha: ${datos.fecha}  —  Hora: ${datos.horaInicio}`, 20, 39);

    const butacasTexto = datos.butacas.map(b => `${b.fila}${b.numero}${b.tipo === 'vip' ? ' (VIP)' : ''}`).join(', ');
    doc.text(`Butacas: ${butacasTexto}`, 20, 46);

    if (datos.candyCarrito.length > 0) {
      const candyTexto = datos.candyCarrito.map(i => `${i.cantidad}x ${i.nombre}`).join(', ');
      doc.text(`Candy bar: ${candyTexto}`, 20, 53);
    }

    doc.setFontSize(13);
    doc.text(`Total: $${total.toFixed(2)}`, 20, 65);

    // QR centrado abajo, es lo que se escanea en la puerta
    doc.addImage(qrDataUrl, 'PNG', 65, 80, 80, 80);
    doc.setFontSize(9);
    doc.text(`Código: ${qrCodigo}`, 65, 168);

    return doc.output('blob');
  }
}