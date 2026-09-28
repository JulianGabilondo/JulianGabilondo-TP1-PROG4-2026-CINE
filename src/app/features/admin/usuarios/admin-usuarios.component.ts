import { Component, OnInit, signal } from '@angular/core';
import { AdminUsuariosService, UsuarioAdmin } from '../../../core/services/admin-usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import { RolUsuario } from '../../../models/usuario.model';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [],
  templateUrl: './admin-usuarios.component.html'
})
export class AdminUsuariosComponent implements OnInit {
  usuarios = signal<UsuarioAdmin[]>([]);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  constructor(
    private adminUsuariosService: AdminUsuariosService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    this.usuarios.set(await this.adminUsuariosService.listar());
  }

  async onCambioRol(usuario: UsuarioAdmin, evento: Event) {
    const nuevoRol = (evento.target as HTMLSelectElement).value as RolUsuario;

    this.mensaje.set(null);
    this.error.set(null);

    const { error } = await this.adminUsuariosService.cambiarRol(usuario.id, nuevoRol);

    if (error) {
      this.error.set(error);
    } else {
      this.mensaje.set(`Rol de ${usuario.nombre} ${usuario.apellido} actualizado a ${nuevoRol}.`);
    }

    this.usuarios.set(await this.adminUsuariosService.listar());
  }
}