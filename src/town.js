import * as T from 'three'
import { places } from './content.js'
import { CROSS_X, crosswalkOccupied, nodes, stopLineLimit } from './game.js'
import { animatePerson, batchStatic, bench, blob, box, cylinder, group, hitBox, label, mat, person, planter, shadow, tree, vehicle, disposeScene } from './models.js'

const grass=0xb6c66c, path=0xf1dfb9, road=0x57697e, trim=0xffeed0
const glass=0x7aa8ca, deepGlass=0x3e668b
function windowAt(g,x,y,z,w=1.72,h=1.63) {
  box(g,trim,x,y,z,w+.19,h+.17,.16)
  box(g,glass,x,y,z+.089,w,h,.06)
  box(g,0xa8c5c3,x-w*.21,y+.12,z+.125,w*.34,h*.67,.012)
  box(g,trim,x,y,z+.14,.075,h,.05)
  box(g,trim,x,y-.03,z+.14,w,.07,.05)
  box(g,0xe8dcc0,x,y-h*.51,z+.19,w+.23,.10,.24)
}
function doorAt(g,x,z,color=deepGlass) {
  box(g,trim,x,1.29,z,1.57,2.57,.2)
  box(g,color,x,1.28,z+.13,1.29,2.37,.14)
  box(g,0xa4beb7,x,1.59,z+.21,1.06,1.28,.018)
  box(g,0xe7c686,x+.41,1.12,z+.25,.09,.15,.07)
  box(g,0xd8cbb0,x,.085,z+.28,1.8,.16,.48)
}
function gable(g,w,d,y,color) {
  const shape=new T.Shape()
  shape.moveTo(-w/2,0)
  shape.lineTo(0,2.15)
  shape.lineTo(w/2,0)
  shape.closePath()
  const roof=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false}),mat(color))
  roof.position.set(0,y,-d/2)
  roof.userData.disposableGeometry=true
  g.add(roof)
  for(const side of [-1,1]){
    const panel=box(g,color,side*w/4,y+1.115,0,Math.hypot(w/2,2.15)+.29,.16,d+.35)
    panel.rotation.z=-side*Math.atan2(2.15,w/2)
  }
}
function storefront(town,p) {
  const g=group(town,p.x,0,p.z)
  const d=8.4,w=p.id==='hospital'?11.5:10.6,h=p.id==='home'?4.35:5.2
  const home=p.id==='home'
  const wall=({home:0xf0dec2,store:0xf0ebd8,cafe:0xe9bd9d,bakery:0xf1d7a0,school:0xeccf96,hospital:0xdce5db})[p.id]
  shadow(g,1.1,.4,w*.68,d*.65,.23)
  box(g,0xc3bc9e,0,.13,0,w+.25,.26,d+.25)
  box(g,wall,0,h/2+.2,0,w,h,d)
  box(g,p.color,0,.57,d/2+.03,w,.64,.1)
  box(g,p.color,w/2+.025,.57,0,.09,.64,d)
  if(home||p.id==='school'||p.id==='bakery') gable(g,w+.36,d+.34,h+.2,p.color)
  else {
    box(g,p.color,0,h+.26,0,w+.45,.27,d+.43)
    box(g,0xe5dfcc,0,h+.42,0,w-.38,.1,d-.42)
    box(g,p.color,0,h+.58,d/2-.12,w+.24,.49,.38)
    box(g,p.color,w/2-.08,h+.53,0,.32,.41,d+.24)
    box(g,0xbfc8ba,2,h+.65,-1.5,1.55,.47,1.22)
  }
  const face=d/2+.045
  doorAt(g,home?0:.11,face,home?0x527697:deepGlass)
  for(const xx of [-3,3]) windowAt(g,xx,home?2.35:1.99,face,home?1.70:2.33,home?1.54:2.01)
  for(const zz of [-2.2,.8,2.5]){
    const side=group(g,w/2+.055,0,zz)
    side.rotation.y=Math.PI/2
    windowAt(side,0,2.48,0,1.35,1.42)
  }
  if(home){
    box(g,0xaf755c,2.8,5.18,-2.1,.78,1.71,.76)
    box(g,0xd6ab8a,2.8,6.04,-2.1,.94,.19,.92)
    const porch=box(g,0x6284a4,0,2.9,face+.39,2.31,.16,.95)
    porch.rotation.x=.13
    label(g,p.name,0,3.43,face+.048,2.75,.67)
    for(const x of [-4.4,4.3]) planter(g,x,4.52,1.38)
  } else {
    const signColor=({store:'#265d9b',cafe:'#9b5949',bakery:'#85582e',hospital:'#52798e',school:'#83563c'})[p.id]
    label(g,p.name,0,4.19,face+.13,6.75,1.13,{bg:signColor,fg:'#fff6df',size:91})
    if(['store','cafe','bakery'].includes(p.id)){
      for(let i=0;i<15;i++){
        const stripe=box(g,i%2?trim:p.color,(i-7)*.55,3.28,face+.41,.55,.15,1.21)
        stripe.rotation.x=.19
        box(g,i%2?trim:p.color,(i-7)*.55,3.06,face+.97,.55,.21,.08)
      }
    }
    if(p.id==='hospital'){
      box(g,0xf4f2e7,3.85,4.17,face+.14,.8,.8,.15)
      box(g,0xca655f,3.85,4.17,face+.23,.47,.15,.06)
      box(g,0xca655f,3.85,4.17,face+.23,.15,.47,.06)
    }
    if(p.id==='school'){
      for(const x of [-4.05,4.05]) windowAt(g,x,4.23,face,.95,.86)
      cylinder(g,0x8f9790,-5.9,2.52,3.52,.038,4.5)
      box(g,0xe19a56,-5.24,4.41,3.52,1.26,.63,.047)
    }
    for(const x of [-4.35,4.28]) planter(g,x,5.15,1.2)
  }
  return g
}
function park(town,p,trees) {
  const g=group(town,p.x,0,p.z)
  box(g,0xa3b968,0,.02,0,19,.16,14)
  box(g,path,0,.115,-.5,2.5,.05,13.3)
  box(g,path,0,.116,.93,18,.05,2)
  const pool=cylinder(g,0x94aeb1,3.8,.30,3,2.37,.50)
  pool.scale.z=1.06
  cylinder(g,0x61aeee,3.8,.58,3,2.05,.08)
  cylinder(g,0xdddcca,3.8,.95,3,.31,.75)
  cylinder(g,0xe7dfc8,3.8,1.32,3,.72,.12)
  blob(g,0xb4e0df,3.8,1.55,3,.135,.39,.135)
  for(const [i,[x,z,s]] of [[-7,-4,1],[-5,4,1.05],[7,-3,.86],[7,4,1.06],[-3,-4,.77]].entries()) trees.push(tree(g,x,z,s,i))
  for(const x of [-6.8,5.3]) planter(g,x,-2.4,2.65)
  for(const x of [-4.7,4.4]) bench(g,x,-.42)
  for(const [i,color] of [0x579c78,0x739ec4,0xc7a967].entries()){
    const x=-7+i*.68
    box(g,color,x,.49,2.8,.55,.95,.55)
    box(g,0x384746,x,.94,2.8,.38,.04,.26)
  }
  for(const x of [-1.4,1.4]) box(g,0x96754c,x,1.23,5.78,.16,2.24,.16)
  label(g,p.name,0,2.14,5.9,3.0,.68,{bg:'#51682d',fg:'#fff5da',size:118})
  return g
}
function busStop(town,p) {
  const g=group(town,p.x,0,p.z+2.3)
  box(g,0xc6bca3,0,.11,0,7,.22,3.82)
  box(g,0x86acbb,0,1.5,-1.1,5.46,2.65,.09)
  for(const x of [-2.76,2.76]){
    for(const z of [-1.2,1]) box(g,0x456a78,x,1.7,z,.15,3.4,.15)
    box(g,0x91b3c2,x,1.63,-.16,.08,2.53,1.92)
  }
  box(g,0x456a78,0,3.38,-.1,6.0,.25,2.82)
  box(g,0xd8dcba,0,3.55,-.1,5.62,.12,2.55)
  bench(g,0,-.47)
  cylinder(g,0x586c64,3.9,1.45,.7,.08,2.9)
  label(g,p.name,0,3.13,1.34,4.7,.59,{bg:'#3e677a',fg:'#fff6dd',size:83})
  label(g,'정류장',3.9,2.7,.74,1.2,.64,{bg:'#fff2d5',fg:'#385a70',size:101})
  return g
}
function streetLamp(p,x,z) {
  cylinder(p,0x52605a,x,1.67,z,.058,3.28)
  box(p,0x52605a,x+.23,3.28,z,.5,.1,.1)
  box(p,0xe8d7a3,x+.45,3.21,z,.25,.11,.22)
}
function signal(p,x,z,faceNorth) {
  const g=group(p,x,0,z)
  g.rotation.y=faceNorth?Math.PI:0
  cylinder(g,0x53605a,0,1.58,0,.09,3.1)
  box(g,0x454e47,0,2.53,.08,.52,1.08,.37)
  box(g,0x343f39,0,3.11,.16,.59,.11,.54)
  const red=blob(g,0xdb6356,0,2.766,.288,.16,.164,.074)
  const green=blob(g,0x405b48,0,2.29,.288,.16,.164,.074)
  return {red,green}
}
export function makeTown() {
  const scene=new T.Scene()
  scene.background=new T.Color(0xe5effa)
  const town=group(scene)
  const trees=[], targets=[]
  box(town,0xdceaf7,0,-2.04,0,240,1.3,200)
  box(town,0x9d9e72,2,-1,0,80,1.4,55)
  box(town,grass,2,-.31,0,80,.67,55)
  for(const [x,z,w,d] of [[-28,-16,16,17],[8,-16,41,17],[33,-15,16,17],[-24,15,19,17],[28,13,14,12]]){
    box(town,0xc7cf81,x,.04,z,w,.09,d)
  }
  box(town,road,2,.086,0,79.9,.16,9.8)
  for(const z of [-5.02,5.02]) box(town,0xc6c6ae,2,.19,z,80,.22,.33)
  for(const z of [-6.35,6.35]){
    box(town,path,2,.13,z,80,.23,2.7)
    for(let i=-38;i<40;i+=2.4) box(town,0xd8cbb0,i,.249,z,.025,.009,2.59)
  }
  for(let x=-36;x<42;x+=3) if(Math.abs(x-CROSS_X)>2.8) box(town,0xe3c179,x,.172,0,1.53,.012,.119)
  for(let z=-4.34;z<4.7;z+=.86) box(town,0xf5edd7,CROSS_X,.174,z,3.36,.012,.43)
  for(const z of [-4.73,4.73]) box(town,0xd6ac64,CROSS_X,.28,z,3.43,.105,.72)
  for(const z of [-6.1,6.1]){
    for(let i=-4;i<=4;i++) for(let j=-1;j<=1;j++) blob(town,0xf2c66c,CROSS_X+i*.25,.297,z+j*.21,.047,.037,.047)
  }
  const signals=[signal(town,CROSS_X+2.45,5.2,false),signal(town,CROSS_X-2.45,-5.2,true)]
  const trafficSignals=[signal(town,CROSS_X-3.3,4.6,false),signal(town,CROSS_X+3.3,-4.6,true)]
  trafficSignals[0].red.parent.rotation.y=-Math.PI/2
  trafficSignals[1].red.parent.rotation.y=Math.PI/2
  for(const p of places){
    if(p.id==='park')park(town,p,trees)
    else if(p.id==='bus')busStop(town,p)
    else storefront(town,p)
    const [bw,bh,bd]=p.id==='park'?[18,2.4,13]:p.id==='bus'?[7.2,3.6,4]:[p.id==='hospital'?11.6:10.7,5.9,8.6]
    const hit=hitBox(town,p.x,bh/2,p.z+(p.id==='bus'?2.3:0),bw,bh,bd)
    hit.userData.target=p.id
    targets.push(hit)
    const [x,z]=nodes[p.id]
    if(p.side==='north') box(town,path,x,.12,-8.41,3,.20,4.12)
    if(p.id==='home'){
      box(town,path,p.x+6,.12,12.94,1.8,.2,13.1)
      box(town,path,p.x+3,.12,z,7.75,.2,1.6)
      for(let i=0;i<5;i++) box(town,0xcda987,p.x-6+i*.74,.46,19.7,.48,.7,.11)
    }
    if(p.id==='park') box(town,path,x,.13,8.25,2.5,.20,2)
  }
  const treePositions=[[-35,11],[-34,19],[-33,24],[-29,24],[-20,24],[-14,17],[-12,23],[-10,10],[-5,18],[0,24],[11,24],[18,23],[21,16],[36,13],[38,22],[40,8],[-35,-20],[-27,-23],[-21,-21],[-15,-23],[-8,-22],[-2,-22],[6,-23],[11,-21],[18,-23],[23,-22],[29,-23],[37,-22],[40,-10],[-36,-7]]
  treePositions.forEach(([x,z],i)=>trees.push(tree(town,x,z,.7+(i%5)*.095,i)))
  for(const x of [-33,-20,-10,5,13,24,37]) for(const side of [-1,1]) streetLamp(town,x,side*5.43)
  for(const x of [-33,-10,12,35]) {bench(town,x,8.45); planter(town,x+2.3,8.6,1.5)}
  for(const [x,z] of [[-31,-6.9],[16,7.46],[-10,7.65],[30,-7.25]]) {
    cylinder(town,0x62776a,x,.49,z,.29,.62)
    cylinder(town,0x43564b,x,.82,z,.30,.075)
  }
  const cars=[
    {x:-34,z:2.36,speed:5.7,model:vehicle(town,0xe7a44e),dir:1},
    {x:-15,z:2.36,speed:7,model:vehicle(town,0x7eabad),dir:1},
    {x:25,z:2.36,speed:6.6,model:vehicle(town,0xe3c65e,true),dir:1},
    {x:36,z:-2.43,speed:6.8,model:vehicle(town,0xd68470),dir:-1},
    {x:10,z:-2.43,speed:6.05,model:vehicle(town,0xe9e0c8),dir:-1},
    {x:-20,z:-2.43,speed:6.55,model:vehicle(town,0x7192b3),dir:-1}
  ]
  cars.forEach(c=>{c.model.position.set(c.x,.17,c.z);c.model.rotation.y=c.dir===1?0:Math.PI})
  const clouds=Array.from({length:4},(_,i)=>{
    const cloud=group(scene,-32+i*22,8+i%2*2.4,-31-i%2*6)
    const white=0xf3f5e7
    blob(cloud,white,0,0,0,3.7,.77,1.52)
    blob(cloud,white,-1,.48,0,1.98,1.02,1.36)
    blob(cloud,white,1,.39,0,1.3,.74,1.11)
    return cloud
  })
  lights(scene)
  const movable=new Set([...trees,...cars.map(c=>c.model),...[...signals,...trafficSignals].flatMap(s=>[s.red,s.green])])
  batchStatic(town,movable)
  return {scene,targets,trees,cars,clouds,signals,trafficSignals,player:null}
}
export function lights(scene) {
  scene.add(new T.HemisphereLight(0xfff5e8,0xb6c6d7,2.25))
  const key=new T.DirectionalLight(0xfff0de,1.83)
  key.position.set(-24,38,18)
  scene.add(key)
  const fill=new T.DirectionalLight(0xd2ebe3,.39)
  fill.position.set(12,10,-17)
  scene.add(fill)
}
function updateTraffic(town,dt,request) {
  const stop=request?.green || request?.crossing
  let clear=true
  for(const dir of [-1,1]){
    const lane=town.cars.filter(c=>c.dir===dir).sort((a,b)=>(b.x-a.x)*dir)
    for(const [i,c] of lane.entries()){
      const half=c===town.cars[2]?3.2:1.68
      const distance=(CROSS_X-c.x)*dir
      const prev=lane[i-1]
      const separation=prev?(prev===town.cars[2]?3.2:1.68)+half+1.18:0
      const limit=prev?Math.max(0,(prev.x-c.x)*dir-separation):Infinity
      const stopDistance=stopLineLimit(distance,half,stop)
      c.x+=dir*Math.min(c.speed*dt,limit,stopDistance)
      if(c.x>46)c.x=-46
      if(c.x< -46)c.x=46
      c.model.position.x=c.x
      c.model.visible=c.x-half>=-38&&c.x+half<=42
      const nextDistance=(CROSS_X-c.x)*dir
      if(crosswalkOccupied(nextDistance,half))clear=false
    }
  }
  for(const s of town.signals){
    s.red.material=mat(stop&&clear?0x815854:0xf05648)
    s.green.material=mat(stop&&clear?0x52df8d:0x405b48)
  }
  for(const s of town.trafficSignals){
    s.red.material=mat(stop?0xf05648:0x815854)
    s.green.material=mat(stop?0x405b48:0x69c882)
  }
  return stop && clear
}
export function createWorld(host) {
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'})
  renderer.outputColorSpace=T.SRGBColorSpace
  renderer.toneMapping=T.ACESFilmicToneMapping
  renderer.toneMappingExposure=1.11
  host.append(renderer.domElement)
  const town=makeTown()
  const trail=group(town.scene)
  const marker=shadow(town.scene,0,0,.64,.52,.32)
  const camera=new T.OrthographicCamera(-1,1,1,-1,.1,230)
  const ray=new T.Raycaster()
  const aim=new T.Vector3(1,0,0), eye=new T.Vector3(), want=new T.Vector3()
  const playerTarget=new T.Vector3()
  let scene=town.scene, room=null, avatar=null, mode='intro', grade='normal', reduced=false, overview=false
  let w=1,h=1, span=55, request=null, status=false, targetFacing=null, walking=false, pose='idle', poseUntil=0, paused=false
  let last=performance.now(), elapsed=0
  let needsPaint=true
  function resize() {
    w=Math.max(1,host.clientWidth)
    h=Math.max(1,host.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,grade==='low'?.8:grade==='high'?1.75:1.35))
    renderer.setSize(w,h,false)
    needsPaint=true
  }
  new ResizeObserver(resize).observe(host)
  resize()
  function view(nextMode) {
    if(room){disposeScene(room.scene);room=null}
    mode=nextMode
    scene=town.scene
    if(town.player) town.player.root.visible=mode==='town'
    if(nextMode==='avatar'){
      scene=new T.Scene()
      scene.background=new T.Color(0xe6eff9)
      lights(scene)
      cylinder(scene,0xcbb68f,0,-.16,0,1.53,.3)
      cylinder(scene,0xf3e5c5,0,.008,0,1.41,.04)
      shadow(scene,0,0,.56,.41,.16)
      room={scene,targets:[]}
    }
    resize()
  }
  function setPlayer(profile,point) {
    if(mode==='avatar'){
      if(avatar) scene.remove(avatar.root)
      avatar=person(scene,profile)
      avatar.root.rotation.y=.37
      return
    }
    if(town.player) town.scene.remove(town.player.root)
    town.player=person(town.scene,profile)
    town.player.root.scale.setScalar(1.15)
    town.player.root.visible=mode==='town'
    snap(point)
  }
  function snap([x,z]) {
    town.player.root.position.set(x,.25,z)
    playerTarget.copy(town.player.root.position)
    targetFacing=null
    walking=false
  }
  function move([x,z]) {
    playerTarget.set(x,.25,z)
    walking=town.player.root.position.distanceTo(playerTarget)>.01
  }
  function guide(from,way,enabled) {
    trail.clear()
    if(!enabled)return
    let start=nodes[from]
    for(const id of way){
      const end=nodes[id]
      if(Math.sign(start[1])!==Math.sign(end[1])) break
      const dx=end[0]-start[0], dz=end[1]-start[1]
      const count=Math.floor(Math.hypot(dx,dz)/1.05)
      for(let i=1;i<=count;i++){
        const t=i/(count+1)
        cylinder(trail,0x467459,start[0]+dx*t,.291,start[1]+dz*t,.105,.027)
      }
      start=end
    }
  }
  function open(interior) {
    if(room)disposeScene(room.scene)
    mode='room'
    room=interior
    scene=room.scene
    want.set(0,1.0,0)
    aim.copy(want)
  }
  function render(now) {
    const dt=Math.min(.65,(now-last)/1000)
    last=now
    requestAnimationFrame(render)
    if(paused&&!needsPaint)return
    needsPaint=false
    if(!paused) elapsed+=dt
    if(mode==='intro'||mode==='town'){
      marker.visible=mode==='town'&&Boolean(town.player)
      if(marker.visible){
        marker.position.x=town.player.root.position.x
        marker.position.y=.261
        marker.position.z=town.player.root.position.z
      }
      if(!paused){
        status=updateTraffic(town,dt,request)
        if(!reduced&&grade!=='low'){
          town.trees.forEach((tree,i)=>{tree.rotation.z=Math.sin(elapsed*1.05+i*.83)*.034})
          town.clouds.forEach((cloud,i)=>{cloud.position.x=-32+i*22+Math.sin(elapsed*.12+i)*3})
        }
        if(mode==='town'&&town.player){
          const p=town.player.root
          const delta=playerTarget.clone().sub(p.position)
          const distance=delta.length()
          if(walking&&distance>.02){
            const step=Math.min(distance,dt*(request?.crossing?6.1:9))
            p.position.addScaledVector(delta,step/distance)
            p.rotation.y=Math.atan2(delta.x,delta.z)
          } else if(walking){
            p.position.copy(playerTarget)
            walking=false
          } else if(targetFacing!==null) p.rotation.y=targetFacing
          animatePerson(town.player,elapsed,walking?'walk':elapsed<poseUntil?pose:'idle')
        }
      }
    } else if(mode==='avatar'&&avatar) {
      avatar.root.rotation.y=.30+(reduced?0:Math.sin(elapsed*.8)*.19)
      animatePerson(avatar,elapsed,elapsed<poseUntil?pose:'idle')
    } else if(mode==='room'&&!paused){
      room?.tick?.(dt,elapsed,elapsed<poseUntil?pose:'idle')
    }
    let targetSpan
    if(mode==='intro'||mode==='town'){
      if(mode==='intro'||overview||!town.player) {
        want.set(mode==='intro'?2:1.7,.12,mode==='intro'?0:1.2)
        targetSpan=Math.max(mode==='intro'?49:53,(mode==='intro'?102:87)/(w/h))
      } else {
        want.copy(town.player.root.position)
        targetSpan=Math.max(22,29/(w/h))
      }
      eye.set(29,37,45)
    } else if(mode==='avatar'){
      want.set(0,1.07,0)
      targetSpan=4.08
      eye.set(2.8,1.85,7.4)
    } else {
      want.set(0,1.13,-.8)
      targetSpan=Math.max(13.1,18/(w/h))
      eye.set(7.25,11.6,17)
    }
    const blend=reduced?1:1-Math.exp(-dt*7)
    aim.lerp(want,blend)
    span+=(targetSpan-span)*blend
    if(aim.distanceToSquared(want)<.0001)aim.copy(want)
    if(Math.abs(span-targetSpan)<.01)span=targetSpan
    camera.position.copy(aim).add(eye)
    camera.lookAt(aim)
    camera.left=-span*w/h/2
    camera.right=span*w/h/2
    camera.top=span/2
    camera.bottom=-span/2
    camera.updateProjectionMatrix()
    renderer.render(scene,camera)
  }
  requestAnimationFrame(render)
  return {
    view, setPlayer, open, snap, move, guide,
    isWalking:()=>walking,
    face:(angle)=>{targetFacing=angle},
    play:(next)=>{pose=next;poseUntil=elapsed+1.35},
    setTraffic:(state)=>{request=state},
    trafficClear:()=>status,
    overview:(value)=>{overview=value},
    pause:(value)=>{paused=value},
    quality:(value,less)=>{grade=value;reduced=less;resize()},
    hit(x,y){
      const r=renderer.domElement.getBoundingClientRect()
      if(x<r.left||x>r.right||y<r.top||y>r.bottom)return null
      ray.setFromCamera(new T.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),camera)
      const list=mode==='town'?town.targets:room?.targets ?? []
      for(const hit of ray.intersectObjects(list,true)){
        for(let o=hit.object;o;o=o.parent) if(o.userData.target)return o.userData.target
      }
      return null
    },
    project(x,y,z){
      const v=new T.Vector3(x,y,z).project(camera)
      return {x:(v.x+1)*w/2,y:(1-v.y)*h/2,visible:Math.abs(v.x)<1.02&&Math.abs(v.y)<1.04}
    }
  }
}

