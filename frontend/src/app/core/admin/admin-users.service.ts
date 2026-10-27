import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Me } from '../api/models';

/** The administrators of the private area. */
@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);

  list(): Promise<Me[]> {
    return firstValueFrom(this.http.get<Me[]>('api/admin/users'));
  }

  create(email: string, password: string): Promise<Me> {
    return firstValueFrom(this.http.post<Me>('api/admin/users', { email, password }));
  }

  remove(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`api/admin/users/${id}`));
  }
}
