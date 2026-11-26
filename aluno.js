import { auth, db, configured } from './firebase.js';
import { ferramentas, sugestoes } from './sugestoes.js';
import { signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

const $ = (s) => document.getElementById(s);
const keys = Object.keys(ferramentas);
let roomId='', user=null, name='', current='martelo', state=null, unsubRoom=null, unsubSelf=null, sending=false;
let answers={martelo:[],chave:[],alicate:[]};
const originalText=$('inputAnswers').placeholder;

function status(text,kind='info') { $('joinMsg').className=kind==='error'?'error':kind==='success'?'success':'info'; $('joinMsg').textContent=text; }
function isOpen(){return !!state?.open;}
function cleanText(s){return String(s??'').trim().replace(/\s+/g,' ').slice(0,190);}
function totalCount(){return keys.reduce((n,k)=>n+answers[k].length,0);}
function renderTools(){
 const root=$('toolCards');root.replaceChildren();
 keys.forEach(k=>{
  const t=ferramentas[k],b=document.createElement('button'); b.className='tool'+(current===k?' active':'');b.type='button';
  const im=new Image();im.src=t.imagem; im.alt=t.nome; b.append(im);
  const strong=document.createElement('strong');strong.textContent=t.nome;
  const small=document.createElement('small');small.textContent=`${answers[k].length} situações registradas`;
  b.append(strong,small);b.addEventListener('click',()=>{current=k;render();});root.append(b);
 });
}
function renderMyList(){
 const ul=$('mine'); ul.replaceChildren();
 if(!answers[current].length){const li=document.createElement('li');li.textContent='Nenhuma situação nesta ferramenta.';ul.append(li);return;}
 answers[current].forEach((value,i)=>{
  const li=document.createElement('li'),text=document.createElement('span');text.textContent=value;li.append(text);
  if(isOpen()&&user){const btn=document.createElement('button');btn.textContent='Retirar';btn.title='Excluir esta resposta';btn.disabled=sending;
   btn.onclick=()=>mutate([...answers[current].filter((_,j)=>j!==i)],'Registro excluído.');li.append(btn);}
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
 $('totalMine').textContent=totalCount();$('c_total').textContent=totalCount();$('countAll').textContent=`${answers[current].length} registros`;
 $('entryTitle').textContent=`3. Situações ligadas a ${current==='alicate'?'o alicate universal':current==='chave'?'a chave de fenda':'o martelo'}`;
 $('inputAnswers').disabled=!user||!isOpen()||sending;
 $('submit').disabled=!user||!isOpen()||sending;
 $('roomState').textContent=(!state?'Aguardando turma':state.open?'Coleta aberta':'Coleta encerrada');
 $('phaseHelp').textContent=state?.revealed?'Sugestões liberadas: veja a seção de comparação.':
   'As sugestões aparecem após a liberação do instrutor.';
 $('sendStatus').textContent=!user?'Entre na turma para registrar.':!isOpen()?'O instrutor encerrou a coleta.':'Até 30 respostas por ferramenta, com até 190 caracteres cada.';
 $('conn').textContent=!state?'Aguardando turma':(state.open?'Conectado · coleta aberta':'Conectado · encerrada');
 renderReferences();
}
async function mutate(newList,after){
 if(!user||!roomId||!isOpen()||sending)return;
 sending=true;render();
 const next={...answers,[current]:newList};
 try{
  await setDoc(doc(db,'rooms',roomId,'participants',user.uid),{
   uid:user.uid,name,answers:next,updatedAt:serverTimestamp()
  });
  answers=next;$('sendStatus').textContent=after||'Respostas registradas.';
 }catch(e){console.error(e);status('Não foi possível salvar. Confira a conexão, se a coleta continua aberta e as regras do Firebase.','error');}
 finally{sending=false;render();}
}
async function addAnswers(){
 if(!isOpen()||!user||sending)return;
 const raw=$('inputAnswers').value.split(/\n/).map(cleanText).filter(Boolean);
 if(!raw.length){status('Digite pelo menos uma situação.','error');return;}
 const unique=[]; const seen=new Set(answers[current].map(s=>s.toLocaleLowerCase('pt-BR')));
 for(const r of raw){const key=r.toLocaleLowerCase('pt-BR');if(!seen.has(key)){unique.push(r);seen.add(key);}}
 if(!unique.length){status('Essas situações já estão em sua lista.','error');return;}
 if(unique.length+answers[current].length>30){status('O limite é de 30 situações por ferramenta. Envie menos linhas.','error');return;}
 await mutate([...answers[current],...unique],`${unique.length} situação(ões) adicionada(s).`);
 if(!sending&&answers[current].some(x=>unique.includes(x)))$('inputAnswers').value='';
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
  $('welcome').classList.remove('hidden');$('welcome').textContent=`Participação ativa: ${name} · Turma ${roomId}`;
  status(d.data().open?'Você entrou na atividade. Registre suas ideias nas ferramentas.':'Você entrou para consultar seus registros e a comparação liberada pelo instrutor.','success');
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
