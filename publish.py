#!/usr/bin/env python3

import json
import re
import sys
import subprocess
from pathlib import Path


package_json = Path("./package.json")
build_dir = Path("./build")


def verbose_create_dir(path: Path) -> None:
    if not path.exists():
        print("Creating directory..")
        path.mkdir()


def increment_version(version: str) -> str:
    _version = version.split(".")
    _version[2] = str(int(_version[2]) + 1)
    return ".".join(_version)


def change_version(content: str) -> str:
    return re.sub(
        r'"version":\s+"\S+",',
        f'"version": "{increment_version(get_version(content))}",',
        content,
    )


def get_version(content: str) -> str:
    return json.loads(content).get("version")


def run_command(command: str) -> None:
    if sys.platform.startswith("win32"):
        subprocess.call(f"cmd.exe /c {command}")
    else:
        subprocess.call(command, shell=True)


def run():
    # Собираем расширение с исходной версией
    verbose_create_dir(build_dir)
    data = package_json.read_text(encoding="utf-8")
    prev_version = get_version(data)
    prev_version_str = f"vscode-xp-{prev_version}.vsix"
    run_command(f"vsce package -o {build_dir / prev_version_str}")


if __name__ == "__main__":
    run()
