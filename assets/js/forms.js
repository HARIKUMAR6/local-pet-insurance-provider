/**
 * Pawstead — shared form validation for prototype forms (Contact, Claims).
 * Exposes window.PawsteadForms.attach(form, { rules, onValid }).
 *
 * - `rules` maps a field name to a function (trimmedValue, field) => message;
 *   an empty string means the value is valid.
 * - Errors render into #<fieldId>-error (already linked via aria-describedby),
 *   with aria-invalid on the field and a counted summary (role="alert").
 * - After the first submit attempt, fields re-validate as they are corrected.
 * Nothing is ever sent: onValid decides what the page shows.
 */
(() => {
  'use strict';

  const ERROR_ICON =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5v4.25M8 11.25v.01"/></svg>';

  function showError(field, message) {
    const error = document.getElementById(`${field.id}-error`);
    if (!error) return;
    if (message) {
      field.setAttribute('aria-invalid', 'true');
      error.innerHTML = `${ERROR_ICON}<span></span>`;
      error.querySelector('span').textContent = message;
      error.hidden = false;
    } else {
      field.removeAttribute('aria-invalid');
      error.textContent = '';
      error.hidden = true;
    }
  }

  function attach(form, { rules, onValid }) {
    const summary = form.querySelector('[data-form-summary]');
    const summaryText = form.querySelector('[data-form-summary-text]');
    const fields = () => Object.keys(rules).map((name) => form.elements[name]);
    let submitted = false;

    const validateField = (field) => {
      const message = rules[field.name](field.value.trim(), field);
      showError(field, message);
      return !message;
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted = true;
      const invalid = fields().filter((field) => !validateField(field));

      if (invalid.length) {
        summaryText.textContent =
          invalid.length === 1 ? 'Please correct the highlighted field.' : `Please correct the ${invalid.length} highlighted fields.`;
        summary.hidden = false;
        invalid[0].focus();
        return;
      }

      summary.hidden = true;
      onValid(form);
    });

    const recheck = (event) => {
      if (!submitted || !rules[event.target.name]) return;
      validateField(event.target);
      if (!form.querySelector('[aria-invalid="true"]')) summary.hidden = true;
    };
    form.addEventListener('input', recheck);
    form.addEventListener('change', recheck);

    return {
      validateField,
      reset() {
        form.reset();
        submitted = false;
        fields().forEach((field) => showError(field, ''));
        summary.hidden = true;
      },
      get submitted() {
        return submitted;
      },
    };
  }

  window.PawsteadForms = { attach };
})();
