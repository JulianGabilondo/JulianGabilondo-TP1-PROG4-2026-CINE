import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  email = signal('');
  password = signal('');
  error = signal<string | null>(null);
  cargando = signal(false);

  constructor(private authService: AuthService, private router: Router) {}

  async ingresar() {
    this.cargando.set(true);
    this.error.set(null);

    const { error } = await this.authService.login(this.email(), this.password());

    this.cargando.set(false);

    if (error) {
      this.error.set(error);
      return;
    }

    this.router.navigate(['/']);
  }
}