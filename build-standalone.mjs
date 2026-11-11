import fs from 'node:fs/promises';
import{fileURLToPath}from'node:url';
import path from'node:path';
const root=path.dirname(fileURLToPath(import.meta.url)),read=name=>fs.readFile(path.join(root,name),'utf8');
const[index,css,bulkCss,...sources]=await Promise.all(['dist/index.html','dist/style.css','dist/bulk-edit.css','dist/photo-tools.js','dist/text-studio.js','dist/app.js','dist/export.js'].map(read));
let html=index.replace(/<link rel="stylesheet" href="style\.css(?:\?[^" ]*)?">/,()=>'<style>'+css+'</style>').replace(/<link rel="stylesheet" href="bulk-edit\.css(?:\?[^" ]*)?">/,()=>'<style>'+bulkCss+'</style>');
for(const[name,code]of ['photo-tools','text-studio','app','export'].map((name,i)=>[name,sources[i]])){
  const pattern=new RegExp('<script src="'+name+'\\.js(?:\\?[^" ]*)?"><\\/script>');
  html=html.replace(pattern,()=>'<script>'+code+'</script>');
}
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
if(scripts.length!==sources.length||scripts.some((script,i)=>script!==sources[i]))throw Error('Standalone scripts do not match the application source.');
await fs.writeFile(path.join(root,'문지 스튜디오.html'),html);
console.log('Standalone HTML updated; all embedded source files match exactly.');
