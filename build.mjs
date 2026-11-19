import { cp, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

// 构建只复制最终静态资源，同时检查全部商品的本地图，避免离线演示出现缺图。
const context = { window:{} };
vm.runInNewContext(await readFile('catalog.js', 'utf8'), context);
const catalog = context.window.CATALOG;
if (!Array.isArray(catalog) || !catalog.length) throw new Error('Product catalogue is empty');
for (const product of catalog) {
  if (!product.id || !product.name || !product.images?.length) throw new Error('Incomplete product');
  for (const image of product.images) await stat(image);
}
for (const image of Object.values(context.window.SITE_ASSETS || {})) if (typeof image === 'string') await stat(image);
await mkdir('dist', { recursive:true });
for (const file of ['index.html','styles.css','app.js','catalog.js','favicon.svg','assets']) await cp(file, path.join('dist',file), { recursive:true });
console.log(`Built dist/ with ${catalog.length} products and local images. No external runtime dependencies.`);
