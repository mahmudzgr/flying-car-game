// Ses (STUB — sessiz no-op). Sahip: Ses. API sabittir (MIMARI §8). Tamamen Web Audio ile sentez; harici dosya yok.
// Sim'e dokunmaz: yalnızca main.js'ten gelen çağrıları ve olayları dinler.

/**
 * @returns {{unlock():void, setEngine(p:{vehicleId:string,rpm01:number,throttle:number,load:number,onGround:boolean}):void,
 *   onEvent(e:{name:string,t?:number}):void, music(trackId:string|null):void,
 *   setVolumes(v:{master?:number,music?:number,sfx?:number}):void, suspend():void, resume():void, destroy():void}}
 */
export function createAudio() {
  let ctx = null;
  const vol = { master: 1, music: 0.7, sfx: 1 };
  return {
    /** İlk kullanıcı dokunuşunda çağrılır (AudioContext oluştur/resume). */
    unlock() { try { ctx = ctx ?? new (globalThis.AudioContext || globalThis.webkitAudioContext)(); ctx.resume?.(); } catch { /* ses yoksa sessiz */ } },
    /** Her karede çağrılır (motor sesi). rpm01 0..1, load 0..1 (yük ↔ ton/low-pass). */
    setEngine(_p) {},
    /** Sim olayları ve UI olayları: e.name ∈ MIMARI §6 listesi + 'ui:click' 'ui:back' 'ui:star'. */
    onEvent(_e) {},
    /** trackId: 'menu' | 'elma' | 'kanyon' | ... | null (sustur). */
    music(_trackId) {},
    setVolumes(v) { Object.assign(vol, v); },
    suspend() { ctx?.suspend?.(); },
    resume() { ctx?.resume?.(); },
    destroy() { try { ctx?.close?.(); } catch { /* yoksay */ } ctx = null; },
  };
}
