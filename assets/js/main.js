/**
 * Pawstead — shared site behaviour.
 * Vanilla ES6, no dependencies. Loaded with `defer` on every page.
 */
(() => {
  'use strict';

  /** Must match Tailwind's `xl` breakpoint (80rem / 1280px), where the full header nav appears. */
  const DESKTOP_QUERY = '(min-width: 80rem)';
  const DRAWER_TRANSITION_MS = 320;
  const THEME_KEY = 'pawstead-theme';
  const DIR_KEY = 'pawstead-dir';
  const THEME_COLOR = { light: '#183C35', dark: '#101A17' };
  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isVisible = (el) => el.getClientRects().length > 0;

  // localStorage can throw (private mode, blocked storage); preferences are a convenience.
  const store = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* ignore */
      }
    },
  };

  /* ------------------------------------------------------------------------
     Theme (light / dark)
     Saved choice wins; otherwise follow the OS and keep following it live.
     Every [data-theme-toggle] (header + drawer) shares one state.
     ------------------------------------------------------------------------ */
  function initTheme() {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const toggles = Array.from(document.querySelectorAll('[data-theme-toggle]'));
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const saved = () => {
      const value = store.get(THEME_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    };

    const apply = (theme) => {
      root.setAttribute('data-theme', theme);
      themeColor?.setAttribute('content', THEME_COLOR[theme]);
      const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
      toggles.forEach((button) => button.setAttribute('aria-label', label));
    };

    const notify = () => document.dispatchEvent(new CustomEvent('pawstead:themechange'));

    apply(saved() || (media.matches ? 'dark' : 'light'));

    toggles.forEach((button) => {
      button.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        store.set(THEME_KEY, next);
        apply(next);
        notify();
      });
    });

    media.addEventListener('change', (event) => {
      if (!saved()) {
        apply(event.matches ? 'dark' : 'light');
        notify();
      }
    });

    // Used by account settings: 'light' | 'dark' save a choice; 'system' follows the OS.
    window.PawsteadTheme = {
      preference: () => saved() || 'system',
      set(preference) {
        if (preference === 'light' || preference === 'dark') store.set(THEME_KEY, preference);
        else {
          try { window.localStorage.removeItem(THEME_KEY); } catch { /* ignore */ }
        }
        apply(saved() || (media.matches ? 'dark' : 'light'));
        notify();
      },
    };
  }

  /* ------------------------------------------------------------------------
     Direction (LTR / RTL)
     Switches the document's dir attribute; layout mirrors via logical CSS.
     Headings stay left-aligned in both directions (see heading guard in CSS).
     ------------------------------------------------------------------------ */
  function initDirection() {
    const root = document.documentElement;
    const options = Array.from(document.querySelectorAll('[data-dir-option]'));

    const apply = (dir) => {
      root.setAttribute('dir', dir);
      options.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.dirOption === dir));
      });
    };

    apply(store.get(DIR_KEY) === 'rtl' ? 'rtl' : 'ltr');

    options.forEach((button) => {
      button.addEventListener('click', () => {
        const dir = button.dataset.dirOption === 'rtl' ? 'rtl' : 'ltr';
        store.set(DIR_KEY, dir);
        apply(dir);
      });
    });
  }

  /* ------------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------------ */
  function initYear() {
    const year = String(new Date().getFullYear());
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = year;
    });
  }

  /* ------------------------------------------------------------------------
     Desktop dropdowns (disclosure pattern)
     Click / Enter / Space toggle. ArrowDown/ArrowUp open and move between
     items, Home/End jump, Escape closes and returns focus to the toggle.
     Closes on outside click and when focus leaves the dropdown.
     ------------------------------------------------------------------------ */
  function initDropdowns() {
    const closers = [];

    document.querySelectorAll('[data-dropdown]').forEach((root) => {
      const toggle = root.querySelector('[data-dropdown-toggle]');
      const panel = root.querySelector('[data-dropdown-panel]');
      if (!toggle || !panel) return;

      const items = () => Array.from(panel.querySelectorAll('a[href]'));
      const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

      const open = (focusTarget) => {
        closers.forEach((closeOther) => closeOther());
        toggle.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
        const list = items();
        if (focusTarget === 'first') list[0]?.focus();
        if (focusTarget === 'last') list[list.length - 1]?.focus();
      };

      const close = ({ restoreFocus = false } = {}) => {
        if (!isOpen()) return;
        toggle.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
        if (restoreFocus) toggle.focus();
      };

      closers.push(() => close());

      toggle.addEventListener('click', () => (isOpen() ? close() : open()));

      // Choosing Home 1 / Home 2 closes the menu as navigation starts.
      panel.addEventListener('click', (event) => {
        if (event.target.closest('a[href]')) close();
      });

      toggle.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          open('first');
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          open('last');
        }
      });

      panel.addEventListener('keydown', (event) => {
        const list = items();
        const index = list.indexOf(document.activeElement);
        let next = null;

        if (event.key === 'ArrowDown') next = list[(index + 1) % list.length];
        else if (event.key === 'ArrowUp') next = list[(index - 1 + list.length) % list.length];
        else if (event.key === 'Home') next = list[0];
        else if (event.key === 'End') next = list[list.length - 1];

        if (next) {
          event.preventDefault();
          next.focus();
        }
      });

      root.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isOpen()) {
          event.stopPropagation();
          close({ restoreFocus: true });
        }
      });

      root.addEventListener('focusout', (event) => {
        if (event.relatedTarget && !root.contains(event.relatedTarget)) close();
      });

      document.addEventListener('click', (event) => {
        if (!root.contains(event.target)) close();
      });
    });

    // A page restored from the back/forward cache keeps its last DOM state.
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) closers.forEach((close) => close());
    });
  }

  /* ------------------------------------------------------------------------
     Disclosures (Home group inside the mobile drawer)
     Always start collapsed, even on Home 1 / Home 2 (the active state is
     shown on the toggle itself), and collapse again whenever the drawer
     closes, so the group only ever opens on a deliberate tap.
     ------------------------------------------------------------------------ */
  function initDisclosures() {
    document.querySelectorAll('[data-disclosure-toggle]').forEach((toggle) => {
      const panel = document.getElementById(toggle.getAttribute('aria-controls'));
      if (!panel) return;

      const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        panel.hidden = !open;
      };

      setOpen(false);
      toggle.addEventListener('click', () => {
        setOpen(toggle.getAttribute('aria-expanded') !== 'true');
      });
      document.addEventListener('pawstead:drawerclose', () => setOpen(false));
    });
  }

  /* ------------------------------------------------------------------------
     Mobile navigation drawer (modal dialog)
     Opens from the Menu button. Closes on: close button, Escape, backdrop
     click, link activation, and when the viewport reaches desktop width.
     Traps focus, makes the rest of the page inert, locks background scroll.
     ------------------------------------------------------------------------ */
  function initDrawer() {
    const drawer = document.querySelector('[data-drawer]');
    const backdrop = document.querySelector('[data-drawer-backdrop]');
    const openers = Array.from(document.querySelectorAll('[data-drawer-open]'));
    if (!drawer || !backdrop || openers.length === 0) return;

    const closeButton = drawer.querySelector('[data-drawer-close]');
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const root = document.documentElement;
    let returnFocusTo = null;
    let hideTimer = 0;

    const isOpen = () => drawer.dataset.state === 'open';

    // Everything except the drawer and its backdrop becomes inert while open.
    const background = () =>
      Array.from(document.body.children)
        .filter((el) => !el.contains(drawer))
        .concat(Array.from(document.querySelectorAll('.site-header__bar')));

    const setBackgroundInert = (inert) => {
      background().forEach((el) => {
        if (inert) el.setAttribute('inert', '');
        else el.removeAttribute('inert');
      });
    };

    const lockScroll = () => {
      const scrollbar = window.innerWidth - root.clientWidth;
      root.style.setProperty('--scrollbar-comp', `${scrollbar}px`);
      root.classList.add('is-scroll-locked');
    };

    const unlockScroll = () => {
      root.classList.remove('is-scroll-locked');
      root.style.removeProperty('--scrollbar-comp');
    };

    const setExpanded = (expanded) => {
      openers.forEach((button) => button.setAttribute('aria-expanded', String(expanded)));
    };

    function open(trigger) {
      if (isOpen()) return;
      window.clearTimeout(hideTimer);
      returnFocusTo = trigger || document.activeElement;

      drawer.hidden = false;
      backdrop.hidden = false;
      // Commit the off-canvas start position before transitioning in.
      void drawer.offsetWidth;
      drawer.dataset.state = 'open';
      backdrop.dataset.state = 'open';

      setExpanded(true);
      lockScroll();
      setBackgroundInert(true);
      (closeButton || drawer).focus({ preventScroll: true });
    }

    function close({ restoreFocus = true } = {}) {
      if (!isOpen()) return;
      drawer.dataset.state = 'closed';
      backdrop.dataset.state = 'closed';

      setExpanded(false);
      setBackgroundInert(false);
      unlockScroll();

      hideTimer = window.setTimeout(() => {
        drawer.hidden = true;
        backdrop.hidden = true;
        document.dispatchEvent(new CustomEvent('pawstead:drawerclose'));
      }, reducedMotion() ? 0 : DRAWER_TRANSITION_MS);

      if (restoreFocus && returnFocusTo && isVisible(returnFocusTo)) {
        returnFocusTo.focus({ preventScroll: true });
      }
      returnFocusTo = null;
    }

    function trapFocus(event) {
      const focusable = Array.from(drawer.querySelectorAll(FOCUSABLE)).filter(isVisible);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    openers.forEach((button) => {
      button.addEventListener('click', () => open(button));
    });

    closeButton?.addEventListener('click', () => close());
    backdrop.addEventListener('click', () => close());

    drawer.addEventListener('click', (event) => {
      if (event.target.closest('a[href]')) close({ restoreFocus: false });
    });

    document.addEventListener('keydown', (event) => {
      if (!isOpen()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'Tab') {
        trapFocus(event);
      }
    });

    desktop.addEventListener('change', (event) => {
      if (event.matches) close({ restoreFocus: false });
    });

    window.addEventListener('pageshow', (event) => {
      if (event.persisted) close({ restoreFocus: false });
    });
  }

  /* ------------------------------------------------------------------------
     Scroll-to-top (public pages only; account pages have their own chrome)
     Available once the reader has scrolled about a screen.
     - Wide screens: the side margin holds the button, so it stays shown.
     - Narrower screens, where it would sit over the content column: hidden
       while reading downward; shown when scrolling back up; once scrolling
       settles it fades out again if it is covering content (unless hovered
       or focused); and at the end of the page it rests in a corner the
       footer keeps clear for it (data-scroll-top-dock).
     Smooth scroll unless reduced motion is preferred.
     ------------------------------------------------------------------------ */
  function initScrollTop() {
    if (document.body.dataset.chrome === 'app') return;
    const footer = document.querySelector('.site-footer');
    const content = document.querySelector('main .container-site');
    const SCROLL_DEADZONE = 8;
    const SETTLE_MS = 2500;
    const CONTENT = 'a, button, input, select, textarea, label, img, svg, iframe, video, p, h1, h2, h3, h4, h5, h6, li, dt, dd, th, td, span, figure, blockquote';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scroll-top';
    button.setAttribute('aria-label', 'Scroll to top');
    button.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 16V4M4.5 9.5 10 4l5.5 5.5"/></svg>';
    document.body.appendChild(button);

    let frame = 0;
    let settleTimer = 0;
    let lastY = window.scrollY;
    let scrollingUp = false;
    let settled = true;

    // True when the button fits in the margin beside the content column.
    const inMargin = () => {
      if (!content) return false;
      const box = content.getBoundingClientRect();
      const contentStart = box.left + parseFloat(getComputedStyle(content).paddingLeft);
      const edge = parseFloat(getComputedStyle(button).insetInlineEnd) || 16;
      return contentStart >= edge + button.offsetWidth + 8;
    };

    // True when the button's box overlaps any piece of page content. Only
    // evaluated once scrolling has settled, so the full scan stays cheap.
    const CONTENT_SCOPE = `main :is(${CONTENT}), .site-footer :is(${CONTENT})`;
    const coversContent = () => {
      const r = button.getBoundingClientRect();
      return Array.from(document.querySelectorAll(CONTENT_SCOPE)).some((el) => {
        const q = el.getBoundingClientRect();
        return q.width > 0 && q.height > 0 && q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top;
      });
    };

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (Math.abs(y - lastY) > SCROLL_DEADZONE) {
        scrollingUp = y < lastY;
        lastY = y;
      }
      const roomy = inMargin();
      footer?.toggleAttribute('data-scroll-top-dock', !roomy);

      const past = y > Math.max(480, window.innerHeight * 0.75);
      const atEnd = !!footer && footer.getBoundingClientRect().bottom <= window.innerHeight + 2;
      const engaged = document.activeElement === button || button.matches(':hover');
      const reading = scrollingUp && !(settled && !atEnd && coversContent());
      const show = past && (roomy || atEnd || engaged || reading);
      button.dataset.visible = String(show);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', () => {
      settled = false;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        settled = true;
        schedule();
      }, SETTLE_MS);
      schedule();
    }, { passive: true });
    window.addEventListener('resize', schedule);
    // Keyboard and pointer users can always reach it: stay shown while engaged.
    ['focus', 'blur', 'mouseenter', 'mouseleave'].forEach((type) => button.addEventListener(type, schedule));
    update();

    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reducedMotion() ? 'instant' : 'smooth' });
      // The button hides at the top; hand focus to the start of the page
      // (the logo) so keyboard users aren't left on a hidden control.
      document.querySelector('.site-header .logo')?.focus({ preventScroll: true });
    });
  }

  initTheme();
  initDirection();
  initYear();
  initDropdowns();
  initDisclosures();
  initDrawer();
  initScrollTop();
})();
