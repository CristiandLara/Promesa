# Ritmo - Gestión del restaurante

Aplicación web sencilla para organizar las categorías y los platos de un restaurante, y registrar y consultar pedidos. Está hecha con HTML, CSS y JavaScript nativo; no necesita instalar dependencias ni ejecutar un servidor.

## Cómo abrir la aplicación

Abre `index.html` en un navegador moderno. Los datos se guardan en el almacenamiento local (`localStorage`) del navegador, así que permanecen después de cerrar la página en ese mismo navegador y dispositivo. No hay servidor ni base de datos compartida.

## Archivos del proyecto

- `index.html`: estructura de la interfaz y elementos que actualiza el JavaScript.
- `styles.css`: diseño, distribución y estilos visuales.
- `scripts.js`: datos, persistencia, acciones, validaciones y actualización de la interfaz.

## Qué puedes hacer

- **Resumen:** consultar cifras, los pedidos recientes y algunos platos disponibles.
- **Categorías:** crear, editar y eliminar categorías. No se puede eliminar una categoría que todavía tenga platos asociados.
- **Menú:** crear y editar platos, asignarles categoría y precio, buscar y filtrar platos, y activar o desactivar su disponibilidad.
- **Pedidos:** crear pedidos con uno o más platos disponibles, indicar cantidades, consultar el total, cambiar el estado y eliminar pedidos.

## Cómo funciona `scripts.js`

### 1. Datos iniciales y almacenamiento

Al principio del archivo se definen:

- `STORAGE_KEYS`: nombres usados para guardar las colecciones en `localStorage`.
- `initialCategories` y `initialMenu`: categorías y platos de ejemplo que se usan la primera vez.
- `orderStatuses`: estados permitidos para un pedido.
- `statusClass` y `categoryIcons`: correspondencias para mostrar clases de estilo e iconos.
- `numberFormatter`: formato de moneda en euros con configuración regional española.

`loadCollection(key, fallback)` lee una colección guardada y la convierte desde JSON. Si todavía no hay datos, guarda y devuelve una copia de los valores iniciales. Si los datos guardados no se pueden leer o no son una lista, informa del error en la consola y devuelve una copia alternativa.

Las variables `categories`, `menu` y `orders` contienen los datos en uso. Se declaran con `let` porque algunas acciones reemplazan la colección completa, por ejemplo al filtrar elementos con `filter()` o actualizar uno con `map()`. `editingCategoryId` y `editingMenuId` guardan qué elemento se está editando; `toastTimeout` conserva el temporizador del aviso temporal.

### 2. Ayudantes y eventos

Las funciones `$()` y `$$()` simplifican la búsqueda de elementos del DOM: la primera devuelve un elemento y la segunda devuelve una lista de elementos como arreglo.

Otros ayudantes:

- `escapeHtml(value)` escapa caracteres especiales antes de insertar datos en fragmentos HTML.
- `formatPrice(price)` presenta un precio como moneda.
- `categoryName(id)`, `categoryIcon(name)` y `dishIcon(dish)` obtienen el nombre o el icono para mostrar.
- `makeId(prefix)` genera identificadores con un prefijo, la hora actual y una parte aleatoria. Convierte los números a base 36 para que esas partes sean más compactas.

Después se registran los eventos de la interfaz. Los botones de navegación cambian de sección; los formularios crean o actualizan datos; los campos del menú vuelven a aplicar los filtros; y los botones de acción permiten editar, eliminar o cambiar disponibilidad. Los eventos de clic se delegan en contenedores como las tablas y la cuadrícula, así también funcionan con botones creados dinámicamente. Los cuadros de diálogo se cierran con sus botones de cierre o al hacer clic en el fondo.

### 3. Guardado y navegación

- `saveData()` serializa y guarda las tres colecciones en `localStorage`.
- `showToast(message)` muestra un aviso temporal y reinicia su temporizador si ya había otro aviso visible.
- `navigate(viewName)` activa la sección solicitada y actualiza la navegación y el título de la sección.

