import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.scss'
})
export class RegistroComponent {
  private fb = inject(FormBuilder);

  error = signal<string | null>(null);
  cargando = signal(false);
  requiereConfirmacion = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    fecha_nacimiento: ['', Validators.required],
    tipo_sangre: [''],
    color_ojos: [''],
    dias_vacaciones: [null as number | null]
  });

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // Devuelve el mensaje de error específico de un campo, o null si está OK.
  // Se llama desde el HTML para mostrar el error debajo de cada input.
  errorDe(campo: string): string | null {
    const control = this.form.get(campo);
    if (!control || !control.touched || !control.errors) return null;

    if (control.errors['required']) return 'Este campo es obligatorio.';
    if (control.errors['email']) return 'El email no tiene un formato válido.';
    if (control.errors['minlength']) {
      const requerido = control.errors['minlength'].requiredLength;
      return `Necesita al menos ${requerido} caracteres.`;
    }

    return 'Este campo no es válido.';
  }

  async registrarse() {
    if (this.form.invalid) {
      this.form.markAllAsTouched(); // fuerza que se muestren todos los errores de campo a la vez
      this.error.set('Revisá los campos marcados en rojo antes de continuar.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    const v = this.form.value;

    const { error } = await this.authService.registrarse({
      email: v.email!,
      password: v.password!,
      nombre: v.nombre!,
      apellido: v.apellido!,
      fecha_nacimiento: v.fecha_nacimiento!,
      tipo_sangre: v.tipo_sangre || undefined,
      color_ojos: v.color_ojos || undefined,
      dias_vacaciones: v.dias_vacaciones ?? undefined
    });

    this.cargando.set(false);

    if (error) {
      this.error.set(error);
      return;
    }

    if (this.authService.estaLogueado()) {
      this.router.navigate(['/']);
    } else {
      this.requiereConfirmacion.set(true);
    }
  }
}