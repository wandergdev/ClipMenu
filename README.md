# ClipMenu – Clipboard Manager para macOS

**ClipMenu** es un gestor de portapapeles (clipboard manager) para macOS desarrollado con [Electron](https://www.electronjs.org/).  
Funciona de forma similar a la función `Win + V` de Windows: guarda automáticamente texto e imágenes que copies, y te permite reutilizarlos rápidamente desde un historial accesible con un atajo de teclado.

## ✨ Características

- 📋 Guarda automáticamente texto e imágenes que copies al portapapeles.
- 🔍 Historial accesible con `⌘ + ⇧ + V`.
- 🖼️ Miniaturas más grandes para las imágenes copiadas.
- 🗑️ Limpieza automática de historial mayor a **2 días**.
- 🚀 Siempre disponible en la **barra de menú** (menubar app).
- ⌨️ Pegar automático: al seleccionar un item se pega directamente en la app donde estabas.
- 💾 Persistencia: historial y archivos se guardan en  
  `~/Library/Application Support/ClipMenu`.

## 📦 Instalación (modo desarrollo)

1. Clonar el repositorio:
  
  ```bash
  git clone https://github.com/wandergdev/clipmenu.git
  cd clipmenu
  ```
  
2. Instalar dependencias:
  
  ```bash
  npm install
  ```
  
3. Ejecutar en modo desarrollo:
  
  ```bash
  npm start
  ```
  

## 🔨 Empaquetar la app (macOS)

Para generar un `.dmg` instalable:

1. Instala [electron-builder](https://www.electron.build/):
  
  ```bash
  npm install --save-dev electron-builder
  ```
  
2. En `package.json` agrega:
  
  ```json
  "scripts": {
    "start": "electron .",
    "dist": "electron-builder"
  },
  "build": {
    "appId": "com.wander.clipmenu",
    "mac": {
      "category": "public.app-category.productivity"
    }
  }
  ```
  
3. Empaqueta:
  
  ```bash
  npm run dist
  ```
  

Esto generará un `.dmg` o `.app` en la carpeta `dist/`.

## 🚀 Uso

- Usa `⌘ + ⇧ + V`/ `cmd + shift + v`  para abrir el historial.
  
- Haz click en un elemento para copiarlo y pegarlo automáticamente en la app que estabas usando.
  
- Desde el icono en la barra de menú puedes:
  
  - Mostrar historial.
  - Activar/desactivar inicio automático.
  - Salir de la aplicación.

## 📂 Estructura del proyecto

```
clipmenu/
 ├── main.js         # Proceso principal de Electron
 ├── preload.js      # Comunicación segura entre main y renderer
 ├── renderer/       # Interfaz de usuario
 │   ├── index.html
 │   └── renderer.js
 ├── package.json
 └── README.md
```

## 🤝 Contribuciones

¡Contribuciones son bienvenidas!
Si quieres mejorar ClipMenu, abre un *issue* o envía un *pull request*.

## 📜 Licencia

Este proyecto está licenciado bajo la licencia MIT.
Consulta el archivo [LICENSE](LICENSE) para más información.