import { useState, useEffect, useRef, useMemo } from "react";

const SUPABASE_URL = "https://ntotnesafnnvxzuimmqv.supabase.co";
const SUPABASE_KEY = "sb_publishable_ARgDMbAYHEf1oLwvI1eJUA_6KQWDKpl";

// -- Supabase REST helpers --
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
    headers: { "apikey": SUPABASE_KEY, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.msg || data.error_description || data.error || `Auth error ${res.status}`);
  return data;
}

// -- Constants --
const DEFAULT_TYPES = [
  "Hydraulic - Straight","Hydraulic - Elbow 90","Hydraulic - Elbow 45","Hydraulic - Tee",
  "Coolant - Straight","Coolant - Elbow 90","Coolant - Tee",
  "Air - Straight","Air - Elbow 90",
  "Camlock - Type A","Camlock - Type B","Camlock - Type C","Camlock - Type D",
  "Camlock - Type E","Camlock - Type F","Camlock - Type DC","Camlock - Type DP",
  "Push-to-Connect","Compression","Swivel","Bulkhead","Grease / Zerk",
  "JIC / AN Fitting","NPT Straight","NPT Elbow",
  "Screw","Bolt","Nut","Washer","Pin","Spring","Gasket","O-Ring",
  "Punch","Die Block","Die Insert","Stripper","Retainer","Pilot","Other",
];
const DEFAULT_SIZES = ['1/8"','1/4"','3/8"','1/2"','3/4"','1"','1-1/4"','1-1/2"','2"','3"','4"',"6mm","8mm","10mm","12mm","16mm","M3","M4","M5","M6","M8","M10","M12","N/A","Other"];

// Industrial palette - charcoal + orange
const P = {
  bg:"#0d1117", bgAlt:"#161b22", panel:"#1c2128", panelHi:"#262c36",
  border:"#373e47", borderHi:"#545d68",
  accent:"#f97316", accentHi:"#fb923c", accentLo:"#c2410c",
  steel:"#94a3b8", steelDark:"#64748b",
  text:"#f0f6fc", textDim:"#c9d1d9", muted:"#8b949e", mutedLo:"#6e7681",
  green:"#3fb950", yellow:"#d29922", red:"#f85149", white:"#ffffff",
};

const s = {
  inp: {width:"100%",boxSizing:"border-box",background:P.bg,border:`1px solid ${P.border}`,borderRadius:8,padding:"10px 13px",color:P.text,fontSize:14,outline:"none",fontFamily:"inherit"},
  lbl: {display:"block",fontSize:11,color:P.muted,textTransform:"uppercase",letterSpacing:".09em",marginBottom:6,fontWeight:700},
};

// -- DIE BLOCK LOGO (stamped "D" on a steel die) --
function DieLogo({size=44}) {
  const fontSize = size * 0.55;
  return (
    <div style={{
      width:size, height:size, borderRadius:size*0.18,
      background:`linear-gradient(145deg, #4a5260 0%, #2a3038 50%, #1a1f26 100%)`,
      border:`1px solid #555c66`,
      display:"flex", alignItems:"center", justifyContent:"center",
      position:"relative",
      boxShadow:`inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.4)`
    }}>
      <span style={{
        fontFamily:"'Black Ops One', 'Rajdhani', sans-serif",
        fontSize, fontWeight:900, letterSpacing:"-0.02em",
        color:P.accent,
        textShadow:`0 1px 0 rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.1)`,
        lineHeight:1, paddingTop:size*0.04
      }}>D</span>
      {/* corner rivets */}
      <span style={{position:"absolute",top:size*0.1,left:size*0.1,width:size*0.06,height:size*0.06,borderRadius:"50%",background:"#1a1f26",boxShadow:"inset 0 1px 1px rgba(255,255,255,0.15)"}}/>
      <span style={{position:"absolute",top:size*0.1,right:size*0.1,width:size*0.06,height:size*0.06,borderRadius:"50%",background:"#1a1f26",boxShadow:"inset 0 1px 1px rgba(255,255,255,0.15)"}}/>
      <span style={{position:"absolute",bottom:size*0.1,left:size*0.1,width:size*0.06,height:size*0.06,borderRadius:"50%",background:"#1a1f26",boxShadow:"inset 0 1px 1px rgba(255,255,255,0.15)"}}/>
      <span style={{position:"absolute",bottom:size*0.1,right:size*0.1,width:size*0.06,height:size*0.06,borderRadius:"50%",background:"#1a1f26",boxShadow:"inset 0 1px 1px rgba(255,255,255,0.15)"}}/>
    </div>
  );
}

// -- UI Components --
function PBtn({onClick,disabled,children,style={}}) {
  return <button onClick={onClick} disabled={!!disabled} style={{border:"none",borderRadius:8,cursor:disabled?"default":"pointer",fontFamily:"inherit",fontWeight:700,opacity:disabled?.4:1,background:`linear-gradient(135deg, ${P.accent}, ${P.accentLo})`,color:P.white,padding:"11px 16px",fontSize:14,letterSpacing:".02em",boxShadow:"0 2px 8px rgba(249,115,22,.3)",...style}}>{children}</button>;
}
function GBtn({onClick,children,active,style={}}) {
  return <button onClick={onClick} style={{border:`1px solid ${active?P.accent:P.border}`,borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:600,background:active?"rgba(249,115,22,.12)":"transparent",color:active?P.accentHi:P.textDim,padding:"9px 14px",fontSize:14,...style}}>{children}</button>;
}
function DangerBtn({onClick,children,style={}}) {
  return <button onClick={onClick} style={{border:"none",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:700,background:"#7a1d1d",color:"#fca5a5",padding:"11px 16px",fontSize:14,...style}}>{children}</button>;
}

function Modal({title,onClose,children,wide}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(5,8,12,.85)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:12,backdropFilter:"blur(6px)"}}>
      <div style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:12,padding:22,width:"100%",maxWidth:wide?720:480,maxHeight:"94vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,.6)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,color:P.text,letterSpacing:".05em",textTransform:"uppercase"}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:P.muted,fontSize:28,cursor:"pointer",lineHeight:1,padding:0,width:34,height:34,borderRadius:6}}>x</button>
        </div>
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
    <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:P.panel,border:`1px solid ${c}`,borderRadius:10,padding:"11px 22px",color:c,fontSize:14,fontWeight:600,zIndex:300,maxWidth:"calc(100vw - 32px)",boxShadow:"0 12px 40px rgba(0,0,0,.5)"}}>
      {kind==="error"?"! ":"OK "}{msg}
    </div>
  );
}

