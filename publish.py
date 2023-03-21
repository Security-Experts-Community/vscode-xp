#!/usr/bin/env python3

import json
import re
import sys
import subprocess
from pathlib import Path
from typing import List


ROOT = Path(__file__).parent
package_json = ROOT / "package.json"
build_dir = ROOT / "build"


def verbose_create_dir(path: Path) -> None:
    if not path.exists():
        print("Creating directory..")
        path.mkdir()


def get_version(content: str) -> str:
    return json.loads(content).get("version")


def set_child_package_version(version: str, dirs: List[str]):
    for dir in dirs:
        child_package = ROOT / dir / "package.json"
        package = json.loads(child_package.read_text(encoding="utf-8"))
        package["version"] = version
        child_package.write_text(json.dumps(package, indent=4), encoding="utf-8")


def run_command(command: str) -> None:
    if sys.platform.startswith("win32"):
        subprocess.call(f"cmd.exe /c {command}")
    else:
        subprocess.call(command, shell=True)


def run():
    # Собираем расширение с исходной версией
    verbose_create_dir(build_dir)
    data = package_json.read_text(encoding="utf-8")
    version = get_version(data)
    set_child_package_version(version, ["client", "server"])

    vsix_name = f"vscode-xp-{version}.vsix"
    run_command(f"vsce package -o {build_dir / vsix_name}")


if __name__ == "__main__":
    run()
