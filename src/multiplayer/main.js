import './style.css'
import { io } from 'socket.io-client'
import { characters,shirtColors } from '../content.js'
import { icon } from '../icons.js'
import { koreanVoice,reward,speak,stopSpeech,unlockAudio } from '../services.js'
import { createMultiplayerScene } from './scene.js'
import { deliveryMission,distance,doors,encounterRange,exitPoint } from '../../shared/world.js'
import { clerk, missionItems as items, missionList, missionsById, siteFor, zoneOf } from '../../shared/missions.js'

const root=document.querySelector('#app')
const host=document.querySelector('#world')
const ui=document.querySelector('#ui')
const roomKey='my-town:multiplayer:room'
const prefsKey='my-town:multiplayer:prefs'
function read(storage,key){
  try{return JSON.parse(storage.getItem(key))}catch{return null}
}
const settings={movement:'hold',device:'tablet',quality:'normal',voice:true,effects:true,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,volume:.65,...read(localStorage,prefsKey)}
const escape=(text='')=>String(text).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
const zones={town:'마을',home:'우리 집',store:'편의점'}
const initial={index:0,color:characters[0].top,nickname:''}
const profile={...initial}
const socket=io({autoConnect:false,reconnectionDelay:400,reconnectionDelayMax:2800})
let scene
try{scene=createMultiplayerScene(host)}catch{
  ui.innerHTML='<main class="mp-warning"><h1>3D 마을을 열 수 없어요</h1><p>Chrome의 하드웨어 가속을 켜고 새로고침해 주세요.</p></main>'
}
let session=read(sessionStorage,roomKey),snapshot=null,screen='lobby',panel=null,enteredCode='',entryMessage='',hintTimer=null
let pending=false,teacherPin=false,teacherZone='town',overview=false,held=null,directionTimer=null,press=null,near=null
let lastDelivery='',lastCycle=0,lastCarry=null,ready=false,initializing=Boolean(session)
let missionChoice='delivery'

const messages={
  'no-room':'방을 찾지 못했어요. 코드를 확인해 주세요.','full':'이 방은 학생 15명이 모두 들어왔어요.','server-full':'사용 중인 방이 많아요. 잠시 뒤 다시 해 주세요.',
  'teacher-pin':'교사 코드를 확인해 주세요.','busy':'잠깐만 기다려요.','expired':'이 방의 접속이 만료됐어요. 새 방 코드로 다시 들어가요.',
  'network':'연결을 확인하고 다시 눌러 주세요.','too-far':'조금 더 가까이 가요.','blocked':'걸을 수 있는 바닥을 눌러요.','road':'인도에서 상자를 내려놓아요.',
  'wrong-site':'들고 있는 물건과 같은 기호가 있는 곳을 찾아요.','unavailable':'친구가 먼저 물건을 집었어요.','hands-full':'한 번에 물건 하나를 들어요.',
  'waiting':'교사가 미션을 시작할 때까지 기다려요.','finished':'미션을 모두 마쳤어요.','empty':'먼저 물건을 들어요.',
  'plant-first':'이 화단에는 씨앗을 먼저 심어요.','counter-busy':'친구가 앞 물건을 계산할 때까지 기다려요.',
  'need-clerk':'물건을 올린 학생과 다른 친구가 계산해요.','bad-mission':'미션을 다시 골라 주세요.',
  'ended':'교사가 게임을 종료했어요.','session-replaced':'이 방이 다른 탭에서 열렸어요.'
}
const labels={item:'줍기',drop:'내려놓기',peer:'건네기',site:'놓기',door:'문 열기',checkout:'계산하기'}
const nameOf=person=>person.nickname||'플레이어 '+person.id
const me=()=>snapshot?.players.find(player=>player.id===session?.id)
const currentZone=()=>session?.role==='teacher'?teacherZone:me()?.zone??'town'
const activeMission=()=>missionsById.get(snapshot?.mission)??deliveryMission
const badge=(item,extra='')=>'<span aria-hidden="true" class="mp-symbol '+extra+'" style="--parcel:'+item.color+';--symbol-ink:'+(item.ink??'#fff')+'">'+item.symbol+'</span>'
function button(text,action,symbol,kind='',extra=''){
  return '<button type="button" class="mp-button '+kind+'" data-action="'+action+'" '+extra+'>'+(symbol?icon(symbol):'')+'<span>'+text+'</span></button>'
}
function option(text,key,value){
  return button(text,'pref:'+key+':'+value,null,settings[key]===value?'mp-selected':'','aria-pressed="'+(settings[key]===value)+'"')
}
function updateSettings(){
  localStorage.setItem(prefsKey,JSON.stringify(settings))
  scene.quality(settings.quality,settings.reduced)
}
function talk(text){speak(text,settings)}

