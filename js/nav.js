/**
 * Menú hamburguesa para modo móvil.
 */
(function () {
  function init() {
    var toggle = document.querySelector('.menu-toggle');
    var menu = document.querySelector('.menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', function () {
      var isOpen = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('.menu-link')) {
        document.body.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