// -- Photo capture --
function PhotoBox({ value, onChange, size=120 }) {
  const cameraRef = useRef();
  const galleryRef = useRef();
  const [loading, setLoading] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    setLoading(true);
    try {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.onerror = () => rej(new Error("Read failed"));
        r.readAsDataURL(file);
      });
      const compressed = await new Promise(res => {
        const img = new Image();
        img.onload = () => {
          const MAX = 700;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
            else { w = Math.round(w * MAX / h); h = MAX; }
          }
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          res(c.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = () => res(dataUrl);
        img.src = dataUrl;
      });
      onChange(compressed);
    } catch(e) { alert("Photo error: " + e.message); }
    setLoading(false);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <div style={{
        width: size, height: size, borderRadius: 10,
        border: `2px dashed ${value ? P.accent : P.border}`,
        background: value ? "#000" : P.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", position: "relative"
      }}>
        {loading ? (
          <div style={{color:P.muted,fontSize:11}}>Loading...</div>
        ) : value ? (
          <img src={value} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        ) : (
          <div style={{textAlign:"center",color:P.muted,fontSize:11}}>
            <div style={{fontSize:32,marginBottom:4}}>+</div>
            <div>Add Photo</div>
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:6,width:size}}>
        <button onClick={()=>cameraRef.current?.click()} style={{flex:1,padding:"6px 4px",borderRadius:6,border:`1px solid ${P.border}`,background:P.bgAlt,color:P.textDim,cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700}}>Camera</button>
        <button onClick={()=>galleryRef.current?.click()} style={{flex:1,padding:"6px 4px",borderRadius:6,border:`1px solid ${P.border}`,background:P.bgAlt,color:P.textDim,cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700}}>Gallery</button>
      </div>
      {value && !loading && (
        <button onClick={()=>onChange("")} style={{background:"transparent",border:"none",color:P.red,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Remove</button>
      )}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFile(e.target.files?.[0])}/>
      <input ref={galleryRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files?.[0])}/>
    </div>
  );
}

function Thumb({ src, size=44 }) {
  if (!src) return (
    <div style={{width:size,height:size,borderRadius:6,background:P.bg,border:`1px solid ${P.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:P.mutedLo,fontSize:Math.round(size/2.5)}}>?</div>
  );
  return <img src={src} alt="" style={{width:size,height:size,borderRadius:6,objectFit:"cover",border:`1px solid ${P.border}`,cursor:"pointer"}}/>;
}

function PhotoViewer({src, onClose}) {
  if (!src) return null;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.95)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,cursor:"zoom-out"}}>
      <img src={src} alt="" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
    </div>
  );
}

// -- Login Screen --
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("signin");
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
      if (!data.access_token && !data.session?.access_token) throw new Error("No session returned");
      const token = data.access_token || data.session.access_token;
      const user = data.user || data.session?.user;
      localStorage.setItem("diefits_token", token);
      localStorage.setItem("diefits_user", JSON.stringify(user));
      onLogin({ token, user });
    } catch(e) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(180deg, ${P.bg} 0%, ${P.bgAlt} 100%)`,color:P.text,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <link href="https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-block",marginBottom:18}}><DieLogo size={72}/></div>
          <div style={{fontFamily:"'Black Ops One', 'Rajdhani', sans-serif",fontWeight:900,fontSize:38,letterSpacing:".06em",color:P.white,lineHeight:1}}>DIEFITS</div>
          <div style={{fontSize:11,color:P.accent,letterSpacing:".18em",textTransform:"uppercase",marginTop:8,fontWeight:800}}>Tool & Die Inventory</div>
          <div style={{fontSize:13,color:P.textDim,marginTop:18,fontWeight:500,lineHeight:1.5,padding:"0 8px"}}>Welcome to DieFits - for all your tool and die inventory needs</div>
        </div>
        <div style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:12,padding:24,boxShadow:"0 12px 40px rgba(0,0,0,.5)"}}>
          <div style={{display:"flex",gap:8,marginBottom:20,background:P.bg,padding:4,borderRadius:10}}>
            <button onClick={()=>{setMode("signin");setErr(null);}} style={{flex:1,padding:10,borderRadius:7,border:"none",background:mode==="signin"?P.panelHi:"transparent",color:mode==="signin"?P.white:P.muted,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,letterSpacing:".05em"}}>SIGN IN</button>
            <button onClick={()=>{setMode("signup");setErr(null);}} style={{flex:1,padding:10,borderRadius:7,border:"none",background:mode==="signup"?P.panelHi:"transparent",color:mode==="signup"?P.white:P.muted,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,letterSpacing:".05em"}}>SIGN UP</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div><label style={s.lbl}>Email</label><input style={s.inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
            <div><label style={s.lbl}>Password</label><input style={s.inp} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
            {err && <div style={{background:"rgba(248,81,73,.1)",border:"1px solid rgba(248,81,73,.35)",borderRadius:8,padding:12,color:P.red,fontSize:13,fontWeight:600}}>! {err}</div>}
            <PBtn onClick={submit} disabled={busy} style={{padding:14,fontSize:15,marginTop:6,letterSpacing:".05em",textTransform:"uppercase"}}>{busy ? "Please wait..." : (mode==="signin" ? "Sign In" : "Create Account")}</PBtn>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:20,fontSize:10,color:P.mutedLo,letterSpacing:".1em",textTransform:"uppercase",fontWeight:700}}>Cloud Sync . Photo Storage</div>
      </div>
    </div>
  );
}

