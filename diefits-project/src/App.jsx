import { useState, useEffect, useRef, useMemo, useCallback } from "react";
// ── Supabase config ────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://ntotnesafnnvxzuimmqv.supabase.co";
const SUPABASE_KEY = "sb_publishable_ARgDMbAYHEf1oLwvI1eJUA_6KQWDKpl";
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
// ── Supabase REST helpers (no SDK needed, keeps bundle small) ─────────────────
async function sb(path, options = {}) {
 const url = `${SUPABASE_URL}/rest/v1${path}`;
 const token = localStorage.getItem("diefits_token");
 const res = await fetch(url, {
 ...options,
 headers: {
 "apikey": SUPABASE_KEY,
 "authorization": `Bearer ${token || SUPABASE_KEY}`,
 "content-type": "application/json",
 "prefer": "return=representation",
 ...(options.headers || {}),
 },
 });
 if (!res.ok) {
 const txt = await res.text();
 let msg = `HTTP ${res.status}`;
 try { msg = JSON.parse(txt).message || msg; } catch(_) {}
 throw new Error(msg);
 }
 if (res.status === 204) return null;
 return await res.json();
}
async function sbAuth(path, body) {
 const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
 method: "POST",
 headers: {
 "apikey": SUPABASE_KEY,
 "content-type": "application/json",
 },
 body: JSON.stringify(body),
 });
 const data = await res.json().catch(() => ({}));
 if (!res.ok) throw new Error(data.msg || data.error_description || data.error || `Auth erro return data;
}
// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_TYPES = [
 "Hydraulic – Straight","Hydraulic – Elbow 90°","Hydraulic – Elbow 45°","Hydraulic – Tee",
 "Coolant – Straight","Coolant – Elbow 90°","Coolant – Tee",
 "Air – Straight","Air – Elbow 90°",
 "Camlock – Type A","Camlock – Type B","Camlock – Type C","Camlock – Type D",
 "Camlock – Type E","Camlock – Type F","Camlock – Type DC","Camlock – Type DP",
 "Push-to-Connect","Compression","Swivel","Bulkhead","Grease / Zerk",
 "JIC / AN Fitting","NPT Straight","NPT Elbow","Other",
];
const DEFAULT_SIZES = ['1/8"','1/4"','3/8"','1/2"','3/4"','1"','1-1/4"','1-1/2"','2"','3"','4const P = {
 bg:"#0f1e2e",bgAlt:"#132a41",panel:"#1a324b",panelHi:"#22405e",
 border:"#2e4a6b",borderHi:"#4674a8",
 accent:"#4a8fdb",accentHi:"#6aa9ed",
 text:"#f8fafc",textDim:"#dbe4ee",muted:"#93abc6",mutedLo:"#6d8ba9",
 green:"#4ade80",yellow:"#facc15",red:"#f87171",white:"#ffffff",
};
const s = {
 inp: {width:"100%",boxSizing:"border-box",background:P.bg,border:`1px solid ${P.border}`,bo lbl: {display:"block",fontSize:11,color:P.muted,textTransform:"uppercase",letterSpacing:".0};
// ── Reusable components ───────────────────────────────────────────────────────
function PBtn({onClick,disabled,children,style={},type}) {
 return <button type={type} onClick={onClick} disabled={!!disabled} style={{border:"none",bo}
function GBtn({onClick,children,active,style={}}) {
 return <button onClick={onClick} style={{border:`1px solid ${active?P.accent:P.border}`,bor}
function DangerBtn({onClick,children,style={}}) {
 return <button onClick={onClick} style={{border:"none",borderRadius:8,cursor:"pointer",font}
function Modal({title,onClose,children,wide}) {
 return (
 <div style={{position:"fixed",inset:0,background:"rgba(5,12,24,.82)",zIndex:100,display:" <div style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:14,padding: <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,color:P <button onClick={onClose} style={{background:"none",border:"none",color:P.muted,fon </div>
 {children}
 </div>
 </div>
 );
}
function Toast({msg, kind}) {
 if (!msg) return null;
 const colors = {success:P.green, error:P.red, info:P.accentHi};
 const c = colors[kind||"success"];
 return (
 <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",backgroun {kind==="error"?"⚠":"✓"} {msg}
 </div>
 );
}
// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
 const [mode, setMode] = useState("signin"); // "signin" | "signup"
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [busy, setBusy] = useState(false);
 const [err, setErr] = useState(null);
 async function submit() {
 setErr(null);
 if (!email.trim() || !password.trim()) { setErr("Enter email and password"); return; }
 if (password.length < 6) { setErr("Password must be at least 6 characters"); return; }
 setBusy(true);
 try {
 const endpoint = mode === "signin" ? "/token?grant_type=password" : "/signup";
 const data = await sbAuth(endpoint, { email: email.trim(), password });
 if (!data.access_token && !data.session?.access_token) {
 throw new Error("No session returned — is email confirmation enabled?");
 }
 const token = data.access_token || data.session.access_token;
 const user = data.user || data.session?.user;
 localStorage.setItem("diefits_token", token);
 localStorage.setItem("diefits_user", JSON.stringify(user));
 onLogin({ token, user });
 } catch(e) {
 setErr(e.message);
 }
 setBusy(false);
 }
 return (
 <div style={{minHeight:"100vh",background:`linear-gradient(180deg, ${P.bg} 0%, ${P.bgAlt}
 <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=DM+Sa <style>{`input:focus{border-color:${P.accent}!important;box-shadow:0 0 0 3px rgba(74,14 <div style={{width:"100%",maxWidth:420}}>
 <div style={{textAlign:"center",marginBottom:32}}>
 <div style={{width:64,height:64,borderRadius:16,background:`linear-gradient(135deg, <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:32,letterSp <div style={{fontSize:11,color:P.muted,letterSpacing:".12em",textTransform:"upperca </div>
 <div style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:14,paddin <div style={{display:"flex",gap:8,marginBottom:24,background:P.bg,padding:4,borderR <button onClick={()=>{setMode("signin");setErr(null);}} style={{flex:1,padding:"1 <button onClick={()=>{setMode("signup");setErr(null);}} style={{flex:1,padding:"1 </div>
 <div style={{display:"flex",flexDirection:"column",gap:14}}>
 <div>
 <label style={s.lbl}>Email</label>
 <input style={s.inp} type="email" value={email} onChange={e=>setEmail(e.target. </div>
 <div>
 <label style={s.lbl}>Password</label>
 <input style={s.inp} type="password" value={password} onChange={e=>setPassword( </div>
 {err && <div style={{background:"rgba(248,113,113,.1)",border:"1px solid rgba(248 <PBtn onClick={submit} disabled={busy} style={{padding:13,fontSize:15,marginTop:6 {busy ? "Please wait…" : (mode==="signin" ? "Sign In" : "Create Account & Sign  </PBtn>
 {mode==="signup" && (
 <div style={{fontSize:11,color:P.mutedLo,lineHeight:1.5,textAlign:"center",marg First person to create an account sets up the business. Everyone at your comp </div>
 )}
 </div>
 </div>
 <div style={{textAlign:"center",marginTop:24,fontSize:11,color:P.mutedLo}}>
 Powered by Supabase · Secure cloud sync
 </div>
 </div>
 </div>
 );
}
// ── Fitting form ──────────────────────────────────────────────────────────────
function FittingForm({initial, onSave, onClose, onDelete}) {
 const [f, setF] = useState(initial || {
 pn:"", type:DEFAULT_TYPES[0], size:DEFAULT_SIZES[0], qty:1,
 material:"", supplier:"", location:"", notes:""
 });
 const set = (k,v) => setF(p=>({...p, [k]:v}));
 return (
 <div style={{display:"flex",flexDirection:"column",gap:14}}>
 <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
 <div><label style={s.lbl}>Part Number *</label><input style={s.inp} value={f.pn} onCh <div><label style={s.lbl}>Quantity *</label><input style={{...s.inp,fontSize:18,fontW </div>
 <div><label style={s.lbl}>Type *</label><select style={s.inp} value={f.type} onChange={ <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
 <div><label style={s.lbl}>Size *</label><select style={s.inp} value={f.size} onChange <div><label style={s.lbl}>Material</label><input style={s.inp} value={f.material||""} </div>
 <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
 <div><label style={s.lbl}>Supplier</label><input style={s.inp} value={f.supplier||""} <div><label style={s.lbl}>Location</label><input style={s.inp} value={f.location||""} </div>
 <div><label style={s.lbl}>Notes</label><textarea style={{...s.inp,minHeight:60,resize:" <div style={{display:"flex",gap:10,marginTop:6}}>
 {onDelete && <DangerBtn onClick={onDelete} style={{flex:"0 0 auto",padding:"11px 14px <GBtn onClick={onClose} style={{flex:1,padding:11}}>Cancel</GBtn>
 <PBtn onClick={()=>f.pn.trim()&&onSave(f)} style={{flex:2,padding:11}}> Save</PBtn>
 </div>
 </div>
 );
}
// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({settings, onSave, onClose, onSignOut, userEmail}) {
 const [form, setForm] = useState({...settings});
 const set = (k,v) => setForm(p=>({...p,[k]:v}));
 return (
 <div style={{display:"flex",flexDirection:"column",gap:16}}>
 <div style={{background:P.bgAlt,border:`1px solid ${P.border}`,borderRadius:10,padding: <div style={{fontSize:13,color:P.accentHi,fontWeight:700,marginBottom:12,letterSpacin <div style={{fontSize:14,color:P.text,marginBottom:12}}>{userEmail}</div>
 <GBtn onClick={onSignOut} style={{padding:"9px 14px",fontSize:13}}>Sign Out</GBtn>
 </div>
 <div style={{background:P.bgAlt,border:`1px solid ${P.border}`,borderRadius:10,padding: <div style={{fontSize:13,color:P.accentHi,fontWeight:700,marginBottom:12,letterSpacin
 <div><label style={s.lbl}>Business Name</label><input style={s.inp} value={form.busin </div>
 <div style={{background:P.bgAlt,border:`1px solid ${P.border}`,borderRadius:10,padding: <div style={{fontSize:13,color:P.accentHi,fontWeight:700,letterSpacing:".04em"}}>⚠ LO <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12}}>
 <div><label style={s.lbl}>Threshold</label><input style={s.inp} type="number" min={ <div><label style={s.lbl}>Alert Email Subject</label><input style={s.inp} value={fo </div>
 <div><label style={s.lbl}>Send Alerts To</label><input style={s.inp} type="email" val <div style={{fontSize:11,color:P.mutedLo,lineHeight:1.5,background:P.panel,padding:10 Click the Email Alert button (on the Low Stock stat card) to open your email  </div>
 </div>
 <div style={{display:"flex",gap:10}}>
 <GBtn onClick={onClose} style={{flex:1,padding:11}}>Cancel</GBtn>
 <PBtn onClick={()=>onSave(form)} style={{flex:2,padding:11}}> Save Settings</PBtn>
 </div>
 </div>
 );
}
// ── Scanner ───────────────────────────────────────────────────────────────────
function Scanner({inventory, corrections, onCreateNew, onUpdateExisting, onRecordCorrection,  const fileRef = useRef();
 const [imgSrc, setImgSrc] = useState(null);
 const [imgB64, setImgB64] = useState(null);
 const [status, setStatus] = useState("");
 const [result, setResult] = useState(null);
 const [originalResult, setOriginalResult] = useState(null);
 const [err, setErr] = useState(null);
 const [busy, setBusy] = useState(false);
 const [applyAs, setApplyAs] = useState("new");
 const [selId, setSelId] = useState("");
 const [addMode, setAddMode] = useState("add");
 const [ePn, setEPn] = useState("");
 const [eType, setEType] = useState(DEFAULT_TYPES[0]);
 const [eSize, setESize] = useState(DEFAULT_SIZES[0]);
 const [eQty, setEQty] = useState(1);
 const [eMaterial, setEMaterial] = useState("");
 const [eSupplier, setESupplier] = useState("");
 function loadImage(file) {
 if (!file) return;
 setErr(null); setResult(null); setStatus("");
 const reader = new FileReader();
 reader.onerror = () => setErr("Could not read file.");
 reader.onload = ev => {
 const dataUrl = ev.target.result;
 try {
 const image = new Image();
 image.onerror = () => { setImgSrc(dataUrl); setImgB64(dataUrl.split(",")[1]); };
 image.onload = () => {
 try {
 const MAX=1100, c=document.createElement("canvas");
 let w=image.width, h=image.height;
 if(w>MAX||h>MAX){if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h); c.width=w; c.height=h;
 c.getContext("2d").drawImage(image,0,0,w,h);
 const out=c.toDataURL("image/jpeg",.88);
 setImgSrc(out); setImgB64(out.split(",")[1]);
 } catch(_) { setImgSrc(dataUrl); setImgB64(dataUrl.split(",")[1]); }
 };
 image.src = dataUrl;
 } catch(_) { setImgSrc(dataUrl); setImgB64(dataUrl.split(",")[1]); }
 };
 reader.readAsDataURL(file);
 }
 async function analyze() {
 if (!imgB64) return;
 if (!ANTHROPIC_API_KEY) {
 setErr("AI features not configured. Admin: set VITE_ANTHROPIC_API_KEY in Vercel env var return;
 }
 setBusy(true); setErr(null); setResult(null);
 try {
 const correctionHints = corrections.length > 0
 ? "\n\nIMPORTANT — Past corrections from users (learn from these):\n" +
 corrections.slice(0,10).map((c,i) => `${i+1}. AI said: ${c.wrong_value}. User corre : "";
 setStatus("Step 1 of 2 — Identifying fitting from photo…");
 const r1 = await fetch("https://api.anthropic.com/v1/messages", {
 method:"POST",
 headers:{"x-api-key":ANTHROPIC_API_KEY,"anthropic-dangerous-direct-browser-access":"t body: JSON.stringify({
 model:"claude-sonnet-4-20250514", max_tokens:800,
 messages:[{role:"user",content:[
 {type:"image", source:{type:"base64", media_type:"image/jpeg", data:imgB64}},
 {type:"text", text:`You are an expert industrial fitting identifier. Examine thisRead ALL text and markings. Count fittings exactly.${correctionHints}
Return ONLY raw JSON:
{"count":1,"brand":"","modelNumber":"","type":"JIC / AN Fitting","size":"1/4\"","material":"S ]}]
 })
 });
 const raw1 = await r1.text();
 if (!r1.ok) { let m="Step 1 failed: HTTP "+r1.status; try{m=JSON.parse(raw1).error?.mes const env1 = JSON.parse(raw1);
 const txt1 = (env1.content||[]).filter(b=>b.type==="text").map(b=>b.text||"").join(""). const s1=txt1.lastIndexOf("{"), e1=txt1.lastIndexOf("}");
 if(s1<0||e1<=s1) throw new Error("Could not read response: "+txt1.slice(0,120));
 const id = JSON.parse(txt1.slice(s1,e1+1));
 setStatus("Step 2 of 2 — Searching web for product specs…");
 const sq = id.searchQuery || `${id.brand} ${id.modelNumber} ${id.type} ${id.size} fitti const r2 = await fetch("https://api.anthropic.com/v1/messages", {
 method:"POST",
 headers:{"x-api-key":ANTHROPIC_API_KEY,"anthropic-dangerous-direct-browser-access":"t body: JSON.stringify({
 model:"claude-sonnet-4-20250514", max_tokens:1024,
 tools:[{type:"web_search_20250305", name:"web_search"}],
 messages:[{role:"user",content:`Search for this industrial fitting: "${sq}"
Brand: "${id.brand}", Model: "${id.modelNumber}", Type: "${id.type}", Size: "${id.size}"
Return ONLY raw JSON:
{"brand":"","modelNumber":"","type":"${id.type}","size":"${id.size}","material":"","descripti })
 });
 const raw2 = await r2.text();
 if (!r2.ok) { let m="Step 2 failed: HTTP "+r2.status; try{m=JSON.parse(raw2).error?.mes const env2 = JSON.parse(raw2);
 const txt2 = (env2.content||[]).filter(b=>b.type==="text").map(b=>b.text||"").join(""). let web = {};
 try { const s2=txt2.lastIndexOf("{"), e2=txt2.lastIndexOf("}"); if(s2>=0&&e2>s2) web=JS const finalType = DEFAULT_TYPES.includes(web.type)?web.type : DEFAULT_TYPES.includes(id const finalSize = DEFAULT_SIZES.includes(web.size)?web.size : DEFAULT_SIZES.includes(id const out = {
 count: Math.max(1,parseInt(id.count)||1),
 brand: web.brand||id.brand||"",
 modelNumber: web.modelNumber||id.modelNumber||"",
 type: finalType, size: finalSize,
 material: web.material||id.material||"",
 description: web.description||`${id.type} fitting, ${id.size}`,
 specs: web.specs||"",
 suggestedPN: web.suggestedPN || (id.brand&&id.modelNumber?`${id.brand}-${id.modelNumb supplier: web.supplier||id.brand||"",
 confidence: web.confidence||id.confidence||"medium",
 notes: web.notes||"",
 };
 setResult(out);
 setOriginalResult({...out});
 setEPn(out.suggestedPN); setEType(out.type); setESize(out.size); setEQty(out.count);
 setEMaterial(out.material); setESupplier(out.supplier);
 setStatus("");
 } catch(ex) {
 setErr(ex.message||"Unknown error");
 setStatus("");
 }
 setBusy(false);
 }
 function doApply() {
 if (originalResult) {
 const changes = [];
 if (originalResult.type !== eType) changes.push({field:"type", wrong:originalResult.typ if (originalResult.size !== eSize) changes.push({field:"size", wrong:originalResult.siz if (originalResult.count !== eQty) changes.push({field:"count", wrong:originalResult.co if (originalResult.material !== eMaterial && eMaterial) changes.push({field:"material", if (changes.length > 0) {
 onRecordCorrection({
 wrong_value: `Type: ${originalResult.type}, Size: ${originalResult.size}, Count: ${ right_value: `Type: ${eType}, Size: ${eSize}, Count: ${eQty}`,
 ai_description: `${originalResult.brand} ${originalResult.modelNumber} ${originalRe changes: changes,
 });
 }
 }
 if (applyAs==="new") {
 if (!ePn.trim()) return;
 onCreateNew({pn:ePn.trim(), type:eType, size:eSize, qty:eQty, material:eMaterial, suppl } else {
 if (!selId) return;
 onUpdateExisting(parseInt(selId), eQty, addMode);
 }
 onClose();
 }
 const canApply = result&&((applyAs==="new"&&ePn.trim())||(applyAs==="existing"&&selId));
 const confCol = {high:P.green, medium:P.yellow, low:P.red};
 const hasChanges = originalResult && (originalResult.type!==eType||originalResult.size!==eS return (
 <div style={{display:"flex",flexDirection:"column",gap:16}}>
 {corrections.length > 0 && (
 <div style={{background:"rgba(74,222,128,.08)",border:"1px solid rgba(74,222,128,.25) AI is learning — using {corrections.length} past correction{corrections.length>1 </div>
 )}
 <div onClick={()=>fileRef.current.click()} onDrop={e=>{e.preventDefault();loadImage(e.d style={{border:`2px dashed ${imgSrc?P.accent:P.border}`,borderRadius:12,minHeight:200 {imgSrc
 ? <img src={imgSrc} alt="" style={{maxWidth:"100%",maxHeight:280,objectFit:"contain : <div style={{textAlign:"center",padding:32,color:P.muted}}>
 <div style={{fontSize:44,marginBottom:10}}> </div>
 <div style={{fontSize:15,color:P.textDim,marginBottom:4}}>Click or drag a photo <div style={{fontSize:12}}>AI identifies the fitting + searches web for specs</ </div>}
 <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={ </div>
 {imgSrc && !result && !busy && (
 <div style={{display:"flex",gap:10}}>
 <GBtn onClick={()=>{setImgSrc(null);setImgB64(null);setErr(null);}} style={{flex:"0 <PBtn onClick={analyze} style={{flex:1,padding:12,fontSize:15}}> Identify with AI </div>
 )}
 {busy && (
 <div style={{background:"rgba(74,143,219,.08)",border:"1px solid rgba(74,143,219,.3)" <div style={{fontSize:24,marginBottom:8}}> </div>
 <div style={{fontSize:14,color:P.accentHi,fontWeight:600,marginBottom:3}}>{status}< <div style={{fontSize:12,color:P.muted}}>15–30 seconds</div>
 <div style={{marginTop:14,height:3,background:P.border,borderRadius:2,overflow:"hid <div style={{height:"100%",background:P.accent,borderRadius:2,width:"60%",animati </div>
 </div>
 )}
 {err && <div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113, {result && (<>
 <div style={{background:P.bgAlt,border:`1px solid ${P.border}`,borderRadius:12,paddin <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start", <div>
 <div style={{fontSize:10,color:P.muted,textTransform:"uppercase",letterSpacing: {(result.brand||result.modelNumber)&&<div style={{fontSize:20,fontWeight:700,fo </div>
 <span style={{background:`${confCol[result.confidence]||P.muted}18`,border:`1px s </div>
 <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:1 <div style={{background:P.panel,borderRadius:8,padding:"12px 14px"}}>
 <div style={{fontSize:10,color:P.muted,textTransform:"uppercase",letterSpacing: <div style={{fontSize:36,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",colo </div>
 <div style={{background:P.panel,borderRadius:8,padding:"12px 14px"}}>
 <div style={{fontSize:10,color:P.muted,textTransform:"uppercase",letterSpacing: <div style={{fontSize:13,fontWeight:600,color:P.text,lineHeight:1.2}}>{result.t </div>
 <div style={{background:P.panel,borderRadius:8,padding:"12px 14px"}}>
 <div style={{fontSize:10,color:P.muted,textTransform:"uppercase",letterSpacing: <div style={{fontSize:18,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",colo </div>
 </div>
 {[result.material&&["Material",result.material],result.description&&["Description", <div key={l} style={{borderTop:`1px solid ${P.border}`,paddingTop:10,marginTop:10 <div style={{fontSize:10,color:P.muted,textTransform:"uppercase",letterSpacing: <div style={{fontSize:13,color:P.textDim}}>{v}</div>
 </div>
 ))}
 </div>
 <div style={{background:"rgba(74,143,219,.08)",border:"1px solid rgba(74,143,219,.25) <div style={{fontSize:12,color:P.accentHi,fontWeight:600,marginBottom:4}}> Review <div style={{fontSize:11,color:P.muted,lineHeight:1.5}}>If the AI got anything wron </div>
 <div>
 <div style={{...s.lbl,marginBottom:8}}>Add to inventory as</div>
 <div style={{display:"flex",gap:8}}>
 <GBtn onClick={()=>setApplyAs("new")} active={applyAs==="new"} style={{flex:1}}> <GBtn onClick={()=>setApplyAs("existing")} active={applyAs==="existing"} style={{ </div>
 </div>
 {applyAs==="new" && (
 <div style={{background:P.bgAlt,border:`1px solid ${P.border}`,borderRadius:10,padd <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
 <div><label style={s.lbl}>Part Number</label><input style={s.inp} value={ePn} o <div><label style={s.lbl}>Quantity</label><input style={{...s.inp,fontSize:18,f </div>
 <div><label style={s.lbl}>Type {originalResult&&originalResult.type!==eType&&<spa <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
 <div><label style={s.lbl}>Size {originalResult&&originalResult.size!==eSize&&<s <div><label style={s.lbl}>Material</label><input style={s.inp} value={eMaterial
 </div>
 <div><label style={s.lbl}>Supplier / Brand</label><input style={s.inp} value={eSu {hasChanges && <div style={{background:"rgba(250,204,21,.1)",border:"1px solid rg </div>
 )}
 {applyAs==="existing" && (
 <div style={{display:"flex",flexDirection:"column",gap:12}}>
 <div><label style={s.lbl}>Select fitting</label>
 <select style={s.inp} value={selId} onChange={e=>setSelId(e.target.value)}>
 <option value="">— choose —</option>
 {inventory.map(f=><option key={f.id} value={f.id}>{f.pn} – {f.type} {f.size}  </select>
 </div>
 <div><label style={s.lbl}>Quantity</label><input style={{...s.inp,fontSize:18,fon <div style={{display:"flex",gap:8}}>
 <GBtn onClick={()=>setAddMode("add")} active={addMode==="add"} style={{flex:1}} <GBtn onClick={()=>setAddMode("set")} active={addMode==="set"} style={{flex:1}} </div>
 </div>
 )}
 <div style={{display:"flex",gap:10}}>
 <GBtn onClick={onClose} style={{flex:1,padding:11}}>Cancel</GBtn>
 <PBtn onClick={doApply} disabled={!canApply} style={{flex:2,padding:11}}>{applyAs== </div>
 </>)}
 </div>
 );
}
// ── Main App ──────────────────────────────────────────────────────────────────
function MainApp({ session, onSignOut }) {
 const [inv, setInv] = useState([]);
 const [loaded, setLoaded] = useState(false);
 const [settings, setSettings] = useState({business_name:"Your Business",low_stock_threshold const [settingsId, setSettingsId] = useState(null);
 const [corrections, setCorrections] = useState([]);
 const [modal, setModal] = useState(null);
 const [delItem, setDelItem] = useState(null);
 const [search, setSearch] = useState("");
 const [typeF, setTypeF] = useState("All");
 const [lowOnly, setLowOnly] = useState(false);
 const [toast, setToast] = useState(null);
 const [toastKind, setToastKind] = useState("success");
 const [syncing, setSyncing] = useState(false);
 const showToast = (msg, kind="success") => { setToast(msg); setToastKind(kind); setTimeout( // Initial load from Supabase
 useEffect(() => {
 (async () => {
 try {
 const [invData, settingsData, corrData] = await Promise.all([
 sb("/inventory?select=*&order=id.asc"),
 sb("/settings?select=*&limit=1"),
 sb("/ai_corrections?select=*&order=created_at.desc&limit=50"),
 ]);
 setInv(invData || []);
 if (settingsData && settingsData[0]) {
 setSettings(settingsData[0]);
 setSettingsId(settingsData[0].id);
 }
 setCorrections(corrData || []);
 setLoaded(true);
 } catch (e) {
 showToast("Failed to load: " + e.message, "error");
 setLoaded(true);
 }
 })();
 }, []);
 // Poll every 8 seconds for changes from other users
 useEffect(() => {
 if (!loaded) return;
 const interval = setInterval(async () => {
 try {
 const invData = await sb("/inventory?select=*&order=id.asc");
 setInv(invData || []);
 } catch(_) {}
 }, 8000);
 return () => clearInterval(interval);
 }, [loaded]);
 const lowCount = inv.filter(f=>f.qty<=settings.low_stock_threshold).length;
 const filtered = useMemo(()=>inv.filter(f=>{
 const q = search.toLowerCase();
 return (!q||[f.pn,f.type,f.size,f.material,f.supplier,f.location,f.notes].some(v=>(v||"") && (typeF==="All"||f.type===typeF)
 && (!lowOnly||f.qty<=settings.low_stock_threshold);
 }), [inv, search, typeF, lowOnly, settings.low_stock_threshold]);
 async function saveManual(form) {
 setSyncing(true);
 try {
 if (modal==="add") {
 const [created] = await sb("/inventory", {
 method:"POST",
 body: JSON.stringify({pn:form.pn,type:form.type,size:form.size,qty:form.qty,materia });
 setInv(v=>[...v, created]);
 showToast(form.pn+" added");
 } else {
 const updated = await sb(`/inventory?id=eq.${modal.id}`, {
 method:"PATCH",
 body: JSON.stringify({pn:form.pn,type:form.type,size:form.size,qty:form.qty,materia });
 setInv(v=>v.map(x=>x.id===modal.id?{...x,...(updated?.[0]||form)}:x));
 showToast(form.pn+" updated");
 }
 } catch(e) { showToast("Save failed: "+e.message,"error"); }
 setSyncing(false);
 setModal(null);
 }
 async function createNewFromScan(form) {
 setSyncing(true);
 try {
 const [created] = await sb("/inventory", {
 method:"POST",
 body: JSON.stringify({pn:form.pn,type:form.type,size:form.size,qty:form.qty,material: });
 setInv(v=>[...v, created]);
 showToast(form.pn+" added — "+form.qty+" units");
 } catch(e) { showToast("Add failed: "+e.message,"error"); }
 setSyncing(false);
 }
 async function updateExisting(id, qty, mode) {
 const f = inv.find(x=>x.id===id);
 const nq = mode==="add" ? f.qty+qty : qty;
 setSyncing(true);
 try {
 await sb(`/inventory?id=eq.${id}`, {method:"PATCH", body:JSON.stringify({qty:nq,updated setInv(v=>v.map(x=>x.id===id?{...x,qty:nq}:x));
 showToast(f.pn+" → "+nq+" units");
 } catch(e) { showToast("Update failed: "+e.message,"error"); }
 setSyncing(false);
 }
 async function adjustQty(id, d) {
 const f = inv.find(x=>x.id===id);
 const nq = Math.max(0, f.qty+d);
 setInv(v=>v.map(x=>x.id===id?{...x,qty:nq}:x));
 try { await sb(`/inventory?id=eq.${id}`, {method:"PATCH", body:JSON.stringify({qty:nq,upd catch(e) { showToast("Sync failed — reload to retry","error"); }
 }
 async function deleteFitting(id) {
 const f = inv.find(x=>x.id===id);
 setSyncing(true);
 try {
 await sb(`/inventory?id=eq.${id}`, {method:"DELETE"});
 setInv(v=>v.filter(x=>x.id!==id));
 showToast((f?.pn||"Fitting")+" removed");
 } catch(e) { showToast("Delete failed: "+e.message,"error"); }
 setSyncing(false);
 }
 async function handleSettingsSave(newSettings) {
 setSyncing(true);
 try {
 if (settingsId) {
 await sb(`/settings?id=eq.${settingsId}`, {method:"PATCH", body:JSON.stringify({...ne } else {
 const [created] = await sb("/settings", {method:"POST", body:JSON.stringify(newSettin if (created) setSettingsId(created.id);
 }
 setSettings(newSettings);
 showToast("Settings saved");
 } catch(e) { showToast("Save failed: "+e.message,"error"); }
 setSyncing(false);
 setModal(null);
 }
 async function handleCorrection(c) {
 try {
 const [created] = await sb("/ai_corrections", {method:"POST", body:JSON.stringify(c)});
 if (created) setCorrections(v=>[created, ...v].slice(0,50));
 } catch(_) {}
 }
 function emailLowStock() {
 const lowItems = inv.filter(f=>f.qty<=settings.low_stock_threshold);
 if (lowItems.length===0) { showToast("No low stock items","info"); return; }
 if (!settings.low_stock_email) { showToast("Set an alert email in Settings first","error" const body = `Low Stock Alert from ${settings.business_name}\n\nThe following parts are a lowItems.map(f=>`• ${f.pn} — ${f.type} ${f.size}: ${f.qty} units remaining${f.supplier?
 `\n\n— ${settings.business_name} Inventory System`;
 const subject = encodeURIComponent(settings.alert_email_subject + " — " + lowItems.length window.location.href = `mailto:${settings.low_stock_email}?subject=${subject}&body=${enco }
 if (!loaded) {
 return <div style={{minHeight:"100vh",background:P.bg,color:P.text,fontFamily:"'DM Sans', <div style={{textAlign:"center"}}>
 <div style={{fontSize:32,marginBottom:10}}>⚙</div>
 <div style={{color:P.muted}}>Loading inventory from cloud…</div>
 </div>
 </div>;
 }
 return (
 <div style={{minHeight:"100vh",background:`linear-gradient(180deg, ${P.bg} 0%, ${P.bgAlt} <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=DM+Sa <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
 input:focus,select:focus,textarea:focus{border-color:${P.accent}!important;box-shadow button:hover:not(:disabled){filter:brightness(1.1)}
 tr:hover{background:rgba(74,143,219,.05)!important}
 `}</style>
 <Toast msg={toast} kind={toastKind}/>
 <div style={{background:P.panel,borderBottom:`1px solid ${P.border}`,padding:"0 24px",d <div style={{display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
 <div style={{width:44,height:44,borderRadius:11,background:`linear-gradient(135deg, <div>
 <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,letter <div style={{fontSize:10,color:P.muted,letterSpacing:".1em",textTransform:"upperc </div>
 </div>
 <div style={{display:"flex",gap:10,alignItems:"center"}}>
 {syncing && <span style={{fontSize:11,color:P.accentHi}}> syncing…</span>}
 <GBtn onClick={()=>setModal("settings")} style={{padding:"9px 14px",fontSize:13}}>⚙ <GBtn onClick={()=>setModal("scan")} style={{padding:"9px 16px",fontSize:13,borderC <PBtn onClick={()=>setModal("add")} style={{padding:"10px 20px",fontSize:13}}>+ Add </div>
 </div>
 <div style={{maxWidth:1200,margin:"0 auto",padding:"30px 24px"}}>
 <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:2 {[
 {l:"Fitting Types",v:inv.length,i:" ",c:P.accentHi},
 {l:"Total Units",v:inv.reduce((a,f)=>a+f.qty,0),i:" ",c:P.white},
 {l:"Low Stock",v:lowCount,i:"⚠",c:lowCount>0?P.yellow:P.white,w:lowCount>0}
 ].map(st=>(
 <div key={st.l} style={{background:`linear-gradient(135deg, ${P.panel}, ${P.panel <div style={{fontSize:24,marginBottom:8}}>{st.i}</div>
 <div style={{fontSize:36,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",colo <div style={{fontSize:10,color:P.muted,letterSpacing:".1em",textTransform:"uppe {st.l==="Low Stock"&&lowCount>0&&settings.low_stock_email&&
 <button onClick={emailLowStock} style={{marginTop:12,background:"rgba(74,143, }
 </div>
 ))}
 </div>
 <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
 <input value={search} onChange={e=>setSearch(e.target.value)} placeholder=" Searc <select value={typeF} onChange={e=>setTypeF(e.target.value)} style={{...s.inp,width <option>All</option>{DEFAULT_TYPES.map(t=><option key={t}>{t}</option>)}
 </select>
 <GBtn onClick={()=>setLowOnly(v=>!v)} active={lowOnly} style={{padding:"10px 16px", </div>
 <div style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:14,overfl <table style={{width:"100%",borderCollapse:"collapse"}}>
 <thead>
 <tr style={{borderBottom:`1px solid ${P.border}`,background:P.panelHi}}>
 <th style={{padding:"14px 16px",textAlign:"left",fontSize:10,color:P.muted,le <th style={{padding:"14px 16px",textAlign:"center",fontSize:10,color:P.muted, <th style={{padding:"14px 16px",textAlign:"left",fontSize:10,color:P.muted,le <th style={{padding:"14px 16px",textAlign:"left",fontSize:10,color:P.muted,le <th style={{padding:"14px 16px",textAlign:"left",fontSize:10,color:P.muted,le <th style={{padding:"14px 16px",textAlign:"left",fontSize:10,color:P.muted,le <th style={{padding:"14px 16px",textAlign:"left",fontSize:10,color:P.muted,le <th style={{padding:"14px 16px",textAlign:"right",fontSize:10,color:P.muted,l </tr>
 </thead>
 <tbody>
 {filtered.length===0
 ? <tr><td colSpan={8} style={{padding:60,textAlign:"center",color:P.mutedLo}} : filtered.map((f,i)=>{
 const low = f.qty <= settings.low_stock_threshold;
 return <tr key={f.id} style={{borderBottom:`1px solid ${P.bg}`,transition:" <td style={{padding:"14px 16px"}}><span style={{fontFamily:"'Rajdhani',sa <td style={{padding:"14px 16px"}}>
 <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"c <button onClick={()=>adjustQty(f.id,-1)} style={{width:28,height:28,b <span style={{fontSize:22,fontWeight:700,minWidth:36,textAlign:"cente <button onClick={()=>adjustQty(f.id,1)} style={{width:28,height:28,bo {low&&<span style={{background:"rgba(250,204,21,.18)",color:P.yellow,
 </div>
 </td>
 <td style={{padding:"14px 16px",fontSize:13,color:P.textDim}}>{f.type}</t <td style={{padding:"14px 16px",fontSize:14,color:P.text,fontFamily:"'Raj <td style={{padding:"14px 16px",fontSize:12,color:P.muted}}>{f.material|| <td style={{padding:"14px 16px",fontSize:12,color:P.muted}}>{f.supplier|| <td style={{padding:"14px 16px",fontSize:12,color:P.muted}}>{f.location|| <td style={{padding:"14px 16px",textAlign:"right"}}>
 <button onClick={()=>setModal(f)} style={{padding:"6px 14px",borderRadi </td>
 </tr>;
 })}
 </tbody>
 </table>
 </div>
 <div style={{marginTop:14,fontSize:11,color:P.mutedLo,display:"flex",justifyContent:" <span>{filtered.length} of {inv.length} fittings · Low stock threshold ≤ {settings. <span> Cloud synced · {corrections.length} AI correction{corrections.length!==1?" </div>
 </div>
 {modal==="scan"&&<Modal title=" Scan & Identify Fitting" onClose={()=>setModal(null)} <Scanner inventory={inv} corrections={corrections} onCreateNew={createNewFromScan} on </Modal>}
 {modal==="settings"&&<Modal title="⚙ Business Settings" onClose={()=>setModal(null)}>
 <SettingsModal settings={settings} onSave={handleSettingsSave} onClose={()=>setModal( </Modal>}
 {modal==="add"&&<Modal title="Add New Part" onClose={()=>setModal(null)} wide>
 <FittingForm onSave={saveManual} onClose={()=>setModal(null)}/>
 </Modal>}
 {modal&&typeof modal==="object"&&<Modal title={`Edit ${modal.pn}`} onClose={()=>setModa <FittingForm initial={modal} onSave={saveManual} onClose={()=>setModal(null)} onDelet </Modal>}
 {delItem&&<Modal title="Confirm Delete" onClose={()=>setDelItem(null)}>
 <p style={{color:P.textDim,marginTop:0,fontSize:14,lineHeight:1.5}}>Remove <strong st <div style={{display:"flex",gap:10}}>
 <GBtn onClick={()=>setDelItem(null)} style={{flex:1,padding:11}}>Cancel</GBtn>
 <DangerBtn onClick={()=>{deleteFitting(delItem.id);setDelItem(null);}} style={{flex </div>
 </Modal>}
 </div>
 );
}
// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
 const [session, setSession] = useState(null);
 const [checking, setChecking] = useState(true);
 useEffect(() => {
 const token = localStorage.getItem("diefits_token");
 const userJson = localStorage.getItem("diefits_user");
 if (token && userJson) {
 try { setSession({ token, user: JSON.parse(userJson) }); } catch(_) {}
 }
 setChecking(false);
 }, []);
 function handleLogin({ token, user }) { setSession({ token, user }); }
 function handleSignOut() {
 localStorage.removeItem("diefits_token");
 localStorage.removeItem("diefits_user");
 setSession(null);
 }
 if (checking) return null;
 if (!session) return <LoginScreen onLogin={handleLogin}/>;
 return <MainApp session={session} onSignOut={handleSignOut}/>;
}
