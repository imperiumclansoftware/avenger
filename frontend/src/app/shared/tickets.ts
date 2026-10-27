import { TicketStatus, TicketType } from '../core/api/models';

export const TICKET_TYPES: { value: TicketType; label: string; description: string }[] = [
  { value: 'bug', label: 'Bug', description: 'Quelque chose ne fonctionne pas comme prévu.' },
  { value: 'feedback', label: 'Retour utilisateur', description: 'Un avis, une remarque, une question.' },
  { value: 'feature', label: 'Demande de fonctionnalité', description: 'Une idée pour améliorer le produit.' },
];

export const TICKET_STATUSES: { value: TicketStatus; label: string }[] = [
  { value: 'new', label: 'Nouveau' },
  { value: 'accepted', label: 'Accepté' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'resolved', label: 'Résolu' },
  { value: 'rejected', label: 'Refusé' },
  { value: 'closed', label: 'Fermé' },
];

export function statusLabel(status: TicketStatus): string {
  return TICKET_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function typeLabel(type: TicketType): string {
  return TICKET_TYPES.find((t) => t.value === type)?.label ?? type;
}
