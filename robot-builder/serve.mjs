import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.ROBOT_BUILDER_PORT||4242);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const lessonModules=new Set(['model.mjs','controller.mjs','planner.mjs','geometry.mjs','program.mjs','curriculum.mjs','i18n.mjs','classroom.mjs','robot-type-scene.mjs','robot-type-motion.mjs','delta-model.mjs']);
const server=http.createServer(async(req,res)=>{
  try{
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/')pathname='/robot-builder/';if(pathname.endsWith('/'))pathname+='index.html';
    // Serve only this tool and the existing lesson's static assets, never server/config files.
    const allowed=pathname.startsWith('/robot-builder/')||pathname.startsWith('/beginner-3axis/vendor/three/')||/^\/beginner-3axis\/teacher[^/]*\.(html|css|mjs)$/.test(pathname)||(pathname.startsWith('/beginner-3axis/')&&lessonModules.has(pathname.slice('/beginner-3axis/'.length)))||pathname==='/six-axis-agent/kinematics.mjs';
    const file=path.resolve(root,'.'+pathname),relative=path.relative(root,file),ext=path.extname(file);
    if(!allowed||relative.startsWith('..')||path.isAbsolute(relative)||!types[ext]||pathname.endsWith('/serve.mjs')){res.writeHead(404);res.end('Not found');return;}
    const content=await readFile(file);res.writeHead(200,{'Content-Type':types[ext],'Cache-Control':'no-store'});res.end(content);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Robot Builder: http://127.0.0.1:${server.address().port}/robot-builder/`));
