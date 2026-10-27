# Widget de dépôt de tickets

Le widget ajoute un bouton **« Signaler un problème »** à votre application. Vos utilisateurs ouvrent un ticket sans quitter l'application ni créer de compte. Le formulaire s'ouvre dans une fenêtre par-dessus l'application, et les tickets arrivent dans l'onglet *Tickets* du produit, dans Avenger.

Dans Avenger, l'onglet **Intégration** de chaque produit (espace d'administration) donne ce même code, déjà rempli avec l'adresse de votre Avenger et celle du produit, ainsi qu'un lien pour essayer le widget.

Dans les exemples, remplacez `https://avenger.example.org` par l'adresse de votre Avenger et `mon-produit` par l'adresse du produit (`/produits/mon-produit`). Le produit doit être **publié**.

## 1. Le code minimal

Juste avant `</body>` :

```html
<script src="https://avenger.example.org/widget.js" data-product="mon-produit" defer></script>
```

Le bouton apparaît en bas à droite. Avenger n'est contacté qu'à l'ouverture du formulaire.

## 2. Pré-remplir l'utilisateur connecté

```html
<script src="https://avenger.example.org/widget.js" data-product="mon-produit" defer></script>
<script>
  // Une fois l'utilisateur connu (après la connexion par exemple)
  window.addEventListener('load', () => {
    window.AvengerTickets?.set({ name: utilisateur.nom, email: utilisateur.email });
  });
</script>
```

Le nom et l'e-mail ne passent pas par l'adresse de l'iframe, seulement par un message réservé à l'origine d'Avenger. Ils ne remplissent que les champs encore vides.

## 3. Utiliser votre propre bouton

```html
<script src="https://avenger.example.org/widget.js" data-product="mon-produit" data-button="false" defer></script>

<button type="button" onclick="AvengerTickets.open({ type: 'bug' })">Signaler un problème</button>
```

## 4. Dans une application Angular

```ts
import { Injectable } from '@angular/core';

declare global {
  interface Window {
    AvengerTickets?: {
      open(options?: { type?: 'bug' | 'feedback' | 'feature'; name?: string; email?: string }): void;
      close(): void;
      set(options: { type?: string; name?: string; email?: string }): void;
    };
  }
}

/** Ouvre le formulaire de ticket d'Avenger ; le script n'est chargé qu'au premier appel. */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private loading?: Promise<void>;

  async open(user?: { name: string; email: string | null }): Promise<void> {
    await this.load();
    window.AvengerTickets?.open({ name: user?.name, email: user?.email ?? undefined });
  }

  private load(): Promise<void> {
    return (this.loading ??= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://avenger.example.org/widget.js';
      script.dataset['product'] = 'mon-produit';
      script.dataset['button'] = 'false';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Avenger injoignable'));
      document.head.append(script);
    }));
  }
}
```

## Options

| Attribut | Valeur | Rôle |
|---|---|---|
| `data-product` | adresse du produit | **Obligatoire** : le produit qui reçoit les tickets |
| `data-type` | `bug`, `feedback`, `feature` | File proposée par défaut (`bug` sinon) |
| `data-label` | texte | Texte du bouton et titre de la fenêtre (« Signaler un problème ») |
| `data-position` | `bottom-right`, `bottom-left` | Coin du bouton flottant |
| `data-button` | `false` | Pas de bouton flottant : ouverture par `AvengerTickets.open()` |
| `data-name`, `data-email` | texte | Pré-remplissage de l'auteur, pour une page générée côté serveur |
| `data-page-url` | `false` | Ne pas joindre au ticket l'adresse de la page |

Par défaut, l'adresse de la page d'où l'utilisateur écrit est jointe à la fin de la description, **sans paramètres ni fragment** (ils peuvent contenir des jetons). Le formulaire l'indique à l'utilisateur.

## API JavaScript

| Méthode | Rôle |
|---|---|
| `AvengerTickets.open({ type, name, email })` | Ouvre le formulaire ; les options sont facultatives |
| `AvengerTickets.set({ type, name, email })` | Change le pré-remplissage, par exemple après la connexion |
| `AvengerTickets.close()` | Ferme le formulaire |

Après chaque envoi, la page reçoit un événement :

```js
window.addEventListener('avenger:ticket-created', (event) => {
  // event.detail : { number, type, title, url }
  console.log('Ticket ouvert', event.detail.number, event.detail.url);
});
```

Fermer la fenêtre sans envoyer garde le brouillon ; après un envoi, la réouverture présente un formulaire vierge.

## Sécurité

- Le formulaire est servi par Avenger dans un **iframe** isolé (`sandbox`) : il n'a accès ni aux données ni aux cookies de votre application, et ne peut pas la rediriger.
- Les deux côtés n'acceptent que les messages de la **fenêtre et de l'origine attendues** ; l'iframe n'écrit qu'à l'origine de votre page, jamais à `*`.
- Le bouton et la fenêtre sont dans un Shadow DOM fermé : ni vos styles ni vos scripts n'interfèrent avec eux.
- L'envoi est limité à 10 tickets par quart d'heure et par adresse IP, comme sur le site public.

Si votre application impose une politique de sécurité du contenu (CSP), autorisez Avenger :

```
Content-Security-Policy: script-src 'self' https://avenger.example.org; frame-src https://avenger.example.org
```

Côté Avenger, les pages `/widget/…` doivent pouvoir être affichées dans un iframe : n'ajoutez pas d'en-tête `X-Frame-Options` ou `frame-ancestors` qui l'interdirait.

## Fonctionnement

```
Votre application                                   Avenger
┌──────────────────────────────┐                   ┌──────────────────────────────┐
│ widget.js : bouton + <dialog>│  iframe            │ /widget/mon-produit          │
│                              │ ────────────────►  │ formulaire de ticket         │
│  ◄─ ready / resize / created / close ──────────── │                              │
│  ── prefill (nom, e-mail, page) ────────────────► │ POST /api/products/…/tickets │
└──────────────────────────────┘   postMessage      └──────────────────────────────┘
```

| Sens | Message | Contenu |
|---|---|---|
| Avenger → application | `ready` | Le formulaire est prêt à recevoir le pré-remplissage |
| Avenger → application | `resize` | Hauteur du contenu, pour ajuster la fenêtre |
| Avenger → application | `created` | `{ number, type, title, url }` du ticket ouvert |
| Avenger → application | `close` | Bouton « Fermer », ou Échap dans le formulaire |
| application → Avenger | `prefill` | `{ type, name, email }` et l'adresse de la page |

Code : `frontend/public/widget.js` (script intégré), `frontend/src/app/pages/widget/` (formulaire dans l'iframe), `frontend/public/widget-demo.html` (page d'essai).
