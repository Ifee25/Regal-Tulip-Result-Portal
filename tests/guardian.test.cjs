const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const vm=require('node:vm');
const fs=require('node:fs');
const {NextRequest,NextResponse}=require('next/server');
function fixture(){
 const filters=[];
 const pupil={id:'pupil-one',guardian_phone:'0801 234 5678',first_name:'Test',last_name:'Pupil',admission_number:'REG001',active:true};
 const registration={from(){return {select(){return this},eq(){return this},limit:async()=>({data:[pupil]}),single:async()=>({data:pupil})}}};
 const results={from(){return {select(){return this},eq(column,value){filters.push([column,value]);return this},order:async()=>({data:[]})}}};
 const module={exports:{}};
 const source=ts.transpileModule(fs.readFileSync('src/app/api/guardian/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,Buffer,Date,Map,process:{env:{REGISTRATION_SUPABASE_SECRET_KEY:'test-secret',NEXT_PUBLIC_SUPABASE_URL:'https://example.com',SUPABASE_SECRET_KEY:'test-result-key'}},require(name){if(name==='next/server')return {NextResponse};if(name==='@/lib/registration')return {registrationClient:()=>registration};if(name==='@supabase/supabase-js')return {createClient:()=>results};return require(name);}});
 return {route:module.exports,filters};
}
function request(body,cookie){return new NextRequest('http://localhost/api/guardian',{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{cookie}: {})},...(body?{body:JSON.stringify(body)}:{})});}
test('guardian rejects incorrect registered phone',async()=>{const {route}=fixture();assert.equal((await route.POST(request({reg_no:'REG001',guardian_number:'09999999999'}))).status,401);});
test('guardian rejects missing credentials',async()=>{const {route}=fixture();assert.equal((await route.POST(request({reg_no:'REG001'}))).status,400);});
test('guardian session is HttpOnly and only loads its pupil ID',async()=>{const {route,filters}=fixture();const login=await route.POST(request({reg_no:'REG001',guardian_number:'08012345678'}));assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly/i);const cookie=login.headers.get('set-cookie').split(';')[0];const response=await route.GET(request(null,cookie));assert.equal(response.status,200);assert.equal((await response.json()).pupil.last_name,'Pupil');assert.equal(filters[0][0],'assessment_data->>pupil_id');assert.equal(filters[0][1],'pupil-one');assert.equal(response.headers.get('cache-control'),'no-store');});
test('missing and tampered sessions are denied',async()=>{const {route}=fixture();assert.equal((await route.GET(request())).status,401);assert.equal((await route.GET(request(null,'guardian_session=forged.invalid'))).status,401);});
test('repeated failed login attempts are limited',async()=>{const {route}=fixture();for(let i=0;i<10;i++)await route.POST(request({reg_no:'REG001',guardian_number:'09999999999'}));assert.equal((await route.POST(request({reg_no:'REG001',guardian_number:'09999999999'}))).status,429);});
test('logout expires the guardian cookie',async()=>{const {route}=fixture();const response=await route.DELETE();assert.match(response.headers.get('set-cookie'),/Max-Age=0/i);});
