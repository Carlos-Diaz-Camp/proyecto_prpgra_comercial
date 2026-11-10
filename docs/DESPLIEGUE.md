# Publicar Criterio en Render

## 1. Repositorio GitHub

Crea un repositorio vacío en [GitHub](https://github.com/new) y elige su visibilidad. Deja desmarcadas las opciones de README, licencia y .gitignore porque Criterio ya tiene historial local en main.

Si GitHub CLI requiere iniciar sesión, ejecuta gh auth login -h github.com y completa el acceso en el navegador. Desde la carpeta del proyecto, puedes revisar y publicar los commits existentes con estos comandos:

```powershell
git log --oneline
git status --short --branch
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

En la pestaña **Actions**, espera los trabajos de backend, frontend y container. Si Codex va a publicar por ti, basta con compartir la URL HTTPS y avisar que GitHub CLI quedó autenticado.

## 2. Clave de Groq

En [Groq Console](https://console.groq.com/keys), crea una clave. Escribe su valor en la línea `GROQ_API_KEY=` de `backend/.env` para las pruebas locales y en el campo secreto del mismo nombre al crear el Blueprint en Render. Reinicia la API local después de editar el archivo. Git excluye `backend/.env`.

El modelo inicial `openai/gpt-oss-20b` admite llamadas a herramientas. Comprueba disponibilidad y límites en tu organización de Groq. Puedes cambiar el modelo en **Administración → Servicios**. [Modelos disponibles](https://console.groq.com/docs/models) · [Límites](https://console.groq.com/docs/rate-limits).

## 3. Blueprint en Render

1. En el [panel de Render](https://dashboard.render.com/), elige **New → Blueprint** y vincula el repositorio de GitHub. Selecciona `main` y confirma que Render lee `render.yaml`.
2. Revisa los recursos y el plan que se muestran. La configuración incluye un Web Service `criterio` y un PostgreSQL `criterio-db`. Introduce `GROQ_API_KEY` cuando Render pida la variable secreta.
3. Espera el primer despliegue. Render genera `JWT_SECRET` y enlaza la URL interna de PostgreSQL mediante el Blueprint. La aplicación usa la URL pública asignada por Render para validar la renovación de sesión. Si configuras un dominio propio, añade `APP_ORIGIN` con su URL HTTPS exacta.
4. En **Settings → Auto-Deploy**, verifica **After CI Checks Pass**. En el próximo cambio a `main`, confirma que el despliegue corresponde al commit que pasó Actions.

La instancia gratuita de Render Postgres caduca a los 30 días y el servicio web gratuito puede dormir tras 15 minutos sin tráfico. Abre la aplicación antes de la demostración para que arranque. [Blueprints](https://render.com/docs/blueprint-spec) · [Despliegues](https://render.com/docs/deploys) · [Planes gratuitos](https://render.com/docs/free).

## 4. Inicializar PostgreSQL y crear cuentas

1. Abre **criterio-db → Connect** y copia la **External Database URL**. Si usas restricciones de acceso externo, permite la IP de tu equipo para este paso. La aplicación de Render seguirá usando su conexión interna.
2. En tu equipo, configura temporalmente `DATABASE_URL` con esa URL externa en una terminal PowerShell. Pegar el valor en `Read-Host -MaskInput` evita que aparezca en el historial. Requiere PowerShell 7. Si tu terminal no admite `-MaskInput`, usa un `backend/.env` local y excluido de Git.

```powershell
Set-Location backend
$env:DATABASE_URL = Read-Host 'External Database URL de Render' -MaskInput
..\.venv\Scripts\python.exe manage.py init-postgres
..\.venv\Scripts\python.exe manage.py create-user --email admin@ejemplo.com --name Administrador
..\.venv\Scripts\python.exe manage.py create-user --email reporte@ejemplo.com --name 'Power BI' --role reporter
Remove-Item Env:DATABASE_URL
```

`init-postgres` ejecuta `database/setup.sql` una vez y se detiene si la tabla de usuarios ya existe. También puedes ejecutar ese SQL en el cliente PostgreSQL que prefieras. Las dos contraseñas se solicitan por separado y se guardan como hashes Argon2. [Conexión a Render Postgres](https://render.com/docs/postgresql-creating-connecting).

## 5. Comprobación de la entrega

1. Abre la URL `https://...onrender.com` y entra como administrador. Crea una cuenta de usuario normal desde **Administración**. Para demostrar el límite, usa una cuenta aparte y asígnale un cupo de `0`.
2. Abre `/docs` y `/api/health`. En Postman, configura `baseUrl` con la URL de Render y ejecuta la carpeta **Integración real · Groq y DummyJSON**. [Guía de Postman](postman/README.md).
3. Prueba cada asistente desde React. Comprueba las referencias recuperadas y los pasos externos de los agentes. Si Groq devuelve un error, revisa que la clave esté configurada en Render y que el modelo aparezca en la lista de tu cuenta.
4. Crea el informe de Power BI siguiendo [la guía del reporte](powerbi/README.md). Guarda `Criterio.pbix` después de comprobar que coincide con la web.
5. Añade al PDF la URL de la aplicación, `/docs`, el modelo de datos, el diagrama y las capturas de tus pruebas reales. [Guion de demostración](PROYECTO.md).
