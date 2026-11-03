// seguimientos de la orden anterior («lo mismo de durazno», «y también tres de leche», «otro igual»…): node tests/seguir.test.js
const V=require("../src/parser.js");
const nombreDe=id=>({frutilla:"frutilla",durazno:"durazno",leche:"leche"}[id]||id);
const tras={intent:"traslado",de:"B",a:"P",items:[{p:"frutilla",cant:2,unidadTxt:"baldes"}]};
const merma={intent:"merma",de:null,a:null,items:[{p:"frutilla",cant:2,unidadTxt:"kilos"}]};
const ped={intent:"pedido",de:"P",a:"B",items:[{p:"frutilla",cant:2,unidadTxt:"baldes"}]};
// [frase, ultima, lugar, intent esperado, de, a, producto, cant]  (null = no es seguimiento)
const C=[
 ["lo mismo de durazno",tras,"B","traslado","B","P","durazno",2],
 ["lo mismo pero de leche",tras,"B","traslado","B","P","leche",2],
 ["igual de durazno",tras,"B","traslado","B","P","durazno",2],
 ["y también tres de durazno",tras,"B","traslado","B","P","durazno",3],
 ["y tres cajas de durazno",tras,"B","traslado","B","P","durazno",3],
 ["también una caja de leche",tras,"B","traslado","B","P","leche",1],
 ["además dos de leche",tras,"B","traslado","B","P","leche",2],
 ["y de durazno",tras,"B","traslado","B","P","durazno",2],
 ["otro igual",tras,"B","traslado","B","P","frutilla",2],
 ["lo mismo",tras,"B","traslado","B","P","frutilla",2],
 ["de nuevo",tras,"B","traslado","B","P","frutilla",2],
 ["otra vez",tras,"B","traslado","B","P","frutilla",2],
 ["repite la orden",tras,"B","traslado","B","P","frutilla",2],
 ["uno más",tras,"B","traslado","B","P","frutilla",1],
 ["otro más",tras,"B","traslado","B","P","frutilla",1],
 ["y también dos de leche",merma,"B","merma",null,null,"leche",2],
 ["lo mismo de durazno",merma,"B","merma",null,null,"durazno",2],
 ["y tres de durazno",ped,"P","pedido","P","B","durazno",3],
 ["otro igual",ped,"P","pedido","P","B","frutilla",2],
 // NO son seguimientos
 ["lleva dos cajas de leche a producción",tras,"B",null],
 ["y lleva dos cajas de leche al local",tras,"B",null],
 ["sí",tras,"B",null],
 ["no",tras,"B",null],
 ["qué falta",tras,"B",null],
 ["y qué falta",tras,"B",null],
 ["gracias",tras,"B",null],
 ["repite",tras,"B",null],
 ["se dañó un kilo de leche",tras,"B",null],
 ["y tú cómo estás",tras,"B",null],
];
let bad=0;
C.forEach(([f,u,l,intent,de,a,p,cant])=>{
  const fr=V.seguir(f,u,{lugar:l,nombreDe});
  if(intent===null){ if(fr){bad++;console.log("✗ no debía ser seguimiento:",f,"→",fr);} return; }
  if(!fr){bad++;console.log("✗ no lo tomó como seguimiento:",f);return;}
  const R=V.interpretar(fr,{lugar:l}); const e=[];
  if(R.intent!==intent) e.push("intent="+R.intent);
  if(de!==undefined&&de!==null&&R.de!==de) e.push("de="+R.de);
  if(a!==undefined&&a!==null&&R.a!==a) e.push("a="+R.a);
  const it=(R.items||[]).find(x=>x.p===p); if(!it) e.push("prod="+JSON.stringify((R.items||[]).map(x=>x.p)));
  else if(cant!=null&&it.cant!==cant) e.push("cant="+it.cant);
  if(!R.listo) e.push("no listo "+(R.issues||[]).map(i=>i.code));
  if(e.length){bad++;console.log("✗",f,"→",fr,"→",e.join("; "));}
});
console.log(C.length-bad,"bien,",bad,"mal");
process.exit(bad?1:0);
