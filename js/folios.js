/**
 * Folios - Solo lógica. Estructura en index.html.
 * Datos vía MiTienda.supabase.folios (Supabase o memoria).
 */
(function () {
  var siguienteFolio = 1;

  function pintarTabla(tbody, datos) {
    if (!datos || datos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">No hay registros.</td></tr>';
      return;
    }
    tbody.innerHTML = datos.map(function (r) {
      return '<tr><td>' + (r.NumFolio || '') + '</td><td>' + (r.Valor != null ? r.Valor : '') + '</td><td>' + (r.FechaCompra || '') + '</td><td><button class="btn btn-secondary btn-delete" data-id="' + r.idFolio + '">Eliminar</button></td></tr>';
    }).join('');
  }

  function recalcularSiguiente(datos) {
    var max = 0;
    (datos || []).forEach(function (r) {
      var val = parseInt(r.NumFolio, 10);
      if (!isNaN(val) && val > max) {
        max = val;
      }
    });
    siguienteFolio = max + 1;
    if (siguienteFolio < 1) siguienteFolio = 1;
  }

  function cargarLista() {
    var tbody = document.getElementById('tbody-folios');
    if (!tbody) return;
    window.MiTienda.supabase.folios.list().then(function (datos) {
      recalcularSiguiente(datos);
      pintarTabla(tbody, datos);
    }).catch(function (err) {
      console.error('Folios list:', err);
      pintarTabla(tbody, []);
    });
  }

  function init() {
    var form = document.getElementById('form-folios');
    var tbody = document.getElementById('tbody-folios');
    var fechaInput = document.getElementById('folio-fecha');
    var numInput = document.getElementById('folio-num');
    var openBtn = document.querySelector('[data-modal-target="#modal-folios"]');
    var modal = document.getElementById('modal-folios');
    if (!form || !tbody) return;

    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn-delete');
      if (!btn) return;
      var id = parseInt(btn.getAttribute('data-id'), 10);
      if (!id) return;
      if (!window.confirm('¿Eliminar este folio?')) return;
      window.MiTienda.supabase.folios.delete(id).then(function () {
        cargarLista();
      }).catch(function (err) {
        console.error('Folios delete:', err);
      });
    });

    if (fechaInput) {
      fechaInput.value = new Date().toISOString().slice(0, 10);
    }

    if (openBtn && numInput) {
      openBtn.addEventListener('click', function () {
        numInput.value = siguienteFolio;
        if (fechaInput) {
          fechaInput.value = new Date().toISOString().slice(0, 10);
        }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var numFolio = parseInt(document.getElementById('folio-num').value, 10);
      var valorEl = document.getElementById('folio-valor');
      var idVentaEl = document.getElementById('folio-idventa');
      var valor = valorEl.value ? parseInt(valorEl.value, 10) : null;
      var idVenta = idVentaEl.value ? parseInt(idVentaEl.value, 10) : null;
      var fechaCompra = document.getElementById('folio-fecha').value || new Date().toISOString().slice(0, 10);

      window.MiTienda.supabase.folios.insert({
        NumFolio: numFolio,
        Valor: valor,
        IdVenta: idVenta,
        FechaCompra: fechaCompra
      }).then(function () {
        form.reset();
        if (fechaInput) fechaInput.value = new Date().toISOString().slice(0, 10);
        if (numInput) numInput.value = '';
        cargarLista();
        if (modal && window.MiTienda.modal) {
          window.MiTienda.modal.close(modal);
        }
      }).catch(function (err) {
        console.error('Folios insert:', err);
      });
    });

    cargarLista();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
