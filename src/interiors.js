import * as T from 'three'
import { products } from './content.js'
import { animatePerson, batchStatic, blob, box, cylinder, disposeScene, group, label, mat, person, planter, shadow } from './models.js'
import { lights } from './town.js'

const wood=0xb78158, oak=0xd6a378, cream=0xf0e4cc, blue=0x709cca, dark=0x435c57
function roomStage(kind) {
  const scene=new T.Scene()
  const store=kind==='store'
  scene.background=new T.Color(store?0xe6edf7:0xf1e5cb)
  const g=group(scene)
  box(g,0x9caa90,0,-.27,0,15.4,.46,10.95)
  box(g,store?0xe5dcc5:0xc6946d,0,-.045,0,15.18,.12,10.7)
  if(store){
    for(let x=-7;x<7.5;x+=1.14) for(let z=-4.8;z<5;z+=1.08){
      if((Math.round(x/1.14)+Math.round(z/1.08))%3===0) box(g,0xece4ce,x,.019,z,1.12,.012,1.06)
    }
    for(let x=-6.8;x<7.5;x+=1.14) box(g,0xd4cdb8,x,.022,0,.022,.012,10.68)
    for(let z=-4.8;z<5;z+=1.08) box(g,0xd4cdb8,0,.023,z,15.16,.012,.022)
  } else {
    for(let x=-7.38;x<7.5;x+=.59) box(g,0xbb8560,x,.023,0,.017,.015,10.69)
  }
  const wall=store?0xece5ce:0xeedcb9
  box(g,wall,0,1.78,-5.34,15.26,3.6,.27)
  box(g,wall,-7.54,1.78,.04,.24,3.6,10.63)
  box(g,store?blue:wood,0,.17,-5.15,15.19,.26,.14)
  box(g,store?blue:wood,-7.37,.17,.04,.14,.26,10.57)
  box(g,store?blue:oak,0,3.58,-5.32,15.30,.14,.32)
  box(g,store?blue:oak,-7.54,3.58,0,.31,.14,10.68)
  lights(scene)
  return {scene,g,targets:[]}
}
function windowAt(g,x,y,z,w,h) {
  box(g,0xfff0d5,x,y,z,w+.24,h+.23,.14)
  box(g,0x9ebdc4,x,y,z+.085,w,h,.08)
  box(g,0xc3d5cb,x-.3,y+.25,z+.128,w*.63,h*.66,.024)
  box(g,0xfff0d5,x,y,z+.16,.075,h,.045)
  box(g,0xfff0d5,x,y,z+.16,w,.077,.045)
  box(g,0xe0bc90,x,y-h/2-.085,z+.16,w+.35,.115,.33)
}
function chair(g,x,z,color=wood) {
  const c=group(g,x,0,z)
  for(const a of [-.35,.35]) for(const b of [-.31,.31]) box(c,color,a,.35,b,.104,.70,.104)
  box(c,color,0,.68,0,.83,.15,.77)
  box(c,color,0,1.06,-.32,.79,.55,.095)
  return c
}
function table(g,x,z,w=2.7,d=1.5) {
  for(const a of [-1,1]) for(const b of [-1,1]) box(g,wood,x+a*(w*.41),.49,z+b*(d*.36),.125,.97,.125)
  box(g,oak,x,1.03,z,w,.17,d)
}
function sofa(g,x,z) {
  box(g,0x5a8175,x,.31,z,3.75,.42,1.35)
  box(g,0x799c88,x,.67,z-.51,3.75,.93,.34)
  for(const side of [-1,1]) box(g,0x6f927f,x+side*1.76,.65,z,.28,.56,1.32)
  for(let i=-1;i<=1;i++) {
    box(g,0x98b39b,x+i*1.12,.59,z+.05,1.06,.23,.91)
    box(g,0x91ae97,x+i*1.12,.95,z-.34,1.06,.65,.20)
  }
  const pillow=box(g,0xd99872,x-1.19,1.0,z-.11,.54,.52,.22)
  pillow.rotation.z=-.25
  box(g,0xf0cc88,x+1.15,.98,z-.11,.56,.55,.22).rotation.z=.19
}
function productModel(parent,p,x,y,z,scale=1){
  const g=group(parent,x,y,z)
  const a=p.accent,c=p.color
  if(p.id==='water'){
    cylinder(g,c,0,.34,0,.19,.67)
    blob(g,c,0,.69,0,.18,.15,.18)
    cylinder(g,a,0,.42,0,.195,.24)
    cylinder(g,0x4b819d,0,.83,0,.097,.136)
  } else if(p.id==='noodles'){
    cylinder(g,c,0,.30,0,.238,.59)
    cylinder(g,a,0,.62,0,.266,.054)
    box(g,0xf4ead3,0,.31,.234,.28,.20,.036)
  } else if(p.id==='rice'){
    const s=new T.Shape()
    s.moveTo(-.26,.035);s.lineTo(.26,.035);s.lineTo(0,.59);s.closePath()
    const m=new T.Mesh(new T.ExtrudeGeometry(s,{depth:.25,bevelEnabled:false}),mat(c))
    m.position.z=-.12
    m.userData.disposableGeometry=true
    g.add(m)
    box(g,a,0,.18,.143,.21,.22,.035)
  } else {
    const h=p.id==='chocolate'?.39:p.id==='tissue'?.3:.63
    const w=p.id==='tissue'?.63:p.id==='chips'?.46:.37
    box(g,c,0,h/2,0,w,h,.3)
    box(g,a,0,h*.38,.156,w*.92,h*.39,.035)
    if(p.id==='milk'){
      const top=box(g,0xe0ebf9,0,h+.06,0,w,.14,.245)
      top.rotation.x=.14
      box(g,a,0,h+.132,0,w,.023,.065)
    }
    if(p.id==='juice') cylinder(g,a,.092,h+.046,0,.072,.083)
    if(p.id==='tissue') box(g,0xfffaed,0,.36,0,.25,.13,.11).rotation.x=.23
  }
  g.scale.setScalar(scale)
  return g
}
function home(room,player) {
  const {g}=room
  windowAt(g,-3.83,2.29,-5.12,2.84,1.48)
  windowAt(g,2.89,2.29,-5.12,2.46,1.48)
  box(g,0x759381,-5.05,.027,.76,3.57,.022,3.27)
  box(g,0xa3b19a,-5.05,.042,.76,3.30,.018,3.02)
  sofa(g,-4.72,-3.55)
  table(g,-4.69,.41,2.34,1.17)
  box(g,0xd3e3ca,-4.24,1.148,.44,.55,.055,.43)
  box(g,0xde986f,-4.24,1.182,.44,.5,.034,.38)
  box(g,0xc19169,4.85,.58,-3.83,3.03,1.13,1.18)
  box(g,0xe0bc90,4.85,1.19,-3.83,3.13,.13,1.25)
  for(const x of [3.9,4.83,5.77]){
    box(g,0xd6a880,x,.66,-3.21,.81,.85,.08)
    box(g,0x705642,x,.82,-3.16,.28,.053,.052)
  }
  table(g,3.69,1.07)
  chair(g,2.86,-.18)
  chair(g,4.45,-.16)
  const c=chair(g,2.86,2.25)
  c.rotation.y=Math.PI
  const c2=chair(g,4.45,2.25)
  c2.rotation.y=Math.PI
  cylinder(g,0x9ab298,3.75,1.27,1.01,.22,.38)
  for(let i=0;i<4;i++) blob(g,i%2?0xc98265:0xdcb86f,3.58+i*.10,1.52+i*.04,1.02,.09,.14,.09)
  planter(g,-6.62,-4.66,1.24)
  label(g,'우리 집',-.03,2.72,-5.13,2.0,.59,{bg:'#8b674e',fg:'#fff0d2',size:119})
  box(g,0xab8865,-.19,1.28,-5.13,1.35,2.50,.14)
  box(g,0xd1ac80,-.19,1.31,-5.04,1.06,2.21,.06)
  box(g,0xe7cf85,.19,1.17,-5,.092,.128,.064)
  const npc=person(g,{index:3,color:'#986448'},true)
  box(g,0xc79c5c,3.21,1.24,.50,.60,.21,.43)
  box(g,0x805f45,3.21,1.36,.50,.25,.023,.08)
  box(g,0x608a9a,4.33,1.13,.55,.32,.035,.19)
  npc.root.position.set(-1.18,.028,-1.79)
  player.root.position.set(.05,.029,2.95)
  player.root.rotation.y=Math.PI-.22
  shadow(g,-1.14,-1.79,.33,.24,.12)
  return {npc}
}
function store(room,player,easy) {
  const {g}=room
  const entrance=group(g,-7.40,0,2.95)
  entrance.rotation.y=Math.PI/2
  box(entrance,0x4a77a7,0,1.24,0,1.83,2.48,.16)
  box(entrance,0xa2c1bd,0,1.27,.093,1.53,2.09,.078)
  box(entrance,0xe0e5d2,0,.38,.139,1.52,.16,.025)
  box(entrance,0x698d80,0,1.28,.14,.062,2.11,.047)
  for(const x of [-.17,.17])box(entrance,0xe9dfb8,x,1.07,.17,.07,.28,.07)
  label(entrance,'출입구',0,2.74,.10,1.37,.30,{bg:'#4a77a7',fg:'#fff4d9',size:104})
  label(g,'편의점',.2,3.03,-5.15,3.5,.74,{bg:'#265d9b',fg:'#fff4d9',size:111})
  for(const x of [-5.2,-3.25]){
    box(g,0x91b4ce,x,1.54,-4.01,1.85,3.04,1.52)
    box(g,0xc2d4c5,x,1.65,-3.24,1.66,2.49,.08)
    box(g,0x779db9,x,1.65,-3.185,1.47,2.30,.035)
    for(const y of [.61,1.35,2.10]){
      box(g,0x9bbab3,x,y,-3.152,1.48,.055,.047)
      for(let i=0;i<4;i++) productModel(g,products[(i+(y>1?1:0))%3],x-.51+i*.33,y+.04,-3.17,.59)
    }
    box(g,0xe2e5cd,x+.63,1.46,-3.1,.079,.53,.042)
  }
  box(g,0xd0b49a,-2.52,1.16,-.23,7.24,2.30,.19)
  for(const x of [-6.14,1.09]) box(g,0x7195bf,x,1.13,.05,.14,2.26,.79)
  box(g,0x7195bf,-2.53,2.29,.04,7.36,.13,.89)
  const top=-.02
  for(let row=0;row<2;row++){
    const y=row?1.33:.41
    box(g,0xe2c69f,-2.52,y,.14,7.36,.14,.94)
    box(g,0x7195bf,-2.52,y,.65,7.35,.12,.095)
    for(let col=0;col<4;col++){
      const index=row?col:col+4
      const p=products[index]
      const x=-5.18+col*1.75
      for(let j=0;j<2;j++) productModel(g,p,x+(j-.5)*.43,y+.08,top+.32,.86)
      label(g,p.name,x,y-.015,.706,1.20,.14,{bg:'#ffefd2',fg:'#274f49',size:95})
      if(!easy||index<3){
        const target=group(g,x,y+.15,.4)
        target.userData.target='product:'+p.id
        const hit=new T.Mesh(new T.BoxGeometry(1.56,.73,.58),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}))
        hit.position.set(0,.29,0)
        hit.userData.disposable=true
        target.add(hit)
        room.targets.push(target)
      }
    }
  }
  windowAt(g,4.95,2.22,-5.14,2.67,1.38)
  box(g,0xc8ab84,4.55,.64,-.52,4.2,1.25,1.7)
  box(g,0x618ab5,4.55,1.31,-.52,4.32,.19,1.82)
  box(g,0x3e668e,4.55,.61,.37,3.67,.78,.09)
  label(g,'계산대',4.55,.64,.43,1.89,.38,{bg:'#3e668e',fg:'#fff1d4',size:112})
  box(g,dark,5.59,1.48,-.78,.66,.17,.46)
  box(g,dark,5.59,1.75,-.81,.48,.41,.13).rotation.x=.18
  box(g,0xaed0c0,5.59,1.77,-.73,.39,.27,.032).rotation.x=.18
  box(g,0x526666,3.73,1.47,-.05,.28,.13,.41)
  box(g,0xa8bfae,3.73,1.545,-.13,.19,.019,.13)
  const npc=person(g,{index:2,color:'#6b9d78'},true)
  npc.root.position.set(4.58,.03,-2.06)
  player.root.position.set(-1.53,.03,3.41)
  player.root.rotation.y=Math.PI
  const counter=group(g,4.55,0,.36)
  counter.userData.target='counter'
  const hit=new T.Mesh(new T.BoxGeometry(4.2,1.5,1.25),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}))
  hit.position.y=.76
  hit.userData.disposable=true
  counter.add(hit)
  room.targets.push(counter)
  return {npc}
}
export function makeInterior(kind,profile,easy) {
  const room=roomStage(kind)
  const player=person(room.g,profile)
  room.playerRoot=player.root
  const {npc}=kind==='store'?store(room,player,easy):home(room,player)
  room.npcRoot=npc.root
  batchStatic(room.g,new Set([player.root,npc.root]))
  const destination=player.root.position.clone()
  room.travel=(x,z)=>destination.set(x,.03,z)
  room.isWalking=()=>destination.distanceToSquared(player.root.position)>.0016
  room.placeAt=(x,z)=>{
    room.travel(x,z)
    player.root.position.copy(destination)
  }
  const purchase=group(player.root,.28,.62,.25)
  room.showPurchase=(item,phase)=>{
    disposeScene(purchase)
    if(!item||phase==='picked')return
    const product=products.find(p=>p.id===item)
    if(!product)return
    box(purchase,0xcaa16b,0,0,0,.53,.34,.38)
    box(purchase,0x967b56,0,.18,-.14,.30,.045,.06)
    productModel(purchase,product,0,.08,0,.51)
  }
  room.tick=(dt,time,pose)=>{
    const root=player.root
    const delta=destination.clone().sub(root.position)
    const distance=delta.length()
    if(distance>.04){
      root.position.addScaledVector(delta,Math.min(distance,dt*4.8)/distance)
      root.rotation.y=Math.atan2(delta.x,delta.z)
    } else if(pose!=='idle'){
      root.rotation.y=.28
    } else if(kind==='store') {
      root.rotation.y=Math.PI
    }
    animatePerson(player,time,distance>.04?'walk':pose)
    animatePerson(npc,time,time%8<1.05?'wave':'idle')
  }
  return room
}

