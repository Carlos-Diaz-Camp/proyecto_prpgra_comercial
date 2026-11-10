import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowUp,
  LayoutDashboard,
  MessageSquare,
  Search,
  GitCompareArrows,
  History,
  ChartNoAxesCombined,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  Plus,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  LoaderCircle,
  Pencil,
  Trash2,
  RefreshCw,
  Database,
  Check,
  AlertCircle,
  Filter,
  BookOpen,
} from "lucide-react";
import { api, setToken, refreshSession } from "./api";
import "./styles.css";

const names = {
  chat: "Consulta el catálogo",
  explorar: "Explora opiniones",
  alternativas: "Encuentra alternativas",
};
const icons = {
  chat: MessageSquare,
  explorar: Search,
  alternativas: GitCompareArrows,
};
const fmt = (n) => Number(n || 0).toLocaleString("es-GT");
const dateText = (v) =>
  new Date(
    v.endsWith("Z") || /[+-]\d\d:\d\d$/.test(v) ? v : v + "Z",
  ).toLocaleString("es-GT");
const dateInput = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <Check size={23} />
      </span>
      <span>
        criterio<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
function Notice({ children, type = "error" }) {
  return children ? (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`notice ${type}`}
    >
      <AlertCircle size={17} />
      <span>{children}</span>
    </div>
  ) : null;
}
function Loading() {
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={20} /> Cargando información…
    </div>
  );
}
function Empty({ title, text }) {
  return (
    <div className="empty">
      <BookOpen size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function PageTitle({ eyebrow, title, text, children }) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {children}
    </div>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token);
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <section className="login-story">
        <Brand />
        <div className="story-copy">
          <span className="pill light">OPINIONES CON CONTEXTO</span>
          <h1>
            Antes de elegir,
            <br />
            escucha la evidencia<span>.</span>
          </h1>
          <p>
            Consulta reseñas, descubre lo que importa y compara tus opciones. Un
            espacio para tomar decisiones con más contexto.
          </p>
          <div className="quote-card">
            <span className="stars">★★★★★</span>
            <p>
              Una opinión es un punto de vista.
              <br />
              Varias opiniones cuentan una historia.
            </p>
            <span className="tiny">EXPLORA · COMPRENDE · COMPARA</span>
          </div>
        </div>
        <span className="story-footer">
          Criterio / Inteligencia aplicada a tus decisiones
        </span>
      </section>
      <section className="login-form">
        <div className="form-wrap">
          <span className="eyebrow">TU ESPACIO DE ANÁLISIS</span>
          <h2>Qué bueno verte.</h2>
          <p>Inicia sesión para explorar el catálogo.</p>
          <form onSubmit={submit}>
            <label>
              Correo electrónico
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
              />
            </label>
            <Notice>{error}</Notice>
            <button className="primary wide" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  Entrar a Criterio <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <p className="login-help">
            <ShieldCheck size={17} /> Tu administrador gestiona el acceso a esta
            aplicación.
          </p>
        </div>
      </section>
    </div>
  );
}

