import os
import random
import secrets
import hashlib
import sqlite3
import uuid
from datetime import datetime

from flask import (Flask, abort, g, redirect, render_template, request,
                   session, url_for)
from werkzeug.utils import secure_filename

app = Flask(__name__)
# Secure fallback for session keys
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32MB file upload limit

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "facemash")
DATABASE = os.path.join(app.instance_path, "facemash.db")
UPLOAD_FOLDER = os.path.join(app.static_folder, "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

os.makedirs(app.instance_path, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ---------------------------------------------------------------------------
# Security Middleware (CSRF Protection)
# ---------------------------------------------------------------------------

@app.before_request
def csrf_protect():
    # Make sure session has a CSRF token
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(32)
    
    # Check CSRF token on POST requests
    if request.method == "POST":
        token = request.form.get("csrf_token")
        if not token or token != session.get("csrf_token"):
            # CSRF token mismatch! Abort with 400 Bad Request
            abort(400, "CSRF token missing or invalid.")


@app.context_processor
def inject_csrf_token():
    return dict(csrf_token=session.get("csrf_token"))



# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS persons (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            name      TEXT    NOT NULL,
            photo_path TEXT   NOT NULL,
            photo_hash TEXT   NOT NULL DEFAULT '',
            elo       REAL    NOT NULL DEFAULT 1400.0,
            wins      INTEGER NOT NULL DEFAULT 0,
            losses    INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS votes (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            winner_id  INTEGER NOT NULL,
            loser_id   INTEGER NOT NULL,
            timestamp  TEXT    NOT NULL
        );
    """)
    db.commit()

    try:
        db.execute("ALTER TABLE persons ADD COLUMN photo_hash TEXT NOT NULL DEFAULT ''")
        db.commit()
    except sqlite3.OperationalError:
        pass

    # Backfill missing photo hashes for previously uploaded images
    persons = db.execute("SELECT id, photo_path FROM persons WHERE photo_hash = '' OR photo_hash IS NULL").fetchall()
    for p in persons:
        photo_file = os.path.join(app.static_folder, p["photo_path"])
        if os.path.exists(photo_file):
            try:
                with open(photo_file, "rb") as fh:
                    file_hash = hashlib.sha256(fh.read()).hexdigest()
                db.execute("UPDATE persons SET photo_hash = ? WHERE id = ?", (file_hash, p["id"]))
            except Exception:
                pass
    db.commit()


with app.app_context():
    init_db()


# ---------------------------------------------------------------------------
# Elo helpers
# ---------------------------------------------------------------------------

K = 32


def _expected(ra, rb):
    return 1 / (1 + 10 ** ((rb - ra) / 400))


def update_elo(winner_elo, loser_elo):
    e_win = _expected(winner_elo, loser_elo)
    e_los = _expected(loser_elo, winner_elo)
    return round(winner_elo + K * (1 - e_win), 1), round(loser_elo + K * (0 - e_los), 1)


# ---------------------------------------------------------------------------
# Upload helper
# ---------------------------------------------------------------------------

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return redirect(url_for("vote"))


@app.route("/vote", methods=["GET", "POST"])
def vote():
    db = get_db()

    if request.method == "POST":
        winner_id = request.form.get("winner_id", type=int)
        loser_id = request.form.get("loser_id", type=int)
        if winner_id and loser_id:
            winner = db.execute("SELECT * FROM persons WHERE id = ?", (winner_id,)).fetchone()
            loser = db.execute("SELECT * FROM persons WHERE id = ?", (loser_id,)).fetchone()
            if winner and loser:
                new_w_elo, new_l_elo = update_elo(winner["elo"], loser["elo"])
                db.execute(
                    "UPDATE persons SET elo=?, wins=wins+1 WHERE id=?",
                    (new_w_elo, winner_id),
                )
                db.execute(
                    "UPDATE persons SET elo=?, losses=losses+1 WHERE id=?",
                    (new_l_elo, loser_id),
                )
                db.execute(
                    "INSERT INTO votes (winner_id, loser_id, timestamp) VALUES (?,?,?)",
                    (winner_id, loser_id, datetime.utcnow().isoformat()),
                )
                db.commit()
        return redirect(url_for("vote"))

    persons = db.execute("SELECT * FROM persons").fetchall()
    if len(persons) < 2:
        return render_template("index.html", person_a=None, person_b=None)

    person_a, person_b = random.sample(list(persons), 2)
    return render_template("index.html", person_a=person_a, person_b=person_b)


@app.route("/leaderboard")
def leaderboard():
    db = get_db()
    persons = db.execute(
        "SELECT * FROM persons ORDER BY elo DESC"
    ).fetchall()
    return render_template("leaderboard.html", persons=persons)


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        if request.form.get("password") == ADMIN_PASSWORD:
            session["admin"] = True
            return redirect(url_for("upload"))
        error = "Wrong password."
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.pop("admin", None)
    return redirect(url_for("vote"))


@app.route("/upload", methods=["GET", "POST"])
def upload():
    if not session.get("admin"):
        return redirect(url_for("login"))

    db = get_db()
    message = None
    error = None

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        files = request.files.getlist("photos")
        files = [f for f in files if f and f.filename]

        if not files:
            error = "Please select at least one photo."
        else:
            bad = [f.filename for f in files if not allowed_file(f.filename)]
            if bad:
                error = f"Unsupported file type(s): {', '.join(bad)}"
            else:
                added = []
                skipped = []
                seen_hashes_in_request = set()
                for f in files:
                    person_name = name if (len(files) == 1 and name) else \
                        f.filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
                    
                    # Read file content and calculate hash
                    file_data = f.read()
                    file_hash = hashlib.sha256(file_data).hexdigest()
                    f.seek(0)  # Reset stream pointer for standard saving
                    
                    # Check for duplicates within the current upload selection
                    if file_hash in seen_hashes_in_request:
                        skipped.append(f"{person_name} (duplicate in selection)")
                        continue
                    
                    # Verify duplicate check in database
                    existing = db.execute("SELECT id, name FROM persons WHERE photo_hash = ?", (file_hash,)).fetchone()
                    if existing:
                        skipped.append(f"{person_name} (matches {existing['name']})")
                        continue
                    
                    seen_hashes_in_request.add(file_hash)
                    
                    ext = f.filename.rsplit(".", 1)[1].lower()
                    fname = f"{uuid.uuid4().hex}.{ext}"
                    f.save(os.path.join(UPLOAD_FOLDER, fname))
                    db.execute(
                        "INSERT INTO persons (name, photo_path, photo_hash) VALUES (?, ?, ?)",
                        (person_name, f"uploads/{fname}", file_hash),
                    )
                    added.append(person_name)
                db.commit()
                
                msg_parts = []
                if added:
                    msg_parts.append(f"Added: {', '.join(added)}")
                if skipped:
                    msg_parts.append(f"Skipped duplicate(s): {', '.join(skipped)}")
                
                if added:
                    message = ". ".join(msg_parts) + "."
                else:
                    error = ". ".join(msg_parts) + "."

    persons = db.execute("SELECT * FROM persons ORDER BY id DESC").fetchall()
    return render_template("upload.html", persons=persons, message=message, error=error)


@app.route("/delete/<int:person_id>", methods=["POST"])
def delete_person(person_id):
    if not session.get("admin"):
        return redirect(url_for("login"))
    db = get_db()
    person = db.execute("SELECT * FROM persons WHERE id = ?", (person_id,)).fetchone()
    if person:
        photo = os.path.join(app.static_folder, person["photo_path"])
        if os.path.exists(photo):
            os.remove(photo)
        db.execute("DELETE FROM persons WHERE id = ?", (person_id,))
        db.execute(
            "DELETE FROM votes WHERE winner_id = ? OR loser_id = ?",
            (person_id, person_id),
        )
        db.commit()
    return redirect(url_for("upload"))


@app.route("/clear_all", methods=["POST"])
def clear_all():
    if not session.get("admin"):
        return redirect(url_for("login"))
    
    db = get_db()
    
    # Delete all physical photos from static/uploads/
    persons = db.execute("SELECT photo_path FROM persons").fetchall()
    for p in persons:
        photo_file = os.path.join(app.static_folder, p["photo_path"])
        if os.path.exists(photo_file):
            try:
                os.remove(photo_file)
            except Exception:
                pass
                
    db.execute("DELETE FROM persons")
    db.execute("DELETE FROM votes")
    db.commit()
    return redirect(url_for("upload"))


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
