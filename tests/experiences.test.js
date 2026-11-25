import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TownRoom } from '../server/room.js'
import { groceryPoints, nearbyExperiences, otherCurb, parkStops, storeDoor } from '../shared/experiences.js'
import { planPath, road } from '../shared/world.js'

test('personal grocery opens at the entrance and validates shelf and register separately',()=>{
  const room=new TownRoom('ABCDEF','teacher')
  const student=room.addStudent({},{}),friend=room.addStudent({}, {})
  assert.equal(room.action(student,'experience-start','grocery',0).ok,false)
  student.point=[...storeDoor.point]
  assert.deepEqual(nearbyExperiences(student),['grocery'])
  assert.equal(room.action(student,'experience-start','grocery',0).ok,true)
  assert.equal(student.experience.step,'enter')
  assert.equal(room.action(student,'door','store',0).ok,true)
  assert.equal(student.experience.step,'choose')
  student.point=[...groceryPoints.register.point]
  assert.equal(room.action(student,'experience-use','register',0).ok,false)
  student.point=[...groceryPoints.milk.point]
  assert.equal(room.action(student,'experience-use','milk',0).ok,true)
  assert.equal(student.experience.step,'pay')
  student.point=[...groceryPoints.register.point]
  assert.equal(room.action(student,'experience-use','register',0).ok,true)
  assert.equal(student.experience.step,'done')
  assert.equal(friend.experience,null)
  assert.equal(room.phase,'waiting')
  assert.ok(room.snapshot().items.every(p=>!p.delivered))
})

for(const side of [-1,1])test('personal crossing requires green and reaches the opposite sidewalk from side '+side,()=>{
  const room=new TownRoom('ABCDEF','teacher')
  const student=room.addStudent({}, {})
  student.point=[road.x,side*6.4]
  assert.equal(room.action(student,'experience-start','crossing',0).ok,true)
  assert.equal(room.action(student,'experience-cross',null,0).error,'red-light')
  student.point=[road.x,-side*6.4]
  room.tick(.05,50)
  assert.equal(student.experience.step,'wait')
  student.point=[road.x,side*6.4]
  for(let n=0;n<120&&!room.traffic.open;n++)room.tick(.05,n*50)
  assert.equal(room.traffic.open,true)
  assert.equal(room.action(student,'experience-cross',null,4000).ok,true)
  for(let n=0;n<200&&student.experience.step!=='done';n++){
    room.tick(.05,4000+n*50)
    if(Math.abs(student.point[1])<road.edge)assert.equal(room.traffic.open,true)
  }
  assert.equal(student.experience.step,'done')
  assert.equal(Math.sign(student.point[1]),-side)
  assert.ok(Math.abs(student.point[1])<=Math.abs(otherCurb(side)[1]))
})

test('park walk updates only in order and all stops are reachable',()=>{
  const room=new TownRoom('ABCDEF','teacher')
  const student=room.addStudent({}, {})
  student.point=[7,9.3]
  assert.equal(room.action(student,'experience-start','park',0).ok,true)
  assert.equal(room.action(student,'experience-start','crossing',1).ok,false)
  student.point=parkStops[1]
  room.tick(.05,50)
  assert.equal(student.experience.stop,0)
  let previous=[7,9.3]
  for(const [i,point] of parkStops.entries()){
    assert.ok(planPath('town',previous,point))
    student.point=point
    room.tick(.05,100+i*50)
    assert.equal(student.experience.stop,i+1)
    previous=point
  }
  assert.equal(student.experience.step,'done')
})

test('teacher switching the class mission preserves the student experience',()=>{
  const room=new TownRoom('ABCDEF','teacher')
  const student=room.addStudent({}, {})
  student.point=[...storeDoor.point]
  assert.equal(room.action(student,'experience-start','grocery',0).ok,true)
  room.reset('active','garden')
  assert.equal(room.snapshot().mission,'garden')
  assert.equal(student.experience.id,'grocery')
  assert.equal(room.action(student,'item',room.snapshot().items[0].id,10).error,'experience-active')
  assert.equal(room.action(student,'experience-cancel',null,20).ok,true)
  assert.equal(student.experience,null)
})