function lobby(){
  return `<section class="mp-entry">
    <header class="mp-brand"><span>${icon('home',23)}</span> 홀트학교</header>
    <div class="mp-entry-body"><h1>우리 동네<br>생활 체험<span>.</span></h1>
    <p>친구들과 함께 상자를 배달해요.</p>
    <form id="mp-join" class="mp-join" novalidate><label for="room-code">게임방 코드</label>
      <input id="room-code" maxlength="6" size="6" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="6자리 코드" value="${escape(enteredCode)}">
      <button class="mp-button mp-primary" type="submit">${icon('enter')}<span>학생 입장</span></button>
    </form>
    <p class="mp-message" role="status">${escape(entryMessage)}</p></div>
    <footer class="mp-entry-footer">${button('교사 · 방 만들기','teacher-form','screen')}${button('설정','settings','settings','mp-quiet')}</footer>
  </section><div class="mp-preview-title">${icon('map')}<span>함께 움직이는 3D 마을</span></div>`
}
function avatar(){
  return `<section class="mp-entry mp-avatar"><header class="mp-brand"><span>${icon('person',24)}</span> 캐릭터 선택</header>
  <div class="mp-entry-body"><h1>누구와<br>떠날까요?</h1>
  <div class="mp-avatar-picker">${button('이전','avatar-prev','left')}<strong>${characters[profile.index].name}</strong>${button('다음','avatar-next','right')}</div>
  <fieldset><legend>옷 색상</legend><div class="mp-swatches">${shirtColors.map((color,i)=>'<button type="button" data-action="color:'+i+'" aria-label="'+['파랑','초록','빨강','주황','보라','하늘색'][i]+'" aria-pressed="'+(color===profile.color)+'" style="--coat:'+color+'">'+(color===profile.color?icon('check',19):'')+'</button>').join('')}</div></fieldset>
  <label class="mp-nickname">별명 <small>선택 사항</small><input id="mp-nickname" maxlength="12" autocomplete="off" value="${escape(profile.nickname)}" placeholder="입력 없이 들어갈 수 있어요"></label>
  <p class="mp-message" role="status">${escape(entryMessage)}</p>
  <div class="mp-avatar-buttons">${button('뒤로 가기','home','back','mp-quiet')}${button('마을 들어가기','join','enter','mp-primary')}</div></div></section>`
}
function game(){
  const teacher=session.role==='teacher'
  const direction=(name,label,grid)=>'<button type="button" class="mp-direction" data-dir="'+name+'" aria-label="'+label+'" style="grid-area:'+grid+'">'+icon(name,31)+'</button>'
  return `<header class="mp-top"><div class="mp-online">${icon('person')} <strong id="mp-online">0명</strong><span id="mp-network" role="status"></span></div>
     <div class="mp-goal" aria-label="공동 미션 진행"><div id="mp-mission-icon" class="mp-goal-icon">${icon('bag',25)}</div>
       <div><strong id="mp-goal-title">우리 동네 배달부</strong><div class="mp-progress" id="mp-progress"></div></div><strong id="mp-count">0 / 4</strong></div>
     ${teacher?'<div class="mp-code"><span>접속 코드</span><strong>'+escape(session.code)+'</strong>'+button('복사','copy-code',null,'mp-quiet')+'</div>':''}</header>
  <div id="mp-tags" class="mp-tags" aria-hidden="true"></div><div id="mp-hint" class="mp-hint" role="status" hidden></div>
  ${teacher?`<aside class="mp-roster"><label for="mp-mission">공동 미션 선택</label>
    <select id="mp-mission">${missionList.map(m=>'<option value="'+m.id+'"'+(m.id===missionChoice?' selected':'')+'>'+m.title+'</option>').join('')}</select>
    <label for="mp-area">관람 장소</label>
    <select id="mp-area">${Object.entries(zones).map(([id,text])=>'<option value="'+id+'"'+(id===teacherZone?' selected':'')+'>'+text+'</option>').join('')}</select>
    <ul id="mp-roster"></ul></aside>`:
    `<div class="mp-dpad" aria-label="방향 이동" ${settings.movement==='tap'?'hidden':''}>
    ${direction('up','앞으로','up')}${direction('left','왼쪽','left')}${direction('down','뒤로','down')}${direction('right','오른쪽','right')}</div>
    <div class="mp-right"><div class="mp-side-actions">${button('손 흔들기','wave','person','mp-quiet')}${button('내려놓기','drop','down','mp-quiet','hidden')}</div><button type="button" data-action="interact" class="mp-hand" disabled aria-label="상호작용">${icon('touch',35)}<span>상호작용</span></button></div>`}
  <nav class="mp-bottom" aria-label="${teacher?'교사 조작':'게임 조작'}">
    ${teacher?
      button('시작','teacher:start','play','mp-primary')+button('다시 시작','teacher:restart','clock')+
      button('학생 안전 이동','teacher:safe','home')+button('종료','teacher:end','pause','mp-end'):
      button('다시 듣기','listen','sound')+button(overview?'가까이 보기':'전체 보기','overview','map')}
    ${button('설정','settings','settings','mp-quiet')}${button('홈','home','home','mp-quiet')}
  </nav>`
}
function dialog(){
  if(!panel)return ''
  let body,title
  if(panel==='teacher'){
    title='교사 · 게임방 만들기'
    body='<p>방을 만들고 학생들에게 코드를 알려 주세요.</p>'+
      (teacherPin?'<label>교사 코드<input id="mp-pin" type="password" maxlength="80" autocomplete="off"></label>':'')+
      '<p class="mp-message" role="status">'+escape(entryMessage)+'</p>'+
      '<div class="mp-dialog-buttons">'+button('돌아가기','close','back')+button('방 만들기','create','screen','mp-primary')+'</div>'
  }else{
    title='설정'
    body='<div class="mp-options">'+
      [['이동 방식','movement',[['hold','방향 버튼'],['tap','바닥 터치']]],['화면','device',[['tablet','태블릿'],['board','전자칠판']]],
      ['그래픽','quality',[['low','낮음'],['normal','보통']]],['한국어 음성','voice',[[true,'켜기'],[false,'끄기']]],
      ['효과음','effects',[[true,'켜기'],[false,'끄기']]],['화면 움직임 줄이기','reduced',[[true,'켜기'],[false,'끄기']]]]
      .map(([name,key,values])=>'<fieldset><legend>'+name+'</legend>'+values.map(([value,text])=>option(text,key,value)).join('')+'</fieldset>').join('')+
      '</div><div class="mp-dialog-buttons">'+button('돌아가기','close','back','mp-primary')+'</div>'
  }
  return '<div class="mp-scrim"><section class="mp-dialog" role="dialog" aria-modal="true" aria-labelledby="mp-dialog-title"><h2 id="mp-dialog-title">'+title+'</h2>'+body+'</section></div>'
}

