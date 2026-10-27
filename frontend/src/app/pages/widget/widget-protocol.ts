import { TicketType } from '../../core/api/models';

/**
 * Messages between the ticket widget (this iframe page) and the app embedding it
 * (public/widget.js). Each side only accepts messages from the other's window and origin.
 */
export const WIDGET_SOURCE = 'avenger-widget';
export const HOST_SOURCE = 'avenger-host';

/** iframe → host */
export type WidgetMessage =
  | { source: typeof WIDGET_SOURCE; type: 'ready' }
  | { source: typeof WIDGET_SOURCE; type: 'resize'; height: number }
  | { source: typeof WIDGET_SOURCE; type: 'created'; ticket: { number: number; type: TicketType; title: string; url: string } }
  | { source: typeof WIDGET_SOURCE; type: 'close' };

/** host → iframe */
export interface HostPrefillMessage {
  source: typeof HOST_SOURCE;
  type: 'prefill';
  prefill: { type?: TicketType | null; name?: string | null; email?: string | null };
  /** Page of the host app the visitor writes from, appended to the ticket */
  pageUrl?: string | null;
}

/** The origin of an http(s) URL, or null (opaque origins, other schemes, invalid URLs are refused). */
export function httpOrigin(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin !== 'null' ? url.origin : null;
  } catch {
    return null;
  }
}
