import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
async function run(args,env=process.env) {
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{cwd,env,stdio:'inherit',windowsHide:true});
    child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`Check failed (${code}): ${args.join(' ')}`)));
  });
}
let server;
try {
  await run(['--test','robot-builder/tests/model.test.mjs','beginner-3axis/tests/teacher.test.mjs']);
  await run(['robot-builder/tests/dom.mjs']);
  await run(['robot-builder/tests/dom.mjs','--legacy-workspace']);
  server=spawn(process.execPath,['robot-builder/serve.mjs'],{cwd,env:{...process.env,ROBOT_BUILDER_PORT:'0'},stdio:['ignore','pipe','inherit'],windowsHide:true});
  const url=await new Promise((resolve,reject)=>{
    let output='';const timeout=setTimeout(()=>reject(Error('Asset-check server timed out')),10000);
    server.once('error',error=>{clearTimeout(timeout);reject(error);});
    server.once('exit',code=>{clearTimeout(timeout);reject(Error(`Asset-check server exited (${code})`));});
    server.stdout.on('data',chunk=>{output+=chunk.toString();const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]);}});
  });
  await run(['robot-builder/tests/assets.mjs'],{...process.env,ROBOT_BUILDER_URL:url});
} catch(error) {console.error(error.message);process.exitCode=1;}
finally {if(server&&!server.killed)server.kill();}
