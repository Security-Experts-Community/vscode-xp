import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { Configuration } from '../configuration';
import { Log } from '../../extension';
import { SiemjExecutionResult } from './siemJOutputParser';

export enum BuildArtifactType {
  Normalizations = 'normalizations',
  Aggregations = 'aggregations',
  TablesSchema = 'tablesSchema',
  TablesDb = 'tablesDb',
  Enrichments = 'enrichments',
  Correlations = 'correlations'
}

interface CacheEntry {
  // Отпечаток исходных файлов, из которых собран артефакт.
  inputs: string;
  // Отпечаток собранного артефакта. Позволяет заметить, что артефакт перезаписали вне кеша.
  artifact: string;
}

interface CacheManifest {
  version: number;
  entries: { [type: string]: CacheEntry };
}

/**
 * Снимок исходных файлов контента, сгруппированных по типам.
 * Каждая строка имеет вид `путь|размер|mtime`.
 */
export class ContentSnapshot {
  public normalizations: string[] = [];
  public aggregations: string[] = [];
  public enrichments: string[] = [];
  // Ключ — директория правила, значение — строки файлов правила.
  public correlations = new Map<string, string[]>();
  public tables: string[] = [];
  public macros: string[] = [];
}

/**
 * Кеш собранных графов и табличных списков для запуска интеграционных тестов.
 * Компонент пересобирается, только если изменились файлы контента, от которых он зависит,
 * либо собранный артефакт отсутствует или был изменен другой командой.
 */
export class BuildArtifactsCache {
  public static readonly MANIFEST_FILE_NAME = 'xp_build_cache.json';
  private static readonly MANIFEST_VERSION = 1;

  private static readonly RULE_MARKERS: { [fileName: string]: keyof ContentSnapshot } = {
    'formula.xp': 'normalizations',
    'rule.agr': 'aggregations',
    'rule.en': 'enrichments',
    'rule.co': 'correlations'
  };

  private static readonly SKIPPED_DIRS = new Set(['node_modules']);

  private manifest: CacheManifest;
  private inputs = new Map<BuildArtifactType, string>();
  private staleTypes = new Set<BuildArtifactType>();

  private constructor(
    private config: Configuration,
    private contentRootPath: string,
    private enabled: boolean
  ) {}

  public static isEnabled(config: Configuration): boolean {
    return config.getWorkspaceConfiguration().get<boolean>('integrationTests.buildCache') ?? true;
  }

  /**
   * Вычисляет, какие компоненты нужно пересобрать.
   * @param correlationsSrc пути, из которых собирается граф корреляций, или undefined,
   * если граф корреляций не собирается.
   */
  public static async create(
    config: Configuration,
    contentRootPath: string,
    correlationsSrc?: string[]
  ): Promise<BuildArtifactsCache> {
    const cache = new BuildArtifactsCache(
      config,
      contentRootPath,
      BuildArtifactsCache.isEnabled(config)
    );
    await cache.init(correlationsSrc);
    return cache;
  }

  public needsBuild(type: BuildArtifactType): boolean {
    return this.staleTypes.has(type);
  }

  public hasArtifactsToBuild(): boolean {
    return this.staleTypes.size > 0;
  }

  /**
   * Удаляет устаревшие артефакты перед сборкой, чтобы после запуска siemj по наличию файла
   * можно было понять, что компонент собрался.
   */
  public async removeStaleArtifacts(): Promise<void> {
    for (const type of this.staleTypes) {
      for (const artifactPath of this.getArtifactPaths(type)) {
        await fs.promises.rm(artifactPath, { recursive: true, force: true });
      }
      delete this.manifest.entries[type];
    }

    await this.saveManifest();
  }

  /**
   * Запоминает собранные компоненты. Компоненты не запоминаются при ошибках сборки,
   * чтобы при следующем запуске ошибки снова попали в диагностику.
   */
  public async commit(result: SiemjExecutionResult): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const hasBuildErrors = result.fileDiagnostics.some((fd) =>
      fd.diagnostics.some((d) => d.severity === vscode.DiagnosticSeverity.Error)
    );
    if (hasBuildErrors) {
      Log.info('Build cache was not updated because of build errors');
      return;
    }

    for (const type of this.staleTypes) {
      const artifact = await this.getArtifactFingerprint(type);
      if (!artifact) {
        continue;
      }

      this.manifest.entries[type] = { inputs: this.inputs.get(type), artifact };
    }

