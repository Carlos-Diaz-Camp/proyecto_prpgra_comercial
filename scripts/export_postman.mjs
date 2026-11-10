import { writeFileSync } from 'node:fs';

const base = '{{baseUrl}}';
const noauth = { type: 'noauth' };
const bearer = name => ({ type: 'bearer', bearer: [{ key: 'token', value: '{{' + name + '}}', type: 'string' }] });
const reporter = {
  type: 'basic',
  basic: [
    { key: 'username', value: '{{qaReporterEmail}}', type: 'string' },
    { key: 'password', value: '{{qaReporterPassword}}', type: 'string' },
  ],
};

function script(listen, lines) {
  return { listen, script: { type: 'text/javascript', exec: ['(() => {', ...lines, '})();'] } };
}

function request(name, method, path, options = {}) {
  const { status = 200, auth = noauth, body, headers = [], before = [], tests = [] } = options;
  const events = [
    script('test', [
      'pm.test("HTTP ' + status + '", () => pm.response.to.have.status(' + status + '));',
      ...tests,
    ]),
  ];
  if (before.length) events.unshift(script('prerequest', before));
  return {
    name,
    request: {
      method,
      auth,
      url: base + path,
      header: [...(body ? [{ key: 'Content-Type', value: 'application/json' }] : []), ...headers],
      ...(body ? { body: { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } } : {}),
    },
    event: events,
  };
}

function login(name, email, password, token, userId, captureRefresh = false) {
  return request(name, 'POST', '/api/auth/login', {
    body: '{{loginBody}}',
    before: ['pm.variables.set("loginBody", JSON.stringify({ email: pm.variables.get("' + email + '"), password: pm.variables.get("' + password + '") }));'],
    tests: [
      'const data = pm.response.json();',
      'pm.test("JWT y perfil devueltos", () => { pm.expect(data.access_token).to.be.a("string"); pm.expect(data.user.id).to.be.a("string"); });',
      'if (pm.response.code === 200) { pm.variables.set("' + token + '", data.access_token); pm.variables.set("' + userId + '", data.user.id); }',
      ...(captureRefresh ? [
        'const cookies = pm.response.headers.all().filter(h => h.key.toLowerCase() === "set-cookie").map(h => h.value);',
        'const csrf = cookies.find(value => value.startsWith("csrf_token="));',
        'pm.test("Cookie de renovación HttpOnly y CSRF emitidos", () => { pm.expect(csrf).to.be.a("string"); pm.expect(cookies.some(value => value.startsWith("refresh_token=") && /httponly/i.test(value))).to.equal(true); });',
        'if (csrf) pm.variables.set("qaCsrf", csrf.split(";")[0].slice("csrf_token=".length));',
      ] : []),
    ],
  });
}

const qaAdmin = bearer('qaAdminJwt');
const qaUser = bearer('qaUserJwt');
const qaQuota = bearer('qaQuotaJwt');
const live = bearer('liveJwt');
const exampleProduct = {
  name: 'Producto desechable de QA',
  brand: 'Criterio QA',
  category: 'pruebas',
  description: 'Registro creado y eliminado por las pruebas locales.',
  price: 15,
  currency: 'USD',
  is_demo: true,
};

