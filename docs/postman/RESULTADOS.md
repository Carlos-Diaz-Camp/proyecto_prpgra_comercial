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

La carpeta **Integración real · Groq y DummyJSON** queda pendiente hasta configurar GROQ_API_KEY. La coincidencia del endpoint de reportes con credenciales de Power BI ya se probó en local. El archivo PBIX debe conectarse y verificarse después del despliegue.
