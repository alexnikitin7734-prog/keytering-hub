(function () {
  var root = document.getElementById('ktg');
  if (!root) return;
  var $ = function (s, el) { return (el || root).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); };
  var rub = function (n) { return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽'; };
  // Папка файлов лендинга: на сайте её даёт data-lp у корня ({LP} в разметке), в прототипе — пусто, пути от страницы.
  var LP = root.dataset.lp || '';
  function lpFix(v) {
    if (typeof v === 'string') return /^(img|video)\//.test(v) ? LP + v : v;
    if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { v[k] = lpFix(v[k]); });
    return v;
  }
  if (LP) ['KTG_DATA', 'KTG_SETS', 'KTG_CARDS'].forEach(function (k) { lpFix(window[k]); });
  var ICON = LP + 'img/ikonki/';
  var TICK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
  var PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  var DEL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  // Цены — с карточек сайта и лендингов (furshet-landing, banket-landing, kofe-breyk-landing), «от» за гостя.
  var WAITER = 7500, BARMAN = 7500;
  var FORMATS = {
    furshet: { name: 'Фуршет', icon: 'ik-furshet', waiterPer: 20, levels: { mini: [2900, '400 г · 200 мл'], midi: [3800, '600 г · 300 мл'], maxi: [4900, '750 г · 500 мл'] } },  // как калькулятор /gotovyj-furshet/ с 08.09 (сверка с Колей, «Связь» т.3 №536)
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
    var P = state.wants[STATION] ? FURSHET_PLUS.stancia : state.welcome ? FURSHET_PLUS.welcome : null, B = FORMATS.furshet.levels;
    if (!P) return B;
    // Карточки велкома на сайте дешевле простого фуршета (№536) — пока их не поправили, с велкомом не дешевле, чем без.
    var L = {}; Object.keys(B).forEach(function (l) { L[l] = P[l][0] < B[l][0] ? [B[l][0], P[l][1]] : P[l]; }); return L;
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

  var state = { fmt: 'furshet', lvl: 'mini', guests: 50, staff: true, welcome: false, wants: {}, picks: store.get('picks', []).filter(function (id) { return byId[id]; }), sets: store.get('sets', []).filter(function (k) { return (window.KTG_SETS || [])[k]; }), calcOn: false,
                group: DATA[0] ? DATA[0].slug : '', q: '', sort: 'pop', limit: 12, list: [] };

  // Цели Метрики — общие на все лендинги (условие «содержит» _lead/_cta/_calc_use), lp — разрез по странице.
  var calcUsed = false;
  function goal(name, params) { if (window.ym) window.ym(24366505, 'reachGoal', name, Object.assign({ lp: 'keytering' }, params)); }
  function calcUse() { if (!calcUsed) { calcUsed = true; goal('ktg_calc_use'); } }

  function savePicks() { store.set('picks', state.picks); store.set('sets', state.sets); }
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
      else if (a.key === 'welcome') { on = state.welcome && !state.wants[STATION]; attr = 'data-add-welcome'; if (state.wants[STATION]) extra = '<small class="ktg-add__incl">входит в станцию</small>'; }
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
      '<div class="ktg-item__body"><div class="ktg-item__name" data-qv-open>' + it.n + '</div>' + (it.st ? '<small class="ktg-item__st">' + (it.bar ? 'бар с барменом' : 'станция с поваром') + (it.fee ? ', от ' + it.min + ' гостей' : ', от 30 порций') + '</small>' : '') + '<div class="ktg-item__row"><span class="ktg-item__price">' + it.p + '</span>' +
      '<button type="button" class="ktg-pick' + (isPicked(it.id) ? ' is-on' : '') + '" data-pick aria-label="В подборку">' + (isPicked(it.id) ? TICK.replace(/12/g, '18') : PLUS) + '</button></div></div></div>';
  }

  // «Фуршетное меню» — наборы Коли (Битрикс 13.11, рекламки в Downloads/ai/furshet-boxy/kolya; «Связь» т.3 №518–529) вместо Мини/Миди/Макси.
  // Боксы — жёсткий состав, гостей сколько угодно; плеттер — конструктор, уровни стартовые; фуршет без обслуживания — официанты отдельно.
  // t — сумма с рекламки по числу гостей; состав фуршета — версия на 30 гостей.
  var OFFER_GROUPS = { 'dostavka-fursheta-v-ofis': 'Фуршет комплектом', 'keytering-na-novyy-god': 'Новогодний фуршет комплектом' };  // НГ — те же наборы Коли (Маша №590)
  var P1 = ['Канапе «Капрезе»', 'Канапе с цыплёнком терияки в кунжуте', 'Канапе с голубым сыром и виноградом', 'Рулетики с сыром и ветчиной', 'Профитроли с куриным муссом',
    'Блинный рулетик с лососем, сливочным кремом и тобико', 'Рулетики из баклажан', 'Брускетта с бужениной и огуречным релишем', 'Брускетта с тремя видами томатов', 'Салат «Цезарь» с курицей', 'Салат оливье'];
  var P2 = ['Канапе с тигровой креветкой и ананасом', 'Брускетта с ростбифом и соусом вителло', 'Брускетта с лососем и крем-чизом', 'Салат «Руккола» с креветками'];
  var P3 = ['Профитроли с муссом крем-чиз и с/с сёмгой'];
  var OFFERS = [
    { key: 'box', name: 'Фуршетные боксы', note: 'Готовый набор холодных закусок и салатов в боксах. Привезём к нужному времени — накрывать и обслуживать не нужно.',
      guests: [20, 30, 50, 100], own: 1, sc: { 20: 'box7', 30: 'box1', 50: 'box10', 100: 'box6' }, tiers: [{ name: 'Фуршетные боксы', pp: 19245 / 20, out: '121 г', gal: ['video/boxy.mp4', 'img/offers/k/box4.webp', 'img/offers/k/box2.webp', 'img/offers/k/box3.webp', 'img/offers/k/box5.webp'],
        li: ['13 видов закусок и салатов', 'Холодное, без горячего и напитков', 'Состав не меняется — просто выберите гостей'],
        cats: [['Закуски', ['Канапе «Капрезе»', 'Канапе с лососевым риетом и красной икрой', 'Канапе с ростбифом и печёным перцем', 'Рулетики из баклажан', 'Рулетики с сыром и ветчиной',
          'Профитроли с муссом крем-чиз и с/с сёмгой', 'Брускетта с томатами, моцареллой и песто', 'Брускетта с красной икрой', 'Брускетта с курицей су-вид и томатами черри']],
          ['Салаты', ['Салат с утиной грудкой и пряной грушей', 'Салат «Цезарь» с курицей', 'Салат оливье', 'Салат с ростбифом']]] }] },
    { key: 'plat', name: 'Плеттеры', note: 'Холодные закуски и салаты на подносах под крышкой — полноценная еда для гостей. Уровни — для старта: любую позицию заменим.',
      guests: [20, 30, 50], build: 1, tiers: [
        { name: 'Классика', t: { 20: 45545, 30: 70695, 50: 116145 }, out: '350 г', sc: { 20: 'plat8', 30: 'plat1', 50: 'plat10' }, gal: ['img/offers/k/plat11.webp'], cats: [['Закуски и салаты', P1]] },
        { name: 'Плюс', hit: 1, t: { 20: 67745, 30: 100595, 50: 166295 }, out: '470 г', sc: { 20: 'plat17', 30: 'plat14', 50: 'plat12' }, gal: ['video/boxy-black.mp4', 'img/offers/k/plat9.webp'], cats: [['Закуски и салаты', P1.concat(P2)]], plus: P2 },
        { name: 'Премиум', t: { 20: 74345, 30: 110995, 50: 184295 }, out: '495 г', sc: { 20: 'plat13', 30: 'plat4', 50: 'plat3' }, gal: ['img/offers/k/plat2.webp'], cats: [['Закуски и салаты', P1.concat(P2, P3)]], plus: P3 }] },
    { key: 'fur', name: 'Фуршет без обслуживания', note: 'Холодное, горячие брошетты и напитки — привезём и расставим. Официантов добавим, если нужны.',
      guests: [30, 50, 100], staff: 1, tiers: [
        { name: 'Базовый', t: { 30: 81945, 50: 135845, 100: 269745 }, out: '478 г', sc: { 30: 'plat7', 50: 'plat16', 100: 'fur2' }, st: { 100: 'fur100bw' }, gal: ['img/offers/k/fur12.webp', 'img/offers/k/fur8.webp'], cats: [
          ['Холодные закуски', ['Канапе «Капрезе»', 'Канапе с цыплёнком терияки в кунжуте', 'Канапе с голубым сыром и виноградом', 'Рулетики с сыром и ветчиной', 'Профитроли с куриным муссом',
            'Блинный рулетик с лососем, сливочным кремом и тобико', 'Рулетики из баклажан', 'Брускетта с бужениной и огуречным релишем', 'Брускетта с тремя видами томатов']],
          ['Салаты', ['Салат «Цезарь» с курицей', 'Салат оливье']],
          ['Горячее', ['Брошетты из свиной шеи', 'Брошетты куриные', 'Брошетты из картофеля бейби', 'Ассорти соусов']],
          ['Напитки', ['Морс «Лесные ягоды»']]] },
        { name: 'Сытный', hit: 1, t: { 30: 112270, 50: 185420, 100: 366895 }, out: '648 г', sc: { 30: 'plat6', 50: 'plat5', 100: 'fur4' }, st: { 100: 'fur100sw' }, gal: ['img/offers/k/fur1.webp', 'img/offers/k/fur5.webp'], cats: [
          ['Холодные закуски', ['Блинный рулетик с лососем, сливочным кремом и тобико', 'Веррин с пармской ветчиной, песто и вялеными томатами', 'Канапе «Чоризо и моцарелла»', 'Канапе с сёмгой с/с',
            'Канапе с тигровой креветкой и ананасом', 'Канапе с телячьим языком и свежим огурцом', 'Канапе с голубым сыром и виноградом', 'Ролл «Цезарь» с курицей', 'Рулетики из баклажан',
            'Брускетта с ростбифом и соусом вителло', 'Брускетта с курицей су-вид и томатами черри']],
          ['Салаты', ['Салат с утиной грудкой и пряной грушей', 'Салат «Цезарь» с курицей']],
          ['Горячее', ['Брошетты из свиной шеи', 'Брошетты куриные', 'Брошетты из овощей', 'Брошетты из картофеля бейби', 'Ассорти соусов']],
          ['Напитки', ['Морс «Лесные ягоды»', 'Лимонад «Цитрус»']]] },
        { name: 'Праздничный', t: { 30: 144520, 50: 238170, 100: 474895 }, out: '685 г', sc: { 30: 'box8', 50: 'plat15', 100: 'fur100p' }, st: { 100: 'fur13' }, gal: ['img/offers/k/fur3.webp', 'img/offers/k/fur10.webp'], cats: [
          ['Холодные закуски', ['Веррин с пармской ветчиной, песто и вялеными томатами', 'Блинный рулетик с лососем, сливочным кремом и тобико', 'Канапе с куриной тефтелькой и чесночным соусом',
            'Канапе с ростбифом и печёным перцем', 'Канапе с телячьим языком и свежим огурцом', 'Канапе с тигровой креветкой и ананасом', 'Канапе с риетом из лосося и щучьей икрой',
            'Брускетта с говяжьим языком и соусом вителло', 'Брускетта с тигровой креветкой и гуакамоле', 'Брускетта с прошутто, соусом ромеско и каперсами', 'Профитроли с муссом крем-чиз и с/с сёмгой']],
          ['Салаты', ['Салат «Нисуаз»', 'Салат «Цезарь» с курицей', 'Салат с ростбифом']],
          ['Горячее', ['Брошетты куриные', 'Брошетты из свиной шеи', 'Брошетты из креветок', 'Брошетты из овощей', 'Брошетты из картофеля бейби', 'Брошетты из сёмги', 'Ассорти соусов']],
          ['Десерты', ['Медовик мини', 'Красный бархат мини']],
          ['Напитки', ['Морс «Лесные ягоды»', 'Лимонад «Цитрус»']]] },
        { name: 'Премиум', t: { 30: 176620, 50: 291220, 100: 584595 }, out: '784 г', sc: { 30: 'fur9', 50: 'plat16', 100: 'fur100v' }, st: { 100: 'fur14' }, gal: ['img/offers/k/fur6.webp', 'img/offers/k/fur11.webp'], cats: [
          ['Холодные закуски', ['Блинный рулетик с лососем, сливочным кремом и тобико', 'Канапе с лососевым риетом и красной икрой', 'Канапе с ростбифом и печёным перцем', 'Канапе с голубым сыром и виноградом',
            'Канапе с тигровой креветкой и ананасом', 'Веррин с пармской ветчиной, песто и вялеными томатами', 'Канапе с копчёной грудкой', 'Ролл «Цезарь» с курицей', 'Рулетики из баклажан',
            'Профитроли с муссом крем-чиз и с/с сёмгой', 'Брускетта с красной икрой', 'Брускетта с сёмгой и красной икрой', 'Брускетта с тигровой креветкой и гуакамоле',
            'Брускетта с ростбифом и соусом вителло', 'Брускетта с томатами, моцареллой и песто']],
          ['Салаты', ['Салат с утиной грудкой и пряной грушей', 'Салат оливье', 'Салат «Руккола» с креветками', 'Салат «Цезарь» с курицей']],
          ['Горячее', ['Брошетты куриные', 'Брошетты из креветок', 'Брошетты из сёмги', 'Брошетты из говяжьей вырезки', 'Брошетты из овощей', 'Брошетты из картофеля бейби', 'Ассорти соусов']],
          ['Десерты', ['Брауни мини', 'Медовик мини', 'Мини-эклер шоколадный']],
          ['Напитки', ['Морс «Лесные ягоды»', 'Лимонад «Цитрус»']]] }] }
  ];
  lpFix(OFFERS);
  var ofs = { o: 0, g: { box: 20, plat: 20, fur: 30 }, staff: false, open: {} };
  function offerTotal(o, t, g) { return t.pp ? Math.round(t.pp * g) : t.t[g]; }
  function offerStaff(g) { return Math.max(1, Math.ceil(g / FORMATS.furshet.waiterPer)); }
  // Фото набора — листалка (Маша №560): свайп / стрелки, точки внизу.
  var ARR = function (d) { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; };
  // Кадр по числу гостей (фото Коли, Маша №684): берём ближайший порог снизу; у боксов он идёт после ролика.
  function scaleShot(o, t, g) {
    var k = o.guests.filter(function (n) { return n <= g; }).pop() || o.guests[0];
    var st = o.staff && ofs.staff && t.st && t.st[k];  // кадр с поваром — только когда включены официанты (Маша №697)
    return LP + 'img/offers/k/' + (st || (t.sc || o.sc)[k]) + '.webp';
  }
  function offerGal(o, t, g) {
    var gal = t.gal.slice(), at = /\.mp4$/.test(gal[0]) ? 1 : 0;
    if (at && g !== o.guests[0]) { gal.shift(); at = 0; }  // ролик — только на первом наборе гостей, дальше фото (Маша №688)
    gal.splice(at, 0, scaleShot(o, t, g));
    return gal;
  }
  function slider(gal) {
    return '<div class="ktg-kit__img ktg-sl"><div class="ktg-sl__track" data-sl>' + gal.map(function (u) {
      return /\.mp4$/.test(u) ? '<video src="' + u + '" poster="' + u.replace(/\.mp4$/, '.jpg') + '" autoplay muted loop playsinline></video>' : '<img src="' + u + '" alt="" loading="lazy">'; }).join('') + '</div>' +
      '<button type="button" class="ktg-sl__btn is-prev" data-sl-go="-1" aria-label="Назад">' + ARR('M15 5l-7 7 7 7') + '</button><button type="button" class="ktg-sl__btn is-next" data-sl-go="1" aria-label="Дальше">' + ARR('M9 5l7 7-7 7') + '</button>' +
      '<div class="ktg-sl__dots">' + gal.map(function (u, k) { return '<i' + (k ? '' : ' class="is-on"') + '></i>'; }).join('') + '</div></div>';
  }
  root.addEventListener('scroll', function (e) {
    if (!e.target.matches || !e.target.matches('[data-sl]')) return;
    var tr = e.target, k = Math.round(tr.scrollLeft / tr.clientWidth);
    $$('.ktg-sl__dots i', tr.parentNode).forEach(function (d, i) { d.classList.toggle('is-on', i === k); });
  }, true);
  function offersBlock() {
    var o = OFFERS[ofs.o], g = ofs.g[o.key];
    var chip = function (attr, val, on, label) { return '<button type="button" ' + attr + '="' + val + '"' + (on ? ' class="is-on"' : '') + '>' + label + '</button>'; };
    var own = o.own && o.guests.indexOf(g) === -1;
    var count = function (t) { return t.cats.reduce(function (s, c) { return s + c[1].length; }, 0); };
    return '<div class="ktg-kits ktg-offers"><div class="ktg-kits__head"><h3>' + OFFER_GROUPS[state.group] + '</h3>' +
      '<p class="ktg-offers__promo">Доставку в пределах МКАД посчитаем в корзине по сумме заказа</p></div>' +
      '<div class="ktg-offers__tabs">' + OFFERS.map(function (x, k) { return chip('data-of-o', k, k === ofs.o, x.name); }).join('') + '</div>' +
      '<p class="ktg-offers__note">' + o.note + '</p>' +
      '<div class="ktg-offers__bar"><small>Сколько гостей</small><div class="ktg-qv__chips">' + o.guests.map(function (n) { return chip('data-of-g', n, n === g, n); }).join('') +
        (o.own ? '<input type="text" inputmode="numeric" maxlength="5" placeholder="Своё" aria-label="Своё число гостей" data-of-in' + (own ? ' class="is-on" value="' + g + '"' : '') + '>' : '') + '</div>' +
        (o.staff ? '<div role="button" tabindex="0" class="ktg-add' + (ofs.staff ? ' is-on' : '') + '" data-of-staff><img src="' + ICON + 'ik-ofitsianty.webp" alt="">Официанты: ' + offerStaff(g) + ' × ' + rub(WAITER) + '</div>' : '') +
        (o.build ? '<button type="button" class="ktg-btn ktg-btn--ghost" data-of-build>Собрать свой плеттер</button>' : '') + '</div>' +
      '<div class="ktg-kits__row ktg-offers__row is-' + o.tiers.length + '">' + o.tiers.map(function (t, k) {
        var sum = offerTotal(o, t, g) + (o.staff && ofs.staff ? offerStaff(g) * WAITER : 0), id = o.key + k;
        var full = '<div class="ktg-offers__all">' + t.cats.map(function (c) { return '<small>' + c[0] + '</small><ul>' + (t.plus ? t.plus.concat(c[1].filter(function (x) { return t.plus.indexOf(x) === -1; })) : c[1]).map(function (x) {  // добавленное к прошлому уровню — первым и с плюсом
          return (t.plus && t.plus.indexOf(x) !== -1) ? '<li class="is-new">' + PLUS.replace(/18/g, '12') + x + '</li>' : '<li>' + TICK + x + '</li>'; }).join('') + '</ul>'; }).join('') + '</div>';
        var short = t.li ? '<ul>' + t.li.map(function (x) { return '<li>' + TICK + x + '</li>'; }).join('') + '</ul>'
          : t.plus ? '<small class="ktg-offers__lbl">К прошлому уровню добавили</small><ul>' + t.plus.map(function (x) { return '<li>' + PLUS.replace(/18/g, '12') + x + '</li>'; }).join('') + '</ul>'
          : t.cats.length === 1 ? '<ul>' + t.cats[0][1].slice(0, 4).map(function (x) { return '<li>' + TICK + x + '</li>'; }).join('') + '</ul>'
          : '<ul>' + t.cats.map(function (c) {
              var n = c[1].filter(function (x) { return x !== 'Ассорти соусов'; }).length;
              return '<li>' + TICK + c[0] + ': ' + (c[0] === 'Напитки' ? c[1].join(', ').replace(/«|»/g, '') : n + (n < c[1].length ? ' + соусы' : '')) + '</li>';
            }).join('') + '</ul>';
        return '<div class="ktg-kit' + (t.hit ? ' is-hit' : '') + (o.tiers.length === 1 ? ' is-wide' : '') + '">' + (t.hit ? '<span class="ktg-kit__hit">Чаще всего выбирают</span>' : '') +
          slider(offerGal(o, t, g)) + '<div class="ktg-kit__body"><b>' + t.name + '</b><span class="ktg-offers__n">' + count(t) + ' ' + plural(count(t), 'позиция', 'позиции', 'позиций') + '</span>' +
          '<div class="ktg-kit__price">' + rub(sum) + '</div><small>на ' + g + ' ' + plural(g, 'гостя', 'гостей', 'гостей') + ' · ≈ ' + rub(sum / g) + ' на гостя</small>' +
          '<div class="ktg-offers__tags"><span class="ktg-kit__out">' + t.out + ' на гостя</span></div>' +
          // Десктоп — весь состав в окне с прокруткой и градиентом, мобилка — коротко + раскрытие по тапу (Маша №574–576).
          '<div class="ktg-scroll">' + full + '</div><div class="ktg-mob">' + (ofs.open[id] ? full : short) + '<button type="button" class="ktg-set__more" data-of-all="' + id + '">' + (ofs.open[id] ? 'Свернуть' : 'Весь состав') + '</button></div>' +
          '<button type="button" class="ktg-btn ktg-btn--wide ' + (t.hit || o.tiers.length === 1 ? 'ktg-btn--primary' : 'ktg-btn--ghost') + '" data-of-order="' + k + '">Заказать</button></div></div>';
      }).join('') + '</div></div>';
  }
  function renderGrid() {
    state.list = currentList();
    var shown = state.list.slice(0, state.limit);
    var kits = !state.q && OFFER_GROUPS[state.group] ? offersBlock() : '';
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
      var all = state.sets.indexOf(k) !== -1;
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
    var i = state.sets.indexOf(k), all = i !== -1;
    if (all) state.sets.splice(i, 1); else state.sets.push(k);
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
    if (it.st) { stq = { it: it, g: it.min || STATION_MIN, v: 0 }; renderStation(); }
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
    $$('[data-qv-prev]').forEach(function (b) { b.disabled = qvIndex <= 0; });  // кнопки на мобилке + стрелки на десктопе (Маша №506)
    $$('[data-qv-next]').forEach(function (b) { b.disabled = qvIndex === -1 || qvIndex >= state.list.length - 1; });
    syncQvPick();
    open(m);
  }
  // Станция: повар и оборудование + порции «готовим на месте», не меньше 30 (docs/build_data.py). Клиенту — одной суммой на 30 гостей + доп. порции (Маша №313).
  // Несколько начинок (у баров — Б/А и алкогольный) — чипы, от выбранной зависят станция и доп. порция (Маша №323, №327).
  var STATION_FEE = 12000, STATION_STAFF = 100, STATION_MIN = 30, STATION_GUESTS = [30, 50, 100, 150, 200], stq = null;
  // «В станцию включено» — подача как у Министерства (Маша №363).
  var STI = function (d) { return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  // Доставка первой; у станций — по калькулятору в корзине, с переливом «бесплатно» — только у баров (Маша №427, т.21 №594).
  var STATION_INC = [
    [STI('<path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'), 'Доставка', 'Считаем по сумме заказа'],
    [STI('<path d="M3 10h18M5 10v10M19 10v10M8 10V6h8v4M10 6V4h4v2"/>'), 'Оборудование', 'Своё, всё для готовки'],
    [STI('<path d="M7 10a3 3 0 1 1 2-5.2A3 3 0 0 1 15 4.8 3 3 0 1 1 17 10v3H7z"/><path d="M7 13v2a5 5 0 0 0 10 0v-2"/><path d="M9 21h6"/>'), 'Повар', 'Готовит при гостях'],
    [STI('<path d="M4 20c0-6 4-11 12-14-1 8-5 13-12 14z"/><path d="M4 20l7-7"/>'), 'Продукты', 'На утверждённое меню'],
    [STI('<path d="M3 9h18v3H3zM6 12v8M18 12v8"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>'), 'Стол и декор', 'Стойка и декор станции'],
    [STI('<path d="M4 9h16l-1.5 11h-13z"/><path d="M3 9h18"/><path d="M9 5c0-1 1-2 3-2s3 1 3 2"/>'), 'Крафтовая посуда', 'Одноразовая, на всех гостей']
  ];
  // Бары Коли — как на сайте: стойка, доставка, бармен (Маша, Связь т.3 №641).
  var BAR_INC = [
    [STI('<path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'), 'Доставка', 'Бесплатно в пределах МКАД'],
    [STI('<path d="M3 9h18v3H3zM6 12v8M18 12v8"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>'), 'Барная стойка', 'Стойка и декор бара'],
    [STI('<circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/><path d="M10 14l2 2 2-2"/>'), 'Бармен', 'Готовит при гостях']
  ];
  function renderStation() {
    var st = $('[data-qv-st]'), it = stq.it, g = stq.g, sv = it.sv, pp = sv ? sv[stq.v][1] : it.st;
    var chip = function (attr, val, on, label) { return '<button type="button" ' + attr + '="' + val + '"' + (on ? ' class="is-on"' : '') + '>' + label + '</button>'; };
    var own = STATION_GUESTS.indexOf(g) === -1, mn = it.min || STATION_MIN, kb = !!it.fee;
    var fee = it.fee || STATION_FEE;  // доставка станций — по калькулятору в корзине, не внутри сбора (Маша, т.21 №594)
    var who = it.bar ? 'Бар на ' + mn + ' гостей, ' + (kb ? 'доставка, бармен и стойка' : 'бармен и стойка') + ' включены' : 'Станция на ' + STATION_MIN + ' гостей, повар и оборудование включены';
    st.innerHTML = (sv ? '<small>' + (it.bar ? 'Вариант' : 'Начинка') + '</small><div class="ktg-qv__chips">' + sv.map(function (x, k) { return chip('data-st-v', k, k === stq.v, x[0]); }).join('') + '</div>' : '') +
      '<small>Сколько гостей</small><div class="ktg-qv__chips">' + STATION_GUESTS.filter(function (n) { return n >= mn; }).map(function (n) { return chip('data-st-g', n, n === g, n); }).join('') +
        '<input type="text" inputmode="numeric" maxlength="4" placeholder="Своё" aria-label="Своё число гостей" data-st-in' + (own ? ' class="is-on" value="' + g + '"' : '') + '></div>' +
      '<div class="ktg-qv__strow"><span>' + who + '</span><b>' + rub(fee + pp * mn) + '</b></div>' +
      (g > mn ? '<div class="ktg-qv__strow"><span>+ ' + (g - mn) + ' доп. ' + (kb ? plural(g - mn, 'гость', 'гостя', 'гостей') : plural(g - mn, 'порция', 'порции', 'порций')) + ' × ' + rub(pp) + '</span><b>' + rub(pp * (g - mn)) + '</b></div>'
        : '<div class="ktg-qv__strow"><span>' + (kb ? 'Доп. гость' : 'Доп. порция') + '</span><b>' + rub(pp) + '</b></div>') +
      '<div class="ktg-qv__strow is-total"><span>Итого' + (it.bar ? ' за бар' : ' за станцию') + '</span><b>' + rub(fee + pp * g) + '</b></div>' +
      (g >= STATION_STAFF ? '<p class="ktg-qv__stnote">От ' + STATION_STAFF + ' гостей на станцию выходит больше персонала — посчитаем его в смете отдельно.</p>' : '') +
      '';
    var inc = $('[data-qv-inc]');
    inc.hidden = it.bar && !kb;
    inc.innerHTML = it.bar && !kb ? '' : '<small>' + (kb ? 'В бар включено' : 'В станцию включено') + '</small><div class="ktg-qv__inc">' + (kb ? BAR_INC : STATION_INC).map(function (x, k) { return '<div' + (kb && !k ? ' class="is-hot"' : '') + '>' + x[0] + '<b>' + x[1] + '</b><span>' + x[2] + '</span></div>'; }).join('') + '</div>';
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
    var tc = $('[data-to-cart]');
    if (tc) tc.style.display = !state.ord && (state.picks.length || state.sets.length) ? '' : 'none';
    if (state.ord) {
      $('[data-drawer-list]').innerHTML = '<div class="ktg-dl ktg-dl--calc"><div><b>' + state.ord[0] + '</b><span>' + state.ord[1] + '</span></div><button type="button" data-unord aria-label="Убрать">' + DEL + '</button></div>';
      return;
    }
    var calc = !state.calcOn ? '' : '<div class="ktg-dl ktg-dl--calc"><div><b>Расчёт: ' + calcTitle() + ', ' + state.guests + ' гостей' + (wants.length ? ' + ' + wants.join(', ').toLowerCase() : '') + '</b><span>от ' + $('[data-sum-total]').textContent + '</span></div><button type="button" data-uncalc aria-label="Убрать">' + DEL + '</button></div>';
    // Набор — одной строкой: цена набора и состав (состав уходит менеджеру в заявке); несколько наборов — строка с суммой.
    var sets = state.sets.map(function (k) {
      var st = SETS[k];
      return '<div class="ktg-dl" data-set-id="' + k + '"><img src="' + st.rows[0].i + '" alt=""><div><b>Набор «' + st.name + '» на ' + st.guests + ' гостей</b><span>' + rub(st.p) + '</span>' +
        '<span class="ktg-dl__sub">' + st.rows.map(function (r) { return setName(r.n) + (r.q > 1 ? ' × ' + r.q : ''); }).join(', ') + '</span></div><button type="button" data-unset aria-label="Убрать">' + DEL + '</button></div>';
    }).join('');
    if (state.sets.length > 1) sets += '<div class="ktg-dl ktg-dl--calc"><div><b>Наборы вместе</b><span>' + rub(state.sets.reduce(function (a, k) { return a + SETS[k].p; }, 0)) + '</span></div></div>';
    $('[data-drawer-list]').innerHTML = calc + sets + (state.picks.length ? state.picks.map(function (id) {
      var it = byId[id].it;
      return '<div class="ktg-dl" data-id="' + id + '"><img src="' + it.i + '" alt=""><div><b>' + it.n + '</b><span>' + it.p + '</span></div><button type="button" data-unpick aria-label="Убрать">' + DEL + '</button></div>';
    }).join('') : calc || sets ? '' : '<p class="ktg-empty" style="padding:24px 0">Добавляйте позиции из меню — они появятся здесь.</p>');
  }
  // Позиции подборки и наборов — в корзину сайта тем, что кладёт карточка по умолчанию (_ktg_tocart.php, Маша, Связь т.21 №172–180).
  // Станции — на гостей из калькулятора, если его трогали. Наборы — своими сетами × штук (№224). Расчёт калькулятора не товар — в корзину не идёт.
  function toCart(b) {
    goal('ktg_cart');
    var q = {};
    state.picks.forEach(function (id) { q[id] = (q[id] || 0) + 1; });
    state.sets.forEach(function (k) { SETS[k].rows.forEach(function (r) { q[r.id] = (q[r.id] || 0) + r.q; }); });
    var body = new URLSearchParams();
    body.append('items', Object.keys(q).map(function (id) { return id + ':' + q[id]; }).join(','));
    body.append('guests', state.calcOn ? state.guests : 0);
    b.disabled = true;
    fetch('/_ktg_tocart.php', { method: 'POST', body: body, credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function () { state.picks = []; state.sets = []; savePicks(); location.href = '/cart/'; })
      .catch(function () { b.disabled = false; });
  }
  function renderPicksEverywhere() {
    var n = state.picks.length + state.sets.length, c = $('[data-cart]');
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
    // Расчёт идёт в подборку, только если калькулятор трогали — иначе там висел «Фуршет · Мини» по умолчанию (Антон, №735).
    if (e.target.closest('#calc,[data-fmt]')) state.calcOn = true;
    if (e.target.closest('#calc')) calcUse();
    var t = e.target.closest('button,a,[data-qv-open],[data-qv-photo],[data-add-staff],[data-add-want],[data-add-welcome],[data-of-staff]');
    var dd = $('[data-dd]');
    if (!e.target.closest('[data-dd]')) dd.classList.remove('is-open');
    if (!t) return;
    if (t.matches('a[href$="#calc"],a[href$="#zayavka"],[data-fmt],[data-of-order],[data-open-drawer]'))
      goal('ktg_cta', { place: t.matches('[data-cart]') ? 'cart' : t.matches('[data-fmt]') ? 'formats' : t.closest('.ktg-hero') ? 'hero' : (t.closest('section') || {}).id || '' });
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
    if (t.matches('[data-sl-go]')) { var tr = $('[data-sl]', t.parentNode); tr.scrollBy({ left: +t.dataset.slGo * tr.clientWidth, behavior: 'smooth' }); return; }
    if (t.matches('[data-of-o]')) { ofs.o = +t.dataset.ofO; renderGrid(); return; }
    if (t.matches('[data-of-g]')) { ofs.g[OFFERS[ofs.o].key] = +t.dataset.ofG; renderGrid(); return; }
    if (t.matches('[data-of-staff]')) { ofs.staff = !ofs.staff; renderGrid(); return; }
    if (t.matches('[data-of-all]')) { ofs.open[t.dataset.ofAll] = !ofs.open[t.dataset.ofAll]; renderGrid(); return; }
    if (t.matches('[data-of-build]')) { var first = $('.ktg-item'); if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (t.matches('[data-of-order]')) {
      var oo = OFFERS[ofs.o], ot = oo.tiers[+t.dataset.ofOrder], og = ofs.g[oo.key], st = oo.staff && ofs.staff ? offerStaff(og) : 0, osum = offerTotal(oo, ot, og) + st * WAITER;
      state.ord = [(oo.tiers.length > 1 ? oo.name + ' «' + ot.name + '»' : oo.name) + ', ' + og + ' ' + plural(og, 'гость', 'гостя', 'гостей') + (st ? ' + официанты: ' + st : '') + ' · ' + ot.out + ' на гостя',
        rub(osum) + ' · доставку посчитаем в корзине'];
      renderDrawer(); open($('[data-drawer]')); return;
    }
    if (t.matches('[data-set-pick]')) { toggleSet(+t.closest('[data-set]').dataset.set); return; }
    if (t.matches('[data-set-more]')) { var sc = t.closest('.ktg-set'); sc.classList.toggle('is-full'); t.textContent = sc.classList.contains('is-full') ? 'Свернуть' : 'Ещё ' + (SETS[+sc.dataset.set].rows.length - 3); return; }
    if (t.matches('[data-pick]')) { togglePick(+t.closest('[data-id]').dataset.id); return; }
    if (t.matches('[data-qv-open]')) { openQv(+t.closest('[data-id]').dataset.id); return; }
    if (t.matches('[data-st-g]')) { stq.g = +t.dataset.stG; renderStation(); return; }
    if (t.matches('[data-st-v]')) { stq.v = +t.dataset.stV; renderStation(); return; }
    if (t.matches('[data-qv-photo]') && matchMedia('(min-width:768px)').matches) {  // мозаика: плитка меняется местами с главным фото
      var main = $('[data-qv-img]'), was = main.src; main.src = t.dataset.qvPhoto; t.src = t.dataset.qvPhoto = was; return;
    }
    if (t.matches('[data-qv-photo]')) { $('[data-qv-img]').src = t.dataset.qvPhoto; $$('[data-qv-photo]').forEach(function (x) { x.classList.toggle('is-on', x === t); }); return; }
    if (t.matches('[data-qv-pick]')) { togglePick(+$('[data-qv]').dataset.id); return; }
    if (t.matches('[data-qv-prev]') && qvIndex > 0) { openQv(state.list[qvIndex - 1].id); return; }
    if (t.matches('[data-qv-next]') && qvIndex < state.list.length - 1) { openQv(state.list[qvIndex + 1].id); return; }
    if (t.matches('[data-unord]')) { state.ord = null; renderDrawer(); return; }
    if (t.matches('[data-uncalc]')) { state.calcOn = false; renderDrawer(); return; }
    if (t.matches('[data-unset]')) { toggleSet(+t.closest('[data-set-id]').dataset.setId); return; }
    if (t.matches('[data-unpick]')) { togglePick(+t.closest('[data-id]').dataset.id); return; }
    if (t.matches('[data-to-cart]')) { toCart(t); return; }
    if (t.matches('[data-open-drawer]')) { state.ord = null; renderDrawer(); open($('[data-drawer]')); return; }
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
    if (e.target.matches('[data-of-in]')) { var ov = parseInt(e.target.value.replace(/\D/g, ''), 10); if (ov) { ofs.g[OFFERS[ofs.o].key] = Math.max(10, ov); renderGrid(); } return; }
    if (!e.target.matches('[data-st-in]') || !stq) return;
    var v = parseInt(e.target.value.replace(/\D/g, ''), 10);
    if (v) { stq.g = Math.max(stq.it.min || STATION_MIN, v); renderStation(); }
  });
  root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('[data-st-in],[data-of-in]')) e.target.blur(); });
  $('#calc').addEventListener('input', function () { state.calcOn = true; calcUse(); });
  $('[data-guests]').addEventListener('change', function () { setGuests(this.value); });
  $('[data-guests-range]').addEventListener('input', function () { setGuests(this.value); });
  var qt;
  $('[data-search]').addEventListener('input', function () {
    var v = this.value.trim(); clearTimeout(qt);
    qt = setTimeout(function () { state.q = v; state.limit = 12; renderGroups(); renderGrid(); }, 150);
  });
  // Заявки — на /_order.php, как у всех лендингов А+: name2 — ловушка для ботов, всегда пустой; расчёт и подборка — строками в text.
  var digits = function (s) { return (s || '').replace(/\D/g, ''); };
  function fmtPhone(d) {
    if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    return '+7' + (d.length > 1 ? ' (' + d.slice(1, 4) : '') + (d.length > 4 ? ') ' + d.slice(4, 7) : '') + (d.length > 7 ? '-' + d.slice(7, 9) : '') + (d.length > 9 ? '-' + d.slice(9, 11) : '');
  }
  function leadText(f) {
    var rows = $$('[data-drawer-list] .ktg-dl').map(function (r) { return [].map.call(r.querySelectorAll('b,span'), function (x) { return x.textContent.trim(); }).join(' - '); });
    var extra = $$('.ktg-field', f).slice(2).map(function (x) { return x.value.trim(); }).filter(Boolean);
    return rows.concat(extra).join('\n').replace(/₽/g, 'руб.').replace(/["'<>«»]/g, '');
  }
  $$('[data-form]').forEach(function (f) {
    var ph = $('input[type="tel"]', f);
    ph.addEventListener('focus', function () { if (!ph.value) ph.value = '+7 '; });
    ph.addEventListener('blur', function () { if (digits(ph.value).length <= 1) ph.value = ''; });
    ph.addEventListener('input', function () { ph.value = fmtPhone(digits(ph.value)); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (digits(ph.value).length !== 11) { ph.setCustomValidity('Нужно 11 цифр'); ph.reportValidity(); ph.setCustomValidity(''); return; }
      var text = leadText(f), subject = f.closest('[data-drawer]') ? 'Кейтеринг: подборка с лендинга' : f.closest('[data-atr]') ? 'Кейтеринг: дата в Атриуме с лендинга' : 'Кейтеринг: заявка с лендинга';
      var body = { tip: 'phone', name: $('input[type="text"]', f).value.trim(), name2: '', subject: subject, phone: ph.value, text: text, fav: 0 };
      fetch('/_order.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, credentials: 'same-origin',
        body: Object.keys(body).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(body[k]); }).join('&') }).catch(function () {});
      f.classList.add('is-sent');
      goal('ktg_lead', { form: f.closest('[data-drawer]') ? 'drawer' : f.closest('[data-atr]') ? 'atrium' : 'zayavka' });
      try { if (window.Comagic && Comagic.addOfflineRequest) Comagic.addOfflineRequest({ name: body.name, email: '', phone: body.phone, message: subject + '. ' + text.replace(/\n/g, ' ') }); } catch (er) {}
    });
  });

  // «Атриум»: месяц — в data-month секции, занятые дни — из брони в Tony (ручка вызовчата, docs/JARVIS-SYNC.md там):
  // busy — занято, reserve — предварительно занято, выбрать можно. Ручка не ответила — дни из data-busy.
  var atr = $('[data-atr]');
  if (atr) {
    var am = atr.dataset.month.split('-'), ay = +am[0], amo = +am[1] - 1;
    var busy = atr.dataset.busy.split(',').map(function (s) { return +s; }), reserve = [];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var drawAtr = function () {
      var html = new Array((new Date(ay, amo, 1).getDay() + 6) % 7 + 1).join('<span></span>'), free = 0;
      for (var d = 1, n = new Date(ay, amo + 1, 0).getDate(); d <= n; d++) {
        var dt = new Date(ay, amo, d), off = dt < today || busy.indexOf(d) > -1, wd = dt.getDay();
        if (!off && reserve.indexOf(d) < 0) free++;
        html += '<button type="button" class="ktg-atr__d' + (wd === 0 || wd === 6 ? ' is-wk' : '') + (busy.indexOf(d) > -1 ? ' is-busy' : dt < today ? ' is-past' : reserve.indexOf(d) > -1 ? ' is-res' : '') + '" data-d="' + d + '"' + (off ? ' disabled' : '') + '>' + d + '</button>';
      }
      $('[data-atr-days]', atr).innerHTML = html;
      $('[data-atr-free]', atr).textContent = 'свободно ' + free + ' из ' + n;
    };
    var atrDone = false, atrDraw = function () { if (!atrDone) { atrDone = true; drawAtr(); } };
    setTimeout(atrDraw, 4000);
    fetch('https://vyzovchat.ru/api/public/atrium?month=' + atr.dataset.month)
      .then(function (r) { if (!r.ok) throw r; return r.json(); })
      .then(function (j) { if (!atrDone) { busy = j.busy; reserve = j.reserve; } })
      .catch(function () {})
      .then(atrDraw);
    var mn = new Date(ay, amo, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(' г.', '');
    $('[data-atr-month]', atr).textContent = mn.charAt(0).toUpperCase() + mn.slice(1);
    $('[data-atr-days]', atr).addEventListener('click', function (e) {
      var b = e.target.closest('[data-d]');
      if (!b || b.disabled) return;
      $$('.ktg-atr__d.is-on', atr).forEach(function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on');
      var label = new Date(ay, amo, +b.dataset.d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
      $('[data-atr-pick]', atr).innerHTML = '<b>' + label + '</b> — ' + (b.classList.contains('is-res') ? 'предварительно занято, менеджер уточнит' : 'свободно');
      $('[data-atr-val]', atr).value = 'Атриум: ' + label;
    });
  }

  renderFormats(); setGuests(50); renderGroups(); renderGrid(); renderPicksEverywhere();
})();
