import json
import os
import re
import subprocess


JSON_PATH = ".\package.json"
BUILD_PATH = ".\Build"


def read_packages(path:str) -> str:
    with open(path, encoding='utf-8') as f:
        return f.read()

def write_packages(path:str, data:str) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(data)

def create_dirs(path:str) -> None:
    if not os.path.exists(path):
        print('Creating directory..')
        os.mkdir(path)

def increment_version(version:str) -> str:
    _version = version.split('.')
    _version[2] = str(int(_version[2]) + 1)
    return ".".join(_version)

def change_version(content:str) -> None:
    return re.sub('"version":\s+"\S+",',f'"version": "{increment_version(get_version(content))}",',content)

def get_version(content:str) -> str:
    return json.loads(content).get('version')

def run_build(command:str) -> None:
    subprocess.call("cmd.exe /c " + command)

def run_tests(command:str) -> None:
    subprocess.call("cmd.exe /c " + command)
    
def run():
    # Собираем расширение с исходной версией
    create_dirs(BUILD_PATH)
    data = read_packages(JSON_PATH)
    prev_version = get_version(data)
    run_build(f"vsce package -o {BUILD_PATH}\\xpContentEditor-{prev_version}.vsix")

    # Увеличиваем версию фикса на единицу
    data = read_packages(JSON_PATH)
    write_packages(JSON_PATH, change_version(data))

if __name__ == "__main__":
    run()
