-- Criterio: creación inicial PostgreSQL. Ejecutar sobre una base VACÍA.
-- Generado desde los modelos mediante scripts/export_database.py.
-- No contiene cuentas ni contraseñas.
BEGIN;

CREATE TABLE ai_services (
	id SERIAL NOT NULL,
	slug VARCHAR(40) NOT NULL,
	name VARCHAR(120) NOT NULL,
	description TEXT NOT NULL,
	enabled BOOLEAN NOT NULL,
	model VARCHAR(120) NOT NULL,
	max_output_tokens INTEGER NOT NULL,
	max_steps INTEGER NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (slug)
);

CREATE TABLE products (
	id SERIAL NOT NULL,
	name VARCHAR(160) NOT NULL,
	brand VARCHAR(100) NOT NULL,
	category VARCHAR(80) NOT NULL,
	description TEXT NOT NULL,
	price FLOAT NOT NULL,
	currency VARCHAR(3) NOT NULL,
	external_id INTEGER,
	is_demo BOOLEAN NOT NULL,
	PRIMARY KEY (id)
);

CREATE INDEX ix_products_category ON products (category);

CREATE INDEX ix_products_name ON products (name);

CREATE TABLE users (
	id VARCHAR(36) NOT NULL,
	name VARCHAR(120) NOT NULL,
	email VARCHAR(254) NOT NULL,
	password_hash TEXT NOT NULL,
	role VARCHAR(20) NOT NULL,
	active BOOLEAN NOT NULL,
	token_limit INTEGER NOT NULL,
	tokens_used INTEGER NOT NULL,
	tokens_reserved INTEGER NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	CHECK (token_limit >= 0 AND tokens_used >= 0 AND tokens_reserved >= 0)
);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE auth_sessions (
	id VARCHAR(36) NOT NULL,
	user_id VARCHAR(36) NOT NULL,
	refresh_hash VARCHAR(64) NOT NULL,
	csrf_hash VARCHAR(64) NOT NULL,
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
	revoked BOOLEAN NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
	UNIQUE (refresh_hash)
);

CREATE INDEX ix_auth_sessions_user_id ON auth_sessions (user_id);

CREATE TABLE conversations (
	id VARCHAR(36) NOT NULL,
	user_id VARCHAR(36) NOT NULL,
	service_id INTEGER NOT NULL,
	title VARCHAR(120) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id),
	FOREIGN KEY(service_id) REFERENCES ai_services (id)
);

CREATE INDEX ix_conversations_user_id ON conversations (user_id);

CREATE TABLE reviews (
	id SERIAL NOT NULL,
	product_id INTEGER NOT NULL,
	rating INTEGER NOT NULL,
	comment TEXT NOT NULL,
	source VARCHAR(200) NOT NULL,
	is_demo BOOLEAN NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	CHECK (rating >= 1 AND rating <= 5),
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE INDEX ix_reviews_product_id ON reviews (product_id);

CREATE TABLE messages (
	id VARCHAR(36) NOT NULL,
	conversation_id VARCHAR(36) NOT NULL,
	role VARCHAR(20) NOT NULL,
	content TEXT NOT NULL,
	sources JSON NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(conversation_id) REFERENCES conversations (id)
);

CREATE INDEX ix_messages_conversation_id ON messages (conversation_id);

CREATE TABLE service_requests (
	id VARCHAR(36) NOT NULL,
	user_id VARCHAR(36) NOT NULL,
	service_id INTEGER NOT NULL,
	conversation_id VARCHAR(36),
	status VARCHAR(20) NOT NULL,
	trace JSON NOT NULL,
	error TEXT,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id),
	FOREIGN KEY(service_id) REFERENCES ai_services (id),
	FOREIGN KEY(conversation_id) REFERENCES conversations (id)
);

CREATE INDEX ix_service_requests_created_at ON service_requests (created_at);

CREATE INDEX ix_service_requests_service_id ON service_requests (service_id);

CREATE INDEX ix_service_requests_user_id ON service_requests (user_id);

CREATE TABLE usage_events (
	id VARCHAR(36) NOT NULL,
	request_id VARCHAR(36) NOT NULL,
	model VARCHAR(120) NOT NULL,
	input_tokens INTEGER NOT NULL,
	output_tokens INTEGER NOT NULL,
	reserved_tokens INTEGER NOT NULL,
	status VARCHAR(20) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(request_id) REFERENCES service_requests (id)
);

