export type TipoButaca = 'normal' | 'accesible' | 'vip';

export interface Butaca {
  id: number;
  sala_id: number;
  fila: string;
  numero: number;
  tipo: TipoButaca;
}

// Estado calculado en el frontend, no viene directo de una tabla
export type EstadoButaca = 'libre' | 'reservada' | 'vendida' | 'mia';

export interface ButacaConEstado extends Butaca {
  estado: EstadoButaca;
}