### 4. Renderizado de la interfaz

Las funciones de renderizado toman el estado actual de las colecciones y actualizan los elementos HTML:

- `renderCounts()` actualiza los contadores del resumen y la navegación.
- `renderCategoryControls()` rellena los selectores de categorías y desactiva la opción de añadir platos cuando no hay categorías.
- `renderCategories()` construye las tarjetas de categorías y muestra cuántos platos tiene cada una.
- `getFilteredMenu()` aplica la búsqueda y los filtros de categoría y disponibilidad.
- `renderMenu()` crea las filas de la tabla del menú con los resultados filtrados.
- `renderOrderOptions()` muestra solo los platos disponibles en el formulario de pedidos.
- `renderOrderTable()` muestra todos los pedidos, ordenados del más reciente al más antiguo.
- `renderRecentOrders()` muestra los cuatro pedidos más recientes en el resumen.
- `renderFeaturedMenu()` muestra hasta cuatro platos disponibles.
- `renderAll()` ejecuta los renderizados principales después de un cambio de datos.

### 5. Formularios y acciones

`openCategoryDialog()`, `openMenuDialog()` y `openOrderDialog()` preparan y abren los formularios. Si falta un requisito —por ejemplo, no hay categorías para crear un plato o no hay platos disponibles para un pedido— la aplicación muestra un aviso y dirige al usuario a la sección correspondiente.

`handleCategorySubmit(event)` valida el nombre de la categoría, impide nombres duplicados sin distinguir mayúsculas y minúsculas, y crea o actualiza la categoría.

`handleMenuSubmit(event)` comprueba que la categoría exista y que el precio sea un número mayor que cero. Luego crea o actualiza el plato.

`updateOrderTotal()` recalcula el total mostrado según los platos seleccionados y sus cantidades.

`handleOrderSubmit(event)` exige que se seleccione al menos un plato, limita las cantidades al rango de 1 a 99 y crea un pedido con un número consecutivo, sus artículos, el total, el estado inicial `Pendiente` y la fecha de creación.

`handleActionClick(event)` identifica la acción solicitada por los botones creados en las tablas y tarjetas. Las funciones `deleteCategory()`, `deleteMenuItem()` y `deleteOrder()` piden confirmación antes de eliminar. El estado de los pedidos se actualiza mediante el evento `change` del selector de estado.

### 6. Estructura de los datos

Una categoría tiene esta forma:

```js
{ id: 'cat-pizzas', name: 'Pizzas' }
```

Un plato guarda su categoría mediante `categoryId` y su disponibilidad:

```js
{
  id: 'dish-pizza',
  name: 'Pizza de la casa',
  description: 'Tomate, mozzarella, albahaca fresca',
  categoryId: 'cat-pizzas',
  price: 13.5,
  available: true
}
```

Un pedido conserva una copia del nombre y el precio de cada plato pedido. Así, los pedidos existentes no cambian si luego se modifica o elimina un plato del menú:

```js
{
  id: 'order-...',
  number: '0001',
  customer: 'Nombre del cliente',
  items: [
    { menuItemId: 'dish-pizza', name: 'Pizza de la casa', price: 13.5, quantity: 2 }
  ],
  total: 27,
  status: 'Pendiente',
  createdAt: '2026-10-27T17:00:00.000Z'
}
```

## Detalles a tener en cuenta

- Los datos son locales al navegador: borrar los datos del sitio o usar otro navegador/dispositivo no los sincroniza.
- El contador del resumen rotulado **“Pedidos de hoy”** muestra actualmente el número total de pedidos guardados; no filtra por fecha.
- Los pedidos recientes se ordenan por fecha y se limitan a cuatro en el resumen.
- La interfaz usa fuentes de Google Fonts; si no hay conexión, el navegador emplea las fuentes alternativas indicadas por los estilos.
