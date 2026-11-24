import { crosswalkOccupied, stopLineLimit } from '../src/game.js'
import { road } from '../shared/world.js'

export function newTraffic(){
  return {
    open:false, stopping:false, hold:0,
    cars:[
      {x:-34,v:5.7,d:1,h:1.68},{x:-15,v:7,d:1,h:1.68},{x:25,v:6.6,d:1,h:3.2},
      {x:36,v:6.8,d:-1,h:1.68},{x:10,v:6.05,d:-1,h:1.68},{x:-20,v:6.55,d:-1,h:1.68}
    ]
  }
}
export function tickTraffic(traffic,dt,wanted){
  traffic.hold=wanted ? .65 : Math.max(0,traffic.hold-dt)
  const stopping=wanted||traffic.hold>0
  let clear=true
  for(const direction of [-1,1]){
    const lane=traffic.cars.filter(car=>car.d===direction).sort((a,b)=>(b.x-a.x)*direction)
    for(let i=0;i<lane.length;i++){
      const car=lane[i], ahead=lane[i-1]
      const gap=ahead?Math.max(0,(ahead.x-car.x)*direction-ahead.h-car.h-1.2):Infinity
      const remaining=stopLineLimit((road.x-car.x)*direction,car.h,stopping)
      car.x+=direction*Math.min(car.v*dt,gap,remaining)
      if(car.x>46)car.x=-46
      if(car.x< -46)car.x=46
      if(crosswalkOccupied((road.x-car.x)*direction,car.h))clear=false
    }
  }
  traffic.stopping=stopping
  traffic.open=stopping&&clear
}

