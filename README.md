# BigQuery Release Pulse ⚡

A premium, responsive dark-themed dashboard that tracks official Google Cloud BigQuery release notes. It aggregates raw updates from the XML feed, breaks them down into individual items (Features, Issues, Changes, Deprecations), and lets you copy or tweet about specific updates instantly.

![Aesthetic Preview Mockup](https://img.shields.io/badge/Aesthetics-Premium-blueviolet?style=for-the-badge)
![Python Version](https://img.shields.io/badge/Python-3.13%2B-blue?style=for-the-badge)
![Flask](https://img.shields.io/badge/Framework-Flask-black?style=for-the-badge)

---

## ✨ Features

- **Live XML RSS Synchronization**: Parses Google's official BigQuery XML release feed on-demand.
- **Granular Update Splitting**: Automatically splits compound release updates into isolated items using a regex parser.
- **Interactive Tags & Badges**: Color-coded indicators based on update classifications:
  - <span style="color:#10b981">●</span> **Feature**
  - <span style="color:#f59e0b">●</span> **Issue**
  - <span style="color:#3b82f6">●</span> **Changed**
  - <span style="color:#ef4444">●</span> **Deprecated**
- **Dynamic Local Filter**: Search updates by keywords, dates, or classifications on keypress.
- **Smart Tweet Composer**: Auto-generates a post preview restricted to Twitter's **280-character** limit, clean-truncated at word boundaries with integrated hashtags.
- **Fast Copy-to-Clipboard**: Copy plain text or share it on X (Twitter) using a Web Intent.
- **Polished Glassmorphism UI**: Cyberpunk-inspired dark theme with animations, radial glows, and smooth transitions.

---

## 📂 Directory Structure

```text
agy-cli-projects/
├── static/
│   ├── app.js       # Client interactive controller (filtering, state, and composer)
│   └── style.css     # Premium dark-theme variables, typography, and animations
├── templates/
│   └── index.html    # Responsive HTML5 layout
├── app.py            # Flask server (feed requests, HTML parsing, cache, routing)
├── .gitignore        # Standard ignore patterns (venv, __pycache__, IDE configs)
└── README.md         # Documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.13+ installed on your system.

### 1. Set Up Virtual Environment
Initialize a local virtual environment to isolate project packages:
```bash
python -m venv venv
```

Activate the virtual environment:
- **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **macOS/Linux**:
  ```bash
  source venv/bin/activate
  ```

### 2. Install Dependencies
Install Flask and standard packages:
```bash
pip install Flask requests
```

### 3. Run the Server
Launch the development server:
```bash
python app.py
```
Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

---

## ⚙️ How the Backend Works
- **Parser**: Extracts elements inside the Atom XML namespaces using Python's standard `xml.etree.ElementTree`.
- **H3 Splitting**: Uses regex to divide `<content>` elements into specific tags:
  ```python
  pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', re.DOTALL | re.IGNORECASE)
  ```
- **Caching**: Results are stored in memory on the server. To bypass the cache and force an update, request `/api/releases?refresh=true`.
