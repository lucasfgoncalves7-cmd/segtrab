import { auth, db, configured } from './firebase.js';
import { ferramentas, sugestoes } from './sugestoes.js';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { doc, collection, setDoc, getDoc, serverTimestamp, onSnapshot, updateDoc } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

const $=id=>document.getElementById(id);
const keys=Object.keys(ferramentas);
let user=null, roomId='', room=null, people=[], unsubRoom=null, unsubPeople=null, hideNames=false, filter='todas';
function showMsg(id,s,kind='info'){const el=$(id);el.className=kind==='error'?'error':kind==='success'?'success':'info';el.textContent=s;}
function code(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const nums=new Uint8Array(14);crypto.getRandomValues(nums);return Array.from(nums,x=>chars[x%chars.length]).join('');}
function nAnswers(a,k){return Array.isArray(a?.[k])?a[k].length:0;}
function total(p){return keys.reduce((t,k)=>t+nAnswers(p.answers,k),0);}
function timestamp(p){try{return p.updatedAt?.toDate().toLocaleTimeString('pt-BR')||'—';}catch{return '—';}}
function csvCell(x){return '"'+String(x??'').replace(/"/g,'""')+'"';}
function downloadCsv(){
 const rows=[['Turma','Equipe','Ferramenta','Situação registrada','Última atualização']];
 for(const p of people)for(const k of keys)for(const s of (p.answers?.[k]||[]))rows.push([roomId,p.name,ferramentas[k].nome,s,timestamp(p)]);
 const out='\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
 const a=document.createElement('a');const u=URL.createObjectURL(new Blob([out],{type:'text/csv;charset=utf-8'}));a.href=u;
 a.download=`riscos-ferramentas-${roomId}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);
}
function studentLink(){const u=new URL('index.html',location.href);u.searchParams.set('sala',roomId);return u.toString();}
function render(){
 if(!room)return;
 $('state').textContent=(room.open?'Coleta aberta':'Coleta encerrada')+' · '+(room.revealed?'sugestões liberadas':'sugestões ocultas');
 $('lock').textContent=room.open?'Encerrar coleta':'Reabrir coleta';
 $('reveal').textContent=room.revealed?'Ocultar sugestões':'Liberar sugestões';
 $('participants').textContent=people.length;
 const count=people.reduce((v,p)=>v+total(p),0);
 $('total').textContent=count;$('average').textContent=people.length?(count/people.length).toFixed(1).replace('.',','):'0';
 $('updated').textContent=new Date().toLocaleTimeString('pt-BR');
 $('currentRoom').textContent=roomId;$('studentUrl').value=studentLink();
 const feed=[];
 for(const p of people)for(const k of keys)for(const item of (p.answers?.[k]||[]))if(filter==='todas'||filter===k)feed.push({name:p.name,tool:k,text:item,updatedAt:p.updatedAt});
 feed.sort((a,b)=>(b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0));
 $('filterCount').textContent=`${feed.length} exibidas`;
 const root=$('feed');root.replaceChildren();
 if(!feed.length){const d=document.createElement('div');d.className='pad muted';d.textContent='Aguardando contribuições neste filtro.';root.append(d);}
 else for(const a of feed){const div=document.createElement('div');div.className='entry';
  const h=document.createElement('div');h.className='nameanon';const b=document.createElement('b');b.textContent=ferramentas[a.tool].nome+' · '+(hideNames?'Participante':a.name);
  const t=document.createElement('span');t.className='tiny';t.textContent='Atualização '+(a.updatedAt?.toDate?.().toLocaleTimeString('pt-BR')||'—');h.append(b,t);
  const p=document.createElement('p');p.textContent=a.text;div.append(h,p);root.append(div);
 }
 const tbl=$('summary');tbl.replaceChildren();
 if(!people.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent='Aguardando participações.';tr.append(td);tbl.append(tr);}
 else for(const p of [...people].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))){
  const tr=document.createElement('tr');[hideNames?'—':p.name,...keys.map(k=>nAnswers(p.answers,k)),total(p)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});tbl.append(tr);
 }
}
function renderSuggestions(){const root=$('teacherReferences');root.replaceChildren();
 for(const k of keys){const card=document.createElement('div');card.className='refcard';const h=document.createElement('h3');h.textContent=ferramentas[k].nome;
 const ol=document.createElement('ol');for(const s of sugestoes[k]){const li=document.createElement('li');li.textContent=s;ol.append(li);}card.append(h,ol);root.append(card);}}
async function login(){if(!configured){showMsg('loginStatus','Preencha firebase-config.js e publique as regras no Firebase.','error');return;}
 $('login').disabled=true;
 try{await signInWithPopup(auth,new GoogleAuthProvider());}
 catch(e){console.error(e);showMsg('loginStatus','Não foi possível entrar com Google. Ative o provedor Google no Firebase, autorize o domínio publicado e confira se o navegador permite a janela de login.','error');}
 finally{$('login').disabled=false;}}
function cleanup(){if(unsubRoom)unsubRoom();if(unsubPeople)unsubPeople();unsubRoom=null;unsubPeople=null;}
async function openRoom(id){
 if(!user)return;
 const rid=id.toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(rid.length<10){showMsg('roomMessage','Informe um código de turma válido.','error');return;}
 try{
  const snap=await getDoc(doc(db,'rooms',rid));
  if(!snap.exists())throw new Error('Código não encontrado.');
  if(snap.data().createdBy!==user.uid)throw new Error('Esta sala pertence a outra conta de instrutor.');
  cleanup();roomId=rid;room=snap.data();people=[];
  $('roomActions').classList.remove('hidden');$('live').classList.remove('hidden');$('roomCode').value=rid;
  localStorage.setItem('ferramentas-ultima-sala',rid);
  unsubRoom=onSnapshot(doc(db,'rooms',rid),s=>{if(s.exists()){room=s.data();render();}},e=>showMsg('roomMessage','Erro de acompanhamento da turma: '+e.message,'error'));
  unsubPeople=onSnapshot(collection(db,'rooms',rid,'participants'),snap=>{
    people=snap.docs.map(d=>d.data());render();
  },e=>showMsg('roomMessage','Erro ao receber respostas: '+e.message,'error'));
  $('conn').textContent='Ao vivo · turma '+rid;
  showMsg('roomMessage','Turma pronta. Compartilhe o endereço dos alunos e acompanhe o painel.','success');render();
 }catch(e){console.error(e);showMsg('roomMessage',e.message||'Não foi possível abrir turma.','error');}
}
async function createRoom(){if(!user)return;
 $('newRoom').disabled=true;
 try{
  const newId=code();
  await setDoc(doc(db,'rooms',newId),{createdBy:user.uid,createdAt:serverTimestamp(),open:true,revealed:false,title:'Riscos nas ferramentas manuais'});
  await openRoom(newId);
 }catch(e){console.error(e);showMsg('roomMessage','Não foi possível criar. Verifique se sua conta Google está autorizada nas regras do Firestore e se as regras foram publicadas.','error');}
 finally{$('newRoom').disabled=false;}}
async function setFlag(field,value){if(!user||!roomId)return;
 try{await updateDoc(doc(db,'rooms',roomId),{[field]:value});}
 catch(e){console.error(e);showMsg('roomMessage','Não foi possível alterar a turma. Verifique sua conexão e as regras.','error');}}
async function leave(){cleanup();await signOut(auth);location.reload();}
function updateAuth(u){
 user=u&&!u.isAnonymous&&u.providerData.some(p=>p.providerId==='google.com')?u:null;
 $('loginPanel').classList.toggle('hidden',!!user);$('dashboard').classList.toggle('hidden',!user);
 if(user){$('teacherName').textContent=user.email; $('conn').textContent='Instrutor autenticado';
  const last=localStorage.getItem('ferramentas-ultima-sala');if(last&&!roomId)openRoom(last);
 } else {$('conn').textContent='Acesso do instrutor';}
}
$('warning').classList.toggle('hidden',configured);
$('login').onclick=login;$('newRoom').onclick=createRoom;$('openRoom').onclick=()=>openRoom($('roomCode').value);
$('lock').onclick=()=>setFlag('open',!room.open);$('reveal').onclick=()=>setFlag('revealed',!room.revealed);
$('csv').onclick=downloadCsv;$('anon').onclick=()=>{hideNames=!hideNames;$('anon').textContent=hideNames?'Mostrar nomes':'Ocultar nomes na projeção';render();};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('studentUrl').value);showMsg('roomMessage','Endereço copiado.','success');}catch{$('studentUrl').focus();$('studentUrl').select();showMsg('roomMessage','Copie o link selecionado com Ctrl+C.','info');}};
$('logout').onclick=leave;
$('filters').querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));render();});
renderSuggestions();
if(configured)onAuthStateChanged(auth,updateAuth);
