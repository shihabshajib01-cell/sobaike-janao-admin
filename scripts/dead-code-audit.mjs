import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(repoRoot, 'src');
const toRepoPath = (value) => path.relative(repoRoot, value).replaceAll(path.sep, '/');
const normalize = (value) => path.resolve(value);

const configPath = path.join(repoRoot, 'tsconfig.json');
const configRead = ts.readConfigFile(configPath, ts.sys.readFile);
if (configRead.error) {
  console.error(ts.flattenDiagnosticMessageText(configRead.error.messageText, '\n'));
  process.exit(1);
}

const parsed = ts.parseJsonConfigFileContent(
  configRead.config,
  ts.sys,
  repoRoot,
  {
    noEmit: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
  },
  configPath
);

const program = ts.createProgram(parsed.fileNames, parsed.options);
const sourceFiles = program
  .getSourceFiles()
  .filter((file) => normalize(file.fileName).startsWith(normalize(srcRoot) + path.sep))
  .filter((file) => !file.isDeclarationFile);

const sourceSet = new Set(sourceFiles.map((file) => normalize(file.fileName)));
const graph = new Map(sourceFiles.map((file) => [normalize(file.fileName), new Set()]));

const addResolvedModule = (fromFile, specifier) => {
  if (!specifier || (!specifier.startsWith('.') && !specifier.startsWith('@/'))) return;

  const resolved = ts.resolveModuleName(
    specifier,
    fromFile,
    parsed.options,
    ts.sys
  ).resolvedModule;

  if (!resolved) return;
  const resolvedPath = normalize(resolved.resolvedFileName);
  if (sourceSet.has(resolvedPath)) {
    graph.get(normalize(fromFile))?.add(resolvedPath);
  }
};

for (const file of sourceFiles) {
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      addResolvedModule(file.fileName, node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      addResolvedModule(file.fileName, node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  };
  visit(file);
}

const indexHtmlPath = path.join(repoRoot, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const htmlEntrySpecifiers = [
  ...indexHtml.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi),
]
  .map((match) => match[1])
  .filter((specifier) => specifier.startsWith('./src/') || specifier.startsWith('/src/'));

const htmlEntries = htmlEntrySpecifiers
  .map((specifier) =>
    normalize(path.join(repoRoot, specifier.replace(/^\.\//, '').replace(/^\//, '')))
  )
  .filter((entryPath) => sourceSet.has(entryPath));

if (htmlEntries.length === 0) {
  console.error('Dead-code audit could not resolve a local source entry from index.html.');
  process.exit(1);
}

const reachable = new Set();
const stack = [...htmlEntries];
while (stack.length > 0) {
  const current = stack.pop();
  if (!current || reachable.has(current)) continue;
  reachable.add(current);
  for (const next of graph.get(current) || []) {
    if (!reachable.has(next)) stack.push(next);
  }
}

const unreachable = sourceFiles
  .map((file) => normalize(file.fileName))
  .filter((file) => !reachable.has(file))
  .map(toRepoPath)
  .sort();

const UNUSED_CODES = new Set([
  6133, // declared but value never read
  6192, // all imports unused
  6196, // declared but never used
  7027, // unreachable code
]);
const unusedDiagnostics = ts
  .getPreEmitDiagnostics(program)
  .filter((diag) => UNUSED_CODES.has(diag.code))
  .map((diag) => {
    const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
    if (!diag.file || diag.start == null) return { file: '', line: 0, column: 0, code: diag.code, message };
    const pos = diag.file.getLineAndCharacterOfPosition(diag.start);
    return {
      file: toRepoPath(diag.file.fileName),
      line: pos.line + 1,
      column: pos.character + 1,
      code: diag.code,
      message,
    };
  });

const languageServiceHost = {
  getScriptFileNames: () => parsed.fileNames,
  getScriptVersion: () => '0',
  getScriptSnapshot: (fileName) => {
    if (!fs.existsSync(fileName)) return undefined;
    return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, 'utf8'));
  },
  getCurrentDirectory: () => repoRoot,
  getCompilationSettings: () => parsed.options,
  getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
};
const languageService = ts.createLanguageService(
  languageServiceHost,
  ts.createDocumentRegistry()
);

const hasExportModifier = (node) =>
  Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));

const exportedNamedDeclarations = [];
for (const file of sourceFiles) {
  for (const statement of file.statements) {
    if (!hasExportModifier(statement)) continue;

    const addNamedNode = (nameNode, kind) => {
      if (!nameNode || !ts.isIdentifier(nameNode)) return;
      exportedNamedDeclarations.push({ file, nameNode, name: nameNode.text, kind });
    };

    if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      addNamedNode(statement.name, ts.SyntaxKind[statement.kind]);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        addNamedNode(declaration.name, 'VariableDeclaration');
      }
    }
  }
}

