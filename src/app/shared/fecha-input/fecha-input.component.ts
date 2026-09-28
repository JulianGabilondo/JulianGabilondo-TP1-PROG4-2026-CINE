import { Component, forwardRef, signal } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

@Component({
  selector: 'app-fecha-input',
  standalone: true,
  imports: [],
  templateUrl: './fecha-input.component.html',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FechaInputComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => FechaInputComponent), multi: true }
  ]
})
export class FechaInputComponent implements ControlValueAccessor, Validator {
  valorMostrado = signal(''); // lo que ve el usuario, en formato DD/MM/AAAA
  deshabilitado = signal(false);

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  // El formulario sigue guardando ISO (YYYY-MM-DD) — es lo que ya espera Supabase,
  // así que este componente es "invisible" para el resto del código
  writeValue(valorIso: string | null): void {
    if (!valorIso) {
      this.valorMostrado.set('');
      return;
    }
    const [anio, mes, dia] = valorIso.split('-');
    this.valorMostrado.set(`${dia}/${mes}/${anio}`);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }

  // Se dispara en cada tecla: descarta todo lo que no sea número
  // y va insertando las barras solo, sin que el usuario tenga que tipearlas
  onInput(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const soloNumeros = input.value.replace(/\D/g, '').slice(0, 8);

    let formateado = soloNumeros;
    if (soloNumeros.length > 4) {
      formateado = `${soloNumeros.slice(0, 2)}/${soloNumeros.slice(2, 4)}/${soloNumeros.slice(4)}`;
    } else if (soloNumeros.length > 2) {
      formateado = `${soloNumeros.slice(0, 2)}/${soloNumeros.slice(2)}`;
    }

    this.valorMostrado.set(formateado);
    input.value = formateado;

    this.onChange(this.aIso(formateado)); // null mientras la fecha no esté completa/sea válida
  }

  onBlur() {
    this.onTouched();
  }

  // Convierte "DD/MM/AAAA" a "AAAA-MM-DD". Devuelve null si el formato
  // está incompleto o si es una fecha que no existe (ej: 31/02)
  private aIso(valor: string): string | null {
    const match = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    const dia = Number(match[1]);
    const mes = Number(match[2]);
    const anio = Number(match[3]);

    const fecha = new Date(anio, mes - 1, dia);
    // Si JS "corrige" la fecha (31/02 pasa a convertirse en marzo), no era válida
    const esValida = fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;

    return esValida ? `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` : null;
  }

  // Se registra como NG_VALIDATORS: si hay texto pero no forma una fecha
  // válida, marca el control como inválido (además de required, que se
  // sigue manejando aparte en cada formulario)
  validate(control: AbstractControl): ValidationErrors | null {
    if (!this.valorMostrado()) return null;
    return this.aIso(this.valorMostrado()) ? null : { fechaInvalida: true };
  }
}