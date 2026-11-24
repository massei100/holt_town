import { test } from 'node:test'
import assert from 'node:assert/strict'
import { places } from '../src/content.js'
import { advance, canCross, changeSignal, crosswalkOccupied, isCrossing, newRun, nodes, route, safety, shopAction, stopLineLimit } from '../src/game.js'

test('every destination uses the pedestrian graph and crossing is the only road connection',()=>{
  for(const a of places) for(const b of places){
    const way=route(a.id,b.id)
    assert.equal(way.at(-1)??a.id,b.id)
    let previous=a.id
    let crosses=0
    for(const point of way){
      if(Math.sign(nodes[previous][1])!==Math.sign(nodes[point][1])){
        assert.ok(isCrossing(previous,point))
        crosses++
      }
      previous=point
    }
    assert.equal(crosses,a.side===b.side?0:1)
  }
})
test('walking segments provide clearance from every building footprint',()=>{
  const buildings=places.filter(p=>!['bus','park'].includes(p.id))
  for(const a of places)for(const b of places){
    let start=nodes[a.id]
    for(const id of route(a.id,b.id)){
      const end=nodes[id]
      const samples=Math.ceil(Math.hypot(end[0]-start[0],end[1]-start[1])/.15)
      for(let i=0;i<=samples;i++){
        const x=start[0]+(end[0]-start[0])*i/samples
        const z=start[1]+(end[1]-start[1])*i/samples
        for(const p of buildings){
          const halfWidth=p.id==='hospital'?5.75:5.3
          assert.ok(Math.abs(x-p.x)>=halfWidth+.32||Math.abs(z-p.z)>=4.2+.32,a.id+' → '+b.id+' near '+p.id)
        }
      }
      start=end
    }
  }
})
test('turning green and confirming both sides is required in either order',()=>{
  let signal=safety()
  assert.equal(changeSignal(signal,'cross'),signal)
  assert.equal(changeSignal(signal,'left'),signal)
  signal=changeSignal(signal,'green')
  assert.equal(canCross(signal),false)
  assert.equal(changeSignal(signal,'right'),signal)
  signal=changeSignal(signal,'stopped')
  signal=changeSignal(signal,'right')
  assert.equal(canCross(signal),false)
  signal=changeSignal(signal,'left')
  assert.equal(canCross(signal),true)
  signal=changeSignal(signal,'cross')
  assert.equal(canCross(signal),false)
  assert.equal(changeSignal(signal,'left'),signal)
})
test('approaching vehicles remain outside an open pedestrian crossing',()=>{
  for(const half of [1.68,3.2]){
    let distance=31
    for(let i=0;i<60;i++){
      distance-=Math.min(2.5,stopLineLimit(distance,half,true))
      assert.equal(crosswalkOccupied(distance,half),false)
    }
    assert.ok(Math.abs(distance-(half+2.75))<1e-8)
    assert.equal(stopLineLimit(distance-.0001,half,true),0)
    assert.equal(crosswalkOccupied(0,half),true)
    assert.equal(stopLineLimit(0,half,true),Infinity)
    assert.equal(crosswalkOccupied(-half-2.6,half),false)
  }
})
test('milk mission rejects out-of-order actions and persists the semantic steps',()=>{
  let run=newRun('mission',{index:2})
  assert.equal(advance(run,'return'),run)
  for(const event of ['brief','cross','choose','pay','return'])run=advance(run,event)
  assert.equal(run.step,5)
  assert.equal(advance(run,'return'),run)
})
test('shop supports both payment paths, fails closed, and checks the requested product',()=>{
  const start={phase:'list',item:null,method:null}
  for(const easy of [true,false]){
    let opts={easy,needMilk:true}
    let s=shopAction(start,'start',null,opts)
    assert.equal(shopAction(s,'choose','juice',opts),s)
    assert.equal(shopAction(s,'pay',null,opts),s)
    s=shopAction(s,'choose','milk',opts)
    s=shopAction(s,'basket',null,opts)
    s=shopAction(s,'counter',null,opts)
    if(!easy){
      assert.equal(shopAction(s,'pay',null,opts),s)
      s=shopAction(s,'method','cash',opts)
    }
    s=shopAction(s,'pay',null,opts)
    assert.equal(s.method,easy?'card':'cash')
    s=shopAction(s,'collect',null,opts)
    assert.equal(s.phase,'done')
  }
})