function Home({ user, services, products, navigate, consumption }) {
  const [recent, setRecent] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    api("/conversaciones")
      .then(setRecent)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <PageTitle
        eyebrow="TU PUNTO DE PARTIDA"
        title={`Hola, ${user.name.split(" ")[0]}.`}
        text="Cada buena decisión empieza con una buena pregunta."
      />
      <div className="hero">
        <div className="hero-text">
          <span className="pill light">
            <Sparkles size={13} /> TU ASISTENTE DE PRODUCTOS
          </span>
          <h2>
            Más allá de
            <br />
            las estrellas.
          </h2>
          <p>
            Descubre qué dicen las opiniones,
            <br />
            qué se repite y qué opciones tienes.
          </p>
          <button className="cream" onClick={() => navigate("chat")}>
            Hacer una pregunta <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="floating-note note-one">
            <span className="mini-icon">
              <MessageSquare size={18} />
            </span>
            <div>
              <b>Opiniones con fuentes</b>
              <small>La evidencia, siempre a mano</small>
            </div>
            <span className="small-check">
              <Check size={13} />
            </span>
          </div>
          <div className="rating-card">
            <span>UNA MIRADA MÁS COMPLETA</span>
            <div className="big-stars">★ ★ ★ ★ ☆</div>
            <div className="review-lines">
              <i />
              <i />
              <i />
            </div>
            <footer>
              <span className="avatar-stack">A</span>
              <span className="avatar-stack second">M</span>
              <span className="avatar-stack third">C</span>
              <small>Historias detrás de cada valoración</small>
            </footer>
          </div>
          <div className="floating-note note-two">
            <span className="mini-icon coral">
              <GitCompareArrows size={18} />
            </span>
            <div>
              <b>Alternativas con criterio</b>
              <small>Compara antes de decidir</small>
            </div>
          </div>
        </div>
      </div>
      <div className="section-title">
        <h2>¿Qué quieres descubrir?</h2>
        <span>Tres formas de explorar</span>
      </div>
      <div className="service-grid">
        {["chat", "explorar", "alternativas"].map((slug, i) => {
          const Icon = icons[slug],
            service = services.find((s) => s.slug === slug);
          return (
            <button
              key={slug}
              className={`service-card service-${i}`}
              disabled={!service?.enabled}
              onClick={() => navigate(slug)}
            >
              <div className="service-top">
                <span className="service-icon">
                  <Icon size={23} />
                </span>
                <span className="service-number">0{i + 1}</span>
              </div>
              <h3>{names[slug]}</h3>
              <p>
                {
                  [
                    "Pregunta sobre productos, características y reseñas de nuestro catálogo.",
                    "Amplía la búsqueda y encuentra los aspectos positivos y negativos.",
                    "Identifica problemas frecuentes y compara otras opciones.",
                  ][i]
                }
              </p>
              <div className="service-link">
                {service?.enabled ? "Comenzar" : "No disponible"}
                <ArrowRight size={17} />
              </div>
            </button>
          );
        })}
      </div>
      <div className="bottom-grid">
        <section className="panel">
          <div className="section-title">
            <h3>Conversaciones recientes</h3>
            <button
              className="text-button"
              onClick={() => navigate("historial")}
            >
              Ver todas <ArrowUpRight size={14} />
            </button>
          </div>
          <Notice>{error}</Notice>
          {recent.length ? (
            recent.slice(0, 3).map((r) => (
              <button
                className="recent-row"
                key={r.id}
                onClick={() => navigate("historial", r.id)}
              >
                <MessageSquare size={18} />
                <span>
                  <b>{r.title}</b>
                  <small>{dateText(r.created_at)}</small>
                </span>
                <ChevronRight size={17} />
              </button>
            ))
          ) : (
            <p className="muted">
              Tu próxima pregunta inicia la primera conversación.
            </p>
          )}
        </section>
        <section className="panel progress-panel">
          <div className="section-title">
            <h3>Tu espacio, en números</h3>
            <ChartNoAxesCombined size={18} />
          </div>
          <div className="mini-stats">
            <div>
              <strong>{products.length}</strong>
              <span>productos disponibles</span>
            </div>
            <div>
              <strong>{fmt(consumption.available)}</strong>
              <span>tokens disponibles</span>
            </div>
          </div>
          <div className="progress">
            <i
              style={{
                width: `${Math.min(100, (100 * consumption.tokens_used) / Math.max(1, consumption.token_limit))}%`,
              }}
            />
          </div>
          <small>
            {fmt(consumption.tokens_used)} de {fmt(consumption.token_limit)}{" "}
            tokens utilizados
          </small>
        </section>
      </div>
    </>
  );
}

