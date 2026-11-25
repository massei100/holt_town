import { distance,doors,road } from './world.js'

export const storeDoor=doors.find(door=>door.id==='store')
export const groceryPoints={
  milk:{point:[-5.18,1.54],focus:[-5.18,1.72,.38],label:'우유 담기',range:1.6},
  register:{point:[3.98,1.43],focus:[3.73,1.53,-.05],label:'카드 결제',range:1.65}
}
export const parkStops=[[3.9,13.1],[6.9,14.6],[6,18.8]]
const parkGate=[7,9.3]
export const experiences={
  grocery:{id:'grocery',title:'편의점 장보기',icon:'store',intro:'편의점에서 우유를 고르고 계산해요.'},
  crossing:{id:'crossing',title:'횡단보도 건너기',icon:'cross',intro:'초록불을 기다렸다가 건너요.'},
  park:{id:'park',title:'공원 산책',icon:'map',intro:'공원의 표시 세 곳을 찾아 걸어요.'}
}
export const activeExperience=player=>Boolean(player?.experience&&player.experience.step!=='done')
export function inCrossingApproach(point,side){
  return Math.sign(point[1])===side&&Math.abs(point[0]-road.x)<=road.half+.35&&
    Math.abs(point[1])>=road.edge+.1&&Math.abs(point[1])<=road.edge+2.25
}
export function nearbyExperiences(player){
  if(!player||player.carry||activeExperience(player))return []
  const {zone,point}=player
  if(zone==='store'&&distance(point,storeDoor.inside)<=2.35)return ['grocery']
  if(zone!=='town')return []
  return [
    ...(distance(point,storeDoor.point)<=2.8?['grocery']:[]),
    ...(inCrossingApproach(point,Math.sign(point[1]))?['crossing']:[]),
    ...(distance(point,parkGate)<=2.8?['park']:[])
  ]
}
export const otherCurb=side=>[road.x,-side*(road.edge+1.2)]
export function groceryAction(player){
  if(player?.zone!=='store'||player.experience?.id!=='grocery')return null
  const target={choose:'milk',pay:'register'}[player.experience.step]
  const spot=groceryPoints[target]
  return spot&&distance(player.point,spot.point)<=spot.range?target:null
}
export function experienceGuide(player,green){
  const e=player?.experience
  if(!e)return ''
  if(e.step==='done')return '체험 완료!'
  if(e.id==='grocery'){
    if(player.zone!=='store')return '편의점 문을 열고 안으로 들어가요.'
    return e.step==='choose'?'진열대에서 우유를 찾아 담아요.':'계산대로 가서 카드로 결제해요.'
  }
  if(e.id==='crossing'){
    if(e.step==='crossing')return '횡단보도를 따라 건너편 인도까지 가요.'
    if(!inCrossingApproach(player.point,e.side))return '미션을 시작한 쪽 횡단보도 입구로 가요.'
    return green?'초록불이에요. 건너편 인도로 가요.':'빨간불이에요. 인도에서 기다려요.'
  }
  return '다음 바닥 표시까지 걸어요. '+e.stop+' / '+parkStops.length
}
export function experienceGoal(player,green){
  const e=player?.experience
  if(!activeExperience(player))return null
  if(e.id==='grocery'){
    if(player.zone==='town')return storeDoor.point
    if(player.zone==='store')return groceryPoints[e.step==='pay'?'register':'milk'].point
  }
  if(e.id==='crossing'&&player.zone==='town'){
    if(e.step==='crossing'||green&&inCrossingApproach(player.point,e.side))return otherCurb(e.side)
    return [road.x,e.side*(road.edge+1.2)]
  }
  if(e.id==='park'&&player.zone==='town')return parkStops[e.stop]
  return null
}

