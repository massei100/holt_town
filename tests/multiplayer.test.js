import { once } from 'node:events'
import { setTimeout as sleep } from 'node:timers/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { io } from 'socket.io-client'
import { createGameServer } from '../server/index.js'
import { TownRoom } from '../server/room.js'
import { clearSegment,deliveryMission,doors,planPath,road,spawn,walkable } from '../shared/world.js'

async function open(t,options={}){
  const service=createGameServer(options)
  service.http.listen(0,'127.0.0.1')
  await once(service.http,'listening')
  const address='http://127.0.0.1:'+service.http.address().port
  const sockets=[]
  t.after(async()=>{
    for(const socket of sockets)socket.disconnect()
    await service.close()
  })
  async function client(){
    const socket=io(address,{transports:['websocket'],timeout:3000,reconnection:false})
    sockets.push(socket)
    await once(socket,'connect')
    return socket
  }
  return {client,address,rooms:service.rooms}
}
const ask=(socket,event,data)=>socket.timeout(5000).emitWithAck(event,...(data===undefined?[]:[data]))
async function stateSocket(socket,condition){
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{socket.off('world',handler);reject(Error('Snapshot not received'))},6500)
    function handler(state){
      if(!condition(state))return
      clearTimeout(timeout)
      socket.off('world',handler)
      resolve(state)
    }
    socket.on('world',handler)
  })
}

test('the store door opens immediately after selecting groceries and ignores a repeated entry',async t=>{
  const service=await open(t)
  const teacher=await service.client(),student=await service.client()
  const created=await ask(teacher,'room:create',{})
  const joined=await ask(student,'room:join',{code:created.code,profile:{}})
  assert.equal(joined.ok,true)
  const player=service.rooms.get(created.code).students.get(joined.token)
  const store=doors.find(door=>door.id==='store')
  player.point=[...store.point]
  assert.equal((await ask(student,'act',{kind:'experience-start',target:'grocery'})).ok,true)
  const entry={kind:'door',target:'store',from:'town'}
  const opened=await ask(student,'act',entry)
  assert.equal(opened.ok,true,opened.error)
  assert.equal(player.zone,'store')
  assert.equal(player.experience.step,'choose')
  await sleep(260)
  assert.equal((await ask(student,'act',entry)).ok,false)
  assert.equal(player.zone,'store')
  await sleep(260)
  assert.equal((await ask(student,'act',{...entry,from:'store'})).ok,true)
  assert.equal(player.zone,'town')
})

test('navigation keeps planned routes away from building footprints and uses the marked crossing',()=>{
  const start=spawn(0)
  for(const item of deliveryMission.items){
    const path=planPath('town',start,item.site)
    assert.ok(path,'site '+item.id)
    let previous=start
    for(const point of path){assert.ok(clearSegment('town',previous,point));previous=point}
    assert.deepEqual(previous,item.site)
  }
  const target=doors[1].point
  const path=planPath('town',start,target)
  assert.ok(path)
  let previous=start
  for(const point of path){
    assert.ok(clearSegment('town',previous,point))
    for(let i=0;i<=20;i++){
      const p=previous.map((v,axis)=>v+(point[axis]-v)*i/20)
      if(Math.abs(p[1])<road.edge)assert.ok(Math.abs(p[0]-road.x)<=road.half)
    }
    previous=point
  }
  assert.equal(walkable('town',-24,14),false)
  assert.equal(planPath('town',start,[-24,14]),null)
  assert.equal(planPath('town',start,[10,0]),null)
})

test('a planned northbound trip waits for a vacant crossing and arrives at the store',()=>{
  const room=new TownRoom('ABCDEF','teacher')
  const actor=room.addStudent({}, {})
  assert.equal(room.input(actor,{kind:'tap',point:doors[1].point},1000).ok,true)
  let sawOpen=false
  for(let i=0;i<1200;i++){
    room.tick(.05,1000+i*50)
    if(Math.abs(actor.point[1])<road.edge){
      assert.ok(room.traffic.open)
      sawOpen=true
    }
    if(!actor.input.path.length)break
  }
  assert.ok(sawOpen)
  assert.ok(Math.hypot(actor.point[0]-doors[1].point[0],actor.point[1]-doors[1].point[1])<.09)
  assert.equal(room.action(actor,'door','store',100_000).ok,true)
  assert.equal(actor.zone,'store')
  assert.equal(room.action(actor,'door','store',100_001).ok,true)
  assert.equal(actor.zone,'town')
})

