# Reporte en Power BI Desktop

La web y Power BI consultan `GET /api/reportes/uso`. La API devuelve una fila por fecha, usuario y servicio. **Consultas** cuenta las solicitudes, mientras que **Tokens** suma los tokens confirmados de entrada y salida de todas las llamadas al modelo. El rango se interpreta con la fecha de Guatemala.

1. Despliega Criterio y crea una cuenta con rol `reporter`. Realiza consultas desde la web para generar datos.
2. En Power BI Desktop, abre **Obtener datos → Consulta en blanco → Editor avanzado** y pega [ConsultaUso.pq](ConsultaUso.pq). La consulta ya apunta al servicio publicado en Render.
3. Selecciona credenciales **Básicas** para el dominio y usa el correo y contraseña de la cuenta `reporter`. Introduce las credenciales en Power BI y conserva el archivo de consulta sin contraseñas. [Conector Web de Power Query](https://learn.microsoft.com/en-us/power-query/connectors/web/web).
4. Renombra la tabla a `Uso`. Selecciona **Cerrar y aplicar**. Crea una medida por línea de [Medidas.dax](Medidas.dax) desde **Modelado → Nueva medida**.
5. Agrega segmentadores para `fecha` y `servicio`. Agrega tarjetas de **Total consultas** y **Total tokens**. Crea un gráfico por `servicio` con **Total tokens** y una tabla con fecha, servicio, usuario, consultas y tokens.
6. Actualiza Power BI y el reporte web. Usa el mismo intervalo, el mismo servicio y todos los usuarios. Verifica que coincidan **Total consultas** y **Total tokens**. Captura ambas pantallas con sus filtros visibles y guarda el informe como `Criterio.pbix`.

## Entregable incluido

El archivo [Criterio.pbix](../../Criterio.pbix) ya contiene la tabla `Uso`, las seis medidas DAX, dos tarjetas, un gráfico de columnas por servicio, una tabla de detalle y segmentadores para fecha y servicio. Se verificó contra producción el 10 de noviembre de 2026: **20 consultas** y **41,705 tokens**. Estos valores cambiarán al actualizar el informe si se realizan nuevas consultas.

La contraseña no está escrita en la consulta M ni en los archivos del repositorio. Power BI administra las credenciales de la cuenta `reporter` en el almacén local del usuario.
