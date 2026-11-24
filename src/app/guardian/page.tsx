"use client";
import GuardianDashboard from "@/components/GuardianDashboard";
import GuardianLogin from "@/components/GuardianLogin";
import {useEffect,useState} from "react";
import AssessmentTemplate from "@/components/AssessmentTemplate";
import PrimaryAssessmentTemplate from "@/components/PrimaryAssessmentTemplate";
import PrimaryThirdTermTemplate from "@/components/PrimaryThirdTermTemplate";
import type {AssessmentResult} from "@/types/assessment";
type Report={id:string;class_name:string;term:string;average_score:number;assessment_data:AssessmentResult|string|null};
type Account={pupil:{id:string;name:string;last_name:string;reg_no:string};results:Report[]};
export default function GuardianPage(){
 const [account,setAccount]=useState<Account|null>(null),[phone,setPhone]=useState(""),[reg,setReg]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(true),[selected,setSelected]=useState<Report|null>(null);
 async function load(){const response=await fetch("/api/guardian",{cache:"no-store"});const body=await response.json();if(!response.ok)throw new Error(body.error);setAccount(body);}
 useEffect(()=>{let cancelled=false;void fetch("/api/guardian",{cache:"no-store"}).then(async response=>{const body=await response.json();if(!cancelled && response.ok)setAccount(body);}).catch(()=>{}).finally(()=>{if(!cancelled)setBusy(false);});return()=>{cancelled=true;};},[]);
 async function login(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const response=await fetch("/api/guardian",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({guardian_number:phone,reg_no:reg})});const body=await response.json();if(!response.ok)throw new Error(body.error);await load();setPhone("");}catch(e){setMessage(e instanceof Error?e.message:"Unable to sign in.");}finally{setBusy(false);}}
 async function logout(){setBusy(true);try{const response=await fetch("/api/guardian",{method:"DELETE"});if(!response.ok)throw new Error();setAccount(null);setSelected(null);setPhone("");setReg("");}catch{setMessage("Unable to sign out. Please try again.");}finally{setBusy(false);}}
 if(account && selected){let assessment:AssessmentResult|null=null;try{assessment=typeof selected.assessment_data==="string"?JSON.parse(selected.assessment_data):selected.assessment_data;}catch{}
 if(assessment){const props={student_name:account.pupil.name,reg_no:account.pupil.reg_no,session:assessment.session??"",term:selected.term,class_name:selected.class_name,initialResult:assessment,readOnly:true,onSubmit:async()=>{},onCancel:()=>setSelected(null)};if(assessment.section==="Nursery")return <AssessmentTemplate {...props} section="Nursery"/>;if(selected.term==="3rd Term")return <PrimaryThirdTermTemplate {...props} priorTermResults={{}}/>;return <PrimaryAssessmentTemplate {...props}/>;}}
 if (!account) return <GuardianLogin phone={phone} reg={reg} busy={busy} message={message} onPhoneChange={setPhone} onRegChange={setReg} onSubmit={login} />;
 return <GuardianDashboard account={account} busy={busy} message={message} onSignOut={logout} onSelectResult={setSelected} />;
}
