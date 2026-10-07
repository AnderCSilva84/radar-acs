import fs from 'node:fs';
import {gzipSync,brotliCompressSync} from 'node:zlib';
const entry=fs.readFileSync('dist/index.html','utf8').match(/src="(\/assets\/[^\"]+\.js)"/)[1];
const bytes=fs.readFileSync('dist'+entry);
const result={entry,raw:bytes.length,gzip:gzipSync(bytes).length,brotli:brotliCompressSync(bytes).length};
console.log(JSON.stringify(result));
fs.writeFileSync('review/product-round/bundle-after.json',JSON.stringify(result));
