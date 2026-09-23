# Publicar en la Chrome Web Store

Guía para subir la extensión a la tienda. Todo lo que hay que pegar está aquí para no
escribirlo dos veces. Los pasos de la tienda los hace una persona: el panel no tiene API
para el alta ni para la ficha.

## Antes de empezar

1. **Cuenta de desarrollador.** Entra en https://chrome.google.com/webstore/devconsole con
   `hola@criterio.design`: es la cuenta de Google del proyecto (la misma de Google Cloud).
   `tech@` es solo un buzón de Namecheap, no existe como cuenta de Google, y hola@ es alias de
   ese buzón, así que los correos de Google llegan igual. Paga el alta única de 5 $; Google
   puede tardar unas horas en activarla.
2. **Paquete.** `node extension/build.mjs` deja `extension/dist/criterio-design-<versión>.zip`
   sin las entradas de localhost. Sube ese zip, no la carpeta.
3. **Versión.** Antes de cada subida, sube `version` en `extension/chrome/manifest.json`. La tienda
   no admite dos veces la misma.

## Ficha de la tienda

- **Nombre:** criterio.design
- **Resumen corto:** el `extDescription` de `_locales` (sale solo en cada idioma).
- **Descripción larga (inglés, la tienda pide una):**

  > Save the site you are looking at to your criterio.design library in one click.
  >
  > Open the extension on any page and you see what will be saved: a shot of the tab, the
  > favicon, the title and the address. Press Save and it lands in your library with a name,
  > a collection and tags picked by criterio.design, the same as when you paste a URL in the app.
  >
  > Each browser connects with its own key, tied to one workspace, that you can revoke at any
  > time from Settings. The extension sends only the address, the title and the screenshot,
  > and only when you press Save.

- **Categoría:** Productivity → Tools (o "Developer Tools", vale cualquiera de las dos).
- **Idiomas:** English (por defecto) y Español. La tienda los coge del zip.
- **Capturas (1280×800):** `extension/store/1-save-en.png`, `2-already-saved-en.png`,
  `3-connect-en.png`; para la ficha en castellano, `1-save-es.png`. Se regeneran con Chrome
  headless a partir del popup (ver el handoff de la extensión).
- **Icono de la tienda:** `extension/chrome/icons/icon128.png` (mismo que el del manifest).
- **Web:** https://criterio.design
- **Política de privacidad:** https://criterio.design/extension/privacy (obligatoria porque
  la extensión envía datos a nuestro servidor).

## Pestaña "Privacy practices"

- **Single purpose:** "Save the current tab (address, title and a screenshot) to the user's
  criterio.design library."
- **Justificación de permisos:**
  - `activeTab`: read the current tab's URL and title and capture its visible area when the
    user clicks the extension.
  - `storage`: keep the access key and workspace name the user chose.
  - `host_permissions` (criterio.design): call the criterio.design API to check and save
    sites; the content script runs only on the page that hands the key to the extension.
- **Remote code:** No.
- **Uso de datos:** marcar "Website content" (la captura y el título) y "Web history" NO
  (no se guarda historial; solo la página que el usuario guarda a propósito). Los tres
  certificados de abajo se pueden firmar: no se venden datos, no se usan fuera del fin
  declarado, no se usan para solvencia ni préstamos.

## Después de enviar

- La revisión suele tardar de 1 a 3 días laborables. Llega un correo a tech@.
- Mientras tanto, los socios usan el zip de la release de GitHub (modo desarrollador).
- Cuando esté aprobada, apuntar el enlace público en la issue #1 y en Ajustes → Extensión
  del navegador (hoy el botón lleva a la página de conectar; podría llevar a instalarla).
