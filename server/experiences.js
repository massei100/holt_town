import { activeExperience,groceryAction,inCrossingApproach,nearbyExperiences,parkStops } from '../shared/experiences.js'
import { distance,road } from '../shared/world.js'

export function beginExperience(student,id){
  if(!nearbyExperiences(student).includes(id))return false
  if(id==='grocery')student.experience={id,step:student.zone==='store'?'choose':'enter'}
  else if(id==='crossing')student.experience={id,step:'wait',side:Math.sign(student.point[1])}
  else student.experience={id,step:'walk',stop:0}
  return true
}

export function useExperience(student,target){
  if(!groceryAction(student)||groceryAction(student)!==target)return false
  student.experience.step=target==='milk'?'pay':'done'
  return true
}

export function requestsGreen(student){
  const e=student.experience
  return student.zone==='town'&&e?.id==='crossing'&&e.step==='wait'&&inCrossingApproach(student.point,e.side)
}

export function updateExperience(student,previousPoint,green){
  const e=student.experience
  if(!activeExperience(student)||student.zone!=='town')return
  if(e.id==='park'&&distance(student.point,parkStops[e.stop])<=1.15){
    if(++e.stop===parkStops.length)e.step='done'
  }
  if(e.id!=='crossing')return
  const [x,z]=student.point
  const withinCrossing=Math.abs(x-road.x)<=road.half
  if(e.step==='wait'&&green&&withinCrossing&&Math.sign(previousPoint[1])===e.side&&
    Math.abs(previousPoint[1])>=road.edge&&Math.abs(z)<road.edge)e.step='crossing'
  if(e.step==='crossing'&&Math.abs(z)>=road.edge+.36){
    if(Math.sign(z)===e.side)e.step='wait'
    else if(withinCrossing)e.step='done'
  }
}

