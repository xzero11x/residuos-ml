# Bagua Circular

Web responsive en Astro con simulador educativo, blog compartido y panel de administración. Backend Node.js + SQLite en Docker, sin cuentas externas.

Consulta **EXPOSICION.md** para los enlaces, el panel y los comandos de inicio. Credenciales locales en **ADMIN-ACCESO.txt** (ignorado por Git y excluido de la imagen).

```sh
npm install
npm run check
npm run build
docker compose up -d --build
```

`npm run dev` sirve la interfaz en el puerto 4321 y conecta el blog al contenedor en 4322. Para administrar utiliza directamente http://localhost:4322/admin/.

## Desplegar en Vercel

1. Importa el repositorio `xzero11x/residuos-ml`.
2. Selecciona el framework **Astro** y la carpeta raíz **./**. Mantén los comandos y la salida detectados por Vercel.
3. Añade la variable de entorno del servidor `BLOG_API_URL` con el enlace HTTPS actual de tu túnel, sin `/` al final. Durante esta exposición: `https://pie-tuning-myers-receiver.trycloudflare.com`.
4. Pulsa **Deploy**. Si cambias la variable después, vuelve a desplegar.

La portada y `/panel/` se publican en Vercel; el blog utiliza el almacenamiento de tu PC. Mantén Docker, la PC e Internet activos. El panel privado de administración está en la dirección del túnel seguida de `/admin/`. Si reinicias el túnel y cambia el enlace, actualiza `BLOG_API_URL` y vuelve a desplegar en Vercel.

Las contraseñas, las bases de datos y los archivos `.env` no se suben a GitHub. El repositorio contiene únicamente `.env.example` como referencia.
