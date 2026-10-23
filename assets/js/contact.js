/**
 * Pawstead — contact form prototype (contact.html only). Needs forms.js.
 * Nothing is sent anywhere: a valid submission shows an on-page
 * confirmation that says so plainly.
 */
(() => {
  'use strict';

  const form = document.querySelector('[data-contact-form]');
  if (!form || !window.PawsteadForms) return;

  const success = document.querySelector('[data-form-success]');
  const successName = document.querySelector('[data-success-name]');
  const resetButton = document.querySelector('[data-form-reset]');
  const enquiry = form.elements.enquiry;

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MESSAGE_MIN = 20;

  const validator = window.PawsteadForms.attach(form, {
    rules: {
      name: (v) => (v ? '' : 'Enter your full name.'),
      email: (v) => {
        if (!v) return 'Enter your email address.';
        return EMAIL.test(v) ? '' : 'Enter an email address in the format name@example.com.';
      },
      enquiry: (v) => (v ? '' : 'Choose an enquiry type.'),
      subject: (v) => (v ? '' : 'Enter a subject.'),
      message: (v) => {
        if (!v) return 'Enter your message.';
        return v.length >= MESSAGE_MIN ? '' : `Your message needs at least ${MESSAGE_MIN} characters (currently ${v.length}).`;
      },
    },
    onValid() {
      const firstName = form.elements.name.value.trim().split(/\s+/)[0];
      successName.textContent = firstName ? `, ${firstName}` : '';
      form.hidden = true;
      success.hidden = false;
      success.focus();
    },
  });

  resetButton?.addEventListener('click', () => {
    validator.reset();
    success.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });

  // "Send a general enquiry" (and similar links) preselect the enquiry type.
  document.querySelectorAll('a[data-enquiry]').forEach((link) => {
    link.addEventListener('click', () => {
      enquiry.value = link.dataset.enquiry;
      if (validator.submitted) validator.validateField(enquiry);
    });
  });
})();
