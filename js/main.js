/* ============================================================
   GENERACIÓN TECH · main.js
   Interacciones de la landing (sin dependencias).
   01 Contacto (datos únicos)   06 Métricas animadas
   02 Header, progreso y menú   07 Cursor personalizado
   03 Reveal on scroll          08 FAQ
   04 Efectos fx + tilt         09 Selector custom accesible
   05 Carrusel                  10 Formulario
                                11 WhatsApp flotante y varios
   ============================================================ */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ============================================================ 01 CONTACTO */
  const CONTACT = {
    email: 'generaciontech.gt@gmail.com',
    waNumber: '5491159059493',
    waDefault: 'Hola! Vengo desde la web de Generación Tech y quiero más información.',
  };
  const waLink = (text = CONTACT.waDefault) => `https://wa.me/${CONTACT.waNumber}?text=${encodeURIComponent(text)}`;
  const mailLink = (subject, body) =>
    `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  /* ============================================================ 02 HEADER, PROGRESO Y MENÚ */
  const header = $('#siteHeader');
  const nav = $('#nav');
  const progress = $('#progress');
  let scrollTicking = false;

  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      progress.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;
      header.classList.toggle('scrolled', window.scrollY > 40);
      scrollTicking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Link activo según la sección visible
  const navLinks = $$('.nav-links a[href^="#"]:not(.btn)');
  const linkFor = id => navLinks.find(a => a.getAttribute('href') === '#' + id);
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
      const link = linkFor(e.target.id);
      if (link) { link.classList.add('active'); link.setAttribute('aria-current', 'true'); }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => sectionObs.observe(s));

  // Menú mobile (drawer)
  const toggle = $('#navToggle');
  const drawer = $('#navLinks');
  const backdrop = $('#navBackdrop');
  const mqDrawer = window.matchMedia('(max-width: 1023px)');
  let lastFocus = null;

  function openMenu() {
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    void backdrop.offsetWidth; // reflow para que la transición arranque
    nav.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Cerrar menú');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('menu-open');
    const first = drawer.querySelector('a');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 80);
  }
  function closeMenu(restoreFocus = true) {
    if (!nav.classList.contains('open')) return;
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
    document.body.style.overflow = '';
    document.body.classList.remove('menu-open');
    setTimeout(() => { if (!nav.classList.contains('open')) backdrop.hidden = true; }, 350);
    if (restoreFocus && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', () => (nav.classList.contains('open') ? closeMenu() : openMenu()));
  backdrop.addEventListener('click', () => closeMenu());
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => closeMenu(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); return; }
    // Mantener el foco dentro del menú abierto
    if (e.key === 'Tab' && nav.classList.contains('open')) {
      const items = [toggle, ...drawer.querySelectorAll('a')];
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }
  });
  const onDrawerMq = () => { if (!mqDrawer.matches) closeMenu(false); };
  if (mqDrawer.addEventListener) mqDrawer.addEventListener('change', onDrawerMq);

  /* ============================================================ 03 REVEAL ON SCROLL */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !mqReduce.matches) {
    const ro = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => ro.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ============================================================ 04 EFECTOS FX + TILT
     Un solo listener: actualiza --mouse-x/--mouse-y en el elemento bajo el
     puntero (y sus ancestros .fx) y aplica inclinación 3D a los .tilt. */
  const FX_SEL = '.fx, .btn, .control';
  const TILT_MAX = 5; // grados
  const allowTilt = finePointer && !mqReduce.matches;
  let tilted = new Set();
  let pending = null;
  let fxRaf = 0;

  function fxChain(target) {
    const chain = [];
    let el = target && target.closest ? target.closest(FX_SEL) : null;
    while (el) {
      chain.push(el);
      el = el.parentElement ? el.parentElement.closest(FX_SEL) : null;
    }
    return chain;
  }
  function resetTilt(el) {
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.classList.remove('is-tilting');
  }
  function applyFx() {
    fxRaf = 0;
    if (!pending) return;
    const { x, y, target } = pending;
    const chain = fxChain(target);
    const nowTilted = new Set();
    chain.forEach(el => {
      const r = el.getBoundingClientRect();
      const lx = x - r.left;
      const ly = y - r.top;
      el.style.setProperty('--mouse-x', lx.toFixed(1) + 'px');
      el.style.setProperty('--mouse-y', ly.toFixed(1) + 'px');
      if (allowTilt && el.classList.contains('tilt')) {
        const px = Math.min(Math.max(lx / r.width, 0), 1) - 0.5;
        const py = Math.min(Math.max(ly / r.height, 0), 1) - 0.5;
        el.style.setProperty('--ry', (px * 2 * TILT_MAX).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-py * 2 * TILT_MAX).toFixed(2) + 'deg');
        el.classList.add('is-tilting');
        nowTilted.add(el);
      }
    });
    tilted.forEach(el => { if (!nowTilted.has(el)) resetTilt(el); });
    tilted = nowTilted;
  }
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    pending = { x: e.clientX, y: e.clientY, target: e.target };
    if (!fxRaf) fxRaf = requestAnimationFrame(applyFx);
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => {
    tilted.forEach(resetTilt);
    tilted.clear();
  });
  // Al hacer scroll con la rueda el elemento bajo el cursor cambia
  window.addEventListener('scroll', () => {
    if (pending && !fxRaf) {
      const t = document.elementFromPoint(pending.x, pending.y);
      if (t) { pending.target = t; fxRaf = requestAnimationFrame(applyFx); }
    }
  }, { passive: true });

  // Touch: el brillo aparece en el punto tocado
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    fxChain(e.target).forEach(el => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mouse-x', (e.clientX - r.left).toFixed(1) + 'px');
      el.style.setProperty('--mouse-y', (e.clientY - r.top).toFixed(1) + 'px');
      el.classList.add('is-pressed');
      clearTimeout(el._pressT);
      el._pressT = setTimeout(() => el.classList.remove('is-pressed'), 650);
    });
  }, { passive: true });

  /* ============================================================ 05 CARRUSEL (solo corre visible) */
  const carObs = new IntersectionObserver(entries => {
    entries.forEach(e => e.target.querySelectorAll('.sol-carousel').forEach(c => c.classList.toggle('running', e.isIntersecting)));
  }, { threshold: 0.1 });
  $$('.sol-carousel-wrap').forEach(w => carObs.observe(w));

  /* ============================================================ 06 MÉTRICAS ANIMADAS */
  function countUp(el) {
    const to = parseFloat(el.dataset.count);
    const pre = el.dataset.prefix || '';
    const suf = el.dataset.suffix || '';
    const dur = 1600;
    const t0 = performance.now();
    const step = now => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(to * eased) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  if (!mqReduce.matches) {
    const mObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        $$('.val[data-count]', e.target).forEach((el, i) => setTimeout(() => countUp(el), i * 120));
        mObs.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    const grid = $('.metrics-grid');
    if (grid) mObs.observe(grid);
  }

  /* ============================================================ 07 CURSOR PERSONALIZADO (desktop) */
  if (finePointer && !mqReduce.matches) {
    const dot = $('#curDot');
    const ring = $('#curRing');
    const body = document.body;
    let mx = -100, my = -100, rx = -100, ry = -100, ringRaf = 0, shown = false;
    const HOVER = 'a,button,[role="button"],[role="combobox"],[role="option"],label,.fx,.faq-q,.wa-float';
    const TEXT = 'input:not([type="checkbox"]):not([type="radio"]),textarea,p,h1,h2,h3,h4,blockquote,li';

    const follow = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      ringRaf = Math.abs(mx - rx) + Math.abs(my - ry) > 0.3 ? requestAnimationFrame(follow) : 0;
    };
    document.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) {
        shown = true;
        rx = mx = e.clientX; ry = my = e.clientY;
        document.documentElement.classList.add('has-cursor');
      }
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
      if (!ringRaf) ringRaf = requestAnimationFrame(follow);
    }, { passive: true });
    document.addEventListener('mouseover', e => {
      const t = e.target;
      if (!t.closest) return;
      const isHover = !!t.closest(HOVER) && !t.closest('input,textarea');
      const isText = !isHover && !!t.closest(TEXT);
      body.classList.toggle('cur-hover', isHover);
      body.classList.toggle('cur-text', isText);
    });
    document.addEventListener('mousedown', () => body.classList.add('cur-click'));
    document.addEventListener('mouseup', () => body.classList.remove('cur-click'));
    document.documentElement.addEventListener('mouseleave', () => body.classList.add('cur-hidden'));
    document.documentElement.addEventListener('mouseenter', () => body.classList.remove('cur-hidden'));
  }

  /* ============================================================ 08 FAQ (acordeón accesible) */
  $$('.faq-item').forEach(item => {
    const btn = $('.faq-q', item);
    btn.addEventListener('click', () => {
      const willOpen = !item.classList.contains('open');
      $$('.faq-item.open').forEach(o => {
        o.classList.remove('open');
        $('.faq-q', o).setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ============================================================ 09 SELECTOR CUSTOM ACCESIBLE
     Patrón "select-only combobox" (WAI-ARIA APG): el foco queda en el
     combobox y la opción activa se indica con aria-activedescendant.
     El <select> nativo se mantiene oculto y sincronizado para el envío. */
  const OPT_ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    hashtag: '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
    layers: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 01-8.5 8.5 8.5 8.5 0 01-3.8-.9L3 20l1.4-5.2A8.5 8.5 0 1121 11.5z"/>',
  };
  const svgIcon = inner =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function enhanceSelect(select) {
    const wrap = select.closest('.select');
    const field = select.closest('.field');
    const label = field.querySelector('label');
    const id = select.id;
    const options = Array.from(select.options).filter(o => o.value !== '' && !o.disabled);
    const placeholder = (Array.from(select.options).find(o => o.value === '') || {}).textContent || 'Elegí una opción';

    const combo = document.createElement('div');
    combo.className = 'select-trigger';
    combo.id = id + '-combo';
    combo.tabIndex = 0;
    combo.setAttribute('role', 'combobox');
    combo.setAttribute('aria-haspopup', 'listbox');
    combo.setAttribute('aria-expanded', 'false');
    combo.setAttribute('aria-controls', id + '-list');
    combo.setAttribute('aria-labelledby', label.id + ' ' + combo.id);
    const valueEl = document.createElement('span');
    valueEl.className = 'select-value';
    combo.appendChild(valueEl);

    const list = document.createElement('ul');
    list.className = 'select-list';
    list.id = id + '-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-labelledby', label.id);
    list.tabIndex = -1;
    list.hidden = true;

    const items = options.map((o, i) => {
      const li = document.createElement('li');
      li.className = 'select-option';
      li.id = `${id}-opt-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.dataset.value = o.value;
      const [title, desc] = o.textContent.split(' — ');
      const ic = document.createElement('span');
      ic.className = 'opt-ic';
      ic.innerHTML = svgIcon(OPT_ICONS[o.dataset.icon] || OPT_ICONS.chat);
      const txt = document.createElement('span');
      txt.className = 'opt-txt';
      const t = document.createElement('span');
      t.className = 'opt-title';
      t.textContent = title.trim();
      txt.appendChild(t);
      if (desc) {
        const d = document.createElement('span');
        d.className = 'opt-desc';
        d.textContent = desc.trim();
        txt.appendChild(d);
      }
      const check = document.createElement('span');
      check.innerHTML = '<svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
      li.append(ic, txt, check.firstChild);
      list.appendChild(li);
      return li;
    });

    // El nativo queda fuera del orden de tabulación y del árbol accesible
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    label.removeAttribute('for');
    label.addEventListener('click', () => combo.focus());
    wrap.classList.add('is-enhanced');
    wrap.insertBefore(combo, select.nextSibling);
    wrap.appendChild(list);

    let active = -1;
    let open = false;
    let typed = '';
    let typedT = 0;

    const selectedIndex = () => options.findIndex(o => o.value === select.value);

    function sync() {
      const i = selectedIndex();
      items.forEach((li, k) => li.setAttribute('aria-selected', String(k === i)));
      valueEl.textContent = i >= 0 ? options[i].textContent : placeholder;
      combo.classList.toggle('is-placeholder', i < 0);
    }
    function setActive(i, scroll = true) {
      active = Math.max(0, Math.min(items.length - 1, i));
      items.forEach((li, k) => li.classList.toggle('is-active', k === active));
      combo.setAttribute('aria-activedescendant', items[active].id);
      if (scroll) items[active].scrollIntoView({ block: 'nearest' });
    }
    function openList(startAt) {
      if (open) return;
      open = true;
      list.hidden = false;
      wrap.classList.add('is-open');
      combo.setAttribute('aria-expanded', 'true');
      // ¿Abre hacia arriba si no hay espacio abajo?
      const r = combo.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      wrap.classList.toggle('drop-up', spaceBelow < Math.min(330, list.scrollHeight + 20) && r.top > spaceBelow);
      const sel = selectedIndex();
      setActive(typeof startAt === 'number' ? startAt : sel >= 0 ? sel : 0);
      document.addEventListener('pointerdown', onOutside, true);
    }
    function closeList(focusCombo = true) {
      if (!open) return;
      open = false;
      list.hidden = true;
      wrap.classList.remove('is-open', 'drop-up');
      combo.setAttribute('aria-expanded', 'false');
      combo.removeAttribute('aria-activedescendant');
      document.removeEventListener('pointerdown', onOutside, true);
      if (focusCombo) combo.focus();
    }
    function choose(i) {
      if (i < 0 || i >= options.length) return;
      if (select.value !== options[i].value) {
        select.value = options[i].value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      sync();
    }
    function onOutside(e) {
      if (!wrap.contains(e.target)) closeList(false);
    }
    function typeahead(ch) {
      clearTimeout(typedT);
      typed += normalize(ch);
      typedT = setTimeout(() => { typed = ''; }, 600);
      const start = open ? active + 1 : selectedIndex() + 1;
      const order = items.map((_, k) => (start + k) % items.length);
      const match = order.find(k => normalize(options[k].textContent).startsWith(typed))
        ?? order.find(k => normalize(options[k].textContent).startsWith(typed[0]));
      if (match === undefined) return;
      if (open) setActive(match); else choose(match);
    }

    combo.addEventListener('click', () => (open ? closeList() : openList()));
    combo.addEventListener('keydown', e => {
      const k = e.key;
      if (!open) {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) {
          e.preventDefault();
          const sel = selectedIndex();
          openList(k === 'ArrowUp' ? Math.max(0, sel - 1) : undefined);
        } else if (k === 'Home') { e.preventDefault(); openList(0); }
        else if (k === 'End') { e.preventDefault(); openList(items.length - 1); }
        else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) typeahead(k);
        return;
      }
      switch (k) {
        case 'ArrowDown': e.preventDefault(); e.altKey ? (choose(active), closeList()) : setActive(active + 1); break;
        case 'ArrowUp': e.preventDefault(); e.altKey ? (choose(active), closeList()) : setActive(active - 1); break;
        case 'Home': e.preventDefault(); setActive(0); break;
        case 'End': e.preventDefault(); setActive(items.length - 1); break;
        case 'PageDown': e.preventDefault(); setActive(active + 4); break;
        case 'PageUp': e.preventDefault(); setActive(active - 4); break;
        case 'Enter': case ' ': e.preventDefault(); choose(active); closeList(); break;
        case 'Escape': e.preventDefault(); e.stopPropagation(); closeList(); break;
        case 'Tab': choose(active); closeList(false); break;
        default:
          if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) typeahead(k);
      }
    });
    combo.addEventListener('blur', e => {
      if (open && !wrap.contains(e.relatedTarget)) closeList(false);
    });
    list.addEventListener('pointermove', e => {
      const li = e.target.closest('.select-option');
      if (li) { const i = items.indexOf(li); if (i !== active) setActive(i, false); }
    });
    list.addEventListener('pointerdown', e => e.preventDefault()); // mantiene el foco en el combobox
    list.addEventListener('click', e => {
      const li = e.target.closest('.select-option');
      if (!li) return;
      choose(items.indexOf(li));
      closeList();
    });
    select.addEventListener('change', sync);
    select.form && select.form.addEventListener('reset', () => setTimeout(sync, 0));
    sync();
    return combo;
  }
  $$('select.select-native').forEach(enhanceSelect);

  /* ============================================================ 10 FORMULARIO */
  const form = $('#contactForm');
  if (form) {
    form.noValidate = true; // validación propia, con mensajes claros
    const endpoint = form.dataset.endpoint || form.action;
    const btn = $('#formSubmitBtn');
    const btnLabel = $('.btn-label', btn);
    const statusBox = $('#formStatus');
    const success = $('#formSuccess');
    const msg = form.elements.message;
    const counter = $('#msgCount');
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const PHONE_RE = /^\+?[\d\s().-]{8,24}$/;
    let attempted = false;

    const rules = {
      name: v => (!v.trim() ? 'Contanos tu nombre.' : v.trim().length < 2 ? 'El nombre parece incompleto.' : ''),
      email: v => (!v.trim() ? 'Necesitamos tu email para responderte.' : !EMAIL_RE.test(v.trim()) ? 'Revisá el email (ej: nombre@empresa.com).' : ''),
      phone: v => {
        const t = v.trim();
        if (!t) return '';
        const digits = t.replace(/\D/g, '').length;
        return !PHONE_RE.test(t) || digits < 8 ? 'Número inválido: usá solo números, +, espacios o guiones.' : '';
      },
      message: v => (v.length > 1500 ? 'El mensaje supera los 1500 caracteres.' : ''),
    };

    function setError(name, text) {
      const input = form.elements[name];
      const fieldEl = input.closest('.field');
      const err = $('#e-' + (name === 'message' ? 'msg' : name));
      fieldEl.classList.toggle('is-invalid', !!text);
      if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      if (err) err.textContent = text;
    }
    function validate(name) {
      const text = rules[name](form.elements[name].value);
      setError(name, text);
      return !text;
    }
    function validateAll() {
      let first = null;
      Object.keys(rules).forEach(n => { if (!validate(n) && !first) first = form.elements[n]; });
      return first;
    }
    Object.keys(rules).forEach(n => {
      const input = form.elements[n];
      input.addEventListener('blur', () => { if (input.value || attempted) validate(n); });
      input.addEventListener('input', () => {
        if (attempted || input.getAttribute('aria-invalid') === 'true') validate(n);
      });
    });

    // Contador del mensaje
    const updateCount = () => {
      const len = msg.value.length;
      counter.textContent = `${len}/1500`;
      counter.classList.toggle('warn', len > 1350);
    };
    msg.addEventListener('input', updateCount);
    updateCount();

    const data = () => ({
      name: form.elements.name.value.trim(),
      company: form.elements.company.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      interest: form.elements.interest.value || 'Sin especificar',
      message: form.elements.message.value.trim(),
    });
    const summary = d => [
      `Nombre: ${d.name}`,
      d.company && `Empresa: ${d.company}`,
      `Email: ${d.email}`,
      d.phone && `WhatsApp: ${d.phone}`,
      `Necesidad: ${d.interest}`,
      d.message && `\nMensaje:\n${d.message}`,
    ].filter(Boolean).join('\r\n');

    function setLoading(on) {
      btn.disabled = on;
      btn.setAttribute('aria-busy', String(on));
      if (on) {
        btn.dataset.label = btnLabel.textContent;
        btnLabel.textContent = 'Enviando…';
        const sp = document.createElement('span');
        sp.className = 'spinner';
        sp.setAttribute('aria-hidden', 'true');
        btn.querySelector('.arrow').replaceWith(sp);
      } else {
        btnLabel.textContent = btn.dataset.label || btnLabel.textContent;
        const sp = btn.querySelector('.spinner');
        if (sp) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('class', 'arrow');
          svg.setAttribute('aria-hidden', 'true');
          const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
          use.setAttribute('href', '#i-arrow');
          svg.appendChild(use);
          sp.replaceWith(svg);
        }
      }
    }

    function showError(d) {
      const subject = `Consulta desde la web — ${d.interest}`;
      const waText = `Hola! Vengo desde la web de Generación Tech. Soy ${d.name}${d.company ? ' de ' + d.company : ''}. Me interesa: ${d.interest}.${d.message ? ' ' + d.message : ''}`;
      statusBox.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'form-alert error';
      box.innerHTML = '<svg class="fa-ic" aria-hidden="true"><use href="#i-alert"/></svg>' +
        '<div><b>No pudimos enviar tu consulta.</b>Puede ser un problema de conexión. Probá de nuevo o mandanos tus datos por otro medio (ya van completos):' +
        '<div class="form-alert-actions"></div></div>';
      const actions = $('.form-alert-actions', box);
      const wa = document.createElement('a');
      wa.className = 'btn btn-wa';
      wa.href = waLink(waText);
      wa.target = '_blank';
      wa.rel = 'noopener';
      wa.innerHTML = '<svg aria-hidden="true"><use href="#i-wa"/></svg>Enviar por WhatsApp';
      const mail = document.createElement('a');
      mail.className = 'btn btn-ghost';
      mail.href = mailLink(subject, summary(d));
      mail.innerHTML = '<svg aria-hidden="true"><use href="#i-mail"/></svg>Enviar por email';
      actions.append(wa, mail);
      statusBox.appendChild(box);
    }

    function showSuccess(name) {
      $('#successName').textContent = name ? ', ' + name.split(' ')[0] : '';
      form.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
      success.scrollIntoView({ behavior: mqReduce.matches ? 'auto' : 'smooth', block: 'center' });
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      attempted = true;
      statusBox.innerHTML = '';
      const firstInvalid = validateAll();
      if (firstInvalid) { firstInvalid.focus(); return; }

      const d = data();
      // Honeypot: si un bot lo completó, simulamos éxito sin enviar
      if (form.elements._honey && form.elements._honey.value) { showSuccess(d.name); form.reset(); return; }

      setLoading(true);
      const ctrl = 'AbortController' in window ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 15000) : 0;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            ...d,
            _subject: `Nueva consulta web — ${d.name} (${d.interest})`,
            _replyto: d.email,
            _template: 'table',
            _captcha: 'false',
          }),
          signal: ctrl ? ctrl.signal : undefined,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false || json.success === 'false' || json.errors) {
          throw new Error(json.message || 'Error de envío');
        }
        showSuccess(d.name);
        form.reset();
        attempted = false;
        updateCount();
      } catch (err) {
        showError(d);
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    });

    $('#formAgain').addEventListener('click', () => {
      success.hidden = true;
      form.hidden = false;
      form.elements.name.focus();
    });
  }

  /* ============================================================ 11 WHATSAPP FLOTANTE Y VARIOS */
  const wa = $('#waFloat');
  if (wa) {
    const show = () => wa.classList.add('visible');
    const t = setTimeout(show, 2200);
    window.addEventListener('scroll', function once() {
      if (window.scrollY > 200) { clearTimeout(t); show(); window.removeEventListener('scroll', once); }
    }, { passive: true });
    // Se esconde mientras se ve la sección de contacto (ahí ya están WhatsApp y el formulario)
    const contact = $('#contacto');
    if (contact) {
      new IntersectionObserver(([e]) => wa.classList.toggle('is-tucked', e.isIntersecting), { threshold: 0.25 }).observe(contact);
    }
  }

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
