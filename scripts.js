const STORAGE_KEYS = {
	categories: 'ritmo-categories-v1',
	menu: 'ritmo-menu-v1',
	orders: 'ritmo-orders-v1'
};

const initialCategories = [
	{ id: 'cat-pizzas', name: 'Pizzas' },
	{ id: 'cat-hamburguesas', name: 'Hamburguesas' },
	{ id: 'cat-pastas', name: 'Pastas' }
];

const initialMenu = [
	{ id: 'dish-pizza', name: 'Pizza de la casa', description: 'Tomate, mozzarella, albahaca fresca', categoryId: 'cat-pizzas', price: 13.5, available: true },
	{ id: 'dish-burger', name: 'Hamburguesa Ritmo', description: 'Doble carne, cheddar, salsa de la casa', categoryId: 'cat-hamburguesas', price: 12.5, available: true },
	{ id: 'dish-pasta', name: 'Pasta al pesto', description: 'Pesto casero, parmesano y piñones', categoryId: 'cat-pastas', price: 11, available: true }
];

const orderStatuses = ['Pendiente', 'En preparación', 'Listo', 'Entregado', 'Cancelado'];
const statusClass = {
	'Pendiente': 'pending',
	'En preparación': 'preparing',
	'Listo': 'ready',
	'Entregado': 'delivered',
	'Cancelado': 'cancelled'
};
const categoryIcons = { pizzas: '🍕', hamburguesas: '🍔', pastas: '🍝' };
const dishIcons = { pizzas: '🍕', hamburguesas: '🍔', pastas: '🍝' };
const numberFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

function loadCollection(key, fallback) {
	const stored = localStorage.getItem(key);
	if (stored === null) {
		localStorage.setItem(key, JSON.stringify(fallback));
		return structuredClone(fallback);
	}
	try {
		const value = JSON.parse(stored);
		if (!Array.isArray(value)) throw new TypeError(`Los datos guardados en ${key} no tienen el formato esperado.`);
		return value;
	} catch (error) {
		console.error(`No se pudieron cargar los datos de ${key}.`, error);
		return structuredClone(fallback);
	}
}

let categories = loadCollection(STORAGE_KEYS.categories, initialCategories);
let menu = loadCollection(STORAGE_KEYS.menu, initialMenu);
let orders = loadCollection(STORAGE_KEYS.orders, []);
let editingCategoryId = null;
let editingMenuId = null;
let toastTimeout;

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
}[character]));
const formatPrice = (price) => numberFormatter.format(price);
const categoryName = (id) => categories.find((category) => category.id === id)?.name || 'Sin categoría';
const categoryIcon = (name) => categoryIcons[name.trim().toLocaleLowerCase('es')] || '✳';
const dishIcon = (dish) => dishIcons[categoryName(dish.categoryId).trim().toLocaleLowerCase('es')] || '🍽️';
const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function saveData() {
	localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
	localStorage.setItem(STORAGE_KEYS.menu, JSON.stringify(menu));
	localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
}

function showToast(message) {
	const toast = $('#toast');
	toast.textContent = message;
	toast.classList.add('visible');
	clearTimeout(toastTimeout);
	toastTimeout = setTimeout(() => toast.classList.remove('visible'), 2800);
}

