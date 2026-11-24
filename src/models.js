import * as T from 'three'
import { characters } from './content.js'

const cube = new T.BoxGeometry()
const ball = new T.IcosahedronGeometry(1, 1)
const round = new T.CylinderGeometry(1,1,1,14)
const wheelGeometry = new T.CylinderGeometry(1,1,1,12)
const materials = new Map()
const picker = new T.MeshBasicMaterial({colorWrite:false,depthWrite:false})
export function mat(color) {
  if (!materials.has(color)) materials.set(color,new T.MeshLambertMaterial({color}))
  return materials.get(color)
}
export function mesh(parent, geometry, color, x,y,z,sx=1,sy=1,sz=1) {
  const m = new T.Mesh(geometry,typeof color === 'object' ? color : mat(color))
  m.position.set(x,y,z)
  m.scale.set(sx,sy,sz)
  parent.add(m)
  return m
}
export const box = (p,c,x,y,z,w,h,d) => mesh(p,cube,c,x,y,z,w,h,d)
export const blob = (p,c,x,y,z,w,h,d) => mesh(p,ball,c,x,y,z,w,h,d)
export const cylinder = (p,c,x,y,z,r,h) => mesh(p,round,c,x,y,z,r,h,r)
export const hitBox = (p,x,y,z,w,h,d) => box(p,picker,x,y,z,w,h,d)
export function group(p,x=0,y=0,z=0) {
  const g = new T.Group()
  g.position.set(x,y,z)
  p.add(g)
  return g
}
export function label(p,text,x,y,z,w,h,{bg='#f7f1dc',fg='#24453f',size=100}={}) {
  const cvs = document.createElement('canvas')
  cvs.width=768
  cvs.height=Math.max(96,Math.round(768*h/w))
  const ctx=cvs.getContext('2d')
  ctx.fillStyle=bg
  ctx.fillRect(0,0,cvs.width,cvs.height)
  ctx.fillStyle=fg
  ctx.font='bold '+size+'px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'
  ctx.textAlign='center'
  ctx.textBaseline='middle'
  ctx.fillText(text,cvs.width/2,cvs.height/2,cvs.width*.92)
  const tex=new T.CanvasTexture(cvs)
  tex.colorSpace=T.SRGBColorSpace
  const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:bg==='transparent'}))
  m.userData.disposable = true
  m.position.set(x,y,z)
  p.add(m)
  return m
}
export function shadow(p,x,z,w,d,opacity=.17) {
  const m=new T.Mesh(new T.CircleGeometry(1,24),new T.MeshBasicMaterial({color:0x334c34,transparent:true,opacity,depthWrite:false}))
  m.userData.disposable = true
  m.position.set(x,.09,z)
  m.rotation.x=-Math.PI/2
  m.scale.set(w,d,1)
  p.add(m)
  return m
}
export function tree(p,x,z,scale=1,variant=0) {
  shadow(p,x+.45,z+.3,1.05*scale,.8*scale,.13)
  const g=group(p,x,.16,z)
  g.scale.setScalar(scale)
  cylinder(g,0x89644b,0,1.18,0,.17,2.36)
  const crown=group(g,0,2.62,0)
  const colors=[0x679d3f,0x7cab48,0x98b94f,0x568c3a]
  blob(crown,colors[variant%4],0,.32,0,1.22,1.46,1.14)
  blob(crown,colors[(variant+1)%4],-.52,-.17,.12,.76,.87,.77)
  blob(crown,colors[variant%4],.67,-.13,-.17,.81,.98,.76)
  return crown
}
export function planter(p,x,z,w=2) {
  box(p,0xb98b6a,x,.19,z,w,.38,.82)
  box(p,0x705a42,x,.39,z,w-.12,.08,.68)
  for(let i=0;i<Math.floor(w*3);i++){
    const a=x-w/2+.22+i*.32
    blob(p,0x6c9c55,a,.48,z,.2,.17,.28)
    blob(p,[0xf1bc55,0xee8f7d,0xf2e2a8][i%3],a,.64,z+Math.sin(i)*.16,.105,.09,.105)
  }
}
export function bench(p,x,z) {
  const g=group(p,x,0,z)
  for(const side of [-.7,.7]){
    box(g,0x425f58,side,.41,0,.1,.82,.57)
    box(g,0x425f58,side,.78,-.22,.08,.75,.08)
  }
  for(let i=0;i<3;i++){
    box(g,0xb1845a,0,.54,-.21+i*.21,1.84,.09,.17)
    box(g,0xb1845a,0,.68+i*.16,-.24,1.84,.12,.09)
  }
  return g
}
export function vehicle(p,color=0xebac55,bus=false) {
  const g=group(p)
  const len=bus?6.4:3.35, width=bus?1.94:1.55
  box(g,0x414e51,0,.38,0,len-.12,.23,width-.02)
  box(g,color,0,.73,0,len,.60,width)
  box(g,bus?color:0x6d8990,bus?0:-.15,1.25,0,bus?len:1.75,bus?.92:.56,width-.09)
  box(g,color,bus?0:-.16,bus?1.76:1.53,0,bus?len:1.6,.12,width-.14)
  if(bus){
    for(let i=-2;i<=2;i++) for(const side of [-1,1]) box(g,0x698d9c,i*1.06,1.35,side*.975,.87,.5,.025)
    box(g,0x698d9c,3.215,1.23,0,.025,.57,1.64)
    box(g,0xf8e3a9,0,.76,.982,len-.06,.08,.02)
  } else {
    for(const side of [-1,1]) box(g,color,-.12,1.25,side*.737,.09,.53,.03)
  }
  for(const side of [-1,1]){
    box(g,0xffe9ab,len/2+.011,.75,side*(width*.33),.04,.22,.28)
    box(g,0xd45349,-len/2-.015,.75,side*(width*.34),.04,.22,.23)
    for(const xx of [-len*.31,len*.31]){
      const wheel=mesh(g,wheelGeometry,0x303738,xx,.34,side*(width*.48),.36,.2,.36)
      wheel.rotation.x=Math.PI/2
      const hub=mesh(g,wheelGeometry,0xb8c3c2,xx,.34,side*(width*.48+.11),.15,.04,.15)
      hub.rotation.x=Math.PI/2
    }
  }
  return g
}
export function person(p,profile={index:0},npc=false) {
  const c=characters[profile.index] ?? characters[0]
  const shirt=profile.color || c.top
  const root=group(p)
  const torso=group(root,0,1.13,0)
  box(torso,shirt,0,.28,0,.57,.66,.35)
  box(torso,0xf4e9d3,0,.52,.183,.23,.12,.019)
  if(c.style===1||c.style===5){
    box(torso,0xe1d3ba,0,.30,.183,.075,.55,.024)
    box(torso,0xe1d3ba,-.16,.21,.187,.12,.07,.019)
  }
  if(c.style===2||c.style===4)box(torso,0xf4e9d3,0,.36,.184,.46,.075,.025)
  if(c.style===3)blob(torso,shirt,0,.57,-.20,.25,.16,.13)
  cylinder(torso,c.skin,0,.64,0,.11,.14)
  const head=group(torso,0,.88,0)
  blob(head,c.skin,0,.08,0,.3,.34,.272)
  blob(head,c.hair,0,.24,-.055,.316,.239,.284)
  const hairShapes=[
    [[-.13,.24,.14,.205,.139,.17]],
    [[-.23,.065,-.02,.104,.279,.262],[.24,.065,-.02,.104,.279,.26]],
    [[-.125,.30,.11,.209,.16,.187],[.09,.30,.13,.199,.145,.19]],
    [[0,.31,-.26,.19,.25,.17],[.14,.24,.12,.182,.15,.169]],
    [[0,.32,.02,.32,.13,.31],[0,.20,.208,.30,.04,.19]],
    [[-.24,-.04,-.14,.11,.25,.15],[.24,-.04,-.14,.11,.25,.15],[0,.23,.14,.265,.12,.16]]
  ]
  for(const shape of hairShapes[c.style]) blob(head,c.hair,...shape)
  for(const side of [-1,1]){
    blob(head,c.skin,side*.276,.042,.01,.064,.091,.065)
    box(head,0x372e31,side*.103,.075,.253,.043,.055,.018)
  }
  box(head,0x9b5b52,0,-.053,.257,.088,.021,.015)
  const arms=[], legs=[]
  for(const side of [-1,1]){
    const arm=group(torso,side*.35,.53,0)
    arm.rotation.z=side*.10
    box(arm,shirt,0,-.155,0,.173,.34,.205)
    box(arm,c.skin,0,-.408,0,.149,.24,.168)
    blob(arm,c.skin,0,-.54,.015,.086,.102,.092)
    const leg=group(root,side*.155,1.17,0)
    box(leg,c.pants,0,-.52,0,.223,1.03,.246)
    box(leg,0xf2e9da,0,-1.06,.066,.231,.19,.39)
    box(leg,0x39434b,0,-1.148,.08,.235,.062,.394)
    arms.push(arm)
    legs.push(leg)
  }
  if(npc) root.rotation.y=-.23
  return {root,torso,head,arms,legs}
}
export function animatePerson(p, time, state='idle') {
  const stride=state==='walk'?Math.sin(time*11)*.57:0
  p.legs[0].rotation.x=stride
  p.legs[1].rotation.x=-stride
  p.arms[0].rotation.x=-stride*.7
  p.arms[1].rotation.x=stride*.7
  p.arms[0].rotation.z=-.10
  p.arms[1].rotation.z=.10
  p.torso.position.y=1.13+Math.sin(time*2)*.014+(state==='walk'?Math.abs(stride)*.048:0)
  p.head.rotation.y=Math.sin(time*1.6)*.045
  if(state==='receive'){
    for(const arm of p.arms) arm.rotation.x=-1.16
  }
  if(state==='wave'||state==='happy'){
    p.arms[1].rotation.z=2.4+Math.sin(time*12)*.31
    if(state==='happy'){
      p.arms[0].rotation.z=-2.1
      p.torso.position.y+=Math.abs(Math.sin(time*6))*.12
    }
  }
}
export function batchStatic(root, movable) {
  const buckets=new Map()
  root.updateMatrixWorld(true)
  const inverse=root.matrixWorld.clone().invert()
  function collect(node){
    if(movable.has(node))return
    if(node.isMesh&&node.material.isMeshLambertMaterial&&!node.userData.disposableGeometry){
      if(!buckets.has(node.geometry))buckets.set(node.geometry,new Map())
      const materials=buckets.get(node.geometry)
      if(!materials.has(node.material))materials.set(node.material,[])
      materials.get(node.material).push(node)
    }
    for(const child of node.children)collect(child)
  }
  collect(root)
  const matrix=new T.Matrix4()
  for(const [geometry,materials] of buckets)for(const [material,meshes] of materials){
    if(meshes.length<3)continue
    const batch=new T.InstancedMesh(geometry,material,meshes.length)
    meshes.forEach((m,i)=>{
      batch.setMatrixAt(i,matrix.multiplyMatrices(inverse,m.matrixWorld))
      m.removeFromParent()
    })
    batch.computeBoundingSphere()
    root.add(batch)
  }
}
export function disposeScene(scene) {
  scene.traverse(o=>{
    if(o.isInstancedMesh)o.dispose()
    if(o.userData.disposableGeometry) o.geometry.dispose()
    if(!o.userData.disposable) return
    o.geometry?.dispose()
    o.material?.map?.dispose()
    o.material?.dispose()
  })
  scene.clear()
}