const unusedExportCandidates = [];
for (const declaration of exportedNamedDeclarations) {
  const fileName = declaration.file.fileName;
  const references =
    languageService.findReferences(
      fileName,
      declaration.nameNode.getStart(declaration.file)
    ) || [];

  const referenceEntries = references.flatMap((group) => group.references || []);
  const externalReferences = referenceEntries.filter(
    (reference) =>
      !reference.isDefinition && normalize(reference.fileName) !== normalize(fileName)
  );
  const sameFileReferences = referenceEntries.filter(
    (reference) =>
      !reference.isDefinition && normalize(reference.fileName) === normalize(fileName)
  );

  if (externalReferences.length === 0) {
    const pos = declaration.file.getLineAndCharacterOfPosition(
      declaration.nameNode.getStart(declaration.file)
    );
    unusedExportCandidates.push({
      file: toRepoPath(fileName),
      line: pos.line + 1,
      name: declaration.name,
      kind: declaration.kind,
      sameFileReferences: sameFileReferences.length,
    });
  }
}

const walkTextFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walkTextFiles(full) : [full];
  });
};

const candidateTextFiles = walkTextFiles(repoRoot).filter((file) =>
  /\.(?:ts|tsx|js|mjs|css|html|json|md|yml|yaml)$/.test(file)
);
const textByFile = new Map();
for (const file of candidateTextFiles) {
  try {
    textByFile.set(file, fs.readFileSync(file, 'utf8'));
  } catch {
    // Ignore unreadable files; Git-tracked source is UTF-8 in this repository.
  }
}
const allText = [...textByFile.values()].join('\n');

const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const runtimeDependencies = Object.keys(packageJson.dependencies || {});

const importedPackages = new Set();
const packageNameFromSpecifier = (specifier) => {
  if (!specifier || specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('@/')) return null;
  if (specifier.startsWith('node:')) return null;
  if (specifier.startsWith('@')) {
    const [scope, name] = specifier.split('/');
    return name ? scope + '/' + name : specifier;
  }
  return specifier.split('/')[0];
};

const importPattern = /(?:from\s+|import\s*\(|import\s+|require\s*\()\s*['"]([^'"]+)['"]/g;
for (const source of textByFile.values()) {
  let match;
  while ((match = importPattern.exec(source))) {
    const packageName = packageNameFromSpecifier(match[1]);
    if (packageName) importedPackages.add(packageName);
  }
}

const unusedRuntimeDependencies = runtimeDependencies
  .filter((dependency) => !importedPackages.has(dependency))
  .filter((dependency) => !(dependency === 'tailwindcss' && allText.includes('tailwindcss')))
  .sort();

const assetFiles = [
  ...walkTextFiles(path.join(repoRoot, 'public')),
  ...walkTextFiles(path.join(repoRoot, 'src', 'assets')),
].filter((file) => !/README\.md$/i.test(file));

const unreferencedAssets = assetFiles
  .filter((asset) => {
    const rel = toRepoPath(asset);
    const basename = path.basename(asset);
    const relativeFromPublic = rel.startsWith('public/') ? '/' + rel.slice('public/'.length) : null;
    for (const [file, source] of textByFile) {
      if (normalize(file) === normalize(asset)) continue;
      if (source.includes(rel) || source.includes(basename)) return false;
      if (relativeFromPublic && source.includes(relativeFromPublic)) return false;
    }
    return true;
  })
  .map(toRepoPath)
  .sort();

const result = {
  htmlEntries: htmlEntries.map(toRepoPath),
  sourceFiles: sourceFiles.length,
  reachableSourceFiles: reachable.size,
  unreachable,
  unusedDiagnostics,
  unusedExportCandidates,
  unusedRuntimeDependencies,
  unreferencedAssets,
};

console.log(JSON.stringify(result, null, 2));

const failures =
  unreachable.length +
  unusedDiagnostics.length +
  unusedRuntimeDependencies.length +
  unreferencedAssets.length;

if (failures > 0) {
  console.error(
    '\nDead-code audit failed: ' +
      unreachable.length +
      ' unreachable source file(s), ' +
      unusedDiagnostics.length +
      ' unused/unreachable declaration diagnostic(s), ' +
      unusedRuntimeDependencies.length +
      ' unused runtime dependency candidate(s), and ' +
      unreferencedAssets.length +
      ' unreferenced asset candidate(s).'
  );
  process.exit(1);
}

console.log('\nDead-code audit passed: source reachability, unused declarations, runtime dependencies, and assets are clean.');
