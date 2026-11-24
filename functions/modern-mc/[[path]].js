export async function onRequest({request,env}) {
  if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Method not allowed",{status:405});
  if(!env.MINECRAFT)return new Response("Minecraft R2 storage is not connected.",{status:503,headers:{"Cache-Control":"no-store"}});
  const object=await env.MINECRAFT.get("26.3.html");
  if(!object)return new Response("Minecraft client file has not been uploaded.",{status:404,headers:{"Cache-Control":"no-store"}});
  const headers=new Headers({
    "Content-Type":"text/html; charset=utf-8",
    "Cache-Control":"public, max-age=3600",
    "X-Content-Type-Options":"nosniff",
    "Content-Security-Policy":"frame-ancestors 'self'"
  });
  object.writeHttpMetadata(headers);
  headers.set("Content-Type","text/html; charset=utf-8");
  headers.set("X-Content-Type-Options","nosniff");
  return new Response(request.method==="HEAD"?null:object.body,{headers});
}