const local = [
  request('Estado del servicio', 'GET', '/api/health', {
    tests: ['pm.test("PostgreSQL responde", () => pm.expect(pm.response.json().status).to.equal("ok"));'],
  }),
  request('La API exige credenciales', 'GET', '/api/consumo', { status: 401 }),
  request('Rechazar contraseña inválida', 'POST', '/api/auth/login', {
    status: 401, body: { email: 'no-existe@criterio.test', password: 'contraseña-incorrecta-de-qa' },
  }),
  login('Entrar como administrador', 'qaAdminEmail', 'qaAdminPassword', 'qaAdminJwt', 'qaAdminId', true),
  request('Rechazar renovación sin CSRF', 'POST', '/api/auth/refresh', { status: 401 }),
  request('Renovar la sesión con CSRF', 'POST', '/api/auth/refresh', {
    headers: [{ key: 'X-CSRF-Token', value: '{{qaCsrf}}' }],
    tests: [
      'const data = pm.response.json();',
      'pm.test("La renovación conserva el usuario", () => { pm.expect(data.user.id).to.equal(pm.variables.get("qaAdminId")); pm.expect(data.access_token).to.be.a("string"); });',
      'if (pm.response.code === 200) pm.variables.set("qaAdminJwt", data.access_token);',
    ],
  }),
  request('Listar los tres servicios', 'GET', '/api/servicios', {
    auth: qaAdmin,
    tests: ['pm.test("Chat, exploración y alternativas activos", () => pm.expect(pm.response.json().items.filter(s => s.enabled).map(s => s.slug)).to.include.members(["chat", "explorar", "alternativas"]));'],
  }),
  request('Crear producto desechable', 'POST', '/api/admin/productos', {
    status: 201, auth: qaAdmin, body: exampleProduct,
    tests: ['const item = pm.response.json(); if (pm.response.code === 201) pm.variables.set("qaProduct", item.id);', 'pm.test("Producto de demostración creado", () => pm.expect(item.is_demo).to.equal(true));'],
  }),
  request('Editar producto desechable', 'PUT', '/api/admin/productos/{{qaProduct}}', {
    auth: qaAdmin, body: { ...exampleProduct, price: 27 },
    tests: ['pm.test("Precio actualizado", () => pm.expect(pm.response.json().price).to.equal(27));'],
  }),
  request('Crear reseña del producto', 'POST', '/api/admin/resenas', {
    status: 201, auth: qaAdmin, body: '{{qaReviewBody}}',
    before: ['pm.variables.set("qaReviewBody", JSON.stringify({product_id: Number(pm.variables.get("qaProduct")), rating: 4, comment: "Reseña sintética para la colección Postman."}));'],
    tests: ['pm.test("Reseña asociada al producto", () => pm.expect(pm.response.json().product_id).to.equal(Number(pm.variables.get("qaProduct"))));'],
  }),
  request('Consultar reseñas del producto', 'GET', '/api/productos/{{qaProduct}}/resenas', {
    auth: qaAdmin, tests: ['pm.test("Se recupera la reseña de QA", () => pm.expect(pm.response.json().some(r => r.rating === 4)).to.equal(true));'],
  }),
  request('Eliminar únicamente el producto de QA', 'DELETE', '/api/admin/productos/{{qaProduct}}', { auth: qaAdmin }),
  login('Entrar como usuario normal', 'qaUserEmail', 'qaUserPassword', 'qaUserJwt', 'qaUserId'),
  request('Restringir la administración a su rol', 'GET', '/api/admin/usuarios', { auth: qaUser, status: 403 }),
  request('RAG sin evidencia', 'POST', '/api/ia/chat', {
    auth: qaUser, body: { question: 'zxqxyzrobotmodelo' },
    tests: [
      'const data = pm.response.json();',
      'pm.test("Informa falta de evidencia y no cobra tokens", () => { pm.expect(data.answer).to.include("información suficiente"); pm.expect(data.sources).to.have.length(0); pm.expect(data.usage.total_tokens).to.equal(0); });',
      'if (pm.response.code === 200) pm.variables.set("qaConversation", data.conversation_id);',
    ],
  }),
  request('Consultar conversación propia', 'GET', '/api/conversaciones/{{qaConversation}}', {
    auth: qaUser, tests: ['pm.test("El historial conserva pregunta y respuesta", () => pm.expect(pm.response.json().messages.map(m => m.role)).to.eql(["user", "assistant"]));'],
  }),
  request('Proteger el reporte de otro usuario', 'GET', '/api/reportes/uso?usuario={{qaAdminId}}', { auth: qaUser, status: 403 }),
  login('Entrar con cupo cero', 'qaQuotaEmail', 'qaQuotaPassword', 'qaQuotaJwt', 'qaQuotaId'),
  request('Bloquear IA al agotar cupo', 'POST', '/api/ia/chat', {
    auth: qaQuota, status: 429, body: { question: '¿Cómo es la batería?', product_id: 1 },
    tests: ['pm.test("El bloqueo se atribuye al cupo de tokens", () => pm.expect(pm.response.json().detail.message).to.include("límite de tokens"));'],
  }),
  request('Proteger conversaciones de otro usuario', 'GET', '/api/conversaciones/{{qaConversation}}', { auth: qaQuota, status: 404 }),
  request('Consultar saldo de la cuenta bloqueada', 'GET', '/api/consumo', {
    auth: qaQuota, tests: ['pm.test("Sin tokens cobrados ni disponibles", () => { const data = pm.response.json(); pm.expect(data.tokens_used).to.equal(0); pm.expect(data.available).to.equal(0); });'],
  }),
  request('Reporte web con JWT', 'GET', '/api/reportes/uso?servicio=chat', {
    auth: qaAdmin,
    tests: [
      'const data = pm.response.json();',
      'pm.test("Incluye el bloqueo y solo el servicio seleccionado", () => { pm.expect(data.totals.bloqueadas).to.be.above(0); pm.expect(data.rows.every(r => r.servicio === "chat")).to.equal(true); });',
      'pm.variables.set("qaReportSnapshot", JSON.stringify({ rows: data.rows, totals: data.totals }));',
    ],
  }),
  request('Reporte Power BI con HTTP Basic', 'GET', '/api/reportes/uso?servicio=chat', {
    auth: reporter,
    tests: ['pm.test("Filas y totales coinciden con el reporte web", () => { const data = pm.response.json(); pm.expect({ rows: data.rows, totals: data.totals }).to.deep.equal(JSON.parse(pm.variables.get("qaReportSnapshot"))); });'],
  }),
  request('Cuenta Power BI sin acceso administrativo', 'GET', '/api/admin/usuarios', { auth: reporter, status: 401 }),
  request('Cerrar sesión de usuario normal', 'POST', '/api/auth/logout', { auth: qaUser }),
  request('Rechazar JWT revocado', 'GET', '/api/consumo', { auth: qaUser, status: 401 }),
  request('Cerrar sesión con cupo cero', 'POST', '/api/auth/logout', { auth: qaQuota }),
  request('Cerrar sesión administrativa', 'POST', '/api/auth/logout', { auth: qaAdmin }),
];