    await this.saveManifest();
  }

  private async init(correlationsSrc?: string[]): Promise<void> {
    this.manifest = await this.loadManifest();

    const snapshot = await BuildArtifactsCache.takeSnapshot(this.contentRootPath);
    this.computeInputs(snapshot, correlationsSrc);

    for (const [type, inputs] of this.inputs) {
      if (!this.enabled) {
        this.staleTypes.add(type);
        continue;
      }

      const entry = this.manifest.entries[type];
      if (!entry || entry.inputs !== inputs) {
        this.staleTypes.add(type);
        continue;
      }

      const artifact = await this.getArtifactFingerprint(type);
      if (artifact !== entry.artifact) {
        Log.info(`Build cache: artifact '${type}' was changed outside of the cache`);
        this.staleTypes.add(type);
      }
    }

    const upToDate = [...this.inputs.keys()].filter((t) => !this.staleTypes.has(t));
    Log.info(
      `Build cache: up-to-date [${upToDate.join(', ')}], to build [${[...this.staleTypes].join(', ')}]`
    );
  }

  private computeInputs(snapshot: ContentSnapshot, correlationsSrc?: string[]): void {
    const common = [
      `root|${this.contentRootPath}`,
      `kbt|${this.config.getKbtVersion()}`,
      `mode|${this.config.getToolExecutionMode()}`,
      BuildArtifactsCache.statLine(this.config.getTaxonomyFullPath())
    ];

    const normalizations = [
      ...common,
      BuildArtifactsCache.statLine(this.config.getAppendixFullPath()),
      ...snapshot.normalizations
    ];
    this.inputs.set(BuildArtifactType.Normalizations, BuildArtifactsCache.hash(normalizations));

    const aggregations = [...common, ...snapshot.aggregations];
    this.inputs.set(BuildArtifactType.Aggregations, BuildArtifactsCache.hash(aggregations));

    const tablesSchemaHash = BuildArtifactsCache.hash([
      ...common,
      BuildArtifactsCache.statLine(this.config.getTablesContract()),
      ...snapshot.tables
    ]);
    this.inputs.set(BuildArtifactType.TablesSchema, tablesSchemaHash);
    this.inputs.set(BuildArtifactType.TablesDb, BuildArtifactsCache.hash([tablesSchemaHash]));

    const rulesFiltersPath = this.config.getRulesDirFiltersByContentRoot(this.contentRootPath);
    const macros = [
      ...snapshot.macros,
      ...BuildArtifactsCache.statFilesRecursive(rulesFiltersPath)
    ];

    const enrichments = [...common, tablesSchemaHash, ...macros, ...snapshot.enrichments];
    this.inputs.set(BuildArtifactType.Enrichments, BuildArtifactsCache.hash(enrichments));

    if (correlationsSrc) {
      const srcPaths = correlationsSrc.map((p) => path.resolve(p)).sort();
      const correlations = [
        ...common,
        tablesSchemaHash,
        ...macros,
        ...srcPaths.map((p) => `src|${p}`)
      ];
      for (const [ruleDirPath, lines] of snapshot.correlations) {
        if (srcPaths.some((src) => BuildArtifactsCache.isSubPath(ruleDirPath, src))) {
          correlations.push(...lines);
        }
      }
      this.inputs.set(BuildArtifactType.Correlations, BuildArtifactsCache.hash(correlations));
    }
  }

  /**
   * Обходит дерево контента и собирает файлы правил каждого типа.
   * У правила учитываются файлы из его директории без поддиректорий (tests, i18n),
   * поэтому правка тестов и локализаций не приводит к пересборке графов.
   */
  public static async takeSnapshot(contentRootPath: string): Promise<ContentSnapshot> {
    const snapshot = new ContentSnapshot();

    const statLines = (dirPath: string, fileNames: string[]): Promise<string[]> =>
      Promise.all(fileNames.map((fn) => this.statLineAsync(path.join(dirPath, fn))));

    const walk = async (dirPath: string): Promise<string[]> => {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const fileNames = entries.filter((e) => e.isFile()).map((e) => e.name);
      const ruleMarker = fileNames.find((fn) => BuildArtifactsCache.RULE_MARKERS[fn]);
      if (ruleMarker) {
        const lines = await statLines(dirPath, fileNames);
        const ruleType = BuildArtifactsCache.RULE_MARKERS[ruleMarker];
        if (ruleType === 'correlations') {
          snapshot.correlations.set(path.resolve(dirPath), lines.sort());
        } else {
          (snapshot[ruleType] as string[]).push(...lines);
        }
        return [];
      }

      snapshot.tables.push(
        ...(await statLines(
          dirPath,
          fileNames.filter((fn) => fn.endsWith('.tl'))
        ))
      );
      snapshot.macros.push(
        ...(await statLines(
          dirPath,
          fileNames.filter((fn) => fn.endsWith('.flt'))
        ))
      );
      snapshot.normalizations.push(
        ...(await statLines(
          dirPath,
          fileNames.filter((fn) => fn.endsWith('.xp'))
        ))
      );

      return entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .filter((e) => !BuildArtifactsCache.SKIPPED_DIRS.has(e.name))
        .map((e) => path.join(dirPath, e.name));
    };

    // Обход параллельный, поэтому для стабильного отпечатка результаты сортируются.
    const walkRecursive = async (dirPath: string): Promise<void> => {
      const subDirs = await walk(dirPath);
      await Promise.all(subDirs.map(walkRecursive));
    };
    await walkRecursive(contentRootPath);

    snapshot.normalizations.sort();
    snapshot.aggregations.sort();
    snapshot.enrichments.sort();
    snapshot.tables.sort();
    snapshot.macros.sort();
    snapshot.correlations = new Map(
      [...snapshot.correlations].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    );
    return snapshot;
  }

  private getArtifactPaths(type: BuildArtifactType): string[] {
    const rootFolder = path.basename(this.contentRootPath);
    switch (type) {
      case BuildArtifactType.Normalizations:
        return [this.config.getNormalizationsGraphFilePath(rootFolder)];
      case BuildArtifactType.Aggregations:
        return [this.config.getAggregationsGraphFilePath(rootFolder)];
      case BuildArtifactType.TablesSchema:
        return [
          this.config.getSchemaFullPath(rootFolder),
          this.config.getCorrelationDefaultsFilePath(rootFolder)
        ];
      case BuildArtifactType.TablesDb:
        return [this.config.getFptaDbFilePath(rootFolder)];
      case BuildArtifactType.Enrichments:
        return [this.config.getEnrichmentsGraphFilePath(rootFolder)];
      case BuildArtifactType.Correlations:
        return [this.config.getCorrelationsGraphFilePath(rootFolder)];
    }
  }

  /**
   * Отпечаток артефакта или undefined, если хотя бы одного файла артефакта нет.
   */
  private async getArtifactFingerprint(type: BuildArtifactType): Promise<string | undefined> {
    const lines: string[] = [];
    for (const artifactPath of this.getArtifactPaths(type)) {
      if (!fs.existsSync(artifactPath)) {
        return undefined;
      }
      // БД табличных списков в новых версиях siemj является директорией.
      lines.push(...BuildArtifactsCache.statFilesRecursive(artifactPath));
    }

    return BuildArtifactsCache.hash(lines);
  }

  private getManifestPath(): string {
    const rootFolder = path.basename(this.contentRootPath);
    return path.join(
      this.config.getOutputDirectoryPath(rootFolder),
      BuildArtifactsCache.MANIFEST_FILE_NAME
    );
  }

  private async loadManifest(): Promise<CacheManifest> {
    const emptyManifest = { version: BuildArtifactsCache.MANIFEST_VERSION, entries: {} };
    try {
      const content = await fs.promises.readFile(this.getManifestPath(), 'utf8');
      const manifest = JSON.parse(content) as CacheManifest;
      if (manifest.version !== BuildArtifactsCache.MANIFEST_VERSION || !manifest.entries) {
        return emptyManifest;
      }
      return manifest;
    } catch {
      return emptyManifest;
    }
  }

  private async saveManifest(): Promise<void> {
    const manifestPath = this.getManifestPath();
    await fs.promises.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.promises.writeFile(manifestPath, JSON.stringify(this.manifest, null, 2));
  }

  private static async statLineAsync(filePath: string): Promise<string> {
    try {
      const stat = await fs.promises.stat(filePath);
      return `${filePath}|${stat.size}|${stat.mtimeMs}`;
    } catch {
      return `${filePath}|missing`;
    }
  }

  private static statLine(filePath: string): string {
    try {
      const stat = fs.statSync(filePath);
      return `${filePath}|${stat.size}|${stat.mtimeMs}`;
    } catch {
      return `${filePath}|missing`;
    }
  }

  private static statFilesRecursive(fileOrDirPath: string): string[] {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(fileOrDirPath);
    } catch {
      return [`${fileOrDirPath}|missing`];
    }

    if (!stat.isDirectory()) {
      return [`${fileOrDirPath}|${stat.size}|${stat.mtimeMs}`];
    }

    return fs
      .readdirSync(fileOrDirPath)
      .sort()
      .flatMap((name) => this.statFilesRecursive(path.join(fileOrDirPath, name)));
  }

  private static isSubPath(childPath: string, parentPath: string): boolean {
    const relative = path.relative(parentPath, childPath);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  }

  private static hash(lines: string[]): string {
    return crypto.createHash('sha1').update(lines.join('\n')).digest('hex');
  }
}