function Workspace({ slug, products, service, refreshUser }) {
  const [question, setQuestion] = useState(""),
    [product, setProduct] = useState(""),
    [messages, setMessages] = useState([]),
    [conversationId, setConversationId] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function send(e) {
    e.preventDefault();
    if (!question.trim() || busy) return;
    const text = question;
    setQuestion("");
    setError("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const result = await api(`/ia/${slug}`, {
        method: "POST",
        body: JSON.stringify({
          question: text,
          product_id: product ? Number(product) : null,
          conversation_id: conversationId,
        }),
      });
      setConversationId(result.conversation_id);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: result.answer,
          sources: result.sources,
          trace: result.trace,
          usage: result.usage,
        },
      ]);
    } catch (e) {
      setError(e.message);
      if (e.detail?.conversation_id)
        setConversationId(e.detail.conversation_id);
    } finally {
      setBusy(false);
      refreshUser();
    }
  }
  const prompts = {
    chat: [
      "¿Qué ventajas y problemas mencionan las reseñas?",
      "¿Para quién sería adecuado este producto?",
    ],
    explorar: [
      "Busca opiniones externas y resume sus aspectos positivos y negativos.",
      "¿Tenemos suficientes reseñas para llegar a una conclusión?",
    ],
    alternativas: [
      "Busca alternativas a este producto y explica sus diferencias.",
      "¿Qué problemas se repiten y qué otras opciones puedo considerar?",
    ],
  };
  return (
    <>
      <PageTitle
        eyebrow="ASISTENTES DE CRITERIO"
        title={names[slug]}
        text={service?.description}
      >
        <button
          className="secondary"
          onClick={() => {
            setMessages([]);
            setConversationId(null);
            setError("");
          }}
          disabled={busy}
        >
          <Plus size={16} /> Nueva consulta
        </button>
      </PageTitle>
      <div className="workspace">
        <div className="workspace-options">
          <label>
            Contexto del producto
            <select
              value={product}
              disabled={busy || !!conversationId}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option value="">Buscar por lo que escriba</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <span className="pill">
            <Database size={13} />{" "}
            {slug === "chat" ? "Catálogo local" : "Catálogo + fuente externa"}
          </span>
        </div>
        <div className="messages" aria-live="polite">
          {messages.length === 0 && (
            <div className="chat-intro">
              <span className="chat-symbol">
                <Sparkles size={28} />
              </span>
              <h2>Comencemos con una pregunta.</h2>
              <p>
                Selecciona un producto para obtener una respuesta más precisa.
                <br />
                Las respuestas incluyen las fuentes consultadas.
              </p>
              <div className="suggestions">
                {prompts[slug].map((p) => (
                  <button key={p} onClick={() => setQuestion(p)}>
                    {p}
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <MessageView key={i} message={m} />
          ))}
          {busy && (
            <div className="working">
              <LoaderCircle size={18} className="spin" />
              <div>
                <b>Consultando la evidencia…</b>
                <small>
                  {slug === "chat"
                    ? "Recuperando el catálogo y preparando tu respuesta."
                    : "El asistente puede consultar varias fuentes. Esto puede tardar hasta unos minutos."}
                </small>
              </div>
            </div>
          )}
        </div>
        <div className="composer">
          <Notice>{error}</Notice>
          <form onSubmit={send}>
            <textarea
              aria-label="Escribe tu pregunta"
              placeholder="Escribe tu pregunta sobre un producto…"
              maxLength={2000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(e);
                }
              }}
            />
            <button
              className="send-button"
              aria-label="Enviar pregunta"
              disabled={busy || !question.trim() || !service?.enabled}
            >
              <ArrowUp size={21} />
            </button>
          </form>
          <span>
            {question.length}/2000 · Revisa las fuentes. Los datos de
            demostración son ficticios.
          </span>
        </div>
      </div>
    </>
  );
}

function MessageView({ message: m }) {
  return (
    <article className={`message ${m.role}`}>
      <span className="message-label">
        {m.role === "user" ? "TÚ" : m.role === "error" ? "AVISO" : "CRITERIO"}
      </span>
      <div className="message-text">{m.content}</div>
      {m.sources?.length > 0 && (
        <details className="source-details">
          <summary>{m.sources.length} fuentes recuperadas</summary>
          <div className="source-list">
            {m.sources.map((s) => (
              <div key={s.id}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title} <ExternalLink size={12} />
                  </a>
                ) : (
                  <span>{s.title}</span>
                )}
                <small>
                  {s.id}
                  {s.demo ? " · Demostración" : ""}
                </small>
              </div>
            ))}
          </div>
        </details>
      )}
      {m.trace?.length > 0 && (
        <details className="source-details">
          <summary>Consultas realizadas</summary>
          {m.trace.map((t, i) => (
            <p className="tiny" key={i}>
              Paso {t.step}: {t.tool} · {t.sources} fuentes
              {t.status ? ` · ${t.status}` : ""}
            </p>
          ))}
        </details>
      )}
      {m.usage && (
        <span className="usage-note">
          {fmt(m.usage.total_tokens)} tokens utilizados
        </span>
      )}
    </article>
  );
}

