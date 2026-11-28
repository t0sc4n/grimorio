#!/usr/bin/env python3
"""Verifica gli invarianti di Grimorio, crea online/grimorio-server.tar.gz e aggiorna la VPS."""

import argparse
import gzip
import hashlib
import io
import os
import re
import shlex
import subprocess
import sys
import tarfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ONLINE = ROOT / "online"
PROTO = ROOT / "prototipo"
OUT_TAR = ONLINE / "grimorio-server.tar.gz"

SERVER_FILES = [
    "server.js",
    "dict.js",
    "ai-core.js",
    "ai-worker.js",
    "package.json",
    "package-lock.json",
    "install.sh",
    "update.sh",
    "backup.sh",
    "ISTRUZIONI.md",
]
DEPLOY_FILES = [
    "deploy/grimorio-apache.conf",
    "deploy/grimorio.service",
]
LF_REQUIRED = [
    ONLINE / "install.sh",
    ONLINE / "update.sh",
    ONLINE / "backup.sh",
    ONLINE / "deploy" / "grimorio.service",
    ONLINE / "deploy" / "grimorio-apache.conf",
]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def verify_invariants() -> str:
    """Controlla allineamento engine, VER/CACHE, CSP e fine riga LF. Ritorna la versione VER."""
    proto_engine = (PROTO / "engine.js").read_bytes()
    online_engine = (ONLINE / "public" / "engine.js").read_bytes()
    if proto_engine != online_engine:
        raise RuntimeError("prototipo/engine.js e online/public/engine.js non sono identici.")

    proto_html = (PROTO / "index.html").read_text(encoding="utf-8")
    app_js = (ONLINE / "public" / "app.js").read_text(encoding="utf-8")
    sw_js = (ONLINE / "public" / "sw.js").read_text(encoding="utf-8")
    online_html = (ONLINE / "public" / "index.html").read_text(encoding="utf-8")

    m_proto = re.search(r'const VER = "(v\d+)";', proto_html)
    m_app = re.search(r'const VER = "(v\d+)";', app_js)
    m_sw = re.search(r'const CACHE = "grimorio-(v\d+)";', sw_js)
    if not (m_proto and m_app and m_sw):
        raise RuntimeError("Impossibile leggere VER o CACHE da index.html / app.js / sw.js.")
    if not (m_proto.group(1) == m_app.group(1) == m_sw.group(1)):
        raise RuntimeError(
            f"Versioni non allineate: prototipo={m_proto.group(1)}, "
            f"app.js={m_app.group(1)}, sw.js={m_sw.group(1)}."
        )

    for attrs, body in re.findall(r"<script\b([^>]*)>([\s\S]*?)</script>", online_html, re.IGNORECASE):
        if not re.search(r"\bsrc\s*=", attrs, re.IGNORECASE) or body.strip():
            raise RuntimeError("online/public/index.html contiene uno <script> inline (viola la CSP).")

    for path in LF_REQUIRED:
        if b"\r\n" in path.read_bytes():
            raise RuntimeError(f"Fine riga CRLF trovato in {path.relative_to(ROOT)} (serve LF).")

    return m_proto.group(1)


def add_dir(tf: tarfile.TarFile, arcname: str, now: int) -> None:
    ti = tarfile.TarInfo(arcname.rstrip("/") + "/")
    ti.type = tarfile.DIRTYPE
    ti.mode = 0o755
    ti.mtime = now
    tf.addfile(ti)


def add_bytes(tf: tarfile.TarFile, arcname: str, data: bytes, mode: int, now: int) -> None:
    ti = tarfile.TarInfo(arcname)
    ti.type = tarfile.REGTYPE
    ti.size = len(data)
    ti.mode = mode
    ti.mtime = now
    tf.addfile(ti, io.BytesIO(data))


def build_tar() -> int:
    """Genera online/grimorio-server.tar.gz in modo atomico e ritorna la dimensione in byte."""
    tmp_tar = ONLINE / ".grimorio-server.tar.gz.tmp"
    now = int(time.time())
    pub_dir = ONLINE / "public"

    with tarfile.open(tmp_tar, "w:gz") as tf:
        add_dir(tf, "grimorio-server", now)
        for rel in SERVER_FILES:
            src = ONLINE / rel
            mode = 0o755 if rel.endswith(".sh") else 0o644
            add_bytes(tf, f"grimorio-server/{rel}", src.read_bytes(), mode, now)

        add_dir(tf, "grimorio-server/deploy", now)
        for rel in DEPLOY_FILES:
            src = ONLINE / rel
            add_bytes(tf, f"grimorio-server/{rel}", src.read_bytes(), 0o644, now)

        add_dir(tf, "grimorio-server/public", now)
        seen_dirs = {"grimorio-server", "grimorio-server/deploy", "grimorio-server/public"}
        for path in sorted(pub_dir.rglob("*")):
            rel = path.relative_to(pub_dir).as_posix()
            if rel in ("parole.txt", "words-en.txt"):
                continue
            arc = f"grimorio-server/public/{rel}"
            if path.is_dir():
                if arc not in seen_dirs:
                    add_dir(tf, arc, now)
                    seen_dirs.add(arc)
            elif path.is_file():
                add_bytes(tf, arc, path.read_bytes(), 0o644, now)

        for gz_name, txt_name in [("parole.txt.gz", "parole.txt"), ("words-en.txt.gz", "words-en.txt")]:
            raw = gzip.decompress((PROTO / gz_name).read_bytes())
            add_bytes(tf, f"grimorio-server/public/{txt_name}", raw, 0o644, now)

    tmp_tar.replace(OUT_TAR)
    return OUT_TAR.stat().st_size