const answerChecks = [
  'const data = pm.response.json();',
  'pm.test("Respuesta con fuentes y consumo real", () => { pm.expect(data.answer.trim()).not.to.be.empty; pm.expect(data.sources).not.to.be.empty; pm.expect(data.usage.total_tokens).to.be.above(0); pm.expect(data.usage.total_tokens).to.equal(data.usage.input_tokens + data.usage.output_tokens); });',
  'if (pm.response.code === 200) pm.variables.set("liveUsage", Number(pm.variables.get("liveUsage") || 0) + data.usage.total_tokens);',
];
const externalChecks = [
  ...answerChecks,
  'pm.test("Consulta externa en un flujo de varios pasos", () => { pm.expect(data.trace.length).to.be.at.least(2); pm.expect(data.sources.some(s => s.url && s.url.startsWith("https://dummyjson.com/"))).to.equal(true); });',
];

const integration = [
  login('Entrar para la demostración', 'email', 'password', 'liveJwt', 'liveUserId'),
  request('Registrar el consumo inicial', 'GET', '/api/consumo', {
    auth: live, tests: ['const data = pm.response.json(); pm.variables.set("liveStartingUsage", data.tokens_used); pm.variables.set("liveUsage", 0);'],
  }),
  request('Chat RAG con evidencia de PostgreSQL', 'POST', '/api/ia/chat', {
    auth: live, body: { question: '¿Qué dicen las reseñas sobre la batería del iPhone 13?', product_id: 1 },
    tests: [...answerChecks, 'pm.test("Cita el catálogo de PostgreSQL", () => pm.expect(data.sources.some(s => s.id.startsWith("reseña:"))).to.equal(true));', 'if (pm.response.code === 200) pm.variables.set("liveConversation", data.conversation_id);'],
  }),
  request('Continuar la misma conversación', 'POST', '/api/ia/chat', {
    auth: live, body: { question: '¿Y sobre la cámara?', conversation_id: '{{liveConversation}}', product_id: 1 },
    tests: [...answerChecks, 'pm.test("Continúa en la misma conversación", () => pm.expect(data.conversation_id).to.equal(pm.variables.get("liveConversation")));'],
  }),
  request('Explorar reseñas externas', 'POST', '/api/ia/explorar', {
    auth: live, body: { question: 'Busca reseñas externas de iPhone 13 o de otros smartphones y resume sus aspectos positivos y negativos.', product_id: 1 },
    tests: externalChecks,
  }),
  request('Comparar alternativas externas', 'POST', '/api/ia/alternativas', {
    auth: live, body: { question: 'Identifica un problema recurrente del iPhone 13 y compara dos smartphones que encuentres en la fuente externa.', product_id: 1 },
    tests: externalChecks,
  }),
  request('Comprobar memoria guardada', 'GET', '/api/conversaciones/{{liveConversation}}', {
    auth: live, tests: ['pm.test("Se guardan los dos turnos", () => pm.expect(pm.response.json().messages.map(m => m.role)).to.eql(["user", "assistant", "user", "assistant"]));'],
  }),
  request('Conciliar consumo de las llamadas', 'GET', '/api/consumo', {
    auth: live, tests: ['pm.test("Saldo consumido coincide con los cuatro llamados al API", () => pm.expect(pm.response.json().tokens_used - Number(pm.variables.get("liveStartingUsage"))).to.equal(Number(pm.variables.get("liveUsage"))));'],
  }),
  request('Consultar reporte del usuario de demostración', 'GET', '/api/reportes/uso?usuario={{liveUserId}}', {
    auth: live, tests: ['pm.test("El reporte incluye las llamadas con sus tokens", () => { const data = pm.response.json(); pm.expect(data.totals.completadas).to.be.at.least(4); pm.expect(data.totals.tokens_total).to.be.at.least(Number(pm.variables.get("liveUsage"))); });'],
  }),
  request('Cerrar sesión de demostración', 'POST', '/api/auth/logout', { auth: live }),
  request('Rechazar JWT revocado', 'GET', '/api/consumo', { auth: live, status: 401 }),
];

