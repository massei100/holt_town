import { randomBytes } from 'node:crypto'
import { clearSegment, directions, distance, doors, encounterRange, exitPoint, planPath, road, rounded, spawn, speed, walkable } from '../shared/world.js'
import { checkoutDisplay, clerk, missionItems, missionsById, siteFor, zoneOf } from '../shared/missions.js'
import { characters, shirtColors } from '../src/content.js'
import { newTraffic, tickTraffic } from './traffic.js'

const codes='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const newToken=()=>randomBytes(24).toString('base64url')
export const makeCode=()=>Array.from(randomBytes(6),byte=>codes[byte%codes.length]).join('')
const ok=(extra={})=>({ok:true,...extra})
const fail=error=>({ok:false,error})
const within=(a,b)=>distance(a,b)<=encounterRange
const still=()=>({path:[],direction:null,expires:0})
const profiles=new Set([...shirtColors,...characters.map(c=>c.top)])
const unicodeName=/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 _-]{1,12}$/u
export function cleanProfile(value){
  const index=Number.isInteger(value?.index)&&characters[value.index]?value.index:0
  const nickname=typeof value?.nickname==='string'?value.nickname.trim():''
  return {index,color:profiles.has(value?.color)?value.color:characters[index].top,nickname:unicodeName.test(nickname)?nickname:''}
}

export class TownRoom {
  constructor(code,teacherToken,now=Date.now()){
    this.code=code
    this.teacher={token:teacherToken,socket:null}
    this.students=new Map()
    this.sequence=0
    this.lastSeen=now
    this.ticks=0
    this.cycle=0
    this.traffic=newTraffic()
    this.reset('waiting')
  }

  addStudent(profile,socket){
    const id=++this.sequence
    const student={id,token:newToken(),socket,awayAt:null,profile:cleanProfile(profile),zone:'town',
      point:spawn(id-1),angle:Math.PI,input:still(),moving:false,carry:null,wave:0,warp:0}
    this.students.set(student.token,student)
    return student
  }

  reset(phase,mission=this.mission?.id??'delivery'){
    this.mission=missionsById.get(mission)
    this.phase=phase
    this.cycle++
    this.lastDelivery=null
    this.items=new Map(this.mission.items.map(p=>[p.id,{id:p.id,point:[...p.start],zone:zoneOf(p),owner:null,delivered:false,checkoutBy:null}]))
    for(const student of this.students.values())student.carry=null
  }

  safe(student){
    student.warp++
    student.zone='town'
    student.point=spawn(student.id-1)
    student.input=still()
    student.angle=Math.PI
    student.moving=false
  }

  detach(student,now){
    student.socket=null
    student.awayAt=now
    student.input=still()
    student.moving=false
    if(student.zone==='town'&&Math.abs(student.point[1])<road.edge+.35)this.safe(student)
  }

  remove(student){
    const item=this.items.get(student.carry)
    if(item&&!item.delivered){
      item.owner=null
      const definition=missionItems.get(item.id)
      item.zone=zoneOf(definition)
      item.point=[...definition.start]
    }
    this.students.delete(student.token)
  }

  input(student,message,now){
    const kind=message?.kind
    if(kind==='stop'){
      student.input=still()
      student.moving=false
      return ok()
    }
    if(kind==='hold'){
      if(!Object.hasOwn(directions,message.direction))return fail('bad-input')
      student.input={path:[],direction:directions[message.direction],expires:now+475}
      return ok()
    }
    if(kind!=='tap'||!Array.isArray(message.point)||message.point.length!==2||
      !message.point.every(Number.isFinite))return fail('bad-input')
    const point=message.point.map(rounded)
    const path=planPath(student.zone,student.point,point)
    if(!path)return fail('blocked')
    student.input={path,direction:null,expires:0}
    return ok({point})
  }

  movement(student,now){
    if(student.input.direction&&student.input.expires>now)return {vector:student.input.direction,remaining:Infinity}
    while(student.input.path.length&&distance(student.point,student.input.path[0])<.07)student.input.path.shift()
    const target=student.input.path[0]
    if(!target)return null
    const remaining=distance(student.point,target)
    return {vector:[(target[0]-student.point[0])/remaining,(target[1]-student.point[1])/remaining],remaining}
  }

  wantsRoad(student,movement){
    if(student.zone!=='town'||Math.abs(student.point[0]-road.x)>road.half+.32)return false
    const z=student.point[1]
    if(Math.abs(z)<road.edge+.33)return true
    return Math.abs(z)<=road.waiting&&movement&&movement.vector[1]*z<-.05
  }

  move(student,movement,dt){
    student.moving=false
    if(!movement)return
    const [x,z]=student.point
    const [dx,dz]=movement.vector
    const stride=Math.min(movement.remaining,dt*speed)
    const next=[x+dx*stride,z+dz*stride]
    const allowed=point=>{
      if(!clearSegment(student.zone,student.point,point))return false
      return student.zone!=='town'||this.traffic.open||Math.abs(point[1])>=road.edge||Math.abs(z)<road.edge
    }
    const options=[next]
    if(student.input.direction)options.push([next[0],z],[x,next[1]])
    for(const point of options){
      if(distance(student.point,point)<.007||!allowed(point))continue
      student.angle=Math.atan2(point[0]-x,point[1]-z)
      student.point=point
      student.moving=true
      break
    }
  }

