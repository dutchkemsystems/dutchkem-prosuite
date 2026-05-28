#!/usr/bin/env node
/**
 * Post-build script: generates index.html with correct asset references
 * for TanStack Start SPA mode on Vercel
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const clientDir = join(process.cwd(), 'dist', 'client');
const assetsDir = join(clientDir, 'assets');

// Find the CSS file (app-*.css)
const cssFile = readdirSync(assetsDir).find(f => f.startsWith('app-') && f.endsWith('.css'));

// Find the main entry JS file (index-*.js)
const indexJs = readdirSync(assetsDir).find(f => f.startsWith('index-') && f.endsWith('.js'));

// Find the ESM chunk (esm-*.js)
const esmJs = readdirSync(assetsDir).find(f => f.startsWith('esm-') && f.endsWith('.js'));

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Dutchkem Ventures ProSuite NG+ — 15 Expert AI Agents for business, academics, content, finance, and more." />
    <meta name="theme-color" content="#FF6B35" />
    <title>Dutchkem Ventures ProSuite NG+</title>
    ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}" />` : ''}
    ${esmJs ? `<link rel="modulepreload" href="/assets/${esmJs}" />` : ''}
    ${indexJs ? `<link rel="modulepreload" href="/assets/${indexJs}" />` : ''}
  </head>
  <body>
    <div id="root"></div>
    ${indexJs ? `<script type="module" src="/assets/${indexJs}"></script>` : ''}
  </body>
</html>`;

writeFileSync(join(clientDir, 'index.html'), html);
console.log(`Generated index.html with CSS: ${cssFile}, JS: ${indexJs}`);
