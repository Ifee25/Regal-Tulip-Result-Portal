import { registrationClient } from "@/lib/registration";
import { supabase } from "@/lib/supabase";
import { isPortalAdmin } from "@/lib/portalAdmins";
import { getStaffClasses } from "@/lib/staffClassAccess";
export async function GET(req:Request){
 const token=req.headers.get("authorization")?.replace(/^Bearer /i,"");
 if(!token || !supabase) return Response.json({error:"Sign in required."},{status:401});
 const {data:{user},error}=await supabase.auth.getUser(token);
 const className=new URL(req.url).searchParams.get("class")??"";
 if(error || !user || (!isPortalAdmin(user.email) && !getStaffClasses(user.email).includes(className))) return Response.json({error:"Class access denied."},{status:403});
 if (!process.env.REGISTRATION_SUPABASE_URL || !process.env.REGISTRATION_SUPABASE_SECRET_KEY) return Response.json({error:"Pupil lookup is not configured on this server. Ask the administrator to add the registration database URL and secret key to the hosting environment, then redeploy."},{status:503});
 try {
 const db=registrationClient();
 const {data:classes,error:ce}=await db.from("classes").select("id").eq("name",className.replace(/([0-9])[RST]$/, "$1")); if(ce) throw ce;
 const {data,error}=await db.from("pupils").select("id,first_name,last_name,admission_number").eq("active",true).in("class_id",(classes??[]).map(c=>c.id)).order("first_name"); if(error) throw error;
 return Response.json({pupils:(data??[]).map(p=>({id:p.id,name:[p.first_name,p.last_name].filter(Boolean).join(" "),reg_no:p.admission_number}))},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Unable to load registered pupils."},{status:503});}
}
