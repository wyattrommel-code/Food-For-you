import type {UserPreferences} from './types';
import {normalizePreferences, readPreferenceCache} from './preferences';
export interface PreferenceIO {
  readCache(): Promise<string|null>;
  writeCache(value:string): Promise<void>;
  readCloud(): Promise<Partial<UserPreferences>|null>;
  writeCloud(value:UserPreferences): Promise<void>;
}
export function createPreferenceStore(io:PreferenceIO, signedIn=true) {
  let state={preferences:normalizePreferences(null),loading:signedIn,syncing:false,syncError:null as string|null,pending:false};
  let revision=0,disposed=false,hydrated=false;
  let tail:Promise<unknown>=Promise.resolve();
  let reading:Promise<void>|null=null;
  const listeners=new Set<()=>void>();
  const publish=(patch:Partial<typeof state>)=>{if(disposed)return;state={...state,...patch};listeners.forEach(fn=>fn());};
  const cache=(preferences:UserPreferences,pending:boolean)=>io.writeCache(JSON.stringify({preferences,pending}));
  const update=async (updates:Partial<UserPreferences>|((current:UserPreferences)=>Partial<UserPreferences>)):Promise<boolean>=>{
    if(!signedIn||disposed)return false;
    const previous=state.preferences, wasPending=state.pending;
    const merged=normalizePreferences({...previous,...(typeof updates==='function'?updates(previous):updates)}),version=++revision;
    publish({preferences:merged,syncing:true,syncError:null,pending:true});
    const job=async()=>{
      try {await cache(merged,true);} catch {
        if(version===revision)publish({preferences:previous,syncing:false,syncError:'Could not save on this device. Please try again.',pending:wasPending});
        return false;
      }
      try {
        await io.writeCloud(merged);
        if(version===revision){await cache(merged,false);publish({pending:false,syncError:null});}
      } catch {
        if(version===revision)publish({pending:true,syncError:'Saved on this device. Account sync is pending; retry when connected.'});
      } finally {if(version===revision)publish({syncing:false});}
      return true;
    };
    const result=tail.then(job,job);tail=result;return result;
  };
  const refresh=():Promise<void>=>{
    if(reading)return reading;
    if(!signedIn||disposed)return Promise.resolve();
    reading=(async()=>{
      const startRevision=revision;
      try {
        if(!hydrated){const raw=await io.readCache().catch(()=>null);if(revision===startRevision){const cached=readPreferenceCache(raw);publish(cached);}hydrated=true;}
        await tail;
        if(state.pending){await update({});return;}
        const readRevision=revision;
        const cloud=await io.readCloud();
        if(readRevision!==revision||disposed)return;
        const preferences=normalizePreferences(cloud);
        publish({preferences,syncError:null});
        const persist=tail.then(async()=>{if(readRevision===revision)await cache(preferences,false).catch(()=>{});});
        tail=persist;await persist;
      } catch {
        publish({syncError:state.pending?'Saved on this device. Account sync is pending; retry when connected.':'Could not refresh account preferences. Your saved choices are still available.'});
      } finally {publish({loading:false});reading=null;}
    })();
    return reading;
  };
  return {getSnapshot:()=>state, subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},
    update,refresh,dispose:()=>{disposed=true;listeners.clear();}};
}
