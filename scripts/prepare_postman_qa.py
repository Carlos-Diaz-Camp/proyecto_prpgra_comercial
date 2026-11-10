"""Initialize an isolated local PostgreSQL database and seed disposable QA users."""

import json
import os
from pathlib import Path
import secrets
import sys
from urllib.parse import urlsplit


root = Path(__file__).resolve().parents[1]
url = urlsplit(os.environ.get("DATABASE_URL", ""))
if (
    url.scheme not in {"postgres", "postgresql", "postgresql+psycopg"}
    or url.hostname not in {"127.0.0.1", "localhost"}
    or url.path != "/criterio_postman"
):
    raise SystemExit("DATABASE_URL debe apuntar a PostgreSQL local y a la base criterio_postman.")

sys.path.insert(0, str(root / "backend"))
from sqlalchemy import inspect
from app.db import engine, SessionLocal
from app.models import User
from app.security import passwords


if not inspect(engine).has_table("users"):
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
        raw = connection.connection.driver_connection
        raw.execute((root / "database" / "setup.sql").read_text(encoding="utf-8"))

suffix = secrets.token_hex(4)
variables = {"baseUrl": "http://127.0.0.1:8000"}
with SessionLocal() as db:
    for name, role, limit in [
        ("Admin", "admin", 100_000),
        ("User", "user", 100_000),
        ("Quota", "user", 0),
        ("Reporter", "reporter", 0),
    ]:
        email = f"qa-{name.lower()}-{suffix}@criterio.test"
        password = secrets.token_urlsafe(20)
        db.add(User(
            name=f"QA {name}",
            email=email,
            role=role,
            password_hash=passwords.hash(password),
            token_limit=limit,
        ))
        variables[f"qa{name}Email"] = email
        variables[f"qa{name}Password"] = password
    db.commit()

variables["email"] = variables["qaUserEmail"]
variables["password"] = variables["qaUserPassword"]
environment = {
    "name": "Criterio QA local",
    "values": [
        {"key": key, "value": value, "enabled": True, "type": "secret" if "password" in key.lower() else "default"}
        for key, value in variables.items()
    ],
    "_postman_variable_scope": "environment",
}
target = root / "tmp" / "postman-env.json"
target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps(environment, indent=2) + "\n", encoding="utf-8")
target.with_name("postman-run-data.json").write_text(
    json.dumps([variables], indent=2) + "\n", encoding="utf-8"
)
print("Base criterio_postman y cuentas QA listas. Archivos del Runner guardados en tmp/.")
