# Exposición · Bagua Circular

Enlace público actual: https://pie-tuning-myers-receiver.trycloudflare.com

La web completa y el blog se sirven desde tu PC con Docker. Los aportes de todos los dispositivos se guardan en SQLite dentro del volumen `bagua-circular_blog-data`. Reiniciar contenedores conserva los datos.

- Web en tu PC: http://localhost:4322
- Panel privado: http://localhost:4322/admin/
- Contraseña: archivo local `ADMIN-ACCESO.txt`. No lo compartas.
- En la misma red Ethernet: http://192.168.1.10:4322 (el firewall debe permitirlo).
- En Internet: usa el enlace `https://….trycloudflare.com` que aparece en `docker compose logs tunnel`.

El panel permite ver todos los aportes, buscar, descargar JSON y eliminar publicaciones. El blog público muestra los 200 más recientes. Las publicaciones nuevas aparecen automáticamente en otros dispositivos en unos 15 segundos. Los aportes anteriores guardados solo en un navegador no se migran automáticamente.

## Encender

```powershell
docker compose up -d
docker compose logs tunnel
```

Mantén la PC encendida, sin suspensión, Docker activo y conexión a Internet. El túnel temporal puede cambiar de dirección al reiniciar; revisa sus registros y comparte el enlace actual. Si estás en la misma red, puedes utilizar la IP local aunque el túnel falle.

## Actualizar la web

```powershell
npm run check
npm run build
docker compose up -d --build
```

## Apagar sin borrar aportes

```powershell
docker compose stop
```

No uses `docker compose down -v`: elimina el volumen de datos. Descarga los aportes desde el panel para tener una copia.

## Vercel opcional

No necesitas Vercel para la exposición: el enlace público ya sirve toda la web desde Docker. Si decides publicar también en Vercel, configura `BLOG_API_URL` con el enlace HTTPS actual del túnel y vuelve a desplegar. El blog usa la API del PC; el panel de administración se abre desde la URL del PC/túnel, no desde Vercel. La web de Vercel requiere que tu PC y el túnel sigan activos para recibir aportes.

El simulador es una fórmula educativa; no es un modelo ML entrenado ni un pronóstico real de Bagua.
