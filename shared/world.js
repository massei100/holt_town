import { places } from '../src/content.js'
import { CROSS_X } from '../src/game.js'
import { deliveryMission } from './missions.js'
export { deliveryMission } from './missions.js'

export const encounterRange=2.25
export const limit=15
export const speed=5.8
export const rooms=['town','home','store']
export const doors=[
  {id:'home', point:[-24,19.3], inside:[-.2,3.95]},
  {id:'store', point:[-13,-8.85], inside:[-.2,3.95]}
]
export const exitPoint=[-.2,4.6]
export const treePositions=[[-35,11],[-34,19],[-33,24],[-29,24],[-20,24],[-14,17],[-12,23],[-10,10],[-5,18],[0,24],[11,24],[18,23],[21,16],[36,13],[38,22],[40,8],[-35,-20],[-27,-23],[-21,-21],[-15,-23],[-8,-22],[-2,-22],[6,-23],[11,-21],[18,-23],[23,-22],[29,-23],[37,-22],[40,-10],[-36,-7],[0,11],[2,19],[14,12],[14,19],[4,11]]
export const road={x:CROSS_X, half:1.54, edge:5.0, waiting:6.1}
export const directions={
  left:[-.84,.54], right:[.84,-.54], up:[-.54,-.84], down:[.54,.84]
}
export const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
export const rounded=n=>Math.round(n*100)/100
export const spawn=index=>[-9.4+(index%5)*.68,12.2+Math.floor((index%15)/5)*.69]

const rect=(x,z,w,d)=>({x,z,w,d})
const townBlocks=[
  ...places.filter(p=>!['park','bus'].includes(p.id)).map(p=>rect(p.x,p.z,p.id==='hospital'?11.55:10.65,8.45)),
  ...deliveryMission.items.filter(p=>p.house).map(p=>rect(...p.house,5.25,4.25)),
  ...treePositions.map(([x,z])=>rect(x,z,.64,.64)),
  ...[-33,-10,12,35].flatMap(x=>[rect(x,8.45,1.86,.65),rect(x+2.3,8.6,1.5,.82)]),
  rect(28,11.3,6,2.64),rect(10.8,18,4.72,4.72),
  rect(2.3,14.58,1.86,.66),rect(11.4,14.58,1.86,.66),
  rect(.82,17.8,2.04,.65),rect(.2,12.6,2.65,.82),rect(12.3,12.6,2.65,.82)
]
const interiors={
  home:[rect(-4.72,-3.55,3.8,1.45),rect(-4.69,.41,2.38,1.2),rect(4.85,-3.83,3.14,1.25),rect(3.69,1.07,2.95,2.28)],
  store:[rect(-4.23,-4,3.82,1.65),rect(-2.53,.13,7.38,1.13),rect(4.55,-.52,4.34,1.78)]
}
export function walkable(zone,x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false
  const town=zone==='town'
  if(town){
    if(x< -37.4||x>41.4||z< -25.9||z>25.9)return false
    if(Math.abs(z)<road.edge && Math.abs(x-road.x)>road.half)return false
  }else if(!interiors[zone]||Math.abs(x)>7.05||Math.abs(z)>4.88)return false
  const radius=.34
  return !(town?townBlocks:interiors[zone]).some(o=>Math.abs(x-o.x)<o.w/2+radius&&Math.abs(z-o.z)<o.d/2+radius)
}
export function clearSegment(zone,a,b){
  const steps=Math.ceil(distance(a,b)/.32)
  for(let i=1;i<=steps;i++){
    const t=i/steps
    if(!walkable(zone,a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))return false
  }
  return true
}
const offsets=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]
function nearestNode(zone,point,from){
  let best=null,bestDistance=Infinity
  for(let x=Math.round(point[0])-2;x<=Math.round(point[0])+2;x++){
    for(let z=Math.round(point[1])-2;z<=Math.round(point[1])+2;z++){
      const here=[x,z], cost=distance(point,here)
      if(cost>=bestDistance||!walkable(zone,x,z)|| (from&&!clearSegment(zone,from,here)))continue
      best=here
      bestDistance=cost
    }
  }
  return best
}
export function planPath(zone,from,to){
  if(!walkable(zone,...to))return null
  if(clearSegment(zone,from,to))return [to]
  const first=nearestNode(zone,from,from), end=nearestNode(zone,to,to)
  if(!first||!end)return null
  const key=point=>point.join(',')
  const target=key(end)
  const queue=[{point:first,cost:0,rank:distance(first,end),parent:null}]
  const costs=new Map([[key(first),0]])
  while(queue.length){
    let index=0
    for(let i=1;i<queue.length;i++)if(queue[i].rank<queue[index].rank)index=i
    const node=queue.splice(index,1)[0]
    if(node.cost!==costs.get(key(node.point)))continue
    if(key(node.point)===target){
      const path=[to]
      for(let n=node;n;n=n.parent)path.unshift(n.point)
      const smooth=[]
      let anchor=from
      for(let i=0;i<path.length;){
        let furthest=path.length-1
        while(furthest>i&&!clearSegment(zone,anchor,path[furthest]))furthest--
        anchor=path[furthest]
        smooth.push(anchor)
        i=furthest+1
      }
      return smooth
    }
    for(const [dx,dz] of offsets){
      const next=[node.point[0]+dx,node.point[1]+dz]
      if(!clearSegment(zone,node.point,next))continue
      const id=key(next), cost=node.cost+Math.hypot(dx,dz)
      if(cost>=(costs.get(id)??Infinity))continue
      costs.set(id,cost)
      queue.push({point:next,cost,rank:cost+distance(next,end),parent:node})
    }
  }
  return null
}

