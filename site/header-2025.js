// Строка «Горячее» (вторая строка шапки): тикер событий с обратным отсчётом, лента популярного
// и схлопывание в пилюлю при прокрутке. Разметку отдаёт {{HeaderSalesLinks}}; нет строки — выходим.
(function () {
    function initHotLine() {
        var hot = document.querySelector('.header__hot');
        if (!hot) return;

        var header = hot.closest('.header');
        var mini = header ? header.querySelector('.hot-mini') : null;

        // --- тикер событий: автосмена, пауза под курсором, кликабельные точки ---
        var stage = hot.querySelector('.hot-line__stage');
        if (stage) {
            var slides = hot.querySelectorAll('.hot-line__slide');
            var dots = hot.querySelectorAll('.hot-line__dots button');
            var cur = 0, hold = false, timer;

            var go = function (i) {
                if (i === cur || !slides[i]) return;
                var prev = cur;
                slides[prev].classList.remove('is-on');
                slides[prev].classList.add('is-out');
                if (dots[prev]) dots[prev].classList.remove('is-on');
                cur = i;
                slides[cur].classList.remove('is-out');
                slides[cur].classList.add('is-on');
                if (dots[cur]) dots[cur].classList.add('is-on');
                setTimeout(function () { slides[prev].classList.remove('is-out'); }, 500);
            };

            var run = function () {
                clearInterval(timer);
                if (slides.length < 2) return;
                timer = setInterval(function () {
                    if (!hold) go((cur + 1) % slides.length);
                }, 3800);
            };

            stage.addEventListener('mouseenter', function () { hold = true; });
            stage.addEventListener('mouseleave', function () { hold = false; });
            Array.prototype.forEach.call(dots, function (dot, i) {
                dot.addEventListener('click', function () { go(i); run(); });
            });
            run();
        }

        // --- лента популярного: перетаскивание левой кнопкой + затухание, когда не помещается ---
        var flow = hot.querySelector('.hot-line__flow');
        if (flow) {
            var pid = null, x0 = 0, s0 = 0, moved = false;

            var stopDrag = function () {
                if (pid === null) return;
                try { flow.releasePointerCapture(pid); } catch (e) { }
                pid = null;
                flow.classList.remove('is-drag');
            };

            flow.addEventListener('pointerdown', function (e) {
                if (e.pointerType !== 'mouse' || e.button !== 0) return;
                pid = e.pointerId;
                x0 = e.clientX;
                s0 = flow.scrollLeft;
                moved = false;
            });
            flow.addEventListener('pointermove', function (e) {
                if (pid === null || e.pointerId !== pid) return;
                var dx = e.clientX - x0;
                if (!moved) {
                    if (Math.abs(dx) < 4) return;
                    // Захват берём только когда реально потянули: при захвате с самого
                    // нажатия click улетает в контейнер вместо ссылки и переход не работает.
                    moved = true;
                    flow.setPointerCapture(pid);
                    flow.classList.add('is-drag');
                }
                e.preventDefault();
                flow.scrollLeft = s0 - dx;
            });
            flow.addEventListener('pointerup', stopDrag);
            flow.addEventListener('pointercancel', stopDrag);
            flow.addEventListener('lostpointercapture', stopDrag);
            flow.addEventListener('dragstart', function (e) { e.preventDefault(); });
            // После протяжки клик гасим — иначе отпускание над ссылкой уводит со страницы.
            flow.addEventListener('click', function (e) {
                if (moved) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);

            // Затухание справа — только пока справа что-то осталось: домотали до конца,
            // и последний пункт читается целиком.
            var fade = function () {
                flow.classList.toggle('is-over', flow.scrollWidth - flow.clientWidth - flow.scrollLeft > 2);
            };
            flow.addEventListener('scroll', fade);
            window.addEventListener('resize', fade);
            fade();

            // Подкрутка у краёв: мышь в 64px от края — лента едет сама, тем быстрее,
            // чем ближе к краю. Молчит во время перетаскивания и на тач-вводе.
            var EDGE = 64, SPEED = 11, vel = 0, raf = null;

            var step = function () {
                raf = null;
                if (!vel || pid !== null) return;
                var was = flow.scrollLeft;
                flow.scrollLeft = was + vel;
                if (flow.scrollLeft === was) return;
                raf = requestAnimationFrame(step);
            };

            var aim = function (e) {
                if (e.pointerType !== 'mouse' || pid !== null) { vel = 0; return; }
                var r = flow.getBoundingClientRect();
                var toLeft = e.clientX - r.left, toRight = r.right - e.clientX;
                if (toLeft < EDGE) vel = -SPEED * (1 - toLeft / EDGE);
                else if (toRight < EDGE) vel = SPEED * (1 - toRight / EDGE);
                else vel = 0;
                if (vel && raf === null) raf = requestAnimationFrame(step);
            };

            flow.addEventListener('pointermove', aim);
            flow.addEventListener('pointerup', aim);
            flow.addEventListener('pointerleave', function () { vel = 0; });
        }

        // --- схлопывание: вниз — строка сворачивается в пилюлю, ховер по пилюле раскрывает
        //     обратно и держит до следующей прокрутки ---
        if (mini) {
            var lastY = window.pageYOffset || document.documentElement.scrollTop;
            var sync = function () {
                var y = window.pageYOffset || document.documentElement.scrollTop;
                // Вверху страницы строка всегда раскрыта; дальше прячем при движении вниз
                // и возвращаем при движении вверх, а не только у самого верха.
                if (y <= 60) header.classList.remove('is-hot-mini');
                else if (y > lastY + 4) header.classList.add('is-hot-mini');
                else if (y < lastY - 4) header.classList.remove('is-hot-mini');
                lastY = y;
            };
            var peek = function () { header.classList.remove('is-hot-mini'); };

            window.addEventListener('scroll', sync, { passive: true });
            mini.addEventListener('mouseenter', peek);
            mini.addEventListener('click', peek);
            sync();
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHotLine);
    else initHotLine();
})();

const headerBurger = document.querySelector('.header__menu-btn');
const menuDesk = document.querySelector('.menu');

// С шапкой 2026 (hdr26) старого мега-меню на странице нет: .menu и кнопка «Каталог»
// выкинуты из шаблона, а .header__menu-btn остаётся только у мобильной панели.
// Без этой проверки строка ниже валится на null и убивает всё, что дальше по файлу,
// включая мобильное меню.
if (headerBurger && menuDesk) {

// Сброс состояния мега-меню при закрытии: снимаем .show с панелей lvl2/3/4 и баннеров,
// .tab-active с табов. Иначе панели остаются «показанными»: у закрытого .menu opacity:0
// (визуально пусто), но .links.show форсит visibility:visible → ссылки невидимы, но
// КЛИКАБЕЛЬНЫ (фантомные пункты 2-3 ур.). Заодно не всплывает «залипшая» панель при повторном открытии.
function resetMegaMenu() {
    menuDesk.querySelectorAll('.links.show, .menu__banner.show').forEach(function (el) { el.classList.remove('show'); });
    menuDesk.querySelectorAll('.tab-active').forEach(function (el) { el.classList.remove('tab-active'); });
}

headerBurger.addEventListener('click', event => {
    menuDesk.classList.toggle('show');
    headerBurger.classList.toggle('active');
    if (!menuDesk.classList.contains('show')) resetMegaMenu();

    // if (headerBurger.classList.contains('active')) {
    //     headerBurger.innerHTML = `
    //         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
    //           <path d="M1 1Lx 11M11 1L1 11" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    //         </svg>
    //         <span>Каталог</span>
    //     `;
    // } else {
    //     headerBurger.innerHTML = `
    //         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    //             <path d="M3.3335 5H16.6668M3.3335 10H16.6668M3.3335 15H16.6668" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    //         </svg>
    //         <span>Каталог</span>
    //     `;
    // }
})

menuDesk.addEventListener('click', event => {
    if (event.target.classList.contains('show')) {
        menuDesk.classList.toggle('show');
        headerBurger.classList.toggle('active');
        headerBurger.innerHTML = `
            <svg class="active-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M1 1L11 11M11 1L1 11" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <svg class="default-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M3.3335 5H16.6668M3.3335 10H16.6668M3.3335 15H16.6668" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>Каталог</span>
        `;
        resetMegaMenu();
    }
});
}



const tabsLvl1 = document.querySelectorAll('.tab-lvl1');

tabsLvl1.forEach(tab => {
    tab.addEventListener('mouseover', event => {
        //убираю активное состояние у другого таба
        if (document.querySelector('.tab-lvl1.tab-active')) {
            document.querySelector('.tab-lvl1.tab-active').classList.remove('tab-active');
        }
        //добавляю активное состояние текущему (на который навели)
        tab.classList.add('tab-active');

        //извлекаю id из дата атрибута таба
        const id = tab.dataset.content;

        if (document.querySelector('.links-lvl2.show')) {
            document.querySelector('.links-lvl2.show').classList.remove('show');
        }
        if (document.querySelector('.links-lvl3.show')) {
            document.querySelector('.links-lvl3.show').classList.remove('show');
        }
        if (document.querySelector('.links-lvl4.show')) {
            document.querySelector('.links-lvl4.show').classList.remove('show');
        }

        if (id && document.getElementById(id)) document.getElementById(id).classList.add('show');

        document.querySelectorAll('.menu__banner.show').forEach(function (banner) { banner.classList.remove('show'); });
        //
        if (document.querySelector(`[data-banner="${id}"]`)) {
            document.querySelectorAll(`[data-banner="${id}"]`).forEach(banner => {
                banner.classList.add('show');
            })
        }
    });
});




const tabsLvl2 = document.querySelectorAll('.tab-lvl2');

tabsLvl2.forEach(tab => {
    tab.addEventListener('mouseover', event => {
        //убираю активное состояние у другого таба
        if (document.querySelector('.tab-lvl2.tab-active')) {
            document.querySelector('.tab-lvl2.tab-active').classList.remove('tab-active');
        }
        //добавляю активное состояние текущему (на который навели)
        tab.classList.add('tab-active');

        //извлекаю id из дата атрибута таба
        const id = tab.dataset.content;

        if (document.querySelector('.links-lvl3.show')) {
            document.querySelector('.links-lvl3.show').classList.remove('show');
        }
        if (document.querySelector('.links-lvl4.show')) {
            document.querySelector('.links-lvl4.show').classList.remove('show');
        }

        if (id && document.getElementById(id)) document.getElementById(id).classList.add('show');

        document.querySelectorAll('.menu__banner.show').forEach(function (banner) { banner.classList.remove('show'); });
        // Баннеры lvl1 остаются висеть на 2-м уровне: прячем их ТОЛЬКО когда реально
        // открылся 3-й уровень (lvl3-панель у наведённого пункта). Для пунктов lvl2 без
        // детей возвращаем баннер активной категории lvl1 (data-banner = её data-content).
        if (!(id && document.getElementById(id))) {
            const active1 = document.querySelector('.tab-lvl1.tab-active');
            const b1 = active1 && active1.dataset.content;
            if (b1) document.querySelectorAll(`[data-banner="${b1}"]`).forEach(function (banner) { banner.classList.add('show'); });
        }
    });
});



const tabsLvl3 = document.querySelectorAll('.tab-lvl3');

tabsLvl3.forEach(tab => {
    tab.addEventListener('mouseover', event => {
        //убираю активное состояние у другого таба
        if (document.querySelector('.tab-lvl3.tab-active')) {
            document.querySelector('.tab-lvl3.tab-active').classList.remove('tab-active');
        }
        //добавляю активное состояние текущему (на который навели)
        tab.classList.add('tab-active');

        //извлекаю id из дата атрибута таба
        const id = tab.dataset.content;

        if (document.querySelector('.links-lvl4.show')) {
            document.querySelector('.links-lvl4.show').classList.remove('show');
        }

        if (id && document.getElementById(id)) document.getElementById(id).classList.add('show');

        document.querySelectorAll('.menu__banner.show').forEach(function (banner) { banner.classList.remove('show'); });
        //
        if (document.querySelector(`[data-banner="${id}"]`)) {
            document.querySelector(`[data-banner="${id}"]`).classList.add('show');
        }
    });
});


//выпадкашка с контактами
const dropHead = document.querySelector('.header__drop-head');
const dropContent = document.querySelector('.header__drop-content');

if (dropHead && dropContent) {
    dropHead.addEventListener('click', event => {
        dropHead.classList.toggle('show');
        dropContent.classList.toggle('show');
    })
}


const headerLogo = document.querySelector('.header__logo');
const headerMenuBtn = document.querySelector('.header__menu-btn');
const inputWrapper = document.querySelector('.header__input-wrapper');
const searchParentBox = document.querySelector('.main-box');
const firstWindowSearch = document.querySelector('.search-popup-popular');

//мобильные элементы-----
const searchMobile = document.querySelector('.search-mobile');
const searchBtnMobile = document.querySelector('.header-box-mobile .header__input-box');

window.addEventListener('click', event => {
    // Раздвижка десктопного поиска относится к старой шапке (.main-box). В hdr26 поле
    // и так во всю ширину, узлов этих нет — блок просто не выполняется.
    if (window.innerWidth > 1024 && searchParentBox && headerLogo && inputWrapper) {
        // Десктоп-поиск: полный интерфейс (всплывающая строка + затемнение + попап) рисует виджет
        // search-api.ru сам. Мы только ВЫЗЫВАЕМ его — фокус на его data-open-search инпут (по клику
        // на иконку строки поиска). Свою раздвижку/попап/затемнение НЕ показываем.
        if (event.target.closest('.header__input-wrapper')
            && !event.target.closest('[data-open-search]')) {
            searchParentBox.querySelector('input').focus();
        }
        if (false) {
            headerLogo.style.display = 'none';
            headerMenuBtn.style.display = 'none';

            inputWrapper.style.minWidth = '426px';
            inputWrapper.style.maxWidth = '426px';

            searchParentBox.classList.add('active');
            firstWindowSearch.classList.add('show');

            menuDesk.classList.remove('show');

            headerBurger.classList.remove('active');
            headerBurger.innerHTML = `
                <svg class="active-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M1 1L11 11M11 1L1 11" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <svg class="default-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M3.3335 5H16.6668M3.3335 10H16.6668M3.3335 15H16.6668" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>Каталог</span>
            `;

            searchParentBox.querySelector('input').focus();
        }


        if (
            !event.target.closest('.header__input-wrapper') &&
            !event.target.closest('.search-popup-popular__inner') &&
            !event.target.closest('.search__inner')
        ) {
            headerLogo.style.display = 'flex';
            headerMenuBtn.style.display = 'flex';

            inputWrapper.style.minWidth = '52px';
            inputWrapper.style.maxWidth = '52px';

            searchParentBox.classList.remove('active');
            firstWindowSearch.classList.remove('show');
        }

        if (event.target.closest('.search-clear')) {
            searchInput.value = '';
            document.querySelector('.search-clear').style.display = 'none';
        }
    }
    if (window.innerWidth <= 1024) {
        // Моб. поиск: полный интерфейс рисует виджет search-api.ru (по data-open-search на кнопке).
        // Свой редизайн-попап .search-mobile НЕ открываем — кнопка только вызывает виджет.
        if (false && event.target.closest('.header__input-box')) {
            searchMobile.classList.toggle('show');
            searchBtnMobile.classList.toggle('active');

            mobileMenu.classList.remove('show');
            mobileBurger.classList.remove('active');

            mobileBurger.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3.3335 5H16.6668M3.3335 10H16.6668M3.3335 15H16.6668" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Каталог</span>
            `;

            if (searchBtnMobile.classList.contains('active')) {
                searchBtnMobile.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="12" viewBox="0 0 13 12" fill="none">
                        <path d="M1.5 1L11.5 11M11.5 1L1.5 11" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>Поиск</span
                `;
            } else {
                searchBtnMobile.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M12.8938 12.8676L16.5 16.5M14.8333 8.16667C14.8333 11.8486 11.8486 14.8333 8.16667 14.8333C4.48477 14.8333 1.5 11.8486 1.5 8.16667C1.5 4.48477 4.48477 1.5 8.16667 1.5C11.8486 1.5 14.8333 4.48477 14.8333 8.16667Z" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>   
                    <span>Поиск</span
                `;
            }
        }

        if (event.target.classList.contains('search-mobile')) {
            searchMobile.classList.remove('show');
            searchBtnMobile.classList.remove('active');
            searchBtnMobile.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M12.8938 12.8676L16.5 16.5M14.8333 8.16667C14.8333 11.8486 11.8486 14.8333 8.16667 14.8333C4.48477 14.8333 1.5 11.8486 1.5 8.16667C1.5 4.48477 4.48477 1.5 8.16667 1.5C11.8486 1.5 14.8333 4.48477 14.8333 8.16667Z" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>   
                    <span>Поиск</span
                `;
        }
    }

    if (dropContent && !event.target.closest('.contacts-box')) {
        dropContent.classList.remove('show');
    }
})


const searchInput = document.querySelector('.search-input');
const searchFirstScreen = document.querySelector('.search-popup-popular');
const searchMainScreen = document.querySelector('.search');

// Поле поиска в hdr26 то же самое (id и классы сохранены), но проверка нужна:
// на страницах без строки поиска null валит остаток файла.
if (searchInput) searchInput.addEventListener('input', event => {
    // Свой поиск-попап отключён — интерфейс/результаты рисует виджет search-api.ru.
    // (Также без этого падало на .main-box.active .header__btn-search, т.к. .active не ставится.)
    return;
    if (searchInput.value.length > 0) {
        searchFirstScreen.classList.remove('show');
        searchMainScreen.classList.add('show');
        searchParentBox.classList.add('searching');

        document.querySelector('.search-clear').style.display = 'flex';
        document.querySelector('.main-box.active .header__btn-search').style.display = 'flex';
    } else {
        searchMainScreen.classList.remove('show');
        searchParentBox.classList.remove('searching');
        searchParentBox.classList.remove('active');
        headerLogo.style.display = 'flex';
        headerMenuBtn.style.display = 'flex';

        inputWrapper.style.minWidth = '113px';
        inputWrapper.style.maxWidth = '113px';

        document.querySelector('.search-clear').style.display = 'none';
        document.querySelector('.header__btn-search').style.display = 'none';
    }
})

window.addEventListener('click', event => {
    if (event.target.classList.contains('search') && searchMainScreen && searchParentBox) {
        searchMainScreen.classList.remove('show');
        searchParentBox.classList.remove('searching');
        searchInput.value = '';
        document.querySelector('.search-clear').style.display = 'none';
        document.querySelector('.header__btn-search').style.display = 'none';
    }

    if (event.target.closest('.search-mobile-clear')) {
        mobileSearchInput.value = '';
        document.querySelector('.search-mobile-clear').style.display = 'none';
    }
})

//
const mobileSearchInput = document.querySelector('.search-mobile-input');
const searchMobilePopular = document.querySelector('.search-mobile__popular');
const searchResultMobile = document.querySelector('.search-mobile__results');

mobileSearchInput.addEventListener('input', event => {
    if (mobileSearchInput.value.length > 0) {
        searchMobilePopular.style.display = 'none';
        searchResultMobile.style.display = 'block';

        document.querySelector('.search-mobile-clear').style.display = 'flex';
    } else {
        searchMobilePopular.style.display = 'block';
        searchResultMobile.style.display = 'none';
        document.querySelector('.search-mobile-clear').style.display = 'none';
    }
});



const mobileMenu = document.querySelector('.mobile-menu');
const mobileBurger = document.querySelector('.mobile-burger');

mobileMenu.addEventListener('click', event => {
    if (event.target.closest('.mobile-menu__close')) {
        mobileMenu.classList.remove('show');
        mobileBurger.classList.remove('active');
        document.body.classList.remove('mobile-menu-open');
        return;
    }

    if (event.target.closest('[data-tab]')) {
        const id = event.target.closest('[data-tab]').dataset.tab;
        console.log(id)

        if (document.querySelector('.mobile-frame-show')) {
            document.querySelector('.mobile-frame-show').classList.remove('mobile-frame-show');
        }

        document.getElementById(id).classList.add('mobile-frame-show');
    }
});

mobileBurger.addEventListener('click', event => {
    mobileMenu.classList.toggle('show');
    mobileBurger.classList.toggle('active');
    document.body.classList.toggle('mobile-menu-open', mobileMenu.classList.contains('show'));


    searchMobile.classList.remove('show');
    searchBtnMobile.classList.remove('active');
    searchBtnMobile.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M12.8938 12.8676L16.5 16.5M14.8333 8.16667C14.8333 11.8486 11.8486 14.8333 8.16667 14.8333C4.48477 14.8333 1.5 11.8486 1.5 8.16667C1.5 4.48477 4.48477 1.5 8.16667 1.5C11.8486 1.5 14.8333 4.48477 14.8333 8.16667Z" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>Поиск</span
                `;


    // if (mobileBurger.classList.contains('active')) {
    //     mobileBurger.innerHTML = `
    //         <svg xmlns="http://www.w3.org/2000/svg" width="13" height="12" viewBox="0 0 13 12" fill="none">
    //             <path d="M1.5 1L11.5 11M11.5 1L1.5 11" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    //         </svg>
    //          <span>Каталог</span>
    //     `;


    // } else {
    //     mobileBurger.innerHTML = `
    //         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    //             <path d="M3.3335 5H16.6668M3.3335 10H16.6668M3.3335 15H16.6668" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    //         </svg>
    //         <span>Каталог</span>
    //     `;
    // }
});



// Проверяем, является ли браузер Safari
function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

// Проверяем, является ли браузер Safari
function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

// Если Safari, добавляем функциональность
if (window.innerWidth <= 768) {
    const header = document.querySelector('header'); // или используйте нужный селектор
    const footer = document.querySelector('.header-box-mobile'); // или используйте нужный селектор

    // Добавляем начальные стили для header
    header.style.position = 'fixed';
    header.style.top = '20px';
    header.style.transition = 'top 0.3s ease';

    // Добавляем начальные стили для footer
    footer.style.position = 'fixed';
    footer.style.bottom = '10px';
    footer.style.transition = 'bottom 0.3s ease';

    // Слушаем событие скролла
    window.addEventListener('scroll', function () {
        const scrollPosition = window.scrollY || window.pageYOffset;

        // Вычисляем новое значение top для header (от 20px до 10px)
        const maxScroll = 100; // максимальное значение скролла для полного перехода
        const topValue = Math.max(10, 20 - (scrollPosition / maxScroll) * 10);
        header.style.top = topValue + 'px';

        // Вычисляем новое значение bottom для footer (от 32px до 0px)
        const bottomValue = Math.max(10, 10 - (scrollPosition / maxScroll) * 32);
        footer.style.bottom = bottomValue + 'px';
    });
}

const footer = document.querySelector('.footer');

footer.addEventListener('click', event => {
    if (event.target.closest('.footer .title')) {
        const parent = event.target.closest('.column');
        const content = parent.querySelector('.f-drop-content');
        parent.classList.toggle('show');

        if (parent.classList.contains('show')) {
            content.style.height = content.scrollHeight + 'px';
        } else {
            content.style.height = '0px';
        }
    }
});


/* ---- Кнопка «Написать на почту» в контактах шапки: клик копирует адрес в буфер
   и показывает тост (вместо открытия почтового клиента). Делегирование — работает
   и на десктопе, и на мобилке; разметка mailto уже есть в шаблоне 35. ---- */
(function () {
    var toastEl = null, toastTimer = null;
    function showHdrToast(message) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'hdr-toast';
            toastEl.setAttribute('role', 'alert');
            toastEl.innerHTML =
                '<span class="hdr-toast__icon" aria-hidden="true">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">' +
                        '<circle cx="12" cy="12" r="9" stroke="#FE5D26" stroke-width="1.8"/>' +
                        '<path d="M8.4 12.3l2.4 2.4 4.8-5.2" stroke="#FE5D26" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
                    '</svg>' +
                '</span><span class="hdr-toast__text"></span>';
            document.body.appendChild(toastEl);
        }
        toastEl.querySelector('.hdr-toast__text').textContent = message;
        toastEl.classList.remove('hdr-toast--show');
        void toastEl.offsetWidth; // рефлоу — перезапуск анимации при повторном клике
        toastEl.classList.add('hdr-toast--show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('hdr-toast--show'); }, 3000);
    }
    function copyText(text, done) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(fallback);
        } else { fallback(); }
        function fallback() {
            var ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.top = '-9999px';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); done(); } catch (err) {}
            document.body.removeChild(ta);
        }
    }
    document.addEventListener('click', function (e) {
        var link = e.target.closest('.header a[href^="mailto:"]');
        if (!link) return;
        e.preventDefault();
        var email = link.getAttribute('href').replace(/^mailto:/i, '').split('?')[0].trim();
        if (!email) return;
        copyText(email, function () { showHdrToast('Почта скопирована: ' + email); });
    });
})();


