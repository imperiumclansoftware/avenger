import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AdminTicket,
  Product,
  ProductPayload,
  ProductSummary,
  TicketFilter,
  TicketStatus,
  TicketType,
  WikiPage,
  WikiPagePayload,
} from '../api/models';
import { filterParams } from './products.service';

/** Private area: products, published or not, their wiki and their tickets. */
@Injectable({ providedIn: 'root' })
export class AdminProductsService {
  private readonly http = inject(HttpClient);

  list(): Promise<ProductSummary[]> {
    return firstValueFrom(this.http.get<ProductSummary[]>('api/admin/products'));
  }

  get(id: number): Promise<Product> {
    return firstValueFrom(this.http.get<Product>(`api/admin/products/${id}`));
  }

  /** Creates the product along with its wiki and its ticket queues. */
  create(payload: ProductPayload): Promise<Product> {
    return firstValueFrom(this.http.post<Product>('api/admin/products', payload));
  }

  update(id: number, payload: ProductPayload): Promise<Product> {
    return firstValueFrom(this.http.put<Product>(`api/admin/products/${id}`, payload));
  }

  /** Replaces the product's icon (PNG, JPEG, WebP, GIF or SVG, 1 MB at most). */
  uploadIcon(id: number, icon: File): Promise<Product> {
    const body = new FormData();
    body.append('icon', icon);
    return firstValueFrom(this.http.post<Product>(`api/admin/products/${id}/icon`, body));
  }

  removeIcon(id: number): Promise<Product> {
    return firstValueFrom(this.http.delete<Product>(`api/admin/products/${id}/icon`));
  }

  remove(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`api/admin/products/${id}`));
  }

  wikiPage(productId: number, pageId: number): Promise<WikiPage> {
    return firstValueFrom(this.http.get<WikiPage>(`api/admin/products/${productId}/wiki/${pageId}`));
  }

  createWikiPage(productId: number, payload: WikiPagePayload): Promise<WikiPage> {
    return firstValueFrom(this.http.post<WikiPage>(`api/admin/products/${productId}/wiki`, payload));
  }

  updateWikiPage(productId: number, pageId: number, payload: WikiPagePayload): Promise<WikiPage> {
    return firstValueFrom(
      this.http.put<WikiPage>(`api/admin/products/${productId}/wiki/${pageId}`, payload),
    );
  }

  removeWikiPage(productId: number, pageId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`api/admin/products/${productId}/wiki/${pageId}`));
  }

  tickets(productId: number, filter: TicketFilter = {}): Promise<AdminTicket[]> {
    return firstValueFrom(
      this.http.get<AdminTicket[]>(`api/admin/products/${productId}/tickets`, {
        params: filterParams(filter),
      }),
    );
  }

  updateTicket(
    productId: number,
    number: number,
    change: { status: TicketStatus; type: TicketType },
  ): Promise<AdminTicket> {
    return firstValueFrom(
      this.http.put<AdminTicket>(`api/admin/products/${productId}/tickets/${number}`, change),
    );
  }

  removeTicket(productId: number, number: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`api/admin/products/${productId}/tickets/${number}`),
    );
  }
}
