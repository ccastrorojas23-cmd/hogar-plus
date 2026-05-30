// ============================================
// HOGAR+ · APLICACIÓN PRINCIPAL
// ============================================

const SUPABASE_URL = 'https://rjrigwwsrlvlfmpiyblo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ySeck1SKDqzX7t8XGhEDkw_cw9BPQG3';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ESTADO GLOBAL
const estado = {
  usuario: null,
  mes: null,
  vista: 'gastos',
  tabGastos: 'agenda',
  diaSeleccionadoMenu: null,
  pinInput: '',
  pinUsuarioSeleccionado: null,
  diasMercadoExpandidos: {},
  data: {
    gastos: [], ingresos: [], ahorros: [],
    productos: [], menus: [],
    catGasto: [], catAhorro: [], catMercado: []
  }
};

const PALETA = [
  {bg:'#E1F5EE', fg:'#0F6E56', stroke:'#1D9E75'},
  {bg:'#FAEEDA', fg:'#854F0B', stroke:'#BA7517'},
  {bg:'#EEEDFE', fg:'#3C3489', stroke:'#7F77DD'},
  {bg:'#FCEBEB', fg:'#791F1F', stroke:'#E24B4A'},
  {bg:'#FAECE7', fg:'#712B13', stroke:'#D85A30'},
  {bg:'#DCEAF8', fg:'#0C447C', stroke:'#378ADD'},
  {bg:'#FBEAF0', fg:'#72243E', stroke:'#D4537E'},
  {bg:'#EAF3DE', fg:'#27500A', stroke:'#639922'}
];

// UTILIDADES
const $ = id => document.getElementById(id);
const fmt = n => '$' + Math.round(Number(n)||0).toLocaleString('es-CO');
const hoy = () => new Date().toISOString().split('T')[0];
const mesActual = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const mesDeFecha = f => f.substring(0,7);
const formatMes = mes => {
  if(mes==='acumulado') return 'Acumulado';
  const [y,m] = mes.split('-');
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${meses[parseInt(m)-1]} ${y}`;
};
const formatFechaCorta = f => {
  const [y,m,d] = f.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]}`;
};
const formatFechaLarga = f => {
  const [y,m,d] = f.split('-');
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const fecha = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
  return `${dias[fecha.getDay()]} ${parseInt(d)} ${meses[parseInt(m)-1]}`;
};

const colorAleatorio = () => {
  const usados = [...estado.data.catGasto, ...estado.data.catAhorro, ...estado.data.catMercado].map(c => c.color);
  const disponibles = PALETA.filter(p => !usados.includes(JSON.stringify(p)));
  const elegido = disponibles.length > 0 ? disponibles[Math.floor(Math.random()*disponibles.length)] : PALETA[Math.floor(Math.random()*PALETA.length)];
  return JSON.stringify(elegido);
};
const parseColor = c => { try { return typeof c === 'string' ? JSON.parse(c) : c; } catch(e) { return PALETA[0]; } };

const toast = msg => {
  const t = $('toast'); t.textContent = msg; t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 2200);
};

// SPLASH SCREEN
function mostrarFraseDelDia() {
  const inicio = new Date(new Date().getFullYear(), 0, 0);
  const dia = Math.floor((new Date() - inicio) / 86400000);
  const idx = (dia - 1) % FRASES_DEL_ANO.length;
  $('frase-dia').textContent = FRASES_DEL_ANO[idx];
}

async function iniciarApp() {
  mostrarFraseDelDia();
  setTimeout(async () => {
    $('splash').classList.add('fade');
    setTimeout(() => { $('splash').classList.add('hidden'); mostrarLogin(); }, 400);
  }, 2200);
}

// LOGIN CON PIN
async function mostrarLogin() {
  $('login').classList.remove('hidden');
  const { data: usuarios, error } = await sb.from('usuarios').select('*');
  if(error) { toast('Error de conexión'); return; }
  const lista = $('usuarios-lista');
  lista.innerHTML = '';
  usuarios.forEach(u => {
    const card = document.createElement('div');
    card.className = 'usuario-card';
    card.innerHTML = `<div class="avatar">${u.nombre[0]}</div><div class="nombre">${u.nombre}</div>`;
    card.onclick = () => seleccionarUsuario(u);
    lista.appendChild(card);
  });
  renderPinPad();
  renderPinDisplay();
}

function seleccionarUsuario(u) {
  estado.pinUsuarioSeleccionado = u;
  estado.pinInput = '';
  document.querySelectorAll('.usuario-card').forEach((c,i) => {
    c.classList.toggle('activo', c.querySelector('.nombre').textContent === u.nombre);
  });
  $('pin-error').textContent = '';
  renderPinDisplay();
}

function renderPinDisplay() {
  $('pin-display').innerHTML = [0,1,2,3].map(i => `<div class="pin-dot ${i<estado.pinInput.length?'lleno':''}"></div>`).join('');
}

function renderPinPad() {
  const pad = $('pin-pad');
  const teclas = [1,2,3,4,5,6,7,8,9,'',0,'⌫'];
  pad.innerHTML = teclas.map(t => {
    if(t==='') return '<div></div>';
    if(t==='⌫') return `<button class="pin-key borrar" onclick="pulsarPin('back')">⌫</button>`;
    return `<button class="pin-key" onclick="pulsarPin(${t})">${t}</button>`;
  }).join('');
}

function pulsarPin(t) {
  if(!estado.pinUsuarioSeleccionado) { $('pin-error').textContent = 'Selecciona un usuario primero'; return; }
  if(t === 'back') { estado.pinInput = estado.pinInput.slice(0,-1); }
  else if(estado.pinInput.length < 4) { estado.pinInput += t; }
  renderPinDisplay();
  if(estado.pinInput.length === 4) verificarPin();
}

async function verificarPin() {
  const u = estado.pinUsuarioSeleccionado;
  if(estado.pinInput === u.pin) {
    estado.usuario = u;
    estado.mes = mesActual();
    $('login').classList.add('hidden');
    $('app').classList.add('visible');
    $('bottom-nav').classList.remove('hidden');
    await cargarDatos();
    renderVista();
    setupNav();
  } else {
    $('pin-error').textContent = 'PIN incorrecto';
    estado.pinInput = '';
    renderPinDisplay();
  }
}

function logout() {
  estado.usuario = null;
  estado.pinInput = '';
  estado.pinUsuarioSeleccionado = null;
  $('app').classList.remove('visible');
  $('bottom-nav').classList.add('hidden');
  document.querySelectorAll('.usuario-card').forEach(c => c.classList.remove('activo'));
  $('pin-error').textContent = '';
  renderPinDisplay();
  $('login').classList.remove('hidden');
}

// CARGA DE DATOS
async function cargarDatos() {
  const uid = estado.usuario.id;
  const [g, i, a, p, m, cg, ca, cm] = await Promise.all([
    sb.from('gastos').select('*').eq('usuario_id', uid).order('fecha', {ascending:false}),
    sb.from('ingresos').select('*').eq('usuario_id', uid).order('fecha', {ascending:false}),
    sb.from('ahorros').select('*').eq('usuario_id', uid).order('fecha', {ascending:false}),
    sb.from('productos_mercado').select('*').order('fecha', {ascending:false}),
    sb.from('menus').select('*').order('fecha', {ascending:true}),
    sb.from('categorias_gasto').select('*').eq('usuario_id', uid),
    sb.from('categorias_ahorro').select('*').eq('usuario_id', uid),
    sb.from('categorias_mercado').select('*')
  ]);
  estado.data.gastos = g.data || [];
  estado.data.ingresos = i.data || [];
  estado.data.ahorros = a.data || [];
  estado.data.productos = p.data || [];
  estado.data.menus = m.data || [];
  estado.data.catGasto = cg.data || [];
  estado.data.catAhorro = ca.data || [];
  estado.data.catMercado = cm.data || [];
}

// NAVEGACIÓN
function setupNav() {
  document.querySelectorAll('.nav-item[data-vista]').forEach(item => {
    item.onclick = () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('activo'));
      item.classList.add('activo');
      estado.vista = item.dataset.vista;
      renderVista();
    };
  });
  $('logout-btn').onclick = () => {
    if(confirm('¿Cerrar sesión?')) logout();
  };
}

function renderVista() {
  const v = estado.vista;
  if(v === 'gastos') renderGastos();
  else if(v === 'mercado') renderMercado();
  else if(v === 'menus') renderMenus();
}

