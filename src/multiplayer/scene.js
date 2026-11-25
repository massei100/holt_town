import * as T from 'three'
import { makeTown, lights } from '../town.js'
import { makeInterior } from '../interiors.js'
import { animatePerson, batchStatic, blob, box, cylinder, disposeScene, group, hitBox, label, mat, person, shadow } from '../models.js'
import { deliveryMission, doors, exitPoint } from '../../shared/world.js'
import { clerk, missionItems, missionsById, zoneOf } from '../../shared/missions.js'
import { groceryPoints } from '../../shared/experiences.js'

function tag(parent,kind,target,x,y,z,w,h,d){
  const mesh=hitBox(parent,x,y,z,w,h,d)
  mesh.userData.action={kind,target}
  return mesh
}

function sign(parent,definition,x,y,z,width=.9,height=.66){
  return label(parent,definition.symbol,x,y,z,width,height,{bg:definition.color,fg:definition.ink??'#ffffff',size:220})
}

function parcel(parent,definition,scale=1){
  const root=group(parent)
  root.scale.setScalar(scale)
  const type=definition.model
  if(type&&type!=='gift'){
    if(type==='gem'){
      const gem=blob(root,definition.color,0,.49,0,.37,.44,.35)
      gem.rotation.z=.36
      blob(root,0xffebac,.09,.71,.07,.11,.13,.11)
    }else if(type==='bottle'||type==='can'){
      cylinder(root,type==='bottle'?0xc0dfea:0xd6d8da,0,.34,0,.23,.66)
      cylinder(root,definition.color,0,.35,0,.239,.22)
      cylinder(root,type==='bottle'?0x538ca6:0xe5e5e6,0,.70,0,type==='bottle'?.13:.23,.11)
    }else if(type==='watering'){
      cylinder(root,0x6fa7bd,0,.28,0,.32,.51)
      box(root,0x86bacb,.25,.43,0,.66,.13,.13).rotation.z=.63
      box(root,0x315d78,-.23,.63,0,.15,.3,.10).rotation.z=.43
    }else{
      box(root,type==='paper'?0xf3e6cb:type==='seed'?0xd8ad69:0xf1e4c8,0,.28,0,.56,.53,.43)
      if(type==='carton')box(root,definition.color,0,.56,0,.56,.10,.43)
    }
    for(const rotation of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
      const side=group(root)
      side.rotation.y=rotation
      sign(side,definition,0,.33,.39,.41,.32)
    }
    return root
  }
  box(root,0xd6a76b,0,.42,0,.98,.84,.91)
  box(root,definition.color,0,.76,0,1,.16,.93)
  box(root,0xf6e6bf,0,.848,0,.21,.018,.93)
  box(root,0xb47b43,0,.095,0,1,.08,.93)
  for(let i=0;i<4;i++){
    const side=group(root)
    side.rotation.y=Math.PI*i/2
    sign(side,definition,0,.46,.504,.62,.47)
  }
  const lid=sign(root,definition,0,.852,0,.54,.50)
  lid.rotation.x=-Math.PI/2
  return root
}

function house(parent,definition){
  const [x,z]=definition.house
  const site=group(parent,x,0,z)
  box(site,0xd4c7a8,0,.13,0,5.4,.25,4.39)
  box(site,0xf2ddba,0,1.59,0,5.25,2.94,4.18)
  box(site,definition.color,0,3.02,0,5.49,.22,4.47)
  const left=box(site,definition.color,-1.36,3.49,0,3,.16,4.53)
  const right=box(site,definition.color,1.36,3.49,0,3,.16,4.53)
  left.rotation.z=.33
  right.rotation.z=-.33
  box(site,0xe7d6ba,0,1.14,2.13,1.25,2.13,.14)
  box(site,0x4f5a5f,0,1.20,2.22,1.01,1.94,.09)
  box(site,0xe8ba59,.32,1.03,2.30,.081,.14,.071)
  for(const offset of [-1.65,1.65]){
    box(site,0xffe9c9,offset,1.65,2.13,1.18,1.16,.14)
    box(site,0x85afc7,offset,1.65,2.208,1.02,.98,.045)
    box(site,0xffe9c9,offset,1.65,2.239,.059,.99,.041)
    box(site,0xffe9c9,offset,1.65,2.239,1.02,.059,.041)
  }
  shadow(site,.54,.29,3.16,2.37,.19)
}

