# Resultados de Postman

La carpeta **QA local · permisos, CRUD, cuota y reportes** se ejecutó contra FastAPI y PostgreSQL local. Postman Desktop mostró **45 aprobadas, 0 fallidas y 0 omitidas**. Newman reprodujo las **28 solicitudes** y las **45 comprobaciones** sin fallos.

| Solicitud | HTTP observado | Comprobaciones aprobadas |
| --- | ---: | ---: |
| Estado del servicio | 200 | 2 |
| La API exige credenciales | 401 | 1 |
| Rechazar contraseña inválida | 401 | 1 |
| Entrar como administrador | 200 | 3 |
| Rechazar renovación sin CSRF | 401 | 1 |
| Renovar la sesión con CSRF | 200 | 2 |
| Listar los tres servicios | 200 | 2 |
| Crear producto desechable | 201 | 2 |
| Editar producto desechable | 200 | 2 |
| Crear reseña del producto | 201 | 2 |
| Consultar reseñas del producto | 200 | 2 |
| Eliminar únicamente el producto de QA | 200 | 1 |
| Entrar como usuario normal | 200 | 2 |
| Restringir la administración a su rol | 403 | 1 |
| RAG sin evidencia | 200 | 2 |
| Consultar conversación propia | 200 | 2 |
| Proteger el reporte de otro usuario | 403 | 1 |
| Entrar con cupo cero | 200 | 2 |
| Bloquear IA al agotar cupo | 429 | 2 |
| Proteger conversaciones de otro usuario | 404 | 1 |
| Consultar saldo de la cuenta bloqueada | 200 | 2 |
| Reporte web con JWT | 200 | 2 |
| Reporte Power BI con HTTP Basic | 200 | 2 |
| Cuenta Power BI sin acceso administrativo | 401 | 1 |
| Cerrar sesión de usuario normal | 200 | 1 |
| Rechazar JWT revocado | 401 | 1 |
| Cerrar sesión con cupo cero | 200 | 1 |
| Cerrar sesión administrativa | 200 | 1 |

Los códigos 401, 403, 404 y 429 son resultados esperados de las pruebas de acceso, aislamiento y cupos. Esta evidencia contiene únicamente nombres, códigos HTTP y cantidades.

## Integración real con Groq y DummyJSON

Newman ejecutó las **11 solicitudes y 23 comprobaciones** de la carpeta de integración sin fallos. FastAPI usó PostgreSQL local, el modelo `openai/gpt-oss-20b` de Groq y la API pública de DummyJSON. La primera búsqueda por nombre puede quedar vacía, así que los agentes consultan la categoría del catálogo cuando corresponde y atribuyen las reseñas a los productos encontrados.

| Consulta | HTTP | Pasos registrados | Fuentes externas | Tokens confirmados |
| --- | ---: | ---: | ---: | ---: |
| Chat RAG con evidencia de PostgreSQL | 200 | 1 | 0 | 800 |
| Continuación de la conversación | 200 | 1 | 0 | 921 |
| Explorar reseñas externas | 200 | 2 | 4 | 4071 |
| Comparar alternativas externas | 200 | 2 | 4 | 4399 |

La diferencia de consumo fue de **10 191 tokens**, igual a la suma devuelta por las cuatro solicitudes. También se verificaron la memoria de los dos turnos, el reporte y la revocación del JWT. El archivo PBIX se verificará contra la API publicada después de inicializar PostgreSQL en Render.

## Ejecución publicada en Render

El 10 de noviembre de 2026 se repitió la carpeta **Integración real · Groq y DummyJSON** contra `https://criterio-7s6r.onrender.com`, con PostgreSQL de Render y el despliegue del commit `6ccdfa8` posterior a los checks de CI. Newman ejecutó **11 solicitudes, 11 scripts de prueba y 23 comprobaciones**, con **0 fallos**.

| Comprobación publicada | Resultado |
| --- | ---: |
| Aplicación React | HTTP 200 |
| Salud de FastAPI y PostgreSQL | HTTP 200 |
| Swagger | HTTP 200 |
| Login y renovación JWT con origen HTTPS | HTTP 200 |
| RAG y continuación con memoria | HTTP 200 |
| Agente de exploración con dos pasos externos | HTTP 200 |
| Agente de alternativas con dos pasos externos | HTTP 200 |
| Historial persistido | HTTP 200 |
| Consumo y reporte conciliados | HTTP 200 |
| JWT rechazado después del cierre de sesión | HTTP 401 esperado |

La ejecución aplicó una pausa de 40 segundos entre solicitudes para respetar el límite gratuito por minuto de Groq. Un rechazo temporal previo permitió verificar además que la API devuelve `503` con un mensaje explícito y no pierde la contabilidad. Los reportes crudos de Newman se conservaron únicamente durante la comprobación y se eliminaron porque contenían JWT de la sesión.
