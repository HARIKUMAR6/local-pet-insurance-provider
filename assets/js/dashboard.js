/**
 * Pawstead — policyholder dashboard (dashboard.html). Needs forms.js.
 *
 * Single source of truth: `state` (policy, pet, claims, user). Every view is
 * rendered from it, so values never disagree between Overview, My Policy,
 * My Claims and Pet Profile. State lives in sessionStorage for the browser
 * session only and is cleared on Sign Out. Nothing is sent anywhere.
 *
 * Routing is hash-based: #overview #policy #compare #claims #claims-new
 * #claim-<REF> #pet #settings.
 */
(() => {
  'use strict';

  const SESSION_KEY = 'pawstead-portal';
  const STATE_KEY = 'pawstead-portal-state';
  const SIDEBAR_QUERY = '(min-width: 64rem)'; // Tailwind lg

  /* ---------------------------------------------------------------- utils */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const session = {
    get(k) { try { return window.sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { window.sessionStorage.setItem(k, v); } catch { /* ignore */ } },
    remove(k) { try { window.sessionStorage.removeItem(k); } catch { /* ignore */ } },
  };
  const money = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const moneyWhole = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const todayIso = () => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  };
  const ageFrom = (iso) => {
    const dob = new Date(`${iso}T00:00:00`); const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) years -= 1;
    return years < 1 ? 'Under 1 year old' : `${years} year${years === 1 ? '' : 's'} old`;
  };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------------------------------------------------------- state */
  const STATUS = {
    submitted: { label: 'Submitted', tone: 'neutral' },
    review: { label: 'Under Review', tone: 'info' },
    info: { label: 'More Information Needed', tone: 'attention' },
    decision: { label: 'Decision Recorded', tone: 'positive' },
  };

  const defaults = () => {
    // Signed-in identity (email, plus name after creating an account). Never a password.
    let email = 'alex.morgan@example.com';
    let name = 'Alex Morgan';
    try {
      const signedIn = JSON.parse(session.get(SESSION_KEY) || '{}');
      email = signedIn.email || email;
      name = signedIn.name || name;
    } catch { /* ignore */ }
    return {
      user: { name, email, claimUpdates: true, renewalReminders: true, compactLists: false },
      policy: { ref: 'PW-482913', status: 'Active', plan: 'Complete Care', start: '2026-03-14', renewal: '2027-03-14', limit: 10000, reimbursement: 0.8, deductible: 250 },
      pet: { name: 'Juniper', species: 'Dog', breed: 'Boxer', dob: '2021-05-02', sex: 'Female', weight: '27', vet: 'Riverside Veterinary Clinic', microchip: 'Registered' },
      claims: [
        { ref: 'CLM-20702', date: '2026-10-09', category: 'Accident', amount: 212, status: 'review', summary: 'Paw pad cut cleaned and dressed.' },
        { ref: 'CLM-20671', date: '2026-08-29', category: 'Illness', amount: 385.5, status: 'info', summary: 'Ear infection: consultation and medication.', request: 'An itemised invoice for this visit.' },
        { ref: 'CLM-20533', date: '2026-06-18', category: 'Illness', amount: 1180, status: 'decision', paid: 944, summary: 'Stomach upset: diagnostics and treatment.' },
        { ref: 'CLM-20418', date: '2026-04-02', category: 'Accident', amount: 640, status: 'decision', paid: 312, deductibleApplied: 250, summary: 'Sprained foreleg: X-ray and rest care.' },
      ],
      selectedClaim: 'CLM-20702',
    };
  };

  let state;
  try { state = JSON.parse(session.get(STATE_KEY)) || defaults(); } catch { state = defaults(); }
  const save = () => session.set(STATE_KEY, JSON.stringify(state));

  const usedAmount = () => state.claims.reduce((sum, c) => sum + (c.paid || 0), 0);
  const deductibleMet = () => state.claims.reduce((sum, c) => sum + (c.deductibleApplied || 0), 0) >= state.policy.deductible;
  const openClaims = () => state.claims.filter((c) => c.status !== 'decision').length;

  /* -------------------------------------------------------------- binding */
  function bindAll() {
    const { user, policy, pet } = state;
    const used = usedAmount();
    const values = {
      displayName: user.name,
      initials: user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '·',
      email: user.email,
      policyRef: policy.ref,
      policyStatus: policy.status,
      planName: policy.plan,
      policyStart: formatDate(policy.start),
      policyRenewal: formatDate(policy.renewal),
      limit: moneyWhole(policy.limit),
      reimbursement: `${Math.round(policy.reimbursement * 100)}%`,
      deductible: moneyWhole(policy.deductible),
      deductibleStatus: deductibleMet() ? 'Met for this policy year' : 'Not yet met',
      used: money(used),
      remaining: money(policy.limit - used),
      petName: pet.name,
      petSpecies: pet.species,
      petBreed: pet.breed,
      petAge: ageFrom(pet.dob),
      petDob: formatDate(pet.dob),
      petSex: pet.sex,
      petWeight: `${pet.weight} kg`,
      petMicrochip: pet.microchip,
      petVet: pet.vet,
      openClaims: String(openClaims()),
    };
    $$('[data-bind]').forEach((el) => {
      const value = values[el.dataset.bind];
      if (value !== undefined) el.textContent = value;
    });

    const meter = $('[data-usage-meter]');
    const pct = Math.min(100, (used / policy.limit) * 100);
    meter.setAttribute('aria-valuemax', String(policy.limit));
    meter.setAttribute('aria-valuenow', String(used));
    meter.setAttribute('aria-valuetext', `${money(used)} used, ${money(policy.limit - used)} remaining`);
    $('[data-usage-fill]').style.width = `${pct}%`;

    $$('[data-pet-photo]').forEach((img) => { img.alt = `${pet.name}, a fawn and white ${pet.breed}, smiling in long grass.`; });

    const hour = new Date().getHours();
    const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    $('[data-greeting]').textContent = `Good ${part}, ${user.name.split(/\s+/)[0]}.`;

    document.body.classList.toggle('is-compact', !!user.compactLists);
  }

  /* --------------------------------------------------------------- claims */
  let filter = 'all';

  const statusBadge = (status) => `<span class="status status--${STATUS[status].tone}">${STATUS[status].label}</span>`;

  function claimsTable(claims, { compactActions = false } = {}) {
    if (!claims.length) return '<p class="text-small text-muted">No claims match this filter.</p>';
    const rows = claims.map((c) => `
      <tr${c.ref === state.selectedClaim && !compactActions ? ' class="is-selected"' : ''}>
        <th scope="row" data-label="Claim">${escapeHtml(c.ref)}</th>
        <td data-label="Visit date">${formatDate(c.date)}</td>
        <td data-label="Category">${escapeHtml(c.category)}</td>
        <td data-label="Amount" class="num">${money(c.amount)}</td>
        <td data-label="Status">${statusBadge(c.status)}</td>
        <td class="actions"><a class="link text-small" href="#claim-${encodeURIComponent(c.ref)}" aria-label="View details for claim ${escapeHtml(c.ref)}">View details</a></td>
      </tr>`).join('');
    return `<table class="data-table">
      <thead><tr><th scope="col">Claim</th><th scope="col">Visit date</th><th scope="col">Category</th><th scope="col" class="num">Amount</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }

  function stageStates(claim) {
    switch (claim.status) {
      case 'submitted': return { submitted: 'current', review: 'upcoming', info: 'upcoming', decision: 'upcoming' };
      case 'review': return { submitted: 'done', review: 'current', info: 'upcoming', decision: 'upcoming' };
      case 'info': return { submitted: 'done', review: 'done', info: 'current', decision: 'upcoming' };
      default: return { submitted: 'done', review: 'done', info: 'skipped', decision: 'done' };
    }
  }

  function claimDetail(claim) {
    const states = stageStates(claim);
    const stage = (key, label, desc) => {
      const s = states[key];
      const stateText = { done: 'Completed.', current: 'Current stage.', upcoming: 'Not reached.', skipped: 'Not needed.' }[s];
      return `<li class="tracker__step" data-state="${s}"${s === 'current' ? ' aria-current="step"' : ''}${key === 'info' ? ' data-conditional' : ''}>
        <span class="tracker__dot" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="m2.5 6.5 2.25 2.25L9.5 3.5"/></svg></span>
        <span class="tracker__label">${label}<span class="tracker__current">Current</span></span>
        <span class="tracker__desc">${s === 'skipped' ? 'Not needed for this claim.' : desc}</span>
        <span class="sr-only">${stateText}</span></li>`;
    };
    let outcome = '';
    if (claim.status === 'decision' && claim.paid) {
      outcome = `<div class="detail-note"><p class="font-semibold text-heading">Reimbursed ${money(claim.paid)}</p><p class="text-small text-muted">${claim.deductibleApplied ? `${money(claim.deductibleApplied)} deductible applied, then ` : ''}${Math.round(state.policy.reimbursement * 100)}% of the eligible amount.</p></div>`;
    } else if (claim.status === 'info') {
      outcome = `<div class="detail-note detail-note--attention"><p class="font-semibold text-heading">Requested from you</p><p class="text-small text-muted">${escapeHtml(claim.request || 'Supporting documents for this visit.')}</p></div>`;
    } else if (claim.status === 'submitted') {
      outcome = '<div class="detail-note"><p class="text-small text-muted">Your claim is in your list. Its status will change here as it moves through each stage.</p></div>';
    }
    return `
      <div class="mt-1 flex flex-wrap items-center gap-2"><span class="font-heading text-h4 font-semibold text-heading">${escapeHtml(claim.ref)}</span>${statusBadge(claim.status)}</div>
      <dl class="kv kv--2 mt-5">
        <div><dt>Pet</dt><dd>${escapeHtml(claim.pet || state.pet.name)}</dd></div>
        <div><dt>Visit date</dt><dd>${formatDate(claim.date)}</dd></div>
        <div><dt>Category</dt><dd>${escapeHtml(claim.category)}</dd></div>
        <div><dt>Amount claimed</dt><dd>${money(claim.amount)}</dd></div>
      </dl>
      <p class="mt-4 text-small text-muted">${escapeHtml(claim.summary)}</p>
      ${outcome}
      <h4 class="mt-6 font-heading text-small font-semibold text-heading">Claim stages</h4>
      <ol class="tracker tracker--stacked" role="list">
        ${stage('submitted', 'Submitted', 'Claim details received.')}
        ${stage('review', 'Under Review', 'Checked against the policy terms.')}
        ${stage('info', 'More Information Needed', 'Only if extra documents are requested.')}
        ${stage('decision', 'Decision Recorded', 'The outcome is shown here.')}
      </ol>`;
  }

  function renderAttention() {
    const waiting = state.claims.filter((c) => c.status === 'info');
    $('[data-attention]').hidden = waiting.length === 0;
    $('[data-attention-list]').innerHTML = waiting.map((c) => `
      <li><span class="text-small"><strong class="font-semibold text-heading">${escapeHtml(c.ref)}</strong><span class="block text-muted">${escapeHtml(c.request || 'Supporting documents requested.')}</span></span>
      <a class="link shrink-0 text-small" href="#claim-${encodeURIComponent(c.ref)}" aria-label="View details for claim ${escapeHtml(c.ref)}">View</a></li>`).join('');
  }

  function renderClaims() {
    renderAttention();
    const recent = $('[data-claims-table="recent"]');
    recent.innerHTML = claimsTable(state.claims.slice(0, 3), { compactActions: true });

    const list = state.claims.filter((c) => filter === 'all' || (filter === 'open' ? c.status !== 'decision' : c.status === 'decision'));
    $('[data-claims-table="all"]').innerHTML = claimsTable(list);
    $('[data-claims-count]').textContent = `${list.length} of ${state.claims.length}`;

    const selected = state.claims.find((c) => c.ref === state.selectedClaim) || state.claims[0];
    $('[data-detail-body]').innerHTML = selected ? claimDetail(selected) : '<p class="mt-3 text-small text-muted">Select a claim to see its details.</p>';
    $('[data-detail-title]').textContent = 'Claim details';
  }

  $$('[data-claim-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      filter = button.dataset.claimFilter;
      $$('[data-claim-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      renderClaims();
    });
  });

  /* ---------------------------------------------------- claim submission */
  const claimPanel = $('[data-claim-form-panel]');
  const claimToggle = $('[data-claim-form-toggle]');
  const claimForm = $('[data-claim-form]');
  const claimConfirm = $('[data-claim-confirmation]');
  const POLICY = /^PW-\d{6}$/i;
  const AMOUNT = /^\d{1,6}(\.\d{1,2})?$/;

  const claimValidator = window.PawsteadForms.attach(claimForm, {
    rules: {
      policy: (v) => {
        if (!v) return 'Enter your policy reference.';
        if (!POLICY.test(v)) return 'Use the format PW-123456.';
        return v.toUpperCase() === state.policy.ref ? '' : `This doesn’t match your policy reference, ${state.policy.ref}.`;
      },
      pet: (v) => (v ? '' : 'Enter your pet’s name.'),
      visitDate: (v, field) => {
        if (!v) return field.validity.badInput ? 'Enter a complete, valid date.' : 'Enter the date of the veterinary visit.';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) return 'Enter a complete, valid date.';
        if (v > todayIso()) return 'The visit date can’t be in the future.';
        return v < state.policy.start ? `The visit must be on or after your policy start date, ${formatDate(state.policy.start)}.` : '';
      },
      category: (v) => (v ? '' : 'Choose a claim category.'),
      amount: (v) => {
        if (!v) return 'Enter the claim amount.';
        const plain = v.replace(/,/g, '');
        if (!AMOUNT.test(plain)) return 'Enter numbers only, for example 245.00, with no currency symbol.';
        const n = Number(plain);
        if (n <= 0) return 'Enter an amount greater than 0.';
        return n > state.policy.limit ? `The amount can’t exceed your annual limit of ${moneyWhole(state.policy.limit)}.` : '';
      },
      summary: (v) => {
        if (!v) return 'Enter a brief treatment summary.';
        return v.length >= 10 ? '' : `Add a little more detail: at least 10 characters (currently ${v.length}).`;
      },
    },
    onValid() {
      const numbers = state.claims.map((c) => Number(c.ref.replace(/\D/g, '')));
      const ref = `CLM-${Math.max(...numbers) + 1}`;
      const f = claimForm.elements;
      state.claims.unshift({
        ref,
        date: f.visitDate.value,
        category: f.category.value,
        amount: Number(f.amount.value.replace(/,/g, '')),
        status: 'submitted',
        pet: f.pet.value.trim(),
        summary: f.summary.value.trim(),
      });
      state.selectedClaim = ref;
      save();
      closeClaimForm({ restoreFocus: false });
      filter = 'all';
      $$('[data-claim-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.claimFilter === 'all')));
      renderAll();
      $('[data-claim-confirmation-text]').textContent = `Claim ${ref} submitted. It’s now at the top of your claims list with the status Submitted.`;
      claimConfirm.hidden = false;
      claimConfirm.focus();
    },
  });

  function openClaimForm() {
    claimValidator.reset();
    claimForm.elements.policy.value = state.policy.ref;
    claimForm.elements.pet.value = state.pet.name;
    claimForm.elements.visitDate.max = todayIso();
    claimForm.elements.visitDate.min = state.policy.start;
    claimPanel.hidden = false;
    claimConfirm.hidden = true;
    claimToggle.setAttribute('aria-expanded', 'true');
    $('#claim-form-title').focus();
  }

  function closeClaimForm({ restoreFocus = true } = {}) {
    claimPanel.hidden = true;
    claimToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) claimToggle.focus();
  }

  claimToggle.addEventListener('click', () => (claimPanel.hidden ? openClaimForm() : closeClaimForm()));
  $('[data-claim-form-cancel]').addEventListener('click', () => closeClaimForm());

  /* ------------------------------------------------------------ pet edit */
  const petForm = $('[data-pet-form]');
  const petEdit = $('[data-pet-edit]');
  const petDetails = $('[data-pet-details]');
  const petConfirm = $('[data-pet-confirmation]');
  const petValidator = window.PawsteadForms.attach(petForm, {
    rules: {
      name: (v) => (v ? '' : 'Enter your pet’s name.'),
      breed: (v) => (v ? '' : 'Enter a breed, or “Mixed breed”.'),
      dob: (v) => {
        if (!v) return 'Enter a date of birth.';
        if (Number.isNaN(Date.parse(v))) return 'Enter a complete, valid date.';
        return v > todayIso() ? 'The date of birth can’t be in the future.' : '';
      },
      weight: (v) => {
        if (!v) return 'Enter a weight in kilograms.';
        const n = Number(v);
        return /^\d{1,3}(\.\d)?$/.test(v) && n > 0 && n <= 120 ? '' : 'Enter a weight between 0.1 and 120 kg, for example 27 or 27.5.';
      },
      vet: (v) => (v ? '' : 'Enter your primary vet.'),
    },
    onValid() {
      const f = petForm.elements;
      Object.assign(state.pet, { name: f.name.value.trim(), breed: f.breed.value.trim(), dob: f.dob.value, weight: f.weight.value.trim(), vet: f.vet.value.trim() });
      // Keep open claims addressed to the pet's current name.
      save();
      togglePetForm(false);
      renderAll();
      petConfirm.hidden = false;
      petConfirm.focus();
    },
  });

  function togglePetForm(open) {
    if (open) {
      petValidator.reset();
      const f = petForm.elements;
      f.name.value = state.pet.name; f.breed.value = state.pet.breed; f.dob.value = state.pet.dob; f.weight.value = state.pet.weight; f.vet.value = state.pet.vet;
      f.dob.max = todayIso();
      petConfirm.hidden = true;
    }
    petForm.hidden = !open;
    petDetails.hidden = open;
    petEdit.setAttribute('aria-expanded', String(open));
    petEdit.hidden = open;
    (open ? petForm.elements.name : petEdit).focus();
  }
  petEdit.addEventListener('click', () => togglePetForm(true));
  $('[data-pet-cancel]').addEventListener('click', () => togglePetForm(false));

  /* ------------------------------------------------------------ settings */
  const settingsForm = $('[data-settings-form]');
  const settingsStatus = $('[data-settings-status]');
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const settingsValidator = window.PawsteadForms.attach(settingsForm, {
    rules: {
      displayName: (v) => (v ? '' : 'Enter a display name.'),
      email: (v) => (!v ? 'Enter your email address.' : EMAIL.test(v) ? '' : 'Enter an email address in the format name@example.com.'),
    },
    onValid() {
      const f = settingsForm.elements;
      Object.assign(state.user, {
        name: f.displayName.value.trim(),
        email: f.email.value.trim(),
        claimUpdates: f.claimUpdates.checked,
        renewalReminders: f.renewalReminders.checked,
        compactLists: f.compactLists.checked,
      });
      window.PawsteadTheme?.set(f.theme.value);
      save();
      renderAll();
      settingsStatus.textContent = 'Changes applied.';
    },
  });

  function fillSettings() {
    const f = settingsForm.elements;
    settingsValidator.reset();
    f.displayName.value = state.user.name;
    f.email.value = state.user.email;
    f.claimUpdates.checked = state.user.claimUpdates;
    f.renewalReminders.checked = state.user.renewalReminders;
    f.compactLists.checked = state.user.compactLists;
    f.theme.value = window.PawsteadTheme?.preference() || 'system';
    settingsStatus.textContent = '';
  }
  settingsForm.addEventListener('input', () => { settingsStatus.textContent = ''; });
  document.addEventListener('pawstead:themechange', () => {
    if (!$('[data-view="settings"]').hidden) settingsForm.elements.theme.value = window.PawsteadTheme.preference();
  });

  /* ------------------------------------------------------ compare toggle */
  const diffToggle = $('[data-differences-toggle]');
  diffToggle.addEventListener('change', () => {
    $$('[data-compare-table] tr[data-same]').forEach((row) => { row.hidden = diffToggle.checked; });
    $('[data-differences-live]').textContent = diffToggle.checked ? 'Showing only rows that differ between plans.' : 'Showing all rows.';
  });

  /* -------------------------------------------------------------- routing */
  const TITLES = { overview: 'Overview', policy: 'My Policy', compare: 'Compare Plans', claims: 'My Claims', pet: 'Pet Profile', settings: 'Settings' };
  const viewTitle = $('[data-view-title]');
  let firstRoute = true;

  function route() {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    let view = hash;
    let afterShow = null;

    if (hash === 'claims-new') { view = 'claims'; afterShow = openClaimForm; }
    else if (hash.startsWith('claim-')) {
      const ref = hash.slice(6);
      view = 'claims';
      if (state.claims.some((c) => c.ref === ref)) {
        state.selectedClaim = ref; save();
        afterShow = () => { renderClaims(); $('[data-detail-title]').focus(); };
      }
    }
    if (!TITLES[view]) view = 'overview';

    $$('[data-view]').forEach((section) => { section.hidden = section.dataset.view !== view; });
    $$('[data-view-link]').forEach((link) => {
      if (link.dataset.viewLink === view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    viewTitle.textContent = TITLES[view];
    document.title = `${TITLES[view]} — Pawstead`;

    if (view === 'settings') fillSettings();
    if (view !== 'claims') { claimConfirm.hidden = true; }
    if (view !== 'pet' && !petForm.hidden) togglePetForm(false);

    closeSidebar({ restoreFocus: false });
    if (afterShow) afterShow();
    else if (!firstRoute) viewTitle.focus();
    if (!firstRoute) window.scrollTo(0, 0);
    firstRoute = false;
  }

  /* ------------------------------------------------- sidebar as a drawer */
  const sidebar = $('[data-sidebar]');
  const backdrop = $('[data-sidebar-backdrop]');
  const opener = $('[data-sidebar-open]');
  const desktop = window.matchMedia(SIDEBAR_QUERY);
  const root = document.documentElement;
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const isDrawer = () => !desktop.matches;
  const isOpen = () => sidebar.dataset.state === 'open';

  function syncSidebarMode() {
    // Off-canvas and closed on small screens: keep it out of the tab order.
    if (isDrawer() && !isOpen()) sidebar.setAttribute('inert', '');
    else sidebar.removeAttribute('inert');
    if (isDrawer()) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', String(isOpen()));
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
    }
  }

  function openSidebar() {
    if (!isDrawer() || isOpen()) return;
    sidebar.dataset.state = 'open';
    backdrop.hidden = false;
    void backdrop.offsetWidth;
    backdrop.dataset.state = 'open';
    opener.setAttribute('aria-expanded', 'true');
    const scrollbar = window.innerWidth - root.clientWidth;
    root.style.setProperty('--scrollbar-comp', `${scrollbar}px`);
    root.classList.add('is-scroll-locked');
    syncSidebarMode();
    // Move focus into the drawer *before* making the page behind it inert:
    // inerting the still-focused Menu button would otherwise reset focus to
    // <body>. If the browser won't focus into the sidebar while its slide-in
    // transition is still running (seen with reduced motion), finish once
    // that transition completes.
    const closeButton = $('[data-sidebar-close]');
    const finish = () => {
      if (!isOpen()) return;
      closeButton.focus({ preventScroll: true });
      $('.app-main').setAttribute('inert', '');
    };
    closeButton.focus({ preventScroll: true });
    if (document.activeElement === closeButton) finish();
    else {
      Promise.all(sidebar.getAnimations().map((animation) => animation.finished))
        .catch(() => {})
        .then(() => requestAnimationFrame(finish));
    }
  }

  function closeSidebar({ restoreFocus = true } = {}) {
    if (!isOpen()) return;
    sidebar.dataset.state = 'closed';
    backdrop.dataset.state = 'closed';
    backdrop.hidden = true;
    opener.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-scroll-locked');
    root.style.removeProperty('--scrollbar-comp');
    $('.app-main').removeAttribute('inert');
    syncSidebarMode();
    if (restoreFocus && isDrawer()) opener.focus({ preventScroll: true });
  }

  opener.addEventListener('click', openSidebar);
  $('[data-sidebar-close]').addEventListener('click', () => closeSidebar());
  backdrop.addEventListener('click', () => closeSidebar());
  document.addEventListener('keydown', (event) => {
    if (!isOpen()) return;
    if (event.key === 'Escape') { event.preventDefault(); closeSidebar(); return; }
    if (event.key !== 'Tab') return;
    const items = $$(FOCUSABLE, sidebar).filter((el) => el.getClientRects().length);
    const first = items[0]; const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  desktop.addEventListener('change', () => { closeSidebar({ restoreFocus: false }); syncSidebarMode(); });

  /* -------------------------------------------------------------- sign out */
  $$('[data-sign-out]').forEach((link) => {
    link.addEventListener('click', () => {
      session.remove(STATE_KEY);
      session.remove(SESSION_KEY);
    });
  });

  /* ---------------------------------------------------------------- init */
  function renderAll() {
    bindAll();
    renderClaims();
  }

  syncSidebarMode();
  renderAll();
  window.addEventListener('hashchange', route);
  route();
})();