  tick(dt,now){
    const active=[...this.students.values()].filter(p=>p.socket)
    const moves=active.map(p=>this.movement(p,now))
    tickTraffic(this.traffic,dt,active.some((student,i)=>this.wantsRoad(student,moves[i])))
    for(const [i,student] of active.entries())this.move(student,moves[i],dt)
    this.ticks++
  }

  finishItem(item,student){
    if(item.owner===student.id)student.carry=null
    item.delivered=true
    item.owner=null
    item.checkoutBy=null
    this.lastDelivery={item:item.id,by:student.id}
    if([...this.items.values()].every(p=>p.delivered))this.phase='finished'
    return ok({delivery:true})
  }

  action(student,kind,target,now){
    if(kind==='wave'){
      if(now-student.wave<1500)return fail('busy')
      student.wave=now
      return ok()
    }
    if(kind==='door'){
      const definition=doors.find(p=>p.id===target)
      if(!definition)return fail('too-far')
      if(student.zone==='town'&&within(student.point,definition.point)){
        student.zone=target
        student.point=[...definition.inside]
      }else if(student.zone===target&&within(student.point,exitPoint)){
        student.zone='town'
        student.point=[...definition.point]
      }else return fail('too-far')
      student.input=still()
      student.moving=false
      return ok()
    }
    if(this.phase!=='active')return fail(this.phase==='finished'?'finished':'waiting')
    if(kind==='checkout'){
      const pending=this.items.get(target)
      if(this.mission.method!=='checkout'||!pending?.checkoutBy||pending.delivered)return fail('unavailable')
      if(pending.checkoutBy===student.id)return fail('need-clerk')
      if(student.zone!==clerk.zone||distance(student.point,clerk.point)>clerk.range)return fail('too-far')
      return this.finishItem(pending,student)
    }
    if(kind==='item'){
      const item=this.items.get(target)
      if(student.carry)return fail('hands-full')
      if(!item||item.owner||item.delivered||item.checkoutBy)return fail('unavailable')
      if(item.zone!==student.zone||!within(student.point,item.point))return fail('too-far')
      if(this.mission.method==='collect')return this.finishItem(item,student)
      item.owner=student.id
      student.carry=item.id
      return ok()
    }
    const item=this.items.get(student.carry)
    if(!item||item.owner!==student.id||item.delivered)return fail('empty')
    if(kind==='peer'){
      const other=[...this.students.values()].find(p=>p.id===target&&p.socket)
      if(!other||other===student||other.zone!==student.zone||!within(student.point,other.point))return fail('too-far')
      if(other.carry)return fail('hands-full')
      if(this.mission.method==='peer')return this.finishItem(item,student)
      other.carry=item.id
      item.owner=other.id
      student.carry=null
      return ok()
    }
    if(kind==='site'){
      const site=this.mission.sites.find(p=>p.id===target)
      if(!site||student.zone!==zoneOf(site)||!within(student.point,site.point))return fail('too-far')
      const definition=missionItems.get(item.id)
      if(siteFor(definition)?.id!==site.id)return fail('wrong-site')
      if(definition.requires&&!this.items.get(definition.requires)?.delivered)return fail('plant-first')
      item.zone=zoneOf(site)
      item.point=[...site.point]
      if(this.mission.method==='checkout'){
        if([...this.items.values()].some(p=>p.checkoutBy))return fail('counter-busy')
        item.point=[...checkoutDisplay]
        item.checkoutBy=student.id
        item.owner=null
        student.carry=null
        return ok()
      }
      return this.finishItem(item,student)
    }
    if(kind==='drop'){
      if(student.zone==='town'&&Math.abs(student.point[1])<road.edge+.38)return fail('road')
      const nearSite=this.mission.sites
        .filter(p=>p!==clerk&&zoneOf(p)===student.zone&&within(student.point,p.point))
        .sort((a,b)=>distance(student.point,a.point)-distance(student.point,b.point))[0]
      if(nearSite)return this.action(student,'site',nearSite.id,now)
      if(!walkable(student.zone,...student.point))return fail('blocked')
      item.point=[...student.point]
      item.zone=student.zone
      item.owner=null
      student.carry=null
      return ok()
    }
    return fail('bad-input')
  }

  snapshot(){
    return {
      code:this.code, phase:this.phase, mission:this.mission.id, cycle:this.cycle, tick:this.ticks, lastDelivery:this.lastDelivery,
      players:[...this.students.values()].filter(p=>p.socket).map(p=>({
        id:p.id,...p.profile,zone:p.zone,point:p.point.map(rounded),angle:rounded(p.angle),
        moving:p.moving,carry:p.carry,wave:p.wave,warp:p.warp
      })),
      items:[...this.items.values()].map(p=>({...p,point:p.point.map(rounded)})),
      road:{open:this.traffic.open,stopping:this.traffic.stopping,cars:this.traffic.cars.map(c=>rounded(c.x))}
    }
  }
}

