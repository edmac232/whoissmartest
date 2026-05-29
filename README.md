# Whoissmartest

A recreation of Mark Zuckerberg's 2003 Facemash website, styled after its appearance in *The Social Network*. Upload photos, vote on side-by-side matchups, and watch Elo ratings update in real time.

---

## Project Tree

```
whoissmartest/
├── app.py                  # Flask app — all routes, Elo logic, DB setup
├── requirements.txt        # Python dependencies (flask)
├── static/
│   ├── style.css           # Movie-accurate UI styling
│   └── uploads/            # Uploaded photos land here (git-ignored)
└── templates/
    ├── base.html           # Shared header/footer shell
    ├── index.html          # Vote page (two photos side-by-side)
    ├── leaderboard.html    # Rankings sorted by Elo
    ├── login.html          # Admin login form
    └── upload.html         # Photo upload page
```

---

## Running in WSL

### 1. Clone the repo

```bash
git clone https://github.com/edmac232/whoissmartest.git
cd whoissmartest
```

### 2. Create and activate a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Start the server

```bash
python app.py
```

The app runs at **http://localhost:5000**. Open that URL in your Windows browser.

---

## Uploading Photos

1. Go to **http://localhost:5000/admin** and log in.  
   Default password: `whoissmartest`  
   *(set the `ADMIN_PASSWORD` environment variable to change it)*

2. On the **Upload** page:
   - **Single photo** — fill in the Name field, pick one image, click Upload.
   - **Multiple photos at once** — click the file picker, select as many images as you want (Ctrl+click or Shift+click). Names are auto-derived from filenames; underscores and hyphens become spaces.

3. Uploaded photos appear in the list below the form. You can delete any entry from there.

4. Once you have **at least 2 photos**, head to **http://localhost:5000** to start voting.

---

## How It Works

- Each person starts with an **Elo rating of 1400**.
- Clicking a photo records a win for that person and a loss for the other.
- Ratings update using the standard Elo formula (`K = 32`).
- The **Leaderboard** at `/leaderboard` shows everyone ranked by current Elo.