CREATE INDEX ix_usage_events_request_id ON usage_events (request_id);

CREATE INDEX ix_products_search ON products USING gin(to_tsvector('simple', name || ' ' || category || ' ' || description));

INSERT INTO products (id, name, brand, category, description, price, currency, external_id, is_demo) VALUES (1, 'iPhone 13', 'Apple', 'smartphones', 'Teléfono con pantalla OLED, cámara dual y almacenamiento de 128 GB.', 599, 'USD', NULL, TRUE);

INSERT INTO products (id, name, brand, category, description, price, currency, external_id, is_demo) VALUES (2, 'Samsung Galaxy S23', 'Samsung', 'smartphones', 'Teléfono Android compacto con pantalla AMOLED y cámara versátil.', 649, 'USD', NULL, TRUE);

INSERT INTO products (id, name, brand, category, description, price, currency, external_id, is_demo) VALUES (3, 'Google Pixel 7', 'Google', 'smartphones', 'Teléfono Android con cámara principal de 50 MP y pantalla OLED.', 449, 'USD', NULL, TRUE);

INSERT INTO products (id, name, brand, category, description, price, currency, external_id, is_demo) VALUES (4, 'MacBook Air M2', 'Apple', 'laptops', 'Portátil ligero para estudio y trabajo, con 8 GB de memoria y 256 GB de almacenamiento.', 999, 'USD', NULL, TRUE);

INSERT INTO products (id, name, brand, category, description, price, currency, external_id, is_demo) VALUES (5, 'Lenovo IdeaPad 5', 'Lenovo', 'laptops', 'Portátil de trabajo con pantalla de 15 pulgadas y 16 GB de memoria.', 699, 'USD', NULL, TRUE);

INSERT INTO products (id, name, brand, category, description, price, currency, external_id, is_demo) VALUES (6, 'Dell XPS 13', 'Dell', 'laptops', 'Portátil compacto con pantalla de alta resolución, orientado a movilidad.', 1099, 'USD', NULL, TRUE);

INSERT INTO products (id, name, brand, category, description, price, currency, external_id, is_demo) VALUES (7, 'Sony WH-1000XM4', 'Sony', 'mobile-accessories', 'Audífonos inalámbricos con cancelación activa de ruido y micrófono.', 249, 'USD', NULL, TRUE);

INSERT INTO products (id, name, brand, category, description, price, currency, external_id, is_demo) VALUES (8, 'Apple AirPods Max', 'Apple', 'mobile-accessories', 'Audífonos de diadema con cancelación de ruido e integración con dispositivos Apple.', 499, 'USD', NULL, TRUE);

INSERT INTO products (id, name, brand, category, description, price, currency, external_id, is_demo) VALUES (9, 'Samsung Galaxy Buds 2', 'Samsung', 'mobile-accessories', 'Audífonos compactos con estuche de carga y cancelación de ruido.', 119, 'USD', NULL, TRUE);

INSERT INTO products (id, name, brand, category, description, price, currency, external_id, is_demo) VALUES (10, 'iPad Air', 'Apple', 'tablets', 'Tableta ligera para lectura, notas y contenido multimedia.', 549, 'USD', NULL, TRUE);

INSERT INTO products (id, name, brand, category, description, price, currency, external_id, is_demo) VALUES (11, 'Samsung Galaxy Tab S8', 'Samsung', 'tablets', 'Tableta Android con soporte para lápiz y multitarea.', 599, 'USD', NULL, TRUE);

INSERT INTO products (id, name, brand, category, description, price, currency, external_id, is_demo) VALUES (12, 'Lenovo Tab P11', 'Lenovo', 'tablets', 'Tableta de 11 pulgadas para estudio, lectura y entretenimiento.', 249, 'USD', NULL, TRUE);

SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT max(id) FROM products));

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (1, 1, 5, 'La cámara toma fotos claras de día y el teléfono responde rápido.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (2, 1, 2, 'La batería se agota antes de terminar el día con uso intenso.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (3, 1, 2, 'La batería dura poco cuando uso mapas y videollamadas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (4, 1, 4, 'La pantalla se ve bien al aire libre y el tamaño es cómodo.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (5, 1, 3, 'Se calienta al jugar durante mucho tiempo.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (6, 1, 5, 'La cámara me resulta útil para tareas y documentos.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (7, 1, 3, 'El precio me parece alto para el almacenamiento incluido.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (8, 1, 4, 'La batería es suficiente para llamadas y mensajes, con uso moderado.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (9, 2, 5, 'La cámara toma fotos claras de día y el teléfono responde rápido.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (10, 2, 2, 'La batería se agota antes de terminar el día con uso intenso.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (11, 2, 2, 'La batería dura poco cuando uso mapas y videollamadas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (12, 2, 4, 'La pantalla se ve bien al aire libre y el tamaño es cómodo.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (13, 2, 3, 'Se calienta al jugar durante mucho tiempo.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (14, 2, 5, 'La cámara me resulta útil para tareas y documentos.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (15, 2, 3, 'El precio me parece alto para el almacenamiento incluido.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (16, 2, 4, 'La batería es suficiente para llamadas y mensajes, con uso moderado.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (17, 3, 5, 'La cámara toma fotos claras de día y el teléfono responde rápido.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (18, 3, 2, 'La batería se agota antes de terminar el día con uso intenso.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (19, 3, 2, 'La batería dura poco cuando uso mapas y videollamadas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (20, 3, 4, 'La pantalla se ve bien al aire libre y el tamaño es cómodo.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (21, 3, 3, 'Se calienta al jugar durante mucho tiempo.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (22, 3, 5, 'La cámara me resulta útil para tareas y documentos.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (23, 3, 3, 'El precio me parece alto para el almacenamiento incluido.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (24, 3, 4, 'La batería es suficiente para llamadas y mensajes, con uso moderado.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (25, 4, 5, 'Es ligero y fácil de llevar a clases.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (26, 4, 2, 'Tiene pocos puertos y debo cargar un adaptador.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (27, 4, 3, 'Me faltan puertos para conectar mis periféricos.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (28, 4, 5, 'Funciona bien con documentos y videollamadas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (29, 4, 3, 'La pantalla tiene reflejos en una habitación iluminada.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (30, 4, 4, 'El teclado es cómodo para escribir varias horas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (31, 4, 2, 'La memoria se queda corta con muchas aplicaciones abiertas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (32, 4, 4, 'La batería me permite trabajar durante la mañana.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (33, 5, 5, 'Es ligero y fácil de llevar a clases.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (34, 5, 2, 'Tiene pocos puertos y debo cargar un adaptador.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (35, 5, 3, 'Me faltan puertos para conectar mis periféricos.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (36, 5, 5, 'Funciona bien con documentos y videollamadas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (37, 5, 3, 'La pantalla tiene reflejos en una habitación iluminada.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (38, 5, 4, 'El teclado es cómodo para escribir varias horas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (39, 5, 2, 'La memoria se queda corta con muchas aplicaciones abiertas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (40, 5, 4, 'La batería me permite trabajar durante la mañana.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (41, 6, 5, 'Es ligero y fácil de llevar a clases.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (42, 6, 2, 'Tiene pocos puertos y debo cargar un adaptador.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (43, 6, 3, 'Me faltan puertos para conectar mis periféricos.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (44, 6, 5, 'Funciona bien con documentos y videollamadas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (45, 6, 3, 'La pantalla tiene reflejos en una habitación iluminada.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (46, 6, 4, 'El teclado es cómodo para escribir varias horas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (47, 6, 2, 'La memoria se queda corta con muchas aplicaciones abiertas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (48, 6, 4, 'La batería me permite trabajar durante la mañana.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (49, 7, 5, 'La cancelación de ruido ayuda a concentrarme.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (50, 7, 2, 'El micrófono recoge mucho ruido en la calle.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (51, 7, 2, 'En llamadas exteriores no me escuchan con claridad.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (52, 7, 4, 'Son cómodos durante sesiones cortas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (53, 7, 3, 'Después de varias horas noto presión y molestia.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (54, 7, 5, 'La batería dura varios días con mi uso.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (55, 7, 4, 'La conexión con mi teléfono es estable.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (56, 7, 3, 'El sonido es claro, pero el precio es elevado.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (57, 8, 5, 'La cancelación de ruido ayuda a concentrarme.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (58, 8, 2, 'El micrófono recoge mucho ruido en la calle.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (59, 8, 2, 'En llamadas exteriores no me escuchan con claridad.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (60, 8, 4, 'Son cómodos durante sesiones cortas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (61, 8, 3, 'Después de varias horas noto presión y molestia.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (62, 8, 5, 'La batería dura varios días con mi uso.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (63, 8, 4, 'La conexión con mi teléfono es estable.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (64, 8, 3, 'El sonido es claro, pero el precio es elevado.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (65, 9, 5, 'La cancelación de ruido ayuda a concentrarme.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (66, 9, 2, 'El micrófono recoge mucho ruido en la calle.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (67, 9, 2, 'En llamadas exteriores no me escuchan con claridad.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (68, 9, 4, 'Son cómodos durante sesiones cortas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (69, 9, 3, 'Después de varias horas noto presión y molestia.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (70, 9, 5, 'La batería dura varios días con mi uso.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (71, 9, 4, 'La conexión con mi teléfono es estable.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (72, 9, 3, 'El sonido es claro, pero el precio es elevado.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (73, 10, 5, 'Es cómoda para leer y tomar notas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (74, 10, 2, 'La multitarea se vuelve lenta con varias aplicaciones.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (75, 10, 3, 'Con muchas pestañas abiertas noto lentitud.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (76, 10, 4, 'La pantalla es adecuada para películas y clases.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (77, 10, 3, 'El teclado se vende por separado y aumenta el costo.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (78, 10, 5, 'La batería dura una jornada de estudio.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (79, 10, 4, 'Para documentos básicos funciona bien.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (80, 10, 3, 'Me gustaría más almacenamiento para archivos sin conexión.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (81, 11, 5, 'Es cómoda para leer y tomar notas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (82, 11, 2, 'La multitarea se vuelve lenta con varias aplicaciones.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (83, 11, 3, 'Con muchas pestañas abiertas noto lentitud.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (84, 11, 4, 'La pantalla es adecuada para películas y clases.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (85, 11, 3, 'El teclado se vende por separado y aumenta el costo.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (86, 11, 5, 'La batería dura una jornada de estudio.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (87, 11, 4, 'Para documentos básicos funciona bien.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (88, 11, 3, 'Me gustaría más almacenamiento para archivos sin conexión.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (89, 12, 5, 'Es cómoda para leer y tomar notas.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (90, 12, 2, 'La multitarea se vuelve lenta con varias aplicaciones.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (91, 12, 3, 'Con muchas pestañas abiertas noto lentitud.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (92, 12, 4, 'La pantalla es adecuada para películas y clases.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (93, 12, 3, 'El teclado se vende por separado y aumenta el costo.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (94, 12, 5, 'La batería dura una jornada de estudio.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (95, 12, 4, 'Para documentos básicos funciona bien.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

INSERT INTO reviews (id, product_id, rating, comment, source, is_demo, created_at) VALUES (96, 12, 3, 'Me gustaría más almacenamiento para archivos sin conexión.', 'Demostración sintética; no describe compradores reales', TRUE, '2026-11-01T12:00:00+00:00');

SELECT setval(pg_get_serial_sequence('reviews', 'id'), (SELECT max(id) FROM reviews));

INSERT INTO ai_services (id, slug, name, description, enabled, model, max_output_tokens, max_steps) VALUES (1, 'chat', 'Consulta el catálogo', 'Respuestas basadas en productos y reseñas guardados, con memoria y fuentes.', TRUE, 'openai/gpt-oss-20b', 900, 4);

INSERT INTO ai_services (id, slug, name, description, enabled, model, max_output_tokens, max_steps) VALUES (2, 'explorar', 'Explora opiniones', 'Busca reseñas externas y analiza sentimiento, aspectos y límites de la evidencia.', TRUE, 'openai/gpt-oss-20b', 900, 4);

INSERT INTO ai_services (id, slug, name, description, enabled, model, max_output_tokens, max_steps) VALUES (3, 'alternativas', 'Encuentra alternativas', 'Detecta problemas recurrentes y compara otras opciones con fuentes.', TRUE, 'openai/gpt-oss-20b', 900, 4);

SELECT setval(pg_get_serial_sequence('ai_services', 'id'), (SELECT max(id) FROM ai_services));

COMMIT;