function render(){
  root.dataset.screen=screen
  root.dataset.device=settings.device
  ui.innerHTML=(screen==='game'?game():screen==='avatar'?avatar():lobby())+dialog()
  if(panel)for(const child of [...ui.children].slice(0,-1))child.inert=true
  if(screen==='game')paintWorld()
}

function hint(text,symbol=''){
  const el=document.getElementById('mp-hint')
  if(!el)return
  clearTimeout(hintTimer)
  el.textContent=(symbol?symbol+'  ':'')+text
  el.hidden=false
  hintTimer=setTimeout(()=>{el.hidden=true},2900)
}

function guidance(){
  const own=me()
  const mission=activeMission()
  if(snapshot?.phase==='waiting')return '선생님이 미션을 시작할 때까지 기다려요.'
  if(snapshot?.phase==='finished')return mission.success
  if(own?.carry&&mission.method==='place'){
    const item=items.get(own.carry),site=siteFor(item)
    if(item.requires&&!snapshot.items.find(p=>p.id===item.requires)?.delivered)return '같은 화단에 씨앗을 먼저 심어요.'
    if(item.verb==='심기')return site.name+'에 씨앗을 심어요.'
    if(item.verb==='물 주기')return site.name+'에 물을 줘요.'
    return site.name+' 기호가 있는 곳으로 가져가요.'
  }
  return mission.guide
}

