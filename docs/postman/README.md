# Pruebas de la API con Postman

Importa [Criterio · Pruebas de API](../criterio.postman_collection.json) si todavía no aparece en tu espacio de trabajo. La colección tiene 39 solicitudes en dos carpetas. Selecciona y ejecuta una carpeta a la vez. Las solicitudes de cada bloque intercambian JWT y otros datos durante la ejecución.

| Carpeta | Entorno |
| --- | --- |
| **QA local · permisos, CRUD, cuota y reportes** | API en localhost, PostgreSQL desechable y cuentas de QA. Incluye autenticación, renovación con CSRF, permisos, CRUD de un producto de prueba, historial, bloqueo por cupo y reporte para Power BI. |
| **Integración real · Groq y DummyJSON** | API local o publicada con clave de Groq y una cuenta de demostración con cupo. Comprueba RAG, continuación de la conversación, pasos externos, consumo y reporte. |

## Repetir la ejecución local

1. Crea una base PostgreSQL local y vacía llamada criterio_postman. Desde la raíz del proyecto, configura DATABASE_URL con esa conexión y ejecuta el preparador:

```powershell
$env:DATABASE_URL = 'postgresql://USUARIO:CONTRASEÑA@127.0.0.1:5432/criterio_postman'
.\.venv\Scripts\python.exe scripts\prepare_postman_qa.py
Set-Location backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

2. En Postman Desktop, selecciona la carpeta **QA local**, pulsa **Run** y elige la ejecución manual. En **Test data file**, selecciona tmp/postman-run-data.json como archivo local. Sus valores corresponden a cuentas desechables de localhost. Usa una iteración. [Collection Runner](https://learning.postman.com/docs/tests-and-scripts/running-collections/intro-to-collection-runs).
3. Consulta [los resultados](RESULTADOS.md). Si utilizas Newman, proporciona tmp/postman-env.json como entorno y selecciona la carpeta QA local con la opción `--folder`. Git excluye los archivos temporales con contraseñas.

## Ejecutar la integración real

Configura GROQ_API_KEY en el servidor. En un entorno local de Postman, define `baseUrl`, `email` y `password` con la URL de la API y una cuenta de demostración. Utiliza valores locales de Postman para las credenciales. Ejecuta la carpeta **Integración real · Groq y DummyJSON** con **Run**. Si Groq limita llamadas por minuto, espera a que se recupere el cupo del proveedor y vuelve a ejecutar el bloque. Las pruebas revisan el consumo acumulado, por lo que conviene evitar consultas paralelas con la misma cuenta mientras corre el bloque.

Para regenerar el JSON de la colección después de editar las pruebas, ejecuta `node scripts/export_postman.mjs` desde la raíz del proyecto.
