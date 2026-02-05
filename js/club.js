/**
 * Club - Solo lógica. Estructura en index.html.
 * Datos vía MiTienda.supabase.club (Supabase o memoria).
 */
(function () {
  function pintarTabla(tbody, datos) {
    if (!datos || datos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="empty-msg">No hay registros.</td></tr>';
      return;
    }
    tbody.innerHTML = datos.map(function (r) {
      return '<tr><td>' + (r.Nombre || '') + '</td><td>' + (r.created_at || '') + '</td></tr>';
    }).join('');
  }

  function cargarLista() {
    var tbody = document.getElementById('tbody-club');
    if (!tbody) return;
    window.MiTienda.supabase.club.list().then(function (datos) {
      pintarTabla(tbody, datos);
    }).catch(function (err) {
      console.error('Club list:', err);
      pintarTabla(tbody, []);
    });
  }

  function init() {
    var form = document.getElementById('form-club');
    var formMasivo = document.getElementById('form-club-masivo');
    var tbody = document.getElementById('tbody-club');
    var modal = document.getElementById('modal-club');
    if (!form || !tbody) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nombre = document.getElementById('club-nombre').value.trim();
      if (!nombre) return;
      window.MiTienda.supabase.club.insert({ Nombre: nombre }).then(function () {
        form.reset();
        cargarLista();
        if (modal && window.MiTienda.modal) {
          window.MiTienda.modal.close(modal);
        }
      }).catch(function (err) {
        console.error('Club insert:', err);
      });
    });

    if (formMasivo) {
      formMasivo.addEventListener('submit', function (e) {
        e.preventDefault();
        var campo = document.getElementById('club-nombres-masivo');
        var raw = campo ? campo.value : '';
        var nombres = raw.split(',').map(function (n) { return n.trim(); }).filter(Boolean);
        if (nombres.length === 0) return;

        Promise.all(nombres.map(function (n) {
          return window.MiTienda.supabase.club.insert({ Nombre: n });
        })).then(function () {
          if (campo) campo.value = '';
          cargarLista();
          if (modal && window.MiTienda.modal) {
            window.MiTienda.modal.close(modal);
          }
        }).catch(function (err) {
          console.error('Club masivo:', err);
        });
      });
    }

    cargarLista();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