function townAdditions(scene){
  const fixed=group(scene)
  const pads=new Map()
  const hits=[]
  box(fixed,0xd4baa0,-8.13,.10,11.12,7.38,.16,2.12)
  for(const x of [-11.8,-4.45]){
    cylinder(fixed,0x3f6280,x,1.28,9.74,.056,2.40)
  }
  label(fixed,'배송 광장',-8.15,2.10,9.77,4.40,.57,{bg:'#275585',fg:'#ffedc7',size:100})
  for(const def of deliveryMission.items){
    if(def.house)house(fixed,def)
    const [x,z]=def.site
    const base=group(fixed,x,.15,z)
    box(base,def.color,0,.02,0,2.12,.08,1.60)
    box(base,0xf1e2c1,0,.071,0,1.88,.026,1.37)
    const floor=sign(base,def,0,.092,0,1.42,1.08)
    floor.rotation.x=-Math.PI/2
    box(base,0x645b4e,.91,.57,-.58,.092,1.06,.10)
    sign(base,def,.91,1.11,-.57,.63,.63)
    const hint=group(scene,x,.29,z)
    const ring=new T.Mesh(new T.RingGeometry(.88,1.14,40),new T.MeshBasicMaterial({color:def.color,transparent:true,opacity:.68,side:T.DoubleSide,depthWrite:false}))
    ring.rotation.x=-Math.PI/2
    hint.add(ring)
    hint.visible=false
    pads.set(def.id,hint)
    hits.push(tag(scene,'site',def.id,x,.65,z,2.05,1.23,1.67))
  }
  for(const door of doors){
    const [x,z]=door.point
    hits.push(tag(scene,'door',door.id,x,1.25,z-.48,1.55,2.45,1.43))
    const step=box(fixed,0xf2ce77,x,.19,z,1.48,.086,.53)
    step.rotation.y=0
  }
  batchStatic(fixed,new Set())
  return {pads,hits}
}

function addMissionSite(area,site){
  const inside=zoneOf(site)!=='town'
  const [x,z]=site.point
  const root=group(area.scene,x,inside?.026:.15,z)
  let growth=null
  if(site.kind==='bin'){
    box(root,site.color,0,.49,-.31,.84,.94,.77)
    box(root,0x3f4d57,0,1,-.31,.94,.14,.83)
    box(root,0x272f36,0,1.077,-.26,.46,.012,.22)
    sign(root,site,0,.65,.08,.62,.46)
  }else if(site.kind==='bed'){
    box(root,0x956443,0,.17,0,1.60,.32,1.36)
    box(root,0x74543a,0,.341,0,1.38,.035,1.11)
    sign(root,site,0,.22,.689,.64,.31)
    growth=group(root,0,.35,0)
    for(const [dx,dz] of [[-.37,-.23],[.14,-.21],[-.16,.22],[.37,.23]]){
      cylinder(growth,0x5e863a,dx,.21,dz,.018,.43)
      blob(growth,0x68a44b,dx-.08,.13,dz,.17,.054,.10)
      blob(growth,site.color,dx,.45,dz,.12,.105,.11)
    }
    growth.visible=false
  }else{
    box(root,site.color,0,.025,0,1.38,.048,.91)
    const glyph=sign(root,site,0,.054,0,.95,.64)
    glyph.rotation.x=-Math.PI/2
  }
  const ring=new T.Mesh(new T.RingGeometry(.82,1.02,36),new T.MeshBasicMaterial({color:site.color,side:T.DoubleSide,depthWrite:false}))
  ring.rotation.x=-Math.PI/2
  ring.position.y=inside?.083:.15
  root.add(ring)
  ring.visible=false
  const hit=site.id===clerk.id?null:tag(root,'site',site.id,0,.40,0,1.55,.80,1.22)
  return {root,ring,hit,growth}
}