// -- Part Form --
function PartForm({initial, onSave, onClose, onDelete}) {
  const [f, setF] = useState(() => initial ? {...initial, _photo: initial.photo || ""} : {
    pn:"", type:DEFAULT_TYPES[0], size:DEFAULT_SIZES[0], qty:1,
    material:"", supplier:"", location:"", notes:"", _photo:""
  });
  const set = (k,v) => setF(p=>({...p, [k]:v}));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}}>
        <div>
          <label style={s.lbl}>Photo</label>
          <PhotoBox value={f._photo||""} onChange={v=>set("_photo",v)} size={130}/>
        </div>
        <div style={{flex:"1 1 200px",display:"flex",flexDirection:"column",gap:10}}>
          <div><label style={s.lbl}>Part Number *</label><input style={s.inp} value={f.pn} onChange={e=>set("pn",e.target.value)} placeholder="e.g. HYD-4821"/></div>
          <div><label style={s.lbl}>Quantity *</label><input style={{...s.inp,fontSize:18,fontWeight:700,textAlign:"center"}} type="number" min={0} value={f.qty} onChange={e=>set("qty",parseInt(e.target.value)||0)}/></div>
        </div>
      </div>
      <div><label style={s.lbl}>Type *</label><select style={s.inp} value={f.type} onChange={e=>set("type",e.target.value)}>{DEFAULT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={s.lbl}>Size *</label><select style={s.inp} value={f.size} onChange={e=>set("size",e.target.value)}>{DEFAULT_SIZES.map(x=><option key={x}>{x}</option>)}</select></div>
        <div><label style={s.lbl}>Material</label><input style={s.inp} value={f.material||""} onChange={e=>set("material",e.target.value)} placeholder="Steel, A2, D2..."/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={s.lbl}>Supplier</label><input style={s.inp} value={f.supplier||""} onChange={e=>set("supplier",e.target.value)} placeholder="Dixon, Parker..."/></div>
        <div><label style={s.lbl}>Location</label><input style={s.inp} value={f.location||""} onChange={e=>set("location",e.target.value)} placeholder="Bin A3..."/></div>
      </div>
      <div><label style={s.lbl}>Notes</label><textarea style={{...s.inp,minHeight:60,resize:"vertical",fontFamily:"inherit"}} value={f.notes||""} onChange={e=>set("notes",e.target.value)}/></div>
      <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>
        {onDelete && <DangerBtn onClick={onDelete} style={{padding:"11px 14px"}}>Delete</DangerBtn>}
        <GBtn onClick={onClose} style={{flex:"1 1 100px",padding:11}}>Cancel</GBtn>
        <PBtn onClick={()=>f.pn.trim()&&onSave(f)} style={{flex:"2 1 200px",padding:11}}>Save Part</PBtn>
      </div>
    </div>
  );
}

// -- Die Form --
function DieForm({initial, onSave, onClose, onDelete}) {
  const [f, setF] = useState(initial || {
    name:"", customer:"", part_number:"", press_size:"", notes:"",
  });
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div><label style={s.lbl}>Die Name *</label><input style={s.inp} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Acme Bracket Die #4"/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={s.lbl}>Customer</label><input style={s.inp} value={f.customer||""} onChange={e=>set("customer",e.target.value)}/></div>
        <div><label style={s.lbl}>Part Number Made</label><input style={s.inp} value={f.part_number||""} onChange={e=>set("part_number",e.target.value)} placeholder="What this die produces"/></div>
      </div>
      <div><label style={s.lbl}>Press Size</label><input style={s.inp} value={f.press_size||""} onChange={e=>set("press_size",e.target.value)} placeholder="e.g. 200 ton press"/></div>
      <div><label style={s.lbl}>Notes</label><textarea style={{...s.inp,minHeight:80,resize:"vertical",fontFamily:"inherit"}} value={f.notes||""} onChange={e=>set("notes",e.target.value)} placeholder="Description, history, special tooling..."/></div>
      <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>
        {onDelete && <DangerBtn onClick={onDelete} style={{padding:"11px 14px"}}>Delete</DangerBtn>}
        <GBtn onClick={onClose} style={{flex:"1 1 100px",padding:11}}>Cancel</GBtn>
        <PBtn onClick={()=>f.name.trim()&&onSave(f)} style={{flex:"2 1 200px",padding:11}}>Save Die</PBtn>
      </div>
    </div>
  );
}

function AddPartToDie({inventory, onAdd, onClose}) {
  const [search, setSearch] = useState("");
  const [selId, setSelId] = useState("");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const filtered = inventory.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [f.pn, f.type, f.size, f.material, f.supplier].some(v => (v||"").toLowerCase().includes(q));
  });
  const selected = inventory.find(x => x.id === parseInt(selId));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div><label style={s.lbl}>Search inventory</label><input style={s.inp} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Type to filter..." autoFocus/></div>
      <div style={{maxHeight:280,overflowY:"auto",border:`1px solid ${P.border}`,borderRadius:8,background:P.bg}}>
        {filtered.length === 0 ? (
          <div style={{padding:20,textAlign:"center",color:P.mutedLo,fontSize:13}}>No matching parts</div>
        ) : filtered.map(f => (
          <div key={f.id} onClick={()=>setSelId(String(f.id))} style={{
            display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
            cursor:"pointer",borderBottom:`1px solid ${P.bgAlt}`,
            background: selId === String(f.id) ? "rgba(249,115,22,.15)" : "transparent"
          }}>
            <Thumb src={f.photo||""} size={40}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:P.white,fontSize:14}}>{f.pn}</div>
              <div style={{fontSize:11,color:P.muted}}>{f.type} | {f.size} | qty: {f.qty}</div>
            </div>
            {selId === String(f.id) && <div style={{color:P.accentHi,fontSize:18,fontWeight:700}}>OK</div>}
          </div>
        ))}
      </div>
      {selected && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12}}>
          <div><label style={s.lbl}>Qty in Die *</label><input style={{...s.inp,fontSize:18,fontWeight:700,textAlign:"center"}} type="number" min={1} value={qty} onChange={e=>setQty(parseInt(e.target.value)||1)}/></div>
          <div><label style={s.lbl}>Notes (position, role)</label><input style={s.inp} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. Lower punch, position 3"/></div>
        </div>
      )}
      <div style={{display:"flex",gap:10}}>
        <GBtn onClick={onClose} style={{flex:1,padding:11}}>Cancel</GBtn>
        <PBtn onClick={()=>selected && qty > 0 && onAdd(selected, qty, notes)} disabled={!selected || qty <= 0} style={{flex:2,padding:11}}>Add to Die</PBtn>
      </div>
    </div>
  );
}

