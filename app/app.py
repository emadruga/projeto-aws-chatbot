"""Backend do chatbot Gemma — Projeto Nuvem 2026.

- Autenticação simples (usuário/senha) com token guardado no RDS.
- Histórico da conversa de cada usuário guardado no RDS (Postgres).
- Base de conhecimento (plano pedagógico) baixada do S3 no boot e usada como prompt de sistema.
- O servidor não guarda estado próprio: qualquer EC2 atende qualquer usuário.
"""
import hashlib
import json
import os
import secrets
import socket
import urllib.request
from contextlib import contextmanager

from flask import Flask, jsonify, request, send_file
from psycopg2.pool import ThreadedConnectionPool

MODEL = os.environ["MODEL"]
HISTORY_MESSAGES = int(os.environ.get("HISTORY_MESSAGES", "6"))  # limite fixo = custo constante
HOSTNAME = socket.gethostname()  # mostra qual EC2 respondeu
OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
OPTIONS = {"temperature": 0, "seed": 42, "num_predict": 128, "num_ctx": 4096}

with open(os.environ["KB_FILE"], encoding="utf-8") as f:
    KNOWLEDGE = f.read()

SYSTEM_PROMPT = (
    "Você é o assistente virtual do Curso Técnico em Segurança Cibernética (IFF + Inmetro). "
    "Responda em português, de forma curta e direta, usando SOMENTE as informações abaixo. "
    "Se a resposta não estiver nelas, diga que não sabe.\n\n" + KNOWLEDGE
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id       SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    pw_hash  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS messages (
    id         BIGSERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id),
    role       TEXT NOT NULL,
    content    TEXT NOT NULL,
    served_by  TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_user_idx ON messages (user_id, id);
"""

pool = ThreadedConnectionPool(
    1, 20,
    host=os.environ["DB_HOST"], dbname=os.environ["DB_NAME"],
    user=os.environ["DB_USER"], password=os.environ["DB_PASSWORD"],
    connect_timeout=5,
)


@contextmanager
def db():
    """Abre uma transação no RDS e devolve um cursor."""
    conn = pool.getconn()
    try:
        with conn, conn.cursor() as cur:
            yield cur
    finally:
        pool.putconn(conn)


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(8)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${digest}"


def check_password(password, stored):
    salt = stored.split("$", 1)[0]
    return secrets.compare_digest(hash_password(password, salt), stored)


def init_db():
    """Cria as tabelas e os usuários de teste. As duas EC2 podem rodar isso ao mesmo tempo:
    o advisory lock garante que só uma faça por vez."""
    with db() as cur:
        cur.execute("SELECT pg_advisory_xact_lock(42)")
        cur.execute(SCHEMA)
        seed_password = os.environ.get("SEED_PASSWORD", "")
        for i in range(1, int(os.environ.get("SEED_USERS", "0")) + 1):
            if seed_password:
                cur.execute(
                    "INSERT INTO users (username, pw_hash) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (f"aluno{i:02d}", hash_password(seed_password)),
                )


def current_user():
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if not token:
        return None
    with db() as cur:
        cur.execute("SELECT user_id FROM sessions WHERE token = %s", (token,))
        row = cur.fetchone()
    return row[0] if row else None


def ask_ollama(messages):
    body = json.dumps({"model": MODEL, "messages": messages, "stream": False, "options": OPTIONS})
    req = urllib.request.Request(OLLAMA_URL, data=body.encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.load(resp)


init_db()
app = Flask(__name__)


@app.get("/")
def index():
    return send_file("index.html")


@app.post("/api/register")
def register():
    data = request.get_json(force=True)
    username, password = data.get("username", "").strip(), data.get("password", "")
    if len(username) < 3 or len(password) < 6:
        return jsonify(error="usuário com 3+ caracteres e senha com 6+"), 400
    with db() as cur:
        cur.execute(
            "INSERT INTO users (username, pw_hash) VALUES (%s, %s) ON CONFLICT DO NOTHING RETURNING id",
            (username, hash_password(password)),
        )
        if cur.fetchone() is None:
            return jsonify(error="usuário já existe"), 409
    return jsonify(ok=True), 201


@app.post("/api/login")
def login():
    data = request.get_json(force=True)
    with db() as cur:
        cur.execute("SELECT id, pw_hash FROM users WHERE username = %s", (data.get("username", ""),))
        row = cur.fetchone()
        if not row or not check_password(data.get("password", ""), row[1]):
            return jsonify(error="usuário ou senha inválidos"), 401
        token = secrets.token_hex(16)
        cur.execute("INSERT INTO sessions (token, user_id) VALUES (%s, %s)", (token, row[0]))
    return jsonify(token=token)


@app.get("/api/history")
def history():
    user_id = current_user()
    if user_id is None:
        return jsonify(error="não autenticado"), 401
    with db() as cur:
        cur.execute(
            "SELECT role, content, served_by FROM messages WHERE user_id = %s ORDER BY id DESC LIMIT 50",
            (user_id,),
        )
        rows = cur.fetchall()[::-1]
    return jsonify(messages=[{"role": r, "content": c, "served_by": s} for r, c, s in rows])


@app.post("/api/chat")
def chat():
    user_id = current_user()
    if user_id is None:
        return jsonify(error="não autenticado"), 401
    text = request.get_json(force=True).get("message", "").strip()
    if not text:
        return jsonify(error="mensagem vazia"), 400

    # 1) Últimas mensagens do usuário, lidas do RDS (qualquer EC2 enxerga o mesmo histórico)
    with db() as cur:
        cur.execute(
            "SELECT role, content FROM messages WHERE user_id = %s ORDER BY id DESC LIMIT %s",
            (user_id, HISTORY_MESSAGES),
        )
        past = [{"role": r, "content": c} for r, c in cur.fetchall()[::-1]]

    # 2) Pergunta ao Gemma: prompt de sistema (base de conhecimento) + histórico + pergunta nova
    result = ask_ollama([{"role": "system", "content": SYSTEM_PROMPT}, *past, {"role": "user", "content": text}])
    reply = result["message"]["content"]

    # 3) Grava pergunta e resposta no RDS
    with db() as cur:
        cur.execute(
            "INSERT INTO messages (user_id, role, content, served_by) VALUES (%s, 'user', %s, %s), (%s, 'assistant', %s, %s)",
            (user_id, text, HOSTNAME, user_id, reply, HOSTNAME),
        )

    return jsonify(
        reply=reply,
        served_by=HOSTNAME,
        prompt_tokens=result.get("prompt_eval_count"),
        prompt_ms=round(result.get("prompt_eval_duration", 0) / 1e6),
        generate_ms=round(result.get("eval_duration", 0) / 1e6),
    )
