import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Product,
  ProductCard,
  Ticket,
  TicketFilter,
  TicketPayload,
  WikiPage,
} from '../api/models';

/** Public area: published products, their wiki and their tickets. */
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

  list(): Promise<ProductCard[]> {
    return firstValueFrom(this.http.get<ProductCard[]>('api/products'));
  }

  get(slug: string): Promise<Product> {
    return firstValueFrom(this.http.get<Product>(`api/products/${slug}`));
  }

  wikiPage(slug: string, page: string): Promise<WikiPage> {
    return firstValueFrom(this.http.get<WikiPage>(`api/products/${slug}/wiki/${page}`));
  }

  tickets(slug: string, filter: TicketFilter = {}): Promise<Ticket[]> {
    return firstValueFrom(
      this.http.get<Ticket[]>(`api/products/${slug}/tickets`, { params: filterParams(filter) }),
    );
  }

  ticket(slug: string, number: number): Promise<Ticket> {
    return firstValueFrom(this.http.get<Ticket>(`api/products/${slug}/tickets/${number}`));
  }

  openTicket(slug: string, payload: TicketPayload): Promise<Ticket> {
    return firstValueFrom(this.http.post<Ticket>(`api/products/${slug}/tickets`, payload));
  }
}

export function filterParams(filter: TicketFilter): HttpParams {
  let params = new HttpParams();
  if (filter.type) {
    params = params.set('type', filter.type);
  }
  if (filter.status) {
    params = params.set('status', filter.status);
  }
  return params;
}
