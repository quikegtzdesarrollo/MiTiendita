/**
 * Navegación: muestra/oculta secciones según el menú y el hash.
 * Toda la estructura está en index.html.
 */
(function () {
  var sections = {
    inicio: document.getElementById('section-inicio'),
    club: document.getElementById('section-club'),
    folios: document.getElementById('section-folios'),
    reparticion: document.getElementById('section-reparticion'),
    staff: document.getElementById('section-staff'),
    venta: document.getElementById('section-venta')
  };

  function showSection(id) {
    var key;
    for (key in sections) {
      if (sections.hasOwnProperty(key)) {
        sections[key].classList.remove('active');
      }
    }
    if (sections[id]) {
      sections[id].classList.add('active');
    }
    document.querySelectorAll('.menu-link').forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('data-section') === id);
    });
    window.location.hash = id;
  }

  function onMenuClick(e) {
    var link = e.target.closest('.menu-link');
    if (!link) return;
    e.preventDefault();
    var section = link.getAttribute('data-section');
    if (section) showSection(section);
  }

  function onHashChange() {
    var hash = (window.location.hash || '#inicio').slice(1);
    showSection(sections[hash] ? hash : 'inicio');
  }

  document.querySelector('.menu').addEventListener('click', onMenuClick);
  window.addEventListener('hashchange', onHashChange);
  onHashChange();
})();
