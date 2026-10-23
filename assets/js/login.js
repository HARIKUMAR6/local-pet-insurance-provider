/**
 * Pawstead — policyholder access (login.html). Needs forms.js.
 *
 * Views: Sign In and Create Account (ARIA tabs), plus password recovery.
 * Runs entirely in the browser: nothing is sent anywhere, and passwords are
 * never written to any storage. "Remember me" keeps only the email address.
 */
(() => {
  'use strict';

  const SESSION_KEY = 'pawstead-portal';
  const STATE_KEY = 'pawstead-portal-state';
  const REMEMBER_KEY = 'pawstead-remember-email';
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PASSWORD_MIN = 8;

  const store = (area) => ({
    get: (k) => { try { return window[area].getItem(k); } catch { return null; } },
    set: (k, v) => { try { window[area].setItem(k, v); } catch { /* ignore */ } },
    remove: (k) => { try { window[area].removeItem(k); } catch { /* ignore */ } },
  });
  const local = store('localStorage');
  const session = store('sessionStorage');

  const signinForm = document.querySelector('[data-signin-form]');
  const registerForm = document.querySelector('[data-register-form]');
  const recoverForm = document.querySelector('[data-recover-form]');
  if (!signinForm || !registerForm || !recoverForm || !window.PawsteadForms) return;

  const views = {
    signin: document.querySelector('[data-auth-view="signin"]'),
    register: document.querySelector('[data-auth-view="register"]'),
    recover: document.querySelector('[data-auth-view="recover"]'),
  };
  const tablist = document.querySelector('[data-auth-tabs]');
  const tabs = Array.from(document.querySelectorAll('[data-auth-tab]'));
  const remember = signinForm.querySelector('[data-remember]');
  const recoverDone = document.querySelector('[data-recover-done]');
  const recoverEmail = document.querySelector('[data-recover-email]');
  const registerDone = document.querySelector('[data-register-done]');
  const registerName = document.querySelector('[data-register-name]');

  const emailRule = (v) => {
    if (!v) return 'Enter your email address.';
    return EMAIL.test(v) ? '' : 'Enter an email address in the format name@example.com.';
  };

  // Start a fresh account session: identity only, never the password.
  function enterDashboard(identity) {
    session.remove(STATE_KEY);
    session.set(SESSION_KEY, JSON.stringify(identity));
    window.location.assign('dashboard.html');
  }

  /* ------------------------------------------------------------ sign in */
  const remembered = local.get(REMEMBER_KEY);
  if (remembered) {
    signinForm.elements.email.value = remembered;
    remember.checked = true;
  }

  const signinValidator = window.PawsteadForms.attach(signinForm, {
    rules: {
      email: emailRule,
      password: (v) => {
        if (!v) return 'Enter your password.';
        return v.length >= PASSWORD_MIN ? '' : `Your password has at least ${PASSWORD_MIN} characters.`;
      },
    },
    onValid() {
      const email = signinForm.elements.email.value.trim();
      if (remember.checked) local.set(REMEMBER_KEY, email);
      else local.remove(REMEMBER_KEY);
      enterDashboard({ email });
    },
  });

  /* ----------------------------------------------------- create account */
  let pendingIdentity = null;

  const registerValidator = window.PawsteadForms.attach(registerForm, {
    rules: {
      name: (v) => {
        if (!v) return 'Enter your full name.';
        return v.length >= 2 ? '' : 'Enter your full name as it appears on your policy.';
      },
      email: emailRule,
      password: (v) => {
        if (!v) return 'Create a password.';
        if (v.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters (currently ${v.length}).`;
        return /[A-Za-z]/.test(v) && /\d/.test(v) ? '' : 'Include at least one letter and one number.';
      },
      confirm: (v) => {
        if (!v) return 'Re-enter your password.';
        return v === registerForm.elements.password.value.trim() ? '' : 'The passwords don’t match.';
      },
      terms: (v, field) => (field.checked ? '' : 'Agree to the terms and conditions to continue.'),
    },
    onValid() {
      const name = registerForm.elements.name.value.trim().replace(/\s+/g, ' ');
      pendingIdentity = { name, email: registerForm.elements.email.value.trim() };
      // Clear the password fields as soon as they're no longer needed.
      registerForm.elements.password.value = '';
      registerForm.elements.confirm.value = '';
      registerName.textContent = `, ${name.split(' ')[0]}`;
      registerForm.hidden = true;
      registerDone.hidden = false;
      registerDone.focus();
    },
  });

  // Re-check "Confirm Password" when the first password changes.
  registerForm.elements.password.addEventListener('input', () => {
    if (registerValidator.submitted && registerForm.elements.confirm.value) {
      registerValidator.validateField(registerForm.elements.confirm);
    }
  });

  document.querySelector('[data-register-continue]')?.addEventListener('click', () => {
    if (pendingIdentity) enterDashboard(pendingIdentity);
  });

  /* ----------------------------------------------------------- recovery */
  const recoverValidator = window.PawsteadForms.attach(recoverForm, {
    rules: { email: emailRule },
    onValid() {
      recoverEmail.textContent = recoverForm.elements.email.value.trim();
      recoverForm.hidden = true;
      recoverDone.hidden = false;
      recoverDone.focus();
    },
  });

  /* -------------------------------------------------------- show/hide pw */
  document.querySelectorAll('[data-password-toggle]').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const input = document.getElementById(toggle.getAttribute('aria-controls'));
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-pressed', String(show));
      toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  const hidePasswords = () => {
    document.querySelectorAll('[data-password-toggle][aria-pressed="true"]').forEach((toggle) => toggle.click());
  };

  /* -------------------------------------------------------------- views */
  function show(name, { focus = true } = {}) {
    hidePasswords();
    Object.entries(views).forEach(([key, el]) => { el.hidden = key !== name; });
    tablist.hidden = name === 'recover';
    tabs.forEach((tab) => {
      const selected = tab.dataset.authTab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    if (name === 'register') {
      if (registerForm.hidden) {
        registerValidator.reset();
        registerForm.hidden = false;
        registerDone.hidden = true;
        pendingIdentity = null;
      }
    } else if (name === 'recover') {
      recoverValidator.reset();
      recoverForm.hidden = false;
      recoverDone.hidden = true;
      const typed = signinForm.elements.email.value.trim();
      if (EMAIL.test(typed)) recoverForm.elements.email.value = typed;
    }

    if (!focus) return;
    if (name === 'recover') document.getElementById('recover-title').focus();
    else if (name === 'register') registerForm.elements.name.focus();
    else signinForm.elements.email.focus();
  }

  // Tabs: click, plus arrow keys / Home / End (automatic activation).
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      if (tab.getAttribute('aria-selected') !== 'true') {
        show(tab.dataset.authTab, { focus: false });
        signinValidator.reset();
      }
    });
    tab.addEventListener('keydown', (event) => {
      const keys = { ArrowRight: 1, ArrowLeft: -1, Home: 'first', End: 'last' };
      if (!(event.key in keys)) return;
      event.preventDefault();
      const rtl = document.documentElement.dir === 'rtl';
      let next;
      if (keys[event.key] === 'first') next = 0;
      else if (keys[event.key] === 'last') next = tabs.length - 1;
      else next = (index + keys[event.key] * (rtl ? -1 : 1) + tabs.length) % tabs.length;
      show(tabs[next].dataset.authTab, { focus: false });
      tabs[next].focus();
    });
  });

  document.querySelectorAll('[data-auth-show]').forEach((button) => {
    button.addEventListener('click', () => show(button.dataset.authShow));
  });

  // Deep link: login.html#create-account opens the registration tab.
  if (window.location.hash === '#create-account') show('register', { focus: false });
})();
