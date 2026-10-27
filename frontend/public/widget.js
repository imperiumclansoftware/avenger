/*!
 * Avenger — widget de dépôt de tickets.
 *
 *   <script src="https://avenger.example.org/widget.js" data-product="mon-produit" defer></script>
 *
 * Attributs (tous facultatifs sauf data-product) :
 *   data-product   adresse du produit dans Avenger (/produits/<adresse>)
 *   data-type      file proposée par défaut : bug, feedback ou feature
 *   data-label     texte du bouton (« Signaler un problème » par défaut)
 *   data-position  bottom-right (défaut) ou bottom-left
 *   data-button    "false" : pas de bouton flottant, ouverture par AvengerTickets.open()
 *   data-name, data-email   pré-remplissage de l'auteur
 *   data-page-url  "false" : ne pas joindre l'adresse de la page au ticket
 *
 * API : AvengerTickets.open({ type, name, email }), AvengerTickets.close(), AvengerTickets.set({ … })
 * Événement : window « avenger:ticket-created », detail = { number, type, title, url }
 *
 * Le formulaire est servi par Avenger dans un iframe : aucun accès aux données de la page hôte,
 * et les deux côtés n'acceptent que les messages de la fenêtre et de l'origine attendues.
 */
(() => {
  'use strict';

  if (window.AvengerTickets) {
    return; // Script inclus deux fois
  }

  const script = document.currentScript;
  if (!script || !script.src) {
    console.error('[Avenger] widget.js doit être chargé par une balise <script src="…/widget.js">.');
    return;
  }

  const scriptUrl = new URL(script.src, document.baseURI);
  /** The Avenger app: widget.js is at its root (also behind a path prefix) */
  const base = new URL('.', scriptUrl);
  const avengerOrigin = scriptUrl.origin;
  const data = script.dataset;
  const TYPES = ['bug', 'feedback', 'feature'];

  const config = {
    product: (data.product || '').trim(),
    label: data.label || 'Signaler un problème',
    position: data.position === 'bottom-left' ? 'left' : 'right',
    button: data.button !== 'false',
    pageUrl: data.pageUrl !== 'false',
  };
  const prefill = {
    type: TYPES.includes(data.type) ? data.type : null,
    name: data.name || null,
    email: data.email || null,
  };

  if (!config.product) {
    console.error('[Avenger] Attribut data-product manquant sur la balise du widget.');
    return;
  }

  let dialog = null;
  let iframe = null;
  let ready = false;
  /** A ticket was sent: the next opening starts from an empty form */
  let sent = false;

  /** Origin of an http(s) URL, or null: refuses opaque ("null") origins and other schemes. */
  function httpOrigin(value) {
    try {
      const url = new URL(value);
      return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin !== 'null' ? url.origin : null;
    } catch {
      return null;
    }
  }

  const STYLE = `
    :host { all: initial; }
    .launcher {
      position: fixed; bottom: 1.25rem; ${config.position}: 1.25rem; z-index: 2147483000;
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.7rem 1.1rem; border: 1px solid #1f62f0; border-radius: 999px;
      background: #1f62f0; color: #fff; font: 500 0.95rem/1.2 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 0 1.5rem rgb(31 98 240 / 0.45), 0 0.5rem 1.5rem rgb(0 0 0 / 0.25); cursor: pointer;
    }
    .launcher:hover { background: #1a56d6; }
    .launcher:focus-visible, .close:focus-visible { outline: 2px solid #3d86ff; outline-offset: 2px; }
    .launcher svg { width: 1.15rem; height: 1.15rem; flex: none; }
    dialog {
      width: min(42rem, calc(100vw - 2rem)); max-height: calc(100dvh - 2rem);
      padding: 0; border: 1px solid #19243f; border-radius: 0.9rem;
      background: #04060c; color: #f3f6fc; color-scheme: dark;
      box-shadow: 0 0 2.5rem rgb(31 98 240 / 0.25);
      overflow: auto;
    }
    dialog[open] { display: flex; flex-direction: column; }
    /* No scroll chaining to the host page behind the modal */
    dialog:modal { overscroll-behavior: contain; }
    dialog::backdrop { background: rgb(4 6 12 / 0.65); backdrop-filter: blur(2px); overflow: hidden; overscroll-behavior: contain; }
    .bar { position: sticky; top: 0; display: flex; justify-content: flex-end; padding: 0.5rem 0.5rem 0; background: #04060c; }
    .close {
      display: grid; place-items: center; width: 2.25rem; height: 2.25rem;
      border: 1px solid #5b6c94; border-radius: 50%; background: transparent; color: #f3f6fc;
      font: 1.25rem/1 system-ui, sans-serif; cursor: pointer;
    }
    .close:hover { border-color: #3d86ff; }
    iframe { display: block; width: 100%; height: 34rem; border: 0; background: #04060c; color-scheme: dark; }
    @media (forced-colors: active) { .launcher, .close, dialog { border: 1px solid CanvasText; } }
  `;

  function build() {
    const host = document.createElement('avenger-tickets');
    const root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    root.append(style);

    if (config.button) {
      const launcher = document.createElement('button');
      launcher.type = 'button';
      launcher.className = 'launcher';
      launcher.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M4 5h16v11H9l-5 4z"/></svg>';
      launcher.append(document.createTextNode(config.label));
      launcher.addEventListener('click', () => open());
      root.append(launcher);
    }

    dialog = document.createElement('dialog');
    dialog.setAttribute('closedby', 'any');
    dialog.setAttribute('aria-label', config.label);
    const bar = document.createElement('div');
    bar.className = 'bar';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'close';
    close.setAttribute('aria-label', 'Fermer');
    close.textContent = '×';
    close.addEventListener('click', () => dialog.close());
    bar.append(close);
    dialog.append(bar);
    root.append(dialog);

    // Click outside closes, where <dialog closedby> is not supported (Safari): compare the
    // pointer to the dialog box, a press and a release both outside
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => (pressedOutside = outside(e)));
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && outside(e)) {
          dialog.close();
        }
      });
    }

    document.body.append(host);
  }

  function frameUrl() {
    const url = new URL(`widget/${encodeURIComponent(config.product)}`, base);
    url.searchParams.set('origin', location.origin);
    if (prefill.type) {
      url.searchParams.set('type', prefill.type);
    }
    return url.href;
  }

  function createFrame() {
    iframe?.remove();
    ready = false;
    sent = false;
    iframe = document.createElement('iframe');
    iframe.title = config.label;
    iframe.src = frameUrl();
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    // The form cannot navigate the host page; "Suivre le ticket" opens a normal tab
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
    dialog.append(iframe);
  }

  function sendPrefill() {
    if (!ready || !iframe?.contentWindow) {
      return;
    }
    iframe.contentWindow.postMessage(
      {
        source: 'avenger-host',
        type: 'prefill',
        prefill: { ...prefill },
        // Without query string nor fragment: they may hold tokens
        pageUrl: config.pageUrl ? location.origin + location.pathname : null,
      },
      avengerOrigin,
    );
  }

  window.addEventListener('message', (event) => {
    if (!iframe || event.source !== iframe.contentWindow || httpOrigin(event.origin) !== avengerOrigin) {
      return;
    }
    const message = event.data;
    if (!message || message.source !== 'avenger-widget') {
      return;
    }
    switch (message.type) {
      case 'ready':
        ready = true;
        sendPrefill();
        break;
      case 'resize':
        if (Number.isFinite(message.height)) {
          iframe.style.height = `${Math.min(Math.max(message.height, 200), 4000)}px`;
        }
        break;
      case 'created':
        sent = true;
        window.dispatchEvent(new CustomEvent('avenger:ticket-created', { detail: message.ticket }));
        break;
      case 'close':
        dialog.close();
        break;
    }
  });

  /** Updates the prefilled values, for example once the user of the host app is known. */
  function set(options = {}) {
    if ('type' in options) {
      prefill.type = TYPES.includes(options.type) ? options.type : null;
    }
    if ('name' in options) {
      prefill.name = options.name || null;
    }
    if ('email' in options) {
      prefill.email = options.email || null;
    }
    sendPrefill();
  }

  function open(options) {
    if (!dialog) {
      build();
    }
    if (options) {
      set(options);
    }
    // Lazy: Avenger is only contacted when the visitor opens the form
    if (!iframe || sent) {
      createFrame();
    }
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  window.AvengerTickets = Object.freeze({
    open,
    close: () => dialog?.close(),
    set,
  });

  if (config.button) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', build, { once: true });
    } else {
      build();
    }
  }
})();
