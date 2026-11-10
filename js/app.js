(function () {
  var root = document.getElementById('ktg');
  if (!root) return;
  var $ = function (s, el) { return (el || root).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); };
  var rub = function (n) { return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽'; };
  var ICON = 'img/ikonki/';
  var TICK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
  var PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  var DEL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  // Цены — с карточек сайта и лендингов (furshet-landing, banket-landing, kofe-breyk-landing), «от» за гостя.
  var WAITER = 7500, BARMAN = 7500;
  var FORMATS = {
    furshet: { name: 'Фуршет', icon: 'ik-furshet', waiterPer: 20, levels: { mini: [1800, '400 г'], midi: [3400, '500 г · 300 мл'], maxi: [4200, '600 г · 650 мл'] } },
    welcome: { name: 'Фуршет и велком', icon: 'ik-welcome', waiterPer: 20, levels: { mini: [2500, '500 г'], midi: [3600, '600 г · 360 мл'], maxi: [4400, '700 г · 520 мл'] } },
    stancia: { name: 'Фуршет, велком и станция', icon: 'ik-stancii', waiterPer: 20, levels: { mini: [2900, '600 г'], midi: [4200, '700 г · 360 мл'], maxi: [5500, '800 г · 520 мл'] } },
    banket: { name: 'Банкет', icon: 'ik-vip', waiterPer: 10, barmanPer: 50, levels: { mini: [3200, '700 г · 400 мл'], midi: [4500, '950 г · 600 мл'], maxi: [6000, '1200 г · 850 мл'] } },
    kofe: { name: 'Кофе-брейк', icon: 'ik-kofe', waiterPer: 40, levels: { mini: [400, '100 г · 350 мл'], midi: [800, '200 г · 500 мл'], maxi: [1400, '400 г · 750 мл'] } }
  };
  var LEVELS = { mini: 'Мини', midi: 'Миди', maxi: 'Макси' };
  var ADDS = [
    { key: 'staff', name: 'Официанты', icon: 'ik-ofitsianty', note: '' },
    { group: 'animacionnye-stancii', name: 'Гастростанция', icon: 'ik-stancii' },
    { group: 'vyezdnoy-bar', name: 'Выездной бар', icon: 'ik-bar' },
    { group: 'kendi-bar', name: 'Кэнди-бар', icon: 'ik-kendi' }
  ];

  var DATA = window.KTG_DATA || [];
  var byId = {};
  DATA.forEach(function (g) { g.items.forEach(function (it) { if (!byId[it.id]) byId[it.id] = { it: it, g: g }; }); });
  var totalUnique = Object.keys(byId).length;
  $$('[data-total-items]').forEach(function (el) { el.textContent = (Math.floor(totalUnique / 10) * 10) + '+'; });

  var store = { get: function (k, d) { try { var v = localStorage.getItem('ktg_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
                set: function (k, v) { try { localStorage.setItem('ktg_' + k, JSON.stringify(v)); } catch (e) {} } };

  var state = { fmt: 'furshet', lvl: 'mini', guests: 50, staff: true, wants: {}, picks: store.get('picks', []).filter(function (id) { return byId[id]; }),
                group: DATA[0] ? DATA[0].slug : '', q: '', sort: 'pop', limit: 12, list: [] };

  function savePicks() { store.set('picks', state.picks); }
  function isPicked(id) { return state.picks.indexOf(id) !== -1; }
  function togglePick(id) {
    var i = state.picks.indexOf(id);
    if (i === -1) state.picks.push(id); else state.picks.splice(i, 1);
    savePicks(); renderPicksEverywhere();
    if (i === -1) { var c = $('[data-cart]'); c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump'); }
  }

  /* ---------- калькулятор ---------- */
  function renderFormats() {
    $('[data-fmt-seg]').innerHTML = Object.keys(FORMATS).map(function (k) {
      return '<button type="button" data-fmt-set="' + k + '" class="' + (k === state.fmt ? 'is-on' : '') + '"><img src="' + ICON + FORMATS[k].icon + '.webp" alt="">' + FORMATS[k].name + '</button>';
    }).join('');
    var f = FORMATS[state.fmt];
    $('[data-tiers]').innerHTML = Object.keys(LEVELS).map(function (l) {
      return '<button type="button" class="ktg-tier' + (l === state.lvl ? ' is-on' : '') + '" data-lvl="' + l + '"><span class="ktg-tier__tick">' + TICK + '</span><b>' + LEVELS[l] + '</b>' +
        '<div class="ktg-tier__price">' + rub(f.levels[l][0]) + ' <small>/ гость</small></div><div class="ktg-tier__out">' + f.levels[l][1] + ' на гостя</div></button>';
    }).join('');
    $('[data-adds]').innerHTML = ADDS.map(function (a) {
      if (a.key) return '<div role="button" tabindex="0" class="ktg-add' + (state.staff ? ' is-on' : '') + '" data-add-staff><span class="ktg-tier__tick">' + TICK + '</span><img src="' + ICON + a.icon + '.webp" alt=""><span>' + a.name + '</span><small>1 на ' + f.waiterPer + ' гостей</small></div>';
      var n = state.picks.filter(function (id) { return byId[id].g.slug === a.group; }).length;
      var on = !!state.wants[a.group] || n > 0;
      return '<div role="button" tabindex="0" class="ktg-add' + (on ? ' is-on' : '') + '" data-add-want="' + a.group + '"><span class="ktg-tier__tick">' + TICK + '</span><img src="' + ICON + a.icon + '.webp" alt=""><span>' + a.name + '</span><button type="button" class="ktg-add__link" data-add-group="' + a.group + '">' + (n ? 'выбрано: ' + n : 'выбрать в меню') + '</button></div>';
    }).join('');
  }

  function renderSum() {
    var f = FORMATS[state.fmt], lv = f.levels[state.lvl], g = state.guests;
    var menu = lv[0] * g, rows = [['Меню «' + LEVELS[state.lvl] + '», ' + g + ' гостей', rub(menu)]], total = menu;
    if (state.staff) {
      var w = Math.max(1, Math.ceil(g / f.waiterPer)); rows.push(['Официанты: ' + w + ' × смена 6 ч', rub(w * WAITER)]); total += w * WAITER;
      if (f.barmanPer) { var b = Math.max(1, Math.ceil(g / f.barmanPer)); rows.push(['Бармены: ' + b + ' × смена 6 ч', rub(b * BARMAN)]); total += b * BARMAN; }
    }
    ADDS.forEach(function (a) { if (a.group && state.wants[a.group]) rows.push([a.name, 'подберём']); });
    $('[data-sum-title]').textContent = f.name + ' · ' + LEVELS[state.lvl];
    $('[data-sum-rows]').innerHTML = rows.map(function (r) { return '<div class="ktg-sum__row"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('');
    $('[data-sum-total]').textContent = rub(total);
    $('[data-sum-pp]').innerHTML = '<span>≈ ' + rub(total / g) + ' на гостя</span><span>' + lv[1] + ' на гостя</span>';
    var p = $('[data-sum-picks]');
    p.hidden = !state.picks.length;
    p.innerHTML = state.picks.length ? '<b>+ ' + state.picks.length + ' ' + plural(state.picks.length, 'позиция', 'позиции', 'позиций') + ' из меню</b> — посчитаем в смете под ваше число гостей' : '';
  }
  function plural(n, a, b, c) { var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }

  function setGuests(v) {
    v = parseInt(String(v).replace(/\D/g, ''), 10) || 10;
    state.guests = Math.min(1000, Math.max(10, v));
    $('[data-guests]').value = state.guests;
    var r = $('[data-guests-range]'); r.value = Math.min(500, state.guests);
    r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%');
    renderSum(); renderFormats();
  }

  function goCalc(fmt) {
    if (FORMATS[fmt]) { state.fmt = fmt; }
    renderFormats(); renderSum();
    $('#calc').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- меню ---------- */
  function renderGroups() {
    $('[data-groups]').innerHTML = DATA.map(function (g) {
      return '<button type="button" class="ktg-group' + (g.slug === state.group && !state.q ? ' is-on' : '') + '" data-group="' + g.slug + '"><img src="' + ICON + g.icon + '.webp" alt="" loading="lazy"><b>' + g.name + '</b><small>' + g.items.length + ' ' + plural(g.items.length, 'позиция', 'позиции', 'позиций') + '</small></button>';
    }).join('');
  }

  function currentList() {
    var list;
    if (state.q) {
      var q = state.q.toLowerCase(), seen = {};
      list = [];
      DATA.forEach(function (g) { g.items.forEach(function (it) { if (!seen[it.id] && it.n.toLowerCase().indexOf(q) !== -1) { seen[it.id] = 1; list.push(it); } }); });
    } else {
      var grp = DATA.filter(function (g) { return g.slug === state.group; })[0];
      list = grp ? grp.items.slice() : [];
    }
    if (state.sort !== 'pop') {
      list.sort(function (a, b) { var x = a.v || 1e9, y = b.v || 1e9; return state.sort === 'asc' ? x - y : (b.v || 0) - (a.v || 0); });
    }
    return list;
  }

  function itemCard(it) {
    return '<div class="ktg-item" data-id="' + it.id + '"><div class="ktg-item__img" data-qv-open><img src="' + it.i + '" alt="" loading="lazy"></div>' +
      '<div class="ktg-item__body"><div class="ktg-item__name" data-qv-open>' + it.n + '</div><div class="ktg-item__row"><span class="ktg-item__price">' + it.p + '</span>' +
      '<button type="button" class="ktg-pick' + (isPicked(it.id) ? ' is-on' : '') + '" data-pick aria-label="В подборку">' + (isPicked(it.id) ? TICK.replace(/12/g, '18') : PLUS) + '</button></div></div></div>';
  }

  function renderGrid() {
    state.list = currentList();
    var shown = state.list.slice(0, state.limit);
    $('[data-grid]').innerHTML = shown.length ? shown.map(itemCard).join('') : '<div class="ktg-empty" style="grid-column:1/-1">Ничего не нашли. Напишите менеджеру — приготовим и то, чего нет в меню.</div>';
    var grp = DATA.filter(function (g) { return g.slug === state.group; })[0];
    $('[data-count]').textContent = state.q ? 'Найдено: ' + state.list.length : (grp ? grp.name + ' — ' + grp.sub.toLowerCase() : '');
    $('[data-more]').hidden = state.list.length <= state.limit;
    $('[data-more]').textContent = 'Показать ещё ' + Math.min(12, state.list.length - state.limit);
    var link = $('[data-group-link]');
    link.hidden = !!state.q || !grp;
    if (grp) { link.href = grp.url; link.textContent = 'Раздел «' + grp.name + '» в каталоге'; }
  }

  function setGroup(slug, scroll) {
    state.group = slug; state.q = ''; state.limit = 12; $('[data-search]').value = '';
    renderGroups(); renderGrid();
    if (scroll) $('#menu').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


  /* ---------- наборы ---------- */
  var SETS = window.KTG_SETS || [];
  var kg = function (g) { return (g / 1000).toFixed(1).replace('.', ',') + ' кг'; };
  var SET_NAMES = [[/^Сет брускетт/, 'Брускетты'], [/^Сет капапе|^Сет канапе/, 'Канапе'], [/^Сет блинных рулетиков/, 'Блинные рулетики'], [/^Сет тарталеток/, 'Тарталетки'],
    [/^Сет моти/, 'Моти'], [/^Сет десертов мусс/, 'Десерты-муссы'], [/^Сет пирожных Макарунс/, 'Макарунс'], [/^Сет ролл/, 'Роллы'], [/^Сет рулетики/, 'Рулетики'], [/^Сет чизкейков/, 'Чизкейки']];
  function setName(n) { for (var i = 0; i < SET_NAMES.length; i++) if (SET_NAMES[i][0].test(n)) return n.replace(SET_NAMES[i][0], SET_NAMES[i][1]); return n; }
  function renderSets() {
    $('[data-sets]').innerHTML = SETS.map(function (s, k) {
      var all = s.rows.every(function (r) { return isPicked(r.id); });
      return '<div class="ktg-set" data-set="' + k + '"><div class="ktg-set__pics">' + s.rows.slice(0, 3).map(function (r) { return '<img src="' + r.i + '" alt="" loading="lazy">'; }).join('') + '</div>' +
        '<div class="ktg-set__body"><div class="ktg-set__top"><h3>' + s.name + '</h3><span>на ' + s.guests + ' гостей</span></div><p class="ktg-set__sub">' + s.sub + '</p>' +
        '<div class="ktg-set__meta"><span>' + kg(s.w) + '</span><span>≈ ' + Math.round(s.w / s.guests) + ' г на гостя</span><span>' + s.pcs + ' шт</span></div>' +
        '<div class="ktg-set__list">' + s.rows.map(function (r, i) { return '<div class="ktg-set__row' + (i > 3 ? ' is-extra' : '') + '"><span>' + setName(r.n) + (r.q > 1 ? ' × ' + r.q : '') + '</span><small>' + r.pcs + ' шт · ' + r.w + ' г</small></div>'; }).join('') + '</div>' +
        (s.rows.length > 4 ? '<button type="button" class="ktg-set__more" data-set-more>Ещё ' + (s.rows.length - 4) + '</button>' : '') +
        '<div class="ktg-set__price"><b>' + rub(s.p) + '</b><span>≈ ' + rub(s.p / s.guests) + ' на гостя</span></div>' +
        '<button type="button" class="ktg-btn ktg-btn--wide ' + (all ? 'ktg-btn--soft' : 'ktg-btn--primary') + '" data-set-pick>' + (all ? 'В подборке — убрать' : 'Добавить в подборку') + '</button></div></div>';
    }).join('');
  }
  function toggleSet(k) {
    var s = SETS[k], all = s.rows.every(function (r) { return isPicked(r.id); });
    s.rows.forEach(function (r) { var i = state.picks.indexOf(r.id); if (all && i !== -1) state.picks.splice(i, 1); if (!all && i === -1 && byId[r.id]) state.picks.push(r.id); });
    savePicks(); renderPicksEverywhere();
    if (!all) { var c = $('[data-cart]'); c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump'); }
  }

  /* ---------- быстрый просмотр ---------- */
  var qvIndex = -1;
  function openQv(id) {
    var rec = byId[id]; if (!rec) return;
    qvIndex = state.list.map(function (x) { return x.id; }).indexOf(id);
    var it = rec.it, m = $('[data-qv]');
    m.dataset.id = id;
    $('[data-qv-img]').src = it.i;
    var big = new Image(); big.onload = function () { if (m.dataset.id == id) $('[data-qv-img]').src = it.b; }; big.src = it.b;
    $('[data-qv-group]').textContent = rec.g.name;
    $('[data-qv-name]').textContent = it.n;
    $('[data-qv-price]').textContent = it.p;
    $('[data-qv-link]').href = it.u;
    var cd = (window.KTG_CARDS || {})[it.id] || {o: [], s: '', d: ''};
    var esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    $('[data-qv-opts]').innerHTML = cd.o.map(function (o) { return '<div class="ktg-qv__opt"><b>' + esc(o.n) + '</b><span>' + esc(o.p) + '</span>' + (o.d ? '<small>' + esc(o.d) + '</small>' : '') + '</div>'; }).join('');
    $('[data-qv-desc]').textContent = cd.s ? 'Состав: ' + cd.s : cd.d;
    var sim = rec.g.items.filter(function (x) { return x.id !== it.id; }).slice(0, 4);
    $('[data-qv-sim]').innerHTML = sim.map(function (x) { return '<img src="' + x.i + '" alt="' + x.n.replace(/"/g, '') + '" title="' + x.n.replace(/"/g, '') + '" data-qv-go="' + x.id + '">'; }).join('');
    $('[data-qv-prev]').disabled = qvIndex <= 0;
    $('[data-qv-next]').disabled = qvIndex === -1 || qvIndex >= state.list.length - 1;
    syncQvPick();
    open(m);
  }
  function syncQvPick() {
    var m = $('[data-qv]'), id = +m.dataset.id, b = $('[data-qv-pick]');
    b.textContent = isPicked(id) ? 'В подборке — убрать' : 'Добавить в подборку';
    b.className = 'ktg-btn ktg-btn--wide ' + (isPicked(id) ? 'ktg-btn--soft' : 'ktg-btn--primary');
  }

  /* ---------- подборка ---------- */
  function renderDrawer() {
    var f = FORMATS[state.fmt];
    var wants = ADDS.filter(function (x) { return x.group && state.wants[x.group]; }).map(function (x) { return x.name; });
    var calc = '<div class="ktg-dl ktg-dl--calc"><div><b>Расчёт: ' + f.name + ' · ' + LEVELS[state.lvl] + ', ' + state.guests + ' гостей' + (wants.length ? ' + ' + wants.join(', ').toLowerCase() : '') + '</b><span>от ' + $('[data-sum-total]').textContent + '</span></div></div>';
    $('[data-drawer-list]').innerHTML = calc + (state.picks.length ? state.picks.map(function (id) {
      var it = byId[id].it;
      return '<div class="ktg-dl" data-id="' + id + '"><img src="' + it.i + '" alt=""><div><b>' + it.n + '</b><span>' + it.p + '</span></div><button type="button" data-unpick aria-label="Убрать">' + DEL + '</button></div>';
    }).join('') : '<p class="ktg-empty" style="padding:24px 0">Добавляйте позиции из меню — они появятся здесь.</p>');
  }
  function renderPicksEverywhere() {
    var n = state.picks.length, c = $('[data-cart]');
    $('[data-cart-n]').textContent = n;
    c.classList.toggle('is-shown', n > 0);
    $$('.ktg-item').forEach(function (el) { var id = +el.dataset.id, b = $('[data-pick]', el); b.classList.toggle('is-on', isPicked(id)); b.innerHTML = isPicked(id) ? TICK.replace(/12/g, '18') : PLUS; });
    if ($('[data-qv]').classList.contains('is-open')) syncQvPick();
    renderFormats(); renderSum(); renderDrawer(); renderSets();
  }

  /* ---------- окна ---------- */
  var overlay = $('[data-overlay]');
  function open(el) { $$('.ktg-modal.is-open,.ktg-drawer.is-open').forEach(function (x) { if (x !== el) x.classList.remove('is-open'); }); el.classList.add('is-open'); overlay.classList.add('is-open'); document.documentElement.style.overflow = 'hidden'; }
  function closeAll() { $$('.is-open').forEach(function (x) { if (!x.matches('[data-dd]')) x.classList.remove('is-open'); }); overlay.classList.remove('is-open'); document.documentElement.style.overflow = ''; }

  /* ---------- события ---------- */
  root.addEventListener('click', function (e) {
    var t = e.target.closest('button,a,[data-qv-open],[data-qv-go],[data-add-staff],[data-add-want]');
    var dd = $('[data-dd]');
    if (!e.target.closest('[data-dd]')) dd.classList.remove('is-open');
    if (!t) return;
    if (t.matches('[data-fmt]')) { goCalc(t.dataset.fmt); return; }
    if (t.matches('[data-fmt-set]')) { state.fmt = t.dataset.fmtSet; renderFormats(); renderSum(); return; }
    if (t.matches('[data-lvl]')) { state.lvl = t.dataset.lvl; renderFormats(); renderSum(); return; }
    if (t.matches('[data-g]')) { setGuests(state.guests + +t.dataset.g); return; }
    if (t.matches('[data-add-staff]')) { state.staff = !state.staff; renderFormats(); renderSum(); return; }
    if (t.matches('[data-add-group]')) { setGroup(t.dataset.addGroup, true); return; }
    if (t.matches('[data-add-want]')) { var w = t.dataset.addWant; state.wants[w] = !state.wants[w]; renderFormats(); renderSum(); return; }
    if (t.matches('[data-group]')) { setGroup(t.dataset.group, false); return; }
    if (t.matches('[data-more]')) { state.limit += 12; renderGrid(); return; }
    if (t.matches('[data-dd-btn]')) { dd.classList.toggle('is-open'); return; }
    if (t.matches('[data-sort]')) {
      state.sort = t.dataset.sort; $$('[data-sort]').forEach(function (b) { b.classList.toggle('is-on', b === t); });
      $('[data-dd-label]').textContent = t.textContent; dd.classList.remove('is-open'); renderGrid(); return;
    }
    if (t.matches('[data-set-pick]')) { toggleSet(+t.closest('[data-set]').dataset.set); return; }
    if (t.matches('[data-set-more]')) { var sc = t.closest('.ktg-set'); sc.classList.toggle('is-full'); t.textContent = sc.classList.contains('is-full') ? 'Свернуть' : 'Ещё ' + (SETS[+sc.dataset.set].rows.length - 4); return; }
    if (t.matches('[data-pick]')) { togglePick(+t.closest('[data-id]').dataset.id); return; }
    if (t.matches('[data-qv-open]')) { openQv(+t.closest('[data-id]').dataset.id); return; }
    if (t.matches('[data-qv-go]')) { openQv(+t.dataset.qvGo); return; }
    if (t.matches('[data-qv-pick]')) { togglePick(+$('[data-qv]').dataset.id); return; }
    if (t.matches('[data-qv-prev]') && qvIndex > 0) { openQv(state.list[qvIndex - 1].id); return; }
    if (t.matches('[data-qv-next]') && qvIndex < state.list.length - 1) { openQv(state.list[qvIndex + 1].id); return; }
    if (t.matches('[data-unpick]')) { togglePick(+t.closest('[data-id]').dataset.id); return; }
    if (t.matches('[data-open-drawer]')) { renderDrawer(); open($('[data-drawer]')); return; }
    if (t.matches('[data-close]')) { closeAll(); return; }
  });
  overlay.addEventListener('click', closeAll);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
    if (!$('[data-qv]').classList.contains('is-open')) return;
    if (e.key === 'ArrowLeft' && qvIndex > 0) openQv(state.list[qvIndex - 1].id);
    if (e.key === 'ArrowRight' && qvIndex < state.list.length - 1) openQv(state.list[qvIndex + 1].id);
  });

  $('[data-guests]').addEventListener('change', function () { setGuests(this.value); });
  $('[data-guests-range]').addEventListener('input', function () { setGuests(this.value); });
  var qt;
  $('[data-search]').addEventListener('input', function () {
    var v = this.value.trim(); clearTimeout(qt);
    qt = setTimeout(function () { state.q = v; state.limit = 12; renderGroups(); renderGrid(); }, 150);
  });
  $$('[data-form]').forEach(function (f) {
    f.addEventListener('submit', function (e) { e.preventDefault(); f.classList.add('is-sent'); });
  });

  renderFormats(); setGuests(50); renderGroups(); renderGrid(); renderPicksEverywhere();
})();