// SELECTOR GLOBAL DE MES
function renderMesSelector() {
  const meses = [];
  const hoy = new Date();
  const year = hoy.getFullYear();
  for(let m = 0; m < 12; m++) {
    const mesId = `${year}-${String(m+1).padStart(2,'0')}`;
    meses.push({id: mesId, label: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][m]});
  }
  return `
    <div class="mes-selector">
      <div class="mes-chip acumulado ${estado.mes==='acumulado'?'activo':''}" onclick="cambiarMes('acumulado')">Acumulado</div>
      ${meses.map(m => `<div class="mes-chip ${estado.mes===m.id?'activo':''}" onclick="cambiarMes('${m.id}')">${m.label}</div>`).join('')}
    </div>
  `;
}

function cambiarMes(m) {
  estado.mes = m;
  renderVista();
}

// HEADER COMÚN
function renderHeader(titulo) {
  return `
    <div class="header">
      <div class="header-left">
        <p style="font-size:11px;color:#1E4A7A;letter-spacing:0.5px">HOGAR+</p>
        <h2>${titulo}</h2>
      </div>
      <div class="header-right">
        <div class="user-chip"><span class="dot"></span>${estado.usuario.nombre}</div>
      </div>
    </div>
    <div style="background:#0C2E54;color:white;font-size:11px;padding:7px 12px;border-radius:999px;display:inline-block;margin-bottom:10px">${formatMes(estado.mes)}</div>
    ${renderMesSelector()}
  `;
}

// FILTRADO POR MES
function fechaAStr(f) {
  if(!f) return '';
  if(typeof f === 'string') return f.substring(0, 10);
  if(f instanceof Date) {
    return `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`;
  }
  return String(f).substring(0, 10);
}

function filtrarPorMes(items) {
  if(estado.mes === 'acumulado') return items;
  return items.filter(it => {
    const fechaStr = fechaAStr(it.fecha);
    return fechaStr.substring(0, 7) === estado.mes;
  });
}

// MENÚ CONTEXTUAL (mantener pulsado)
let touchTimer = null;
function setupLongPress(elem, onLongPress) {
  const empezar = (e) => {
    touchTimer = setTimeout(() => {
      const t = e.touches ? e.touches[0] : e;
      onLongPress(t.clientX, t.clientY);
    }, 500);
  };
  const cancelar = () => { if(touchTimer) { clearTimeout(touchTimer); touchTimer = null; } };
  elem.addEventListener('touchstart', empezar, {passive:true});
  elem.addEventListener('touchend', cancelar);
  elem.addEventListener('touchmove', cancelar);
  elem.addEventListener('mousedown', empezar);
  elem.addEventListener('mouseup', cancelar);
  elem.addEventListener('mouseleave', cancelar);
}