test('ownership, color-and-symbol destinations, transfer, drop, and cooperative completion are authoritative',()=>{
  const room=new TownRoom('ABCDEF','teacher')
  const a=room.addStudent({},{}),b=room.addStudent({}, {})
  room.reset('active')
  for(const [i,thing] of deliveryMission.items.entries()){
    a.point=[...thing.start];b.point=[...thing.start]
    assert.equal(room.action(a,'item',thing.id,5000).ok,true)
    assert.equal(room.action(b,'item',thing.id,5000).error,'unavailable')
    if(i===0){
      assert.equal(room.action(a,'peer',b.id,5001).ok,true)
      assert.equal(a.carry,null)
      assert.equal(b.carry,thing.id)
      assert.equal(room.action(b,'drop',null,5002).ok,true)
      assert.equal(room.items.get(thing.id).owner,null)
      assert.equal(room.action(a,'item',thing.id,5003).ok,true)
      a.point=deliveryMission.items[1].site
      assert.equal(room.action(a,'site',deliveryMission.items[1].id,5004).error,'wrong-site')
      assert.equal(a.carry,thing.id)
    }
    a.point=[...thing.site]
    assert.equal(room.action(a,'site',thing.id,5005).delivery,true)
    assert.equal(room.items.get(thing.id).delivered,true)
    assert.notEqual(room.action(a,'item',thing.id,5006).ok,true)
  }
  assert.equal(room.snapshot().phase,'finished')
  assert.equal(room.snapshot().items.filter(p=>p.delivered).length,4)
})

test('independent Socket.IO clients share a room with real role checks and authenticated reconnect',async t=>{
  const {client}=await open(t,{teacherPin:'class-secret'})
  const teacher=await client(),a=await client(),b=await client(),other=await client()
  assert.equal((await ask(teacher,'room:create',{pin:'wrong'})).error,'teacher-pin')
  await sleep(470)
  const created=await ask(teacher,'room:create',{pin:'class-secret'})
  assert.ok(created.ok)
  assert.equal(created.world.players.length,0)
  const otherRoom=await ask(other,'room:create',{pin:'class-secret'})
  assert.ok(otherRoom.ok)
  const playerA=await ask(a,'room:join',{code:created.code,profile:{index:2,nickname:'<img>'}})
  const playerB=await ask(b,'room:join',{code:created.code,profile:{index:0}})
  assert.equal(playerB.world.players.length,2)
  assert.equal(playerB.world.players[0].nickname,'')
  assert.equal((await ask(a,'teacher',{command:'start'})).error,'role')
  assert.equal((await ask(teacher,'teacher',{command:'start'})).ok,true)
  assert.equal((await ask(a,'move',{kind:'tap',point:[999,0]})).error,'blocked')
  const [pa,pb]=await Promise.all([ask(a,'act',{kind:'item',target:'blue'}),ask(b,'act',{kind:'item',target:'blue'})])
  assert.equal(Number(pa.ok)+Number(pb.ok),1)
  const holder=pa.ok?playerA.id:playerB.id
  const shared=await stateSocket(teacher,state=>state.items[1].owner===holder)
  assert.equal(shared.players.find(p=>p.id===holder).carry,'blue')
  const departure=stateSocket(teacher,state=>state.players.length===1)
  a.disconnect()
  await departure
  const reunion=await client()
  const restored=await ask(reunion,'room:resume',{code:created.code,token:playerA.token})
  assert.equal(restored.id,playerA.id)
  assert.equal(restored.world.players.length,2)
  const isolated=await stateSocket(other,state=>state.code===otherRoom.code)
  assert.equal(isolated.players.length,0)
  assert.equal((await ask(teacher,'teacher',{command:'safe'})).ok,true)
  await sleep(420)
  const ended=once(reunion,'room:closed')
  assert.equal((await ask(teacher,'teacher',{command:'end'})).ok,true)
  assert.equal((await ended)[0],'ended')
})

test('15 live students receive state under simultaneous input and a sixteenth is refused', async t=>{
  const {client}=await open(t)
  const teacher=await client()
  const room=await ask(teacher,'room:create',{})
  const players=await Promise.all(Array.from({length:15},()=>client()))
  const entries=await Promise.all(players.map(p=>ask(p,'room:join',{code:room.code})))
  assert.ok(entries.every(r=>r.ok))
  const extra=await client()
  assert.equal((await ask(extra,'room:join',{code:room.code})).error,'full')
  let frames=0,totalBytes=0,fullRoster=0
  for(const socket of players)socket.on('world',state=>{
    frames++
    totalBytes+=Buffer.byteLength(JSON.stringify(state))
    if(state.players.length===15)fullRoster++
  })
  const samples=[]
  for(let i=0;i<15;i++){
    await Promise.all(players.map(async p=>{
      const start=performance.now()
      assert.equal((await ask(p,'move',{kind:'hold',direction:i%2?'down':'right'})).ok,true)
      samples.push(performance.now()-start)
    }))
    await sleep(115)
  }
  samples.sort((a,b)=>a-b)
  assert.ok(fullRoster>=150)
  t.diagnostic('15 sockets, '+samples.length+' movement ACKs, p95 '+samples[Math.floor(samples.length*.95)].toFixed(1)+' ms, '+frames+' snapshots, mean '+Math.round(totalBytes/frames)+' JSON bytes')
})