/* ---- Цели Яндекс.Метрики редизайн-шапки (2026) ----
   Поиск + два залоченных пункта .menu__list («44-ФЗ», «О нас»), чья разметка
   захардкожена в шаблоне 35 и потому не читает поле pages.MetrikaGoal. Остальные
   пункты меню (служебные страницы, каталог) навешивают цели через includes/_menu.php.
   Чтобы поменять цель для tendery/o-nas — правь этот файл (в шаблоне 35 их нет data-goal). */
(function () {
    // Номер счётчика зависит от окружения: осн. домен = 24366505, зеркало/дев = 57135208
    // (index.php при isMirror() делает str_replace по HTML). Статический JS этой подмене НЕ
    // подвергается, поэтому берём номер из реальной инициализации счётчика на странице
    // (инлайн-скрипт ym(NNNN,"init",...) — там он уже правильный для окружения) и зовём ym.
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
    function fireGoal(goal) {
        if (window.ym) ym(ymCounterId(), 'reachGoal', goal);
    }
    // Слушаем в фазе ПЕРЕХВАТА (true): виджет поиска search-api.ru на проде перехватывает
    // клик по строке поиска и гасит всплытие → обычный bubble-листенер цель не ловил.
    // Перехват срабатывает раньше виджета. Поиск матчим по всей строке .header__input-wrapper
    // (инпут + «Найти» + мобильная строка), а не только по конкретному инпуту — виджет может
    // подменять внутренние элементы.
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.header')) return;
        var goal = null;
        if (e.target.closest('.header__input-wrapper, [data-open-search]')) goal = 'design-2026-header-search';
        else if (e.target.closest('a[href="/tendery/"]')) goal = 'design-2026-menu-tenders';
        else if (e.target.closest('a[href="/o-nas/"]')) goal = 'design-2026-menu-about';
        if (goal) fireGoal(goal);
    }, true);
})();