function available(){
  const own=me()
  if(!own||!ready)return null
  const zone=own.zone
  const mission=activeMission()
  const close=(point)=>distance(own.point,point)<=encounterRange
  const byDistance=(a,b)=>distance(own.point,a.point)-distance(own.point,b.point)
  if(snapshot.phase==='active'){
    if(mission.method==='checkout'&&zone===clerk.zone&&distance(own.point,clerk.point)<=clerk.range){
      const pending=snapshot.items.find(item=>item.checkoutBy&&item.checkoutBy!==own.id)
      if(pending)return {kind:'checkout',target:pending.id}
    }
    if(own.carry){
      const site=mission.sites.filter(item=>item!==clerk&&zoneOf(item)===zone&&close(item.point)).sort(byDistance)[0]
      if(site)return {kind:'site',target:site.id}
      const friend=snapshot.players.filter(p=>p.id!==own.id&&p.zone===zone&&!p.carry&&close(p.point)).sort(byDistance)[0]
      if(friend)return {kind:'peer',target:friend.id}
    }else{
      const parcel=snapshot.items.filter(item=>item.zone===zone&&!item.owner&&!item.delivered&&!item.checkoutBy&&close(item.point)).sort(byDistance)[0]
      if(parcel)return {kind:'item',target:parcel.id}
    }
  }
  const door=zone==='town'?doors.find(d=>close(d.point)):close(exitPoint)?doors.find(d=>d.id===zone):null
  if(door)return {kind:'door',target:door.id}
  if(own.carry&&snapshot.phase==='active')return {kind:'drop'}
  return null
}

function paintWorld(){
  if(!snapshot)return
  const progress=document.getElementById('mp-progress')
  if(!progress)return
  const online=document.getElementById('mp-online')
  const onlineCount=snapshot.players.length+'명'
  if(online.textContent!==onlineCount)online.textContent=onlineCount
  const count=snapshot.items.filter(p=>p.delivered).length
  const mission=activeMission()
  const countLabel=count+' / '+snapshot.items.length
  const counter=document.getElementById('mp-count')
  if(counter.textContent!==countLabel)counter.textContent=countLabel
  const goal=document.getElementById('mp-goal-title')
  const title=snapshot.phase==='finished'?'함께 미션 완료!':snapshot.phase==='waiting'?'미션 준비 중':mission.title
  if(goal.textContent!==title)goal.textContent=title
  const goalIcon=document.getElementById('mp-mission-icon')
  if(goalIcon.dataset.icon!==mission.icon){
    goalIcon.dataset.icon=mission.icon
    goalIcon.innerHTML=icon(mission.icon,25)
  }
  const stamps=JSON.stringify(snapshot.items.map(item=>[item.id,item.delivered]))
  if(progress.dataset.stamps!==stamps){
    progress.innerHTML=snapshot.items.map(item=>badge(items.get(item.id),item.delivered?'is-done':'')).join('')
    progress.dataset.stamps=stamps
  }
  const network=document.getElementById('mp-network')
  const networkLabel=ready?'연결됨':'다시 연결 중'
  if(network.textContent!==networkLabel)network.textContent=networkLabel
  network.classList.toggle('mp-offline',!ready)
  const studentRoster=document.getElementById('mp-roster')
  if(studentRoster){
    const list=JSON.stringify(snapshot.players.map(p=>[p.id,p.nickname,p.zone]))
    if(studentRoster.dataset.list!==list){
      studentRoster.dataset.list=list
      studentRoster.innerHTML=snapshot.players.length?snapshot.players.map(p=>'<li><button type="button" data-action="watch:'+p.zone+'"><strong>'+escape(nameOf(p))+'</strong><span>'+zones[p.zone]+'</span></button></li>').join(''):'<li>학생 입장을 기다려요.</li>'
    }
    ui.querySelector('[data-action="teacher:start"]').disabled=!ready||snapshot.phase!=='waiting'
    const restart=ui.querySelector('[data-action="teacher:restart"]')
    restart.disabled=!ready||snapshot.phase==='waiting'
    const restartLabel=missionChoice===mission.id?'다시 시작':'선택한 미션 시작'
    const restartText=restart.querySelector('span')
    if(restartText.textContent!==restartLabel)restartText.textContent=restartLabel
    ui.querySelector('[data-action="teacher:safe"]').disabled=!ready||!snapshot.players.length
    ui.querySelector('[data-action="teacher:end"]').disabled=!ready
  }
  near=available()
  const carried=items.get(me()?.carry)
  scene.highlight(near,carried?siteFor(carried)?.id:undefined)
  const hand=ui.querySelector('.mp-hand')
  if(hand){
    const kind=near?.kind??''
    const title=kind==='site'?(carried?.verb??mission.goal):kind==='item'&&mission.method==='collect'?'보물 줍기':labels[kind]??'상호작용'
    if(hand.dataset.label!==title){
      hand.dataset.label=title
      hand.innerHTML=icon('touch',35)+'<span>'+title+'</span>'
      hand.setAttribute('aria-label',title)
    }
    hand.disabled=!near
    ui.querySelector('[data-action="drop"]').hidden=!me()?.carry||near?.kind==='drop'
  }
  host.dataset.ground=scene.groundItems().join(',')
}

