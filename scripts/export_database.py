"""Generate the deliverable PostgreSQL SQL and synthetic seed from the same ORM metadata."""
import json
import sys
from pathlib import Path
from sqlalchemy.schema import CreateTable, CreateIndex
from sqlalchemy.dialects import postgresql
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'backend'))
from app.db import Base
from app import models

products = [
    ('iPhone 13', 'Apple', 'smartphones', 'Teléfono con pantalla OLED, cámara dual y almacenamiento de 128 GB.', 599),
    ('Samsung Galaxy S23', 'Samsung', 'smartphones', 'Teléfono Android compacto con pantalla AMOLED y cámara versátil.', 649),
    ('Google Pixel 7', 'Google', 'smartphones', 'Teléfono Android con cámara principal de 50 MP y pantalla OLED.', 449),
    ('MacBook Air M2', 'Apple', 'laptops', 'Portátil ligero para estudio y trabajo, con 8 GB de memoria y 256 GB de almacenamiento.', 999),
    ('Lenovo IdeaPad 5', 'Lenovo', 'laptops', 'Portátil de trabajo con pantalla de 15 pulgadas y 16 GB de memoria.', 699),
    ('Dell XPS 13', 'Dell', 'laptops', 'Portátil compacto con pantalla de alta resolución, orientado a movilidad.', 1099),
    ('Sony WH-1000XM4', 'Sony', 'mobile-accessories', 'Audífonos inalámbricos con cancelación activa de ruido y micrófono.', 249),
    ('Apple AirPods Max', 'Apple', 'mobile-accessories', 'Audífonos de diadema con cancelación de ruido e integración con dispositivos Apple.', 499),
    ('Samsung Galaxy Buds 2', 'Samsung', 'mobile-accessories', 'Audífonos compactos con estuche de carga y cancelación de ruido.', 119),
    ('iPad Air', 'Apple', 'tablets', 'Tableta ligera para lectura, notas y contenido multimedia.', 549),
    ('Samsung Galaxy Tab S8', 'Samsung', 'tablets', 'Tableta Android con soporte para lápiz y multitarea.', 599),
    ('Lenovo Tab P11', 'Lenovo', 'tablets', 'Tableta de 11 pulgadas para estudio, lectura y entretenimiento.', 249),
]
review_sets = {
    'smartphones': [('La cámara toma fotos claras de día y el teléfono responde rápido.', 5), ('La batería se agota antes de terminar el día con uso intenso.', 2), ('La batería dura poco cuando uso mapas y videollamadas.', 2), ('La pantalla se ve bien al aire libre y el tamaño es cómodo.', 4), ('Se calienta al jugar durante mucho tiempo.', 3), ('La cámara me resulta útil para tareas y documentos.', 5), ('El precio me parece alto para el almacenamiento incluido.', 3), ('La batería es suficiente para llamadas y mensajes, con uso moderado.', 4)],
    'laptops': [('Es ligero y fácil de llevar a clases.', 5), ('Tiene pocos puertos y debo cargar un adaptador.', 2), ('Me faltan puertos para conectar mis periféricos.', 3), ('Funciona bien con documentos y videollamadas.', 5), ('La pantalla tiene reflejos en una habitación iluminada.', 3), ('El teclado es cómodo para escribir varias horas.', 4), ('La memoria se queda corta con muchas aplicaciones abiertas.', 2), ('La batería me permite trabajar durante la mañana.', 4)],
    'mobile-accessories': [('La cancelación de ruido ayuda a concentrarme.', 5), ('El micrófono recoge mucho ruido en la calle.', 2), ('En llamadas exteriores no me escuchan con claridad.', 2), ('Son cómodos durante sesiones cortas.', 4), ('Después de varias horas noto presión y molestia.', 3), ('La batería dura varios días con mi uso.', 5), ('La conexión con mi teléfono es estable.', 4), ('El sonido es claro, pero el precio es elevado.', 3)],
    'tablets': [('Es cómoda para leer y tomar notas.', 5), ('La multitarea se vuelve lenta con varias aplicaciones.', 2), ('Con muchas pestañas abiertas noto lentitud.', 3), ('La pantalla es adecuada para películas y clases.', 4), ('El teclado se vende por separado y aumenta el costo.', 3), ('La batería dura una jornada de estudio.', 5), ('Para documentos básicos funciona bien.', 4), ('Me gustaría más almacenamiento para archivos sin conexión.', 3)]
}
data = {'products': [], 'reviews': [], 'ai_services': []}
for i, (name, brand, category, description, price) in enumerate(products, 1):
    data['products'].append(dict(id=i, name=name, brand=brand, category=category, description=description, price=price, currency='USD', external_id=None, is_demo=True))
    for comment, rating in review_sets[category]:
        data['reviews'].append(dict(id=len(data['reviews']) + 1, product_id=i, rating=rating, comment=comment, source='Demostración sintética; no describe compradores reales', is_demo=True))
for i, (slug, name, description) in enumerate([
    ('chat', 'Consulta el catálogo', 'Respuestas basadas en productos y reseñas guardados, con memoria y fuentes.'),
    ('explorar', 'Explora opiniones', 'Busca reseñas externas y analiza sentimiento, aspectos y límites de la evidencia.'),
    ('alternativas', 'Encuentra alternativas', 'Detecta problemas recurrentes y compara otras opciones con fuentes.')], 1):
    data['ai_services'].append(dict(id=i, slug=slug, name=name, description=description, enabled=True, model='openai/gpt-oss-20b', max_output_tokens=900, max_steps=4))
(root / 'database').mkdir(exist_ok=True)
(root / 'database' / 'demo.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
dialect = postgresql.dialect()
sql = ['-- Criterio: creación inicial PostgreSQL. Ejecutar sobre una base VACÍA.\n-- Generado desde los modelos mediante scripts/export_database.py.\n-- No contiene cuentas ni contraseñas.\nBEGIN;']
for table in Base.metadata.sorted_tables:
    ddl = str(CreateTable(table).compile(dialect=dialect)).strip()
    sql.append('\n'.join(line.rstrip() for line in ddl.splitlines()) + ';')
    sql.extend(str(CreateIndex(index).compile(dialect=dialect)) + ';' for index in sorted(table.indexes, key=lambda value: value.name))
sql.append("CREATE INDEX ix_products_search ON products USING gin(to_tsvector('simple', name || ' ' || category || ' ' || description));")
def literal(value):
    if value is None: return 'NULL'
    if isinstance(value, bool): return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)): return str(value)
    return "'" + str(value).replace("'", "''") + "'"
for table, rows in data.items():
    for row in rows:
        if table == 'reviews': row = {**row, 'created_at': '2026-11-01T12:00:00+00:00'}
        sql.append(f'INSERT INTO {table} ({", ".join(row)}) VALUES ({", ".join(literal(v) for v in row.values())});')
    sql.append(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), (SELECT max(id) FROM {table}));")
sql.append('COMMIT;\n')
(root / 'database' / 'setup.sql').write_text('\n\n'.join(sql), encoding='utf-8')
print('Generados database/setup.sql y database/demo.json (12 productos, 96 reseñas, 3 servicios).')
