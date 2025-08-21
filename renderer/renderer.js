const listEl = document.getElementById('list');
const searchEl = document.getElementById('search');
const clearBtn = document.getElementById('clear');

let items = [];
let filtered = [];
let activeIndex = 0;

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString();
}

// Función para eliminar un item
function deleteItem(id) {
  window.clipAPI.deleteItem(id);
}

function render() {
  listEl.innerHTML = '';
  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No hay elementos en el historial aún.';
    listEl.appendChild(empty);
    return;
  }

  filtered.forEach((it, idx) => {
    const li = document.createElement('li');
    li.className = 'item' + (idx === activeIndex ? ' active' : '');
    li.dataset.id = it.id;

    // Thumbnail
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.textContent = it.type === 'image' ? 'IMG' : 'T';
    thumb.title = it.type === 'image' ? 'Imagen' : 'Texto';

    // Contenido
    const content = document.createElement('div');
    content.className = 'content';
    if (it.type === 'text') content.textContent = it.content;
    else {
      const img = document.createElement('img');
      img.src = `file://${it.path}`;
      img.style.maxWidth = '160px';
      img.style.maxHeight = '120px';
      img.style.objectFit = 'contain';
      img.style.borderRadius = '6px';
      img.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
      content.appendChild(img);
    }

    // Metadata
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = fmtTime(it.when);

    // Botón eliminar
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Eliminar item';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // evita usar el item al hacer click
      deleteItem(it.id);
    });

    li.appendChild(thumb);
    li.appendChild(content);
    li.appendChild(meta);
    li.appendChild(deleteBtn);

    li.addEventListener('click', () => window.clipAPI.useItem(it.id));

    listEl.appendChild(li);
  });

  // Asegura que el activo sea visible
  const active = listEl.querySelector('.item.active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

// Navegación y uso
function setActive(idx) {
  if (!filtered.length) return;
  activeIndex = (idx + filtered.length) % filtered.length;
  render();
}

function filter() {
  const q = (searchEl.value || '').toLowerCase();
  if (!q) filtered = items.slice();
  else {
    filtered = items.filter(i =>
      i.type === 'text'
        ? i.content.toLowerCase().includes(q)
        : '[imagen]'.includes(q)
    );
  }
  activeIndex = 0;
  render();
}

// Controles del teclado
listEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { setActive(activeIndex + 1); e.preventDefault(); }
  if (e.key === 'ArrowUp') { setActive(activeIndex - 1); e.preventDefault(); }
  if (e.key === 'Enter') {
    const it = filtered[activeIndex];
    if (it) window.clipAPI.useItem(it.id);
    e.preventDefault();
  }
  if (e.key === 'Escape') window.close();
});

searchEl.addEventListener('input', filter);
clearBtn.addEventListener('click', () => window.clipAPI.clearHistory());

// Inicialización
async function boot() {
  items = await window.clipAPI.getHistory();
  filtered = items.slice();
  render();
  searchEl.focus();

  window.clipAPI.onHistoryUpdated((h) => {
    items = h || [];
    filter();
  });
}

boot();