// -- Settings Modal --
function SettingsModal({settings, onSave, onClose, userEmail}) {
  const [form, setForm] = useState({...settings});
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:P.bgAlt,border:`1px solid ${P.border}`,borderRadius:10,padding:14}}>
        <div style={{fontSize:11,color:P.accent,fontWeight:800,marginBottom:8,letterSpacing:".1em"}}>SIGNED IN AS</div>
        <div style={{fontSize:13,color:P.text,wordBreak:"break-all"}}>{userEmail}</div>
      </div>
      <div style={{background:P.bgAlt,border:`1px solid ${P.border}`,borderRadius:10,padding:14}}>
        <div style={{fontSize:11,color:P.accent,fontWeight:800,marginBottom:10,letterSpacing:".1em"}}>BUSINESS</div>
        <div><label style={s.lbl}>Business Name</label><input style={s.inp} value={form.business_name||""} onChange={e=>set("business_name",e.target.value)}/></div>
      </div>
      <div style={{background:P.bgAlt,border:`1px solid ${P.border}`,borderRadius:10,padding:14,display:"flex",flexDirection:"column",gap:10}}>
        <div style={{fontSize:11,color:P.accent,fontWeight:800,letterSpacing:".1em"}}>LOW STOCK ALERTS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10}}>
          <div><label style={s.lbl}>Threshold</label><input style={s.inp} type="number" min={0} value={form.low_stock_threshold||0} onChange={e=>set("low_stock_threshold",parseInt(e.target.value)||0)}/></div>
          <div><label style={s.lbl}>Subject</label><input style={s.inp} value={form.alert_email_subject||""} onChange={e=>set("alert_email_subject",e.target.value)}/></div>
        </div>
        <div><label style={s.lbl}>Email Recipient</label><input style={s.inp} type="email" value={form.low_stock_email||""} onChange={e=>set("low_stock_email",e.target.value)}/></div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <GBtn onClick={onClose} style={{flex:1,padding:11}}>Cancel</GBtn>
        <PBtn onClick={()=>onSave(form)} style={{flex:2,padding:11}}>Save Settings</PBtn>
      </div>
    </div>
  );
}

// -- Tutorial Page --
function TutorialPage() {
  const sect = (n,t,body) => (
    <div style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:12,padding:20,marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <div style={{width:36,height:36,borderRadius:8,background:`linear-gradient(135deg,${P.accent},${P.accentLo})`,display:"flex",alignItems:"center",justifyContent:"center",color:P.white,fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,boxShadow:"0 2px 8px rgba(249,115,22,.3)"}}>{n}</div>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,color:P.white,letterSpacing:".03em",textTransform:"uppercase"}}>{t}</div>
      </div>
      <div style={{color:P.textDim,fontSize:14,lineHeight:1.65}}>{body}</div>
    </div>
  );
  return (
    <div style={{maxWidth:760,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:28,color:P.white,letterSpacing:".05em",textTransform:"uppercase"}}>How to Use DieFits</div>
        <div style={{fontSize:13,color:P.muted,marginTop:6}}>A quick guide for your shop crew</div>
      </div>

      {sect("1","Add a Part with a Photo",<>
        <p>Tap the <b style={{color:P.accentHi}}>Inventory</b> tab from the menu, then tap the <b>+ Add Part</b> button.</p>
        <p>Tap the <b>Camera</b> button to take a fresh photo, or <b>Gallery</b> to pick one from your phone. The photo helps your team confirm they grabbed the right part from the bin.</p>
        <p>Fill in the Part Number, Quantity, Type, and Size. Add Material, Supplier, and Location if you want. Tap <b>Save Part</b>.</p>
      </>)}

      {sect("2","Adjust Quantities Fast",<>
        <p>In the inventory list, every row has <b>-</b> and <b>+</b> buttons. Tap them to bump the count up or down by 1.</p>
        <p>Use this constantly as parts come in and go out. No need to open the edit screen.</p>
      </>)}

      {sect("3","Search and Filter",<>
        <p>Use the search bar to find a part by number, type, size, supplier, or location.</p>
        <p>Use the dropdown to filter by part type. Tap <b>Low</b> to only see parts that are running out.</p>
      </>)}

      {sect("4","Catalog a Die",<>
        <p>Tap the <b style={{color:P.accentHi}}>Dies</b> tab from the menu, then tap <b>+ New Die</b>.</p>
        <p>Give the die a name, customer, and the part number it makes. Save it.</p>
        <p>Tap into the die, then tap <b>+ Add Part</b>. Find the part in your inventory, set how many go in this die, add a note like "Lower punch, position 3", and add it.</p>
        <p>Do this for every part - even the small screws and washers. The whole point is to know exactly what goes into a die so you can bid the next one accurately.</p>
      </>)}

      {sect("5","Use Past Dies for Bidding",<>
        <p>When a customer asks for a quote on a similar die, open the past die in DieFits.</p>
        <p>You see the complete parts list. Add up the supplier prices. Add your labor and margin. Bid with confidence.</p>
      </>)}

      {sect("6","Low Stock Alerts",<>
        <p>Open <b>Settings</b> from the menu. Set your low-stock threshold (e.g. 5) and your email address.</p>
        <p>When parts drop to that level, the Inventory tab shows a yellow <b>Low Stock</b> card. Tap <b>Email</b> on that card and your email opens with the order list pre-filled.</p>
      </>)}

      {sect("7","Sync Across Devices",<>
        <p>Everything you do syncs to the cloud automatically. Add a part on the shop floor with your phone, see it on your office PC seconds later. Everyone on your team sees the same parts and dies.</p>
        <p>If something doesn't show up right away, pull down to refresh or just wait a few seconds.</p>
      </>)}

      {sect("8","Best Practices",<>
        <p>Daily: when you start work, check the Low Stock card and order anything you need.</p>
        <p>Per job: log every part used. Don't skip the small stuff.</p>
        <p>Per die: catalog the full parts list before you forget. This pays off on the next bid.</p>
      </>)}
    </div>
  );
}

