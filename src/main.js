import './style.css'
import { createWorld } from './town.js'
import { characters, missions, places, products, shirtColors } from './content.js'
import { advance, canCross, changeSignal, isCrossing, newRun, nodes, route, safety, shopAction } from './game.js'
import { koreanVoice, music, readPrefs, readRecords, readRun, resetProgress, reward, savePrefs, saveRecords, saveRun, speak, stopSpeech } from './services.js'
import { icon } from './icons.js'

const app=document.querySelector('#app')
const ui=document.querySelector('#ui')
const host=document.querySelector('#world')
const formatPrice=new Intl.NumberFormat('ko-KR')
const prefs=readPrefs()
if(matchMedia('(prefers-reduced-motion: reduce)').matches)prefs.reduced=true
let records=readRecords(), run=readRun()
let screen='intro', overlay=null, profile={index:0,color:characters[0].top,nickname:''}
let mode='mission', journey=[], segment=null, destination=null, signal=null, looking=null, overview=false, place=null, room=null
let notice='', lastVoice='', busy=false, lastAction='', lastActionTime=0, musicStarted=false
let homeReceived=false, roomMoving=false, press=null, previousTouch=null
let world
try{
  world=createWorld(host)
} catch {
  app.className='unavailable'
  ui.innerHTML='<section class="panel error"><h1>3D 마을을 열 수 없어요</h1><p>브라우저에서 WebGL 2와 하드웨어 가속을 켠 뒤 다시 시도해 주세요.</p><button class="button primary" onclick="location.reload()">다시 시도하기</button></section>'
}
const safe=(s='')=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
const byId=id=>places.find(p=>p.id===id)
const next=()=>missions[run?.mission]?.steps[run?.step]
const money=n=>formatPrice.format(n)+'원'
const objectParticle=name=>((name.charCodeAt(name.length-1)-44032)%28===0?'를':'을')
const subjectParticle=name=>((name.charCodeAt(name.length-1)-44032)%28===0?'가':'이')
const redLabel='빨간불 · 기다려요'
const greenLabel='초록불 · 안전 확인'
const goLabel='횡단보도를 건너고 있어요'
const initialShop=()=>({phase:'list',item:null,method:null})
function button(text,action,symbol,variant='',extra=''){
  return '<button type="button" class="button '+variant+'" data-action="'+action+'" '+extra+'>'+(symbol?icon(symbol):'')+'<span>'+text+'</span></button>'
}
function switcher(title,key,values){
  return '<fieldset class="setting"><legend>'+title+'</legend><div class="segmented">'+values.map(([value,label])=>button(label,'pref:'+key+':'+value,null,String(prefs[key])===String(value)?'selected':'','aria-pressed="'+(String(prefs[key])===String(value))+'"')).join('')+'</div></fieldset>'
}
function intro(){
  return `<section class="landing">
    <header class="brand"><span class="brand-mark">${icon('home',25)}</span><span>MY TOWN</span></header>
    <div class="landing-content">
      <h1>우리 동네<br>생활 체험<span class="title-period" aria-hidden="true">.</span></h1>
      <p class="subtitle">함께 떠나는 즐거운 일상생활 탐험</p>
      <div class="start-actions">
        ${button('게임 시작','start:mission','play','primary start')}
        <div class="mode-buttons">${button('자유 체험','start:free','map')}${button('미션 체험','start:mission','list')}</div>
        ${button('이어하기','resume','clock','resume',run?'':'disabled')}
      </div>
    </div>
    <footer class="landing-footer">
      ${button('설정','settings','settings','quiet')}
      ${button('게임 이용 방법','help','help','quiet')}
    </footer>
  </section>
  <div class="preview-ui">
    <div class="preview-heading">${icon('map',20)}<span>우리 동네 지도</span></div>
    <div class="preview-bottom">
      <div class="preview-caption"><span class="preview-pin">${icon('pin',23)}</span><div><strong>우리 동네</strong><span>우리 집에서 편의점까지</span></div></div>
      ${button('전체 화면','fullscreen','full','glass')}
    </div>
  </div>${notice?'<div class="notice" role="status">'+safe(notice)+'</div>':''}`
}
function avatar(){
  return `<section class="avatar-panel panel">
    <div class="avatar-header"><div class="brand"><span class="brand-mark">${icon('person',23)}</span><span>캐릭터 선택</span></div><h1>누구와 떠날까요?</h1><p>함께 마을을 탐험할 캐릭터를 골라요.</p></div>
    <div class="select-character">
      ${button('이전','prev-avatar','left','compact')}
      <div><strong>${characters[profile.index].name}</strong><span>${profile.index+1} / ${characters.length}</span></div>
      ${button('다음','next-avatar','right','compact')}
    </div>
    <fieldset class="swatches"><legend>옷 색상</legend>
    ${shirtColors.map((c,i)=>'<button type="button" data-action="color:'+i+'" class="swatch'+(c===profile.color?' active':'')+'" style="--swatch:'+c+'" aria-label="'+['파랑','초록','빨강','주황','보라','하늘색'][i]+'" aria-pressed="'+(c===profile.color)+'">'+(c===profile.color?icon('check',20):'')+'</button>').join('')}
    </fieldset>
    <label class="nickname">닉네임 <span>선택 사항</span><input maxlength="16" autocomplete="off" placeholder="이름 없이 시작할 수 있어요" value="${safe(profile.nickname)}"></label>
    <div class="avatar-actions">${button('뒤로 가기','home','back','quiet')}${button('캐릭터 선택 완료','confirm-avatar','check','primary')}</div>
  </section>`
}
function statusBar(){
  const location=screen==='home'?'우리 집':screen==='store'?'편의점':signal?'횡단보도':'우리 동네'
  const step=next()
  const heading=signal?signalTitle():step?.text??(screen==='town'?'가고 싶은 곳을 눌러요.':location+'에서 체험해요.')
  return `<header class="game-header"><div class="location-pill">${icon('pin',20)}<span>${location}</span></div>
    <div class="game-goal"><span class="goal-icon">${icon(signal?'cross':step?.icon??'map',23)}</span><div>
    <span class="goal-context">${run.mission?(missions[run.mission].title+' · '+Math.min(run.step+1,missions[run.mission].steps.length)+'/'+missions[run.mission].steps.length):'자유 체험'}</span>
    <strong>${heading}</strong></div></div>
    ${run.mission?button('미션 보기','mission','list','glass') : ''}
  </header>`
}
function utilities(){
  return `<nav class="utilities" aria-label="게임 조작">
    ${button('다시 듣기','listen','sound','quiet')}
    ${screen==='town'&&!signal?button(overview?'가까이 보기':'지도 보기','map','map','quiet'):''}
    ${button('도움말','help','help','quiet')}
    ${button('일시정지','pause','pause','quiet')}
  </nav>`
}
function signalTitle(){
  if(signal.crossing)return goLabel
  return signal.stopped?greenLabel:redLabel
}
function crossing(){
  if(signal.crossing)return `<section class="action-card panel"><div class="signal-card"><div class="light green"></div><div><strong>${goLabel}</strong><span>횡단보도 위로 걸어가요.</span></div></div></section>`
  const light=signal.stopped?'green':'red'
  const hint=!signal.green?'빨간불일 때는 인도에서 기다려요.':
    !signal.stopped?'차가 멈출 때까지 기다려요.':
    !signal.left||!signal.right?'왼쪽과 오른쪽을 살펴봐요.':'차가 멈췄어요. 이제 안전하게 건너요.'
  const controls=!signal.green?button('기다리기','wait','clock','primary'):
    !signal.stopped?button('건너기','cross','person','', 'aria-describedby="safety-hint"'):
    (!canCross(signal)?
      button(signal.left?'왼쪽 확인 완료':'왼쪽 살피기','look:left',signal.left?'check':'eye','',signal.left?'disabled':'')+
      button(signal.right?'오른쪽 확인 완료':'오른쪽 살피기','look:right',signal.right?'check':'eye','',signal.right?'disabled':''):
      button('건너기','cross','person','primary'))
  return `<section class="action-card panel"><div class="signal-card"><div class="light ${light}"></div>
    <div><strong>${signalTitle()}</strong><span id="safety-hint">${hint}</span></div></div>
    <div class="action-buttons">${controls}</div></section>`
}
function placePins(){
  return '<div class="pins">'+places.filter(p=>overview||!prefs.direct).map(p=>
    '<button type="button" data-pin="'+p.id+'" data-action="go:'+p.id+'" class="place-pin'+(prefs.easy&&next()?.place===p.id?' target-pin':'')+'" '+((journey.length||segment||signal)?'disabled':'')+'>'+icon(p.open?(p.id==='home'?'home':'store'):'pin',17)+'<span>'+p.name+'</span></button>').join('')+'</div>'
}
function townCard(){
  if(signal)return crossing()
  if(segment||journey.length){
    return `<section class="action-card panel moving">${icon('person',26)}<strong>${destination?byId(destination)?.name+'으로 가고 있어요.':'인도를 따라 걸어요.'}</strong></section>`
  }
  const p=byId(place)
  if(p){
    return `<section class="action-card panel"><div class="action-text"><strong>${p.name}</strong><span>${p.open?'도착했어요. 들어가 볼까요?':'이 장소의 체험은 준비 중이에요.'}</span></div>
    <div class="action-buttons">${p.open?button('들어가기','enter:'+p.id,'enter','primary'):''}${prefs.direct?button('계속 걷기','keep-walking','person'):!p.open?button('다른 장소 찾기','map','map'):''}</div></section>`
  }
  if(prefs.direct){
    return `<section class="action-card panel direct"><strong>방향 버튼으로 걸어요.</strong><div class="action-buttons">
      ${button('왼쪽','walk:left','left')}${button('앞으로','walk:up','up')}${button('뒤로','walk:down','down')}${button('오른쪽','walk:right','right')}
    </div></section>`
  }
  return `<section class="action-card panel explore"><div class="action-text"><strong>어디로 갈까요?</strong><span>건물이나 장소 이름을 눌러요.</span></div>
    ${prefs.easy&&next()?button(byId(next().place).name+' 가기','go:'+next().place,'pin','primary'):''}</section>`
}
function homeCard(){
  const step=next()?.id
  let heading='우리 집에 왔어요.', hint='마을에 나가서 원하는 장소를 골라요.', controls=''
  if(step==='brief'){
    heading='우유를 사 오세요'
    hint='편의점에서 우유를 사 와요. 먼저 카드와 가방을 받아요.'
    controls=button('카드와 가방 받기','brief','bag','primary')
  }else if(step==='return'){
    heading='우유를 가져왔어요!'
    hint='집에 돌아왔어요. 가족에게 우유를 전해요.'
    controls=button('우유 전하기','finish','milk','primary')
  }else if(!run.mission&&!homeReceived){
    hint='가족에게 인사하고 준비물을 받아요.'
    controls=button('준비물 받기','home-free','bag','primary')
  }else if(run.step===5){
    heading='심부름을 마쳤어요!'
    hint='편의점에서 사 온 우유를 가족에게 전했어요.'
  }
  if(step!=='brief')controls+=button('마을로 나가기','leave','enter',controls?'':'primary')
  return `<section class="action-card panel"><div class="action-text"><strong>${heading}</strong><span>${hint}</span></div><div class="action-buttons">${controls}</div></section>`
}
function storeCard(){
  const shop=run.shop
  const item=products.find(p=>p.id===shop.item)
  let heading='', hint='', controls='', choices=''
  switch(shop.phase){
    case 'list':
      heading=next()?.id==='choose'?'우유를 찾아요.':'무엇을 살까요?'
      hint='진열대에서 살 물건을 골라요.'
      controls=button('물건 고르기','shop:start','bag','primary')
      break
    case 'choose':
      heading=next()?.id==='choose'?'우유를 골라요.':'살 물건을 골라요.'
      hint='진열대의 물건이나 아래 이름을 눌러요.'
      choices='<div class="products">'+products.slice(0,prefs.easy?3:8).map(p=>
        '<button type="button" class="product" data-action="shop:choose:'+p.id+'"><span class="product-swatch '+p.id+'" style="--package:#'+p.color.toString(16)+';--stripe:#'+p.accent.toString(16)+'"></span><span>'+p.name+'</span></button>').join('')+'</div>'
      break
    case 'picked':
      heading=item.name+objectParticle(item.name)+' 골랐어요.'
      hint='고른 물건을 장바구니에 넣어요.'
      controls=button('장바구니에 담기','shop:basket','bag','primary')
      break
    case 'basket':
      heading='장바구니에 '+item.name+subjectParticle(item.name)+' 있어요.'
      hint='계산대로 가요.'
      controls=button('계산대로 가기','shop:counter','store','primary')
      break
    case 'method':
      heading=item.name+' · '+money(item.price)
      hint='어떤 방법으로 내고 싶나요?'
      controls=button('카드','shop:method:card','card')+button('현금','shop:method:cash','bag')
      break
    case 'pay':
      heading=item.name+' · '+money(item.price)
      hint=shop.method==='cash'?'금액을 확인하고 현금을 내요.':'카드를 단말기에 찍어요.'
      controls=button(shop.method==='cash'?'현금 내기':'카드 찍기','shop:pay',shop.method==='cash'?'bag':'card','primary')
      break
    case 'collect':
      heading='계산을 마쳤어요.'
      hint='받은 물건을 확인해요.'
      controls=button('물건 받기','shop:collect','bag','primary')
      break
    default:
      heading=item.name+objectParticle(item.name)+' 받았어요.'
      hint=run.mission?'집에 돌아가 가족에게 우유를 전해요.':'마을로 돌아가 다른 곳에 가 볼까요?'
      break
  }
  if(roomMoving){
    hint=shop.phase==='picked'?'진열대로 가고 있어요.':'계산대로 가고 있어요.'
    controls=controls.replaceAll('data-action="shop:','disabled data-action="shop:')
  }
  return `<section class="action-card panel store-card"><div class="store-line"><div class="action-text"><strong>${heading}</strong><span>${hint}</span></div>
    <div class="action-buttons">${controls}${button('마을로 나가기','leave','enter',controls?'quiet':'')}</div></div>${choices}</section>`
}
function gameScreen(){
  return statusBar()+(screen==='town'&&!signal&&!segment&&!journey.length?placePins():'')+
    (notice?'<div class="notice" role="status">'+safe(notice)+'</div>':'')+
    '<div class="game-bottom">'+(screen==='town'?townCard():screen==='home'?homeCard():storeCard())+utilities()+'</div>'
}
function dialog(){
  if(!overlay)return ''
  let title='', body='', actions=button('뒤로 가기','close','back','quiet')
  if(overlay==='settings'){
    title='설정'
    body='<div class="settings-grid">'+
      switcher('도움 설정','easy',[[true,'쉬운 모드'],[false,'기본 모드']])+
      switcher('기기 모드','device',[['tablet','태블릿'],['board','전자칠판']])+
      switcher('이동 방식','direct',[[false,'터치 이동'],[true,'방향 버튼']])+
      switcher('그래픽','quality',[['low','낮음'],['normal','보통'],['high','높음']])+
      switcher('화면 움직임 줄이기','reduced',[[false,'끄기'],[true,'켜기']])+
      switcher('한국어 음성 안내','voice',[[true,'켜기'],[false,'끄기']])+
      switcher('효과음','effects',[[true,'켜기'],[false,'끄기']])+
      switcher('배경음악','music',[[true,'켜기'],[false,'끄기']])+'</div>'+
      '<label class="volume">음량 <input type="range" min="0" max="1" step=".05" value="'+prefs.volume+'"></label>'+
      (!koreanVoice()?'<p class="dialog-note">이 브라우저에서 한국어 음성을 찾지 못했어요. 그림과 글로 안내해요.</p>':'')
    actions+=button('활동 기록 초기화','reset','clock','danger')
  }
  if(overlay==='help'){
    title='게임 이용 방법'
    body=`<ol class="help-list">
      <li><span>${icon('touch')}</span><div><strong>장소를 한 번 눌러요.</strong><p>캐릭터가 인도를 따라 걸어요. 도착하면 ‘들어가기’를 눌러요.</p></div></li>
      <li><span>${icon('cross')}</span><div><strong>횡단보도에서 멈춰요.</strong><p>초록불이 켜지고 차가 멈추면 양쪽을 살핀 뒤 건너요.</p></div></li>
      <li><span>${icon('list')}</span><div><strong>아래에 나오는 활동을 해요.</strong><p>안내를 다시 들으려면 ‘다시 듣기’를 눌러요.</p></div></li>
    </ol>`
  }
  if(overlay==='pause'){
    title='잠시 쉬어요'
    body='<p>준비되면 이어서 체험해요.</p>'
    actions=button('계속하기','close','play','primary')+button('설정','settings','settings')+button('홈으로 이동','home','home','quiet')
  }
  if(overlay==='mission'){
    title=missions[run.mission].title
    body='<ol class="progress-list">'+missions[run.mission].steps.map((s,i)=>
      '<li class="'+(i<run.step?'complete':i===run.step?'current':'')+'"><span>'+icon(i<run.step?'check':s.icon)+'</span><div>'+s.text+(i===run.step?' <small>지금 할 일</small>':'')+'</div></li>').join('')+'</ol>'
  }
  if(overlay==='reset'){
    title='활동 기록을 지울까요?'
    body='<p>이 브라우저에 저장된 캐릭터, 이어하기, 체험 기록이 삭제돼요. 이전 기록을 복구할 수 없어요.</p>'
    actions=button('취소','settings','back')+button('기록 지우기','reset-yes','check','danger')
  }
  if(overlay==='success'){
    title='우유 심부름 성공!'
    body='<div class="success-star">'+icon('star',72)+'</div><p>횡단보도를 안전하게 건너고, 우유를 사서 가족에게 전했어요.</p>'
    actions=button('마을 체험 계속하기','close','map','primary')+button('홈으로 이동','home','home')
  }
  return '<div class="scrim"><section class="dialog panel" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-main"><h2 id="dialog-title" tabindex="-1">'+title+'</h2>'+body+'</div><footer class="dialog-actions">'+actions+'</footer></section></div>'
}
function render(){
  app.className=screen+(prefs.device==='board'?' board':'')+(prefs.reduced?' reduce':'')
  ui.innerHTML=(screen==='intro'?intro():screen==='avatar'?avatar():gameScreen())+dialog()
  if(overlay){
    for(const el of [...ui.children].slice(0,-1))el.inert=true
  }
  updatePins()
}
function updatePins(){
  if(screen!=='town'||overlay)return
  for(const button of ui.querySelectorAll('[data-pin]')){
    const p=byId(button.dataset.pin)
    const scale=overview?1:0
    const isBuilding=!['bus','park'].includes(p.id)
    const point=world.project(p.x,isBuilding?(p.id==='home'?7.9:7.6):p.id==='bus'?4.5:3.6,p.z+(isBuilding?1.7:0))
    button.hidden=!point.visible||point.y<89||point.y>host.clientHeight-(scale?93:158)
    button.style.transform='translate('+Math.round(point.x)+'px,'+Math.round(point.y)+'px) translate(-50%,-50%)'
  }
}
function persist(){saveRun(run)}
function say(text,auto=true){
  lastVoice=text
  if(!auto||prefs.easy)speak(text,prefs)
}
function autoForScreen(){
  const text=ui.querySelector('.action-text strong')?.textContent??next()?.text
  if(text)say(text)
}
function showNotice(text){
  notice=text
  render()
  say(text)
}
function clearNavigation(){
  journey=[];segment=null;destination=null;signal=null;looking=null;place=null;overview=false
  world.setTraffic(null)
  world.overview(false)
  world.guide(null,[],false)
}
function openDialog(name){
  overlay=name
  world.pause(true)
  render()
  ui.querySelector('#dialog-title')?.focus()
}
function closeDialog(){
  overlay=null
  world.pause(false)
  render()
}
function landing(){
  screen='intro'
  if(run)persist()
  busy=false
  overlay=null
  room=null
  notice=''
  clearNavigation()
  world.pause(false)
  world.view('intro')
  stopSpeech()
  render()
}
function openAvatar(nextMode){
  mode=nextMode
  profile=run?{...run.character}:{index:0,color:characters[0].top,nickname:''}
  screen='avatar'
  notice=''
  world.view('avatar')
  world.setPlayer(profile)
  world.play('wave')
  render()
}
async function enter(id){
  if(busy)return
  busy=true
  const enteringRun=run
  notice=''
  try{
    const {makeInterior}=await import('./interiors.js')
    if(run!==enteringRun||screen==='intro')return
    clearNavigation()
    room=makeInterior(id,run.character,prefs.easy)
    homeReceived=false
    roomMoving=false
    if(id==='store'&&run.shop.item){
      const phase=run.shop.phase
      const item=products.findIndex(p=>p.id===run.shop.item)
      room.placeAt(['picked','basket'].includes(phase)?-5.18+(item%4)*1.75:4.09,1.82)
      room.showPurchase(run.shop.item,phase)
    }
    run.room=id
    run.node=id
    screen=id
    world.open(room)
    persist()
    render()
    autoForScreen()
  }catch(e){
    console.error(e)
    showNotice('장소를 여는 데 시간이 걸려요. 다시 눌러 주세요.')
  }finally{
    busy=false
  }
}
function town(node){
  clearNavigation()
  notice=''
  room=null
  overlay=null
  screen='town'
  run.node=node
  run.room=null
  world.pause(false)
  world.view('town')
  world.setPlayer(run.character,nodes[node])
  if(node==='home')world.face(0)
  if(node==='store')world.face(.3)
  overview=true
  world.overview(true)
  persist()
  render()
  if(next())say(next().text)
}
function finishPlace(id){
  if(records.places.includes(id))return
  records.places.push(id)
  saveRecords(records)
}
function arrive(){
  const id=destination
  destination=null
  place=id??(byId(run.node)?run.node:null)
  if(place){
    world.face(place==='home'?0:Math.PI)
    say(byId(place).open?byId(place).name+'에 도착했어요. 들어가요.':byId(place).name+' 체험은 준비 중이에요.')
  }
  render()
}
function takeSegment(){
  world.guide(run.node,journey,prefs.easy)
  if(!journey.length){arrive();return}
  const id=journey[0]
  if(isCrossing(run.node,id)){
    overview=false
    world.overview(false)
    world.face(run.node==='cross-south'?Math.PI:0)
    signal=safety()
    world.setTraffic(signal)
    notice=''
    render()
    say('빨간불이에요. 기다려요.')
    return
  }
  segment=journey.shift()
  world.move(nodes[segment])
  render()
}
function initiate(id){
  if(screen!=='town'||segment||journey.length||signal||!byId(id))return
  notice=''
  if(id===run.node){place=id;render();return}
  const way=route(run.node,id)
  if(!way.length)return
  destination=id
  place=null
  overview=false
  world.overview(false)
  journey=way
  say(byId(id).name+'으로 가요.')
  takeSegment()
}
function directMove(direction){
  if(segment||signal||journey.length)return
  const [x,z]=nodes[run.node]
  const choices=Object.keys(nodes).filter(id=>{
    const [a,b]=nodes[id]
    const matches={left:b===z&&a<x,right:b===z&&a>x,up:a===x&&b<z,down:a===x&&b>z}[direction]
    return matches&&route(run.node,id).length===1
  })
  const id=choices[0]
  if(!id){showNotice('이쪽에는 걸을 수 있는 길이 없어요.');return}
  place=null
  overview=false
  notice=''
  world.overview(false)
  journey=[id]
  takeSegment()
}
function changeAvatar(index,color=characters[index].top){
  profile={...profile,index,color}
  world.setPlayer(profile)
  render()
}
function shop(action,value){
  if(screen!=='store'||roomMoving)return
  const old=run.shop
  const newShop=shopAction(old,action,value,{easy:prefs.easy,needMilk:next()?.id==='choose'})
  if(newShop===old){
    if(action==='choose'&&next()?.id==='choose'&&value!=='milk')showNotice('이번 심부름은 우유예요. 우유를 다시 찾아봐요.')
    return
  }
  notice=''
  run.shop=newShop
  if(action==='choose'){
    run=advance(run,'choose')
    const itemIndex=products.findIndex(p=>p.id===value)
    room.travel(-5.18+(itemIndex%4)*1.75,1.86)
  }
  if(action==='counter')room.travel(4.09,1.82)
  roomMoving=room.isWalking()
  room.showPurchase(newShop.item,newShop.phase)
  if(action==='pay')reward(prefs)
  if(action==='collect'){
    run=advance(run,'pay')
    finishPlace('store')
    world.play('receive')
  }
  persist()
  render()
  autoForScreen()
}
function preference(key,val){
  if(!(key in prefs))return
  prefs[key]=val==='true'?true:val==='false'?false:val
  savePrefs(prefs)
  world.quality(prefs.quality,prefs.reduced)
  if(!prefs.voice)stopSpeech()
  music(prefs)
  render()
  ui.querySelector('[data-action="pref:'+key+':'+val+'"]')?.focus()
}
async function act(action){
  const [name,arg,value]=action.split(':')
  const now=performance.now()
  if(name!=='listen'&&action===lastAction&&now-lastActionTime<350)return
  lastAction=action
  lastActionTime=now
  if(busy&&name!=='home')return
  if(prefs.music&&!musicStarted){music(prefs);musicStarted=true}
  if(name==='start')openAvatar(arg)
  if(name==='home')landing()
  if(name==='resume'&&run){
    profile={...run.character}
    if(run.room){screen='town';await enter(run.room)}
    else town(run.node)
  }
  if(name==='prev-avatar'||name==='next-avatar')changeAvatar((profile.index+(name==='prev-avatar'?-1:1)+characters.length)%characters.length)
  if(name==='color')changeAvatar(profile.index,shirtColors[Number(arg)])
  if(name==='confirm-avatar'){
    run=newRun(mode,{...profile})
    screen='town'
    persist()
    await enter('home')
  }
  if(['help','settings','pause','mission','reset'].includes(name))openDialog(name)
  if(name==='close')closeDialog()
  if(name==='reset-yes'){
    resetProgress()
    run=null
    records=readRecords()
    landing()
  }
  if(name==='fullscreen'){
    if(document.fullscreenElement)await document.exitFullscreen?.()
    else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen().catch(()=>showNotice('브라우저의 전체 화면 설정을 이용해 주세요.'))
  }
  if(name==='pref')preference(arg,value)
  if(name==='listen'){
    if(!prefs.voice||!koreanVoice()){
      showNotice(!prefs.voice?'설정에서 한국어 음성 안내를 켤 수 있어요.':'한국어 음성 없이 그림과 글로 체험할 수 있어요.')
    }else speak(lastVoice||next()?.text,prefs)
  }
  if(name==='brief'&&screen==='home'&&next()?.id==='brief'){
    run=advance(run,'brief')
    finishPlace('home')
    world.play('receive')
    persist()
    render()
    say('카드와 가방을 받았어요. 편의점에 가요.')
  }
  if(name==='home-free'){
    homeReceived=true
    finishPlace('home')
    world.play('receive')
    render()
    say('준비물을 받았어요.')
  }
  if(name==='finish'&&screen==='home'&&next()?.id==='return'){
    run=advance(run,'return')
    if(!records.missions.includes(run.mission))records.missions.push(run.mission)
    saveRecords(records)
    finishPlace('home')
    persist()
    world.play('happy')
    reward(prefs)
    say('잘했어요! 우유 심부름을 마쳤어요.')
    overlay='success'
    render()
    ui.querySelector('#dialog-title').focus()
  }
  if(name==='leave')town(run.room)
  if(name==='enter'&&place===arg&&byId(arg)?.open){
    if(arg==='store'&&run.shop.phase==='done'&&(!run.mission||run.step===5))run.shop=initialShop()
    await enter(arg)
  }
  if(name==='map'&&screen==='town'&&!signal&&!segment){
    place=null
    overview=!overview
    if(!overview&&!prefs.direct&&run.node==='home')world.face(.3)
    world.overview(overview)
    render()
  }
  if(name==='go')initiate(arg)
  if(name==='keep-walking'){place=null;render()}
  if(name==='walk'&&screen==='town')directMove(arg)
  if(name==='wait'&&signal&&!signal.green){
    signal=changeSignal(signal,'green')
    world.setTraffic(signal)
    notice=''
    render()
    say('차가 멈출 때까지 기다려요.')
  }
  if(name==='look'&&signal?.stopped&&!signal.crossing){
    signal=changeSignal(signal,arg)
    looking=arg
    world.face(arg==='left'?(run.node==='cross-south'?-Math.PI/2:Math.PI/2):(run.node==='cross-south'?Math.PI/2:-Math.PI/2))
    render()
    say(canCross(signal)?'양쪽을 살폈어요. 이제 건너요.':(looking==='left'?'왼쪽을 확인했어요. 오른쪽도 살펴요.':'오른쪽을 확인했어요. 왼쪽도 살펴요.'))
  }
  if(name==='cross'){
    if(!signal||!canCross(signal)||!world.trafficClear()){showNotice('아직 건널 수 없어요. 신호와 자동차를 확인해요.');return}
    signal=changeSignal(signal,'cross')
    world.setTraffic(signal)
    notice=''
    segment=journey.shift()
    world.move(nodes[segment])
    render()
    say('안전하게 횡단보도를 건너요.')
  }
  if(name==='shop')shop(arg,value)
}
function update(){
  if(!overlay&&screen==='store'&&roomMoving&&!room.isWalking()){
    roomMoving=false
    render()
    autoForScreen()
  }
  if(!overlay&&screen==='town'){
    if(signal?.green&&!signal.stopped&&world.trafficClear()){
      signal=changeSignal(signal,'stopped')
      notice=''
      render()
      say('초록불이에요. 자동차가 멈췄어요. 양쪽을 살펴요.')
    }
    if(segment&&!world.isWalking()){
      run.node=segment
      segment=null
      if(signal?.crossing){
        signal=null
        world.setTraffic(null)
        if(run.node==='cross-north')run=advance(run,'cross')
      }
      persist()
      takeSegment()
    }
    updatePins()
  }
  requestAnimationFrame(update)
}
if(world){
  world.quality(prefs.quality,prefs.reduced)
  render()
  requestAnimationFrame(update)
  ui.addEventListener('click',event=>{
    const b=event.target.closest('button[data-action]')
    if(!b||b.disabled)return
    if(event.detail>0&&/^(shop:|brief$|finish$|cross$)/.test(b.dataset.action)){
      const point={x:event.clientX,y:event.clientY,time:performance.now()}
      if(previousTouch&&point.time-previousTouch.time<240&&Math.hypot(point.x-previousTouch.x,point.y-previousTouch.y)<12)return
      previousTouch=point
    }
    void act(b.dataset.action)
  })
  ui.addEventListener('input',event=>{
    if(event.target.matches('.nickname input'))profile.nickname=event.target.value
    if(event.target.matches('.volume input')){
      prefs.volume=Number(event.target.value)
      savePrefs(prefs)
      music(prefs)
    }
  })
  host.addEventListener('pointerdown',event=>{
    if(event.isPrimary&&event.button===0)press={id:event.pointerId,x:event.clientX,y:event.clientY}
  })
  host.addEventListener('pointercancel',()=>{press=null})
  host.addEventListener('pointerup',event=>{
    if(!event.isPrimary||event.button!==0||overlay||busy)return
    const down=press
    press=null
    if(!down||down.id!==event.pointerId||Math.hypot(down.x-event.clientX,down.y-event.clientY)>16)return
    const hit=world.hit(event.clientX,event.clientY)
    if(screen==='town'&&hit)void act('go:'+hit)
    if(screen==='store'&&hit?.startsWith('product:'))void act('shop:choose:'+hit.slice(8))
    if(screen==='store'&&hit==='counter')void act('shop:counter')
  })
  document.addEventListener('keydown',event=>{
    if(overlay&&event.key==='Escape'){closeDialog();return}
    if(overlay&&event.key==='Tab'){
      const focusable=[...ui.querySelectorAll('button:not(:disabled),input')].filter(el=>el.closest('.dialog'))
      if(event.shiftKey&&(document.activeElement===focusable[0]||document.activeElement.id==='dialog-title')){
        event.preventDefault();focusable.at(-1)?.focus()
      }else if(!event.shiftKey&&document.activeElement===focusable.at(-1)){
        event.preventDefault();focusable[0]?.focus()
      }
    }
  })
}

