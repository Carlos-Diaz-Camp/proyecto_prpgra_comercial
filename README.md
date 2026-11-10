# Criterio

Aplicación académica de opiniones de productos. React muestra el catálogo, tres asistentes, el historial, el consumo y el panel administrativo. FastAPI controla permisos, consulta PostgreSQL y coordina Groq y DummyJSON.

| Recurso | Qué contiene |
| --- | --- |
| [Guía de publicación](docs/DESPLIEGUE.md) | Pasos para GitHub, Render, PostgreSQL y Groq |
| [Propuesta técnica](docs/PROYECTO.md) | Alcance, arquitectura, modelo de datos y guion para la demostración |
| [Script SQL](database/setup.sql) | Esquema PostgreSQL, 12 productos, 96 reseñas sintéticas y los tres servicios |
| [Pruebas con Postman](docs/postman/README.md) | Colección importable, entorno de QA y resultados de la ejecución local |
| [Power BI](docs/powerbi/README.md) | Consulta Power Query, medidas DAX y pasos para guardar el `.pbix` |

## Ejecutar en Windows

Necesitas Python 3.13 y Node.js 22. Desde la raíz del proyecto en PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.lock
npm --prefix frontend ci
npm --prefix frontend run build
```

Para usar PostgreSQL local, levanta el servicio de `compose.yaml` con Docker Desktop en ejecución. Define `POSTGRES_PASSWORD` con una contraseña local en tu terminal y ejecuta `docker compose up -d db`. Docker aplica `database/setup.sql` al crear el volumen por primera vez. También puedes usar una instancia PostgreSQL existente y el comando `init-postgres` descrito en la guía de publicación. Configura `backend/.env` con `DATABASE_URL=postgresql://criterio:TU_CONTRASEÑA@127.0.0.1:5432/criterio`. Codifica los caracteres reservados de la contraseña en la URL.

Si solo quieres recorrer la interfaz sin instalar PostgreSQL, usa `DATABASE_URL=sqlite:///./local.db` y ejecuta `..\.venv\Scripts\python.exe manage.py init-local` desde `backend`. Esta modalidad es para desarrollo local. El despliegue y las pruebas de integración usan PostgreSQL.

En `backend/.env` configura también `ENVIRONMENT=development`, `APP_ORIGIN=http://127.0.0.1:8000` y `GROQ_API_KEY` si quieres ejecutar IA real. Parte de `.env.example` y conserva el archivo fuera de Git. Desde la raíz:

```powershell
Set-Location backend
..\.venv\Scripts\python.exe manage.py create-user --email admin@criterio.local --name Administrador
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

El comando `create-user` solicita la contraseña sin mostrarla. Abre [Criterio local](http://127.0.0.1:8000) o [Swagger](http://127.0.0.1:8000/docs). Si ya creaste el usuario, arranca Uvicorn directamente. Si trabajas con Vite en modo desarrollo, ejecuta `npm --prefix frontend run dev` en otra terminal y ajusta `APP_ORIGIN` a la URL exacta de Vite.

## Pruebas

Desde la raíz, usa una base PostgreSQL desechable llamada `criterio_test`:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://USUARIO:CONTRASEÑA@127.0.0.1:5432/criterio_test'
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD = '1'
.\.venv\Scripts\python.exe -m pytest backend\tests -q
npm --prefix frontend run build
```

Las pruebas reconstruyen `criterio_test` desde el script y simulan las respuestas de Groq y de la fuente externa. GitHub Actions también construye la imagen Docker. Para verificar los asistentes con Groq, usa las preguntas de la propuesta técnica una vez configurada la clave.

Si editas los modelos o los datos iniciales, vuelve a generar el SQL y el JSON con `.\.venv\Scripts\python.exe scripts\export_database.py`. El script de creación está pensado para bases vacías.