// -- Side Drawer Menu --
function Drawer({open, onClose, currentPage, setPage, settings, userEmail, onSettings, onSignOut}) {
  if (!open) return null;
  const items = [
    {id:"inventory", label:"Inventory", icon:">"},
    {id:"dies", label:"Dies", icon:">"},
    {id:"tutorial", label:"How to Use", icon:"?"},
  ];
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:90,backdropFilter:"blur(3px)"}}/>
      <div style={{position:"fixed",top:0,left:0,bottom:0,width:280,maxWidth:"85vw",background:P.panel,borderRight:`1px solid ${P.border}`,zIndex:91,display:"flex",flexDirection:"column",boxShadow:"4px 0 24px rgba(0,0,0,.5)"}}>
        <div style={{padding:"22px 18px 18px",borderBottom:`1px solid ${P.border}`,display:"flex",alignItems:"center",gap:12}}>
          <DieLogo size={42}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,color:P.white,letterSpacing:".05em",textTransform:"uppercase"}}>{settings.business_name||"DieFits"}</div>
            <div style={{fontSize:10,color:P.muted,letterSpacing:".1em",textTransform:"uppercase",marginTop:2,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userEmail}</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:P.muted,fontSize:24,cursor:"pointer",padding:0,width:30,height:30}}>x</button>
        </div>
        <div style={{flex:1,padding:"12px 8px",overflowY:"auto"}}>
          {items.map(it => (
            <button key={it.id} onClick={()=>{setPage(it.id);onClose();}} style={{
              width:"100%",padding:"13px 14px",borderRadius:8,border:"none",
              background: currentPage===it.id ? "rgba(249,115,22,.15)" : "transparent",
              color: currentPage===it.id ? P.accentHi : P.textDim,
              cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:15,
              textAlign:"left",display:"flex",alignItems:"center",gap:12,marginBottom:2
            }}>
              <span style={{width:22,height:22,borderRadius:4,background:currentPage===it.id?P.accent:P.border,color:P.white,fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{it.icon}</span>
              {it.label}
            </button>
          ))}
        </div>
        <div style={{padding:"12px 8px",borderTop:`1px solid ${P.border}`}}>
          <button onClick={()=>{onSettings();onClose();}} style={{width:"100%",padding:"12px 14px",borderRadius:8,border:`1px solid ${P.border}`,background:"transparent",color:P.textDim,cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:14,textAlign:"left",marginBottom:6}}>Settings</button>
          <button onClick={()=>{onSignOut();onClose();}} style={{width:"100%",padding:"12px 14px",borderRadius:8,border:`1px solid ${P.border}`,background:"transparent",color:P.red,cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:14,textAlign:"left"}}>Sign Out</button>
        </div>
      </div>
    </>
  );
}

