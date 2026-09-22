# Extensión de Criterio para el navegador

Guarda la web que estás viendo en tu librería de Criterio con un clic. La extensión no analiza
nada por su cuenta: manda la dirección, el título de la pestaña y una captura de lo visible, y el
servidor decide nombre, colección, etiquetas y miniatura, igual que cuando pegas una URL en la app.

## Cómo entra

No usa la cookie de sesión de la web (Safari no lo permite de forma fiable). Al pulsar
"Conectar con Criterio" se abre `criterio.design/extension/conectar`: ahí eliges el workspace y
se crea una llave larga (`crit_…`) que la extensión guarda en `chrome.storage.local`. Todas las
llamadas van con `Authorization: Bearer crit_…` a las rutas versionadas de `/api/ext/v1/`:

| Ruta | Qué hace |
|---|---|
| `GET /me` | Comprueba la llave; devuelve persona y workspace |
| `DELETE /me` | La extensión revoca su propia llave al desconectarse |
| `GET /items/lookup?url=` | ¿Esta web ya está guardada? |
| `POST /items` | Guarda `{ url, title, screenshot }` |

Las llaves se ven y se revocan en **Equipo**. Una llave deja de valer sola si la persona sale del
workspace. En la base de datos solo se guarda el SHA-256 de la llave.

## Probarla en Chrome (modo desarrollador)

1. `chrome://extensions` → activa "Modo de desarrollador" (arriba a la derecha).
2. "Cargar descomprimida" → elige la carpeta `extension/chrome`.
3. Fija la extensión en la barra y ábrela en cualquier web.

Para probar contra el servidor local, en el popup abre "Ya tengo una llave" y pon como servidor
`http://localhost:<puerto>`; la llave la creas en `http://localhost:<puerto>/extension/conectar`.

## Safari

El código es el mismo. Safari exige empaquetarla dentro de una app de Mac con Xcode:
`xcrun safari-web-extension-converter extension/chrome`. Se hará cuando la de Chrome esté
publicada.

## Publicar en la Chrome Web Store

Comprime la carpeta `extension/chrome` en un zip y súbelo al panel de desarrollador de Chrome
(cuota única de 5 $). Antes de subir, sube `version` en `manifest.json`.
