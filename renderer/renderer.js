// renderer/renderer.js
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

    // Thumbnail a la izquierda
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    if (it.type === 'image') {
      thumb.textContent = 'IMG'
      thumb.title = 'Image'
    } else {
      thumb.textContent = 'T';
      thumb.title = 'Text';
    }

    // Contenido (texto o imagen más grande)
    const content = document.createElement('div');
    content.className = 'content';

    if (it.type === 'text') {
      content.textContent = it.content;
    } else {
      // Prefijo "Img"
      const label = document.createElement('div');
      // label.textContent = 'Img';
      // label.style.fontWeight = 'bold';
      // label.style.marginBottom = '4px';

      // Miniatura más grande
      const img = document.createElement('img');
      img.src = `file://${it.path}`;
      img.style.maxWidth = '160px';
      img.style.maxHeight = '120px';
      img.style.objectFit = 'contain';
      img.style.borderRadius = '6px';
      img.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';

      content.appendChild(label);
      content.appendChild(img);
    }

    // Metadata (fecha y hora)
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = fmtTime(it.when);

    li.appendChild(thumb);
    li.appendChild(content);
    li.appendChild(meta);
    li.addEventListener('click', () => useItem(it.id));
    listEl.appendChild(li);
  });

  // Asegura que el activo sea visible
  const active = listEl.querySelector('.item.active');
  if (active) {
    active.scrollIntoView({ block: 'nearest' });
  }
}


function useItem(id) {
  window.clipAPI.useItem(id);
}

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
        : '[imagen]'.includes(q) // simple
    );
  }
  activeIndex = 0;
  render();
}

// Controles
listEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { setActive(activeIndex + 1); e.preventDefault(); }
  if (e.key === 'ArrowUp') { setActive(activeIndex - 1); e.preventDefault(); }
  if (e.key === 'Enter') {
    const it = filtered[activeIndex];
    if (it) useItem(it.id);
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
    filter(); // mantiene el filtro
  });
}

boot();
