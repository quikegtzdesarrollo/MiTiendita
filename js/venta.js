/**
 * Venta - Captura de folios, validación y confirmación de compra.
 * Datos vía MiTienda.supabase (Supabase o memoria).
 */
(function () {
  var foliosCompra = [];
  var folioActual = null;
  var stream = null;
  var scanActive = false;

  function pintarVentas(tbody, datos) {
    if (!tbody) return;
    if (!datos || datos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="empty-msg">No hay registros.</td></tr>';
      return;
    }
    tbody.innerHTML = datos.map(function (r) {
      var clubNombre = r.Club && r.Club.Nombre ? r.Club.Nombre : (r.idClub != null ? ('Club ' + r.idClub) : '');
      return '<tr><td>' + clubNombre + '</td><td>' + (r.created_at || '') + '</td></tr>';
    }).join('');
  }

  function cargarVentas() {
    var tbody = document.getElementById('tbody-venta');
    if (!tbody) return;
    window.MiTienda.supabase.venta.list().then(function (datos) {
      pintarVentas(tbody, datos);
    }).catch(function (err) {
      console.error('Venta list:', err);
      pintarVentas(tbody, []);
    });
  }

  function pintarCompra() {
    var tbody = document.getElementById('tbody-folios-compra');
    var btnConfirmar = document.getElementById('btn-confirmar-compra');
    if (!tbody) return;
    if (foliosCompra.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="empty-msg">No hay folios en la compra.</td></tr>';
      if (btnConfirmar) btnConfirmar.disabled = true;
      return;
    }
    tbody.innerHTML = foliosCompra.map(function (f) {
      return '<tr><td>' + f.NumFolio + '</td><td>' + (f.Valor != null ? f.Valor : '') + '</td></tr>';
    }).join('');
    if (btnConfirmar) btnConfirmar.disabled = false;
  }

  function setStatus(valor, mensaje, esError) {
    var elValor = document.getElementById('folio-valor');
    var elMensaje = document.getElementById('folio-mensaje');
    if (elValor) elValor.textContent = valor != null ? String(valor) : '--';
    if (elMensaje) {
      elMensaje.textContent = mensaje || '';
      elMensaje.style.color = esError ? '#f59e0b' : '#4b5563';
    }
  }

  function setAceptarHabilitado(enabled) {
    var btnAceptar = document.getElementById('btn-aceptar-folio');
    if (btnAceptar) btnAceptar.disabled = !enabled;
  }

  function resetCaptura() {
    folioActual = null;
    setStatus(null, '', false);
    setAceptarHabilitado(false);
  }

  function buscarFolio(num, valorEsperado) {
    resetCaptura();
    if (!num && num !== 0) {
      setStatus(null, 'Ingresa un folio válido.', true);
      return;
    }
    window.MiTienda.supabase.folios.getByNum(num).then(function (folio) {
      if (!folio) {
        setStatus(null, 'Folio no encontrado.', true);
        return;
      }
      if (folio.IdVenta != null) {
        setStatus(folio.Valor, 'Este folio ya fue utilizado.', true);
        return;
      }
      if (valorEsperado != null && folio.Valor != null && parseInt(valorEsperado, 10) !== parseInt(folio.Valor, 10)) {
        setStatus(folio.Valor, 'El valor no coincide con el folio.', true);
        return;
      }
      folioActual = folio;
      setStatus(folio.Valor, 'Folio listo para agregar.', false);
      setAceptarHabilitado(true);
    }).catch(function (err) {
      console.error('Buscar folio:', err);
      setStatus(null, 'Error al consultar folio.', true);
    });
  }

  function aceptarFolio() {
    if (!folioActual) return;
    var yaExiste = foliosCompra.some(function (f) { return f.idFolio === folioActual.idFolio; });
    if (yaExiste) {
      setStatus(folioActual.Valor, 'El folio ya está en la compra.', true);
      return;
    }
    foliosCompra.push({
      idFolio: folioActual.idFolio,
      NumFolio: folioActual.NumFolio,
      Valor: folioActual.Valor
    });
    resetCaptura();
    pintarCompra();
  }

  function confirmarCompra() {
    if (foliosCompra.length === 0) return;
    var idClubVal = document.getElementById('venta-club');
    var idClub = idClubVal && idClubVal.value ? parseInt(idClubVal.value, 10) : null;
    var ids = foliosCompra.map(function (f) { return f.idFolio; });

    window.MiTienda.supabase.venta.insert({ idClub: idClub }).then(function (venta) {
      var nuevoId = venta && venta.idVenta ? venta.idVenta : null;
      return window.MiTienda.supabase.folios.updateVentaByIds(ids, nuevoId).then(function () {
        foliosCompra = [];
        pintarCompra();
        cargarVentas();
        var modal = document.getElementById('modal-venta');
        if (modal && window.MiTienda.modal) {
          window.MiTienda.modal.close(modal);
        }
      });
    }).catch(function (err) {
      console.error('Confirmar compra:', err);
      setStatus(null, 'No se pudo confirmar la compra.', true);
    });
  }

  function detenerCamara() {
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    scanActive = false;
    var btnStop = document.getElementById('btn-stop-qr');
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
              var input = document.getElementById('venta-folio-num');
              if (input) input.value = num;
              buscarFolio(num, isNaN(valor) ? null : valor);
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
    var video = document.getElementById('qr-video');
    var canvas = document.getElementById('qr-canvas');
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
      var btnStop = document.getElementById('btn-stop-qr');
      if (btnStop) btnStop.disabled = false;
      escanearLoop(video, canvas, ctx);
    }).catch(function () {
      setStatus(null, 'No se pudo abrir la cámara.', true);
    });
  }

  function cargarClubes() {
    var select = document.getElementById('venta-club');
    if (!select) return;
    window.MiTienda.supabase.club.list().then(function (clubs) {
      select.innerHTML = '<option value="">Selecciona un club</option>';
      (clubs || []).forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = String(c.idClub);
        opt.textContent = c.Nombre || ('Club ' + c.idClub);
        select.appendChild(opt);
      });
    }).catch(function (err) {
      console.error('Club list:', err);
    });
  }

  function init() {
    var btnBuscar = document.getElementById('btn-capturar-folio');
    var btnAceptar = document.getElementById('btn-aceptar-folio');
    var btnConfirmar = document.getElementById('btn-confirmar-compra');
    var btnQR = document.getElementById('btn-qr');
    var btnStop = document.getElementById('btn-stop-qr');
    var inputFolio = document.getElementById('venta-folio-num');
    var inputClub = document.getElementById('venta-club');
    var modal = document.getElementById('modal-venta');
    var openBtn = document.querySelector('[data-modal-target="#modal-venta"]');

    if (btnBuscar) {
      btnBuscar.addEventListener('click', function () {
        var num = inputFolio ? parseInt(inputFolio.value, 10) : NaN;
        buscarFolio(num, null);
      });
    }

    if (btnAceptar) {
      btnAceptar.addEventListener('click', function () {
        aceptarFolio();
      });
    }

    if (btnConfirmar) {
      btnConfirmar.addEventListener('click', function () {
        confirmarCompra();
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

    if (openBtn) {
      openBtn.addEventListener('click', function () {
        resetCaptura();
        pintarCompra();
      });
    }

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target && e.target.hasAttribute('data-modal-close')) {
          detenerCamara();
        }
      });
    }

    cargarClubes();
    cargarVentas();
    pintarCompra();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
