/**
 * Repartición - Solo lógica. Estructura en index.html.
 * Datos vía MiTienda.supabase.reparticion (Supabase o memoria).
 */
(function () {
  var folioActual = null;
  var foliosPendientes = [];
  var stream = null;
  var scanActive = false;

  function pintarTabla(tbody, datos) {
    if (!datos || datos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="1" class="empty-msg">No hay registros.</td></tr>';
      return;
    }
    tbody.innerHTML = datos.map(function (r) {
      return '<tr><td>' + (r.FechaMod || '') + '</td></tr>';
    }).join('');
  }

  function cargarLista() {
    var tbody = document.getElementById('tbody-reparticion');
    if (!tbody) return;
    window.MiTienda.supabase.reparticion.list().then(function (datos) {
      pintarTabla(tbody, datos);
    }).catch(function (err) {
      console.error('Reparticion list:', err);
      pintarTabla(tbody, []);
    });
  }

  function normalizeText(text) {
    return String(text || '').toLowerCase().trim();
  }

  function cargarStaff() {
    var list = document.getElementById('staff-list');
    if (!list) return;
    window.MiTienda.supabase.staff.list().then(function (staff) {
      list.innerHTML = '';
      staff.forEach(function (s) {
        var opt = document.createElement('option');
        var nombre = s.Nombre || ('Staff ' + s.idStaff);
        opt.value = nombre;
        opt.setAttribute('data-id', String(s.idStaff));
        opt.setAttribute('data-name', normalizeText(nombre));
        list.appendChild(opt);
      });
    }).catch(function (err) {
      console.error('Staff list:', err);
    });
  }
  function syncStaffId(inputStaff, hiddenId) {
    if (!inputStaff || !hiddenId) return;
    var val = inputStaff.value;
    if (!val) {
      hiddenId.value = '';
      return;
    }
    var numeric = parseInt(val, 10);
    if (!isNaN(numeric) && String(numeric) === String(val).trim()) {
      hiddenId.value = String(numeric);
      return;
    }
    var normalized = normalizeText(val);
    var options = document.querySelectorAll('#staff-list option');
    for (var i = 0; i < options.length; i++) {
      if (options[i].getAttribute('data-name') === normalized) {
        hiddenId.value = options[i].getAttribute('data-id') || '';
        return;
      }
    }
    hiddenId.value = '';
  }

  function setStatus(valor, mensaje, esError) {
    var elValor = document.getElementById('folio-valor-rep');
    var elMensaje = document.getElementById('folio-mensaje-rep');
    if (elValor) elValor.textContent = valor != null ? String(valor) : '--';
    if (elMensaje) {
      elMensaje.textContent = mensaje || '';
      elMensaje.style.color = esError ? '#f59e0b' : '#4b5563';
    }
  }

  function setAceptarHabilitado(enabled) {
    var btnAceptar = document.getElementById('btn-aceptar-folio-rep');
    if (btnAceptar) btnAceptar.disabled = !enabled;
  }

  function resetCaptura() {
    folioActual = null;
    setStatus(null, '', false);
    setAceptarHabilitado(false);
  }

  function setFolioActual(num, valor) {
    resetCaptura();
    if (!num && num !== 0) {
      setStatus(null, 'Ingresa un folio válido.', true);
      return false;
    }
    if (valor == null || isNaN(valor)) {
      setStatus(null, 'Selecciona un valor.', true);
      return false;
    }
    folioActual = { NumFolio: num, Valor: valor };
    setStatus(valor, 'Folio listo.', false);
    setAceptarHabilitado(true);
    return true;
  }

  function pintarPendientes() {
    var tbody = document.getElementById('tbody-folios-rep');
    if (!tbody) return;
    if (foliosPendientes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="empty-msg">No hay folios en la lista.</td></tr>';
      return;
    }
    tbody.innerHTML = foliosPendientes.map(function (f) {
      return '<tr><td>' + f.NumFolio + '</td><td>' + f.Valor + '</td></tr>';
    }).join('');
  }

  function aceptarFolio() {
    if (!folioActual) return;
    var existe = foliosPendientes.some(function (f) { return f.NumFolio === folioActual.NumFolio; });
    if (existe) {
      setStatus(folioActual.Valor, 'El folio ya está en la lista.', true);
      return;
    }
    foliosPendientes.push({ NumFolio: folioActual.NumFolio, Valor: folioActual.Valor });
    resetCaptura();
    pintarPendientes();
  }

  function detenerCamara() {
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    scanActive = false;
    var btnStop = document.getElementById('btn-stop-qr-rep');
    if (btnStop) btnStop.disabled = true;
  }

  function escanearLoop(video, canvas, ctx) {
    if (!scanActive) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (window.jsQR) {
        var code = window.jsQR(imageData.data, canvas.width, canvas.height);
        if (code && code.data) {
          detenerCamara();
          var parts = String(code.data).split('|');
          if (parts.length >= 2) {
            var num = parseInt(parts[0], 10);
            var valor = parseInt(parts[1], 10);
            if (!isNaN(num)) {
              var input = document.getElementById('rep-folio-num');
              var inputVal = document.getElementById('rep-folio-valor');
              if (input) input.value = num;
              if (inputVal) inputVal.value = !isNaN(valor) ? String(valor) : '';
              setFolioActual(num, isNaN(valor) ? null : valor);
              return;
            }
          }
          setStatus(null, 'Formato de QR inválido. Usa "NumFolio|Valor".', true);
        }
      }
    }
    requestAnimationFrame(function () { escanearLoop(video, canvas, ctx); });
  }

  function iniciarCamara() {
    var video = document.getElementById('qr-video-rep');
    var canvas = document.getElementById('qr-canvas-rep');
    if (!video || !canvas) return;
    var ctx = canvas.getContext('2d');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus(null, 'La cámara no está disponible.', true);
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (s) {
      stream = s;
      scanActive = true;
      video.srcObject = stream;
      video.setAttribute('playsinline', true);
      video.play();
      var btnStop = document.getElementById('btn-stop-qr-rep');
      if (btnStop) btnStop.disabled = false;
      escanearLoop(video, canvas, ctx);
    }).catch(function () {
      setStatus(null, 'No se pudo abrir la cámara.', true);
    });
  }

  function init() {
    var form = document.getElementById('form-reparticion');
    var tbody = document.getElementById('tbody-reparticion');
    var modal = document.getElementById('modal-reparticion');
    var inputStaff = document.getElementById('rep-staff');
    var inputStaffId = document.getElementById('rep-staff-id');
    var inputFolio = document.getElementById('rep-folio-num');
    var inputValor = document.getElementById('rep-folio-valor');
    var btnNuevoStaff = document.getElementById('btn-nuevo-staff');
    var btnCapturar = document.getElementById('btn-capturar-folio-rep');
    var btnQR = document.getElementById('btn-qr-rep');
    var btnStop = document.getElementById('btn-stop-qr-rep');
    var btnAceptar = document.getElementById('btn-aceptar-folio-rep');

    if (!form || !tbody) return;

    if (btnNuevoStaff) {
      btnNuevoStaff.addEventListener('click', function () {
        localStorage.setItem('refreshStaff', '1');
        window.open('staff.html', '_blank');
      });
    }

    window.addEventListener('focus', function () {
      if (localStorage.getItem('refreshStaff') === '1') {
        localStorage.removeItem('refreshStaff');
        cargarStaff();
      }
    });

    if (inputStaff) {
      inputStaff.addEventListener('input', function () {
        syncStaffId(inputStaff, inputStaffId);
      });
      inputStaff.addEventListener('blur', function () {
        syncStaffId(inputStaff, inputStaffId);
      });
    }

    if (btnCapturar) {
      btnCapturar.addEventListener('click', function () {
        var num = inputFolio ? parseInt(inputFolio.value, 10) : NaN;
        var valor = inputValor && inputValor.value ? parseInt(inputValor.value, 10) : null;
        setFolioActual(num, valor);
      });
    }

    if (btnAceptar) {
      btnAceptar.addEventListener('click', function () {
        aceptarFolio();
      });
    }

    if (btnQR) {
      btnQR.addEventListener('click', function () {
        iniciarCamara();
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', function () {
        detenerCamara();
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var idStaff = inputStaffId && inputStaffId.value ? parseInt(inputStaffId.value, 10) : null;

      if (!idStaff || foliosPendientes.length === 0) {
        setStatus(null, 'Agrega folios antes de guardar.', true);
        return;
      }

      var tareas = foliosPendientes.map(function (f) {
        return window.MiTienda.supabase.folios.insert({
          NumFolio: f.NumFolio,
          Valor: f.Valor
        }).then(function (folio) {
          var idFolio = folio && (folio.idFolio || folio.IdFolio || folio.idfolio) ? (folio.idFolio || folio.IdFolio || folio.idfolio) : null;
          return window.MiTienda.supabase.reparticion.insert({ IdStaff: idStaff, idFolio: idFolio });
        });
      });

      Promise.all(tareas).then(function () {
        form.reset();
        resetCaptura();
        foliosPendientes = [];
        pintarPendientes();
        cargarLista();
        if (modal && window.MiTienda.modal) {
          window.MiTienda.modal.close(modal);
        }
      }).catch(function (err) {
        console.error('Reparticion insert:', err);
        setStatus(null, 'No se pudo registrar la repartición.', true);
      });
    });

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target && e.target.hasAttribute('data-modal-close')) {
          detenerCamara();
        }
      });
    }

    cargarStaff();
    cargarLista();
    pintarPendientes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
