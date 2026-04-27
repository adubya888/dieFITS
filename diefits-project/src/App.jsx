rue);
} catch (e) { showToast(“Load failed: “ + e.message, “error”); setLoaded(true); }
})();
}, []);

// Auto-sync inventory every 12 seconds (no jobs/job_parts requests = no failures)
useEffect(() => {
if (!loaded) return;
const iv = setInterval(async () => {
try { const i = await sb(”/inventory?select=*&order=id.asc”); if (i) setInv(i); }
catch(_) {}
}, 12000);
return () => clearInterval(iv);
}, [loaded]);

// Save dies to localStorage whenever they change
useEffect(() => { if (loaded) saveDies(dies); }, [dies, loaded]);

const lowCount = inv.filter(f=>f.qty<=settings.low_stock_threshold).length;
const filtered = useMemo(() => inv.filter(f => {
const q = search.toLowerCase();
return (!q||[f.pn,f.type,f.size,f.material,f.supplier,f.location,f.notes].some(v=>(v||””).toLowerCase().includes(q)))
&& (typeF===“All”||f.type===typeF)
&& (!lowOnly||f.qty<=settings.low_stock_threshold);
}), [inv, search, typeF, lowOnly, settings.low_stock_threshold]);

async function savePart(form) {
const photo = form._photo;
const dbPayload = {
pn:form.pn, type:form.type, size:form.size, qty:form.qty,
material:form.material||””, supplier:form.supplier||””,
location:form.location||””, notes:form.notes||””
};
try {
if (modal === “add”) {
const [created] = await sb(”/inventory”, {method:“POST”, body: JSON.stringify(dbPayload)});
if (photo) setPhoto(created.id, photo);
setInv(v=>[…v, created]);
showToast(form.pn+” added”);
} else {
dbPayload.updated_at = new Date().toISOString();
const updated = await sb(`/inventory?id=eq.${modal.id}`, {method:“PATCH”, body: JSON.stringify(dbPayload)});
setPhoto(modal.id, photo);
setInv(v=>v.map(x=>x.id===modal.id?{…x,…(updated?.[0]||dbPayload)}:x));
showToast(form.pn+” updated”);
}
} catch(e) { showToast(“Save failed: “+e.message,“error”); }
setModal(null);
}

async function adjustQty(id, d) {
const f = inv.find(x=>x.id===id);
const nq = Math.max(0, f.qty + d);
setInv(v=>v.map(x=>x.id===id?{…x,qty:nq}:x));
try { await sb(`/inventory?id=eq.${id}`, {method:“PATCH”, body:JSON.stringify({qty:nq, updated_at:new Date().toISOString()})}); }
catch(e) { showToast(“Sync error”,“error”); }
}

async function deletePart(id) {
const f = inv.find(x=>x.id===id);
try {
await sb(`/inventory?id=eq.${id}`, {method:“DELETE”});
setPhoto(id, “”);
setInv(v=>v.filter(x=>x.id!==id));
// Remove from any dies
setDies(ds => ds.map(d => ({…d, parts: d.parts.filter(p => p.partId !== id)})));
showToast((f?.pn||“Part”)+” removed”);
} catch(e) { showToast(“Delete failed”,“error”); }
}

function saveDie(form) {
const now = new Date().toISOString();
if (modal === “addDie”) {
const newDie = {
id: Date.now(),
…form, parts: [],
created_at: now, updated_at: now
};
setDies(ds => [newDie, …ds]);
showToast(“Die created: “ + form.name);
} else {
setDies(ds => ds.map(d => d.id === modal.id ? {…d, …form, updated_at: now} : d));
if (openDie && openDie.id === modal.id) setOpenDie({…openDie, …form});
showToast(“Die updated”);
}
setModal(null);
}

function deleteDie(id) {
setDies(ds => ds.filter(d => d.id !== id));
if (openDie && openDie.id === id) setOpenDie(null);
showToast(“Die removed”);
}

