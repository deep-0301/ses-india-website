/* Safal Embedded Solution site behaviour. Pages stay readable without this file. */
(function () {
  'use strict';

  var EMAILJS = {
    service: 'service_c72qp85',
    template: 'template_0gr9hf6',
    publicKey: 'MWgE4ansXo6Ys_Wv8'
  };

  var PRODUCTS = {
    'mobile-pump-starter': 'Mobile Pump Starter',
    'industrial-gsm-gprs-modem': 'Industrial GSM GPRS Modem',
    'security-device': 'Security Device',
    'gsm-gprs-modbus-modem': 'GSM GPRS Modbus Modem',
    'gate-lock-controller': 'GSM Based Main Gate Lock Controller',
    'dot-matrix-display': 'Dot Matrix Display'
  };

  var ENQUIRY_KEY = 'ses-enquiry';

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* Storage can be blocked; the page still works for this visit. */ }
    return null;
  }

  function readEnquiry() {
    try {
      var list = JSON.parse(store(ENQUIRY_KEY) || '[]');
      return list.filter(function (slug) { return PRODUCTS[slug]; });
    } catch (e) { return []; }
  }

  /* Theme */
  var themeBtn = document.querySelector('[data-theme-toggle]');
  function isDark() {
    var set = document.documentElement.getAttribute('data-theme');
    if (set) return set === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function labelTheme() {
    if (themeBtn) themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
  }
  if (themeBtn) {
    labelTheme();
    themeBtn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      store('ses-theme', next);
      labelTheme();
    });
  }

  /* Mobile menu */
  var menuBtn = document.querySelector('[data-menu-toggle]');
  var nav = document.getElementById('site-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* Copyright year */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  /* Product filter */
  var filters = document.querySelectorAll('.filter');
  var products = document.querySelectorAll('.product');
  var countEl = document.querySelector('.filter-count');

  function applyFilter(tag) {
    var shown = 0;
    products.forEach(function (p) {
      var match = tag === 'all' || p.getAttribute('data-tags').split(' ').indexOf(tag) !== -1;
      p.hidden = !match;
      if (match) shown++;
    });
    filters.forEach(function (f) {
      f.setAttribute('aria-pressed', String(f.getAttribute('data-filter') === tag));
    });
    if (countEl) countEl.textContent = 'Showing ' + shown + (shown === 1 ? ' product' : ' products');
  }
  filters.forEach(function (f) {
    f.addEventListener('click', function () { applyFilter(f.getAttribute('data-filter')); });
  });
  if (filters.length) applyFilter('all');
  /* A link from the hero board must never land on a filtered-out product. */
  window.addEventListener('hashchange', function () {
    var target = document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains('product') && target.hidden) {
      applyFilter('all');
      target.scrollIntoView();
    }
  });

  /* Enquiry list */
  var bar = document.querySelector('.enquiry-bar');
  var enquiryBtns = document.querySelectorAll('[data-enquire]');

  function renderEnquiry() {
    var list = readEnquiry();
    enquiryBtns.forEach(function (btn) {
      var inList = list.indexOf(btn.getAttribute('data-enquire')) !== -1;
      btn.setAttribute('aria-pressed', String(inList));
      btn.textContent = inList ? 'Added to enquiry' : 'Add to enquiry';
    });
    if (bar) {
      bar.hidden = list.length === 0;
      bar.querySelector('.count').textContent =
        list.length + (list.length === 1 ? ' product' : ' products') + ' in your enquiry';
    }
  }
  enquiryBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var slug = btn.getAttribute('data-enquire');
      var list = readEnquiry();
      var at = list.indexOf(slug);
      if (at === -1) list.push(slug); else list.splice(at, 1);
      store(ENQUIRY_KEY, JSON.stringify(list));
      renderEnquiry();
    });
  });
  if (bar) {
    bar.querySelector('.clear').addEventListener('click', function () {
      store(ENQUIRY_KEY, null);
      renderEnquiry();
    });
    renderEnquiry();
  }

  /* Contact form */
  var form = document.getElementById('contact-form');
  if (!form) return;

  var params = new URLSearchParams(location.search);
  var messageEl = form.elements.message;
  var demo = params.get('demo');
  if (demo && PRODUCTS[demo]) {
    messageEl.value = 'I would like to schedule a demo of the ' + PRODUCTS[demo] + '.';
  } else if (params.has('enquiry')) {
    var names = readEnquiry().map(function (slug) { return PRODUCTS[slug]; });
    if (names.length) messageEl.value = 'I would like to enquire about: ' + names.join(', ') + '.';
  }

  var RULES = {
    name: { test: function (v) { return v.trim().length > 0; }, error: 'Enter your name.' },
    email: { test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }, error: 'Enter an email address like name@company.com.' },
    /* Accepts international numbers, since customers can pick any country. */
    phone: { test: function (v) { return /^\+?[0-9]{7,15}$/.test(v.replace(/[\s()-]/g, '')); }, error: 'Enter a phone number with 7 to 15 digits, including the country code if outside India.' },
    country: { test: function (v) { return v !== ''; }, error: 'Select your country.' },
    message: { test: function (v) { return v.trim().length > 0; }, error: 'Enter your message.' }
  };

  function checkField(name) {
    var el = form.elements[name];
    var err = document.getElementById(name + '-error');
    var valid = RULES[name].test(el.value);
    el.setAttribute('aria-invalid', String(!valid));
    err.textContent = valid ? '' : RULES[name].error;
    err.hidden = valid;
    return valid;
  }

  Object.keys(RULES).forEach(function (name) {
    form.elements[name].addEventListener('input', function () {
      if (form.elements[name].getAttribute('aria-invalid') === 'true') checkField(name);
    });
  });

  var statusEl = document.getElementById('form-status');
  var submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    statusEl.textContent = '';
    statusEl.className = 'form-status';

    var firstBad = null;
    Object.keys(RULES).forEach(function (name) {
      if (!checkField(name) && !firstBad) firstBad = form.elements[name];
    });
    if (firstBad) { firstBad.focus(); return; }

    /* The hidden field is only ever filled in by spam bots. */
    if (form.elements.website.value) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS.service,
        template_id: EMAILJS.template,
        user_id: EMAILJS.publicKey,
        template_params: {
          name: form.elements.name.value.trim(),
          country: form.elements.country.value,
          email: form.elements.email.value.trim(),
          phone: form.elements.phone.value.trim(),
          message: messageEl.value.trim()
        }
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('EmailJS responded ' + res.status);
      statusEl.textContent = 'Your message has been sent successfully!';
      statusEl.className = 'form-status ok';
      form.reset();
      store(ENQUIRY_KEY, null);
    }).catch(function () {
      statusEl.textContent = 'Your message was not sent. Try again, or email sales@ses-india.com or call +91 8460521158.';
      statusEl.className = 'form-status fail';
    }).finally(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    });
  });
})();
