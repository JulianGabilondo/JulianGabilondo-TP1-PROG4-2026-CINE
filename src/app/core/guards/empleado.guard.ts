import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Protege /empleado. Nota: authService.esEmpleado() ya devuelve true
// también para admin, así que un admin puede entrar a validar QRs igual.
export const empleadoGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.esEmpleado()) {
    return true;
  }

  router.navigate(['/']);
  return false;
};