function Catalog({ products }) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState(null),
    [reviews, setReviews] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function open(product) {
    setSelected(product);
    setBusy(true);
    setError("");
    try {
      setReviews(await api(`/productos/${product.id}/resenas`));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="LA BASE DE TUS CONSULTAS"
        title="Catálogo de productos"
        text="Explora la información y las reseñas que alimentan al asistente."
      />
      <div className="search-bar">
        <Search size={18} />
        <input
          aria-label="Buscar productos"
          placeholder="Buscar por nombre, marca o categoría…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span>{products.length} productos</span>
      </div>
      <div className="catalog-grid">
        {products
          .filter((p) =>
            `${p.name} ${p.brand} ${p.category}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((p) => (
            <button className="product-card" key={p.id} onClick={() => open(p)}>
              <div className="product-art">
                <Package size={44} strokeWidth={1} />
                <span>{p.category}</span>
              </div>
              <div className="product-info">
                <small>{p.brand}</small>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <footer>
                  <strong>
                    {p.currency} {fmt(p.price)}
                  </strong>
                  <span>
                    Ver reseñas <ArrowUpRight size={15} />
                  </span>
                </footer>
              </div>
            </button>
          ))}
      </div>
      {selected && (
        <Modal title={selected.name} close={() => setSelected(null)}>
          <p>{selected.description}</p>
          {selected.is_demo && (
            <Notice type="info">
              Producto y reseñas de demostración. El precio no es una oferta
              vigente.
            </Notice>
          )}
          <Notice>{error}</Notice>
          {busy ? (
            <Loading />
          ) : reviews.length ? (
            reviews.map((r) => (
              <div className="review" key={r.id}>
                <span className="stars">
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </span>
                <p>{r.comment}</p>
                <small>
                  {r.source} · reseña:{r.id}
                </small>
              </div>
            ))
          ) : (
            <Empty
              title="Sin reseñas"
              text="El administrador puede agregar opiniones para este producto."
            />
          )}
        </Modal>
      )}
    </>
  );
}

function HistoryPage({ selectedId }) {
  const [items, setItems] = useState(null),
    [detail, setDetail] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("/conversaciones")
      .then(setItems)
      .catch((e) => setError(e.message));
    if (selectedId) open(selectedId);
  }, [selectedId]);
  async function open(id) {
    setError("");
    try {
      setDetail(await api(`/conversaciones/${id}`));
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="VUELVE A LA EVIDENCIA"
        title="Historial de consultas"
        text="Tus preguntas, respuestas y fuentes en un solo lugar."
      />
      <Notice>{error}</Notice>
      {!items ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty
          title="Aún no hay conversaciones"
          text="Inicia una consulta desde cualquiera de los tres servicios."
        />
      ) : (
        <div className="history-layout">
          <div className="history-list">
            {items.map((i) => (
              <button
                key={i.id}
                className={detail?.conversation.id === i.id ? "selected" : ""}
                onClick={() => open(i.id)}
              >
                <MessageSquare size={18} />
                <span>
                  <b>{i.title}</b>
                  <small>{dateText(i.created_at)}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="panel history-detail">
            {detail ? (
              <>
                <h2>{detail.conversation.title}</h2>
                {detail.messages.map((m) => (
                  <MessageView key={m.id} message={m} />
                ))}
                <details>
                  <summary>Estado de las solicitudes</summary>
                  {detail.requests.map((r) => (
                    <p className="tiny" key={r.id}>
                      {dateText(r.created_at)} · {r.status}
                      {r.error ? ` · ${r.error}` : ""}
                    </p>
                  ))}
                </details>
              </>
            ) : (
              <Empty
                title="Elige una conversación"
                text="Aquí podrás revisar los mensajes y sus fuentes."
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Reports({ user, consumption }) {
  const [from, setFrom] = useState(dateInput(-30)),
    [to, setTo] = useState(dateInput(0)),
    [service, setService] = useState(""),
    [owner, setOwner] = useState(""),
    [users, setUsers] = useState([]),
    [report, setReport] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    load();
    if (user.role === "admin")
      api("/admin/usuarios")
        .then(setUsers)
        .catch((e) => setError(e.message));
  }, []);
  async function load(e) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      setReport(
        await api(
          `/reportes/uso?${new URLSearchParams({ desde: from, hasta: to, ...(service ? { servicio: service } : {}), ...(owner ? { usuario: owner } : {}) })}`,
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const totals = report?.totals || {},
    groups = Object.keys(names).map((s) => ({
      slug: s,
      tokens:
        report?.rows
          .filter((r) => r.servicio === s)
          .reduce((v, r) => v + r.tokens_total, 0) || 0,
    })),
    max = Math.max(1, ...groups.map((g) => g.tokens));
  return (
    <>
      <PageTitle
        eyebrow="TRANSPARENCIA EN CADA CONSULTA"
        title="Consultas y consumo"
        text="El mismo reporte disponible para Power BI a través de la API."
      />
      <form className="filters" onSubmit={load}>
        <label>
          Desde
          <input
            type="date"
            required
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label>
          Servicio
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Todos los servicios</option>
            {Object.entries(names).map(([s, name]) => (
              <option key={s} value={s}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {user.role === "admin" && (
          <label>
            Usuario
            <select value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">Todos los usuarios</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="primary" disabled={busy}>
          <Filter size={16} /> Aplicar
        </button>
      </form>
      <Notice>{error}</Notice>
      {busy ? (
        <Loading />
      ) : (
        report && (
          <>
            <div className="stats-grid">
              {[
                ["Consultas realizadas", totals.consultas],
                ["Tokens consumidos", totals.tokens_total],
                ["Respuestas completadas", totals.completadas],
                ["Mi saldo disponible", consumption.available],
              ].map(([label, value]) => (
                <div className="stat" key={label}>
                  <span>{label}</span>
                  <strong>{fmt(value)}</strong>
                </div>
              ))}
            </div>
            <div className="panel chart-panel">
              <div>
                <span className="eyebrow">DISTRIBUCIÓN DEL CONSUMO</span>
                <h2>Tokens por servicio</h2>
                <p className="muted">Entrada + salida del modelo</p>
              </div>
              <div className="bar-chart">
                {groups.map((g) => (
                  <div className="bar-row" key={g.slug}>
                    <span>{names[g.slug]}</span>
                    <div>
                      <i style={{ width: `${(100 * g.tokens) / max}%` }} />
                    </div>
                    <b>{fmt(g.tokens)}</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Servicio</th>
                    <th>Usuario</th>
                    <th>Consultas</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Total</th>
                    <th>Bloqueadas</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.fecha}</td>
                      <td>{names[r.servicio]}</td>
                      <td>{r.usuario}</td>
                      <td>{r.consultas}</td>
                      <td>{fmt(r.tokens_entrada)}</td>
                      <td>{fmt(r.tokens_salida)}</td>
                      <td>
                        <b>{fmt(r.tokens_total)}</b>
                      </td>
                      <td>{r.bloqueadas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.rows.length === 0 && (
                <Empty
                  title="Sin consultas en este período"
                  text="Prueba otro rango o realiza una consulta para generar datos."
                />
              )}
            </div>
            <p className="tiny">
              Fechas en America/Guatemala · {fmt(totals.fallidas)} solicitudes
              fallidas · {fmt(totals.tokens_reservados)} tokens reservados ·
              Actualizado: {dateText(report.generated_at)}
            </p>
          </>
        )
      )}
    </>
  );
}

const fields = {
  usuarios: [
    ["name", "Nombre"],
    ["email", "Correo", "email"],
    ["password", "Contraseña", "password"],
    ["role", "Rol", ["user", "admin", "reporter"]],
    ["token_limit", "Límite acumulado de tokens", "number"],
    ["active", "Cuenta activa", "checkbox"],
  ],
  productos: [
    ["name", "Nombre"],
    ["brand", "Marca"],
    ["category", "Categoría"],
    ["description", "Descripción", "textarea"],
    ["price", "Precio de ejemplo", "number"],
    ["currency", "Moneda"],
    ["external_id", "ID externo (opcional)", "number"],
    ["is_demo", "Datos de demostración", "checkbox"],
  ],
  resenas: [
    ["product_id", "ID del producto", "number"],
    ["rating", "Valoración (1–5)", "number"],
    ["comment", "Comentario", "textarea"],
    ["source", "Fuente"],
    ["is_demo", "Datos de demostración", "checkbox"],
  ],
  servicios: [
    ["slug", "Servicio", ["chat", "explorar", "alternativas"]],
    ["name", "Nombre"],
    ["description", "Descripción", "textarea"],
    ["model", "Modelo Groq"],
    ["max_output_tokens", "Máximo de tokens de salida", "number"],
    ["max_steps", "Pasos de herramientas (2–6)", "number"],
    ["enabled", "Servicio activo", "checkbox"],
  ],
};
const defaults = {
  usuarios: {
    name: "",
    email: "",
    password: "",
    role: "user",
    token_limit: 100000,
    active: true,
  },
  productos: {
    name: "",
    brand: "",
    category: "",
    description: "",
    price: 0,
    currency: "USD",
    external_id: null,
    is_demo: true,
  },
  resenas: {
    product_id: 1,
    rating: 5,
    comment: "",
    source: "Demostración sintética",
    is_demo: true,
  },
  servicios: {
    slug: "chat",
    name: "",
    description: "",
    model: "openai/gpt-oss-20b",
    max_output_tokens: 900,
    max_steps: 4,
    enabled: true,
  },
};
function Admin({ refresh }) {
  const [resource, setResource] = useState("usuarios"),
    [rows, setRows] = useState([]),
    [editing, setEditing] = useState(null),
    [error, setError] = useState(""),
    [modalError, setModalError] = useState(""),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState([]),
    [recon, setRecon] = useState(null);
  useEffect(() => {
    load();
  }, [resource]);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const [data, reservations] = await Promise.all([
        api(`/admin/${resource}`),
        api("/admin-consumo/pendientes"),
      ]);
      setRows(data);
      setPending(reservations);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    setModalError("");
    setBusy(true);
    const body = Object.fromEntries(
      fields[resource].map(([key, , type]) => [
        key,
        type === "number"
          ? editing[key] === "" || editing[key] == null
            ? null
            : Number(editing[key])
          : editing[key],
      ]),
    );
    if (resource === "usuarios" && editing.id && !body.password)
      delete body.password;
    try {
      await api(`/admin/${resource}${editing.id ? "/" + editing.id : ""}`, {
        method: editing.id ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      setEditing(null);
      await load();
      refresh();
    } catch (e) {
      setModalError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(row) {
    if (
      !window.confirm(
        "¿Eliminar este registro? Los registros con historial relacionado deben desactivarse.",
      )
    )
      return;
    try {
      await api(`/admin/${resource}/${row.id}`, { method: "DELETE" });
      load();
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  async function reconcile(e) {
    e.preventDefault();
    setModalError("");
    try {
      await api(
        `/admin-consumo/${recon.id}/conciliar?input_tokens=${recon.input}&output_tokens=${recon.output}`,
        { method: "POST" },
      );
      setRecon(null);
      load();
      refresh();
    } catch (e) {
      setModalError(e.message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="GESTIÓN DEL ESPACIO"
        title="Administración"
        text="Gestiona el catálogo, los accesos y los servicios disponibles."
      >
        <button
          className="primary"
          onClick={() => {
            setModalError("");
            setEditing({ ...defaults[resource] });
          }}
        >
          <Plus size={17} /> Crear registro
        </button>
      </PageTitle>
      <div className="tabs">
        {Object.keys(fields).map((r) => (
          <button
            key={r}
            onClick={() => setResource(r)}
            className={r === resource ? "active" : ""}
          >
            {r === "resenas"
              ? "Reseñas"
              : r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>
      <Notice>{error}</Notice>
      {busy && !editing ? (
        <Loading />
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Registro</th>
                <th>Detalles</th>
                <th>Estado / valor</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.name || `Reseña ${r.id}`}</b>
                    <small className="block">
                      {resource === "productos" || resource === "resenas"
                        ? `ID ${r.id}`
                        : r.email || r.slug}
                    </small>
                  </td>
                  <td className="truncate">
                    {r.comment || r.category || r.model || r.role}
                  </td>
                  <td>
                    {resource === "usuarios"
                      ? `${fmt(r.tokens_used)} / ${fmt(r.token_limit)} tokens · ${r.active ? "Activo" : "Inactivo"}`
                      : resource === "servicios"
                        ? r.enabled
                          ? "Activo"
                          : "Desactivado"
                        : resource === "resenas"
                          ? `${r.rating}/5 · producto ${r.product_id}`
                          : `${r.currency} ${fmt(r.price)}`}
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        aria-label={`Editar ${r.name || r.id}`}
                        onClick={() => {
                          setModalError("");
                          setEditing({ ...r, password: "" });
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        aria-label={`Eliminar ${r.name || r.id}`}
                        onClick={() => remove(r)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pending.length > 0 && (
        <section className="panel">
          <h3>Consumo pendiente de revisión</h3>
          <p className="muted">
            Un corte de conexión dejó reservas sin confirmar. Consulta el uso
            del proveedor antes de conciliarlas.
          </p>
          {pending.map((p) => (
            <div className="recent-row" key={p.id}>
              <span>
                {p.model} · {fmt(p.reserved_tokens)} tokens reservados
              </span>
              <button
                className="secondary"
                onClick={() => {
                  setModalError("");
                  setRecon({ id: p.id, input: 0, output: 0 });
                }}
              >
                Conciliar
              </button>
            </div>
          ))}
        </section>
      )}
      {editing && (
        <Modal
          title={`${editing.id ? "Editar" : "Crear"} registro`}
          close={() => setEditing(null)}
        >
          <form className="edit-form" onSubmit={save}>
            {fields[resource].map(([key, label, type = "text"]) => (
              <label
                key={key}
                className={type === "checkbox" ? "checkbox-label" : ""}
              >
                {label}
                {Array.isArray(type) ? (
                  <select
                    value={editing[key] ?? ""}
                    disabled={
                      resource === "servicios" && !!editing.id && key === "slug"
                    }
                    onChange={(e) =>
                      setEditing({ ...editing, [key]: e.target.value })
                    }
                  >
                    {type.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                ) : type === "textarea" ? (
                  <textarea
                    required
                    value={editing[key] ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, [key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    type={type}
                    step={key === "price" ? "0.01" : undefined}
                    checked={type === "checkbox" ? !!editing[key] : undefined}
                    value={
                      type === "checkbox" ? undefined : (editing[key] ?? "")
                    }
                    required={
                      type !== "checkbox" &&
                      key !== "external_id" &&
                      key !== "brand" &&
                      !(key === "password" && editing.id)
                    }
                    min={type === "number" ? 0 : undefined}
                    autoComplete={
                      key === "password" ? "new-password" : undefined
                    }
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        [key]:
                          type === "checkbox"
                            ? e.target.checked
                            : e.target.value,
                      })
                    }
                  />
                )}
              </label>
            ))}
            {resource === "usuarios" && (
              <small>
                Contraseña: mínimo 10 caracteres. En una edición, deja el campo
                vacío para conservarla.
              </small>
            )}
            <Notice>{modalError}</Notice>
            <button className="primary" disabled={busy}>
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>
        </Modal>
      )}
      {recon && (
        <Modal title="Conciliar consumo" close={() => setRecon(null)}>
          <form className="edit-form" onSubmit={reconcile}>
            <p>
              Ingresa los valores confirmados en Groq. Solo registra cero si
              comprobaste que la llamada no consumió tokens.
            </p>
            <label>
              Tokens de entrada
              <input
                type="number"
                min="0"
                required
                value={recon.input}
                onChange={(e) => setRecon({ ...recon, input: e.target.value })}
              />
            </label>
            <label>
              Tokens de salida
              <input
                type="number"
                min="0"
                required
                value={recon.output}
                onChange={(e) => setRecon({ ...recon, output: e.target.value })}
              />
            </label>
            <Notice>{modalError}</Notice>
            <button className="primary">Confirmar consumo verificado</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Modal({ title, close, children }) {
  useEffect(() => {
    const listener = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [close]);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button aria-label="Cerrar" onClick={close}>
            <X size={21} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null),
    [starting, setStarting] = useState(true),
    [page, setPage] = useState("inicio"),
    [selectedId, setSelectedId] = useState(null),
    [menu, setMenu] = useState(false),
    [services, setServices] = useState([]),
    [products, setProducts] = useState([]),
    [consumption, setConsumption] = useState({}),
    [configured, setConfigured] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    refreshSession()
      .then((data) => setUser(data.user))
      .catch(() => {})
      .finally(() => setStarting(false));
    const expire = () => setUser(null);
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  useEffect(() => {
    if (user) refresh();
  }, [user?.id]);
  async function refresh() {
    try {
      const [s, p, c] = await Promise.all([
        api("/servicios"),
        api("/productos"),
        api("/consumo"),
      ]);
      setServices(s.items);
      setConfigured(s.ai_configured);
      setProducts(p);
      setConsumption(c);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setToken(null);
      setUser(null);
      setPage("inicio");
    } catch (e) {
      setError(e.message);
    }
  }
  function navigate(value, id = null) {
    setPage(value);
    setSelectedId(id);
    setMenu(false);
    window.scrollTo(0, 0);
  }
  if (starting) return <Loading />;
  if (!user) return <Login onLogin={setUser} />;
  const nav = [
    ["inicio", "Vista general", LayoutDashboard],
    ["chat", "Consulta el catálogo", MessageSquare],
    ["explorar", "Explora opiniones", Search],
    ["alternativas", "Encuentra alternativas", GitCompareArrows],
    ["catalogo", "Productos y reseñas", Package],
    ["historial", "Historial", History],
    ["reportes", "Consultas y consumo", ChartNoAxesCombined],
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Brand />
        <span className="nav-label">TU ESPACIO</span>
        <nav>
          {nav.map(([key, title, Icon], i) => (
            <React.Fragment key={key}>
              {i === 1 && <span className="nav-divider">ASISTENTES</span>}
              {i === 4 && <span className="nav-divider">BIBLIOTECA</span>}
              <button
                className={page === key ? "active" : ""}
                onClick={() => navigate(key)}
              >
                <Icon size={18} />
                {title}
                {page === key && <span className="active-dot" />}
              </button>
            </React.Fragment>
          ))}
          {user.role === "admin" && (
            <>
              <span className="nav-divider">GESTIÓN</span>
              <button
                className={page === "admin" ? "active" : ""}
                onClick={() => navigate("admin")}
              >
                <Settings size={18} />
                Administración
              </button>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="quota-card">
            <span>
              <Sparkles size={15} /> Tu consumo
            </span>
            <strong>
              {fmt(consumption.tokens_used)}{" "}
              <small>/ {fmt(consumption.token_limit)}</small>
            </strong>
            <div className="progress">
              <i
                style={{
                  width: `${Math.min(100, (100 * consumption.tokens_used) / Math.max(1, consumption.token_limit))}%`,
                }}
              />
            </div>
            <small>{fmt(consumption.available)} tokens disponibles</small>
          </div>
          <button className="profile" onClick={logout} title="Cerrar sesión">
            <span className="avatar">{user.name[0]}</span>
            <span>
              <b>{user.name}</b>
              <small>
                {user.role === "admin"
                  ? "Administrador"
                  : user.role === "reporter"
                    ? "Solo reportes"
                    : "Usuario"}
              </small>
            </span>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Abrir menú"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={22} />
          </button>
          <span>
            Mi espacio <ChevronRight size={14} />{" "}
            <b>{nav.find((n) => n[0] === page)?.[1] || "Administración"}</b>
          </span>
          <span className="topbar-right">
            <span className="status-dot" /> Catálogo de demostración{" "}
            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              title="Documentación de API"
            >
              <ExternalLink size={16} />
            </a>
          </span>
        </header>
        <main>
          <Notice>{error}</Notice>
          {!configured && (
            <Notice type="info">
              La IA estará disponible cuando configures la clave de Groq en el
              servidor. Puedes explorar el catálogo y administrar los datos.
            </Notice>
          )}
          {page === "inicio" && (
            <Home {...{ user, services, products, navigate, consumption }} />
          )}
          {names[page] && (
            <Workspace
              key={page}
              slug={page}
              products={products}
              service={services.find((s) => s.slug === page)}
              refreshUser={refresh}
            />
          )}
          {page === "catalogo" && <Catalog products={products} />}
          {page === "historial" && <HistoryPage selectedId={selectedId} />}
          {page === "reportes" && (
            <Reports user={user} consumption={consumption} />
          )}
          {page === "admin" && user.role === "admin" && (
            <Admin refresh={refresh} />
          )}
          <footer className="page-footer">
            <span>
              criterio. <span>Opiniones con contexto.</span>
            </span>
            <small>
              Proyecto académico · Los datos de ejemplo están identificados como
              demostración.
            </small>
          </footer>
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
