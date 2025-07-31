// generate-docs.ts
// Node.js script using ts-morph + OpenAI to parse Next.js app pages and generate markdown docs

import path from 'path';
import fs from 'fs/promises';
import { Project, SyntaxKind } from 'ts-morph';
import crypto from 'crypto';
import { OpenAI } from 'openai';

const APP_DIR = path.resolve('app');
const DOCS_DIR = path.resolve('docs');
const META_DIR = path.resolve('metadata');
const COMPONENT_BLACKLIST = ['utils', 'lib', 'hooks', 'constants', 'config'];

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function containsJSX(sourceFile) {
  return sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
         sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0;
}

async function collectComponentInfo(sourceFile, collected = new Map()) {
  const imports = sourceFile.getImportDeclarations();

  for (const imp of imports) {
    const filePath = imp.getModuleSpecifierSourceFile();
    if (!filePath || collected.has(filePath.getFilePath())) continue;

    const fileName = filePath.getBaseName();
    const fileRelPath = path.relative(process.cwd(), filePath.getFilePath());
    const dirCheck = COMPONENT_BLACKLIST.some(dir => fileRelPath.includes(`/${dir}/`));

    if (dirCheck || !containsJSX(filePath)) continue;

    const code = filePath.getFullText();
    const codeHash = hash(code);

    collected.set(filePath.getFilePath(), {
      name: fileName.replace(/\.(tsx|ts|js|jsx)$/, ''),
      path: fileRelPath,
      summary: '',
      props: [],
      usage: '',
      hash: codeHash,
      code,
    });

    await collectComponentInfo(filePath, collected);
  }

  return collected;
}

async function generateMarkdownFromAI(payload) {
  const systemPrompt = `You are a documentation generator. Given a page source code and its component summaries, generate a clean markdown documentation with sections: Summary, Components Used, and Usage Guide.`;

  const userPrompt = `Page Path: ${payload.page}\n\nPage Code:\n\n${payload.pageCode}\n\nComponent Metadata:\n\n${JSON.stringify(payload.components, null, 2)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.4
  });

  return response.choices[0].message.content;
}

async function generateDocs() {
  const project = new Project({ tsConfigFilePath: 'tsconfig.json' });
  const pageDirs = await fs.readdir(APP_DIR);

  for (const page of pageDirs) {
    const pagePath = path.join(APP_DIR, page);
    const stat = await fs.stat(pagePath);
    if (!stat.isDirectory()) continue;

    const filePath = path.join(pagePath, 'page.tsx');
    try {
      await fs.access(filePath);
    } catch {
      continue;
    }

    const sourceFile = project.addSourceFileAtPath(filePath);
    const code = sourceFile.getFullText();
    const componentMap = await collectComponentInfo(sourceFile);

    const componentSummaries = Array.from(componentMap.values()).map(c => ({
      name: c.name,
      path: c.path,
      summary: c.summary,
      props: c.props,
      usage: c.usage,
    }));

    const promptData = {
      page: path.relative(process.cwd(), filePath),
      pageCode: code,
      components: componentSummaries,
    };

    for (const comp of componentMap.values()) {
      const metaPath = path.join(META_DIR, `${comp.name}.json`);
      await fs.writeFile(metaPath, JSON.stringify(comp, null, 2));
    }

    const markdown = await generateMarkdownFromAI(promptData);
    const outputMdPath = path.join(DOCS_DIR, `${page}.md`);
    await fs.writeFile(outputMdPath, markdown);

    console.log(`Generated documentation for: ${page}`);
  }
}

generateDocs().catch(console.error);