function mostrarCtxMenu(x, y, opciones) {
  const menu = $('ctx-menu');
  menu.innerHTML = opciones.map(op => `<button class="${op.peligro?'peligro':''}" onclick="(${op.action.toString()})();cerrarCtxMenu()">${op.label}</button>`).join('');
  menu.classList.remove('hidden');
  const rect = menu.getBoundingClientRect();
  let left = x; let top = y;
  if(left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 10;
  if(top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 10;
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
}
function cerrarCtxMenu() { $('ctx-menu').classList.add('hidden'); }
document.addEventListener('click', (e) => { if(!e.target.closest('#ctx-menu')) cerrarCtxMenu(); });

// MODAL
function abrirModal(html) {
  $('modal-contenido').innerHTML = html;
  $('modal-overlay').classList.add('abierto');
}
function cerrarModal() { $('modal-overlay').classList.remove('abierto'); }

// REGISTRO DE SERVICE WORKER - DESHABILITADO
// (Si hay un SW viejo registrado, lo desinstalamos)
if('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  }).catch(() => {});
}

// INICIO
window.addEventListener('load', iniciarApp);

// ============================================
// VISTA GASTOS DEL MES (Agenda + Ahorro)
// ============================================
function renderGastos() {
  $('vista-contenedor').innerHTML = `
    ${renderHeader('Gastos del mes')}
    <div class="tabs">
      <div class="tab ${estado.tabGastos==='agenda'?'activo':''}" onclick="cambiarTabGastos('agenda')">Agenda de gastos</div>
      <div class="tab ${estado.tabGastos==='ahorro'?'activo':''}" onclick="cambiarTabGastos('ahorro')">Ahorro</div>
    </div>
    <div id="tab-content"></div>
  `;
  if(estado.tabGastos === 'agenda') renderTabAgenda();
  else renderTabAhorro();
}
function cambiarTabGastos(t) { estado.tabGastos = t; renderGastos(); }

function calcularSaldoDisponible() {
  const ingresos = filtrarPorMes(estado.data.ingresos);
  const gastosPagados = filtrarPorMes(estado.data.gastos).filter(g => g.pagado);
  const totalIng = ingresos.reduce((s,i) => s + Number(i.valor), 0);
  const totalGas = gastosPagados.reduce((s,g) => s + Number(g.valor), 0);
  return { ingresos: totalIng, gastado: totalGas, saldo: totalIng - totalGas };
}

function renderTabAgenda() {
  const { ingresos, gastado, saldo } = calcularSaldoDisponible();
  const ings = filtrarPorMes(estado.data.ingresos);
  const principales = ings.filter(i => i.tipo === 'principal');
  const extras = ings.filter(i => i.tipo === 'extra');
  const gastos = filtrarPorMes(estado.data.gastos);

  let html = `
    <div class="card">
      <p class="card-titulo">SALDO DISPONIBLE</p>
      <p class="card-numero ${saldo<0?'negativo':''}">${fmt(saldo)}</p>
      <div class="mini-cards">
        ${principales.length === 0 ? '<div style="grid-column:span 2;color:#5A8AC0;font-size:12px;text-align:center;padding:10px">Sin ingresos registrados</div>' : ''}
        ${principales.map(i => `
          <div class="mini-card" style="cursor:pointer" onclick="editarIngreso(${i.id})">
            <p>${i.persona || 'Ingreso'}</p>
            <p>${fmt(i.valor)}</p>
          </div>
        `).join('')}
      </div>
      ${extras.map(e => `
        <div class="mini-card extra" style="margin-bottom:6px" onclick="editarIngreso(${e.id})">
          <p>EXTRA · ${e.empresa || ''}</p>
          <p>${formatFechaCorta(e.fecha)} · ${fmt(e.valor)}</p>
        </div>
      `).join('')}
      <button class="btn-dashed" onclick="abrirFormIngreso()">+ Agregar ingreso</button>
    </div>

    <div class="tabla">
      <div class="tabla-header">
        <span>TABLA DE GASTOS</span>
        <span>${gastos.length} registros</span>
      </div>
      ${gastos.length === 0 ? '<div class="empty-row">Sin gastos registrados este mes</div>' :
        gastos.map(g => renderFilaGasto(g)).join('')}
      <div class="tabla-footer">
        <button class="btn-add-row" onclick="abrirFormGasto()">+ Agregar gasto</button>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <p class="card-titulo" style="margin:0">CATEGORÍAS</p>
        <button class="btn-secondary" onclick="abrirFormCategoria('gasto')">+ Nueva</button>
      </div>
      <div class="cats-row">
        ${estado.data.catGasto.length === 0 ? '<span style="font-size:12px;color:#5A8AC0">Crea tu primera categoría</span>' :
          estado.data.catGasto.map(c => renderCatChip(c, 'gasto')).join('')}
      </div>
    </div>

    ${renderDonaCategorias(gastos, estado.data.catGasto, 'Distribución por categoría')}
    ${renderGraficaAnual()}
  `;
  $('tab-content').innerHTML = html;
}

function renderFilaGasto(g) {
  const cat = estado.data.catGasto.find(c => c.id === g.categoria_id);
  const color = cat ? parseColor(cat.color) : null;
  return `
    <div class="tabla-row gasto" oncontextmenu="event.preventDefault();ctxGasto(event,${g.id})" id="gasto-row-${g.id}">
      <div class="check ${g.pagado?'pagado':''}" onclick="event.stopPropagation();togglePagado(${g.id})">${g.pagado?'✓':''}</div>
      <div onclick="editarGasto(${g.id})">
        <p class="concepto ${g.pagado?'':'pendiente'}">${g.concepto}</p>
        ${cat ? `<span class="cat-pill" style="background:${color.bg};color:${color.fg};border-color:${color.stroke}">${cat.nombre} · ${formatFechaCorta(g.fecha)}</span>`
              : `<span class="cat-pill" style="background:#F4F8FC;color:#5A8AC0;border-color:#5A8AC0">Sin categoría · ${formatFechaCorta(g.fecha)}</span>`}
      </div>
      <p class="valor ${g.pagado?'':'pendiente'}">${fmt(g.valor)}</p>
    </div>
  `;
}

function ctxGasto(e, id) {
  mostrarCtxMenu(e.clientX, e.clientY, [
    { label: 'Editar', action: () => editarGasto(id) },
    { label: 'Eliminar', peligro: true, action: () => eliminarGasto(id) }
  ]);
}

async function togglePagado(id) {
  const g = estado.data.gastos.find(x => x.id === id);
  if(!g) return;
  const nuevo = !g.pagado;
  await sb.from('gastos').update({pagado: nuevo}).eq('id', id);
  g.pagado = nuevo;
  renderVista();
  toast(nuevo ? 'Marcado como pagado' : 'Marcado como pendiente');
}

function abrirFormGasto(id) {
  const editando = id ? estado.data.gastos.find(g => g.id === id) : null;
  const cats = estado.data.catGasto;
  abrirModal(`
    <div class="modal-header">
      <p class="modal-titulo">${editando ? 'Editar gasto' : 'Nuevo gasto'}</p>
      <button class="modal-cerrar" onclick="cerrarModal()">✕</button>
    </div>
    <div class="modal-actions" style="margin-bottom:14px">
      ${editando ? `<button class="btn-delete" onclick="eliminarGasto(${id})">Eliminar</button>` : ''}
      <button class="btn-cancel" onclick="cerrarModal()">Cancelar</button>
      <button class="btn-save" onclick="guardarGasto(${id||'null'})">${editando?'Guardar':'Crear'}</button>
    </div>
    <label>CONCEPTO</label>
    <input id="g-concepto" type="text" value="${editando?editando.concepto.replace(/"/g,'&quot;'):''}" placeholder="Ej: Arriendo">
    <label>VALOR</label>
    <input id="g-valor" type="number" inputmode="numeric" value="${editando?editando.valor:''}" placeholder="0">
    <label>FECHA</label>
    <input id="g-fecha" type="date" value="${editando?fechaAStr(editando.fecha):hoy()}">
    <label>CATEGORÍA</label>
    <select id="g-categoria">
      <option value="">Sin categoría</option>
      ${cats.map(c => `<option value="${c.id}" ${editando&&editando.categoria_id===c.id?'selected':''}>${c.nombre}${c.es_ahorro?' (ahorro)':''}${c.es_mercado?' (mercado)':''}</option>`).join('')}
    </select>
    ${!editando ? `
      <label>¿SE REPITE VARIOS MESES?</label>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#0C2E54;width:auto;margin:0">
          <input type="checkbox" id="g-recurrente" style="width:auto;margin:0" onchange="toggleRecurrente()">
          Gasto recurrente
        </label>
      </div>
      <div id="g-recurrente-panel" class="hidden" style="background:#DCEAF8;border-radius:8px;padding:10px;margin-bottom:6px">
        <label style="font-size:11px;color:#1E4A7A;margin-bottom:4px;display:block">REPETIR DURANTE (meses, incluyendo este)</label>
        <div style="display:flex;align-items:center;gap:8px">
          <input id="g-meses" type="number" inputmode="numeric" min="2" max="24" value="2" placeholder="2" style="width:80px">
          <span style="font-size:12px;color:#1E4A7A">meses en total</span>
        </div>
        <p style="font-size:10px;color:#5A8AC0;margin-top:6px">⚡ Se creará una copia en cada mes siguiente automáticamente</p>
      </div>
    ` : ''}
  `);
}
function editarGasto(id) { abrirFormGasto(id); }

function toggleRecurrente() {
  const panel = $('g-recurrente-panel');
  if(panel) panel.classList.toggle('hidden', !$('g-recurrente').checked);
}

async function guardarGasto(id) {
  const concepto = $('g-concepto').value.trim();
  const valor = Number($('g-valor').value) || 0;
  const fecha = $('g-fecha').value;
  const cat_id = $('g-categoria').value || null;
  const esRecurrente = $('g-recurrente') && $('g-recurrente').checked;
  const mesesRec = esRecurrente ? (parseInt($('g-meses').value) || 2) : 1;
  if(!concepto || valor <= 0 || !fecha) { toast('Completa todos los campos'); return; }
  const data = {
    usuario_id: estado.usuario.id,
    concepto, valor, fecha,
    categoria_id: cat_id ? Number(cat_id) : null,
    mes: fecha.substring(0, 7)
  };
  if(id) {
    await sb.from('gastos').update(data).eq('id', id);
  } else {
    const { data: nuevo, error: errIns } = await sb.from('gastos').insert(data).select().single();
    if(errIns) { toast('Error al crear gasto'); console.error(errIns); return; }
    const cat = estado.data.catGasto.find(c => c.id === Number(cat_id));
    if(cat && cat.es_ahorro && nuevo) {
      await sb.from('ahorros').insert({
        usuario_id: estado.usuario.id,
        fecha, valor, lugar_id: null,
        tipo: 'deposito',
        origen_gasto_id: nuevo.id,
        mes: fecha.substring(0, 7)
      });
    }
    if(esRecurrente && mesesRec > 1) {
      const [y, m, d] = fecha.split('-').map(Number);
      const inserts = [];
      for(let i = 1; i < mesesRec; i++) {
        const fp = new Date(y, m - 1 + i, d);
        const fs = `${fp.getFullYear()}-${String(fp.getMonth()+1).padStart(2,'0')}-${String(fp.getDate()).padStart(2,'0')}`;
        inserts.push({
          usuario_id: estado.usuario.id,
          concepto, valor, fecha: fs,
          categoria_id: cat_id ? Number(cat_id) : null,
          mes: fs.substring(0, 7),
          pagado: false
        });
      }
      const { error: errRec } = await sb.from('gastos').insert(inserts);
      if(errRec) { console.error('Error recurrentes:', errRec); toast('Gasto creado, pero error al crear copias'); return; }
    }
  }
  cerrarModal();
  await cargarDatos();
  renderVista();
  toast(id ? 'Gasto actualizado' : (esRecurrente && mesesRec > 1 ? `Gasto creado · ${mesesRec} meses programados` : 'Gasto creado'));
}

async function eliminarGasto(id) {
  if(!confirm('¿Eliminar este gasto?')) return;
  // Si hay ahorro vinculado, eliminarlo también
  const ah = estado.data.ahorros.find(a => a.origen_gasto_id === id);
  if(ah) await sb.from('ahorros').delete().eq('id', ah.id);
  await sb.from('gastos').delete().eq('id', id);
  cerrarModal();
  await cargarDatos();
  renderVista();
  toast('Gasto eliminado');
}

// INGRESOS
function abrirFormIngreso(id) {
  const editando = id ? estado.data.ingresos.find(i => i.id === id) : null;
  const idNum = editando ? editando.id : null;
  abrirModal(`
    <div class="modal-header">
      <p class="modal-titulo">${editando ? 'Editar ingreso' : 'Nuevo ingreso'}</p>
      <button class="modal-cerrar" onclick="cerrarModal()">✕</button>
    </div>
    <label>TIPO</label>
    <select id="i-tipo">
      <option value="principal" ${editando&&editando.tipo==='principal'?'selected':''}>Principal (quincena)</option>
      <option value="extra" ${editando&&editando.tipo==='extra'?'selected':''}>Extra / Adicional</option>
    </select>
    <label>PERSONA / EMPRESA</label>
    <input id="i-persona" type="text" value="${editando?(editando.persona||editando.empresa||'').replace(/"/g,'&quot;'):''}" placeholder="Ej: Carlos Q1, Asesoría XYZ">
    <label>VALOR</label>
    <input id="i-valor" type="number" inputmode="numeric" value="${editando?editando.valor:''}" placeholder="0">
    <label>FECHA</label>
    <input id="i-fecha" type="date" value="${editando?fechaAStr(editando.fecha):hoy()}">
    <div class="modal-actions">
      ${idNum ? `<button class="btn-delete" onclick="eliminarIngreso(${idNum})">Eliminar</button>` : ''}
      <button class="btn-cancel" onclick="cerrarModal()">Cancelar</button>
      <button class="btn-save" onclick="guardarIngreso(${idNum||'null'})">${editando?'Guardar':'Crear'}</button>
    </div>
  `);
}
function editarIngreso(id) { abrirFormIngreso(id); }

async function guardarIngreso(id) {
  const tipo = $('i-tipo').value;
  const nombre = $('i-persona').value.trim();
  const valor = Number($('i-valor').value) || 0;
  const fecha = $('i-fecha').value;
  if(!nombre || valor <= 0 || !fecha) { toast('Completa todos los campos'); return; }
  const mesFecha = fecha.substring(0, 7);
  const data = {
    usuario_id: estado.usuario.id,
    tipo, valor, fecha,
    persona: tipo === 'principal' ? nombre : null,
    empresa: tipo === 'extra' ? nombre : null,
    mes: mesFecha
  };
  if(id) await sb.from('ingresos').update(data).eq('id', id);
  else await sb.from('ingresos').insert(data);
  cerrarModal();
  await cargarDatos();
  cambiarMes(mesFecha);
  toast(id ? 'Ingreso actualizado' : 'Ingreso creado');
}

async function eliminarIngreso(id) {
  if(!confirm('¿Eliminar este ingreso?')) return;
  await sb.from('ingresos').delete().eq('id', id);
  cerrarModal();
  await cargarDatos();
  renderVista();
  toast('Ingreso eliminado');
}

// CATEGORIAS
function renderCatChip(c, tipo) {
  const color = parseColor(c.color);
  return `<span class="cat-chip" style="background:${color.bg};color:${color.fg}" onclick="editarCategoria('${tipo}',${c.id})"><span class="punto" style="background:${color.stroke}"></span>${c.nombre}</span>`;
}

function abrirFormCategoria(tipo, id) {
  const tablaCol = tipo === 'gasto' ? 'catGasto' : tipo === 'ahorro' ? 'catAhorro' : 'catMercado';
  const editando = id ? estado.data[tablaCol].find(c => c.id === id) : null;
  const colorActual = editando ? parseColor(editando.color) : parseColor(colorAleatorio());
  abrirModal(`
    <div class="modal-header">
      <p class="modal-titulo">${editando ? 'Editar categoría' : 'Nueva categoría'}</p>
      <button class="modal-cerrar" onclick="cerrarModal()">✕</button>
    </div>
    <label>NOMBRE</label>
    <input id="c-nombre" type="text" value="${editando?editando.nombre.replace(/"/g,'&quot;'):''}" placeholder="Ej: Vivienda, Transporte">
    ${tipo === 'gasto' ? `
      <label>TIPO ESPECIAL</label>
      <select id="c-especial">
        <option value="ninguno" ${editando&&!editando.es_ahorro&&!editando.es_mercado?'selected':editando?'':'selected'}>Categoría normal</option>
        <option value="ahorro" ${editando&&editando.es_ahorro?'selected':''}>Es categoría de Ahorro (sincroniza)</option>
        <option value="mercado" ${editando&&editando.es_mercado?'selected':''}>Es categoría de Mercado (saldo)</option>
      </select>
    ` : ''}
    <label>COLOR</label>
    <div class="cats-row" id="paleta-colores">
      ${PALETA.map((p, idx) => `
        <span class="cat-chip" data-idx="${idx}" style="background:${p.bg};color:${p.fg};border:2px solid ${p.stroke===colorActual.stroke?'#0C2E54':'transparent'}" onclick="seleccionarColor(${idx})"><span class="punto" style="background:${p.stroke}"></span>color</span>
      `).join('')}
    </div>
    <input type="hidden" id="c-color" value='${JSON.stringify(colorActual)}'>
    <div class="modal-actions">
      ${editando ? `<button class="btn-delete" onclick="eliminarCategoria('${tipo}',${id})">Eliminar</button>` : ''}
      <button class="btn-cancel" onclick="cerrarModal()">Cancelar</button>
      <button class="btn-save" onclick="guardarCategoria('${tipo}',${id||'null'})">${editando?'Guardar':'Crear'}</button>
    </div>
  `);
}
function editarCategoria(tipo, id) { abrirFormCategoria(tipo, id); }

function seleccionarColor(idx) {
  const c = PALETA[idx];
  $('c-color').value = JSON.stringify(c);
  // Re-render paleta
  document.querySelectorAll('#paleta-colores .cat-chip').forEach((chip, i) => {
    chip.style.border = '2px solid ' + (i === idx ? '#0C2E54' : 'transparent');
  });
}

async function guardarCategoria(tipo, id) {
  const nombre = $('c-nombre').value.trim();
  const color = $('c-color').value;
  if(!nombre) { toast('Escribe un nombre'); return; }
  const tabla = tipo === 'gasto' ? 'categorias_gasto' : tipo === 'ahorro' ? 'categorias_ahorro' : 'categorias_mercado';
  const data = { nombre, color };
  if(tipo !== 'mercado') data.usuario_id = estado.usuario.id;
  if(tipo === 'gasto') {
    const especial = $('c-especial').value;
    data.es_ahorro = especial === 'ahorro';
    data.es_mercado = especial === 'mercado';
  }
  if(id) await sb.from(tabla).update(data).eq('id', id);
  else await sb.from(tabla).insert(data);
  cerrarModal();
  await cargarDatos();
  renderVista();
  toast(id ? 'Categoría actualizada' : 'Categoría creada');
}

async function eliminarCategoria(tipo, id) {
  if(!confirm('¿Eliminar esta categoría? Los registros que la usan se quedarán sin categoría asignada.')) return;
  const tabla = tipo === 'gasto' ? 'categorias_gasto' : tipo === 'ahorro' ? 'categorias_ahorro' : 'categorias_mercado';
  await sb.from(tabla).delete().eq('id', id);
  cerrarModal();
  await cargarDatos();
  renderVista();
  toast('Categoría eliminada');
}

// DONA POR CATEGORÍAS
function renderDonaCategorias(items, categorias, titulo) {
  const totales = {};
  let totalGeneral = 0;
  items.forEach(it => {
    const cid = it.categoria_id || 'sin';
    const valor = Number(it.valor || 0);
    totales[cid] = (totales[cid] || 0) + valor;
    totalGeneral += valor;
  });
  if(totalGeneral === 0) {
    return `<div class="card"><p class="card-titulo">${titulo}</p><div class="empty-row">Sin datos para mostrar</div></div>`;
  }
  const radio = 70, perimetro = 2 * Math.PI * radio;
  let offset = 0;
  let segmentos = '';
  let leyenda = '';
  Object.entries(totales).forEach(([cid, val]) => {
    const cat = categorias.find(c => c.id === Number(cid));
    const color = cat ? parseColor(cat.color) : {bg:'#F4F8FC', fg:'#5A8AC0', stroke:'#5A8AC0'};
    const portion = (val / totalGeneral) * perimetro;
    segmentos += `<circle cx="100" cy="100" r="${radio}" fill="none" stroke="${color.stroke}" stroke-width="40" stroke-dasharray="${portion} ${perimetro-portion}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)"/>`;
    offset += portion;
    leyenda += `
      <div class="leyenda-row">
        <span class="leyenda-cat" style="color:${color.fg}"><span class="cuadro" style="background:${color.stroke}"></span>${cat ? cat.nombre : 'Sin categoría'}</span>
        <span class="monto">${fmt(val)} · ${Math.round(val/totalGeneral*100)}%</span>
      </div>
    `;
  });
  return `
    <div class="card">
      <p class="card-titulo">${titulo.toUpperCase()}</p>
      <div class="dona-wrap">
        <svg viewBox="0 0 200 200" width="180" height="180">
          ${segmentos}
          <circle cx="100" cy="100" r="50" fill="white"/>
          <text x="100" y="92" text-anchor="middle" font-size="10" fill="#1E4A7A">TOTAL</text>
          <text x="100" y="112" text-anchor="middle" font-size="14" font-weight="500" fill="#0C2E54">${fmt(totalGeneral)}</text>
        </svg>
      </div>
      <div class="leyenda">${leyenda}</div>
    </div>
  `;
}

// GRÁFICA ANUAL DE INGRESOS
function renderGraficaAnual() {
  const year = new Date().getFullYear();
  const mesActualNum = new Date().getMonth();
  const totales = Array(12).fill(0);
  estado.data.ingresos.forEach(i => {
    const [y, m] = i.fecha.split('-');
    if(parseInt(y) === year) totales[parseInt(m)-1] += Number(i.valor);
  });
  const max = Math.max(...totales, 1);
  const totalAno = totales.reduce((s,v) => s+v, 0);
  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <p class="card-titulo" style="margin:0">INGRESOS DEL AÑO (BRUTO)</p>
        <span style="background:#DCEAF8;color:#0C2E54;font-size:11px;padding:3px 8px;border-radius:999px;font-weight:500">${fmt(totalAno)}</span>
      </div>
      <div class="barras-anuales">
        ${totales.map((v, i) => {
          const altura = max > 0 ? (v / max) * 100 : 0;
          const clase = i === mesActualNum ? 'actual' : (i < mesActualNum ? 'pasado' : '');
          return `<div class="barra-mes ${clase}"><div class="barra" style="height:${altura}%"></div><div class="label">${['E','F','M','A','M','J','J','A','S','O','N','D'][i]}</div></div>`;
        }).join('')}
      </div>
    </div>
  `;
}

// =================== TAB AHORRO ===================
function renderTabAhorro() {
  const { saldo } = calcularSaldoDisponible();
  const ings = filtrarPorMes(estado.data.ingresos);
  const principales = ings.filter(i => i.tipo === 'principal');

  // Total ahorrado a la fecha (todos los meses, no filtrado)
  const totalAhorrado = estado.data.ahorros.reduce((s, a) => {
    return s + (a.tipo === 'retiro' ? -Number(a.valor) : Number(a.valor));
  }, 0);
  const ahorrosMes = filtrarPorMes(estado.data.ahorros);

  let html = `
    <div class="card">
      <p class="card-titulo">SALDO DISPONIBLE</p>
      <p class="card-numero ${saldo<0?'negativo':''}">${fmt(saldo)}</p>
      <div class="mini-cards">
        ${principales.length === 0 ? '<div style="grid-column:span 2;color:#5A8AC0;font-size:12px;text-align:center;padding:10px">Sin ingresos</div>' :
          principales.slice(0,4).map(i => `<div class="mini-card"><p>${i.persona || 'Ingreso'}</p><p>${fmt(i.valor)}</p></div>`).join('')}
      </div>
    </div>

    <div class="tabla">
      <div class="tabla-header">
        <span>MOVIMIENTOS DE AHORRO · ${formatMes(estado.mes)}</span>
        <span>${ahorrosMes.length}</span>
      </div>
      ${ahorrosMes.length === 0 ? '<div class="empty-row">Sin movimientos este mes</div>' :
        ahorrosMes.map(a => renderFilaAhorro(a)).join('')}
      <div class="tabla-footer">
        <button class="btn-add-row" onclick="abrirFormAhorro()">+ Agregar ahorro o retiro</button>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <p class="card-titulo" style="margin:0">LUGARES DE AHORRO</p>
        <button class="btn-secondary" onclick="abrirFormCategoria('ahorro')">+ Nuevo</button>
      </div>
      <div class="cats-row">
        ${estado.data.catAhorro.length === 0 ? '<span style="font-size:12px;color:#5A8AC0">Crea tu primer lugar</span>' :
          estado.data.catAhorro.map(c => renderCatChip(c, 'ahorro')).join('')}
      </div>
    </div>

    <div class="card">
      <p class="card-titulo">AHORRADO A LA FECHA</p>
      <p class="card-numero">${fmt(totalAhorrado)}</p>
      <p style="font-size:11px;color:#5A8AC0;margin-top:-4px">Suma de todos los movimientos históricos</p>
    </div>

    ${renderDonaAhorroPorLugar()}
    ${renderGraficaAnual()}
  `;
  $('tab-content').innerHTML = html;
}

function renderFilaAhorro(a) {
  const cat = estado.data.catAhorro.find(c => c.id === a.lugar_id);
  const color = cat ? parseColor(cat.color) : null;
  const esRetiro = a.tipo === 'retiro';
  return `
    <div class="tabla-row ahorro" oncontextmenu="event.preventDefault();ctxAhorro(event,${a.id})" onclick="editarAhorro(${a.id})">
      <p style="font-size:12px;color:#0C2E54">${formatFechaCorta(a.fecha)}</p>
      ${cat ? `<span class="cat-pill" style="background:${color.bg};color:${color.fg};border-color:${color.stroke};justify-self:start">${cat.nombre}</span>`
            : `<span class="cat-pill" style="background:#F4F8FC;color:#5A8AC0;border-color:#5A8AC0;justify-self:start">Sin lugar</span>`}
      <p class="valor ${esRetiro?'retiro':''}">${esRetiro?'-':'+'}${fmt(a.valor)}</p>
    </div>
  `;
}

function ctxAhorro(e, id) {
  mostrarCtxMenu(e.clientX, e.clientY, [
    { label: 'Editar', action: () => editarAhorro(id) },
    { label: 'Eliminar', peligro: true, action: () => eliminarAhorro(id) }
  ]);
}

function abrirFormAhorro(id) {
  const editando = id ? estado.data.ahorros.find(a => a.id === id) : null;
  const lugares = estado.data.catAhorro;
  abrirModal(`
    <div class="modal-header">
      <p class="modal-titulo">${editando ? 'Editar movimiento' : 'Nuevo movimiento'}</p>
      <button class="modal-cerrar" onclick="cerrarModal()">✕</button>
    </div>
    <label>TIPO</label>
    <select id="a-tipo">
      <option value="deposito" ${editando&&editando.tipo==='deposito'?'selected':''}>Depósito (guardar)</option>
      <option value="retiro" ${editando&&editando.tipo==='retiro'?'selected':''}>Retiro (sacar)</option>
    </select>
    <label>FECHA</label>
    <input id="a-fecha" type="date" value="${editando?editando.fecha:hoy()}">
    <label>LUGAR</label>
    <select id="a-lugar">
      <option value="">Sin lugar</option>
      ${lugares.map(l => `<option value="${l.id}" ${editando&&editando.lugar_id===l.id?'selected':''}>${l.nombre}</option>`).join('')}
    </select>
    <label>VALOR</label>
    <input id="a-valor" type="number" inputmode="numeric" value="${editando?editando.valor:''}" placeholder="0">
    <div class="modal-actions">
      ${editando ? `<button class="btn-delete" onclick="eliminarAhorro(${id})">Eliminar</button>` : ''}
      <button class="btn-cancel" onclick="cerrarModal()">Cancelar</button>
      <button class="btn-save" onclick="guardarAhorro(${id||'null'})">${editando?'Guardar':'Crear'}</button>
    </div>
  `);
}
function editarAhorro(id) { abrirFormAhorro(id); }

async function guardarAhorro(id) {
  const tipo = $('a-tipo').value;
  const fecha = $('a-fecha').value;
  const lugar_id = $('a-lugar').value || null;
  const valor = Number($('a-valor').value) || 0;
  if(valor <= 0 || !fecha) { toast('Completa los campos'); return; }
  const data = {
    usuario_id: estado.usuario.id,
    tipo, fecha, valor,
    lugar_id: lugar_id ? Number(lugar_id) : null,
    mes: mesDeFecha(fecha)
  };
  if(id) {
    await sb.from('ahorros').update(data).eq('id', id);
  } else {
    const { data: nuevo } = await sb.from('ahorros').insert(data).select().single();
    // Si es retiro, crear gasto correspondiente sin categoría
    if(tipo === 'retiro' && nuevo) {
      const lugarNombre = lugar_id ? estado.data.catAhorro.find(c => c.id === Number(lugar_id))?.nombre : 'Ahorro';
      await sb.from('gastos').insert({
        usuario_id: estado.usuario.id,
        concepto: `Retiro de ${lugarNombre || 'ahorro'}`,
        valor, fecha,
        categoria_id: null,
        pagado: false,
        mes: mesDeFecha(fecha),
        origen_ahorro_id: nuevo.id
      });
    }
  }
  cerrarModal();
  await cargarDatos();
  renderVista();
  toast(id ? 'Actualizado' : (tipo==='retiro'?'Retiro registrado · agregado a Agenda':'Ahorro registrado'));
}

async function eliminarAhorro(id) {
  if(!confirm('¿Eliminar este movimiento?')) return;
  // Si tiene gasto vinculado, eliminarlo
  const gv = estado.data.gastos.find(g => g.origen_ahorro_id === id);
  if(gv) await sb.from('gastos').delete().eq('id', gv.id);
  await sb.from('ahorros').delete().eq('id', id);
  cerrarModal();
  await cargarDatos();
  renderVista();
  toast('Eliminado');
}

function renderDonaAhorroPorLugar() {
  const totales = {};
  let total = 0;
  estado.data.ahorros.forEach(a => {
    const lid = a.lugar_id || 'sin';
    const v = a.tipo === 'retiro' ? -Number(a.valor) : Number(a.valor);
    totales[lid] = (totales[lid] || 0) + v;
  });
  Object.entries(totales).forEach(([k,v]) => { if(v>0) total += v; });
  if(total === 0) return `<div class="card"><p class="card-titulo">DISTRIBUCIÓN DE AHORROS</p><div class="empty-row">Sin ahorros activos</div></div>`;
  const radio = 70, perim = 2 * Math.PI * radio;
  let offset = 0; let segs = ''; let ley = '';
  Object.entries(totales).forEach(([lid, val]) => {
    if(val <= 0) return;
    const lugar = estado.data.catAhorro.find(c => c.id === Number(lid));
    const color = lugar ? parseColor(lugar.color) : {bg:'#F4F8FC',fg:'#5A8AC0',stroke:'#5A8AC0'};
    const portion = (val/total) * perim;
    segs += `<circle cx="100" cy="100" r="${radio}" fill="none" stroke="${color.stroke}" stroke-width="40" stroke-dasharray="${portion} ${perim-portion}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)"/>`;
    offset += portion;
    ley += `<div class="leyenda-row"><span class="leyenda-cat" style="color:${color.fg}"><span class="cuadro" style="background:${color.stroke}"></span>${lugar?lugar.nombre:'Sin lugar'}</span><span class="monto">${fmt(val)} · ${Math.round(val/total*100)}%</span></div>`;
  });
  return `
    <div class="card">
      <p class="card-titulo">DISTRIBUCIÓN POR LUGAR</p>
      <div class="dona-wrap">
        <svg viewBox="0 0 200 200" width="180" height="180">
          ${segs}
          <circle cx="100" cy="100" r="50" fill="white"/>
          <text x="100" y="92" text-anchor="middle" font-size="10" fill="#1E4A7A">TOTAL</text>
          <text x="100" y="112" text-anchor="middle" font-size="14" font-weight="500" fill="#0C2E54">${fmt(total)}</text>
        </svg>
      </div>
      <div class="leyenda">${ley}</div>
    </div>
  `;
}

// ============================================
// VISTA MERCADO
// ============================================
function renderMercado() {
  // Cargar TODOS los gastos con categoría es_mercado de TODOS los usuarios para el saldo
  // Pero como gastos son privados por usuario, sumamos los del usuario actual
  // Saldo = suma de gastos con categoria.es_mercado del mes seleccionado
  const catsMercado = estado.data.catGasto.filter(c => c.es_mercado);
  const idsMercado = catsMercado.map(c => c.id);
  const gastosMercado = filtrarPorMes(estado.data.gastos).filter(g => idsMercado.includes(g.categoria_id));
  const presupuestado = gastosMercado.reduce((s,g) => s + Number(g.valor), 0);

  const productos = filtrarPorMes(estado.data.productos);
  const gastado = productos.reduce((s,p) => s + Number(p.valor), 0);
  const saldo = presupuestado - gastado;
  const pct = presupuestado > 0 ? Math.min(100, (gastado/presupuestado)*100) : 0;
  const pctClass = pct > 100 ? 'peligro' : pct > 80 ? 'alerta' : '';

  // Agrupar productos por día
  const porDia = {};
  productos.forEach(p => {
    if(!porDia[p.fecha]) porDia[p.fecha] = [];
    porDia[p.fecha].push(p);
  });
  const fechasOrdenadas = Object.keys(porDia).sort((a,b) => b.localeCompare(a));

  let tablaHTML = '';
  if(estado.mes === 'acumulado') {
    tablaHTML = renderMercadoAcumulado();
  } else if(productos.length === 0) {
    tablaHTML = '<div class="empty-row">Sin productos registrados este mes</div>';
  } else {
    const fechaHoyStr = hoy();
    fechasOrdenadas.forEach(f => {
      const totalDia = porDia[f].reduce((s,p) => s + Number(p.valor), 0);
      const diaId = `dia-det-${f.replace(/-/g,'')}`;
      let expandido;
      if(estado.diasMercadoExpandidos.hasOwnProperty(diaId)) {
        expandido = estado.diasMercadoExpandidos[diaId];
      } else {
        expandido = f >= fechaHoyStr;
      }
      tablaHTML += `
        <div class="dia-header" onclick="toggleDiaMercado('${diaId}')" style="cursor:pointer">
          <span>${formatFechaLarga(f)}</span>
          <span style="display:flex;align-items:center;gap:8px">
            <span>${fmt(totalDia)}</span>
            <span id="ico-${diaId}" style="font-size:10px;color:#5A8AC0">${expandido?'▲':'▼'}</span>
          </span>
        </div>
        <div id="${diaId}" ${expandido?'':'class="hidden"'}>
          ${porDia[f].map(p => {
            const cat = estado.data.catMercado.find(c => c.id === p.categoria_id);
            const color = cat ? parseColor(cat.color) : null;
            return `
              <div class="tabla-row producto" oncontextmenu="event.preventDefault();ctxProducto(event,${p.id})" onclick="editarProducto(${p.id})">
                <div>
                  <p class="concepto">${p.nombre}</p>
                  ${cat ? `<span class="cat-pill" style="background:${color.bg};color:${color.fg};border-color:${color.stroke}">${cat.nombre}</span>` : ''}
                </div>
                <p class="valor">${fmt(p.valor)}</p>
              </div>
            `;
          }).join('')}
        </div>
      `;
    });
  }

  $('vista-contenedor').innerHTML = `
    ${renderHeader('Mercado')}

    <div class="card">
      <p class="card-titulo">SALDO DISPONIBLE PARA MERCADO</p>
      <p class="card-numero ${saldo<0?'negativo':''}">${fmt(saldo)}</p>
      <div class="mini-cards">
        <div class="mini-card"><p>Presupuestado</p><p>${fmt(presupuestado)}</p></div>
        <div class="mini-card gastado"><p>Gastado</p><p>${fmt(gastado)}</p></div>
      </div>
      <div class="progress-bar"><div class="progress-fill ${pctClass}" style="width:${Math.min(100,pct)}%"></div></div>
      <p class="progress-text">${Math.round(pct)}% del presupuesto usado</p>
    </div>

    <div class="tabla">
      <div class="tabla-header">
        <span>PRODUCTOS COMPRADOS</span>
        ${estado.mes !== 'acumulado' ? `<button class="btn-secondary" onclick="abrirFormProducto()">+ Agregar</button>` : `<span>${productos.length} ${productos.length===1?'producto':'productos'}</span>`}
      </div>
      ${tablaHTML}
    </div>

    <div class="tarjeta-total">
      <p>TOTAL ${estado.mes === 'acumulado' ? 'HISTÓRICO' : 'ACUMULADO DEL MES'}</p>
      <p>${fmt(gastado)}</p>
      <p>${fechasOrdenadas.length} ${fechasOrdenadas.length===1?'día':'días'} · ${productos.length} ${productos.length===1?'producto':'productos'}</p>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <p class="card-titulo" style="margin:0">CATEGORÍAS DE MERCADO</p>
        <button class="btn-secondary" onclick="abrirFormCategoria('mercado')">+ Nueva</button>
      </div>
      <div class="cats-row">
        ${estado.data.catMercado.length === 0 ? '<span style="font-size:12px;color:#5A8AC0">Crea tu primera categoría</span>' :
          estado.data.catMercado.map(c => renderCatChip(c, 'mercado')).join('')}
      </div>
    </div>
  `;
}

function renderMercadoAcumulado() {
  // Agrupar productos por mes
  const porMes = {};
  estado.data.productos.forEach(p => {
    if(!porMes[p.mes]) porMes[p.mes] = { productos: [], total: 0 };
    porMes[p.mes].productos.push(p);
    porMes[p.mes].total += Number(p.valor);
  });
  const mesesOrdenados = Object.keys(porMes).sort((a,b) => b.localeCompare(a));
  if(mesesOrdenados.length === 0) return '<div class="empty-row">Sin compras registradas</div>';

  return mesesOrdenados.map(mes => {
    const datos = porMes[mes];
    return `
      <div class="dia-header" onclick="toggleMesAcumulado('${mes}')" style="cursor:pointer">
        <span>${formatMes(mes)} <span style="color:#5A8AC0;font-weight:normal">· ${datos.productos.length} productos</span></span>
        <span>${fmt(datos.total)}</span>
      </div>
      <div id="mes-detalle-${mes}" class="hidden">
        ${datos.productos.map(p => {
          const cat = estado.data.catMercado.find(c => c.id === p.categoria_id);
          const color = cat ? parseColor(cat.color) : null;
          return `
            <div class="tabla-row producto" style="background:#FBFCFE" onclick="editarProducto(${p.id})">
              <div>
                <p class="concepto" style="font-size:13px">${p.nombre} <span style="color:#5A8AC0;font-size:11px">· ${formatFechaCorta(p.fecha)}</span></p>
                ${cat ? `<span class="cat-pill" style="background:${color.bg};color:${color.fg};border-color:${color.stroke}">${cat.nombre}</span>` : ''}
              </div>
              <p class="valor">${fmt(p.valor)}</p>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');
}

function toggleMesAcumulado(mes) {
  const div = $(`mes-detalle-${mes}`);
  if(div) div.classList.toggle('hidden');
}

function toggleDiaMercado(diaId) {
  const div = $(diaId);
  const ico = $(`ico-${diaId}`);
  if(!div) return;
  const oculto = div.classList.toggle('hidden');
  estado.diasMercadoExpandidos[diaId] = !oculto;
  if(ico) ico.textContent = oculto ? '▼' : '▲';
}

function ctxProducto(e, id) {
  mostrarCtxMenu(e.clientX, e.clientY, [
    { label: 'Editar', action: () => editarProducto(id) },
    { label: 'Eliminar', peligro: true, action: () => eliminarProducto(id) }
  ]);
}

function abrirFormProducto(id) {
  const editando = id ? estado.data.productos.find(p => p.id === id) : null;
  abrirModal(`
    <div class="modal-header">
      <p class="modal-titulo">${editando ? 'Editar producto' : 'Nuevo producto'}</p>
      <button class="modal-cerrar" onclick="cerrarModal()">✕</button>
    </div>
    <div class="modal-actions" style="margin-bottom:14px">
      ${editando ? `<button class="btn-delete" onclick="eliminarProducto(${id})">Eliminar</button>` : ''}
      <button class="btn-cancel" onclick="cerrarModal()">Cancelar</button>
      <button class="btn-save" onclick="guardarProducto(${id||'null'})">${editando?'Guardar':'Crear'}</button>
    </div>
    <label>NOMBRE</label>
    <input id="p-nombre" type="text" value="${editando?editando.nombre.replace(/"/g,'&quot;'):''}" placeholder="Ej: Pollo entero">
    <label>VALOR</label>
    <input id="p-valor" type="number" inputmode="numeric" value="${editando?editando.valor:''}" placeholder="0">
    <label>CATEGORÍA</label>
    <select id="p-categoria">
      <option value="">Sin categoría</option>
      ${estado.data.catMercado.map(c => `<option value="${c.id}" ${editando&&editando.categoria_id===c.id?'selected':''}>${c.nombre}</option>`).join('')}
    </select>
    ${editando ? `<label>FECHA</label><input id="p-fecha" type="date" value="${fechaAStr(editando.fecha)}">` : ''}
  `);
}
function editarProducto(id) { abrirFormProducto(id); }

async function guardarProducto(id) {
  const nombre = $('p-nombre').value.trim();
  const valor = Number($('p-valor').value) || 0;
  const cat_id = $('p-categoria').value || null;
  if(!nombre || valor <= 0) { toast('Completa los campos'); return; }
  const fechaInput = $('p-fecha');
  const fecha = id && fechaInput ? fechaInput.value : hoy();
  const data = {
    nombre, valor, fecha,
    categoria_id: cat_id ? Number(cat_id) : null,
    mes: mesDeFecha(fecha),
    registrado_por: estado.usuario.id
  };
  if(id) await sb.from('productos_mercado').update(data).eq('id', id);
  else await sb.from('productos_mercado').insert(data);
  cerrarModal();
  await cargarDatos();
  renderVista();
  toast(id ? 'Producto actualizado' : 'Producto registrado');
}

async function eliminarProducto(id) {
  if(!confirm('¿Eliminar este producto?')) return;
  await sb.from('productos_mercado').delete().eq('id', id);
  cerrarModal();
  await cargarDatos();
  renderVista();
  toast('Producto eliminado');
}

// ============================================
// VISTA MENÚS - CALENDARIO
// ============================================
function renderMenus() {
  if(estado.mes === 'acumulado') estado.mes = mesActual();
  if(!estado.diaSeleccionadoMenu || mesDeFecha(estado.diaSeleccionadoMenu) !== estado.mes) {
    estado.diaSeleccionadoMenu = `${estado.mes}-01`;
  }

  const menus = filtrarPorMes(estado.data.menus);
  const todosLosFavoritos = estado.data.menus.filter(m => m.favorita);

  $('vista-contenedor').innerHTML = `
    ${renderHeader('Menús')}
    <button class="btn-primary" style="margin-bottom:14px" onclick="abrirFormMenu()">+ Crear comida</button>
    ${todosLosFavoritos.length > 0 ? `
      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="toggleFavoritasPanel()">
          <p class="card-titulo" style="margin:0">⭐ MIS FAVORITAS <span style="color:#5A8AC0;font-weight:normal">(${todosLosFavoritos.length})</span></p>
          <span id="ico-favs" style="font-size:12px;color:#5A8AC0">▼</span>
        </div>
        <div id="panel-favs" class="hidden" style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
          ${todosLosFavoritos.map(f => `
            <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#FFFBF2;border:1px solid #F0D4A0;border-radius:8px;cursor:pointer" onclick="abrirFormMenu(${f.id})">
              <span style="font-size:14px">${f.tipo==='desayuno'?'🌅':f.tipo==='almuerzo'?'🌞':'🌙'}</span>
              <span style="flex:1;font-size:13px;color:#0C2E54;font-weight:500">${f.nombre}</span>
              ${f.video_url ? '<span style="font-size:10px;color:#534AB7">▶</span>' : ''}
              <span style="font-size:10px;color:#854F0B;text-transform:uppercase;background:#FAEEDA;padding:2px 6px;border-radius:999px">${f.tipo}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    <div class="card">
      ${renderCalendario(menus)}
    </div>
    <div class="card" id="dia-seleccionado-panel">
      ${renderPanelDia(menus)}
    </div>
  `;
}

function toggleFavoritasPanel() {
  const panel = $('panel-favs');
  const ico = $('ico-favs');
  if(!panel) return;
  const oculto = panel.classList.toggle('hidden');
  if(ico) ico.textContent = oculto ? '▼' : '▲';
}

function renderCalendario(menus) {
  const [year, month] = estado.mes.split('-').map(Number);
  const primerDia = new Date(year, month-1, 1);
  const ultimoDia = new Date(year, month, 0);
  const totalDias = ultimoDia.getDate();
  // getDay: 0=Domingo, 1=Lunes... convertimos a L=0 ... D=6
  let diaInicio = primerDia.getDay() - 1;
  if(diaInicio < 0) diaInicio = 6;

  // Días del mes anterior visibles
  const mesAnterior = new Date(year, month-2, 0).getDate();
  const celdas = [];
  for(let i = diaInicio - 1; i >= 0; i--) {
    celdas.push({ num: mesAnterior - i, otroMes: true, fecha: null });
  }
  for(let d = 1; d <= totalDias; d++) {
    const fecha = `${estado.mes}-${String(d).padStart(2,'0')}`;
    celdas.push({ num: d, otroMes: false, fecha });
  }
  // Llenar hasta múltiplo de 7
  while(celdas.length % 7 !== 0) {
    celdas.push({ num: celdas.length - totalDias - diaInicio + 1, otroMes: true, fecha: null });
  }

  const fechaHoy = hoy();

  return `
    <div class="cal-header">
      <p>L</p><p>M</p><p>M</p><p>J</p><p>V</p><p>S</p><p>D</p>
    </div>
    <div class="cal-grid">
      ${celdas.map(c => {
        if(c.otroMes) {
          return `<div class="cal-day otro-mes"><span class="num">${c.num}</span></div>`;
        }
        const menusDelDia = menus.filter(m => m.fecha === c.fecha);
        const tipos = [...new Set(menusDelDia.map(m => m.tipo))];
        const colores = { desayuno: '#EF9F27', almuerzo: '#1D9E75', cena: '#7F77DD' };
        return `
          <div class="cal-day ${c.fecha === fechaHoy ? 'hoy':''} ${c.fecha === estado.diaSeleccionadoMenu ? 'activo':''}" onclick="seleccionarDiaCal('${c.fecha}')">
            <span class="num">${c.num}</span>
            <div class="puntos">
              ${tipos.map(t => `<div class="punto" style="background:${colores[t]}"></div>`).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
    <div class="cal-leyenda">
      <span style="color:#854F0B"><span class="punto" style="background:#EF9F27"></span>Desayuno</span>
      <span style="color:#0F6E56"><span class="punto" style="background:#1D9E75"></span>Almuerzo</span>
      <span style="color:#3C3489"><span class="punto" style="background:#7F77DD"></span>Cena</span>
    </div>
  `;
}

function seleccionarDiaCal(fecha) {
  estado.diaSeleccionadoMenu = fecha;
  renderMenus();
}

function renderPanelDia(menus) {
  const fecha = estado.diaSeleccionadoMenu;
  const delDia = menus.filter(m => m.fecha === fecha);
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <p class="card-titulo" style="margin:0">DÍA SELECCIONADO</p>
        <p style="font-size:14px;font-weight:500;color:#0C2E54;margin-top:2px">${formatFechaLarga(fecha)}</p>
      </div>
      <button class="btn-secondary" onclick="abrirFormMenu(null,'${fecha}')">+ Agregar</button>
    </div>
    ${delDia.length === 0 ? '<div class="empty-row">Sin comidas planificadas</div>' :
      delDia.sort((a,b) => {
        const orden = {desayuno:0, almuerzo:1, cena:2};
        return orden[a.tipo] - orden[b.tipo];
      }).map(m => renderMenuCard(m)).join('')}
  `;
}

function renderMenuCard(m) {
  const tiposLabel = { desayuno: 'DESAYUNO', almuerzo: 'ALMUERZO', cena: 'CENA' };
  return `
    <div class="menu-card ${m.tipo}" onclick="abrirFormMenu(${m.id})" oncontextmenu="event.preventDefault();ctxMenu(event,${m.id})">
      <div style="flex:1;min-width:0">
        <span class="tipo-pill">${tiposLabel[m.tipo]}</span>
        <p class="nombre">${m.nombre}</p>
        ${m.video_url ? '<span class="video-tag">▶ Con video</span>' : ''}
      </div>
      <div class="lado">
        <span class="estrella ${m.favorita?'':'vacia'}">${m.favorita?'★':'☆'}</span>
        <span class="estado ${m.preparada?'preparada':'pendiente'}">${m.preparada?'✓':'⏳'}</span>
      </div>
    </div>
  `;
}

function ctxMenu(e, id) {
  mostrarCtxMenu(e.clientX, e.clientY, [
    { label: 'Editar', action: () => abrirFormMenu(id) },
    { label: 'Eliminar', peligro: true, action: () => eliminarMenu(id) }
  ]);
}

function abrirFormMenu(id, fechaPredef) {
  const editando = id ? estado.data.menus.find(m => m.id === id) : null;
  const fecha = editando ? fechaAStr(editando.fecha) : (fechaPredef || estado.diaSeleccionadoMenu || hoy());
  const favoritos = estado.data.menus.filter(m => m.favorita);
  const tienesFavs = favoritos.length > 0;

  abrirModal(`
    <div class="modal-header">
      <p class="modal-titulo">${editando ? 'Editar comida' : 'Nueva comida'}</p>
      <button class="modal-cerrar" onclick="cerrarModal()">✕</button>
    </div>
    ${!editando && tienesFavs ? `
      <div style="background:#FAEEDA;border-radius:10px;padding:10px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="toggleFavsModal()">
          <p style="font-size:11px;color:#854F0B;font-weight:500;margin:0">⭐ USAR UN FAVORITO <span style="color:#BA7517;font-weight:normal">(${favoritos.length})</span></p>
          <span id="ico-favs-modal" style="font-size:11px;color:#854F0B">▼</span>
        </div>
        <div id="panel-favs-modal" class="hidden" style="margin-top:8px;display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto">
          ${favoritos.map(f => `
            <button onclick="usarFavorito(${f.id})" style="background:white;border:1px solid #F0D4A0;border-radius:8px;padding:8px 10px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:8px">
              <span style="font-size:13px">${f.tipo==='desayuno'?'🌅':f.tipo==='almuerzo'?'🌞':'🌙'}</span>
              <span style="font-size:13px;color:#0C2E54;font-weight:500;flex:1">${f.nombre}</span>
              <span style="font-size:10px;color:#854F0B;text-transform:uppercase">${f.tipo}</span>
            </button>
          `).join('')}
        </div>
      </div>
    ` : ''}
    <label>TIPO DE COMIDA</label>
    <select id="m-tipo">
      <option value="desayuno" ${editando&&editando.tipo==='desayuno'?'selected':''}>🌅 Desayuno</option>
      <option value="almuerzo" ${editando&&editando.tipo==='almuerzo'?'selected':''}>🌞 Almuerzo</option>
      <option value="cena" ${editando&&editando.tipo==='cena'?'selected':''}>🌙 Cena</option>
    </select>
    <label>FECHA</label>
    <input id="m-fecha" type="date" value="${fecha}">
    <label>NOMBRE DE LA COMIDA</label>
    <input id="m-nombre" type="text" value="${editando?editando.nombre.replace(/"/g,'&quot;'):''}" placeholder="Ej: Arroz con pollo">
    <label>DESCRIPCIÓN / RECETA</label>
    <textarea id="m-desc" rows="4" placeholder="Pasos, ingredientes, notas...">${editando?editando.descripcion||'':''}</textarea>
    <label>LINK DE VIDEO (OPCIONAL)</label>
    <input id="m-video" type="url" value="${editando?editando.video_url||'':''}" placeholder="YouTube, TikTok, Instagram...">
    <div id="m-video-preview"></div>
    ${editando ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
        <button class="btn-toggle ${editando.preparada?'activo':''}" onclick="toggleMenuPreparada(${id})">${editando.preparada?'✓ Preparada':'Marcar preparada'}</button>
        <button class="btn-toggle fav ${editando.favorita?'activo':''}" onclick="toggleMenuFav(${id})">${editando.favorita?'★ Favorita':'☆ Favorita'}</button>
      </div>
    ` : ''}
    <div class="modal-actions">
      ${editando ? `<button class="btn-delete" onclick="eliminarMenu(${id})">Eliminar</button>` : ''}
      <button class="btn-cancel" onclick="cerrarModal()">Cancelar</button>
      <button class="btn-save" onclick="guardarMenu(${id||'null'})">${editando?'Guardar':'Crear'}</button>
    </div>
  `);
  $('m-video').addEventListener('input', e => previewVideo(e.target.value));
  if(editando && editando.video_url) previewVideo(editando.video_url);
}

function toggleFavsModal() {
  const panel = $('panel-favs-modal');
  const ico = $('ico-favs-modal');
  if(!panel) return;
  panel.classList.toggle('hidden');
  if(ico) ico.textContent = panel.classList.contains('hidden') ? '▼' : '▲';
}

function usarFavorito(id) {
  const fav = estado.data.menus.find(m => m.id === id);
  if(!fav) return;
  if($('m-tipo')) $('m-tipo').value = fav.tipo;
  if($('m-nombre')) $('m-nombre').value = fav.nombre;
  if($('m-desc')) $('m-desc').value = fav.descripcion || '';
  if($('m-video')) { $('m-video').value = fav.video_url || ''; previewVideo(fav.video_url || ''); }
  toast(`"${fav.nombre}" cargado`);
}

function previewVideo(url) {
  const cont = $('m-video-preview');
  if(!cont || !url) { if(cont) cont.innerHTML = ''; return; }
  let html = '';
  try {
    // YouTube
    let ytId = null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if(ytMatch) ytId = ytMatch[1];
    if(ytId) {
      html = `
        <div class="video-preview">
          <img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="">
          <div class="info">▶ YouTube</div>
        </div>
      `;
    } else if(url.includes('tiktok.com')) {
      html = `<div class="video-preview"><div class="info">▶ TikTok · <a href="${url}" target="_blank" style="color:#378ADD">Abrir video</a></div></div>`;
    } else if(url.includes('instagram.com')) {
      html = `<div class="video-preview"><div class="info">▶ Instagram · <a href="${url}" target="_blank" style="color:#378ADD">Abrir reel/post</a></div></div>`;
    } else if(url.startsWith('http')) {
      html = `<div class="video-preview"><div class="info">🔗 <a href="${url}" target="_blank" style="color:#378ADD;word-break:break-all">${url}</a></div></div>`;
    }
  } catch(e) {}
  cont.innerHTML = html;
}

async function guardarMenu(id) {
  const tipo = $('m-tipo').value;
  const fecha = $('m-fecha').value;
  const nombre = $('m-nombre').value.trim();
  const desc = $('m-desc').value.trim();
  const video = $('m-video').value.trim();
  if(!nombre || !fecha) { toast('Completa nombre y fecha'); return; }
  const data = {
    tipo, fecha, nombre,
    descripcion: desc || null,
    video_url: video || null,
    mes: mesDeFecha(fecha),
    creado_por: estado.usuario.id
  };
  if(id) await sb.from('menus').update(data).eq('id', id);
  else await sb.from('menus').insert(data);
  estado.diaSeleccionadoMenu = fecha;
  estado.mes = mesDeFecha(fecha);
  cerrarModal();
  await cargarDatos();
  renderVista();
  toast(id ? 'Comida actualizada' : 'Comida creada');
}

async function toggleMenuPreparada(id) {
  const m = estado.data.menus.find(x => x.id === id);
  if(!m) return;
  await sb.from('menus').update({preparada: !m.preparada}).eq('id', id);
  m.preparada = !m.preparada;
  abrirFormMenu(id);
  toast(m.preparada ? 'Marcada preparada' : 'Marcada pendiente');
}

async function toggleMenuFav(id) {
  const m = estado.data.menus.find(x => x.id === id);
  if(!m) return;
  await sb.from('menus').update({favorita: !m.favorita}).eq('id', id);
  m.favorita = !m.favorita;
  abrirFormMenu(id);
  toast(m.favorita ? 'Agregada a favoritas' : 'Quitada de favoritas');
}

async function eliminarMenu(id) {
  if(!confirm('¿Eliminar esta comida?')) return;
  await sb.from('menus').delete().eq('id', id);
  cerrarModal();
  await cargarDatos();
  renderVista();
  toast('Comida eliminada');
}
