/* Поведение шапки 2026: выпадашки, схлопывание верхнего уровня, тикер поводов,
   лента категорий (перетаскивание + подкрутка у краёв), мобильное меню. */
(function () {
  'use strict';
  var hdr = document.getElementById('hdr26');
  if (!hdr) return;

  var $ = function (s, r) { return (r || hdr).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || hdr).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* точная высота шапки → клиренс под ней; меряем в развёрнутом состоянии */
  function syncH() {
    if (hdr.classList.contains('is-compact')) return;
    var h = Math.round(hdr.getBoundingClientRect().height);
    if (h > 40) document.documentElement.style.setProperty('--hdr26-h', h + 'px');
  }
  // Текущая высота (свёрнутая или нет) — от неё пляшут затемнение и мобильное меню,
  // иначе после схлопывания под шапкой остаётся незатемнённая полоса.
  function syncNow() {
    var h = Math.round(hdr.getBoundingClientRect().height);
    if (h > 20) document.documentElement.style.setProperty('--hdr26-hnow', h + 'px');
  }
  // is-compact снимается в начале разворота, а высота едет ещё .26s. Замер в этот
  // момент записывал в --hdr26-h полусжатую шапку (119 вместо 148), и страница
  // уезжала вверх на разницу — до следующего resize. Меряем, когда анимация встала.
  var hTimer = null;
  function syncHSettled() {
    clearTimeout(hTimer);
    hTimer = setTimeout(syncH, 350);
  }
  window.addEventListener('resize', function () {
    syncHSettled();
    if (open) {
      var p = $('.hdr26-dd[data-p="' + open + '"]'), it = $('.hdr26-nv[data-dd="' + open + '"]');
      if (p && it) place(p, it);
    }
  });
  window.addEventListener('load', function () { syncH(); syncNow(); });
  syncH();
  syncNow();

  /* ——— выпадашки ——— */
  var navBox = $('.hdr26__n .hdr26__c');
  var ink = $('.hdr26-ink');
  var scrim = $('.hdr26-scrim');
  var items = $$('.hdr26-nv[data-dd]');
  var panels = $$('.hdr26-dd');
  var timer = null, open = null;

  /* Панель встаёт под своим пунктом и не вылезает за колонку контейнера:
     если справа не хватает места — сдвигается влево, но не дальше левого края сетки. */
  function place(p, it) {
    var box = hdr.querySelector('.hdr26__n .hdr26__c');
    if (!box) return;
    var h = hdr.getBoundingClientRect(), b = box.getBoundingClientRect(), r = it.getBoundingClientRect();
    var pad = 15;
    var left0 = b.left - h.left + pad, right0 = b.right - h.left - pad;
    var mw = Math.min(parseInt(p.dataset.mw || 900, 10), right0 - left0);
    p.style.width = mw + 'px';
    p.style.right = 'auto';
    p.style.left = left0 + 'px';
    var w = mw;
    var want = r.left - h.left - 18;
    p.style.left = Math.round(Math.max(left0, Math.min(want, right0 - w))) + 'px';
  }

  function moveInk(el) {
    if (!ink) return;
    if (!el) { ink.style.opacity = '0'; return; }
    ink.style.opacity = '1';
    ink.style.width = el.offsetWidth + 'px';
    ink.style.transform = 'translateX(' + (el.offsetLeft - 15) + 'px)';
  }
  function closeDd() {
    panels.forEach(function (p) { p.classList.remove('is-open'); });
    items.forEach(function (i) { i.classList.remove('is-on'); i.setAttribute('aria-expanded', 'false'); });
    if (scrim) scrim.classList.remove('is-open');
    moveInk(null);
    open = null;
  }
  function showDd(it) {
    var name = it.dataset.dd;
    if (open === name) return;
    panels.forEach(function (p) { p.classList.remove('is-open'); });
    items.forEach(function (i) { i.classList.remove('is-on'); i.setAttribute('aria-expanded', 'false'); });
    var p = $('.hdr26-dd[data-p="' + name + '"]');
    if (!p) return;
    syncNow();
    place(p, it);
    // перезапуск всплытия колонок
    $$('.hdr26-dd__col, .hdr26-dd__card, .hdr26-occ__c', p).forEach(function (s) {
      s.style.animation = 'none'; void s.offsetWidth; s.style.animation = '';
    });
    p.classList.add('is-open');
    it.classList.add('is-on');
    it.setAttribute('aria-expanded', 'true');
    if (window.hdr26Goal) window.hdr26Goal('hdr26-open', [it.textContent.trim()], true);
    if (scrim) scrim.classList.add('is-open');
    moveInk(it);
    open = name;
  }
  items.forEach(function (it) {
    // Первое раскрытие ждёт 250 мс, чтобы курсор по пути к поиску не открывал панели; соседнюю при открытой — быстро.
    it.addEventListener('mouseenter', function () { clearTimeout(timer); timer = setTimeout(function () { showDd(it); }, open ? 130 : 250); });
    it.addEventListener('click', function () { clearTimeout(timer); open === it.dataset.dd ? closeDd() : showDd(it); });
    it.addEventListener('focus', function () { showDd(it); });
  });
  if (navBox) {
    $$('.hdr26-svc a, .hdr26-chip button', navBox).forEach(function (el) {
      el.addEventListener('mouseenter', function () { clearTimeout(timer); timer = setTimeout(closeDd, 130); });
    });
  }
  hdr.addEventListener('mouseleave', function (e) {
    if (e.relatedTarget && hdr.contains(e.relatedTarget)) return;
    clearTimeout(timer); timer = setTimeout(closeDd, 220);
  });
  if (scrim) scrim.addEventListener('mouseenter', function () { clearTimeout(timer); timer = setTimeout(closeDd, 100); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDd(); closeTel(); closeMob(); } });

  /* ——— выпадашка телефона ——— */
  var tel = $('.hdr26-tel'), telBtn = $('.hdr26-tel__b'), telTimer = null;
  function closeTel() { if (tel) tel.classList.remove('is-open'); }
  if (telBtn) telBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    clearTimeout(telTimer);
    tel.classList.toggle('is-open');
  });
  // Контакты раскрываются наведением, как и панели меню: та же задержка на намерение,
  // и небольшая пауза на уход, чтобы успеть довести курсор до пунктов. Клик оставляем
  // ради тача, где наведения нет.
  if (tel) {
    tel.addEventListener('mouseenter', function () {
      clearTimeout(telTimer);
      telTimer = setTimeout(function () { tel.classList.add('is-open'); }, 130);
    });
    tel.addEventListener('mouseleave', function () {
      clearTimeout(telTimer);
      telTimer = setTimeout(closeTel, 220);
    });
  }
  document.addEventListener('click', function (e) { if (tel && !tel.contains(e.target)) closeTel(); });

  /* ——— схлопывание верхнего уровня ——— */
  var last = window.pageYOffset || document.documentElement.scrollTop, lock = 0;
  function setCompact(on) {
    if (hdr.classList.contains('is-compact') === on) return;
    hdr.classList.toggle('is-compact', on);
    // после разворота перемеряем и клиренс: если его успели испортить, он починится сам
    setTimeout(function () { syncNow(); syncH(); }, 300);
    if (on) closeDd();
    lock = (window.performance ? performance.now() : Date.now()) + 300;
  }
  window.addEventListener('scroll', function () {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    hdr.classList.toggle('is-stuck', y > 4);
    var now = window.performance ? performance.now() : Date.now();
    if (now < lock) { last = y; return; }
    if (y <= 8) setCompact(false);
    else if (y > last + 6) setCompact(true);
    else if (y < last - 6) setCompact(false);
    last = y;
  }, { passive: true });

  /* наведение на пилюлю «Актуальное» разворачивает строку обратно */
  var chip = $('.hdr26-chip');
  if (chip) {
    chip.addEventListener('mouseenter', function () { setCompact(false); });
    chip.addEventListener('click', function () { setCompact(false); });
  }

  /* ——— тикер поводов ——— */
  var slides = $$('.hdr26-tick__s'), dots = $$('.hdr26-dots button'), k = 0, tickTimer = null;
  function goTick(i) {
    if (!slides.length) return;
    slides[k].classList.remove('is-on');
    if (dots[k]) dots[k].classList.remove('is-on');
    k = (i + slides.length) % slides.length;
    slides[k].classList.add('is-on');
    if (dots[k]) dots[k].classList.add('is-on');
  }
  function autoTick() {
    clearInterval(tickTimer);
    if (reduced || slides.length < 2) return;
    tickTimer = setInterval(function () { goTick(k + 1); }, 5000);
  }
  dots.forEach(function (d, i) { d.addEventListener('click', function () { goTick(i); autoTick(); }); });
  // Наведение останавливает смену: иначе повод, по которому человек решил кликнуть,
  // успевает смениться по дороге к нему.
  var tick = $('.hdr26-tick');
  if (tick) {
    tick.addEventListener('mouseenter', function () { clearInterval(tickTimer); });
    tick.addEventListener('mouseleave', autoTick);
  }
  autoTick();

  /* ——— лента категорий ——— */
  var lane = $('.hdr26-lane'), laneNx = $('.hdr26-lane-nx');
  if (lane) {
    var fade = function () {
      var max = lane.scrollWidth - lane.clientWidth;
      lane.style.setProperty('--hdr26-fl', lane.scrollLeft > 4 ? '36px' : '0px');
      lane.style.setProperty('--hdr26-fr', lane.scrollLeft < max - 4 ? '56px' : '0px');
      if (laneNx) laneNx.classList.toggle('is-off', lane.scrollLeft >= max - 4);
      // На мобилке праздник уступает место, пока ленту листают (hdr26.css, ≤560).
      lane.parentNode.classList.toggle('is-lane-on', lane.scrollLeft > 4);
    };
    // Правую часть ленты не видят — стрелка подсказывает, что дальше есть ещё
    if (laneNx) laneNx.addEventListener('click', function () {
      lane.scrollBy({ left: lane.clientWidth * 0.6, behavior: 'smooth' });
    });
    // Браузер начинает тащить саму ссылку (dragstart → pointercancel), и лента не едет
    lane.addEventListener('dragstart', function (e) { e.preventDefault(); });
    lane.addEventListener('scroll', fade, { passive: true });
    window.addEventListener('resize', fade);
    fade();

    var vel = 0, raf = null;
    var step = function () {
      if (!vel) { raf = null; return; }
      lane.scrollLeft += vel;
      raf = requestAnimationFrame(step);
    };
    var down = false, sx = 0, sl = 0, moved = 0, dragging = false, pid = 0;
    lane.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      down = true; dragging = false; moved = 0; sx = e.clientX; sl = lane.scrollLeft; vel = 0; pid = e.pointerId;
      // capture берём не здесь, а когда реально потянули: захват уводит на ленту
      // и mouseup, click тогда приходит не на ссылку и категория не открывается
    });
    var endDrag = function () {
      if (!down) return;
      down = false;
      lane.classList.remove('is-drag');
      if (dragging) { try { lane.releasePointerCapture(pid); } catch (err) { /* уже отпущен */ } }
      dragging = false;
    };
    lane.addEventListener('pointerup', endDrag);
    lane.addEventListener('pointercancel', endDrag);
    lane.addEventListener('click', function (e) { if (moved > 4) { e.preventDefault(); e.stopPropagation(); } }, true);
    lane.addEventListener('pointermove', function (e) {
      if (down) {
        var dx = e.clientX - sx;
        moved = Math.max(moved, Math.abs(dx));
        if (!dragging) {
          if (moved <= 4) return;
          dragging = true;
          lane.classList.add('is-drag');
          try { lane.setPointerCapture(pid); } catch (err) { /* уже захвачен */ }
        }
        lane.scrollLeft = sl - dx;
        return;
      }
      if (e.pointerType !== 'mouse') return;
      var r = lane.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
      vel = x > 0.86 ? 3 : x < 0.14 ? -3 : 0;
      if (vel && raf === null) raf = requestAnimationFrame(step);
    });
    lane.addEventListener('pointerleave', function () { vel = 0; });
  }

  /* ——— «ещё N»: хвост списка в колонках, только по клику ——— */
  hdr.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.hdr26-dd__btn');
    if (!btn || !btn.parentNode) return;
    var more = btn.parentNode.querySelector('.hdr26-dd__more');
    if (more) more.hidden = false;
    btn.remove();
  });

  /* ——— нижняя панель: каталог и контакты ——— */
  var cat = document.querySelector('.mobile-menu'), barC = document.querySelector('.hdr26-bar__c'), cu = document.querySelector('.hdr26-cu');
  function closeCat() {
    if (!cat) return;
    cat.classList.remove('show');
    document.body.classList.remove('mobile-menu-open');
  }
  function closeMob() { closeCat(); if (barC) barC.classList.remove('is-open'); if (cu) cu.classList.remove('is-open'); }
  // Меню каталога печатается не в странице, а приезжает по запросу: его открывают
  // единицы, а весит оно треть разметки. Одна повторная попытка на случай обрыва.
  var catPromise = null;
  function loadCat(tries) {
    // Запрос стартует уже по касанию кнопки, а клик берёт готовое обещание —
    // так меню открывается почти сразу, а те, кто мимо, ничего не качают.
    if (catPromise) return catPromise;
    catPromise = fetchCat(tries);
    return catPromise;
  }
  function fetchCat(tries) {
    return fetch(location.pathname + '?hdr26mobmenu=1', { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .catch(function (err) {
        if (tries > 0) return fetchCat(tries - 1);
        catPromise = null;
        throw err;
      });
  }
  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest || !e.target.closest('[data-mobcat]')) return;
    if (cat && !cat.children.length) loadCat(1).catch(function () {});
  }, { passive: true });
  document.addEventListener('click', function (e) {
    // «Каталог» открывает прежнее мобильное меню — глубину каталога не трогаем
    if (e.target.closest('[data-mobcat]')) {
      if (!cat) return;
      syncNow();
      if (barC) barC.classList.remove('is-open');
      // Десктопу меню каталога не печатается (204 КБ разметки). Если кнопку всё же
      // нажали — узкое окно десктопного браузера, — подтягиваем одним запросом.
      if (!cat.children.length && !cat.getAttribute('data-loading')) {
        var btn = e.target.closest('[data-mobcat]');
        cat.setAttribute('data-loading', '1');
        btn.classList.add('is-loading');
        loadCat(1).then(function (html) {
          cat.innerHTML = html;
          cat.classList.add('show');
          document.body.classList.add('mobile-menu-open');
        }).catch(function () { /* меню не доехало — кнопка просто останется нажимаемой */ })
          .then(function () {
            cat.removeAttribute('data-loading');
            btn.classList.remove('is-loading');
          });
        return;
      }
      var on = !cat.classList.contains('show');
      cat.classList.toggle('show', on);
      document.body.classList.toggle('mobile-menu-open', on);
      return;
    }
    if (barC && e.target.closest('.hdr26-bar__c') && !e.target.closest('.hdr26-bar__d')) {
      barC.classList.toggle('is-open');
      closeCat();
    }
    if (cu && e.target.closest('.hdr26-cu__b')) {
      cu.classList.toggle('is-open');
      closeCat();
    }
  });
  document.addEventListener('click', function (e) {
    if (barC && !e.target.closest('.hdr26-bar__c')) barC.classList.remove('is-open');
    if (cu && !e.target.closest('.hdr26-cu__b')) cu.classList.remove('is-open');
  });
})();