function receive(world){
  if(!session||world?.code!==session.code)return
  const priorZone=currentZone()
  snapshot=world
  scene.apply(world)
  if(priorZone!==currentZone())scene.mark(null)
  scene.show('game',currentZone())
  paintWorld()
  const delivery=world.lastDelivery&&world.cycle+':'+world.lastDelivery.item
  if(delivery&&delivery!==lastDelivery){
    lastDelivery=delivery
    reward(settings)
    const done=world.phase==='finished'
    const item=items.get(world.lastDelivery.item)
    const mission=activeMission()
    const text=done?mission.success:mission.id==='delivery'?item.name+' 배달 완료!':item.name+' 완료!'
    hint(text,done?'★':'✓');talk(text)
  }else if(world.phase==='active'&&world.cycle!==lastCycle&&session.role==='student')talk(guidance())
  const carry=me()?.carry
  if(carry&&carry!==lastCarry&&session.role==='student')talk(guidance())
  lastCarry=carry
  lastCycle=world.cycle
}

async function request(event,payload){
  if(!socket.connected)return {ok:false,error:'network'}
  try{return await socket.timeout(5500).emitWithAck(event,...(payload===undefined?[]:[payload]))}
  catch{return {ok:false,error:'network'}}
}

function accept(reply){
  session={code:reply.code,token:reply.token,role:reply.role,id:reply.id}
  sessionStorage.setItem(roomKey,JSON.stringify(session))
  entryMessage='';panel=null;ready=true;screen='game';initializing=false
  snapshot=reply.world
  if(session.role==='teacher')missionChoice=activeMission().id
  lastDelivery=snapshot.lastDelivery?snapshot.cycle+':'+snapshot.lastDelivery.item:''
  lastCycle=snapshot.cycle;lastCarry=me()?.carry
  scene.setSession(session.role,session.id)
  scene.overview(overview)
  scene.apply(snapshot)
  scene.show('game',currentZone())
  render()
}

function abandon(message=''){
  release()
  sessionStorage.removeItem(roomKey)
  session=null;snapshot=null;screen='lobby';panel=null;ready=false;initializing=false
  lastDelivery='';lastCycle=0;lastCarry=null;teacherZone='town';overview=false;near=null
  stopSpeech();scene.clear();scene.overview(false);scene.show('lobby')
  entryMessage=message
  render()
}

async function enter(event,payload){
  if(pending)return
  pending=true
  const reply=await request(event,payload)
  pending=false
  if(reply.ok)accept(reply)
  else{
    entryMessage=messages[reply.error]??'다시 눌러 주세요.'
    const target=panel==='teacher'?ui.querySelector('.mp-dialog .mp-message'):ui.querySelector('.mp-message')
    if(target)target.textContent=entryMessage
  }
}

function perform(action){
  if(!action||!ready)return
  void request('act',action).then(reply=>{
    if(reply.ok||reply.error==='busy')return
    const text=messages[reply.error]
    if(text){hint(text,reply.error==='wrong-site'&&me()?.carry?items.get(me().carry).symbol:'');talk(text)}
  })
}
function movement(kind,other={}){
  if(!ready||screen!=='game'||session?.role!=='student'||!socket.connected)return
  if(kind==='stop'||kind==='hold'){socket.emit('move',{kind,...other});return}
  void request('move',{kind,...other}).then(result=>{
    if(result.ok)scene.mark(result.point)
    else if(result.error==='blocked')hint(messages.blocked,'•')
  })
}
function startDirection(name,identity){
  if(!ready||panel||held?.identity===identity)return
  release()
  held={name,identity}
  scene.mark(null)
  movement('hold',{direction:name})
  directionTimer=setInterval(()=>movement('hold',{direction:name}),110)
}
function release(identity){
  if(!held||(identity!==undefined&&held.identity!==identity))return
  held=null;clearInterval(directionTimer);directionTimer=null
  movement('stop')
}

