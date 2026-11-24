const prefsKey='my-town:v1:prefs'
const runKey='my-town:v1:run'
const recordsKey='my-town:v1:records'
export const defaults = {easy:true, device:'tablet', quality:'normal', direct:false, reduced:false, voice:true, effects:true, music:false, volume:.65}
export function load(key,fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
export function write(key,value){
  try{localStorage.setItem(key,JSON.stringify(value))}catch{/* Storage can be unavailable in private browsing. */}
}
export const readPrefs=()=>({...defaults,...load(prefsKey,{})})
export const savePrefs=(value)=>write(prefsKey,value)
export const readRun=()=>load(runKey,null)
export const saveRun=(value)=>write(runKey,value)
export const readRecords=()=>load(recordsKey,{missions:[],places:[]})
export const saveRecords=(value)=>write(recordsKey,value)
export function resetProgress(){
  try{localStorage.removeItem(runKey);localStorage.removeItem(recordsKey)}catch{/* Storage may be restricted. */}
}
export function koreanVoice(){
  return globalThis.speechSynthesis?.getVoices().find(v=>/^ko([-_]|$)/i.test(v.lang))
}
export function speak(text,prefs){
  if(!prefs.voice||!text)return
  const voice=koreanVoice()
  if(!voice)return
  const utt=new SpeechSynthesisUtterance(text)
  utt.lang='ko-KR'
  utt.voice=voice
  utt.volume=prefs.volume
  utt.rate=.86
  speechSynthesis.cancel()
  speechSynthesis.speak(utt)
}
export function stopSpeech(){globalThis.speechSynthesis?.cancel()}
let audio, musicGain, musicTimer
function context(){
  const Context=window.AudioContext??window.webkitAudioContext
  if(!Context)return null
  audio??=new Context()
  if(audio.state==='suspended') audio.resume().catch(()=>{})
  return audio
}
export function unlockAudio(){context()}
function note(ctx,output,hz,time,duration,volume){
  const osc=ctx.createOscillator(), gain=ctx.createGain()
  osc.type='sine'
  osc.frequency.value=hz
  gain.gain.setValueAtTime(0,time)
  gain.gain.linearRampToValueAtTime(volume,time+.025)
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration)
  osc.connect(gain).connect(output)
  osc.start(time)
  osc.stop(time+duration+.02)
}
export function reward(prefs){
  if(!prefs.effects)return
  const ctx=context()
  if(!ctx)return
  for(const [i,hz] of [392,493.88,587.33].entries()) note(ctx,ctx.destination,hz,ctx.currentTime+i*.12,.38,.10*prefs.volume)
}
export function music(prefs){
  if(!prefs.music){clearInterval(musicTimer);musicTimer=null;musicGain?.disconnect();return}
  const ctx=context()
  if(!ctx)return
  musicGain??=ctx.createGain()
  if(!musicTimer){
    musicGain.connect(ctx.destination)
    const play=()=>{
      for(const [i,hz] of [196,293.66,246.94,329.63,220,261.63,196,293.66].entries()) note(ctx,musicGain,hz,ctx.currentTime+i*.68,.65,.055)
    }
    play()
    musicTimer=setInterval(play,5500)
  }
  musicGain.gain.value=prefs.volume
}

