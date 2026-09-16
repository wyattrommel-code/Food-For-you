/** One account's in-memory catalog. No private recipes are persisted to disk. */
export function createRecipeCache<T>(fetchRows:()=>Promise<T[]>, now=Date.now, maxAge=5*60*1000) {
  let snapshot={rows:[] as T[],loaded:false,refreshing:false,error:null as string|null};
  let fetchedAt=0, pending:Promise<void>|null=null;
  const listeners=new Set<()=>void>();
  function publish(next:typeof snapshot){snapshot=next;listeners.forEach(listener=>listener());}
  const cache = {
    getSnapshot:()=>snapshot,
    subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
    async invalidate(){
      // A read already in flight may predate a recipe creation/deletion.
      if(pending)await pending;
      fetchedAt=Number.NEGATIVE_INFINITY;
      await cache.load(true);
    },
    load(force=false):Promise<void>{
      if(pending)return pending;
      if(!force&&snapshot.loaded&&now()-fetchedAt<maxAge)return Promise.resolve();
      publish({...snapshot,refreshing:true,error:null});
      pending=Promise.resolve().then(fetchRows).then(rows=>{
        fetchedAt=now();publish({rows,loaded:true,refreshing:false,error:null});
      }).catch(()=>{
        // Keep the last successful catalog usable when a background refresh fails.
        publish({...snapshot,refreshing:false,error:'Could not refresh recipes. Check your connection and retry.'});
      }).finally(()=>{pending=null;});
      return pending;
    },
  };
  return cache;
}