export function createMultiplayerScene(host){
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'})
  renderer.outputColorSpace=T.SRGBColorSpace
  renderer.toneMapping=T.ACESFilmicToneMapping
  renderer.toneMappingExposure=1.11
  host.append(renderer.domElement)
  const town=makeTown()
  const {pads,hits}=townAdditions(town.scene)
  const avatarScene=new T.Scene()
  avatarScene.background=new T.Color(0xe6eff9)
  lights(avatarScene)
  cylinder(avatarScene,0xcbb68f,0,-.16,0,1.53,.30)
  cylinder(avatarScene,0xf3e5c5,0,.008,0,1.41,.04)
  shadow(avatarScene,0,0,.55,.39)
  const areas=new Map([['town',{scene:town.scene,hits}]])
  const actors=new Map()
  const parcels=new Map()
  const sites=new Map()
  function ensureParcel(def){
    if(parcels.has(def.id))return parcels.get(def.id)
    const model=parcel(town.scene,def)
    const hit=tag(model,'item',def.id,0,.51,0,1.19,1.08,1.15)
    const entry={model,hit,zone:zoneOf(def),ground:false}
    model.visible=false
    parcels.set(def.id,entry)
    return entry
  }
  for(const def of deliveryMission.items){
    const entry=ensureParcel(def)
    entry.model.position.set(def.start[0],.23,def.start[1])
    entry.model.visible=true
  }

  const aim=new T.Vector3(1.5,0,0)
  const want=new T.Vector3(),eye=new T.Vector3()
  const camera=new T.OrthographicCamera(-1,1,1,-1,.1,240)
  const pointer=new T.Vector2()
  const ray=new T.Raycaster()
  const plane=new T.Plane(new T.Vector3(0,1,0),-.12)
  const floor=new T.Vector3()
  const marker=new T.Mesh(new T.RingGeometry(.26,.40,32),new T.MeshBasicMaterial({color:0x2561b4,side:T.DoubleSide,transparent:true,opacity:.84,depthWrite:false}))
  marker.rotation.x=-Math.PI/2
  marker.visible=false
  town.scene.add(marker)
  const focusRing=new T.Mesh(new T.RingGeometry(.63,.82,36),new T.MeshBasicMaterial({color:0xf1aa28,side:T.DoubleSide,transparent:true,opacity:.88,depthWrite:false}))
  focusRing.rotation.x=-Math.PI/2
  focusRing.visible=false
  const experienceRing=new T.Mesh(new T.RingGeometry(.64,.84,40),new T.MeshBasicMaterial({color:0x315eb6,side:T.DoubleSide,depthWrite:false}))
  experienceRing.rotation.x=-Math.PI/2
  experienceRing.visible=false
  const experienceObject=blob(town.scene,0xf4ae31,0,0,0,.15,.15,.15)
  experienceObject.visible=false
  let personalStep=null

  let avatar=null,state=null,screen='lobby',zone='town',myId=null,viewRole='student',quality='normal',less=false,overview=false
  let width=0,height=0,pixelRatio=0,span=55,last=performance.now(),time=0,locationChanged=true,selected=null
  let lastTick=0,renderTick=0,arrival=0

  function resize(){
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight)
    const dpr=Math.min(window.devicePixelRatio,quality==='low'?.75:1.2)
    if(w===width&&h===height&&dpr===pixelRatio)return
    width=w;height=h;pixelRatio=dpr
    renderer.setPixelRatio(dpr)
    renderer.setSize(width,height,false)
  }
  new ResizeObserver(resize).observe(host)
  resize()

  function buildZone(name){
    const area=makeInterior(name,{index:0},true)
    area.playerRoot.removeFromParent()
    const exit=tag(area.scene,'door',name,exitPoint[0],.65,exitPoint[1],1.56,1.24,.54)
    box(area.scene,0xe4bd68,exitPoint[0],.06,exitPoint[1],1.45,.08,.66)
    area.hits=[exit]
    if(name==='store'){
      area.experienceHits=new Map(Object.entries(groceryPoints).map(([id,spot])=>{
        const [x,y,z]=spot.focus
        return [id,tag(area.scene,'experience-use',id,x,y,z,id==='milk'?.94:1.4,.91,.86)]
      }))
    }
    areas.set(name,area)
    if(state)apply(state)
  }

  function show(nextScreen,nextZone='town'){
    if(nextScreen!==screen||nextZone!==zone)locationChanged=true
    screen=nextScreen;zone=nextZone
    if(screen==='game'&&!areas.has(zone))buildZone(zone)
    if(screen!=='game'||marker.parent!==areas.get(zone)?.scene)marker.visible=false
  }

  function setAvatar(profile){
    if(avatar)avatar.root.removeFromParent()
    avatar=person(avatarScene,profile)
  }

  function addActor(player,area,tick){
    const model=person(area.scene,{index:player.index,color:player.color})
    const hit=tag(model.root,'peer',player.id,0,1.17,0,.94,2.32,.75)
    const carry=group(model.root,0,.91,.59)
    model.root.position.set(player.point[0],player.zone==='town'?.18:.035,player.point[1])
    model.root.rotation.y=player.angle
    return {model,hit,carry,item:null,target:player,waveUntil:0,samples:[{tick,point:player.point}]}
  }

  function apply(snapshot){
    const previous=state
    state=snapshot
    const tick=snapshot.tick??0
    if(!previous||previous.code!==snapshot.code){
      lastTick=tick;renderTick=tick-2
      arrival=performance.now()
    }else if(tick>lastTick){
      lastTick=tick
      arrival=performance.now()
    }
    const ids=new Set(snapshot.players.map(p=>p.id))
    for(const [id,actor] of actors)if(!ids.has(id)){
      actor.model.root.removeFromParent()
      disposeScene(actor.model.root)
      actors.delete(id)
    }
    for(const player of snapshot.players){
      const area=areas.get(player.zone)
      let actor=actors.get(player.id)
      if(!area){
        if(actor)actor.model.root.visible=false
        continue
      }
      if(!actor){
        actor=addActor(player,area,tick)
        actors.set(player.id,actor)
      }
      actor.model.root.visible=true
      if(player.zone!==actor.target.zone||player.warp!==actor.target.warp){
        area.scene.add(actor.model.root)
        actor.model.root.position.set(player.point[0],player.zone==='town'?.18:.035,player.point[1])
        actor.samples=[]
      }
      const sample={tick,point:player.point}
      if(actor.samples.at(-1)?.tick===tick)actor.samples[actor.samples.length-1]=sample
      else{
        actor.samples.push(sample)
        if(actor.samples.length>6)actor.samples.shift()
      }
      if(player.wave&&player.wave!==actor.target.wave)actor.waveUntil=time+1.2
      const displayItem=player.carry??(player.experience?.id==='grocery'&&player.experience.step==='pay'?'shop-milk':null)
      if(actor.item!==displayItem){
        if(actor.prop){
          actor.prop.visible=false
          actor.prop=null
        }
        if(displayItem){
          actor.props??=new Map()
          if(!actor.props.has(displayItem))actor.props.set(displayItem,parcel(actor.carry,missionItems.get(displayItem),.61))
          actor.prop=actor.props.get(displayItem)
          actor.prop.visible=true
        }
        actor.item=displayItem
      }
      actor.target=player
    }
    const mission=missionsById.get(snapshot.mission)
    for(const item of parcels.values()){
      item.model.visible=false
      item.ground=false
      item.checkout=false
    }
    for(const spot of sites.values())spot.root.visible=false
    for(const site of mission?.sites??[]){
      if(pads.has(site.id))continue
      const area=areas.get(zoneOf(site))
      if(!area)continue
      if(!sites.has(site.id))sites.set(site.id,addMissionSite(area,site))
      const spot=sites.get(site.id)
      spot.root.visible=true
      if(spot.growth){
        spot.growth.visible=snapshot.items.some(item=>item.id==='seed-'+site.id&&item.delivered)
        spot.growth.scale.setScalar(snapshot.items.some(item=>item.id==='water-'+site.id&&item.delivered)?1.25:.72)
      }
    }
    const store=areas.get('store')
    if(store?.npcRoot)store.npcRoot.visible=mission?.id!=='shop'
    for(const item of snapshot.items){
      const p=ensureParcel(missionItems.get(item.id)), area=areas.get(item.zone)
      p.ground=Boolean(area&&!item.owner&&!item.delivered&&!item.checkoutBy)
      p.checkout=Boolean(area&&item.checkoutBy&&!item.delivered)
      p.model.visible=p.ground||p.checkout
      p.zone=item.zone
      p.hit.userData.action.kind=p.checkout?'checkout':'item'
      if(p.model.visible){
        if(p.model.parent!==area.scene)area.scene.add(p.model)
        p.model.position.set(item.point[0],p.checkout?1.415:item.zone==='town'?.22:.04,item.point[1])
      }
    }
  }

  function highlight(action,goal){
    selected=action
    for(const [id,pad] of pads)pad.visible=goal===id||action?.kind==='site'&&action.target===id
    for(const [id,spot] of sites)spot.ring.visible=goal===id||action?.kind==='site'&&action.target===id
    const target=action?.kind==='peer'?actors.get(action.target)?.target.point:
      action?.kind==='door'?(zone==='town'?doors.find(d=>d.id===action.target)?.point:exitPoint):null
    const area=areas.get(zone)
    focusRing.visible=Boolean(target&&area)
    if(focusRing.visible){
      if(focusRing.parent!==area.scene)area.scene.add(focusRing)
      focusRing.position.set(target[0],zone==='town'?.28:.045,target[1])
    }
  }

  function mark(point){
    const area=areas.get(zone)
    if(!area||!point){marker.visible=false;return}
    area.scene.add(marker)
    marker.position.set(point[0],zone==='town'?.29:.052,point[1])
    marker.visible=true
  }

  function showExperience(player,point,green){
    const area=areas.get(zone)
    const e=player?.experience
    personalStep=zone==='store'&&e?.id==='grocery'?{choose:'milk',pay:'register'}[e.step]:null
    experienceRing.visible=Boolean(area&&point)
    experienceObject.visible=Boolean(area&&personalStep)
    if(experienceRing.visible){
      if(experienceRing.parent!==area.scene)area.scene.add(experienceRing)
      experienceRing.position.set(point[0],zone==='town'?.34:.07,point[1])
      experienceRing.material.color.set(e?.id==='crossing'&&green?0x248745:0x315eb6)
    }
    if(experienceObject.visible){
      if(experienceObject.parent!==area.scene)area.scene.add(experienceObject)
      const [x,y,z]=groceryPoints[personalStep].focus
      experienceObject.position.set(x,y+.43,z)
    }
  }

  function animate(now){
    requestAnimationFrame(animate)
    const dt=Math.min(.1,(now-last)/1000)
    last=now;time+=dt
    const area=areas.get(zone)
    const scene=screen==='avatar'?avatarScene:screen==='game'?(area?.scene??town.scene):town.scene
    if(!less&&quality!=='low'&&screen==='lobby'&&scene===town.scene){
      town.trees.forEach((tree,i)=>{tree.rotation.z=Math.sin(time+i*.71)*.024})
      town.clouds.forEach((cloud,i)=>{cloud.position.x=-32+i*22+Math.sin(time*.14+i)*2.2})
    }
    if(scene===town.scene){
      const traffic=state?.road
      town.cars.forEach((car,i)=>{
        const target=traffic?.cars[i]
        if(target!==undefined){
          const previous=car.model.position.x
          car.model.position.x=Math.abs(target-previous)>9?target:T.MathUtils.lerp(previous,target,Math.min(1,dt*18))
        }else{
          car.model.position.x+=car.dir*car.speed*dt
          if(Math.abs(car.model.position.x)>45)car.model.position.x*=-1
        }
        const half=i===2?3.2:1.68
        car.model.visible=car.model.position.x-half>=-38&&car.model.position.x+half<=42
      })
      for(const light of town.signals){
        light.red.material=mat(traffic?.open?0x815854:0xf05648)
        light.green.material=mat(traffic?.open?0x52df8d:0x405b48)
      }
      for(const light of town.trafficSignals){
        light.red.material=mat(traffic?.stopping?0xf05648:0x815854)
        light.green.material=mat(traffic?.stopping?0x405b48:0x69c882)
      }
    }else if(area?.scene===scene&&area.tick)area.tick(dt,time,'idle')

    if(state)renderTick=Math.max(renderTick,Math.min(lastTick,lastTick-2.6+(now-arrival)/50))
    for(const actor of actors.values()){
      if(actor.model.root.parent!==scene)continue
      const {model,target}=actor
      const root=model.root
      const blend=1-Math.exp(-dt*(target.id===myId?21:13))
      if(!actor.samples.length||target.id===myId){
        root.position.x=T.MathUtils.lerp(root.position.x,target.point[0],blend)
        root.position.z=T.MathUtils.lerp(root.position.z,target.point[1],blend)
        if(!target.moving&&Math.hypot(root.position.x-target.point[0],root.position.z-target.point[1])<.012){
          root.position.x=target.point[0];root.position.z=target.point[1]
        }
      }else{
        const next=actor.samples.findIndex(sample=>sample.tick>=renderTick)
        const right=next<0?actor.samples.at(-1):actor.samples[next]
        const left=next<=0?right:actor.samples[next-1]
        const t=right===left?1:T.MathUtils.clamp((renderTick-left.tick)/(right.tick-left.tick),0,1)
        root.position.x=T.MathUtils.lerp(left.point[0],right.point[0],t)
        root.position.z=T.MathUtils.lerp(left.point[1],right.point[1],t)
      }
      const angle=target.angle-root.rotation.y
      root.rotation.y+=Math.atan2(Math.sin(angle),Math.cos(angle))*blend
      const pose=time<actor.waveUntil?'wave':target.moving?'walk':'idle'
      animatePerson(model,time+target.id*.14,pose)
      if(actor.item)for(const arm of model.arms)arm.rotation.x=-1.11
    }
    const activeItem=selected?.kind==='item'?parcels.get(selected.target):null
    for(const p of parcels.values())p.model.scale.setScalar(p===activeItem?1.13:1)
    if(avatar&&screen==='avatar'){
      avatar.root.rotation.y=.27+(less?0:Math.sin(time*.9)*.25)
      animatePerson(avatar,time,'idle')
    }

    let targetSpan,following=false
    if(screen==='avatar'){
      eye.set(2.8,1.85,7.4);want.set(0,1.08,0);targetSpan=4.05
    }else if(scene!==town.scene){
      eye.set(7.2,11.6,17);want.set(0,1.0,-.55);targetSpan=Math.max(12.4,18/(width/height))
      const self=actors.get(myId)
      if(self&&viewRole==='student'&&!overview){
        following=true
        want.x=self.model.root.position.x*.48
        want.z=self.model.root.position.z*.37
        targetSpan=Math.max(9.8,14/(width/height))
      }
    }else{
      eye.set(29,37,45)
      const self=actors.get(myId)
      if(screen==='game'&&self&&viewRole==='student'&&!overview){
        following=true
        want.copy(self.model.root.position)
        targetSpan=Math.max(17.3,26/(width/height))
      }else{
        want.set(2,.13,0)
        targetSpan=Math.max(50,103/(width/height))
      }
    }
    if(following&&!locationChanged&&aim.distanceToSquared(want)<(less?2.25:.36))want.copy(aim)
    const blend=locationChanged?1:1-Math.exp(-dt*(less?4:6))
    aim.lerp(want,blend);span+=(targetSpan-span)*blend;locationChanged=false
    if(aim.distanceToSquared(want)<.000025)aim.copy(want)
    if(Math.abs(span-targetSpan)<.005)span=targetSpan
    camera.position.copy(aim).add(eye)
    camera.lookAt(aim)
    camera.left=-span*width/height/2;camera.right=-camera.left
    camera.top=span/2;camera.bottom=-camera.top
    camera.updateProjectionMatrix()
    renderer.render(scene,camera)
  }
  requestAnimationFrame(animate)
  return {
    show,apply,mark,highlight,setAvatar,showExperience,
    setSession(role,id){viewRole=role;myId=id},
    overview(value){overview=value;locationChanged=true},
    quality(value,reduced){quality=value;less=reduced;resize()},
    clear(){apply({players:[],items:[],road:null});state=null;highlight(null,null);showExperience(null,null,false);marker.visible=false},
    pick(x,y){
      const area=areas.get(zone)
      const bounds=renderer.domElement.getBoundingClientRect()
      if(!area||bounds.width<1||bounds.height<1)return {}
      pointer.set((x-bounds.left)/bounds.width*2-1,1-(y-bounds.top)/bounds.height*2)
      ray.setFromCamera(pointer,camera)
      const current=missionsById.get(state?.mission)
      const targets=area.hits.filter(hit=>hit.userData.action.kind!=='site'||current?.sites.some(site=>site.id===hit.userData.action.target))
      if(personalStep&&area.experienceHits?.has(personalStep))targets.push(area.experienceHits.get(personalStep))
      for(const site of current?.sites??[]){
        const spot=sites.get(site.id)
        if(zoneOf(site)===zone&&spot?.hit)targets.push(spot.hit)
      }
      for(const [id,actor] of actors)if(id!==myId&&actor.target.zone===zone)targets.push(actor.hit)
      for(const p of parcels.values())if((p.ground||p.checkout)&&p.zone===zone)targets.push(p.hit)
      const found=ray.intersectObjects(targets,false)[0]?.object.userData.action
      plane.constant=zone==='town'?-.19:-.035
      const point=ray.ray.intersectPlane(plane,floor)
      return {action:found,point:point?[point.x,point.z]:null}
    },
    studentLabels(){
      const out=[]
      for(const actor of actors.values()){
        if(actor.target.zone!==zone||!actor.model.root.visible)continue
        const pos=actor.model.root.position.clone()
        pos.y+=2.53
        pos.project(camera)
        if(Math.abs(pos.x)>.99||Math.abs(pos.y)>.95)continue
        out.push({id:actor.target.id,x:Math.round((pos.x+1)*width/2),y:Math.round((1-pos.y)*height/2),
          carry:actor.item,position:actor.target.point.join(',')})
      }
      return out
    },
    groundItems(){return [...parcels].filter(([,p])=>p.ground&&p.zone===zone).map(([id])=>id)}
  }
}

