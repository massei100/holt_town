import { places, products, missions } from './content.js'

export const SOUTH = 6.4
export const NORTH = -6.4
export const CROSS_X = -4
const crossSouth = 'cross-south'
const crossNorth = 'cross-north'
export const nodes = {
  [crossSouth]: [CROSS_X, SOUTH], [crossNorth]: [CROSS_X, NORTH]
}
const graph = {}
function link(a,b) {
  graph[a] ??= []
  graph[b] ??= []
  graph[a].push(b)
  graph[b].push(a)
}
for (const side of ['north','south']) {
  const z = side === 'north' ? NORTH : SOUTH
  const ids = [side === 'north' ? crossNorth : crossSouth]
  for (const p of places.filter(p => p.side === side)) {
    nodes[p.id + '-walk'] = [p.x,z]
    if (p.id === 'home') {
      nodes['home-walk'] = [p.x + 6,z]
      nodes['home-side'] = [p.x + 6,19.4]
      nodes.home = [p.x,19.4]
      link('home-walk','home-side')
      link('home-side','home')
    } else {
      nodes[p.id] = [p.x, z + (side === 'north' ? -3 : p.id === 'park' ? 2.6 : .8)]
      link(p.id + '-walk',p.id)
    }
    ids.push(p.id + '-walk')
  }
  ids.sort((a,b)=>nodes[a][0]-nodes[b][0])
  ids.slice(1).forEach((id,i)=>link(ids[i],id))
}
link(crossSouth,crossNorth)
export function route(from,to) {
  const queue = [[from]]
  const seen = new Set([from])
  for (const path of queue) {
    const last = path.at(-1)
    if (last === to) return path.slice(1)
    for (const next of graph[last] ?? []) if (!seen.has(next)) {
      seen.add(next)
      queue.push([...path,next])
    }
  }
  return []
}
export function isCrossing(a,b) {
  return (a === crossSouth && b === crossNorth) || (a === crossNorth && b === crossSouth)
}
export function safety() { return {green:false, stopped:false, left:false, right:false, crossing:false} }
export function canCross(signal) {
  return signal.green && signal.stopped && signal.left && signal.right && !signal.crossing
}
export function stopLineLimit(distance,halfLength,stop) {
  const line=halfLength+2.75
  return stop&&distance>=line-.001?Math.max(0,distance-line):Infinity
}
export function crosswalkOccupied(distance,halfLength) {
  return distance> -halfLength-2.5&&distance<halfLength+2.75-.001
}
export function changeSignal(state, action) {
  if (state.crossing) return state
  if (action === 'green') return {...state,green:true}
  if (action === 'stopped' && state.green) return {...state,stopped:true}
  if (state.green && state.stopped && ['left','right'].includes(action)) return {...state,[action]:true}
  if (action === 'cross' && canCross(state)) return {...state,crossing:true}
  return state
}
export function advance(run,event) {
  const expected = missions[run.mission]?.steps[run.step]?.id
  if (event !== expected || !expected) return run
  return {...run, step:run.step+1}
}
export const newRun = (mode, character) => ({
  mode, character, mission:mode === 'mission' ? 'milk' : null, step:0,
  node:'home', room:'home', shop:{phase:'list', item:null, method:null}
})
export function shopAction(shop, action, value, {easy, needMilk}) {
  if (action === 'start' && shop.phase === 'list') return {...shop,phase:'choose'}
  if (action === 'choose' && shop.phase === 'choose' && products.some(p=>p.id===value) && (!needMilk || value==='milk')) return {...shop,item:value,phase:'picked'}
  if (action === 'basket' && shop.phase === 'picked') return {...shop,phase:'basket'}
  if (action === 'counter' && shop.phase === 'basket') return {...shop,phase:easy?'pay':'method'}
  if (action === 'method' && shop.phase === 'method' && ['card','cash'].includes(value)) return {...shop,method:value,phase:'pay'}
  if (action === 'pay' && shop.phase === 'pay' && (easy || shop.method)) return {...shop,method:shop.method ?? 'card',phase:'collect'}
  if (action === 'collect' && shop.phase === 'collect') return {...shop,phase:'done'}
  return shop
}

