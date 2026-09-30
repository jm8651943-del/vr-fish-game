const http=require('http'),fs=require('fs'),path=require('path');
const port=process.env.PORT||3000,pub=path.join(__dirname,'public');
http.createServer((req,res)=>{
 if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({status:'healthy',app:'vr-fish-game',webxr:true}));}
 const pathname=(req.url==='/'?'/index.html':req.url.split('?')[0]);
 const f=path.join(pub,path.normalize(pathname).replace(/^(\.\.[\/\\])+/, ''));
 if(!f.startsWith(pub)){res.writeHead(403);return res.end();}
 fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end('Not found');}
 const ext=path.extname(f),types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json'};
 res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-cache'});res.end(d);});
}).listen(port,'0.0.0.0',()=>console.log('VR Fish Game listening on '+port));