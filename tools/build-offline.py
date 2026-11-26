#!/usr/bin/env python3
"""Genera un archivio riproducibile delle risorse statiche di CODE SPACE."""

import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parents[1]
RELEASE = json.loads((ROOT / "release-manifest.json").read_text(encoding="utf-8"))
NAME = f"code-space-python-edition-{RELEASE['version']}"
EXTRA = (
    ".nojekyll", "sw.js", "release-manifest.json", "LICENSE",
    "vendor/skulpt/LICENSE", "vendor/skulpt/README.md",
    "docs/OFFLINE_QUICKSTART.md",
    "vendor/classroom/LICENSE-FIREBASE", "vendor/classroom/LICENSE-QRCODE", "vendor/classroom/README.md",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="Percorso del file ZIP")
    output = parser.parse_args().output
    temporary = output.with_suffix(output.suffix + ".tmp")
    with ZipFile(temporary, "w", compression=ZIP_DEFLATED) as archive:
        for name in sorted(set(RELEASE["runtime"]) | set(EXTRA)):
            path = (ROOT / name).resolve()
            if not path.is_relative_to(ROOT) or not path.is_file():
                raise ValueError(f"Percorso di rilascio non valido: {name}")
            entry = ZipInfo(f"{NAME}/{name}", (2026, 11, 26, 0, 0, 0))
            entry.compress_type = ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, path.read_bytes())
    temporary.replace(output)
    with ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise ValueError("Verifica CRC fallita")
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    size = sum((ROOT / file).stat().st_size for file in RELEASE["runtime"])
    print(f"{output.name}: {output.stat().st_size} byte, SHA-256 {digest}")
    print(f"Cache completa: {len(RELEASE['runtime'])} file, {size} byte prima della compressione HTTP")


if __name__ == "__main__":
    main()