const variableNames = [
  'email', 'password',
  'qaAdminEmail', 'qaAdminPassword', 'qaUserEmail', 'qaUserPassword',
  'qaQuotaEmail', 'qaQuotaPassword', 'qaReporterEmail', 'qaReporterPassword',
];
const collection = {
  info: {
    name: 'Criterio · Pruebas de API',
    description: 'Ejecuta una carpeta con Collection Runner. QA local utiliza una base desechable y cuentas de prueba. Integración Groq requiere GROQ_API_KEY en el servidor y una cuenta con cupo. Los JWT existen solo durante la ejecución.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [{ key: 'baseUrl', value: 'http://127.0.0.1:8000' }, ...variableNames.map(key => ({ key, value: '' }))],
  item: [
    {
      name: 'QA local · permisos, CRUD, cuota y reportes',
      event: [script('prerequest', ['if (!/^http:\\/\\/(127\\.0\\.0\\.1|localhost):\\d+$/.test(pm.variables.get("baseUrl"))) { throw new Error("Usa únicamente una API local de QA."); }'])],
      item: local,
    },
    { name: 'Integración real · Groq y DummyJSON', item: integration },
  ],
};

writeFileSync(new URL('../docs/criterio.postman_collection.json', import.meta.url), JSON.stringify(collection, null, 2) + '\n');
