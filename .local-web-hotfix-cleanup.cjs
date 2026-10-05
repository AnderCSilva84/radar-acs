const fs=require('fs');let s=fs.readFileSync('api/scheduled-generator.js','utf8').replace('                while (attempts.length < 1) {\n','');
const start=s.indexOf('                    if (claim.attempt >= 2');const end=s.indexOf("                return res.status(503).json({ status: 'FAILED', date, attempts });",start);
s=s.slice(0,start)+s.slice(end);fs.writeFileSync('api/scheduled-generator.js',s);
s=fs.readFileSync('api/generator.js','utf8').replace('{ assertSearchBudget, classifyWebActions }','{ classifyWebActions }');fs.writeFileSync('api/generator.js',s);
