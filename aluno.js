import { auth, db, configured } from './firebase.js';
import { ferramentas, sugestoes } from './sugestoes-ilustradas-v2.js';
import { signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

const $ = (s) => document.getElementById(s);
const keys = Object.keys(ferramentas);
let roomId='', user=null, name='', current='martelo', state=null, unsubRoom=null, unsubSelf=null, sending=false;
let answers={martelo:[],chave:[],alicate:[]};
const toolPrompts = {
  martelo: 'Martelo: considere a estabilidade da peça, o estado da ferramenta, a posição das mãos e a área ao redor.',
  chave: 'Chave de fenda: considere o encaixe da ponta, a direção da força, o apoio da peça e possíveis energias presentes.',
  alicate: 'Alicate universal: considere o esforço aplicado, o material manuseado, o posicionamento das mãos e as partes cortantes.'
};

function status(text,kind='info') {
  $('joinMsg').className=kind==='error'?'error':kind==='success'?'success':'info';
  $('joinMsg').textContent=text;
}
function entryNotice(text,kind='info') {
  const el=$('entryFeedback');
  el.className=kind==='error'?'error':kind==='success'?'success':'info';
  el.textContent=text;
}
function isOpen(){return !!state?.open;}
function cleanText(s){return String(s??'').trim().replace(/\s+/g,' ');}
function totalCount(){return keys.reduce((n,k)=>n+answers[k].length,0);}
function renderTools(){
 const root=$('toolCards');root.replaceChildren();
 keys.forEach(k=>{
  const t=ferramentas[k], b=document.createElement('button');
  b.className='tool'+(current===k?' active':'');
  b.type='button';b.disabled=sending;
  b.setAttribute('aria-pressed',String(current===k));
  b.setAttribute('aria-label',t.nome+(current===k?', selecionada':', selecionar ferramenta'));
  const visual=document.createElement('span');
  visual.className='tool-media tool-media-'+k;
  visual.setAttribute('role','img');
  visual.setAttribute('aria-label', k==='martelo'?'Imagem de um martelo de unha':k==='chave'?'Imagem de uma chave de fenda reta':'Imagem de um alicate universal');
  const strong=document.createElement('strong');strong.textContent=t.nome;
  const small=document.createElement('small');
  const count=answers[k].length;
  small.textContent=count+' '+(count===1?'situação registrada':'situações registradas')+(current===k?' · selecionada':'');
  b.append(visual,strong,small);
  b.addEventListener('click',()=>{
    if(sending||current===k)return;
    current=k;$('entryFeedback').className='hidden';render();
  });
  root.append(b);
 });
}
function renderMyList(){
 const ul=$('mine'); ul.replaceChildren();
 if(!answers[current].length){const li=document.createElement('li');li.textContent='Nenhuma situação nesta ferramenta.';ul.append(li);return;}
 answers[current].forEach((value,i)=>{
  const li=document.createElement('li'),text=document.createElement('span');text.textContent=value;li.append(text);
  if(isOpen()&&user){const btn=document.createElement('button');btn.textContent='Excluir';btn.title='Excluir esta situação registrada';btn.disabled=sending;
   const toolKey=current;btn.onclick=()=>mutate(answers[toolKey].filter((_,j)=>j!==i),'Registro excluído.',toolKey);li.append(btn);}
  ul.append(li);
 });
}
function renderReferences(){
 $('comparison').classList.toggle('hidden', !state?.revealed);
 if(!state?.revealed)return;
 const root=$('referenceList');root.replaceChildren();
 keys.forEach(k=>{const card=document.createElement('div');card.className='refcard';const h=document.createElement('h3');h.textContent=ferramentas[k].nome;
 const ol=document.createElement('ol');sugestoes[k].forEach(s=>{const li=document.createElement('li');li.textContent=s;ol.append(li);});card.append(h,ol);root.append(card);});
}
function render(){
 renderTools(); renderMyList();
 keys.forEach(k=>{$('c_'+k).textContent=answers[k].length;});
 $('totalMine').textContent=totalCount();$('c_total').textContent=totalCount();
 const count=answers[current].length;
 $('countAll').textContent=count+' '+(count===1?'registro':'registros');
 $('entryTitle').textContent='3. Registre situações: '+ferramentas[current].nome.toLowerCase();
 $('toolPrompt').textContent=toolPrompts[current];
 $('inputAnswers').disabled=!user||!isOpen()||sending;
 $('submit').disabled=!user||!isOpen()||sending;
 $('roomState').textContent=!state?'Aguardando turma':state.open?'Coleta aberta':'Coleta encerrada';
 $('phaseHelp').textContent=state?.revealed?
   'Os exemplos estão liberados na seção de comparação, ao final desta página.':
   !state?'Entre em uma turma para acompanhar a atividade.':
   state.open?'Envie suas ideias. O instrutor informará quando encerrar a coleta e liberar os exemplos.':
   'A coleta foi encerrada. Aguarde a liberação dos exemplos pelo instrutor.';
 $('sendStatus').textContent=sending?'Salvando seus registros...':
   !user?'Entre na turma para registrar suas ideias.':
   !isOpen()?'Coleta encerrada: não é possível enviar novos registros.':
   count+' de 30 situações registradas nesta ferramenta.';
 $('conn').textContent=!state?'Aguardando entrada na turma':state.open?'Conectado · coleta aberta':'Conectado · coleta encerrada';
 renderReferences();
}
async function mutate(newList,after,toolKey=current){
 if(!user||!roomId||!isOpen()||sending)return false;
 sending=true;render();
 const next={...answers,[toolKey]:newList};
 try{
  await setDoc(doc(db,'rooms',roomId,'participants',user.uid),{
   uid:user.uid,name,answers:next,updatedAt:serverTimestamp()
  });
  answers=next;entryNotice(after||'Registros salvos.','success');
  return true;
 }catch(e){
  console.error(e);
  entryNotice('Não foi possível salvar. Verifique sua conexão e se a coleta continua aberta. Seus textos permanecem no campo para nova tentativa.','error');
  return false;
 }finally{sending=false;render();}
}
async function addAnswers(){
 if(!isOpen()||!user||sending)return;
 const toolKey=current;
 const raw=$('inputAnswers').value.split(/\r?\n/).map(cleanText).filter(Boolean);
 if(!raw.length){entryNotice('Escreva pelo menos uma situação antes de enviar.','error');return;}
 const tooLong=raw.findIndex(x=>x.length>190);
 if(tooLong>=0){entryNotice('A linha '+(tooLong+1)+' tem mais de 190 caracteres. Resuma essa situação sem perder o sentido.','error');return;}
 const unique=[],seen=new Set(answers[toolKey].map(x=>x.toLocaleLowerCase('pt-BR').replace(/[.!?]+$/,'')));
 for(const value of raw){
  const norm=value.toLocaleLowerCase('pt-BR').replace(/[.!?]+$/,'');
  if(!seen.has(norm)){unique.push(value);seen.add(norm);}
 }
 if(!unique.length){entryNotice('Essas situações já foram registradas. Descreva ideias diferentes.','error');return;}
 if(unique.length+answers[toolKey].length>30){
  entryNotice('Você pode registrar até 30 situações por ferramenta. Envie menos linhas ou revise sua lista.','error');return;
 }
 const success=await mutate([...answers[toolKey],...unique],unique.length+' '+(unique.length===1?'situação registrada com sucesso.':'situações registradas com sucesso.'),toolKey);
 if(success){$('inputAnswers').value='';}
}
function onRoomChange(snapshot){
 if(!snapshot.exists()){status('Turma não encontrada. Confira o código.','error');return;}
 state=snapshot.data();render();
}
async function join(){
 const requested=$('room').value.toUpperCase().replace(/[^A-Z0-9]/g,'').trim();
 const enteredName=$('nickname').value.replace(/\s+/g,' ').trim();
 if(requested.length<10){status('Informe um código de turma válido.','error');return;}
 if(!enteredName||enteredName.length>40){status('Informe um nome curto ou identificação de equipe, com até 40 caracteres.','error');return;}
 if(!configured){status('O site ainda não foi conectado ao Firebase. Solicite ao instrutor que conclua a configuração.','error');return;}
 $('join').disabled=true; status('Conectando à turma…');
 try{
  let currentUser=auth.currentUser;
  if(!currentUser){const res=await signInAnonymously(auth);currentUser=res.user;}
  if(!currentUser.isAnonymous)throw new Error('Este navegador está autenticado como instrutor. Abra o link do aluno em janela anônima.');
  const d=await getDoc(doc(db,'rooms',requested));
  if(!d.exists())throw new Error('Código da turma não encontrado.');
  const self=doc(db,'rooms',requested,'participants',currentUser.uid);
  const previous=await getDoc(self);
  if(!d.data().open && !previous.exists())throw new Error('A coleta desta turma foi encerrada. Somente participantes já cadastrados podem consultar a atividade.');
  const initial=previous.exists()?previous.data().answers:{martelo:[],chave:[],alicate:[]};
  if(d.data().open){
   await setDoc(self,{uid:currentUser.uid,name:enteredName,answers:initial,updatedAt:serverTimestamp()});
  }
  if(unsubRoom)unsubRoom();if(unsubSelf)unsubSelf();
  user=currentUser;name=enteredName;roomId=requested;answers=initial;
  unsubRoom=onSnapshot(doc(db,'rooms',roomId),onRoomChange,e=>status('Falha ao receber a situação da turma: '+e.message,'error'));
  unsubSelf=onSnapshot(self,s=>{if(s.exists()){const a=s.data().answers||{};answers={martelo:a.martelo||[],chave:a.chave||[],alicate:a.alicate||[]};render();}},e=>status('Falha de sincronização: '+e.message,'error'));
  $('welcome').classList.remove('hidden');$('welcome').textContent=`Você entrou na turma: ${name} · Código ${roomId}`;
  status(d.data().open?'Entrada confirmada. Selecione uma ferramenta e registre suas ideias.':'Entrada confirmada. Você pode consultar seus registros e os exemplos que o instrutor liberar.','success');
  localStorage.setItem('ferramentas-aluno-nome',name);render();
 }catch(e){console.error(e);status(e.message||'Não foi possível entrar.','error');}
 finally{$('join').disabled=false;}
}
const salaParam=new URLSearchParams(location.search).get('sala')||'';
$('room').value=salaParam.toUpperCase();
$('nickname').value=localStorage.getItem('ferramentas-aluno-nome')||'';
$('configWarning').classList.toggle('hidden',configured);
$('join').onclick=join;$('submit').onclick=addAnswers;
$('nickname').addEventListener('keydown',e=>{if(e.key==='Enter')join();});
$('room').addEventListener('keydown',e=>{if(e.key==='Enter')join();});
render();
