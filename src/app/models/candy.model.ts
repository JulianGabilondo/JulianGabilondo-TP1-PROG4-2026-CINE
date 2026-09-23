export interface CandyProducto {
  id: number;
  categoria_id: number;
  nombre: string;
  precio: number;
  puntos_canje: number | null;
  activo: boolean;
}

export interface Combo {
  id: number;
  nombre: string;
  precio_fijo: number;
  destacado: boolean;
}

export interface Cupon {
  id: number;
  codigo: string | null;
  porcentaje_descuento: number;
  tipo: 'bienvenida' | 'edad_mayor_50' | 'promocional';
}