/* ---- Цели Яндекс.Метрики шапки 2026 ----
   Один делегированный слушатель на всю шапку: ссылка несёт data-g (идентификатор цели)
   и data-gp (путь по меню через вертикальную черту), скрипт собирает из пути вложенные
   params — уровни пути становятся уровнями отчёта «Параметры цели». Инлайновый onclick
   тут не годится: страница уходит через stripslashes + html_entity_decode и рвёт кавычки
   в атрибуте (см. mmGoal в includes/_menu.php). Слушаем в фазе ПЕРЕХВАТА — виджет поиска
   гасит всплытие. */
(function () {
  // Номер счётчика зависит от окружения (дев/зеркало — свой), поэтому берём его из
  // инлайновой инициализации ym на странице, а не хардкодим.
  var ymId = null;
  function ymCounterId() {
    if (ymId) return ymId;
    var s = document.scripts, m;
    for (var i = 0; i < s.length; i++) {
      if (!s[i].src && (m = s[i].textContent.match(/ym\(\s*(\d{6,})\s*,\s*['"]init['"]/))) {
        ymId = parseInt(m[1], 10);
        return ymId;
      }
    }
    ymId = 24366505;
    return ymId;
  }
  var once = {};
  window.hdr26Goal = function (goal, path, onlyOnce) {
    if (!window.ym || !goal) return;
    if (onlyOnce) {
      var key = goal + '|' + (path || []).join('|');
      if (once[key]) return;
      once[key] = 1;
    }
    if (path && path.length) {
      var params = 1;
      for (var i = path.length - 1; i >= 0; i--) {
        var level = {};
        level[path[i]] = params;
        params = level;
      }
      window.ym(ymCounterId(), 'reachGoal', goal, params);
    } else {
      window.ym(ymCounterId(), 'reachGoal', goal);
    }
  };
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    // Промо-пилюля считается общей целью sale-top (место в шапке = трафик), а своя
    // цель пилюли, если она задана в названии пункта, уходит рядом через data-g.
    var promo = e.target.closest('.hdr26-promo');
    if (promo) window.hdr26Goal('sale-top', [promo.textContent.trim()]);
    // Поиск считаем по всей рамке, как в старой шапке: виджет search-api.ru гасит
    // всплытие клика по полю, поэтому ловим здесь, в фазе перехвата. Клик по иконке
    // или отступу отдаём полю, чтобы виджет открылся.
    var srch = e.target.closest('.hdr26-search');
    if (srch) {
      var srchInp = srch.querySelector('input');
      if (srchInp && e.target !== srchInp) srchInp.focus();
      window.hdr26Goal('search');
    }
    var el = e.target.closest('[data-g]');
    if (!el || !el.closest('#hdr26, .hdr26-bar')) return;
    var path = (el.getAttribute('data-gp') || '').split('|').filter(Boolean);
    window.hdr26Goal(el.getAttribute('data-g'), path);
  }, true);
})();
