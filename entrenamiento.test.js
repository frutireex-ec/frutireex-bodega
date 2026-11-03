// Entrenamiento del intérprete: miles de órdenes generadas (verbos, cantidades, productos, destinos, relleno). node tests/entrenamiento.test.js [semilla] [cantidad]
// Debe dar 99 % o más (lo que falla son nombres de productos de limpieza muy raros).
// Entrenamiento masivo del intérprete: miles de órdenes habladas con las formas de la gente (sin tildes, con relleno, números en palabras o cifras…)
const path=require("path"); const V=require(path.join(__dirname,"../src/parser.js")), C=require(path.join(__dirname,"../src/catalog.js"));
let seed=Number(process.argv[2]||11); const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; const pick=a=>a[Math.floor(rnd()*a.length)];
const N=Number(process.argv[3]||12000);
const NUM={1:["un","una","uno","1"],2:["dos","2"],3:["tres","3"],4:["cuatro","4"],5:["cinco","5"],6:["seis","6"],8:["ocho","8"],10:["diez","10"]};
const VERBOS=["lleva","llévale","llevale","mueve","muévelo","pasa","manda","envía","envia","saca","pon","traslada","necesito llevar","hay que llevar","quiero mover","vamos a llevar","tienes que llevar","por favor lleva","oye lleva","ayúdame llevando","lleva por favor","mueve por favor"];
const EXTRAS_PRE=["","","","eh ","este ","pues ","rex ","oye rex ","bueno ","ya ","a ver ","por favor ","listo ","entonces ","okey "];
const EXTRAS_POST=["","","",""," por favor"," porfa"," gracias"," ahorita"," ya"," pues"," rápido"," nomás"," de una"];
const DEST={P:["a producción","para producción","a produccion","hacia producción","en producción","a la producción"],L:["al local","para el local","a local","hacia el local","al locál","a la tienda","para la tienda"]};
const ORIG={B:["de bodega","desde bodega","de la bodega","desde la bodega"],P:["de producción","desde producción"]};
const prods=C.PRODUCTOS.filter(p=>p.e&&p.e.length&&p.sin&&p.sin.length&&(p.en||[]).length>=2);
let fallas=[], tot=0, ok=0; const porProd={}, porVerbo={}, porUnidad={};
for(let i=0;i<N;i++){
  const p=pick(prods); const emp=pick(p.e); const q=pick(Object.keys(NUM).map(Number)); const qtxt=pick(NUM[q]);
  let nombre=pick([p.sin[0],pick(p.sin),p.n.toLowerCase()]); if(/\(/.test(nombre)) nombre=p.sin[0]; if(/\(/.test(nombre)) continue;
  const unidadSing=emp[0]; const plural=q===1?unidadSing:(/[aeiou]$/.test(unidadSing)?unidadSing+"s":unidadSing+"es");
  const uso=rnd()<0.8&&!new RegExp("\\b"+emp[0]+"s?\\b").test(nombre)&&!new RegExp("\\b"+emp[0]+"s?\\b").test(nombre); // «dos baldes de frutilla» o «dos de frutilla»
  const cantTxt=uso?(qtxt+" "+(rnd()<0.1&&q===1?unidadSing:plural)+" de "+nombre):(qtxt+" de "+nombre);
  const desde=pick(["B","B","B","P"]); const dests=(p.en||[]).filter(l=>l!==desde&&(desde==="B"||l==="L")); if(!dests.length) continue;
  const a=pick(dests); const verbo=pick(VERBOS);
  const dtxt=pick(DEST[a]||["a "+a]); const otxt=rnd()<0.25?" "+pick(ORIG[desde]):"";
  let f=(pick(EXTRAS_PRE)+verbo+" "+cantTxt+otxt+" "+dtxt+pick(EXTRAS_POST)).replace(/\s+/g," ").trim();
  if(rnd()<0.3) f=f.normalize("NFD").replace(/[̀-ͯ]/g,"");
  if(rnd()<0.15) f=f.replace(/^(\S+)/,"$1,");
  const lugar=desde; let R; try{ R=V.interpretar(f,{lugar}); }catch(e){ R={intent:"ERROR:"+e.message}; }
  tot++;
  const it=(R.items||[])[0];
  const bien=(R.intent==="traslado"||R.intent==="pedido"&&false)&&R.listo&&(R.items||[]).length===1&&it.p===p.id&&Number(it.cant)===q&&R.a===a&&R.de===desde;
  if(bien) ok++; else { fallas.push({f,esp:[p.id,q,desde+">"+a],got:[R.intent,R.de+">"+R.a,JSON.stringify((R.items||[]).map(x=>[x.p,x.cant])),R.listo]}); porProd[p.id]=(porProd[p.id]||0)+1; porVerbo[verbo]=(porVerbo[verbo]||0)+1; porUnidad[emp[0]]=(porUnidad[emp[0]]||0)+1; }
}
console.log(ok+"/"+tot+" bien ("+(100*ok/tot).toFixed(1)+" %), "+fallas.length+" mal");
const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x.join(":")).join("  ");
console.log("por producto:",top(porProd)); console.log("por verbo:",top(porVerbo)); console.log("por unidad:",top(porUnidad));
fallas.slice(0,Number(process.argv[4]||25)).forEach(x=>console.log(" ·",x.f,"| esperaba",x.esp.join(" "),"| dio",x.got.join(" ")));

process.exitCode = ok/tot >= 0.99 ? 0 : 1;
