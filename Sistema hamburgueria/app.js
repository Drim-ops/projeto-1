const initialTables = [
  { id: 1, status: 'available', seats: 2 },
  { id: 2, status: 'occupied', seats: 4, guests: 3, since: '19:42', orderFinalized: true, order: [{ name: 'Brasa Classic', price: 24.9, quantity: 2, extras: [{ name: 'Queijo extra', price: 3.5, quantity: 1 }], observation: 'Sem salada' }, { name: 'Batata frita', price: 12, quantity: 1 }] },
  { id: 3, status: 'available', seats: 4 },
  { id: 4, status: 'reserved', seats: 2, guests: 2, reservation: '20:30', reservationName: 'Mariana Costa' },
  { id: 5, status: 'occupied', seats: 6, guests: 5, since: '19:18', orderFinalized: true, order: [{ name: 'Duplo Cheddar', price: 32.9, quantity: 3, extras: [{ name: 'Queijo extra', price: 3.5, quantity: 2 }], observation: 'Bastante queijo' }, { name: 'Refrigerante lata', price: 6, quantity: 2 }] },
  { id: 6, status: 'available', seats: 2 },
  { id: 7, status: 'available', seats: 4 },
  { id: 8, status: 'occupied', seats: 4, guests: 2, since: '20:05', orderFinalized: true, order: [{ name: 'Brasa Bacon', price: 29.9, quantity: 2 }] },
];
const labels = { available: 'Disponível', occupied: 'Ocupada', reserved: 'Reservada' };
const menu = [
  { name: 'Brasa Classic', price: 24.9 },
  { name: 'Duplo Cheddar', price: 32.9 },
  { name: 'Brasa Bacon', price: 29.9 },
  { name: 'Batata frita', price: 12 },
  { name: 'Refrigerante lata', price: 6, category: 'drink' },
];
const extrasMenu = [
  { name: 'Queijo extra', price: 3.5 },
  { name: 'Bacon extra', price: 5 },
  { name: 'Hambúrguer extra', price: 8 },
];
const storageKey = 'brasa-tables-v1';
let tables = loadTables();
let activeFilter = 'all';
let selectedId = null;
let draftOrder = [];
let currentRole = localStorage.getItem('brasa-demo-role-v1') === 'waiter' ? 'waiter' : 'admin';
let currentPage = location.hash === '#mesas' ? 'mesas' : location.hash === '#estoque' && currentRole === 'admin' ? 'estoque' : 'inicio';
const inventoryStorageKey = 'brasa-inventory-v1';
const movementStorageKey = 'brasa-inventory-movements-v1';
const initialInventory = [
  { id: 1, name: 'Pão brioche', unit: 'un', quantity: 38, minimum: 12, unitCost: 1.85, sampleCost: true },
  { id: 2, name: 'Hambúrguer 160 g', unit: 'un', quantity: 28, minimum: 10, unitCost: 6.5, sampleCost: true },
  { id: 3, name: 'Queijo cheddar', unit: 'fatias', quantity: 46, minimum: 15, unitCost: 0.85, sampleCost: true },
  { id: 4, name: 'Bacon', unit: 'porções', quantity: 7, minimum: 8, unitCost: 2.4, sampleCost: true },
  { id: 5, name: 'Batata', unit: 'kg', quantity: 9, minimum: 3, unitCost: 6.9, sampleCost: true },
  { id: 6, name: 'Refrigerante lata', unit: 'un', quantity: 22, minimum: 8, unitCost: 3.5, sampleCost: true },
];
function loadInventory() {
  try {
    const saved = JSON.parse(localStorage.getItem(inventoryStorageKey));
    if (!Array.isArray(saved)) return structuredClone(initialInventory);
    return saved.map(item => {
      if (item.unitCost !== undefined && item.unitCost !== null) return item;
      const sample = initialInventory.find(example => example.name === item.name && example.unit === item.unit);
      return sample ? { ...item, unitCost: sample.unitCost, sampleCost: true } : { ...item, unitCost: null, sampleCost: false };
    });
  } catch { return structuredClone(initialInventory); }
}
function loadStockMovements() {
  try {
    const saved = JSON.parse(localStorage.getItem(movementStorageKey));
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}
let inventory = loadInventory();
let stockMovements = loadStockMovements();
const grid = document.querySelector('#table-grid');
const dialog = document.querySelector('#table-dialog');

function loadTables() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return migrateTables(Array.isArray(saved) && saved.length ? saved : structuredClone(initialTables));
  } catch { return migrateTables(structuredClone(initialTables)); }
}
function migrateTables(source) {
  return source.map(table => {
    if (!Array.isArray(table.orders) && table.orderFinalized && Array.isArray(table.order)) {
      table.orders = [{ items: table.order, finalizedAt: table.since || '' }];
    }
    delete table.order;
    delete table.orderFinalized;
    return table;
  });
}
function persist() { localStorage.setItem(storageKey, JSON.stringify(tables)); }
function safeText(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function tableById(id) { return tables.find(table => table.id === id); }
function memberIds(table) {
  const ids = Array.isArray(table.joinedTableIds) ? table.joinedTableIds : [table.id];
  return [...new Set(ids.filter(id => tableById(id)).concat(table.id))].sort((a, b) => a - b);
}
function groupMembers(table) { return memberIds(table).map(tableById).filter(Boolean); }
function tableUnits() {
  const seen = new Set();
  return tables.map(table => {
    const members = groupMembers(table);
    const ids = members.map(member => member.id);
    const key = ids.join('-');
    if (seen.has(key)) return null;
    seen.add(key);
    return { table: members[0], members, ids };
  }).filter(Boolean);
}
function tableLabel(ids) { return ids.length > 1 ? `Mesas ${ids.map(id => String(id).padStart(2, '0')).join(' + ')}` : `Mesa ${String(ids[0]).padStart(2, '0')}`; }
function render() {
  document.querySelector('#role-select').value = currentRole;
  document.querySelectorAll('.admin-only').forEach(element => { element.hidden = currentRole !== 'admin'; });
  document.querySelector('.profile strong').textContent = currentRole === 'admin' ? 'Administrador' : 'Garçom';
  document.querySelector('.avatar').textContent = currentRole === 'admin' ? 'AD' : 'GR';
  document.querySelector('.top-avatar').textContent = currentRole === 'admin' ? 'AD' : 'GR';
  const units = tableUnits();
  const counts = { all: tables.length, available: 0, occupied: 0, reserved: 0 };
  tables.forEach(table => counts[table.status]++);
  document.querySelector('#total-count').textContent = counts.all;
  document.querySelector('#available-count').textContent = counts.available;
  document.querySelector('#occupied-count').textContent = counts.occupied;
  document.querySelector('#reserved-count').textContent = counts.reserved;
  document.querySelector('#nav-open-count').textContent = counts.occupied;
  document.querySelector('#all-filter-count').textContent = units.length;
  const query = document.querySelector('#search').value.trim().toLowerCase();
  const visible = units.filter(unit => (activeFilter === 'all' || unit.table.status === activeFilter) && `${tableLabel(unit.ids)} ${unit.ids.map(id => `mesa ${String(id).padStart(2, '0')}`).join(' ')}`.toLowerCase().includes(query));
  document.querySelector('#empty-state').hidden = visible.length > 0;
  grid.innerHTML = visible.map(({ table, members, ids }) => {
    const seats = members.reduce((sum, member) => sum + member.seats, 0);
    let detail = 'Pronta para atendimento';
    let extra = '';
    if (table.status === 'occupied') { detail = `${table.guests || 1} ${table.guests === 1 ? 'pessoa' : 'pessoas'}`; extra = `Desde ${safeText(table.since || 'agora')}`; }
    if (table.status === 'reserved') { detail = `${table.guests || 1} ${table.guests === 1 ? 'pessoa' : 'pessoas'}`; extra = `Às ${safeText(table.reservation || 'a confirmar')}`; }
    return `<button class="table-card" data-table-id="${table.id}" aria-label="${tableLabel(ids)}, ${labels[table.status]}">
      <span class="card-top"><span class="table-name">${tableLabel(ids)}</span><span class="status-pill pill-${table.status}">${labels[table.status]}</span></span>
      <span class="card-meta"><span class="card-guest">♙ ${safeText(detail)}</span><strong>${seats} lugares</strong></span>
      ${table.status === 'reserved' ? `<span class="reservation-person">♙ ${safeText(table.reservationName || 'Nome não informado')}</span>` : ''}
      ${extra ? `<span class="card-meta card-time">${extra}</span>` : ''}</button>`;
  }).join('');
  grid.querySelectorAll('[data-table-id]').forEach(card => card.addEventListener('click', () => openTable(Number(card.dataset.tableId))));
  renderOverview();
  renderInventory();
}
function allClosedServices() {
  return tables.flatMap(table => (table.closedServices || []).map(service => ({
    ...service,
    tableName: service.tableName || tableLabel(memberIds(table)),
  })));
}
function serviceDate(service) {
  if (service.closedAtISO) return new Date(service.closedAtISO);
  const match = String(service.closedAt || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : null;
}
function dateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function isOnDate(date, selectedDate) { return Boolean(date && !Number.isNaN(date.getTime()) && dateInputValue(date) === selectedDate); }
function renderOverview() {
  const units = tableUnits();
  const dateField = document.querySelector('#overview-date');
  if (!dateField.value) dateField.value = dateInputValue(new Date());
  const selectedDate = dateField.value;
  const selectedLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', { dateStyle: 'long' });
  const closedToday = allClosedServices().filter(service => isOnDate(serviceDate(service), selectedDate)).sort((a, b) => serviceDate(b) - serviceDate(a));
  const occupied = units.filter(unit => unit.table.status === 'occupied');
  const reserved = units.filter(unit => unit.table.status === 'reserved');
  const activeOrderCount = occupied.reduce((sum, unit) => sum + (unit.table.orders || []).length, 0);
  const pendingCount = occupied.filter(unit => unit.table.awaitingConclusion).length;

  document.querySelector('#overview-title').textContent = currentRole === 'admin' ? 'Visão geral' : 'Painel do garçom';
  document.querySelector('#overview-subtitle').textContent = currentRole === 'admin'
    ? 'Acompanhe as vendas e a operação da hamburgueria.'
    : 'Veja as mesas em atendimento e os pedidos que precisam de atenção.';
  document.querySelector('#admin-dashboard').hidden = currentRole !== 'admin';
  document.querySelector('#waiter-dashboard').hidden = currentRole !== 'waiter';
  dateField.setAttribute('aria-label', `Consultar vendas de ${selectedLabel}`);

  const sales = closedToday.reduce((sum, service) => sum + service.total, 0);
  document.querySelector('#overview-sales').textContent = money(sales);
  document.querySelector('#overview-closings').textContent = closedToday.length;
  document.querySelector('#overview-occupied').textContent = occupied.length;
  document.querySelector('#overview-reservations').textContent = reserved.length;
  const byPayment = closedToday.reduce((map, service) => {
    map[service.paymentMethod] = (map[service.paymentMethod] || 0) + service.total;
    return map;
  }, {});
  const paymentRows = Object.entries(byPayment).sort((a, b) => b[1] - a[1]);
  document.querySelector('#payment-breakdown').innerHTML = paymentRows.length
    ? paymentRows.map(([method, total]) => `<div class="overview-row"><span>${safeText(method)}</span><strong>${money(total)}</strong></div>`).join('')
    : `<div class="overview-empty">Não há fechamentos em ${safeText(selectedLabel)}.</div>`;
  document.querySelector('#recent-closings').innerHTML = closedToday.length
    ? closedToday.slice(0, 6).map(service => `<div class="overview-row recent-row"><span><strong>${safeText(service.tableName)}</strong><small>${safeText(service.paymentMethod)} · ${safeText(service.closedAt)}</small></span><strong>${money(service.total)}</strong></div>`).join('')
    : `<div class="overview-empty">As contas fechadas em ${safeText(selectedLabel)} aparecerão aqui.</div>`;

  document.querySelector('#waiter-occupied').textContent = occupied.length;
  document.querySelector('#waiter-orders').textContent = activeOrderCount;
  document.querySelector('#waiter-pending').textContent = pendingCount;
  document.querySelector('#waiter-reservations').textContent = reserved.length;
  const activeTableList = document.querySelector('#waiter-active-tables');
  activeTableList.innerHTML = occupied.length
    ? occupied.map(({ table, ids }) => {
      const orderCount = (table.orders || []).length;
      const total = (table.orders || []).reduce((sum, order) => sum + order.items.reduce((orderSum, item) => orderSum + orderLineTotal(item), 0), 0);
      return `<button class="overview-table-row" data-open-table="${table.id}"><span><strong>${safeText(tableLabel(ids))}</strong><small>${table.guests || 1} pessoas · ${orderCount ? `${orderCount} ${orderCount === 1 ? 'pedido' : 'pedidos'}` : 'sem pedido lançado'}${table.awaitingConclusion ? ' · pedido para concluir' : ''}</small></span><span class="overview-row-end"><strong>${money(total)}</strong><i>›</i></span></button>`;
    }).join('')
    : '<div class="overview-empty">Nenhuma mesa está em atendimento agora.</div>';
  activeTableList.querySelectorAll('[data-open-table]').forEach(button => button.addEventListener('click', () => {
    showPage('mesas');
    location.hash = '#mesas';
    openTable(Number(button.dataset.openTable));
  }));
}
function showPage(page) {
  currentPage = page === 'mesas' ? 'mesas' : page === 'estoque' && currentRole === 'admin' ? 'estoque' : 'inicio';
  document.querySelector('#overview-page').hidden = currentPage !== 'inicio';
  document.querySelector('#mesas-page').hidden = currentPage !== 'mesas';
  document.querySelector('#estoque-page').hidden = currentPage !== 'estoque';
  document.querySelector('#breadcrumb-title').textContent = currentPage === 'mesas' ? 'MESAS' : currentPage === 'estoque' ? 'ESTOQUE' : 'VISÃO GERAL';
  document.querySelectorAll('.nav-item[data-page]').forEach(link => {
    const active = link.dataset.page === currentPage;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
}
function saveInventory() {
  localStorage.setItem(inventoryStorageKey, JSON.stringify(inventory));
  localStorage.setItem(movementStorageKey, JSON.stringify(stockMovements));
}
function stockAmount(value) { return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value); }
function normalizeSearch(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function renderInventory() {
  const lowItems = inventory.filter(item => item.quantity <= item.minimum);
  const knownValue = inventory.reduce((sum, item) => sum + (Number.isFinite(item.unitCost) ? item.quantity * item.unitCost : 0), 0);
  const todayValue = dateInputValue(new Date());
  const movementsToday = stockMovements.filter(move => isOnDate(new Date(move.dateISO), todayValue));
  document.querySelector('#stock-total-items').textContent = inventory.length;
  document.querySelector('#stock-low-items').textContent = lowItems.length;
  document.querySelector('#stock-today-moves').textContent = movementsToday.length;
  document.querySelector('#stock-total-value').textContent = money(knownValue);
  const query = normalizeSearch(document.querySelector('#inventory-search').value.trim());
  const visibleItems = inventory.filter(item => normalizeSearch(item.name).includes(query));
  document.querySelector('#inventory-list').innerHTML = visibleItems.length
    ? visibleItems.map(item => {
      const low = item.quantity <= item.minimum;
      const cost = Number.isFinite(item.unitCost) ? `${money(item.unitCost)} / ${safeText(item.unit)}${item.sampleCost ? ' · exemplo' : ''}` : 'Custo não informado';
      const value = Number.isFinite(item.unitCost) ? money(item.quantity * item.unitCost) : '—';
      return `<div class="inventory-row"><div class="inventory-item-name"><strong>${safeText(item.name)}</strong><small>Custo unitário: ${cost}</small><small>Mínimo: ${stockAmount(item.minimum)} ${safeText(item.unit)}</small></div>
        <div class="inventory-amount"><strong>${stockAmount(item.quantity)} <small>${safeText(item.unit)}</small></strong><span class="inventory-badge ${low ? 'low' : 'ok'}">${low ? 'Estoque baixo' : 'Disponível'}</span></div>
        <div class="inventory-value"><small>Valor em estoque</small><strong>${value}</strong></div>
        <div class="inventory-actions"><button class="subtle-button" data-stock-edit="${item.id}">Editar custo</button><button class="subtle-button" data-stock-id="${item.id}">Movimentar</button></div></div>`;
    }).join('')
    : inventory.length
      ? `<div class="overview-empty">Nenhum ingrediente ou produto corresponde a “${safeText(document.querySelector('#inventory-search').value.trim())}”.</div>`
      : '<div class="overview-empty">Nenhum item cadastrado. Adicione o primeiro item do estoque.</div>';
  document.querySelector('#inventory-movements').innerHTML = stockMovements.length
    ? [...stockMovements].reverse().slice(0, 8).map(move => `<div class="overview-row recent-row"><span><strong>${safeText(move.itemName)} · ${move.type}</strong><small>${move.note ? `${safeText(move.note)} · ` : ''}${new Date(move.dateISO).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></span><strong>${move.type === 'Entrada' ? '+' : '−'}${stockAmount(move.quantity)} ${safeText(move.unit)}</strong></div>`).join('')
    : '<div class="overview-empty">As entradas e saídas aparecerão aqui.</div>';
}
function showNewInventoryItem() {
  const dialog = document.querySelector('#inventory-dialog');
  const content = document.querySelector('#inventory-dialog-content');
  content.innerHTML = `<div class="dialog-kicker">ESTOQUE</div><h2>Cadastrar item</h2><p class="dialog-description">Adicione um ingrediente ou produto e defina o nível mínimo.</p>
    <div class="stock-form"><label>Nome do item<input id="stock-name" type="text" maxlength="80" placeholder="Ex.: Pão brioche" /></label>
      <label>Unidade<select id="stock-unit"><option>un</option><option>kg</option><option>g</option><option>L</option><option>ml</option><option>porções</option><option>fatias</option></select></label>
      <label>Custo de compra por unidade<input id="stock-unit-cost" type="number" min="0" step="0.01" placeholder="0,00" /></label>
      <label>Quantidade inicial<input id="stock-quantity" type="number" min="0" step="0.01" value="0" /></label>
      <label>Nível mínimo<input id="stock-minimum" type="number" min="0" step="0.01" value="1" /></label></div>
    <p class="stock-form-error" hidden></p><div class="reservation-actions"><button type="button" class="stock-cancel">Cancelar</button><button type="button" class="stock-save">Cadastrar item</button></div>`;
  content.querySelector('.stock-cancel').addEventListener('click', () => dialog.close());
  content.querySelector('.stock-save').addEventListener('click', () => {
    const name = content.querySelector('#stock-name').value.trim();
    const costField = content.querySelector('#stock-unit-cost').value.trim();
    const unitCost = Number(costField);
    const quantity = Number(content.querySelector('#stock-quantity').value);
    const minimum = Number(content.querySelector('#stock-minimum').value);
    const error = content.querySelector('.stock-form-error');
    if (!name || costField === '' || !Number.isFinite(unitCost) || unitCost < 0 || !Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(minimum) || minimum < 0) {
      error.textContent = 'Preencha o nome, o custo unitário e quantidades válidas.'; error.hidden = false; return;
    }
    if (inventory.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      error.textContent = 'Já existe um item com esse nome.'; error.hidden = false; return;
    }
    const item = { id: Math.max(0, ...inventory.map(entry => entry.id)) + 1, name, unit: content.querySelector('#stock-unit').value, quantity, minimum, unitCost, sampleCost: false };
    inventory.push(item);
    if (quantity > 0) stockMovements.push({ itemId: item.id, itemName: item.name, type: 'Entrada', quantity, unit: item.unit, note: 'Estoque inicial', dateISO: new Date().toISOString() });
    saveInventory(); renderInventory(); dialog.close();
  });
  dialog.showModal();
  content.querySelector('#stock-name').focus();
}
function showEditStockCost(id) {
  const item = inventory.find(entry => entry.id === id);
  if (!item) return;
  const dialog = document.querySelector('#inventory-dialog');
  const content = document.querySelector('#inventory-dialog-content');
  content.innerHTML = `<div class="dialog-kicker">ESTOQUE</div><h2>Editar custo</h2><p class="dialog-description">${safeText(item.name)} · informe o custo de compra por ${safeText(item.unit)}.</p>
    <div class="stock-form"><label>Custo unitário (R$)<input id="stock-unit-cost" type="number" min="0" step="0.01" value="${Number.isFinite(item.unitCost) ? item.unitCost : ''}" placeholder="0,00" /></label></div>
    <p class="stock-form-error" hidden></p><div class="reservation-actions"><button type="button" class="stock-cancel">Cancelar</button><button type="button" class="stock-save">Salvar custo</button></div>`;
  content.querySelector('.stock-cancel').addEventListener('click', () => dialog.close());
  content.querySelector('.stock-save').addEventListener('click', () => {
    const rawCost = content.querySelector('#stock-unit-cost').value.trim();
    const unitCost = Number(rawCost);
    const error = content.querySelector('.stock-form-error');
    if (rawCost === '' || !Number.isFinite(unitCost) || unitCost < 0) {
      error.textContent = 'Informe um custo unitário válido.'; error.hidden = false; return;
    }
    item.unitCost = unitCost;
    item.sampleCost = false;
    saveInventory(); renderInventory(); dialog.close();
  });
  dialog.showModal();
}
function showStockMovement(id) {
  const item = inventory.find(entry => entry.id === id);
  if (!item) return;
  const dialog = document.querySelector('#inventory-dialog');
  const content = document.querySelector('#inventory-dialog-content');
  content.innerHTML = `<div class="dialog-kicker">MOVIMENTAÇÃO DE ESTOQUE</div><h2>${safeText(item.name)}</h2><p class="dialog-description">Saldo atual: <strong>${stockAmount(item.quantity)} ${safeText(item.unit)}</strong> · mínimo ${stockAmount(item.minimum)} ${safeText(item.unit)}</p>
    <div class="stock-form"><label>Tipo<select id="stock-move-type"><option>Entrada</option><option>Saída</option></select></label>
      <label>Quantidade<input id="stock-move-quantity" type="number" min="0.01" step="0.01" value="1" /></label>
      <label class="stock-note-field">Observação<input id="stock-move-note" type="text" maxlength="100" placeholder="Ex.: compra, perda, ajuste..." /></label></div>
    <p class="stock-form-error" hidden></p><div class="reservation-actions"><button type="button" class="stock-cancel">Cancelar</button><button type="button" class="stock-save">Salvar movimentação</button></div>`;
  content.querySelector('.stock-cancel').addEventListener('click', () => dialog.close());
  content.querySelector('.stock-save').addEventListener('click', () => {
    const type = content.querySelector('#stock-move-type').value;
    const quantity = Number(content.querySelector('#stock-move-quantity').value);
    const error = content.querySelector('.stock-form-error');
    if (!Number.isFinite(quantity) || quantity <= 0) { error.textContent = 'Informe uma quantidade maior que zero.'; error.hidden = false; return; }
    if (type === 'Saída' && quantity > item.quantity) { error.textContent = 'A saída não pode ser maior que o saldo disponível.'; error.hidden = false; return; }
    item.quantity += type === 'Entrada' ? quantity : -quantity;
    stockMovements.push({ itemId: item.id, itemName: item.name, type, quantity, unit: item.unit, note: content.querySelector('#stock-move-note').value.trim(), dateISO: new Date().toISOString() });
    saveInventory(); renderInventory(); dialog.close();
  });
  dialog.showModal();
}
function openTable(id) {
  selectedId = id;
  document.querySelector('#reservation-editor').hidden = true;
  document.querySelector('#service-editor').hidden = true;
  document.querySelector('#table-group-editor').hidden = true;
  document.querySelector('#order-composer').hidden = true;
  const table = tables.find(item => item.id === id);
  const members = groupMembers(table);
  const ids = members.map(member => member.id);
  const seats = members.reduce((sum, member) => sum + member.seats, 0);
  document.querySelector('#dialog-title').textContent = tableLabel(ids);
  document.querySelector('#dialog-description').textContent = `${seats} lugares${ids.length > 1 ? ` · ${ids.length} mesas unidas` : ''} · ${table.status === 'occupied' ? `${table.guests || 1} pessoas no atendimento` : table.status === 'reserved' ? `Reserva para ${table.reservationName || 'cliente não informado'}${table.reservation ? ` · às ${table.reservation}` : ''}` : 'Pronta para receber clientes'}`;
  document.querySelector('#dialog-status').textContent = labels[table.status];
  renderOrderSection(table);
  const actions = document.querySelector('#dialog-actions');
  let options = [];
  if (table.status === 'available') {
    if (currentRole === 'waiter') options = [['start-service', 'Iniciar atendimento', true], ['join-tables', 'Juntar mesas', false], ...(ids.length > 1 ? [['separate-tables', 'Separar mesas', false]] : [])];
    else options = [['reserve-table', 'Marcar como reservada', true], ['join-tables', 'Juntar mesas', false], ...(ids.length > 1 ? [['separate-tables', 'Separar mesas', false]] : []), ...(ids.length === 1 ? [['edit-table', 'Editar lugares', false], ...(!table.closedServices?.length ? [['remove-table', 'Remover mesa', false]] : [])] : [])];
  } else if (table.status === 'occupied') {
    options = currentRole === 'waiter'
      ? [[table.awaitingConclusion ? 'conclude-order' : 'new-order', table.awaitingConclusion ? 'Concluir pedido' : table.orders?.length ? 'Pedido adicional' : 'Lançar pedido', true]]
      : [['close-account', 'Fechar conta', true]];
  } else {
    options = currentRole === 'waiter'
      ? [['start-service', 'Iniciar atendimento', true]]
      : [['edit-reservation', 'Editar reserva', false], ['cancel-reservation', 'Cancelar reserva', false]];
  }
  actions.innerHTML = options.map(([status, label, primary]) => `<button data-action="${status}" class="${primary ? 'action-primary' : ''}">${label}</button>`).join('');
  actions.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.action === 'new-order') startOrder(id);
    else if (button.dataset.action === 'start-service') showGuestEditor(id);
    else if (button.dataset.action === 'reserve-table') showReservationEditor(id);
    else if (button.dataset.action === 'edit-reservation') showReservationEditor(id);
    else if (button.dataset.action === 'cancel-reservation') showCancelReservation(id);
    else if (button.dataset.action === 'close-account') showCloseAccount(id);
    else if (button.dataset.action === 'edit-table') showTableEditor(id);
    else if (button.dataset.action === 'remove-table') showRemoveTable(id);
    else if (button.dataset.action === 'join-tables') showGroupEditor(id);
    else if (button.dataset.action === 'separate-tables') separateTables(id);
    else if (button.dataset.action === 'conclude-order') {
      groupMembers(table).forEach(member => { member.awaitingConclusion = false; });
      persist();
      dialog.close();
    }
    else setStatus(id, button.dataset.action);
  }));
  if (!dialog.open) dialog.showModal();
  document.querySelector('#dialog-footnote').textContent = currentRole === 'admin' && table.closedServices?.length
    ? 'O histórico foi preservado; mesas com atendimentos fechados não podem ser removidas.'
    : currentRole === 'admin'
      ? 'Perfil de administrador · dados desta demonstração salvos neste navegador.'
      : 'Perfil de garçom · focado no atendimento e nos pedidos das mesas.';
}
function showGroupEditor(id) {
  const base = tableById(id);
  const currentIds = memberIds(base);
  const eligible = tableUnits().filter(unit => unit.table.status === 'available' && !unit.ids.some(unitId => currentIds.includes(unitId)));
  const section = document.querySelector('#table-group-editor');
  document.querySelector('#reservation-editor').hidden = true;
  section.hidden = false;
  section.innerHTML = `<h3>Juntar mesas</h3><p>Escolha outras mesas disponíveis para acomodar a família. A capacidade será somada.</p>
    <div class="join-options">${eligible.length ? eligible.map(unit => `<label class="join-option"><input type="checkbox" value="${unit.ids.join(',')}"><span>${tableLabel(unit.ids)} · ${unit.members.reduce((sum, member) => sum + member.seats, 0)} lugares</span></label>`).join('') : '<p class="join-empty">Não há outras mesas disponíveis para juntar.</p>'}</div>
    <p class="join-error" hidden>Selecione pelo menos outra mesa disponível.</p>
    <div class="reservation-actions"><button type="button" class="join-cancel">Cancelar</button><button type="button" class="join-confirm" ${eligible.length ? '' : 'disabled'}>Confirmar união</button></div>`;
  section.querySelector('.join-cancel').addEventListener('click', () => { section.hidden = true; });
  section.querySelector('.join-confirm').addEventListener('click', () => {
    const selectedIds = [...section.querySelectorAll('input:checked')].flatMap(input => input.value.split(',').map(Number));
    if (!selectedIds.length) { section.querySelector('.join-error').hidden = false; return; }
    const joinedIds = [...new Set([...currentIds, ...selectedIds])].sort((a, b) => a - b);
    joinedIds.forEach(joinedId => { const member = tableById(joinedId); member.joinedTableIds = joinedIds; });
    persist(); render(); openTable(joinedIds[0]);
  });
}
function showTableEditor(id = null) {
  const table = id === null ? null : tableById(id);
  const section = document.querySelector('#service-editor');
  const wasOpen = dialog.open;
  document.querySelector('#reservation-editor').hidden = true;
  document.querySelector('#table-group-editor').hidden = true;
  document.querySelector('#order-composer').hidden = true;
  if (!wasOpen) {
    document.querySelector('#dialog-actions').innerHTML = '';
    document.querySelector('#order-summary').hidden = true;
    document.querySelector('#order-composer').hidden = true;
  }
  document.querySelector('#dialog-title').textContent = table ? `Editar mesa ${String(id).padStart(2, '0')}` : 'Adicionar mesa';
  document.querySelector('#dialog-description').textContent = table ? 'Atualize a capacidade da mesa.' : 'Cadastre uma nova mesa no salão.';
  document.querySelector('#dialog-status').textContent = table ? labels[table.status] : 'Nova mesa';
  document.querySelector('#reservation-editor').hidden = true;
  document.querySelector('#table-group-editor').hidden = true;
  section.hidden = false;
  section.innerHTML = `<h3>${table ? 'Editar mesa' : 'Adicionar mesa'}</h3><p>Defina quantos lugares esta mesa oferece.</p>
    <label>Quantidade de lugares<input id="table-seats" type="number" min="1" max="50" value="${table?.seats || 4}" required /></label>
    <p class="join-error" hidden>Informe uma capacidade entre 1 e 50 lugares.</p>
    <div class="reservation-actions"><button type="button" class="service-cancel">Cancelar</button><button type="button" class="service-confirm">${table ? 'Salvar alterações' : 'Adicionar mesa'}</button></div>`;
  section.querySelector('.service-cancel').addEventListener('click', () => {
    if (table) section.hidden = true;
    else dialog.close();
  });
  section.querySelector('.service-confirm').addEventListener('click', () => {
    const seats = Number(section.querySelector('#table-seats').value);
    if (!Number.isInteger(seats) || seats < 1 || seats > 50) { section.querySelector('.join-error').hidden = false; return; }
    if (table) table.seats = seats;
    else {
      const nextId = Math.max(0, ...tables.map(item => item.id)) + 1;
      tables.push({ id: nextId, status: 'available', seats });
      persist(); render(); openTable(nextId); return;
    }
    persist(); render(); openTable(table.id);
  });
  if (!dialog.open) dialog.showModal();
}
function showRemoveTable(id) {
  const table = tableById(id);
  const section = document.querySelector('#service-editor');
  section.hidden = false;
  section.innerHTML = `<h3>Remover mesa?</h3><p>${safeText(tableLabel(memberIds(table)))} será removida do salão. Só mesas disponíveis e sem união podem ser removidas.</p>
    <div class="reservation-actions"><button type="button" class="service-cancel">Voltar</button><button type="button" class="service-confirm">Confirmar remoção</button></div>`;
  section.querySelector('.service-cancel').addEventListener('click', () => { section.hidden = true; });
  section.querySelector('.service-confirm').addEventListener('click', () => {
    tables = tables.filter(item => item.id !== id);
    persist(); render(); dialog.close();
  });
}
function showGuestEditor(id) {
  const table = tableById(id);
  const seats = groupMembers(table).reduce((sum, member) => sum + member.seats, 0);
  const section = document.querySelector('#service-editor');
  document.querySelector('#reservation-editor').hidden = true;
  document.querySelector('#table-group-editor').hidden = true;
  section.hidden = false;
  section.innerHTML = `<h3>Iniciar atendimento</h3><p>Quantas pessoas vão ocupar ${safeText(tableLabel(memberIds(table)))}? A capacidade é de ${seats} lugares.</p>
    <label>Quantidade de pessoas<input id="guest-count" type="number" min="1" max="${seats}" value="${Math.min(table.guests || 1, seats)}" required /></label>
    <p class="join-error" hidden>Informe uma quantidade entre 1 e ${seats} pessoas.</p>
    <div class="reservation-actions"><button type="button" class="service-cancel">Cancelar</button><button type="button" class="service-confirm">Iniciar atendimento</button></div>`;
  section.querySelector('.service-cancel').addEventListener('click', () => { section.hidden = true; });
  section.querySelector('.service-confirm').addEventListener('click', () => {
    const count = Number(section.querySelector('#guest-count').value);
    if (!Number.isInteger(count) || count < 1 || count > seats) { section.querySelector('.join-error').hidden = false; return; }
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    groupMembers(table).forEach(member => {
      member.status = 'occupied';
      member.since ||= now;
      delete member.reservation;
      delete member.reservationName;
      delete member.guests;
    });
    table.guests = count;
    persist(); render(); openTable(id);
  });
  section.querySelector('#guest-count').focus();
}
function showCancelReservation(id) {
  const table = tableById(id);
  const section = document.querySelector('#service-editor');
  section.hidden = false;
  section.innerHTML = `<h3>Cancelar reserva?</h3><p>A reserva de ${safeText(table.reservationName || 'cliente não informado')} será removida e ${safeText(tableLabel(memberIds(table)))} ficará disponível.</p>
    <div class="reservation-actions"><button type="button" class="service-cancel">Voltar</button><button type="button" class="service-confirm">Confirmar cancelamento</button></div>`;
  section.querySelector('.service-cancel').addEventListener('click', () => { section.hidden = true; });
  section.querySelector('.service-confirm').addEventListener('click', () => setStatus(id, 'available'));
}
function showCloseAccount(id) {
  const table = tableById(id);
  const section = document.querySelector('#service-editor');
  if (!document.querySelector('#order-composer').hidden && draftOrder.length) {
    section.hidden = false;
    section.innerHTML = `<h3>Pedido em edição</h3><p>Finalize o pedido ou remova os itens em edição antes de fechar a conta. Assim ele não será descartado sem querer.</p>
      <div class="reservation-actions"><button type="button" class="service-confirm">Voltar ao pedido</button></div>`;
    section.querySelector('.service-confirm').addEventListener('click', () => { section.hidden = true; });
    return;
  }
  const orders = table.orders || [];
  const total = orders.reduce((sum, order) => sum + order.items.reduce((orderSum, item) => orderSum + orderLineTotal(item), 0), 0);
  section.hidden = false;
  section.innerHTML = `<h3>Fechar conta</h3><p>${orders.length ? `${orders.length} ${orders.length === 1 ? 'pedido finalizado' : 'pedidos finalizados'} em ${safeText(tableLabel(memberIds(table)))}` : `Nenhum pedido finalizado em ${safeText(tableLabel(memberIds(table)))}`}</p>
    <div class="close-total"><span>Total a receber</span><strong>${money(total)}</strong></div>
    ${total > 0 ? `<label>Forma de pagamento<select id="payment-method" required><option value="">Selecione uma forma de pagamento</option><option>Pix</option><option>Dinheiro</option><option>Cartão de débito</option><option>Cartão de crédito</option></select></label>` : ''}
    <p class="join-error" hidden>Selecione a forma de pagamento para continuar.</p>
    <div class="reservation-actions"><button type="button" class="service-cancel">Voltar</button><button type="button" class="service-confirm">${total > 0 ? 'Confirmar recebimento e liberar mesa' : 'Confirmar e liberar mesa'}</button></div>`;
  section.querySelector('.service-cancel').addEventListener('click', () => { section.hidden = true; });
  section.querySelector('.service-confirm').addEventListener('click', () => {
    const method = total > 0 ? section.querySelector('#payment-method').value : 'Sem pedido';
    if (!method) { section.querySelector('.join-error').hidden = false; return; }
    const closedAtDate = new Date();
    const now = closedAtDate.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    if (orders.length) {
      table.closedServices ||= [];
      table.closedServices.push({ orders: structuredClone(orders), total, paymentMethod: method, closedAt: now, closedAtISO: closedAtDate.toISOString(), tableName: tableLabel(memberIds(table)) });
    }
    groupMembers(table).forEach(member => {
      member.status = 'available';
      delete member.guests;
      delete member.since;
      delete member.reservation;
      delete member.reservationName;
      delete member.orders;
      delete member.awaitingConclusion;
    });
    persist(); render(); dialog.close();
  });
}
function separateTables(id) {
  const members = groupMembers(tableById(id));
  members.forEach(member => { delete member.joinedTableIds; });
  persist(); render(); openTable(id);
}
function showReservationEditor(id) {
  document.querySelector('#order-composer').hidden = true;
  document.querySelector('#service-editor').hidden = true;
  document.querySelector('#table-group-editor').hidden = true;
  const section = document.querySelector('#reservation-editor');
  const currentTable = tables.find(item => item.id === id);
  section.hidden = false;
  section.innerHTML = `<h3>Registrar reserva</h3><p>Informe o nome de quem entrou em contato com a hamburgueria.</p>
    <label>Nome da pessoa<input id="reservation-name" type="text" maxlength="80" placeholder="Ex.: Mariana Costa" value="${safeText(currentTable.reservationName || '')}" required /></label>
    <label>Horário da reserva<input id="reservation-time" type="time" value="${currentTable.reservation && currentTable.reservation !== 'a confirmar' ? safeText(currentTable.reservation) : ''}" required /></label>
    <div class="reservation-actions"><button type="button" class="reservation-cancel">Cancelar</button><button type="button" class="reservation-confirm">Confirmar reserva</button></div>`;
  section.querySelector('.reservation-cancel').addEventListener('click', () => { section.hidden = true; });
  section.querySelector('.reservation-confirm').addEventListener('click', () => {
    const field = section.querySelector('#reservation-name');
    const name = field.value.trim();
    if (!name) { field.setCustomValidity('Informe o nome da pessoa.'); field.reportValidity(); return; }
    field.setCustomValidity('');
    const timeField = section.querySelector('#reservation-time');
    if (!timeField.value) { timeField.setCustomValidity('Informe o horário da reserva.'); timeField.reportValidity(); return; }
    timeField.setCustomValidity('');
    const table = tables.find(item => item.id === id);
    groupMembers(table).forEach(member => {
      member.status = 'reserved';
      member.reservationName = name;
      member.reservation = timeField.value;
      member.guests ||= 2;
      delete member.since;
    });
    persist(); render(); openTable(id);
  });
  section.querySelector('#reservation-name').focus();
}
function money(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
function renderOrderSection(table) {
  const section = document.querySelector('#order-summary');
  if (Array.isArray(table.orders) && table.orders.length) {
    const total = table.orders.reduce((sum, order) => sum + order.items.reduce((orderSum, item) => orderSum + orderLineTotal(item), 0), 0);
    section.hidden = false;
    section.innerHTML = `<div class="order-title"><h3>Pedidos da mesa</h3><span class="finalized-badge">${table.orders.length} ${table.orders.length === 1 ? 'pedido' : 'pedidos'}</span></div>
      <div class="order-list">${table.orders.map((order, orderIndex) => `<div class="order-group"><div class="order-group-title"><strong>Pedido ${orderIndex + 1}</strong>${order.finalizedAt ? `<span>${safeText(order.finalizedAt)}</span>` : ''}</div>${order.items.map(item => `<div class="order-entry"><div class="order-line"><span><b>${item.quantity}×</b> ${safeText(item.name)}</span><strong>${money(orderLineTotal(item))}</strong></div>
        ${(item.extras || []).filter(extra => extra.quantity > 0).map(extra => `<div class="order-detail">+ ${extra.quantity}× ${safeText(extra.name)} (${money(extra.price)} cada)</div>`).join('')}
        ${item.observation ? `<div class="order-note">Obs.: ${safeText(item.observation)}</div>` : ''}</div>`).join('')}</div>`).join('')}</div>
      <div class="order-total"><span>Total a cobrar</span><strong>${money(total)}</strong></div>`;
    return;
  }
  const closedServices = [...(table.closedServices || [])].reverse();
  if (currentRole === 'admin' && closedServices.length) {
    section.hidden = false;
    section.innerHTML = `<div class="order-title"><h3>Histórico de atendimentos</h3><span class="finalized-badge">${closedServices.length}</span></div>
      <div class="closed-service-list">${closedServices.map((service, index) => `<div class="closed-service"><div class="order-group-title"><strong>Fechamento ${closedServices.length - index} · ${safeText(service.paymentMethod)}</strong><span>${safeText(service.closedAt)}</span></div>
        <div class="order-list">${service.orders.flatMap(order => order.items).map(item => `<div class="order-entry"><div class="order-line"><span><b>${item.quantity}×</b> ${safeText(item.name)}</span><strong>${money(orderLineTotal(item))}</strong></div>
          ${(item.extras || []).filter(extra => extra.quantity > 0).map(extra => `<div class="order-detail">+ ${extra.quantity}× ${safeText(extra.name)} (${money(extra.price)} cada)</div>`).join('')}
          ${item.observation ? `<div class="order-note">Obs.: ${safeText(item.observation)}</div>` : ''}</div>`).join('')}</div>
        <div class="order-total"><span>Total recebido</span><strong>${money(service.total)}</strong></div></div>`).join('')}</div>`;
    return;
  }
  section.hidden = true;
  section.innerHTML = '';
}
function orderLineTotal(item) {
  const extrasTotal = (item.extras || []).reduce((sum, extra) => sum + extra.price * extra.quantity, 0);
  return (item.price + extrasTotal) * item.quantity;
}
function startOrder(id) {
  selectedId = id;
  draftOrder = [];
  renderOrderComposer();
}
function renderOrderComposer() {
  const section = document.querySelector('#order-composer');
  section.hidden = false;
  const total = draftOrder.reduce((sum, item) => sum + orderLineTotal(item), 0);
  section.innerHTML = `<div class="order-title"><h3>Novo pedido</h3><span class="draft-badge">Em edição</span></div>
    <div class="menu-list">${menu.map((item, index) => {
      const current = draftOrder.find(line => line.name === item.name);
      return `<div class="menu-product"><div class="menu-line"><span><strong>${safeText(item.name)}</strong><small>${money(item.price)} cada</small></span><div class="quantity-control"><button data-qty="-1" data-index="${index}" aria-label="Remover ${safeText(item.name)}">−</button><b>${current?.quantity || 0}</b><button data-qty="1" data-index="${index}" aria-label="Adicionar ${safeText(item.name)}">＋</button></div></div>
        ${current ? `<div class="item-customization">${item.category !== 'drink' ? `<div class="customization-label">Adicionais (cobrado por unidade)</div>${extrasMenu.map((extra, extraIndex) => {
          const selected = current.extras.find(entry => entry.name === extra.name);
          return `<div class="extra-line"><span>${safeText(extra.name)} <small>+ ${money(extra.price)}</small></span><div class="quantity-control"><button data-extra-qty="-1" data-index="${index}" data-extra-index="${extraIndex}" aria-label="Remover ${safeText(extra.name)}">−</button><b>${selected?.quantity || 0}</b><button data-extra-qty="1" data-index="${index}" data-extra-index="${extraIndex}" aria-label="Adicionar ${safeText(extra.name)}">＋</button></div></div>`;
        }).join('')}` : ''}<label class="observation-label">Observação deste item<textarea data-observation="${index}" placeholder="Ex.: sem gelo, pouco sal...">${safeText(current.observation || '')}</textarea></label></div>` : ''}</div>`;
    }).join('')}</div>
    ${draftOrder.length ? `<div class="order-total"><span>Total do pedido</span><strong>${money(total)}</strong></div>` : '<p class="order-empty">Adicione os itens pedidos pela mesa.</p>'}
    <button class="finalize-order" ${draftOrder.length ? '' : 'disabled'}>Finalizar pedido</button>`;
  section.querySelectorAll('[data-qty]').forEach(button => button.addEventListener('click', () => {
    const item = menu[Number(button.dataset.index)];
    const line = draftOrder.find(entry => entry.name === item.name);
    if (line) {
      line.quantity += Number(button.dataset.qty);
      if (line.quantity <= 0) draftOrder = draftOrder.filter(entry => entry.name !== item.name);
    } else if (Number(button.dataset.qty) > 0) draftOrder.push({ ...item, quantity: 1, extras: [], observation: '' });
    draftOrder = draftOrder.filter(entry => entry.quantity > 0);
    renderOrderComposer();
  }));
  section.querySelectorAll('[data-extra-qty]').forEach(button => button.addEventListener('click', () => {
    const line = draftOrder.find(entry => entry.name === menu[Number(button.dataset.index)].name);
    const extra = extrasMenu[Number(button.dataset.extraIndex)];
    let selected = line.extras.find(entry => entry.name === extra.name);
    if (!selected && Number(button.dataset.extraQty) > 0) { selected = { ...extra, quantity: 0 }; line.extras.push(selected); }
    if (selected) selected.quantity = Math.max(0, selected.quantity + Number(button.dataset.extraQty));
    line.extras = line.extras.filter(entry => entry.quantity > 0);
    renderOrderComposer();
  }));
  section.querySelectorAll('[data-observation]').forEach(field => field.addEventListener('change', () => {
    const line = draftOrder.find(entry => entry.name === menu[Number(field.dataset.observation)].name);
    if (line) line.observation = field.value.trim();
  }));
  section.querySelector('.finalize-order').addEventListener('click', () => {
    const table = tables.find(item => item.id === selectedId);
    if (!table || !draftOrder.length) return;
    table.orders ||= [];
    table.orders.push({
      items: draftOrder.map(item => ({ ...item, extras: item.extras.map(extra => ({ ...extra })) })),
      finalizedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    });
    table.awaitingConclusion = true;
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    groupMembers(table).forEach(member => {
      member.status = 'occupied';
      member.awaitingConclusion = true;
      member.guests ||= 1;
      member.since ||= now;
    });
    persist(); render(); openTable(selectedId);
  });
}
function setStatus(id, status) {
  const table = tables.find(item => item.id === id);
  groupMembers(table).forEach(member => {
    member.status = status;
    if (status === 'occupied') { member.guests ||= 2; member.since ||= new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); delete member.reservation; delete member.reservationName; }
    else if (status === 'reserved') { member.guests ||= 2; member.reservation ||= 'a confirmar'; delete member.since; }
    else { delete member.guests; delete member.since; delete member.reservation; delete member.reservationName; delete member.orders; delete member.awaitingConclusion; }
  });
  persist(); render(); openTable(id);
}
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter').forEach(filter => filter.classList.toggle('active', filter === button));
  render();
}));
document.querySelector('#search').addEventListener('input', render);
document.querySelector('#add-table').addEventListener('click', () => showTableEditor());
document.querySelector('#role-select').addEventListener('change', event => {
  currentRole = event.target.value;
  localStorage.setItem('brasa-demo-role-v1', currentRole);
  render();
  if (currentPage === 'estoque' && currentRole !== 'admin') showPage('inicio');
  if (dialog.open && selectedId !== null) openTable(selectedId);
});
document.querySelectorAll('.nav-item[data-page]').forEach(link => link.addEventListener('click', () => showPage(link.dataset.page)));
window.addEventListener('hashchange', () => showPage(location.hash === '#mesas' ? 'mesas' : location.hash === '#estoque' ? 'estoque' : 'inicio'));
document.querySelector('#overview-date').addEventListener('change', renderOverview);
document.querySelector('#add-stock-item').addEventListener('click', showNewInventoryItem);
document.querySelector('#inventory-search').addEventListener('input', renderInventory);
document.querySelector('#inventory-list').addEventListener('click', event => {
  const editButton = event.target.closest('[data-stock-edit]');
  if (editButton) { showEditStockCost(Number(editButton.dataset.stockEdit)); return; }
  const button = event.target.closest('[data-stock-id]');
  if (button) showStockMovement(Number(button.dataset.stockId));
});
document.querySelector('#overview-open-tables').addEventListener('click', () => {
  showPage('mesas');
  location.hash = '#mesas';
});
document.querySelector('#reset-demo').addEventListener('click', () => {
  tables = migrateTables(structuredClone(initialTables)); persist(); activeFilter = 'all';
  document.querySelectorAll('.filter').forEach(filter => filter.classList.toggle('active', filter.dataset.filter === 'all'));
  document.querySelector('#search').value = ''; render();
});
document.querySelector('#today').textContent = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
render();
showPage(currentPage);