function addPartToDie(part, qty, notes) {
setDies(ds => ds.map(d => d.id === openDie.id
? {…d, parts: […d.parts, {partId: part.id, qty, notes, added_at: new Date().toISOString()}], updated_at: new Date().toISOString()}
: d
));
setOpenDie(od => ({…od, parts: […od.parts, {partId: part.id, qty, notes}]}));
showToast(`${qty}x ${part.pn} added to die`);
setModal(null);
}

function removeDiePart(idx) {
setDies(ds => ds.map(d => d.id === openDie.id
? {…d, parts: d.parts.filter((*, i) => i !== idx), updated_at: new Date().toISOString()}
: d
));
setOpenDie(od => ({…od, parts: od.parts.filter((*, i) => i !== idx)}));
showToast(“Part removed from die”);
}

async function handleSettingsSave(newSettings) {
try {
if (settingsId) {
await sb(`/settings?id=eq.${settingsId}`, {method:“PATCH”, body:JSON.stringify({…newSettings,updated_at:new Date().toISOString()})});
} else {
const [created] = await sb(”/settings”, {method:“POST”, body:JSON.stringify(newSettings)});
if (created) setSettingsId(created.id);
}
setSettings(newSettings);
showToast(“Settings saved”);
} catch(e) { showToast(“Save failed”,“error”); }
setModal(null);
}

function emailLowStock() {
const lowItems = inv.filter(f=>f.qty<=settings.low_stock_threshold);
if (lowItems.length===0) { showToast(“No low stock”,“info”); return; }
if (!settings.low_stock_email) { showToast(“Set alert email in Settings”,“error”); return; }
const body = `Low Stock Alert from ${settings.business_name}\n\nParts at or below threshold (${settings.low_stock_threshold}):\n\n` +
lowItems.map(f=>`- ${f.pn} ${f.type} ${f.size}: ${f.qty} left${f.supplier?` (Supplier: ${f.supplier})`:""}${f.location?` (Location: ${f.location})`:""}`).join(”\n”);
const subject = encodeURIComponent(settings.alert_email_subject + “ - “ + lowItems.length + “ item(s)”);
window.location.href = `mailto:${settings.low_stock_email}?subject=${subject}&body=${encodeURIComponent(body)}`;
}

if (!loaded) return <div style={{minHeight:“100vh”,background:P.bg,color:P.muted,fontFamily:“sans-serif”,display:“flex”,alignItems:“center”,justifyContent:“center”}}>Loading…</div>;

