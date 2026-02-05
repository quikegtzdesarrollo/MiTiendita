/**
 * Modales: abre/cierra por data-modal-target y data-modal-close.
 */
(function () {
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function init() {
    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-modal-target]');
      if (opener) {
        var target = opener.getAttribute('data-modal-target');
        openModal(document.querySelector(target));
        return;
      }

      var closer = e.target.closest('[data-modal-close]');
      if (closer) {
        closeModal(closer.closest('.modal'));
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var openModalEl = document.querySelector('.modal.open');
      if (openModalEl) closeModal(openModalEl);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.MiTienda = window.MiTienda || {};
  window.MiTienda.modal = {
    open: openModal,
    close: closeModal
  };
})();
