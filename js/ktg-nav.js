/* Нижняя строка шапки на лендинге (как на подсайтах холдинга): бургер с меню сайта + разделы меню кейтеринга.
   Подключается после скриптов шапки (docs/build_pages.py). Разделы переключают меню страницы через событие ktg:go (js/app.js). */
(function () {
  var hdr = document.getElementById('hdr26');
  var row = hdr && hdr.querySelector('.hdr26__n .hdr26__c');
  if (!row || !window.KTG_DATA) return;
  var SHORT = { 'Фуршетное меню': 'Фуршет', 'Питание персонала': 'Персонал' };
  var CV = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

  var navs = [].slice.call(row.querySelectorAll('.hdr26-nv[data-dd]'));
  var svc = row.querySelector('.hdr26-svc');

  var panel = document.createElement('div');
  panel.className = 'ktgnav-panel';
  panel.innerHTML = '<div class="ktgnav-panel__in"><div class="ktgnav-side">' +
    navs.map(function (b) { return '<button type="button" data-ktgnav-sec="' + b.dataset.dd + '">' + b.textContent.trim() + CV + '</button>'; }).join('') +
    '<div class="ktgnav-svc">' + (svc ? svc.innerHTML : '') + '</div></div><div class="ktgnav-pane"></div></div>';
  hdr.appendChild(panel);
  var pane = panel.querySelector('.ktgnav-pane');

  function showSec(id) {
    [].forEach.call(panel.querySelectorAll('[data-ktgnav-sec]'), function (b) { b.classList.toggle('is-on', b.dataset.ktgnavSec === id); });
    var src = hdr.querySelector('.hdr26-dd[data-p="' + id + '"]');
    pane.innerHTML = src ? src.innerHTML : '';
  }

  var burger = document.createElement('button');
  burger.type = 'button';
  burger.className = 'ktgnav-burger';
  burger.setAttribute('aria-label', 'Меню сайта');
  burger.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

  var links = document.createElement('div');
  links.className = 'ktgnav-links';
  links.innerHTML = window.KTG_DATA.map(function (g) { return '<button type="button" data-ktgnav-go="' + g.slug + '">' + (SHORT[g.name] || g.name) + '</button>'; }).join('');

  row.classList.add('ktgnav-row');
  row.insertBefore(links, row.firstChild);
  row.insertBefore(burger, links);

  function toggle(on) {
    panel.classList.toggle('is-open', on);
    burger.classList.toggle('is-on', on);
    if (on) showSec(navs[0] ? navs[0].dataset.dd : '');
  }
  burger.addEventListener('click', function (e) { e.stopPropagation(); toggle(!panel.classList.contains('is-open')); });
  panel.addEventListener('mouseover', function (e) { var b = e.target.closest('[data-ktgnav-sec]'); if (b) showSec(b.dataset.ktgnavSec); });
  panel.addEventListener('click', function (e) { var b = e.target.closest('[data-ktgnav-sec]'); if (b) showSec(b.dataset.ktgnavSec); });
  document.addEventListener('click', function (e) { if (!panel.contains(e.target)) toggle(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });

  links.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ktgnav-go]');
    if (b) document.dispatchEvent(new CustomEvent('ktg:go', { detail: b.dataset.ktgnavGo }));
  });
  document.addEventListener('ktg:group', function (e) {
    [].forEach.call(links.children, function (b) { b.classList.toggle('is-on', b.dataset.ktgnavGo === e.detail); });
  });
  links.firstChild.classList.add('is-on');
})();
