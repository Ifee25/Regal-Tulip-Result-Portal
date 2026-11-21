import { NextRequest,NextResponse } from "next/server";
import { createHmac,timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { registrationClient } from "@/lib/registration";
export const runtime="nodejs";
const attempts=new Map<string,{count:number;until:number}>();
const cookie="guardian_session";
function sign(value:string){return createHmac("sha256",process.env.REGISTRATION_SUPABASE_SECRET_KEY!).update(value).digest("base64url");}
function session(req:NextRequest):string|null{
 try{const token=req.cookies.get(cookie)?.value??"";const [body,signature]=token.split(".");const expected=sign(body);if(!signature || signature.length!==expected.length || !timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;const data=JSON.parse(Buffer.from(body,"base64url").toString());return data.exp>Date.now()?data.id:null;}catch{return null;}
}
const privateHeaders={"Cache-Control":"no-store"};
export async function POST(req:NextRequest){
 try{
 const body=await req.json();const reg=typeof body.reg_no==="string"?body.reg_no.trim():"";const phone=typeof body.guardian_number==="string"?body.guardian_number.trim():"";
 if(!reg || !phone || reg.length>100 || phone.length>50)return NextResponse.json({error:"Enter Guardian Number and Reg No."},{status:400});
 const now=Date.now();for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);
 const bucket=createHmac("sha256",process.env.REGISTRATION_SUPABASE_SECRET_KEY!).update(reg.toLowerCase()).digest("hex");
 const attempt=attempts.get(bucket)??{count:0,until:now+15*60*1000};if(attempt.count>=10)return NextResponse.json({error:"Too many attempts. Please try again in 15 minutes."},{status:429});attempt.count++;attempts.set(bucket,attempt);
 const {data,error}=await registrationClient().from("pupils").select("id,guardian_phone").eq("admission_number",reg).eq("active",true).limit(2);
 if(error)throw error;
 const normalize=(v:string)=>v.replace(/[^0-9]/g,"");
 const match=data?.length===1 && normalize(String(data[0].guardian_phone??""))===normalize(phone) && normalize(phone).length>=7?data[0]:null;
 if(!match)return NextResponse.json({error:"Guardian Number and Reg No do not match an active pupil."},{status:401,headers:privateHeaders});
 const payload=Buffer.from(JSON.stringify({id:match.id,exp:now+3600000})).toString("base64url");
 const response=NextResponse.json({success:true},{headers:privateHeaders});response.cookies.set(cookie,payload+"."+sign(payload),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/guardian",maxAge:3600});return response;
 }catch{return NextResponse.json({error:"Guardian access is temporarily unavailable."},{status:503});}
}
export async function GET(req:NextRequest){
 const id=session(req);if(!id)return NextResponse.json({error:"Please sign in."},{status:401,headers:privateHeaders});
 try{
 const {data:pupil,error}=await registrationClient().from("pupils").select("id,first_name,last_name,admission_number,active").eq("id",id).eq("active",true).single();if(error || !pupil)return NextResponse.json({error:"Pupil access is unavailable."},{status:403});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error();
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:results,error:re}=await db.from("students").select("id,student_name,class_name,term,average_score,assessment_data,created_at").eq("assessment_data->>pupil_id",id).order("created_at",{ascending:false});if(re)throw re;
 return NextResponse.json({pupil:{id,name:[pupil.first_name,pupil.last_name].filter(Boolean).join(" "),reg_no:pupil.admission_number},results},{headers:privateHeaders});
 }catch{return NextResponse.json({error:"Unable to load results. Please try again."},{status:503,headers:privateHeaders});}
}
export async function DELETE(){const response=NextResponse.json({success:true},{headers:privateHeaders});response.cookies.set(cookie,"",{httpOnly:true,path:"/api/guardian",maxAge:0});return response;}
