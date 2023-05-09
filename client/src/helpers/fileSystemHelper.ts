import * as fs from 'fs';
import * as path from 'path';

export class FileSystemHelper {

	public static _fileEncoding : BufferEncoding = 'utf8';

	public static rename(path : string, newPath : string): Promise<void> {
		return new Promise((resolve) => {
            fs.access(path, fs.constants.F_OK, (err) => {
                if (err) {
                    return fs.rename(path, newPath, (err) => {
                        resolve();
                    });
                }
                resolve();
            });
        });
	}

	/**
	 * Определяет вхождение имени директории в путь.
	 * @param fullPath путь
	 * @param directoryName имя директории
	 * @returns результат провеки вхождения директории в путь
	 */
	public static isIncludeDirectoryInPath(fullPath : string, directoryName: string) : boolean {
		const pathEntries = fullPath.split(path.sep);
		return pathEntries.includes(directoryName);
	}

	public static readContentFile(filePath:string): Promise<string> {
		return fs.promises.readFile(filePath, FileSystemHelper._fileEncoding);
	}

	public static writeContentFile(filePath: string, fileContent: string) : Promise<void> {
		return fs.promises.writeFile(filePath, fileContent, FileSystemHelper._fileEncoding);
	}

	public static appendContentFile(filePath: string, fileContent: string) : Promise<void> {
		return fs.promises.appendFile(filePath, fileContent, FileSystemHelper._fileEncoding);
	}

	public static readContentFileSync(filePath:string): string {
		
		let file: string;
		try {
			file = fs.readFileSync(filePath, this._fileEncoding);
		}
		catch (error) {
			throw new Error(`Не удалось прочитать файл '${filePath}'`);
		}
		
		return file.toString();
	}

	public static writeContentFileSync(filePath: string, fileContent: string) {
		try {
			fs.writeFileSync(filePath, fileContent, {encoding: this._fileEncoding});
		}
		catch (error) {
			throw new Error(`Не удалось записать в файл '${filePath}'`);
		}
	}

	public static readSubDirectories(filePath: string) {

		const directories = fs.readdirSync(filePath, { withFileTypes: true })
			.filter(entity => entity.isDirectory())
			.map(entity => entity.name);

		return directories;
	}

	/**
	 * Удаляет все поддиректории и файлы.
	 * @param dirPath
	 * @returns 
	 */
	public static async deleteAllSubDirectoriesAndFiles(dirPath: string) {

		const entityDirPaths = fs.readdirSync(dirPath, { withFileTypes: true })
			.filter(entity => entity.isDirectory())
			.map(entity => path.join(dirPath, entity.name));

		for(const entityDirPath of entityDirPaths) {
			await fs.promises.rmdir(entityDirPath, {recursive : true});
		}

		const entityFilePaths = fs.readdirSync(dirPath, { withFileTypes: true })
			.filter(entity => entity.isFile())
			.map(entity => path.join(dirPath, entity.name));

		for(const entityFilePath of entityFilePaths) {
			await fs.promises.unlink(entityFilePath);
		}
	}

	public static readFiles(filePath: string) {

		const files = fs.readdirSync(filePath, { withFileTypes: true })
			.filter(entity => entity.isFile())
			.map(entity => entity.name);

		return files;
	}

	public static readFilesNameFilter(filePath: string, regExp: RegExp) {

		const files = fs.readdirSync(filePath, { withFileTypes: true })
			.filter(entity => entity.isFile())
			.map(entity => entity.name)
			.filter(name => name.match(regExp));

		return files;
	}

	/**
	 * Получает список полных путей файлов из всех вложенных директорий.
	 * @param dirPath путь к начальной директории
	 * @returns список полных путей всех вложенных файлов.
	 */
	public static getRecursiveFilesSync(dirPath : string) : string[] {
		let results : string [] = [];
		const list = fs.readdirSync(dirPath);

		list.forEach(function(file : string) {
			file = path.join(dirPath, file);
			const stat = fs.statSync(file);

			if (stat && stat.isDirectory()) { 
				/* Recurse into a subdirectory */
				const subDirs = FileSystemHelper.getRecursiveFilesSync(file);
				results = results.concat(subDirs);
			} else { 
				/* Is a file */
				results.push(file);
			}
		});

		return results;
	}

	/**
	 * Получает список полных путей к директориям из всех вложенных директорий.
	 * @param dirPath путь к директории
	 * @returns список полных путей вложенных директорий.
	 */
	public static getRecursiveDirPathSync(dirPath : string) : string[] {
		const results : string [] = [];
		const list = fs.readdirSync(dirPath);

		list.forEach(function(file : string) {
			file = path.join(dirPath, file);
			const stat = fs.statSync(file);

			if (stat && stat.isDirectory()) { 
				results.push(file);
			}
		});

		return results;
	}
}
