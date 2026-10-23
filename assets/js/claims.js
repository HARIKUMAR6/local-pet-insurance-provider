/**
 * Pawstead — claim submission & tracking prototype (claims.html only).
 * Needs forms.js. Frontend demonstration only: nothing is sent, uploaded or
 * stored (no network, no localStorage). A valid submission switches the
 * status panel from sample data to a simulated "Submitted" state in memory.
 */
(() => {
  'use strict';

  const form = document.querySelector('[data-claim-form]');
  if (!form || !window.PawsteadForms) return;

  const success = document.querySelector('[data-claim-success]');
  const successPet = document.querySelector('[data-claim-success-pet]');
  const resetButton = document.querySelector('[data-claim-reset]');
  const tracker = document.querySelector('[data-tracker]');
  const statusTitle = document.querySelector('[data-status-title]');
  const statusTag = document.querySelector('[data-status-tag]');
  const statusMeta = document.querySelector('[data-status-meta]');
  const statusLive = document.querySelector('[data-status-live]');
  const dateInput = form.elements.visitDate;

  const POLICY = /^PW-\d{6}$/i;
  const AMOUNT = /^\d{1,6}(\.\d{1,2})?$/;
  const AMOUNT_MAX = 100000;
  const SUMMARY_MIN = 10;

  // Local calendar date as YYYY-MM-DD (date inputs use local dates).
  const today = () => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  };
  dateInput.max = today();

  const SAMPLE = {
    title: 'Sample claim status',
    tag: 'Sample interface data',
    meta: statusMeta.textContent,
    states: { submitted: 'done', review: 'current', info: 'upcoming', decision: 'upcoming' },
  };

  const STATE_TEXT = { done: 'Completed.', current: 'Current step.', upcoming: 'Not reached.' };

  function setTracker(states) {
    tracker.querySelectorAll('[data-step]').forEach((step) => {
      const state = states[step.dataset.step];
      step.dataset.state = state;
      if (state === 'current') step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
      step.querySelector('[data-state-text]').textContent = STATE_TEXT[state];
    });
  }

  const validator = window.PawsteadForms.attach(form, {
    rules: {
      policy: (v) => {
        if (!v) return 'Enter a policy reference.';
        return POLICY.test(v) ? '' : 'Use the illustrative format PW-123456 (PW, a hyphen, then six digits).';
      },
      pet: (v) => (v ? '' : 'Enter your pet’s name.'),
      visitDate: (v, field) => {
        if (!v) return field.validity.badInput ? 'Enter a complete, valid date.' : 'Enter the date of the veterinary visit.';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) return 'Enter a complete, valid date.';
        return v > today() ? 'The visit date can’t be in the future.' : '';
      },
      category: (v) => (v ? '' : 'Choose a claim category.'),
      amount: (v) => {
        if (!v) return '';
        const plain = v.replace(/,/g, '');
        if (!AMOUNT.test(plain)) return 'Enter numbers only, for example 361.50, with no currency symbol.';
        const n = Number(plain);
        if (n <= 0) return 'Enter an amount greater than 0, or leave this field empty.';
        return n > AMOUNT_MAX ? 'Enter an amount of $100,000 or less for this prototype.' : '';
      },
      summary: (v) => {
        if (!v) return 'Enter a brief treatment summary.';
        return v.length >= SUMMARY_MIN ? '' : `Add a little more detail: at least ${SUMMARY_MIN} characters (currently ${v.length}).`;
      },
    },
    onValid() {
      const pet = form.elements.pet.value.trim();
      const reference = `DEMO-${Math.floor(1000 + Math.random() * 9000)}`;

      successPet.textContent = pet ? ` for ${pet}` : '';
      form.hidden = true;
      success.hidden = false;

      statusTitle.textContent = 'Your simulated claim';
      statusTag.textContent = 'Simulated · not sent';
      statusMeta.textContent = `Demonstration reference ${reference}. Shown in this page only; it disappears when you leave or reload.`;
      setTracker({ submitted: 'current', review: 'upcoming', info: 'upcoming', decision: 'upcoming' });
      statusLive.textContent = 'Status panel updated: simulated claim shown as Submitted. Nothing was sent to an insurer.';

      success.focus();
    },
  });

  resetButton?.addEventListener('click', () => {
    validator.reset();
    dateInput.max = today();
    success.hidden = true;
    form.hidden = false;
    statusTitle.textContent = SAMPLE.title;
    statusTag.textContent = SAMPLE.tag;
    statusMeta.textContent = SAMPLE.meta;
    setTracker(SAMPLE.states);
    statusLive.textContent = 'Status panel reset to sample data.';
    form.elements.policy.focus();
  });
})();
