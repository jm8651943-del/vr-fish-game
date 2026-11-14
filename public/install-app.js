(()=>{
 const button=document.getElementById('installApp');
 const guide=document.getElementById('installGuide');
 const steps=document.getElementById('installSteps');
 const close=document.getElementById('closeInstallGuide');
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 let prompt=null;
 const refresh=()=>{button.hidden=standalone()};
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;refresh()});
 window.addEventListener('appinstalled',()=>{prompt=null;guide.hidden=true;refresh()});
 button.addEventListener('click',async()=>{
  if(standalone())return;
  if(prompt){const p=prompt;prompt=null;try{await p.prompt();await p.userChoice}catch(e){}return}
  if(ios)steps.textContent='Open the game in Safari. Tap Share, choose Add to Home Screen, turn on Open as Web App, then tap Add.';
  else if(/Android/i.test(navigator.userAgent))steps.textContent='Open the game in Chrome. Tap the three-dot menu, choose Add to Home screen, then Install app.';
  else steps.textContent='Open your browser menu and choose Install app or Add to Home Screen.';
  guide.hidden=false;
 });
 close.addEventListener('click',()=>{guide.hidden=true});
 guide.addEventListener('click',e=>{if(e.target===guide)guide.hidden=true});
 window.addEventListener('keydown',e=>{if(e.key==='Escape')guide.hidden=true});
 if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{}));
 refresh();
})();