async function onAction(action){
  const [name,arg,value]=action.split(':')
  if(name==='settings'||name==='teacher-form'){
    release()
    panel=name==='settings'?'settings':'teacher';entryMessage='';render()
  }else if(name==='close'){
    panel=null;entryMessage='';render()
  }else if(name==='pref'){
    settings[arg]=value==='true'?true:value==='false'?false:value
    if(!settings.voice)stopSpeech()
    updateSettings();render()
  }else if(name==='avatar-prev'||name==='avatar-next'){
    profile.index=(profile.index+characters.length+(name==='avatar-next'?1:-1))%characters.length
    profile.color=characters[profile.index].top
    scene.setAvatar(profile);render()
  }else if(name==='color'){
    profile.color=shirtColors[Number(arg)]
    scene.setAvatar(profile);render()
  }else if(name==='create'){
    await enter('room:create',{pin:document.getElementById('mp-pin')?.value??''})
  }else if(name==='join'){
    await enter('room:join',{code:enteredCode,profile})
  }else if(name==='home'){
    if(session&&ready)await request('room:leave')
    abandon()
  }else if(name==='teacher'&&arg==='end'){
    const element=ui.querySelector('[data-action="teacher:end"]')
    if(element.dataset.armed!=='true'){
      element.dataset.armed='true'
      element.querySelector('span').textContent='종료 확인'
      setTimeout(()=>{if(element.isConnected){element.dataset.armed='false';element.querySelector('span').textContent='종료'}},3000)
    }else await request('teacher',{command:arg})
  }else if(name==='teacher'){
    const reply=await request('teacher',{command:arg,mission:missionChoice})
    if(!reply.ok&&messages[reply.error])hint(messages[reply.error])
    if(reply.ok&&arg==='safe')hint('학생들이 배송 광장으로 이동했어요.','✓')
  }else if(name==='overview'){
    overview=!overview;scene.overview(overview);render()
  }else if(name==='copy-code'){
    try{await navigator.clipboard.writeText(session.code);hint('방 코드를 복사했어요.','✓')}
    catch{hint('방 코드 '+session.code)}
  }else if(name==='listen'){
    talk(guidance())
    if(!settings.voice||!koreanVoice())hint(guidance(),'♪')
  }else if(name==='interact')perform(available())
  else if(name==='drop')perform({kind:'drop'})
  else if(name==='wave')perform({kind:'wave'})
  else if(name==='watch'){
    teacherZone=arg;scene.show('game',currentZone());render()
  }
}

function hitNear(action){
  const own=me()
  if(!own||!action)return false
  const {kind,target}=action,zone=own.zone
  if(kind==='door'){
    const door=doors.find(p=>p.id===target)
    return door&&(zone==='town'?distance(own.point,door.point)<=encounterRange:zone===target&&distance(own.point,exitPoint)<=encounterRange)
  }
  if(snapshot.phase!=='active')return false
  if(kind==='checkout'){
    const pending=snapshot.items.find(p=>p.id===target)
    return zone===clerk.zone&&pending?.checkoutBy&&pending.checkoutBy!==own.id&&distance(own.point,clerk.point)<=clerk.range
  }
  if(kind==='item'&&!own.carry){
    const item=snapshot.items.find(p=>p.id===target)
    return item?.zone===zone&&distance(own.point,item.point)<=encounterRange
  }
  if(kind==='site'&&own.carry){
    const site=activeMission().sites.find(p=>p.id===target)
    return site&&site!==clerk&&zoneOf(site)===zone&&distance(own.point,site.point)<=encounterRange
  }
  if(kind==='peer'&&own.carry){
    const friend=snapshot.players.find(p=>p.id===target)
    return friend?.zone===zone&&distance(own.point,friend.point)<=encounterRange
  }
  return false
}

