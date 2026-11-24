import { timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import { fileURLToPath, pathToFileURL } from 'node:url'
import express from 'express'
import { Server } from 'socket.io'
import { limit } from '../shared/world.js'
import { makeCode, newToken, TownRoom } from './room.js'

const maximumRooms=24
const studentGrace=60_000
const emptyRoomGrace=15*60_000
const tickMs=50
const report=(ack,result)=>{if(typeof ack==='function')ack(result)}
const failure=error=>({ok:false,error})
const validCode=code=>typeof code==='string'&&/^[A-Z2-9]{6}$/.test(code)
function matchesPin(expected,value){
  if(!expected)return true
  if(typeof value!=='string'||value.length>80)return false
  const a=Buffer.from(expected),b=Buffer.from(value)
  return a.length===b.length&&timingSafeEqual(a,b)
}

export function createGameServer({teacherPin=process.env.TEACHER_PIN,dist=fileURLToPath(new URL('../dist',import.meta.url))}={}){
  const app=express()
  app.disable('x-powered-by')
  app.get('/healthz',(_req,res)=>res.json({ok:true}))
  app.get('/game-config',(_req,res)=>res.json({teacherPin:Boolean(teacherPin),capacity:limit}))
  app.use(express.static(dist,{setHeaders(res,path){
    if(path.endsWith('.html'))res.setHeader('Cache-Control','no-cache')
  }}))
  const http=createServer(app)
  const io=new Server(http,{maxHttpBufferSize:6144,perMessageDeflate:false,allowRequest(req,callback){
    const origin=req.headers.origin
    if(!origin)return callback(null,true)
    try{
      const parsed=new URL(origin)
      callback(null,['https:','http:'].includes(parsed.protocol)&&
        [req.headers.host,process.env.RENDER_EXTERNAL_HOSTNAME].includes(parsed.host))
    }catch{callback(null,false)}
  }})
  const rooms=new Map()
  let last=Date.now()

  function publish(room,reliable=false){
    const channel=io.to(room.code)
    const target=reliable?channel:channel.volatile
    target.emit('world',room.snapshot())
  }

  function active(socket){
    const room=rooms.get(socket.data.code)
    if(!room)return null
    const player=room.students.get(socket.data.token)
    if(player?.socket===socket)return {room,player}
    if(room.teacher.socket===socket)return {room}
    return null
  }

  function unlink(socket,leaving){
    const session=active(socket)
    if(!session)return
    const {room,player}=session
    if(player){
      if(leaving)room.remove(player)
      else room.detach(player,Date.now())
    }else room.teacher.socket=null
    socket.leave(room.code)
    socket.data.code=null
    socket.data.token=null
    room.lastSeen=Date.now()
    publish(room,true)
  }

  function join(socket,room,token,role,player,ack){
    const previous=role==='teacher'?room.teacher.socket:player.socket
    if(role==='teacher')room.teacher.socket=socket
    else {
      player.socket=socket
      player.awayAt=null
    }
    if(previous&&previous!==socket){
      previous.emit('room:closed','session-replaced')
      previous.disconnect(true)
    }
    room.lastSeen=Date.now()
    socket.data.code=room.code
    socket.data.token=token
    socket.join(room.code)
    report(ack,{ok:true,code:room.code,token,role,id:player?.id??null,world:room.snapshot()})
    publish(room,true)
  }

  function rate(socket,key,ms){
    const now=Date.now()
    socket.data.rates??={}
    if(now-(socket.data.rates[key]??0)<ms)return false
    socket.data.rates[key]=now
    return true
  }

  io.on('connection',socket=>{
    socket.on('room:create',(data,ack)=>{
      if(active(socket)||!rate(socket,'entry',450))return report(ack,failure('busy'))
      if(!matchesPin(teacherPin,data?.pin))return report(ack,failure('teacher-pin'))
      if(rooms.size>=maximumRooms)return report(ack,failure('server-full'))
      let code=makeCode()
      while(rooms.has(code))code=makeCode()
      const token=newToken(),room=new TownRoom(code,token)
      rooms.set(code,room)
      join(socket,room,token,'teacher',null,ack)
    })
    socket.on('room:join',(data,ack)=>{
      if(active(socket)||!rate(socket,'entry',350))return report(ack,failure('busy'))
      const room=validCode(data?.code)?rooms.get(data.code):null
      if(!room)return report(ack,failure('no-room'))
      if(room.students.size>=limit)return report(ack,failure('full'))
      const player=room.addStudent(data.profile,socket)
      join(socket,room,player.token,'student',player,ack)
    })
    socket.on('room:resume',(data,ack)=>{
      if(active(socket)||!rate(socket,'entry',350))return report(ack,failure('busy'))
      const room=validCode(data?.code)?rooms.get(data.code):null
      const token=data?.token
      if(!room||typeof token!=='string'||token.length!==32)return report(ack,failure('expired'))
      if(room.teacher.token===token)return join(socket,room,token,'teacher',null,ack)
      const player=room.students.get(token)
      if(!player)return report(ack,failure('expired'))
      join(socket,room,token,'student',player,ack)
    })
    socket.on('room:leave',ack=>{
      unlink(socket,true)
      report(ack,{ok:true})
    })
    socket.on('disconnect',()=>unlink(socket,false))
    socket.on('move',(data,ack)=>{
      const session=active(socket)
      if(!session?.player)return report(ack,failure('role'))
      if(data?.kind!=='stop'&&!rate(socket,data?.kind==='tap'?'tap':'hold',data?.kind==='tap'?166:45))return report(ack,failure('busy'))
      report(ack,session.room.input(session.player,data,Date.now()))
    })
    socket.on('act',(data,ack)=>{
      const session=active(socket)
      if(!session?.player)return report(ack,failure('role'))
      if(!rate(socket,'action',240))return report(ack,failure('busy'))
      const result=session.room.action(session.player,data?.kind,data?.target,Date.now())
      report(ack,result)
      if(result.ok)publish(session.room,true)
    })
    socket.on('teacher',(data,ack)=>{
      const session=active(socket)
      if(!session||session.player)return report(ack,failure('role'))
      const command=data?.command
      if(!['start','restart','safe','end'].includes(command))return report(ack,failure('bad-input'))
      if(!rate(socket,'teacher:'+command,400))return report(ack,failure('busy'))
      const {room}=session
      switch(command){
        case 'start':
          if(room.phase!=='waiting')return report(ack,failure('already-started'))
          room.reset('active')
          break
        case 'restart':
          room.reset('active')
          break
        case 'safe':
          for(const student of room.students.values())room.safe(student)
          break
        case 'end':
          rooms.delete(room.code)
          io.to(room.code).emit('room:closed','ended')
          io.in(room.code).socketsLeave(room.code)
          report(ack,{ok:true})
          return
      }
      room.lastSeen=Date.now()
      report(ack,{ok:true})
      publish(room,true)
    })
  })

  const interval=setInterval(()=>{
    const now=Date.now(),dt=Math.min(.10,(now-last)/1000)
    last=now
    for(const room of rooms.values()){
      for(const student of room.students.values())if(student.awayAt&&now-student.awayAt>=studentGrace)room.remove(student)
      if(!room.teacher.socket&&![...room.students.values()].some(p=>p.socket)){
        if(now-room.lastSeen>=emptyRoomGrace)rooms.delete(room.code)
        continue
      }
      room.tick(dt,now)
      if(room.ticks%2===0)publish(room)
    }
  },tickMs)
  interval.unref()
  io.on('close',()=>clearInterval(interval))
  http.on('close',()=>clearInterval(interval))
  return {app,http,io,rooms,close(){clearInterval(interval);return new Promise(resolve=>io.close(resolve))}}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const game=createGameServer()
  const port=Number(process.env.PORT??3000)
  game.http.listen(port,'0.0.0.0',()=>console.log('My Town listening on port '+port))
  for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>void game.close())
}

