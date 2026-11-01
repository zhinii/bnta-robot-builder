import assert from 'node:assert/strict';
const root=process.env.ROBOT_BUILDER_URL||'http://127.0.0.1:4242';
const visited=new Set();
async function visit(pathname) {
  const url=new URL(pathname,root).href;if(visited.has(url))return;visited.add(url);
  const response=await fetch(url);assert.equal(response.status,200,url);const source=await response.text();
  if(/\.(mjs|js)$/.test(url))for(const m of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    const specifier=m[1];if(specifier==='three')await visit('/beginner-3axis/vendor/three/build/three.module.js');else if(specifier.startsWith('.'))await visit(new URL(specifier,url).href);
  }
  if(/\.html$/.test(url))for(const m of source.matchAll(/(?:src|href)="(\.[^"]+\.(?:mjs|js|css))"/g))await visit(new URL(m[1],url).href);
}
await visit('/robot-builder/index.html');await visit('/beginner-3axis/teacher.html');
for(const blocked of ['/robot-builder/serve.mjs','/beginner-3axis/server/serve.py','/.env.local','/../.env.local'])assert.equal((await fetch(root+blocked)).status,404,blocked);
console.log(`Static asset PASS: ${visited.size} builder and guided-lesson assets, with server/config files excluded.`);