return (
<div style={{minHeight:“100vh”,background:`linear-gradient(180deg, ${P.bg} 0%, ${P.bgAlt} 100%)`,color:P.text,fontFamily:”‘DM Sans’,sans-serif”}}>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>{`input:focus,select:focus,textarea:focus{border-color:${P.accent}!important;box-shadow:0 0 0 3px rgba(74,143,219,.15)} button:hover:not(:disabled){filter:brightness(1.1)}`}</style>
<Toast msg={toast} kind={toastKind}/>
<PhotoViewer src={viewerPhoto} onClose={()=>setViewerPhoto(null)}/>

```
  {/* Header */}
  <div style={{background:P.panel,borderBottom:`1px solid ${P.border}`,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:38,height:38,borderRadius:9,background:`linear-gradient(135deg,${P.accent},${P.accentHi})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:P.white,fontWeight:700}}>D</div>
      <div>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,letterSpacing:".07em",color:P.white,lineHeight:1}}>{settings.business_name||"DIEFITS"}</div>
        <div style={{fontSize:9,color:P.muted,letterSpacing:".1em",textTransform:"uppercase",marginTop:2,fontWeight:600}}>{session.user.email}</div>
      </div>
    </div>
    <GBtn onClick={()=>setModal("settings")} style={{padding:"7px 11px",fontSize:11}}>Settings</GBtn>
  </div>

  {/* Tab bar */}
  <div style={{background:P.panel,borderBottom:`1px solid ${P.border}`,padding:"0 12px",display:"flex",gap:2,overflowX:"auto"}}>
    {[
      {id:"inventory",label:"Inventory",count:inv.length},
      {id:"dies",label:"Dies",count:dies.length},
    ].map(t => (
      <button key={t.id} onClick={()=>{setTab(t.id);setOpenDie(null);}} style={{
        background:"transparent",border:"none",padding:"13px 18px",color:tab===t.id?P.accentHi:P.muted,
        borderBottom:`3px solid ${tab===t.id?P.accent:"transparent"}`,cursor:"pointer",fontFamily:"inherit",
        fontWeight:600,fontSize:13,whiteSpace:"nowrap"
      }}>{t.label} ({t.count})</button>
    ))}
  </div>

  <div style={{maxWidth:1100,margin:"0 auto",padding:"18px 14px"}}>

    {/* INVENTORY TAB */}
    {tab==="inventory" && <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
        {[
          {l:"Parts",v:inv.length,c:P.white},
          {l:"Total Units",v:inv.reduce((a,f)=>a+(f.qty||0),0),c:P.white},
          {l:"Low Stock",v:lowCount,c:lowCount>0?P.yellow:P.white,w:lowCount>0}
        ].map(st=>(
          <div key={st.l} style={{background:`linear-gradient(135deg, ${P.panel}, ${P.panelHi})`,border:`1px solid ${st.w?"rgba(250,204,21,.4)":P.border}`,borderRadius:10,padding:"12px 14px"}}>
            <div style={{fontSize:24,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",color:st.c,lineHeight:1}}>{st.v}</div>
            <div style={{fontSize:9,color:P.muted,letterSpacing:".1em",textTransform:"uppercase",marginTop:3,fontWeight:700}}>{st.l}</div>
            {st.l==="Low Stock"&&lowCount>0&&settings.low_stock_email&&
              <button onClick={emailLowStock} style={{marginTop:8,background:"rgba(74,143,219,.15)",border:`1px solid ${P.accent}`,borderRadius:5,padding:"4px 8px",fontSize:10,color:P.accentHi,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Email</button>}
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
          const photo = getPhoto(f.id);
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

    {/* DIES TAB - LIST */}
    {tab==="dies" && !openDie && <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,color:P.white}}>Die Catalog</div>
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
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,color:P.white}}>{die.name}</div>
                <div style={{fontSize:11,color:P.muted,marginTop:3}}>{[die.customer, die.part_number].filter(Boolean).join(" | ")||"-"}</div>
                <div style={{fontSize:10,color:P.mutedLo,marginTop:3}}>{die.parts.length} part{die.parts.length!==1?"s":""} cataloged</div>
              </div>
              <div style={{color:P.accentHi,fontSize:18}}>{"\u2192"}</div>
            </div>
          ))}
        </div>
      )}
    </>}

    {/* DIE DETAIL */}
    {tab==="dies" && openDie && (() => {
      const totalParts = openDie.parts.reduce((a,p)=>a+p.qty,0);
      return <>
        <button onClick={()=>setOpenDie(null)} style={{background:"transparent",border:"none",color:P.accentHi,cursor:"pointer",fontSize:13,fontFamily:"inherit",marginBottom:10}}>{"\u2190 Back to Dies"}</button>
        <div style={{background:`linear-gradient(135deg, ${P.panel}, ${P.panelHi})`,border:`1px solid ${P.border}`,borderRadius:12,padding:16,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
            <div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,color:P.white}}>{openDie.name}</div>
              {(openDie.customer || openDie.part_number) && <div style={{fontSize:12,color:P.muted,marginTop:4}}>{[openDie.customer, openDie.part_number].filter(Boolean).join(" | ")}</div>}
              {openDie.press_size && <div style={{fontSize:11,color:P.mutedLo,marginTop:3}}>{openDie.press_size}</div>}
            </div>
            <GBtn onClick={()=>setModal(openDie)} style={{padding:"7px 12px",fontSize:11}}>Edit</GBtn>
          </div>
          {openDie.notes && <div style={{marginTop:10,padding:10,background:P.bg,borderRadius:7,fontSize:12,color:P.textDim,whiteSpace:"pre-wrap"}}>{openDie.notes}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
            <div style={{background:P.bg,borderRadius:7,padding:10}}>
              <div style={{fontSize:9,color:P.muted,fontWeight:700,letterSpacing:".07em"}}>UNIQUE PARTS</div>
              <div style={{fontSize:20,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",color:P.white}}>{openDie.parts.length}</div>
            </div>
            <div style={{background:P.bg,borderRadius:7,padding:10}}>
              <div style={{fontSize:9,color:P.muted,fontWeight:700,letterSpacing:".07em"}}>TOTAL PIECES</div>
              <div style={{fontSize:20,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",color:P.accentHi}}>{totalParts}</div>
            </div>
          </div>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,color:P.white}}>Parts in this Die</div>
          <PBtn onClick={()=>setModal("addDiePart")} style={{padding:"7px 12px",fontSize:12}}>+ Add Part</PBtn>
        </div>

        {openDie.parts.length===0 ? (
          <div style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:12,padding:30,textAlign:"center",color:P.mutedLo,fontSize:13}}>
            No parts yet. Click "+ Add Part" to start cataloging this die.
          </div>
        ) : (
          <div style={{background:P.panel,border:`1px solid ${P.border}`,borderRadius:12,overflow:"hidden"}}>
            {openDie.parts.map((dp, idx) => {
              const part = inv.find(x => x.id === dp.partId);
              const photo = part ? getPhoto(part.id) : "";
              return <div key={idx} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderBottom:idx<openDie.parts.length-1?`1px solid ${P.bg}`:"none"}}>
                <div onClick={()=>photo && setViewerPhoto(photo)}><Thumb src={photo} size={44}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,color:P.white}}>{part?.pn || "(deleted part)"}</span>
                    {part && <span style={{fontSize:11,color:P.muted}}>{part.type} | {part.size}</span>}
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
    <SettingsModal settings={settings} onSave={handleSettingsSave} onClose={()=>setModal(null)} onSignOut={onSignOut} userEmail={session.user.email}/>
  </Modal>}
  {modal==="add"&&<Modal title="Add New Part" onClose={()=>setModal(null)} wide>
    <PartForm onSave={savePart} onClose={()=>setModal(null)}/>
  </Modal>}
  {modal && typeof modal==="object" && modal.pn !== undefined && <Modal title={`Edit: ${modal.pn}`} onClose={()=>setModal(null)} wide>
    <PartForm initial={modal} onSave={savePart} onClose={()=>setModal(null)} onDelete={()=>{setDelItem({...modal,_kind:"part"});setModal(null);}}/>
  </Modal>}
  {modal==="addDie"&&<Modal title="New Die" onClose={()=>setModal(null)} wide>
    <DieForm onSave={saveDie} onClose={()=>setModal(null)}/>
  </Modal>}
  {modal && typeof modal==="object" && modal.name !== undefined && modal.parts !== undefined && <Modal title={`Edit: ${modal.name}`} onClose={()=>setModal(null)} wide>
    <DieForm initial={modal} onSave={saveDie} onClose={()=>setModal(null)} onDelete={()=>{setDelItem({...modal,_kind:"die"});setModal(null);}}/>
  </Modal>}
  {modal==="addDiePart"&&openDie&&<Modal title={`Add Part to: ${openDie.name}`} onClose={()=>setModal(null)} wide>
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
```

);
}

// – Root ––––––––––––––––––––––––––––––––––
export default function App() {
const [session, setSession] = useState(null);
const [checking, setChecking] = useState(true);

useEffect(() => {
const token = localStorage.getItem(“diefits_token”);
const userJson = localStorage.getItem(“diefits_user”);
if (token && userJson) {
try { setSession({ token, user: JSON.parse(userJson) }); } catch(_) {}
}
setChecking(false);
}, []);

function handleLogin({ token, user }) { setSession({ token, user }); }
function handleSignOut() {
localStorage.removeItem(“diefits_token”);
localStorage.removeItem(“diefits_user”);
setSession(null);
}

if (checking) return null;
if (!session) return <LoginScreen onLogin={handleLogin}/>;
return <MainApp session={session} onSignOut={handleSignOut}/>;
}
