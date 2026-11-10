// Power BI Desktop: consulta en blanco > Editor avanzado.
// Sustituir BaseUrl por la URL HTTPS real. Configurar credenciales Basic
// con la cuenta de rol reporter en la ventana de credenciales de Power BI.
// No escribir contraseñas en este archivo.
let
    BaseUrl = "https://TU-APLICACION.onrender.com",
    HoyGuatemala = Date.From(DateTimeZone.RemoveZone(DateTimeZone.SwitchZone(DateTimeZone.FixedUtcNow(), -6))),
    FechaDesde = Date.ToText(Date.AddDays(HoyGuatemala, -30), "yyyy-MM-dd"),
    FechaHasta = Date.ToText(HoyGuatemala, "yyyy-MM-dd"),
    Datos = Json.Document(Web.Contents(BaseUrl, [
        RelativePath = "api/reportes/uso",
        Query = [desde = FechaDesde, hasta = FechaHasta]
    ])),
    Columnas = {"fecha", "servicio", "usuario_id", "usuario", "consultas", "completadas", "fallidas", "bloqueadas", "pendientes", "tokens_entrada", "tokens_salida", "tokens_total", "tokens_reservados"},
    Tabla = Table.FromRecords(Datos[rows], Columnas, MissingField.UseNull),
    Tipos = Table.TransformColumnTypes(Tabla, {
        {"fecha", type date}, {"servicio", type text}, {"usuario_id", type text}, {"usuario", type text},
        {"consultas", Int64.Type}, {"completadas", Int64.Type}, {"fallidas", Int64.Type},
        {"bloqueadas", Int64.Type}, {"pendientes", Int64.Type}, {"tokens_entrada", Int64.Type},
        {"tokens_salida", Int64.Type}, {"tokens_total", Int64.Type}, {"tokens_reservados", Int64.Type}
    })
in
    Tipos
