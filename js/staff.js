/**
 * Staff - Solo lógica. Estructura en index.html.
 * Datos vía MiTienda.supabase.staff (Supabase o memoria).
 */
(function () {
  function pintarTabla(tbody, datos) {
    if (!datos || datos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty-msg">No hay registros.</td></tr>';
      return;
    }
    tbody.innerHTML = datos.map(function (r) {
      return '<tr><td>' + (r.Nombre || '') + '</td><td>' + (r.created_at || '') + '</td><td><button class="btn btn-secondary btn-delete" data-id="' + r.idStaff + '">Eliminar</button></td></tr>';
    }).join('');
  }

  function cargarLista() {
    var tbody = document.getElementById('tbody-staff');
    if (!tbody) return;
    window.MiTienda.supabase.staff.list().then(function (datos) {
      pintarTabla(tbody, datos);
    }).catch(function (err) {
      console.error('Staff list:', err);
      pintarTabla(tbody, []);
    });
  }

  function init() {
    var form = document.getElementById('form-staff');
    var tbody = document.getElementById('tbody-staff');
    var modal = document.getElementById('modal-staff');
    var statusEl = document.getElementById('staff-status');
    var btnGuardar = document.getElementById('btn-guardar-staff');
    if (!form || !tbody) return;

    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn-delete');
      if (!btn) return;
      var id = parseInt(btn.getAttribute('data-id'), 10);
      if (!id) return;
      if (!window.confirm('¿Eliminar este staff?')) return;
      window.MiTienda.supabase.staff.delete(id).then(function () {
        cargarLista();
      }).catch(function (err) {
        console.error('Staff delete:', err);
      });
    });

    function setStatus(msg, isError) {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.classList.toggle('error', !!isError);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nombre = document.getElementById('staff-nombre').value.trim();
      setStatus('', false);
      if (!nombre) {
        setStatus('El nombre es obligatorio.', true);
        return;
      }
      if (btnGuardar) btnGuardar.disabled = true;

      window.MiTienda.supabase.staff.insert({ Nombre: nombre || null }).then(function () {
        form.reset();
        cargarLista();
        setStatus('Guardado correctamente.', false);
        if (modal && window.MiTienda.modal) {
          window.MiTienda.modal.close(modal);
        }
      }).catch(function (err) {
        console.error('Staff insert:', err);
        setStatus('Error al guardar. Revisa la configuración de Supabase o RLS.', true);
      }).finally(function () {
        if (btnGuardar) btnGuardar.disabled = false;
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