def load_deploy_env(env_arg: str | None) -> dict[str, str]:
    """Carica le impostazioni da .env.deploy / deploy.env (o env vars) senza stampare segreti."""
    cfg: dict[str, str] = {}
    candidates = (
        [Path(env_arg)]
        if env_arg
        else [ROOT / ".env.deploy", ONLINE / ".env.deploy", ONLINE / "deploy.env", ROOT / "deploy.env"]
    )
    chosen = next((p for p in candidates if p.is_file()), None)
    if chosen is not None:
        for raw_line in chosen.read_text(encoding="utf-8-sig").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip()
            if len(v) >= 2 and v[0] == v[-1] and v[0] in ('"', "'"):
                v = v[1:-1]
            cfg[k] = v

    for k in ("DEPLOY_HOST", "DEPLOY_USER", "DEPLOY_PORT", "DEPLOY_KEY", "DEPLOY_SUDO", "DEPLOY_REMOTE_DIR"):
        if os.environ.get(k) is not None:
            cfg[k] = os.environ[k]
    return cfg


def remote_cd_expr(remote_dir: str) -> str:
    if remote_dir == "~":
        return '"$HOME"'
    if remote_dir.startswith("~/"):
        return '"$HOME/"' + shlex.quote(remote_dir[2:])
    return shlex.quote(remote_dir)


def run_remote_deploy(cfg: dict[str, str], dry_run: bool) -> None:
    host = cfg.get("DEPLOY_HOST", "").strip()
    user = cfg.get("DEPLOY_USER", "").strip()
    port = cfg.get("DEPLOY_PORT", "22").strip() or "22"
    key_cfg = cfg.get("DEPLOY_KEY", "").strip()
    sudo_prefix = cfg.get("DEPLOY_SUDO", "sudo").strip()
    remote_dir = cfg.get("DEPLOY_REMOTE_DIR", "~").strip() or "~"

    if not host or not user:
        print(
            "Configurazione SSH mancante (DEPLOY_HOST / DEPLOY_USER).\n"
            "Copia online/deploy.env.example in .env.deploy (o online/deploy.env) e compila i campi.",
            file=sys.stderr,
        )
        sys.exit(2)

    if not re.fullmatch(r"\d+", port):
        raise RuntimeError(f"DEPLOY_PORT non valido: {port}")

    common_opts = ["-o", "ConnectTimeout=15"]
    if not sys.stdin.isatty():
        common_opts += ["-o", "BatchMode=yes"]

    if key_cfg:
        key_path = Path(key_cfg)
        if not key_path.is_absolute():
            key_path = (ROOT / key_path).resolve()
        if not key_path.is_file():
            raise RuntimeError(f"Chiave SSH non trovata al percorso configurato: {key_cfg}")
        common_opts += ["-i", str(key_path)]

    target = f"{user}@{host}"
    remote_tar = f"{remote_dir.rstrip('/')}/grimorio-server.tar.gz"
    scp_cmd = ["scp", "-P", port, *common_opts, str(OUT_TAR), f"{target}:{remote_tar}"]

    sudo_part = f"{sudo_prefix} " if sudo_prefix else ""
    remote_script = (
        f"cd {remote_cd_expr(remote_dir)} && "
        "rm -rf grimorio-server && "
        "tar xzf grimorio-server.tar.gz && "
        "cd grimorio-server && "
        f"{sudo_part}bash update.sh"
    )
    ssh_cmd = ["ssh", "-p", port, *common_opts, target, remote_script]

    print(f"Target VPS: {target}:{port} (cartella remota: {remote_dir})")
    if dry_run:
        print("DRY-RUN scp:", " ".join(scp_cmd))
        print("DRY-RUN ssh:", " ".join(ssh_cmd))
        return

    subprocess.run(scp_cmd, check=True)
    subprocess.run(ssh_cmd, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepara e deploya Grimorio sulla VPS.")
    parser.add_argument("--pack-only", action="store_true", help="Verifica e crea solo online/grimorio-server.tar.gz.")
    parser.add_argument("--dry-run", action="store_true", help="Prepara il pacchetto e mostra i comandi SSH senza eseguirli.")
    parser.add_argument("--env", help="Percorso alternativo al file .env.deploy.")
    args = parser.parse_args()

    ver = verify_invariants()
    size = build_tar()
    print(f"OK verifiche ({ver}) · pacchetto creato: online/grimorio-server.tar.gz ({size:,} byte)")

    if args.pack_only:
        return 0

    cfg = load_deploy_env(args.env)
    run_remote_deploy(cfg, dry_run=args.dry_run)
    if not args.dry_run:
        print(f"Deploy completato ({ver}).")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        print(f"Errore comando esterno (exit {exc.returncode}).", file=sys.stderr)
        raise SystemExit(exc.returncode or 1)
    except Exception as exc:
        print(f"Errore deploy: {exc}", file=sys.stderr)
        raise SystemExit(1)
