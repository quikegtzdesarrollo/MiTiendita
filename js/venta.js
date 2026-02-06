/**
 * Venta - Captura de folios, validación y confirmación de compra.
 * Datos vía MiTienda.supabase (Supabase o memoria).
 */
(function () {
  var foliosCompra = [];
  var folioActual = null;
  var staffPorFolio = {};
  var stream = null;
  var scanActive = false;
  var ventasCache = [];

  function pintarVentas(tbody, datos) {
    if (!tbody) return;
    if (!datos || datos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">No hay registros.</td></tr>';
      return;
    }
    tbody.innerHTML = datos.map(function (r) {
      var clubNombre = r.Club && r.Club.Nombre ? r.Club.Nombre : (r.idClub != null ? ('Club ' + r.idClub) : '');
      var staffNombre = r.Staff && r.Staff.Nombre ? r.Staff.Nombre : '';
      var numFolio = r.Folios && r.Folios.NumFolio != null ? r.Folios.NumFolio : '';
      var valor = r.Folios && r.Folios.Valor != null ? r.Folios.Valor : '';
      return '<tr><td>' + clubNombre + '</td><td>' + (r.Concepto || '') + '</td><td>' + staffNombre + '</td><td>' + numFolio + '</td><td>' + valor + '</td><td>' + (r.created_at || '') + '</td><td><button class="btn btn-secondary btn-delete" data-id="' + r.idVenta + '">Eliminar</button></td></tr>';
    }).join('');
  }

  function aplicarFiltros() {
    var tbody = document.getElementById('tbody-venta');
    var filtroClub = document.getElementById('filtro-club');
    var filtroStaff = document.getElementById('filtro-staff');
    var clubVal = filtroClub ? filtroClub.value : '';
    var staffVal = filtroStaff ? filtroStaff.value : '';
    var filtradas = ventasCache.filter(function (v) {
      var clubOk = !clubVal || String(v.idClub) === String(clubVal);
      var staffId = v.Staff && v.Staff.idStaff ? v.Staff.idStaff : null;
      var staffOk = !staffVal || String(staffId) === String(staffVal);
      return clubOk && staffOk;
    });
    pintarVentas(tbody, filtradas);
  }

  function cargarVentas() {
    var tbody = document.getElementById('tbody-venta');
    if (!tbody) return;
    window.MiTienda.supabase.venta.list().then(function (datos) {
      ventasCache = datos || [];
      cargarFiltros(ventasCache);
      aplicarFiltros();
    }).catch(function (err) {
      console.error('Venta list:', err);
      pintarVentas(tbody, []);
    });
  }

  function cargarFiltros(datos) {
    var filtroClub = document.getElementById('filtro-club');
    var filtroStaff = document.getElementById('filtro-staff');
    if (filtroClub) {
      var clubes = {};
      (datos || []).forEach(function (v) {
        if (v.idClub != null) {
          clubes[String(v.idClub)] = v.Club && v.Club.Nombre ? v.Club.Nombre : ('Club ' + v.idClub);
        }
      });
      filtroClub.innerHTML = '<option value="">Todos</option>' + Object.keys(clubes).map(function (id) {
        return '<option value="' + id + '">' + clubes[id] + '</option>';
      }).join('');
    }
    if (filtroStaff) {
      var staff = {};
      (datos || []).forEach(function (v) {
        var st = v.Staff;
        if (st && st.idStaff != null) {
          staff[String(st.idStaff)] = st.Nombre || ('Staff ' + st.idStaff);
        }
      });
      filtroStaff.innerHTML = '<option value="">Todos</option>' + Object.keys(staff).map(function (id) {
        return '<option value="' + id + '">' + staff[id] + '</option>';
      }).join('');
    }
  }

  function pintarCompra() {
    var tbody = document.getElementById('tbody-folios-compra');
    var btnConfirmar = document.getElementById('btn-confirmar-compra');
    if (!tbody) return;
    if (foliosCompra.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">No hay folios en la compra.</td></tr>';
      if (btnConfirmar) btnConfirmar.disabled = true;
      return;
    }
    tbody.innerHTML = foliosCompra.map(function (f) {
      return '<tr><td>' + f.NumFolio + '</td><td>' + (f.Valor != null ? f.Valor : '') + '</td><td>' + (f.StaffNombre || '') + '</td><td>' + (f.Fecha || '') + '</td></tr>';
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
    var staffNombre = staffPorFolio[folioActual.idFolio] || '';
    foliosCompra.push({
      idFolio: folioActual.idFolio,
      NumFolio: folioActual.NumFolio,
      Valor: folioActual.Valor,
      StaffNombre: staffNombre,
      Fecha: folioActual.FechaCompra || ''
    });
    resetCaptura();
    pintarCompra();
  }
  function cargarStaffPorFolio() {
    if (!window.MiTienda || !window.MiTienda.supabase) return;
    window.MiTienda.supabase.reparticion.list().then(function (repartos) {
      staffPorFolio = {};
      (repartos || []).forEach(function (r) {
        if (r && r.idFolio != null) {
          var nombre = r.Staff && r.Staff.Nombre ? r.Staff.Nombre : '';
          staffPorFolio[r.idFolio] = nombre;
        }
      });
      // refresca la vista si ya hay folios en la compra
      if (foliosCompra.length > 0) {
        foliosCompra = foliosCompra.map(function (f) {
          return {
            idFolio: f.idFolio,
            NumFolio: f.NumFolio,
            Valor: f.Valor,
            Fecha: f.Fecha,
            StaffNombre: staffPorFolio[f.idFolio] || f.StaffNombre || ''
          };
        });
        pintarCompra();
      }
    }).catch(function () {
      // no bloquear la captura si falla
    });
  }

  function confirmarCompra() {
    if (foliosCompra.length === 0) return;
    var idClubVal = document.getElementById('venta-club');
    var idClub = idClubVal && idClubVal.value ? parseInt(idClubVal.value, 10) : null;
    var conceptoEl = document.getElementById('venta-concepto');
    var concepto = conceptoEl ? conceptoEl.value.trim() : '';
    var ids = foliosCompra.map(function (f) { return f.idFolio; });

    window.MiTienda.supabase.venta.insert({ idClub: idClub, Concepto: concepto || null }).then(function (venta) {
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
              var inputVal = document.getElementById('venta-folio-valor');
              if (input) input.value = num;
              if (inputVal) inputVal.value = !isNaN(valor) ? String(valor) : '';
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
    var inputValor = document.getElementById('venta-folio-valor');
    var inputClub = document.getElementById('venta-club');
    var modal = document.getElementById('modal-venta');
    var openBtn = document.querySelector('[data-modal-target="#modal-venta"]');
    var filtroClub = document.getElementById('filtro-club');
    var filtroStaff = document.getElementById('filtro-staff');
    var tbody = document.getElementById('tbody-venta');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('.btn-delete');
        if (!btn) return;
        var id = parseInt(btn.getAttribute('data-id'), 10);
        if (!id) return;
        if (!window.confirm('¿Eliminar esta venta?')) return;
        window.MiTienda.supabase.venta.delete(id).then(function () {
          cargarVentas();
        }).catch(function (err) {
          console.error('Venta delete:', err);
        });
      });
    }
    if (filtroClub) {
      filtroClub.addEventListener('change', aplicarFiltros);
    }
    if (filtroStaff) {
      filtroStaff.addEventListener('change', aplicarFiltros);
    }

    if (btnBuscar) {
      btnBuscar.addEventListener('click', function () {
        var num = inputFolio ? parseInt(inputFolio.value, 10) : NaN;
        var valor = inputValor && inputValor.value ? parseInt(inputValor.value, 10) : null;
        if (!valor) {
          setStatus(null, 'Selecciona un valor.', true);
          return;
        }
        buscarFolio(num, valor);
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
        cargarStaffPorFolio();
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
