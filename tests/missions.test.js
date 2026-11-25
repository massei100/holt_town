import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TownRoom } from '../server/room.js'
import { missionList,missionsById,siteFor,clerk,zoneOf } from '../shared/missions.js'
import { planPath,spawn,walkable } from '../shared/world.js'

function setup(mission){
  const room=new TownRoom('ABCDEF','teacher')
  const a=room.addStudent({},{}),b=room.addStudent({}, {})
  room.reset('active',mission)
  return {room,a,b}
}
function pick(room,student,item){
  student.zone=zoneOf(item)
  student.point=[...item.start]
  assert.equal(room.action(student,'item',item.id,2000).ok,true)
}
function place(room,student,site){
  student.zone=zoneOf(site)
  student.point=[...site.point]
  return room.action(student,'site',site.id,2000)
}

test('all six missions have accessible grounds and marked destinations',()=>{
  assert.equal(missionList.length,6)
  for(const mission of missionList){
    for(const item of mission.items){
      assert.ok(walkable(zoneOf(item),...item.start),item.id)
      assert.ok(planPath(zoneOf(item),zoneOf(item)==='town'?spawn(0):[-.2,3.95],item.start),item.id)
    }
    for(const site of mission.sites){
      assert.ok(walkable(zoneOf(site),...site.point),site.id)
      assert.ok(planPath(zoneOf(site),zoneOf(site)==='town'?spawn(0):[-.2,3.95],site.point),site.id)
    }
  }
})

test('recycling rejects a wrong bin and completes when all material is sorted',()=>{
  const {room,a}=setup('recycling')
  const mission=missionsById.get('recycling')
  for(const [i,item] of mission.items.entries()){
    pick(room,a,item)
    if(i===0){
      assert.equal(place(room,a,mission.sites[1]).error,'wrong-site')
      assert.equal(a.carry,item.id)
    }
    assert.equal(place(room,a,siteFor(item)).delivery,true)
  }
  assert.equal(room.snapshot().phase,'finished')
})

test('relay requires a different nearby real student for every handoff',()=>{
  const {room,a,b}=setup('relay')
  for(const item of missionsById.get('relay').items){
    pick(room,a,item)
    assert.equal(room.action(a,'peer',a.id,2000).error,'too-far')
    b.zone='home'
    assert.equal(room.action(a,'peer',b.id,2000).error,'too-far')
    b.zone=a.zone;b.point=a.point
    assert.equal(room.action(a,'peer',b.id,2000).delivery,true)
  }
  assert.equal(room.snapshot().phase,'finished')
})

test('the same garden bed must be planted before it is watered',()=>{
  const {room,a}=setup('garden')
  const [seed,water,...rest]=missionsById.get('garden').items
  pick(room,a,water)
  assert.equal(place(room,a,siteFor(water)).error,'plant-first')
  a.point=[...water.start]
  assert.equal(room.action(a,'drop',null,2000).ok,true)
  for(const item of [seed,water,...rest]){
    pick(room,a,item)
    assert.equal(place(room,a,siteFor(item)).delivery,true)
  }
  assert.equal(room.snapshot().phase,'finished')
})

test('treasures count on pickup, cannot be collected twice and clear on a mission switch',()=>{
  const {room,a,b}=setup('treasure')
  for(const item of missionsById.get('treasure').items){
    pick(room,a,item)
    assert.equal(a.carry,null)
    b.point=a.point
    assert.equal(room.action(b,'item',item.id,2000).ok,false)
  }
  assert.equal(room.snapshot().phase,'finished')
  room.reset('active','delivery')
  assert.deepEqual(room.snapshot().items.map(item=>item.id),['red','blue','gold','green'])
  assert.equal(room.snapshot().mission,'delivery')
})

test('checkout needs a different student at the clerk spot',()=>{
  const {room,a,b}=setup('shop')
  const products=missionsById.get('shop').items
  for(const item of products){
    pick(room,a,item)
    assert.equal(place(room,a,siteFor(item)).ok,true)
    assert.equal(room.items.get(item.id).delivered,false)
    a.point=clerk.point
    assert.equal(room.action(a,'checkout',item.id,2000).error,'need-clerk')
    b.zone='store';b.point=[-1,4]
    assert.equal(room.action(b,'checkout',item.id,2000).error,'too-far')
    b.point=clerk.point
    assert.equal(room.action(b,'checkout',item.id,2000).delivery,true)
  }
  assert.equal(room.snapshot().phase,'finished')
})

