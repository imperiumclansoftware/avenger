import { Routes } from '@angular/router';
import { adminGuard, guestGuard, setupGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  // Public area
  {
    path: '',
    loadComponent: () => import('./pages/public/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        title: 'Avenger — Projets open source',
        loadComponent: () => import('./pages/public/product-list.page').then((m) => m.ProductListPage),
      },
      {
        path: 'produits/:slug',
        loadComponent: () => import('./pages/public/product-layout').then((m) => m.ProductLayout),
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/public/product-home.page').then((m) => m.ProductHomePage),
          },
          { path: 'wiki', pathMatch: 'full', redirectTo: 'wiki/accueil' },
          {
            path: 'wiki/:page',
            loadComponent: () => import('./pages/public/wiki.page').then((m) => m.WikiPageComponent),
          },
          {
            path: 'tickets',
            loadComponent: () => import('./pages/public/ticket-list.page').then((m) => m.TicketListPage),
          },
          {
            path: 'tickets/nouveau',
            loadComponent: () => import('./pages/public/ticket-new.page').then((m) => m.TicketNewPage),
          },
          {
            path: 'tickets/:number',
            loadComponent: () =>
              import('./pages/public/ticket-detail.page').then((m) => m.TicketDetailPage),
          },
        ],
      },
    ],
  },

  // Ticket widget embedded by other apps (public/widget.js), in an iframe
  {
    path: 'widget/:slug',
    title: 'Signaler un problème',
    loadComponent: () => import('./pages/widget/widget.page').then((m) => m.WidgetPage),
  },

  // Installation wizard: the first administrator, with the code shown on the server
  {
    path: 'installation',
    title: 'Installation — Avenger',
    canActivate: [setupGuard],
    loadComponent: () => import('./pages/admin/setup.page').then((m) => m.SetupPage),
  },

  // Private area
  {
    path: 'admin/connexion',
    title: 'Connexion — Avenger',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/admin/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: '',
        title: 'Produits — Administration',
        loadComponent: () =>
          import('./pages/admin/admin-products.page').then((m) => m.AdminProductsPage),
      },
      {
        path: 'utilisateurs',
        title: 'Utilisateurs — Administration',
        loadComponent: () => import('./pages/admin/admin-users.page').then((m) => m.AdminUsersPage),
      },
      {
        path: 'email',
        title: 'E-mail — Administration',
        loadComponent: () => import('./pages/admin/admin-email.page').then((m) => m.AdminEmailPage),
      },
      {
        path: 'compte',
        title: 'Mon compte — Administration',
        loadComponent: () => import('./pages/admin/account.page').then((m) => m.AccountPage),
      },
      {
        path: 'produits/nouveau',
        title: 'Nouveau produit — Administration',
        loadComponent: () =>
          import('./pages/admin/product-form.page').then((m) => m.ProductFormPage),
      },
      {
        path: 'produits/:id',
        loadComponent: () =>
          import('./pages/admin/admin-product-layout').then((m) => m.AdminProductLayout),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/admin/product-form.page').then((m) => m.ProductFormPage),
          },
          {
            path: 'wiki',
            loadComponent: () => import('./pages/admin/admin-wiki.page').then((m) => m.AdminWikiPage),
          },
          {
            path: 'wiki/:pageId',
            loadComponent: () => import('./pages/admin/admin-wiki.page').then((m) => m.AdminWikiPage),
          },
          {
            path: 'tickets',
            loadComponent: () =>
              import('./pages/admin/admin-tickets.page').then((m) => m.AdminTicketsPage),
          },
          {
            path: 'integration',
            loadComponent: () =>
              import('./pages/admin/admin-integration.page').then((m) => m.AdminIntegrationPage),
          },
        ],
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