// -- MAIN APP --
function MainApp({ session, onSignOut }) {
  const [page, setPage] = useState("inventory");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inv, setInv] = useState([]);
  const [dies, setDies] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState({business_name:"Your Business",low_stock_threshold:5,low_stock_email:"",alert_email_subject:"Low Stock Alert"});
  const [settingsId, setSettingsId] = useState(null);
  const [modal, setModal] = useState(null);
  const [delItem, setDelItem] = useState(null);
  const [search, setSearch] = useState("");
  const [typeF, setTypeF] = useState("All");
  const [lowOnly, setLowOnly] = useState(false);
  const [openDie, setOpenDie] = useState(null);
  const [viewerPhoto, setViewerPhoto] = useState(null);
  const [toast, setToast] = useState(null);
  const [toastKind, setToastKind] = useState("success");

  const showToast = (msg, kind="success") => { setToast(msg); setToastKind(kind); setTimeout(()=>setToast(null), 3000); };

  // Load everything from Supabase
  useEffect(() => {
    (async () => {
      try {
        const [invData, settingsData, diesData] = await Promise.all([
          sb("/inventory?select=*&order=id.asc"),
          sb("/settings?select=*&limit=1").catch(() => null),
          sb("/dies?select=*&order=created_at.desc").catch(() => []),
        ]);
        setInv(invData || []);
        setDies(diesData || []);
        if (settingsData && settingsData[0]) {
          setSettings(settingsData[0]);
          setSettingsId(settingsData[0].id);
        }
        setLoaded(true);
      } catch (e) { showToast("Load failed: " + e.message, "error"); setLoaded(true); }
    })();
  }, []);

  // Real-time sync - poll every 5 seconds
  useEffect(() => {
    if (!loaded) return;
    const iv = setInterval(async () => {
      try {
        const [i, d] = await Promise.all([
          sb("/inventory?select=*&order=id.asc"),
          sb("/dies?select=*&order=created_at.desc").catch(() => null),
        ]);
        if (i) setInv(i);
        if (d) {
          setDies(d);
          // Keep openDie in sync
          if (openDie) {
            const updated = d.find(x => x.id === openDie.id);
            if (updated) setOpenDie(updated);
          }
        }
      } catch(_) {}
    }, 5000);
    return () => clearInterval(iv);
  }, [loaded, openDie]);

  const lowCount = inv.filter(f=>f.qty<=settings.low_stock_threshold).length;
  const filtered = useMemo(() => inv.filter(f => {
    const q = search.toLowerCase();
    return (!q||[f.pn,f.type,f.size,f.material,f.supplier,f.location,f.notes].some(v=>(v||"").toLowerCase().includes(q)))
      && (typeF==="All"||f.type===typeF)
      && (!lowOnly||f.qty<=settings.low_stock_threshold);
  }), [inv, search, typeF, lowOnly, settings.low_stock_threshold]);

  async function savePart(form) {
    const dbPayload = {
      pn:form.pn, type:form.type, size:form.size, qty:form.qty,
      material:form.material||"", supplier:form.supplier||"",
      location:form.location||"", notes:form.notes||"",
      photo:form._photo||""
    };
    try {
      if (modal === "add") {
        const [created] = await sb("/inventory", {method:"POST", body: JSON.stringify(dbPayload)});
        setInv(v=>[...v, created]);
        showToast(form.pn+" added");
      } else {
        dbPayload.updated_at = new Date().toISOString();
        const updated = await sb(`/inventory?id=eq.${modal.id}`, {method:"PATCH", body: JSON.stringify(dbPayload)});
        setInv(v=>v.map(x=>x.id===modal.id?{...x,...(updated?.[0]||dbPayload)}:x));
        showToast(form.pn+" updated");
      }
    } catch(e) { showToast("Save failed: "+e.message,"error"); }
    setModal(null);
  }

  async function adjustQty(id, d) {
    const f = inv.find(x=>x.id===id);
    const nq = Math.max(0, f.qty + d);
    setInv(v=>v.map(x=>x.id===id?{...x,qty:nq}:x));
    try { await sb(`/inventory?id=eq.${id}`, {method:"PATCH", body:JSON.stringify({qty:nq, updated_at:new Date().toISOString()})}); }
    catch(e) { showToast("Sync error","error"); }
  }

  async function deletePart(id) {
    const f = inv.find(x=>x.id===id);
    try {
      await sb(`/inventory?id=eq.${id}`, {method:"DELETE"});
      setInv(v=>v.filter(x=>x.id!==id));
      showToast((f?.pn||"Part")+" removed");
    } catch(e) { showToast("Delete failed","error"); }
  }

  async function saveDie(form) {
    try {
      if (modal === "addDie") {
        const payload = {
          name: form.name, customer: form.customer || "",
          part_number: form.part_number || "", press_size: form.press_size || "",
          notes: form.notes || "", parts: []
        };
        const [created] = await sb("/dies", {method:"POST", body: JSON.stringify(payload)});
        setDies(ds => [created, ...ds]);
        showToast("Die created: " + form.name);
      } else {
        const payload = {
          name: form.name, customer: form.customer || "",
          part_number: form.part_number || "", press_size: form.press_size || "",
          notes: form.notes || "", updated_at: new Date().toISOString()
        };
        const updated = await sb(`/dies?id=eq.${modal.id}`, {method:"PATCH", body: JSON.stringify(payload)});
        setDies(ds => ds.map(d => d.id === modal.id ? {...d, ...(updated?.[0] || payload)} : d));
        if (openDie && openDie.id === modal.id) setOpenDie({...openDie, ...payload});
        showToast("Die updated");
      }
    } catch(e) { showToast("Save failed: " + e.message, "error"); }
    setModal(null);
  }

  async function deleteDie(id) {
    try {
      await sb(`/dies?id=eq.${id}`, {method:"DELETE"});
      setDies(ds => ds.filter(d => d.id !== id));
      if (openDie && openDie.id === id) setOpenDie(null);
      showToast("Die removed");
    } catch(e) { showToast("Delete failed: " + e.message, "error"); }
  }

  async function addPartToDie(part, qty, notes) {
    try {
      const newParts = [...(openDie.parts||[]), {partId: part.id, qty, notes, added_at: new Date().toISOString()}];
      const payload = { parts: newParts, updated_at: new Date().toISOString() };
      await sb(`/dies?id=eq.${openDie.id}`, {method:"PATCH", body: JSON.stringify(payload)});
      setDies(ds => ds.map(d => d.id === openDie.id ? {...d, parts: newParts} : d));
      setOpenDie(od => ({...od, parts: newParts}));
      showToast(qty+"x "+part.pn+" added to die");
    } catch(e) { showToast("Save failed: " + e.message, "error"); }
    setModal(null);
  }

  async function removeDiePart(idx) {
    try {
      const newParts = (openDie.parts||[]).filter((_, i) => i !== idx);
      const payload = { parts: newParts, updated_at: new Date().toISOString() };
      await sb(`/dies?id=eq.${openDie.id}`, {method:"PATCH", body: JSON.stringify(payload)});
      setDies(ds => ds.map(d => d.id === openDie.id ? {...d, parts: newParts} : d));
      setOpenDie(od => ({...od, parts: newParts}));
      showToast("Part removed from die");
    } catch(e) { showToast("Update failed: " + e.message, "error"); }
  }

  async function handleSettingsSave(newSettings) {
    try {
      if (settingsId) {
        await sb(`/settings?id=eq.${settingsId}`, {method:"PATCH", body:JSON.stringify({...newSettings,updated_at:new Date().toISOString()})});
      } else {
        const [created] = await sb("/settings", {method:"POST", body:JSON.stringify(newSettings)});
        if (created) setSettingsId(created.id);
      }
      setSettings(newSettings);
      showToast("Settings saved");
    } catch(e) { showToast("Save failed","error"); }
    setModal(null);
  }

  function emailLowStock() {
    const lowItems = inv.filter(f=>f.qty<=settings.low_stock_threshold);
    if (lowItems.length===0) { showToast("No low stock","info"); return; }
    if (!settings.low_stock_email) { showToast("Set alert email in Settings","error"); return; }
    const body = "Low Stock Alert from "+settings.business_name+"\n\nParts at or below threshold ("+settings.low_stock_threshold+"):\n\n" +
      lowItems.map(f=>"- "+f.pn+" "+f.type+" "+f.size+": "+f.qty+" left"+(f.supplier?" (Supplier: "+f.supplier+")":"")+(f.location?" (Location: "+f.location+")":"")).join("\n");
    const subject = encodeURIComponent(settings.alert_email_subject + " - " + lowItems.length + " item(s)");
    window.location.href = "mailto:"+settings.low_stock_email+"?subject="+subject+"&body="+encodeURIComponent(body);
  }

  if (!loaded) return <div style={{minHeight:"100vh",background:P.bg,color:P.muted,fontFamily:"sans-serif",display:"flex",alignItems:"center",justifyContent:"center"}}>Loading...</div>;

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(180deg, ${P.bg} 0%, ${P.bgAlt} 100%)`,color:P.text,fontFamily:"'DM Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`input:focus,select:focus,textarea:focus{border-color:${P.accent}!important;box-shadow:0 0 0 3px rgba(249,115,22,.15)} button:hover:not(:disabled){filter:brightness(1.1)}`}</style>
      <Toast msg={toast} kind={toastKind}/>
      <PhotoViewer src={viewerPhoto} onClose={()=>setViewerPhoto(null)}/>
      <Drawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} currentPage={page} setPage={setPage} settings={settings} userEmail={session.user.email} onSettings={()=>setModal("settings")} onSignOut={onSignOut}/>

      {/* Header with hamburger */}
      <div style={{background:P.panel,borderBottom:`1px solid ${P.border}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:50}}>
        <button onClick={()=>setDrawerOpen(true)} style={{background:P.bgAlt,border:`1px solid ${P.border}`,borderRadius:8,padding:"9px 12px",cursor:"pointer",display:"flex",flexDirection:"column",gap:3,width:42,height:42,alignItems:"center",justifyContent:"center"}}>
          <span style={{width:18,height:2,background:P.accent,borderRadius:1}}/>
          <span style={{width:18,height:2,background:P.accent,borderRadius:1}}/>
          <span style={{width:18,height:2,background:P.accent,borderRadius:1}}/>
        </button>
        <DieLogo size={38}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Black Ops One', 'Rajdhani', sans-serif",fontWeight:900,fontSize:20,letterSpacing:".07em",color:P.white,lineHeight:1}}>DIEFITS</div>
          <div style={{fontSize:9,color:P.accent,letterSpacing:".15em",textTransform:"uppercase",marginTop:2,fontWeight:800}}>{page==="tutorial"?"How To Use":page==="dies"?"Die Catalog":"Inventory"}</div>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"18px 14px"}}>

        {/* TUTORIAL PAGE */}
        {page==="tutorial" && <TutorialPage/>}

        {/* INVENTORY PAGE */}
        {page==="inventory" && <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
            {[
              {l:"Parts",v:inv.length,c:P.white},
              {l:"Total Units",v:inv.reduce((a,f)=>a+(f.qty||0),0),c:P.white},
              {l:"Low Stock",v:lowCount,c:lowCount>0?P.yellow:P.white,w:lowCount>0}
            ].map(st=>(
              <div key={st.l} style={{background:`linear-gradient(135deg, ${P.panel}, ${P.panelHi})`,border:`1px solid ${st.w?"rgba(210,153,34,.5)":P.border}`,borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:24,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",color:st.c,lineHeight:1}}>{st.v}</div>
                <div style={{fontSize:9,color:P.muted,letterSpacing:".1em",textTransform:"uppercase",marginTop:3,fontWeight:800}}>{st.l}</div>
                {st.l==="Low Stock"&&lowCount>0&&settings.low_stock_email&&
                  <button onClick={emailLowStock} style={{marginTop:8,background:"rgba(249,115,22,.15)",border:`1px solid ${P.accent}`,borderRadius:5,padding:"4px 8px",fontSize:10,color:P.accentHi,cursor:"pointer",fontFamily:"inherit",fontWeight:700,letterSpacing:".05em",textTransform:"uppercase"}}>Email</button>}
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{...s.inp,flex:"1 1 150px",fontSize:13}}/>
            <select value={typeF} onChange={e=>setTypeF(e.target.value)} style={{...s.inp,width:"auto",fontSize:13}}>
              <option>All</option>{DEFAULT_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <GBtn onClick={()=>setLowOnly(v=>!v)} active={lowOnly} style={{padding:"9px 12px",fontSize:12}}>Low</GBtn>
            <PBtn onClick={()=>setModal("add")} style={{padding:"9px 16px",fontSize:13}}>+ Add Part</PBtn>
          </div>

          <div style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:12,overflow:"hidden"}}>
            {filtered.length===0 ? (
              <div style={{padding:40,textAlign:"center",color:P.mutedLo,fontSize:13}}>No parts. Click + Add Part to start.</div>
            ) : filtered.map((f,i)=>{
              const low = f.qty <= settings.low_stock_threshold;
              const photo = f.photo || "";
              return <div key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderBottom:i<filtered.length-1?`1px solid ${P.bg}`:"none"}}>
                <div onClick={()=>photo && setViewerPhoto(photo)}><Thumb src={photo} size={50}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,color:P.white,letterSpacing:".03em"}}>{f.pn}</span>
                    <span style={{fontSize:11,color:P.muted}}>{f.type}</span>
                    <span style={{fontSize:12,color:P.textDim,fontFamily:"'Rajdhani',sans-serif",fontWeight:600}}>{f.size}</span>
                  </div>
                  <div style={{fontSize:10,color:P.mutedLo,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {[f.material, f.supplier, f.location].filter(Boolean).join(" | ") || "-"}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <button onClick={()=>adjustQty(f.id,-1)} style={{width:26,height:26,borderRadius:5,border:`1px solid ${P.border}`,background:P.bgAlt,color:P.textDim,cursor:"pointer",fontSize:14,fontWeight:700,padding:0}}>-</button>
                  <span style={{fontSize:18,fontWeight:700,minWidth:28,textAlign:"center",color:low?P.yellow:P.white,fontFamily:"'Rajdhani',sans-serif"}}>{f.qty}</span>
                  <button onClick={()=>adjustQty(f.id,1)} style={{width:26,height:26,borderRadius:5,border:`1px solid ${P.border}`,background:P.bgAlt,color:P.textDim,cursor:"pointer",fontSize:14,fontWeight:700,padding:0}}>+</button>
                </div>
                <button onClick={()=>setModal(f)} style={{padding:"5px 10px",borderRadius:5,border:`1px solid ${P.border}`,background:P.bgAlt,color:P.textDim,cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:600}}>Edit</button>
              </div>;
            })}
          </div>
        </>}

        {/* DIES PAGE - LIST */}
        {page==="dies" && !openDie && <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,color:P.white,letterSpacing:".05em",textTransform:"uppercase"}}>Die Catalog</div>
              <div style={{fontSize:11,color:P.muted,marginTop:2}}>Track every part that goes into each die you build</div>
            </div>
            <PBtn onClick={()=>setModal("addDie")} style={{padding:"9px 16px",fontSize:13}}>+ New Die</PBtn>
          </div>
          {dies.length===0 ? (
            <div style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:12,padding:40,textAlign:"center",color:P.mutedLo,fontSize:13}}>
              No dies yet. Click "+ New Die" to catalog your first one.
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {dies.map(die => (
                <div key={die.id} onClick={()=>setOpenDie(die)} style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:11,padding:14,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:17,color:P.white,letterSpacing:".03em"}}>{die.name}</div>
                    <div style={{fontSize:11,color:P.muted,marginTop:3}}>{[die.customer, die.part_number].filter(Boolean).join(" . ")||"-"}</div>
                    <div style={{fontSize:10,color:P.mutedLo,marginTop:3}}>{(die.parts||[]).length} part{(die.parts||[]).length!==1?"s":""} cataloged</div>
                  </div>
                  <div style={{color:P.accentHi,fontSize:18,fontWeight:700}}>&gt;</div>
                </div>
              ))}
            </div>
          )}
        </>}

        {/* DIE DETAIL */}
        {page==="dies" && openDie && (() => {
          const dieParts = openDie.parts || [];
          const totalParts = dieParts.reduce((a,p)=>a+p.qty,0);
          return <>
            <button onClick={()=>setOpenDie(null)} style={{background:"transparent",border:"none",color:P.accentHi,cursor:"pointer",fontSize:13,fontFamily:"inherit",marginBottom:10,fontWeight:700}}>{"<"} Back to Dies</button>
            <div style={{background:`linear-gradient(135deg, ${P.panel}, ${P.panelHi})`,border:`1px solid ${P.border}`,borderRadius:12,padding:16,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
                <div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:24,color:P.white,letterSpacing:".03em"}}>{openDie.name}</div>
                  {(openDie.customer || openDie.part_number) && <div style={{fontSize:13,color:P.muted,marginTop:4}}>{[openDie.customer, openDie.part_number].filter(Boolean).join(" . ")}</div>}
                  {openDie.press_size && <div style={{fontSize:11,color:P.mutedLo,marginTop:3}}>{openDie.press_size}</div>}
                </div>
                <GBtn onClick={()=>setModal(openDie)} style={{padding:"7px 12px",fontSize:11}}>Edit</GBtn>
              </div>
              {openDie.notes && <div style={{marginTop:10,padding:10,background:P.bg,borderRadius:7,fontSize:12,color:P.textDim,whiteSpace:"pre-wrap"}}>{openDie.notes}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
                <div style={{background:P.bg,borderRadius:7,padding:10}}>
                  <div style={{fontSize:9,color:P.muted,fontWeight:800,letterSpacing:".07em"}}>UNIQUE PARTS</div>
                  <div style={{fontSize:20,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",color:P.white}}>{dieParts.length}</div>
                </div>
                <div style={{background:P.bg,borderRadius:7,padding:10}}>
                  <div style={{fontSize:9,color:P.muted,fontWeight:800,letterSpacing:".07em"}}>TOTAL PIECES</div>
                  <div style={{fontSize:20,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",color:P.accentHi}}>{totalParts}</div>
                </div>
              </div>
            </div>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,color:P.white,letterSpacing:".05em",textTransform:"uppercase"}}>Parts in this Die</div>
              <PBtn onClick={()=>setModal("addDiePart")} style={{padding:"7px 12px",fontSize:12}}>+ Add Part</PBtn>
            </div>

            {dieParts.length===0 ? (
              <div style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:12,padding:30,textAlign:"center",color:P.mutedLo,fontSize:13}}>
                No parts yet. Click "+ Add Part" to start cataloging this die.
              </div>
            ) : (
              <div style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:12,overflow:"hidden"}}>
                {dieParts.map((dp, idx) => {
                  const part = inv.find(x => x.id === dp.partId);
                  const photo = part?.photo || "";
                  return <div key={idx} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderBottom:idx<dieParts.length-1?`1px solid ${P.bg}`:"none"}}>
                    <div onClick={()=>photo && setViewerPhoto(photo)}><Thumb src={photo} size={44}/></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,color:P.white,letterSpacing:".03em"}}>{part?.pn || "(deleted part)"}</span>
                        {part && <span style={{fontSize:11,color:P.muted}}>{part.type} . {part.size}</span>}
                      </div>
                      {dp.notes && <div style={{fontSize:11,color:P.mutedLo,marginTop:3,fontStyle:"italic"}}>"{dp.notes}"</div>}
                    </div>
                    <div style={{fontSize:18,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",color:P.accentHi,minWidth:36,textAlign:"right"}}>x{dp.qty}</div>
                    <button onClick={()=>removeDiePart(idx)} style={{padding:"4px 8px",borderRadius:5,border:`1px solid ${P.border}`,background:"transparent",color:P.red,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>x</button>
                  </div>;
                })}
              </div>
            )}
          </>;
        })()}
      </div>

      {/* MODALS */}
      {modal==="settings"&&<Modal title="Settings" onClose={()=>setModal(null)}>
        <SettingsModal settings={settings} onSave={handleSettingsSave} onClose={()=>setModal(null)} userEmail={session.user.email}/>
      </Modal>}
      {modal==="add"&&<Modal title="Add New Part" onClose={()=>setModal(null)} wide>
        <PartForm onSave={savePart} onClose={()=>setModal(null)}/>
      </Modal>}
      {modal && typeof modal==="object" && modal.pn !== undefined && <Modal title={"Edit: "+modal.pn} onClose={()=>setModal(null)} wide>
        <PartForm initial={modal} onSave={savePart} onClose={()=>setModal(null)} onDelete={()=>{setDelItem({...modal,_kind:"part"});setModal(null);}}/>
      </Modal>}
      {modal==="addDie"&&<Modal title="New Die" onClose={()=>setModal(null)} wide>
        <DieForm onSave={saveDie} onClose={()=>setModal(null)}/>
      </Modal>}
      {modal && typeof modal==="object" && modal.name !== undefined && modal.parts !== undefined && <Modal title={"Edit: "+modal.name} onClose={()=>setModal(null)} wide>
        <DieForm initial={modal} onSave={saveDie} onClose={()=>setModal(null)} onDelete={()=>{setDelItem({...modal,_kind:"die"});setModal(null);}}/>
      </Modal>}
      {modal==="addDiePart"&&openDie&&<Modal title={"Add Part to: "+openDie.name} onClose={()=>setModal(null)} wide>
        <AddPartToDie inventory={inv} onAdd={addPartToDie} onClose={()=>setModal(null)}/>
      </Modal>}
      {delItem&&<Modal title="Confirm Delete" onClose={()=>setDelItem(null)}>
        <p style={{color:P.textDim,marginTop:0,fontSize:14,lineHeight:1.5}}>Remove <strong style={{color:P.white}}>{delItem.pn||delItem.name}</strong> permanently?</p>
        <div style={{display:"flex",gap:10}}>
          <GBtn onClick={()=>setDelItem(null)} style={{flex:1,padding:11}}>Cancel</GBtn>
          <DangerBtn onClick={()=>{
            if (delItem._kind === "part") deletePart(delItem.id);
            else if (delItem._kind === "die") deleteDie(delItem.id);
            setDelItem(null);
          }} style={{flex:1,padding:11}}>Delete</DangerBtn>
        </div>
      </Modal>}
    </div>
  );
}

// -- Root --
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
