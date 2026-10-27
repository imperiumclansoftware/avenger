export type TicketType = 'bug' | 'feedback' | 'feature';
export type TicketStatus = 'new' | 'accepted' | 'in_progress' | 'resolved' | 'rejected' | 'closed';

export interface Me {
  id: number;
  email: string;
  admin: boolean;
}

export interface AuthResponse {
  token: string;
}

/** Installation wizard: the first administrator */
export interface SetupPayload {
  code: string;
  email: string;
  password: string;
}

export interface ProductSummary {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  repositoryUrl: string | null;
  /** Relative to the app's base URL; null: the initial of the name is shown */
  iconUrl: string | null;
  published: boolean;
  updatedAt: string;
}

/** A product of the public list */
export interface ProductCard extends ProductSummary {
  wikiPageCount: number;
  openTicketCount: number;
}

export interface WikiPageSummary {
  id: number;
  slug: string;
  title: string;
  home: boolean;
}

export interface WikiPage extends WikiPageSummary {
  content: string;
  updatedAt: string;
}

export interface TicketQueue {
  type: TicketType;
  name: string;
  openCount: number;
}

export interface Product extends ProductSummary {
  homepage: string;
  createdAt: string;
  wikiPages: WikiPageSummary[];
  queues: TicketQueue[];
}

export interface ProductPayload {
  name: string;
  slug: string | null;
  tagline: string;
  homepage: string;
  repositoryUrl: string | null;
  published: boolean;
}

export interface WikiPagePayload {
  title: string;
  slug: string | null;
  content: string;
}

export interface Ticket {
  number: number;
  type: TicketType;
  queueName: string;
  title: string;
  description: string;
  status: TicketStatus;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTicket extends Ticket {
  id: number;
  authorEmail: string;
}

export interface TicketPayload {
  type: TicketType;
  title: string;
  description: string;
  authorName: string;
  authorEmail: string;
}

export interface TicketFilter {
  type?: TicketType | null;
  status?: TicketStatus | null;
}

/** Errors of the API (validation failures, not found…) */
export interface ApiProblem {
  title?: string;
  detail?: string;
  message?: string;
  violations?: { propertyPath: string; title: string }[];
}
