import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('avenger.token', 'jwt');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => localStorage.removeItem('avenger.token'));

  it('sends the token to the private area only', () => {
    http.get('api/admin/products').subscribe();
    http.get('api/products').subscribe();

    expect(backend.expectOne('api/admin/products').request.headers.get('Authorization')).toBe('Bearer jwt');
    expect(backend.expectOne('api/products').request.headers.has('Authorization')).toBe(false);
  });
});