function navigate(viewName) {
	$$('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${viewName}`));
	$$('.nav-link').forEach((link) => link.classList.toggle('active', link.dataset.view === viewName));
	$('#currentSection').textContent = ({ resumen: 'Resumen', categorias: 'Categorías', menu: 'Menú', pedidos: 'Pedidos' })[viewName];
}

function renderCounts() {
	const pendingCount = orders.filter((order) => order.status === 'Pendiente' || order.status === 'En preparación').length;
	$('#menuNavCount').textContent = menu.length;
	$('#orderNavCount').textContent = pendingCount;
	$('#statOrders').textContent = orders.length;
	$('#statPending').textContent = pendingCount;
	$('#statMenu').textContent = menu.filter((dish) => dish.available).length;
	$('#statCategories').textContent = categories.length;
	$('#ordersSummary').textContent = `${orders.length} ${orders.length === 1 ? 'pedido' : 'pedidos'} en total`;
}

function renderCategoryControls() {
	const selectedFilter = $('#menuCategoryFilter').value;
	const categoryOptions = categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join('');
	$('#menuCategoryFilter').innerHTML = `<option value="">Todas las categorías</option>${categoryOptions}`;
	if (categories.some((category) => category.id === selectedFilter)) $('#menuCategoryFilter').value = selectedFilter;
	$('#menuCategory').innerHTML = categories.length
		? `<option value="">Elige una categoría</option>${categoryOptions}`
		: '<option value="">Primero crea una categoría</option>';
	$('#menuCategory').disabled = categories.length === 0;
	$('#addMenuButton').disabled = categories.length === 0;
	$('#addMenuButton').title = categories.length ? '' : 'Crea una categoría antes de añadir platos';
}

function renderCategories() {
	const grid = $('#categoryGrid');
	grid.innerHTML = categories.map((category) => {
		const count = menu.filter((dish) => dish.categoryId === category.id).length;
		return `<article class="category-card">
			<div class="category-card-head"><span class="category-emoji">${categoryIcon(category.name)}</span><div class="card-actions">
				<button class="icon-action" data-action="edit-category" data-id="${escapeHtml(category.id)}" aria-label="Editar ${escapeHtml(category.name)}" title="Editar">✎</button>
				<button class="icon-action danger" data-action="delete-category" data-id="${escapeHtml(category.id)}" aria-label="Eliminar ${escapeHtml(category.name)}" title="Eliminar">⌫</button>
			</div></div>
			<h3>${escapeHtml(category.name)}</h3><p>${count} ${count === 1 ? 'plato en esta categoría' : 'platos en esta categoría'}</p>
		</article>`;
	}).join('');
	$('#categoryEmpty').hidden = categories.length > 0;
}

function getFilteredMenu() {
	const search = $('#menuSearch').value.trim().toLocaleLowerCase('es');
	const categoryFilter = $('#menuCategoryFilter').value;
	const availabilityFilter = $('#menuAvailabilityFilter').value;
	return menu.filter((dish) => {
		const matchesSearch = `${dish.name} ${dish.description || ''}`.toLocaleLowerCase('es').includes(search);
		const matchesCategory = !categoryFilter || dish.categoryId === categoryFilter;
		const matchesAvailability = availabilityFilter === '' || String(dish.available) === availabilityFilter;
		return matchesSearch && matchesCategory && matchesAvailability;
	});
}

function renderMenu() {
	renderCategoryControls();
	const items = getFilteredMenu();
	$('#menuTable').innerHTML = items.map((dish) => `<tr>
		<td><div class="menu-name-cell"><span class="dish-avatar">${dishIcon(dish)}</span><div><strong>${escapeHtml(dish.name)}</strong><small>${escapeHtml(dish.description || 'Sin descripción')}</small></div></div></td>
		<td>${escapeHtml(categoryName(dish.categoryId))}</td><td>${formatPrice(dish.price)}</td>
		<td><button class="availability-toggle ${dish.available ? '' : 'unavailable'}" data-action="toggle-menu" data-id="${escapeHtml(dish.id)}">${dish.available ? 'Disponible' : 'Desactivado'}</button></td>
		<td class="actions-cell"><div class="card-actions">
			<button class="icon-action" data-action="edit-menu" data-id="${escapeHtml(dish.id)}" aria-label="Editar ${escapeHtml(dish.name)}" title="Editar">✎</button>
			<button class="icon-action danger" data-action="delete-menu" data-id="${escapeHtml(dish.id)}" aria-label="Eliminar ${escapeHtml(dish.name)}" title="Eliminar">⌫</button>
		</div></td>
	</tr>`).join('');
	$('#menuEmpty').hidden = items.length > 0;
}

function renderOrderOptions() {
	const availableDishes = menu.filter((dish) => dish.available);
	$('#orderMenuOptions').innerHTML = availableDishes.length ? availableDishes.map((dish) => `<label class="order-option">
		<input type="checkbox" name="dish" value="${escapeHtml(dish.id)}">
		<span><strong>${escapeHtml(dish.name)}</strong><small>${escapeHtml(categoryName(dish.categoryId))}</small></span>
		<b>${formatPrice(dish.price)}</b><input type="number" name="quantity" min="1" max="99" value="1" aria-label="Cantidad de ${escapeHtml(dish.name)}">
	</label>`).join('') : '<div class="empty-state compact-empty"><strong>No hay platos disponibles</strong><p>Activa platos en el menú antes de crear un pedido.</p></div>';
	$('#orderTotal').textContent = formatPrice(0);
}

function renderOrderTable() {
	const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
	$('#ordersTable').innerHTML = sortedOrders.map((order) => {
		const detail = order.items.map((item) => `${item.quantity}× ${escapeHtml(item.name)}`).join(', ');
		const date = new Date(order.createdAt);
		const formattedDate = Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
		const statusOptions = orderStatuses.map((status) => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`).join('');
		return `<tr><td>#${escapeHtml(order.number)}</td><td>${escapeHtml(order.customer)}</td><td class="order-detail" title="${detail}">${detail}</td><td>${formattedDate}</td>
			<td><select class="status-select" data-action="update-status" data-id="${escapeHtml(order.id)}" aria-label="Estado del pedido ${escapeHtml(order.number)}">${statusOptions}</select></td>
			<td><strong>${formatPrice(order.total)}</strong></td><td class="actions-cell"><button class="icon-action danger" data-action="delete-order" data-id="${escapeHtml(order.id)}" aria-label="Eliminar pedido ${escapeHtml(order.number)}" title="Eliminar pedido">⌫</button></td></tr>`;
	}).join('');
	$('#ordersEmpty').hidden = orders.length > 0;
}

function renderRecentOrders() {
	const recent = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
	$('#recentOrders').innerHTML = recent.map((order) => `<tr>
		<td>#${escapeHtml(order.number)}</td><td>${escapeHtml(order.customer)}</td>
		<td>${new Date(order.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
		<td><span class="status-pill ${statusClass[order.status] || ''}">${escapeHtml(order.status)}</span></td><td>${formatPrice(order.total)}</td>
	</tr>`).join('');
	$('#recentEmpty').hidden = recent.length > 0;
}

function renderFeaturedMenu() {
	const featured = menu.filter((dish) => dish.available).slice(0, 4);
	$('#featuredMenu').innerHTML = featured.map((dish) => `<div class="featured-item">
		<span class="dish-avatar">${dishIcon(dish)}</span><div><strong>${escapeHtml(dish.name)}</strong><small>${escapeHtml(categoryName(dish.categoryId))}</small></div><b>${formatPrice(dish.price)}</b>
	</div>`).join('');
	$('#featuredEmpty').hidden = featured.length > 0;
}

function renderAll() {
	renderCounts();
	renderCategories();
	renderMenu();
	renderOrderTable();
	renderRecentOrders();
	renderFeaturedMenu();
}

function openCategoryDialog(category = null) {
	editingCategoryId = category?.id || null;
	$('#categoryDialogTitle').textContent = category ? 'Editar categoría' : 'Nueva categoría';
	$('#categoryName').value = category?.name || '';
	$('#categoryError').textContent = '';
	$('#categoryDialog').showModal();
	$('#categoryName').focus();
}

function openMenuDialog(dish = null) {
	if (!categories.length) {
		showToast('Crea una categoría antes de añadir platos.');
		navigate('categorias');
		return;
	}
	editingMenuId = dish?.id || null;
	$('#menuDialogTitle').textContent = dish ? 'Editar plato' : 'Añadir plato';
	$('#menuName').value = dish?.name || '';
	$('#menuDescription').value = dish?.description || '';
	$('#menuCategory').value = dish?.categoryId || '';
	$('#menuPrice').value = dish?.price ?? '';
	$('#menuError').textContent = '';
	$('#menuDialog').showModal();
	$('#menuName').focus();
}

function openOrderDialog() {
	if (!menu.some((dish) => dish.available)) {
		showToast('No hay platos disponibles para crear un pedido.');
		navigate('menu');
		return;
	}
	$('#orderForm').reset();
	$('#orderError').textContent = '';
	renderOrderOptions();
	$('#orderDialog').showModal();
	$('#customerName').focus();
}

function requestDelete(message) {
	return window.confirm(message);
}

function deleteCategory(id) {
	if (menu.some((dish) => dish.categoryId === id)) {
		showToast('No puedes eliminarla mientras tenga platos asociados.');
		return;
	}
	const category = categories.find((item) => item.id === id);
	if (!category || !requestDelete(`¿Eliminar la categoría "${category.name}"?`)) return;
	categories = categories.filter((item) => item.id !== id);
	saveData();
	renderAll();
	showToast('Categoría eliminada.');
}

function deleteMenuItem(id) {
	const dish = menu.find((item) => item.id === id);
	if (!dish || !requestDelete(`¿Eliminar "${dish.name}" del menú? Los pedidos existentes no se modificarán.`)) return;
	menu = menu.filter((item) => item.id !== id);
	saveData();
	renderAll();
	showToast('Plato eliminado del menú.');
}

function deleteOrder(id) {
	const order = orders.find((item) => item.id === id);
	if (!order || !requestDelete(`¿Eliminar el pedido #${order.number}?`)) return;
	orders = orders.filter((item) => item.id !== id);
	saveData();
	renderAll();
	showToast('Pedido eliminado.');
}

function handleActionClick(event) {
	const button = event.target.closest('[data-action]');
	if (!button) return;
	const { action, id } = button.dataset;
	if (action === 'new-order') {
		openOrderDialog();
	} else if (action === 'edit-category') {
		openCategoryDialog(categories.find((category) => category.id === id));
	} else if (action === 'delete-category') {
		deleteCategory(id);
	} else if (action === 'edit-menu') {
		openMenuDialog(menu.find((dish) => dish.id === id));
	} else if (action === 'delete-menu') {
		deleteMenuItem(id);
	} else if (action === 'delete-order') {
		deleteOrder(id);
	} else if (action === 'toggle-menu') {
		const dish = menu.find((item) => item.id === id);
		if (!dish) return;
		dish.available = !dish.available;
		saveData();
		renderAll();
		showToast(dish.available ? 'Plato activado y disponible.' : 'Plato desactivado.');
	}
}

function handleCategorySubmit(event) {
	event.preventDefault();
	const name = $('#categoryName').value.trim();
	if (!name) return;
	const duplicate = categories.some((category) => category.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es') && category.id !== editingCategoryId);
	if (duplicate) {
		$('#categoryError').textContent = 'Ya existe una categoría con ese nombre.';
		return;
	}
	if (editingCategoryId) {
		categories = categories.map((category) => category.id === editingCategoryId ? { ...category, name } : category);
		showToast('Categoría actualizada.');
	} else {
		categories.push({ id: makeId('cat'), name });
		showToast('Categoría creada.');
	}
	saveData();
	$('#categoryDialog').close();
	renderAll();
}

function handleMenuSubmit(event) {
	event.preventDefault();
	const form = new FormData(event.currentTarget);
	const name = String(form.get('name')).trim();
	const description = String(form.get('description')).trim();
	const categoryId = String(form.get('categoryId'));
	const price = Number(form.get('price'));
	if (!categories.some((category) => category.id === categoryId)) {
		$('#menuError').textContent = 'Selecciona una categoría válida.';
		return;
	}
	if (!Number.isFinite(price) || price <= 0) {
		$('#menuError').textContent = 'El precio debe ser mayor que cero.';
		return;
	}
	if (editingMenuId) {
		menu = menu.map((dish) => dish.id === editingMenuId ? { ...dish, name, description, categoryId, price } : dish);
		showToast('Plato actualizado.');
	} else {
		menu.push({ id: makeId('dish'), name, description, categoryId, price, available: true });
		showToast('Plato añadido como disponible.');
	}
	saveData();
	$('#menuDialog').close();
	renderAll();
}

function updateOrderTotal() {
	let total = 0;
	$$('.order-option').forEach((option) => {
		const checkbox = $('input[type="checkbox"]', option);
		const quantity = $('input[type="number"]', option);
		quantity.disabled = !checkbox.checked;
		if (checkbox.checked) total += (menu.find((dish) => dish.id === checkbox.value)?.price || 0) * Math.max(1, Number(quantity.value) || 1);
	});
	$('#orderTotal').textContent = formatPrice(total);
}

function handleOrderSubmit(event) {
	event.preventDefault();
	const customer = $('#customerName').value.trim();
	const selectedItems = $$('.order-option').filter((option) => $('input[type="checkbox"]', option).checked);
	if (!selectedItems.length) {
		$('#orderError').textContent = 'Selecciona al menos un plato para el pedido.';
		return;
	}
	const items = selectedItems.map((option) => {
		const checkbox = $('input[type="checkbox"]', option);
		const dish = menu.find((item) => item.id === checkbox.value);
		const quantity = Math.max(1, Math.min(99, Number($('input[type="number"]', option).value) || 1));
		return { menuItemId: dish.id, name: dish.name, price: dish.price, quantity };
	});
	const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const nextNumber = orders.reduce((highest, order) => Math.max(highest, Number(order.number) || 0), 0) + 1;
	orders.push({
		id: makeId('order'),
		number: String(nextNumber).padStart(4, '0'),
		customer,
		items,
		total,
		status: 'Pendiente',
		createdAt: new Date().toISOString()
	});
	saveData();
	$('#orderDialog').close();
	renderAll();
	showToast('Pedido creado y enviado a cocina.');
}

$$('.nav-link').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.view)));
$$('[data-go]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.go)));
$('#addCategoryButton').addEventListener('click', () => openCategoryDialog());
$('#addMenuButton').addEventListener('click', () => openMenuDialog());
$('#addOrderButton').addEventListener('click', openOrderDialog);
$('#categoryForm').addEventListener('submit', handleCategorySubmit);
$('#menuForm').addEventListener('submit', handleMenuSubmit);
$('#orderForm').addEventListener('submit', handleOrderSubmit);
$('#menuSearch').addEventListener('input', renderMenu);
$('#menuCategoryFilter').addEventListener('change', renderMenu);
$('#menuAvailabilityFilter').addEventListener('change', renderMenu);
$('#orderMenuOptions').addEventListener('change', updateOrderTotal);
$('#orderMenuOptions').addEventListener('input', updateOrderTotal);
$('#categoryGrid').addEventListener('click', handleActionClick);
$('#menuTable').addEventListener('click', handleActionClick);
$('#ordersTable').addEventListener('click', handleActionClick);
$('#recentOrders').addEventListener('click', handleActionClick);
$('#ordersEmpty').addEventListener('click', handleActionClick);
$('#ordersTable').addEventListener('change', (event) => {
	const select = event.target.closest('[data-action="update-status"]');
	if (!select) return;
	const order = orders.find((item) => item.id === select.dataset.id);
	if (!order || !orderStatuses.includes(select.value)) return;
	order.status = select.value;
	saveData();
	renderAll();
	showToast(`Pedido #${order.number}: ${order.status.toLocaleLowerCase('es')}.`);
});
$$('[data-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
$$('.app-dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
	if (event.target === dialog) dialog.close();
}));
$('#todayLabel').textContent = new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
renderAll();
