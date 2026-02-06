/**
 * Configuración y capa de datos para Supabase.
 * Sin URL/Key usa almacenamiento en memoria. Con credenciales usa Supabase.
 *
 * Para conectar Supabase:
 * 1. Crea un proyecto en https://supabase.com
 * 2. En Settings > API copia URL y anon key
 * 3. Define window.__ENV__ antes de cargar este script, o edita aquí:
 */
(function () {
  var SUPABASE_URL = (window.__ENV__ && window.__ENV__.SUPABASE_URL) || '';
  var SUPABASE_ANON_KEY = (window.__ENV__ && window.__ENV__.SUPABASE_ANON_KEY) || '';

  var supabase = null;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase: config vacía, usando memoria local. Edita js/config.js.');
  }
  if (SUPABASE_URL && SUPABASE_ANON_KEY && typeof window.supabase !== 'undefined') {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn('Supabase: error al crear cliente', e);
    }
  }

  /** Datos en memoria cuando no hay Supabase */
  var memory = {
    Club: [],
    Folios: [],
    Reparticion: [],
    Staff: [],
    Venta: []
  };

  function useSupabase() {
    return supabase !== null;
  }

  /**
   * Club - tabla public."Club"
   * Campos: idClub, Nombre, created_at
   */
  function listClub() {
    if (useSupabase()) {
      return supabase.from('Club').select('*').order('idClub', { ascending: true }).then(function (r) {
        if (r.error) throw r.error;
        return r.data || [];
      });
    }
    return Promise.resolve(memory.Club.slice());
  }

  function insertClub(row) {
    var payload = { Nombre: row.Nombre || null };
    if (useSupabase()) {
      return supabase.from('Club').insert(payload).select().single().then(function (r) {
        if (r.error) throw r.error;
        return r.data;
      });
    }
    var item = {
      idClub: memory.Club.length + 1,
      Nombre: payload.Nombre,
      created_at: new Date().toISOString()
    };
    memory.Club.push(item);
    return Promise.resolve(item);
  }

  /**
   * Folios - tabla public."Folios"
   * Campos: idFolio, NumFolio, Valor, IdVenta, FechaCompra
   */
  function listFolios() {
    if (useSupabase()) {
      return supabase.from('Folios').select('*').order('idFolio', { ascending: true }).then(function (r) {
        if (r.error) throw r.error;
        return r.data || [];
      });
    }
    return Promise.resolve(memory.Folios.slice());
  }

  function getFolioByNum(numFolio) {
    if (useSupabase()) {
      return supabase.from('Folios').select('*').eq('NumFolio', numFolio).maybeSingle().then(function (r) {
        if (r.error) throw r.error;
        return r.data || null;
      });
    }
    var encontrado = memory.Folios.find(function (f) { return parseInt(f.NumFolio, 10) === parseInt(numFolio, 10); });
    return Promise.resolve(encontrado || null);
  }

  function insertFolios(row) {
    var payload = {
      NumFolio: row.NumFolio,
      Valor: row.Valor != null ? row.Valor : null,
      IdVenta: row.IdVenta != null ? row.IdVenta : null,
      FechaCompra: row.FechaCompra || new Date().toISOString().slice(0, 10)
    };
    if (useSupabase()) {
      return supabase.from('Folios').insert(payload).select().single().then(function (r) {
        if (r.error) throw r.error;
        return r.data;
      });
    }
    var item = {
      idFolio: memory.Folios.length + 1,
      NumFolio: payload.NumFolio,
      Valor: payload.Valor,
      IdVenta: payload.IdVenta,
      FechaCompra: payload.FechaCompra
    };
    memory.Folios.push(item);
    return Promise.resolve(item);
  }

  function updateFoliosVentaByIds(ids, idVenta) {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    if (useSupabase()) {
      return supabase.from('Folios').update({ IdVenta: idVenta }).in('idFolio', ids).select().then(function (r) {
        if (r.error) throw r.error;
        return r.data || [];
      });
    }
    var actualizados = [];
    memory.Folios.forEach(function (f) {
      if (ids.indexOf(f.idFolio) >= 0) {
        f.IdVenta = idVenta;
        actualizados.push(f);
      }
    });
    return Promise.resolve(actualizados);
  }

  /**
   * Reparticion - tabla public."Reparticion"
   * Campos: IdStaff, idFolio, FechaMod, IdReparticion
   */
  function listReparticion() {
    if (useSupabase()) {
      return supabase.from('Reparticion')
        .select('IdReparticion,FechaMod,IdStaff,idFolio,Staff:IdStaff(Nombre),Folios:idFolio(NumFolio,Valor)')
        .order('IdReparticion', { ascending: true })
        .then(function (r) {
        if (r.error) throw r.error;
        return r.data || [];
      });
    }
    var enriched = memory.Reparticion.map(function (r) {
      var staff = memory.Staff.find(function (s) { return s.idStaff === r.IdStaff; }) || null;
      var folio = memory.Folios.find(function (f) { return f.idFolio === r.idFolio; }) || null;
      return {
        IdReparticion: r.IdReparticion,
        FechaMod: r.FechaMod,
        IdStaff: r.IdStaff,
        idFolio: r.idFolio,
        Staff: staff ? { Nombre: staff.Nombre } : null,
        Folios: folio ? { NumFolio: folio.NumFolio, Valor: folio.Valor } : null
      };
    });
    return Promise.resolve(enriched);
  }

  function insertReparticion(row) {
    var payload = {
      IdStaff: row.IdStaff,
      idFolio: row.idFolio
    };
    if (useSupabase()) {
      return supabase.from('Reparticion').insert(payload).select().single().then(function (r) {
        if (r.error) throw r.error;
        return r.data;
      });
    }
    var item = {
      IdReparticion: memory.Reparticion.length + 1,
      IdStaff: payload.IdStaff,
      idFolio: payload.idFolio,
      FechaMod: new Date().toISOString()
    };
    memory.Reparticion.push(item);
    return Promise.resolve(item);
  }

  /**
   * Staff - tabla public."Staff"
   * Campos: idStaff, Nombre, created_at
   */
  function listStaff() {
    if (useSupabase()) {
      return supabase.from('Staff').select('*').order('idStaff', { ascending: true }).then(function (r) {
        if (r.error) throw r.error;
        return r.data || [];
      });
    }
    return Promise.resolve(memory.Staff.slice());
  }

  function insertStaff(row) {
    var payload = { Nombre: row.Nombre || null };
    if (useSupabase()) {
      return supabase.from('Staff').insert(payload).select().single().then(function (r) {
        if (r.error) throw r.error;
        return r.data;
      });
    }
    var item = {
      idStaff: memory.Staff.length + 1,
      Nombre: payload.Nombre,
      created_at: new Date().toISOString()
    };
    memory.Staff.push(item);
    return Promise.resolve(item);
  }

  /**
   * Venta - tabla public."Venta"
   * Campos: idVenta, idClub, created_at
   */
  function listVenta() {
    if (useSupabase()) {
      return supabase.from('Venta').select('*').order('idVenta', { ascending: true }).then(function (r) {
        if (r.error) throw r.error;
        return r.data || [];
      });
    }
    return Promise.resolve(memory.Venta.slice());
  }

  function insertVenta(row) {
    var payload = { idClub: row.idClub != null ? row.idClub : null };
    if (useSupabase()) {
      return supabase.from('Venta').insert(payload).select().single().then(function (r) {
        if (r.error) throw r.error;
        return r.data;
      });
    }
    var item = {
      idVenta: memory.Venta.length + 1,
      idClub: payload.idClub,
      created_at: new Date().toISOString()
    };
    memory.Venta.push(item);
    return Promise.resolve(item);
  }

  window.MiTienda = window.MiTienda || {};
  window.MiTienda.supabase = {
    getClient: function () { return supabase; },
    useSupabase: useSupabase,
    club: { list: listClub, insert: insertClub },
    folios: { list: listFolios, insert: insertFolios, getByNum: getFolioByNum, updateVentaByIds: updateFoliosVentaByIds },
    reparticion: { list: listReparticion, insert: insertReparticion },
    staff: { list: listStaff, insert: insertStaff },
    venta: { list: listVenta, insert: insertVenta }
  };
})();