function paintLabels(){
  requestAnimationFrame(paintLabels)
  if(screen!=='game')return
  const layer=document.getElementById('mp-tags')
  if(!layer)return
  const existing=new Set()
  for(const point of scene.studentLabels()){
    existing.add(String(point.id))
    let tag=layer.querySelector('[data-tag="'+point.id+'"]')
    if(!tag){
      tag=document.createElement('span')
      tag.dataset.tag=point.id
      tag.textContent=point.id===session.id?'나':point.id
      layer.append(tag)
    }
    const text=point.id===session.id?'나':String(point.id)
    if(point.carry){
      const parcel=items.get(point.carry)
      tag.dataset.carry=parcel.id
      tag.style.setProperty('--held',parcel.color)
      if(tag.textContent!==text+' '+parcel.symbol)tag.textContent=text+' '+parcel.symbol
    }else{
      delete tag.dataset.carry
      if(tag.textContent!==text)tag.textContent=text
    }
    tag.dataset.position=point.position
    const transform='translate('+point.x+'px,'+point.y+'px) translate(-50%,-50%)'
    if(tag.style.transform!==transform)tag.style.transform=transform
  }
  for(const tag of [...layer.children])if(!existing.has(tag.dataset.tag))tag.remove()
}

if(scene){
  updateSettings();render()
  requestAnimationFrame(paintLabels)
  socket.on('world',receive)
  socket.on('room:closed',reason=>abandon(messages[reason]??messages.ended))
  socket.on('disconnect',()=>{
    ready=false;release()
    if(screen==='game')paintWorld()
  })
  socket.on('connect',async()=>{
    if(!session){initializing=false;return}
    const reply=await request('room:resume',session)
    if(reply.ok)accept(reply)
    else if(reply.error==='expired')abandon(messages.expired)
    else if(initializing)abandon(messages.network)
  })
  socket.connect()
  void fetch('/game-config').then(r=>r.json()).then(data=>{
    teacherPin=data.teacherPin
    if(panel==='teacher')render()
  }).catch(()=>{})
  document.addEventListener('pointerdown',()=>{if(settings.effects)unlockAudio()},{once:true})
  ui.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]')
    if(button&&!button.disabled)void onAction(button.dataset.action)
  })
  ui.addEventListener('input',event=>{
    if(event.target.id==='room-code'){
      enteredCode=event.target.value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6)
      event.target.value=enteredCode
    }else if(event.target.id==='mp-nickname')profile.nickname=event.target.value
  })
  ui.addEventListener('submit',event=>{
    if(event.target.id!=='mp-join')return
    event.preventDefault()
    if(enteredCode.length!==6){
      ui.querySelector('.mp-message').textContent='교사 화면의 코드 6자리를 넣어요.'
      return
    }
    screen='avatar';entryMessage='';scene.setAvatar(profile);scene.show('avatar');render()
  })
  ui.addEventListener('change',event=>{
    if(event.target.id==='mp-area'){
      teacherZone=event.target.value
      scene.show('game',currentZone())
    }else if(event.target.id==='mp-mission'){
      missionChoice=event.target.value
      paintWorld()
    }
  })
  ui.addEventListener('pointerdown',event=>{
    const button=event.target.closest('button[data-dir]')
    if(!button||!event.isPrimary||event.button!==0)return
    event.preventDefault()
    button.setPointerCapture(event.pointerId)
    startDirection(button.dataset.dir,event.pointerId)
  })
  for(const type of ['pointerup','pointercancel','lostpointercapture'])ui.addEventListener(type,event=>release(event.pointerId),true)
  host.addEventListener('pointerdown',event=>{
    if(event.isPrimary&&event.button===0)press=[event.pointerId,event.clientX,event.clientY]
  })
  host.addEventListener('pointercancel',()=>{press=null})
  host.addEventListener('pointerup',event=>{
    const first=press
    press=null
    if(!first||first[0]!==event.pointerId||Math.hypot(first[1]-event.clientX,first[2]-event.clientY)>18||
      !ready||panel||screen!=='game'||session?.role!=='student')return
    const hit=scene.pick(event.clientX,event.clientY)
    if(hitNear(hit.action))perform(hit.action)
    else if(settings.movement==='tap'&&hit.point)movement('tap',{point:hit.point})
  })
  const keys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'}
  window.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&panel){panel=null;render();return}
    if(screen!=='game'||session?.role!=='student'||panel||!keys[event.key]||
      event.target.closest('input,select,button,textarea'))return
    event.preventDefault()
    startDirection(keys[event.key],event.key)
  })
  window.addEventListener('keyup',event=>release(event.key))
  window.addEventListener('blur',()=>release())
  document.addEventListener('visibilitychange',()=>{if(document.hidden)release()})
}

