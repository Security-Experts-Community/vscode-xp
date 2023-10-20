import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { Log } from '../extension';
import { IntegrationTest } from '../models/tests/integrationTest';
import { MetaInfo } from '../models/metaInfo/metaInfo';

export class FileSystemHelper {

	/**
	 * Проверяем корректность пути для использования в KBT, без кириллици и пробелов.
	 * @param path путь к файлу или директории
	 * @returns 
	 */
	public static isValidPath(path : string): boolean {
		const regExp = /^[A-z0-9./!$%&;:{}=\-_`~()]+$/g;
		return regExp.test(path);
	}

	public static checkIfFilesIsExisting(startPath: string, fileNameRegexPattern: RegExp) : boolean {
		const getFileList = (dirName : string) : string[] => {
			let files = [];
			const items = fs.readdirSync(dirName, { withFileTypes: true });

			for (const item of items) {
				if (item.isDirectory()) {
					const newPath = path.join(dirName, item.name);
					files = [
						...files,
						...(getFileList(newPath)),
					];
				} else {
					if (fileNameRegexPattern.exec(item.name) != undefined) {
						const newPath = path.join(dirName, item.name);
						files.push(newPath);
					}
				}
			}

			return files;
		};

		const files = getFileList(startPath);
		return files.length > 0;
	}

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

	/**
	 * По пути к файлу из правила или табличного списка возвращает путь к директории правила.
	 * @param ruleFilePath путь к файлу из директории правила
	 * @returns 
	 */
	public static ruleFilePathToDirectory(ruleFilePath: string) : string {
		// Код правила или табличного списка.
		if(ruleFilePath.endsWith(".co") || ruleFilePath.endsWith(".en")	|| ruleFilePath.endsWith(".xp") || ruleFilePath.endsWith(".tl")) {
			const ruleDirectoryPath = path.dirname(ruleFilePath);
			return ruleDirectoryPath;
		}

		// Метаданные.
		const fileName = path.basename(ruleFilePath);
		if(fileName === MetaInfo.METAINFO_FILENAME) {
			const ruleDirectoryPath = path.dirname(ruleFilePath);
			return ruleDirectoryPath;
		}

		// Тесты или локализации
		const parentDirectoryPath = path.dirname(ruleFilePath);
		const parentDirectoryName = path.basename(parentDirectoryPath);
		if(parentDirectoryName === "tests" || parentDirectoryName === "i18n") {
			const ruleDirectoryPath = path.dirname(parentDirectoryPath);
			return ruleDirectoryPath;
		}
		
		return null;
	}

	public static readContentFile(filePath:string): Promise<string> {
		return fs.promises.readFile(filePath, FileSystemHelper._fileEncoding);
	}

	public static writeContentFile(filePath: string, fileContent: string) : Promise<void> {
		return fs.promises.writeFile(filePath, fileContent, FileSystemHelper._fileEncoding);
	}

	public static async writeContentFileIfChanged(filePath: string, newContent: string) : Promise<void> {
		// Считаем код записываемых данных.
		const newSha1Sum = crypto.createHash('sha1');
		const newContentHash = newSha1Sum.update(newContent).digest('hex');
		
		// Считаем код уже записанных в файл данных.
		if(fs.existsSync(filePath)) {
			const currSha1Sum = crypto.createHash('sha1');
			const currContent = await fs.promises.readFile(filePath, FileSystemHelper._fileEncoding);
			const currContentHash = currSha1Sum.update(currContent).digest('hex');
	
			// Хеши равны, ничего записывать не надо.
			if(newContentHash === currContentHash) {
				return;
			}
		}

		return fs.promises.writeFile(filePath, newContent, FileSystemHelper._fileEncoding);
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

	public static readSubDirectoryNames(filePath: string) {

		const directories = fs.readdirSync(filePath, { withFileTypes: true })
			.filter(entity => entity.isDirectory())
			.map(entity => entity.name);

		return directories;
	}

	public static readDirectoryPathByName(filePath: string, dirNames: string []) {

		const directories = fs.readdirSync(filePath, { withFileTypes: true })
			.filter(entity => entity.isDirectory())
			.filter((e) => {
				return dirNames.includes(e.name.toLocaleLowerCase());
			})
			.map(entity => entity.name);

		return directories;
	}

	public static getRecursiveDirPathByName(dirPath : string, dirNames: string []) : string[] {
		const results : string [] = [];
		const list = fs.readdirSync(dirPath);

		list.forEach(function(file : string) {
			file = path.join(dirPath, file);
			const stat = fs.statSync(file);

			if (stat && stat.isDirectory()) { 
				const dirName = path.basename(file);
				if(dirNames.includes(dirName.toLocaleLowerCase())) {
					results.push(file);
				}

				const nestedResult = FileSystemHelper.getRecursiveDirPathByName(file, dirNames);
				if(nestedResult.length != 0) {
					results.push(...nestedResult);
				}
			}
		});

		return results;
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

		const entityFilePaths = (await fs.promises.readdir(dirPath, { withFileTypes: true }))
			.filter(entity => entity.isFile())
			.map(entity => path.join(dirPath, entity.name));

		for(const entityFilePath of entityFilePaths) {
			await fs.promises.unlink(entityFilePath);
		}
	}

	public static async recursivelyDeleteDirectory(dirPath: string) {
		try {
			if(fs.existsSync(dirPath)) {
				await fs.promises.rmdir(dirPath, {recursive: true});
			}
		}
		catch(error) {
			Log.warn(`Не удалось удалить директорию временных файлов интеграционных тестов ${dirPath}`);
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

	public static _fileEncoding : BufferEncoding = 'utf8';
}
