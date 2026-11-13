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
    banket: { name: 'Банкет', icon: 'ik-vip', waiterPer: 10, barmanPer: 50, levels: { mini: [3200, '700 г · 400 мл'], midi: [4500, '950 г · 600 мл'], maxi: [6000, '1200 г · 850 мл'] } },
    kofe: { name: 'Кофе-брейк', icon: 'ik-kofe', waiterPer: 40, levels: { mini: [400, '100 г · 350 мл'], midi: [800, '200 г · 500 мл'], maxi: [1400, '400 г · 750 мл'] } }
  };
  // Фуршет с допами — цены пакетов /furshet-i-velkom/ и /furshet-velkom-i-animacionnye-stancii/ (станция идёт вместе с велкомом).
  var FURSHET_PLUS = {
    welcome: { mini: [2500, '500 г'], midi: [3600, '600 г · 360 мл'], maxi: [4400, '700 г · 520 мл'] },
    stancia: { mini: [2900, '600 г'], midi: [4200, '700 г · 360 мл'], maxi: [5500, '800 г · 520 мл'] }
  };
  var STATION = 'animacionnye-stancii';
  function curLevels() {
    if (state.fmt !== 'furshet') return FORMATS[state.fmt].levels;
    if (state.wants[STATION]) return FURSHET_PLUS.stancia;
    return state.welcome ? FURSHET_PLUS.welcome : FORMATS.furshet.levels;
  }
  function calcTitle() {
    var t = FORMATS[state.fmt].name;
    if (state.fmt === 'furshet' && (state.welcome || state.wants[STATION])) t += state.wants[STATION] ? ' + велком + станция' : ' + велком';
    return t + ' · ' + LEVELS[state.lvl];
  }
  var LEVELS = { mini: 'Мини', midi: 'Миди', maxi: 'Макси' };
  var ADDS = [
    { key: 'staff', name: 'Официанты', icon: 'ik-ofitsianty' },
    { key: 'welcome', name: 'Велком-зона', icon: 'ik-welcome', only: 'furshet' },
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

  var state = { fmt: 'furshet', lvl: 'mini', guests: 50, staff: true, welcome: false, wants: {}, picks: store.get('picks', []).filter(function (id) { return byId[id]; }),
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
    var f = FORMATS[state.fmt], L = curLevels();
    $('[data-tiers]').innerHTML = Object.keys(LEVELS).map(function (l) {
      return '<button type="button" class="ktg-tier' + (l === state.lvl ? ' is-on' : '') + '" data-lvl="' + l + '"><span class="ktg-tier__tick">' + TICK + '</span><b>' + LEVELS[l] + '</b>' +
        '<div class="ktg-tier__price">' + rub(L[l][0]) + ' <small>/ гость</small></div><div class="ktg-tier__out">' + L[l][1] + ' на гостя</div></button>';
    }).join('');
    var GO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
    $('[data-adds]').innerHTML = ADDS.filter(function (a) { return !a.only || a.only === state.fmt; }).map(function (a) {
      var on, attr, extra = '';
      if (a.key === 'staff') { on = state.staff; attr = 'data-add-staff'; }
      else if (a.key === 'welcome') { on = state.welcome || !!state.wants[STATION]; attr = 'data-add-welcome'; }
      else {
        var n = state.picks.filter(function (id) { return byId[id].g.slug === a.group; }).length;
        on = !!state.wants[a.group]; attr = 'data-add-want="' + a.group + '"';
        extra = '<button type="button" class="ktg-add__go" data-add-group="' + a.group + '" aria-label="Выбрать в меню">' + (n ? '<i>' + n + '</i>' : '') + GO + '</button>';
      }
      return '<div role="button" tabindex="0" class="ktg-add' + (on ? ' is-on' : '') + '" ' + attr + '><img src="' + ICON + a.icon + '.webp" alt="">' + a.name + extra + '</div>';
    }).join('');
  }

  function renderSum() {
    var f = FORMATS[state.fmt], lv = curLevels()[state.lvl], g = state.guests;
    var menu = lv[0] * g, rows = [['Меню «' + LEVELS[state.lvl] + '», ' + g + ' гостей', rub(menu)]], total = menu;
    if (state.staff) {
      var w = Math.max(1, Math.ceil(g / f.waiterPer)); rows.push(['Официанты: ' + w + ' × смена 6 ч', rub(w * WAITER)]); total += w * WAITER;
      if (f.barmanPer) { var b = Math.max(1, Math.ceil(g / f.barmanPer)); rows.push(['Бармены: ' + b + ' × смена 6 ч', rub(b * BARMAN)]); total += b * BARMAN; }
    }
    ADDS.forEach(function (a) { if (a.group && state.wants[a.group] && !(a.group === STATION && state.fmt === 'furshet')) rows.push([a.name, 'подберём']); });
    $('[data-sum-title]').textContent = calcTitle();
    $('[data-sum-rows]').innerHTML = rows.map(function (r) { return '<div class="ktg-sum__row"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('');
    $('[data-sum-total]').textContent = rub(total);
    $('[data-sum-pp]').innerHTML = '<span>≈ ' + rub(total / g) + ' на гостя</span><span>' + lv[1] + ' на гостя</span>';
    var p = $('[data-sum-picks]');
    p.hidden = !state.picks.length;
    p.innerHTML = state.picks.length ? '<b>+ ' + state.picks.length + ' ' + plural(state.picks.length, 'позиция', 'позиции', 'позиций') + ' из меню</b> — посчитаем в смете под ваше число гостей' : '';
  }
  function plural(n, a, b, c) { var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }

  function setGuests(v) {
    v = parseInt(String(v).replace(/\D/g, ''), 10) || 30;
    state.guests = Math.min(1000, Math.max(30, v));  // от 30 гостей — минимальный комплект (Маша №339)
    $('[data-guests]').value = state.guests;
    var r = $('[data-guests-range]'); r.value = Math.min(500, state.guests);
    r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%');
    renderSum(); renderFormats();
  }

  function goCalc(fmt) {
    if (fmt === 'welcome') { state.fmt = 'furshet'; state.welcome = true; }
    else if (FORMATS[fmt]) { state.fmt = fmt; }
    renderFormats(); renderSum();
    $('#calc').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- меню ---------- */
  function renderGroups() {
    $('[data-groups]').innerHTML = DATA.map(function (g) {
      return '<button type="button" class="ktg-group' + (g.slug === state.group && !state.q ? ' is-on' : '') + '" data-group="' + g.slug + '"><img src="' + ICON + g.icon + '.webp" alt="" loading="lazy"><b>' + g.name + '</b><small>' + g.items.length + ' ' + plural(g.items.length, 'позиция', 'позиции', 'позиций') + '</small></button>';
    }).join('');
    document.dispatchEvent(new CustomEvent('ktg:group', { detail: state.q ? '' : state.group }));
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
      '<div class="ktg-item__body"><div class="ktg-item__name" data-qv-open>' + it.n + '</div>' + (it.st ? '<small class="ktg-item__st">' + (it.bar ? 'бар с барменом' : 'станция с поваром и доставкой') + ', от 30 порций</small>' : '') + '<div class="ktg-item__row"><span class="ktg-item__price">' + it.p + '</span>' +
      '<button type="button" class="ktg-pick' + (isPicked(it.id) ? ' is-on' : '') + '" data-pick aria-label="В подборку">' + (isPicked(it.id) ? TICK.replace(/12/g, '18') : PLUS) + '</button></div></div></div>';
  }

  // Комплекты выездного фуршета — первым рядом раздела «Фуршетное меню». Мини/Миди/Макси — цены калькулятора, состав — таблица /gotovyj-furshet/.
  var KITS = [
    { key: 'box', name: 'Фуршетные боксы', p: 900, out: '250 г', img: 'img/menu/73772.webp',
      li: ['Канапе, брускетты и рулетики в боксах', 'Привезём к нужному времени', 'Без обслуживания и раздачи', 'Без напитков'] },
    { key: 'mini', name: 'Мини', img: 'img/menu/99631.webp',
      li: ['Канапе 2 вида, брускетты 3, рулетики 2', 'Мини-салаты и горячее на шпажках', 'Гарнир, соусы, хлебная корзина'] },
    { key: 'midi', name: 'Миди', hit: 1, img: 'img/menu/105876.webp',
      li: ['Канапе 3 вида, брускетты 2, рулетики 2', 'Мини-салаты 3 вида, горячее 2 вида', 'Мясное плато и десерты', 'Чай и морс'] },
    { key: 'maxi', name: 'Макси', img: 'img/menu/73249.webp',
      li: ['Канапе 5 видов, брускетты 5, рулетики 3', 'Мини-салаты 3 вида, горячее 3 вида', 'Мясное и сырное плато, десерты', 'Кофе, чай, морс, лимонад'] }
  ];
  // «Новый год» — те же комплекты с новогодним оформлением линии: +500 ₽ к Мини/Миди/Макси, боксы без декора (Маша №334); фото — лендинг /novogodniy-furshet/.
  var NG_DECOR = 500;
  var KIT_GROUPS = {
    'dostavka-fursheta-v-ofis': { title: 'Выездной фуршет комплектом', kits: KITS },
    'keytering-na-novyy-god': { title: 'Новогодний фуршет комплектом', kits: KITS.map(function (k) {
      var img = { box: 'img/kits/ng-box.webp', mini: 'img/kits/ng-mini.webp', midi: 'img/kits/ng-midi.webp', maxi: 'img/kits/ng-maxi.webp' }[k.key];
      return k.p ? Object.assign({}, k, { img: img }) : Object.assign({}, k, { img: img, add: NG_DECOR, li: ['Новогоднее оформление линии'].concat(k.li) });
    }) }
  };
  function kitPrice(k) { return k.p || FORMATS.furshet.levels[k.key][0] + (k.add || 0); }
  function kitsBlock(slug) {
    var G = KIT_GROUPS[slug];
    return '<div class="ktg-kits"><div class="ktg-kits__head"><h3>' + G.title + '</h3><p>Цена на гостя — всё приготовим и привезём. Дальше — отдельные позиции, если хочется собрать самим.</p></div><div class="ktg-kits__row">' +
      G.kits.map(function (k) {
        var out = k.out || FORMATS.furshet.levels[k.key][1];
        return '<div class="ktg-kit' + (k.hit ? ' is-hit' : '') + '">' + (k.hit ? '<span class="ktg-kit__hit">Чаще всего выбирают</span>' : '') +
          '<div class="ktg-kit__img"><img src="' + k.img + '" alt="" loading="lazy"></div><div class="ktg-kit__body"><b>' + k.name + '</b>' +
          '<div class="ktg-kit__price">от ' + rub(kitPrice(k)) + '</div><small>на гостя</small><span class="ktg-kit__out">' + out + ' на персону</span>' +
          '<ul>' + k.li.map(function (x) { return '<li>' + TICK + x + '</li>'; }).join('') + '</ul>' +
          '<button type="button" class="ktg-btn ktg-btn--wide ' + (k.hit ? 'ktg-btn--primary' : 'ktg-btn--ghost') + '" data-kit="' + k.key + '" data-kit-group="' + slug + '">' + (k.p ? 'Заказать боксы' : k.add ? 'Заказать' : 'Посчитать') + '</button></div></div>';
      }).join('') + '</div></div>';
  }

  function renderGrid() {
    state.list = currentList();
    var shown = state.list.slice(0, state.limit);
    var kits = !state.q && KIT_GROUPS[state.group] ? kitsBlock(state.group) : '';
    $('[data-grid]').innerHTML = kits + (shown.length ? shown.map(itemCard).join('') : '<div class="ktg-empty" style="grid-column:1/-1">Ничего не нашли. Напишите менеджеру — приготовим и то, чего нет в меню.</div>');
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
    if (scroll) $('[data-count]').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        '<div class="ktg-set__list">' + s.rows.map(function (r, i) { return '<div class="ktg-set__row' + (i > 2 ? ' is-extra' : '') + '"><span>' + setName(r.n) + (r.q > 1 ? ' × ' + r.q : '') + '</span><small>' + r.pcs + ' шт · ' + r.w + ' г</small></div>'; }).join('') + '</div>' +
        (s.rows.length > 3 ? '<button type="button" class="ktg-set__more" data-set-more>Ещё ' + (s.rows.length - 3) + '</button>' : '') +
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
    $('[data-qv-price]').textContent = it.st ? it.p + (it.bar ? ' за бар' : ' за станцию') : it.p;
    var st = $('[data-qv-st]');
    st.hidden = !it.st;
    $('[data-qv-inc]').hidden = true;
    if (it.st) { stq = { it: it, g: STATION_MIN, v: 0 }; renderStation(); }
    $('[data-qv-link]').href = it.u;
    var cd = (window.KTG_CARDS || {})[it.id] || {o: [], s: '', d: ''};
    var esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    $('[data-qv-opts]').innerHTML = it.st ? '' : cd.o.map(function (o) { return '<div class="ktg-qv__opt"><b>' + esc(o.n) + '</b><span>' + esc(o.p) + '</span>' + (o.d ? '<small>' + esc(o.d) + '</small>' : '') + '</div>'; }).join('');
    $('[data-qv-desc]').textContent = cd.s ? 'Состав: ' + cd.s : '';  // описания с сайта часто обрывками — без них (Маша №337)
    // Фото из галереи карточки на проде (docs/fetch_cards.py); первое — наше основное.
    var SITE = 'https://arenda-attrakcionov.ru', gal = cd.lg ? cd.lg.map(function (u) { return { i: u, b: u }; }) : (cd.g || []).map(function (u) { return { i: SITE + u, b: SITE + u }; });  // lg — новые кадры вместо плохих (№440)
    gal = [{ i: it.i, b: it.b }].concat((cd.lp || []).map(function (u) { return { i: u, b: u }; }), gal).slice(0, 5);  // lp — сгенерённый кадр вторым (№497)
    $('.ktg-qv__sim', m).hidden = gal.length < 2;
    $('[data-qv-sim]').innerHTML = gal.map(function (x, k) { return '<img src="' + x.i + '" alt="" data-qv-photo="' + x.b + '"' + (k ? '' : ' class="is-on"') + '>'; }).join('');
    $('[data-qv-prev]').disabled = qvIndex <= 0;
    $('[data-qv-next]').disabled = qvIndex === -1 || qvIndex >= state.list.length - 1;
    syncQvPick();
    open(m);
  }
  // Станция: повар и оборудование + порции «готовим на месте», не меньше 30 (docs/build_data.py). Клиенту — одной суммой на 30 гостей + доп. порции (Маша №313).
  // Несколько начинок (у баров — Б/А и алкогольный) — чипы, от выбранной зависят станция и доп. порция (Маша №323, №327).
  var STATION_FEE = 12000, STATION_DELIVERY = 5000, STATION_STAFF = 100, STATION_MIN = 30, STATION_GUESTS = [30, 50, 100, 150, 200], stq = null;
  // «В станцию включено» — подача как у Министерства (Маша №363).
  var STI = function (d) { return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  // Доставка первой и с переливом — Стас (Маша №427).
  var STATION_INC = [
    [STI('<path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'), 'Доставка', 'Бесплатно в пределах МКАД'],
    [STI('<path d="M3 10h18M5 10v10M19 10v10M8 10V6h8v4M10 6V4h4v2"/>'), 'Оборудование', 'Своё, всё для готовки'],
    [STI('<path d="M7 10a3 3 0 1 1 2-5.2A3 3 0 0 1 15 4.8 3 3 0 1 1 17 10v3H7z"/><path d="M7 13v2a5 5 0 0 0 10 0v-2"/><path d="M9 21h6"/>'), 'Повар', 'Готовит при гостях'],
    [STI('<path d="M4 20c0-6 4-11 12-14-1 8-5 13-12 14z"/><path d="M4 20l7-7"/>'), 'Продукты', 'На утверждённое меню'],
    [STI('<path d="M3 9h18v3H3zM6 12v8M18 12v8"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>'), 'Стол и декор', 'Стойка и декор станции'],
    [STI('<path d="M4 9h16l-1.5 11h-13z"/><path d="M3 9h18"/><path d="M9 5c0-1 1-2 3-2s3 1 3 2"/>'), 'Крафтовая посуда', 'Одноразовая, на всех гостей']
  ];
  function renderStation() {
    var st = $('[data-qv-st]'), it = stq.it, g = stq.g, sv = it.sv, pp = sv ? sv[stq.v][1] : it.st;
    var chip = function (attr, val, on, label) { return '<button type="button" ' + attr + '="' + val + '"' + (on ? ' class="is-on"' : '') + '>' + label + '</button>'; };
    var own = STATION_GUESTS.indexOf(g) === -1;
    var fee = STATION_FEE + (it.bar ? 0 : STATION_DELIVERY);
    var who = it.bar ? 'Бар на ' + STATION_MIN + ' гостей, бармен и стойка включены' : 'Станция на ' + STATION_MIN + ' гостей, повар, оборудование и доставка включены';
    st.innerHTML = (sv ? '<small>' + (it.bar ? 'Вариант' : 'Начинка') + '</small><div class="ktg-qv__chips">' + sv.map(function (x, k) { return chip('data-st-v', k, k === stq.v, x[0]); }).join('') + '</div>' : '') +
      '<small>Сколько гостей</small><div class="ktg-qv__chips">' + STATION_GUESTS.map(function (n) { return chip('data-st-g', n, n === g, n); }).join('') +
        '<input type="text" inputmode="numeric" maxlength="4" placeholder="Своё" aria-label="Своё число гостей" data-st-in' + (own ? ' class="is-on" value="' + g + '"' : '') + '></div>' +
      '<div class="ktg-qv__strow"><span>' + who + '</span><b>' + rub(fee + pp * STATION_MIN) + '</b></div>' +
      (g > STATION_MIN ? '<div class="ktg-qv__strow"><span>+ ' + (g - STATION_MIN) + ' доп. ' + plural(g - STATION_MIN, 'порция', 'порции', 'порций') + ' × ' + rub(pp) + '</span><b>' + rub(pp * (g - STATION_MIN)) + '</b></div>'
        : '<div class="ktg-qv__strow"><span>Доп. порция</span><b>' + rub(pp) + '</b></div>') +
      '<div class="ktg-qv__strow is-total"><span>Итого' + (it.bar ? ' за бар' : ' за станцию') + '</span><b>' + rub(fee + pp * g) + '</b></div>' +
      (g >= STATION_STAFF ? '<p class="ktg-qv__stnote">От ' + STATION_STAFF + ' гостей на станцию выходит больше персонала — посчитаем его в смете отдельно.</p>' : '') +
      '';
    var inc = $('[data-qv-inc]');
    inc.hidden = !!it.bar;
    inc.innerHTML = it.bar ? '' : '<small>В станцию включено</small><div class="ktg-qv__inc">' + STATION_INC.map(function (x, k) { return '<div' + (k ? '' : ' class="is-hot"') + '>' + x[0] + '<b>' + x[1] + '</b><span>' + x[2] + '</span></div>'; }).join('') + '</div>';
  }
  function syncQvPick() {
    var m = $('[data-qv]'), id = +m.dataset.id, b = $('[data-qv-pick]');
    b.textContent = isPicked(id) ? 'В подборке — убрать' : 'Добавить в подборку';
    b.className = 'ktg-btn ktg-btn--wide ' + (isPicked(id) ? 'ktg-btn--soft' : 'ktg-btn--primary');
  }

  /* ---------- подборка ---------- */
  function renderDrawer() {
    var f = FORMATS[state.fmt];
    var wants = ADDS.filter(function (x) { return x.group && state.wants[x.group] && !(x.group === STATION && state.fmt === 'furshet'); }).map(function (x) { return x.name; });
    if (state.kit) {
      var k = state.kit, note = k.p ? ' · без обслуживания и напитков' : k.add ? ' · с новогодним оформлением' : '';
      $('[data-drawer-list]').innerHTML = '<div class="ktg-dl ktg-dl--calc"><div><b>' + (k.p ? k.name : (k.add ? 'Новогодний фуршет «' : 'Фуршет «') + k.name + '»') + ', ' + state.guests + ' гостей · ' + (k.out || FORMATS.furshet.levels[k.key][1]) + ' на гостя</b><span>от ' + rub(kitPrice(k) * state.guests) + note + '</span></div></div>';
      return;
    }
    var calc = '<div class="ktg-dl ktg-dl--calc"><div><b>Расчёт: ' + calcTitle() + ', ' + state.guests + ' гостей' + (wants.length ? ' + ' + wants.join(', ').toLowerCase() : '') + '</b><span>от ' + $('[data-sum-total]').textContent + '</span></div></div>';
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
    var t = e.target.closest('button,a,[data-qv-open],[data-qv-photo],[data-add-staff],[data-add-want],[data-add-welcome]');
    var dd = $('[data-dd]');
    if (!e.target.closest('[data-dd]')) dd.classList.remove('is-open');
    if (!t) return;
    if (t.matches('[data-fmt]')) { goCalc(t.dataset.fmt); return; }
    if (t.matches('[data-fmt-set]')) { state.fmt = t.dataset.fmtSet; renderFormats(); renderSum(); return; }
    if (t.matches('[data-lvl]')) { state.lvl = t.dataset.lvl; renderFormats(); renderSum(); return; }
    if (t.matches('[data-g]')) { setGuests(state.guests + +t.dataset.g); return; }
    if (t.matches('[data-add-staff]')) { state.staff = !state.staff; renderFormats(); renderSum(); return; }
    if (t.matches('[data-add-group]')) { setGroup(t.dataset.addGroup, true); return; }
    if (t.matches('[data-add-welcome]')) { if (state.wants[STATION]) state.wants[STATION] = false; else state.welcome = !state.welcome; renderFormats(); renderSum(); return; }
    if (t.matches('[data-add-want]')) { var w = t.dataset.addWant; state.wants[w] = !state.wants[w]; renderFormats(); renderSum(); return; }
    if (t.matches('[data-group]')) { setGroup(t.dataset.group, true); return; }
    if (t.matches('[data-more]')) { state.limit += 12; renderGrid(); return; }
    if (t.matches('[data-dd-btn]')) { dd.classList.toggle('is-open'); return; }
    if (t.matches('[data-sort]')) {
      state.sort = t.dataset.sort; $$('[data-sort]').forEach(function (b) { b.classList.toggle('is-on', b === t); });
      $('[data-dd-label]').textContent = t.textContent; dd.classList.remove('is-open'); renderGrid(); return;
    }
    if (t.matches('[data-kit]')) {
      var kk = KIT_GROUPS[t.dataset.kitGroup].kits.filter(function (x) { return x.key === t.dataset.kit; })[0];
      if (kk.p || kk.add) { state.kit = kk; renderDrawer(); open($('[data-drawer]')); return; }
      state.lvl = kk.key; state.welcome = false; goCalc('furshet'); return;
    }
    if (t.matches('[data-set-pick]')) { toggleSet(+t.closest('[data-set]').dataset.set); return; }
    if (t.matches('[data-set-more]')) { var sc = t.closest('.ktg-set'); sc.classList.toggle('is-full'); t.textContent = sc.classList.contains('is-full') ? 'Свернуть' : 'Ещё ' + (SETS[+sc.dataset.set].rows.length - 3); return; }
    if (t.matches('[data-pick]')) { togglePick(+t.closest('[data-id]').dataset.id); return; }
    if (t.matches('[data-qv-open]')) { openQv(+t.closest('[data-id]').dataset.id); return; }
    if (t.matches('[data-st-g]')) { stq.g = +t.dataset.stG; renderStation(); return; }
    if (t.matches('[data-st-v]')) { stq.v = +t.dataset.stV; renderStation(); return; }
    if (t.matches('[data-qv-photo]')) { $('[data-qv-img]').src = t.dataset.qvPhoto; $$('[data-qv-photo]').forEach(function (x) { x.classList.toggle('is-on', x === t); }); return; }
    if (t.matches('[data-qv-pick]')) { togglePick(+$('[data-qv]').dataset.id); return; }
    if (t.matches('[data-qv-prev]') && qvIndex > 0) { openQv(state.list[qvIndex - 1].id); return; }
    if (t.matches('[data-qv-next]') && qvIndex < state.list.length - 1) { openQv(state.list[qvIndex + 1].id); return; }
    if (t.matches('[data-unpick]')) { togglePick(+t.closest('[data-id]').dataset.id); return; }
    if (t.matches('[data-open-drawer]')) { state.kit = null; renderDrawer(); open($('[data-drawer]')); return; }
    if (t.matches('[data-close]')) { closeAll(); return; }
  });
  overlay.addEventListener('click', closeAll);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
    if (!$('[data-qv]').classList.contains('is-open')) return;
    if (e.key === 'ArrowLeft' && qvIndex > 0) openQv(state.list[qvIndex - 1].id);
    if (e.key === 'ArrowRight' && qvIndex < state.list.length - 1) openQv(state.list[qvIndex + 1].id);
  });

  document.addEventListener('ktg:go', function (e) { closeAll(); setGroup(e.detail, true); });
  // Своё число гостей в станции: по Enter или уходу из поля, не меньше 30.
  root.addEventListener('change', function (e) {
    if (!e.target.matches('[data-st-in]') || !stq) return;
    var v = parseInt(e.target.value.replace(/\D/g, ''), 10);
    if (v) { stq.g = Math.max(STATION_MIN, v); renderStation(); }
  });
  root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('[data-st-in]')) e.target.blur(); });
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
