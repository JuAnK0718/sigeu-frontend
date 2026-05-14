import { useState, useEffect } from 'react'
import { User, Lock, ArrowRight, LogOut, AlertTriangle, MapPin, CheckCircle, Trash2, Activity, Shield, Flame, Hospital, Navigation, Camera, Loader2, Eye, X, Image } from 'lucide-react'

const styles = `
  @keyframes siren-red {
    0%, 100% { opacity: 0.1; transform: scale(1) translate(-5%, -5%); }
    50% { opacity: 0.5; transform: scale(1.2) translate(5%, 5%); }
  }
  @keyframes siren-blue {
    0%, 100% { opacity: 0.5; transform: scale(1.2) translate(5%, 5%); }
    50% { opacity: 0.1; transform: scale(1) translate(-5%, -5%); }
  }
  .animate-siren-red { animation: siren-red 2s infinite ease-in-out; }
  .animate-siren-blue { animation: siren-blue 2s infinite ease-in-out; }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
`;

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('sigeu_user')
    return saved ? JSON.parse(saved) : null
  })
  
  const [view, setView] = useState(() => {
    return localStorage.getItem('sigeu_user') ? 'DASHBOARD' : 'LOGIN'
  })
  
  const [emergencies, setEmergencies] = useState([])
  const [loginData, setLoginData] = useState({ username: '', password: '' })
  const [loginRole, setLoginRole] = useState('CITIZEN')
  
  const [emergencyForm, setEmergencyForm] = useState({ 
    title: '', description: '', location: '', type: 'ACCIDENT', image: '' 
  })
  
  const [selectedEntities, setSelectedEntities] = useState(['POLICIA'])

  const [loginError, setLoginError] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)

  const API = 'https://sigeu-backend-production.up.railway.app/api'
  const AI_SERVICE_URL = 'https://sigeu-ai-service-production.up.railway.app/analizar'

  useEffect(() => {
    let intervalId;
    if (view === 'DASHBOARD' && user?.role !== 'CITIZEN') {
      const fetchEmergencies = async () => {
        try {
          const res = await fetch(`${API}/emergencies?target=${user.role}&t=${Date.now()}`, {
            method: 'GET', cache: 'no-store', headers: { 'Cache-Control': 'no-cache' }
          });
          if (res.ok) {
            const data = await res.json();
            setEmergencies(data);
          }
        } catch (error) {
          console.error(error);
        }
      };
      fetchEmergencies();
      intervalId = setInterval(fetchEmergencies, 3000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [view, user])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginData)
    })
    if (res.ok) { 
      const userData = await res.json()
      setUser(userData)
      localStorage.setItem('sigeu_user', JSON.stringify(userData))
      setView('DASHBOARD') 
    } else {
      const errorText = await res.text()
      setLoginError(errorText)
    }
  }

  const handleLogout = () => {
    setUser(null); localStorage.removeItem('sigeu_user'); setView('LOGIN'); setImagePreview(null);
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (selectedEntities.length === 0) {
      alert("Por favor selecciona al menos una entidad para enviar el reporte.");
      return;
    }

    let enviosExitosos = 0;

    for (const entidad of selectedEntities) {
      const res = await fetch(`${API}/emergencies`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...emergencyForm, targetEntity: entidad }) 
      });
      if (res.ok) enviosExitosos++;
    }

    if (enviosExitosos > 0) { 
      alert(`¡Éxito! Reporte enviado a ${enviosExitosos} entidad(es) diferente(s).`); 
      setEmergencyForm({ title: '', description: '', location: '', type: 'ACCIDENT', image: '' }) 
      setSelectedEntities(['POLICIA']) 
      setImagePreview(null)
    }
  }

  const updateStatus = async (id, newStatus) => {
    const res = await fetch(`${API}/emergencies/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus })
    })
    if (res.ok) {
      setEmergencies(emergencies.map(em => em.id === id ? { ...em, status: newStatus } : em))
    }
  }

  const deleteEmergency = async (id) => {
    if(!window.confirm("¿Confirmar eliminación?")) return;
    const res = await fetch(`${API}/emergencies/${id}`, { method: 'DELETE' })
    if (res.ok) { setEmergencies(emergencies.filter(em => em.id !== id)) }
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);
        setEmergencyForm(prev => ({ ...prev, location: `${lat}, ${lon}` }));
        setIsLocating(false);
      }, 
      () => {
        alert("No se pudo obtener la ubicación. Revisa los permisos.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  const handleImageCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setImagePreview(base64String);
      setIsAnalyzing(true);
      
      setEmergencyForm(prev => ({ 
        ...prev, 
        image: base64String, 
        description: "Conectando con la Inteligencia Artificial..." 
      }));

      try {
        const response = await fetch(AI_SERVICE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagen: base64String })
        });

        if (!response.ok) throw new Error("Error en el servidor de IA");

        const data = await response.json();
        const textoIA = data.descripcion;

        setEmergencyForm(prev => ({ 
          ...prev, 
          description: `[ANÁLISIS DE IA]: ${textoIA}` 
        }));

        const textoMayusculas = textoIA.toUpperCase();
        
        //  NUEVA LÓGICA: Detección de Falsa Alarma
        const esFalsaAlarma = 
          textoMayusculas.includes('NO ES NECESARIA') || 
          textoMayusculas.includes('NO SE DESCRIBE NINGUNA EMERGENCIA') ||
          textoMayusculas.includes('NINGUNA EMERGENCIA');

        if (esFalsaAlarma) {
          // Si es falsa alarma, vaciamos TODAS las casillas
          setSelectedEntities([]);
        } else {
          // Si no hay negación, buscamos las entidades como antes
          const entidadesRecomendadas = [];
          if (textoMayusculas.includes('POLICÍA') || textoMayusculas.includes('POLICIA')) {
            entidadesRecomendadas.push('POLICIA');
          }
          if (textoMayusculas.includes('BOMBERO') || textoMayusculas.includes('FUEGO') || textoMayusculas.includes('INCENDIO')) {
            entidadesRecomendadas.push('BOMBEROS');
          }
          if (textoMayusculas.includes('HOSPITAL') || textoMayusculas.includes('AMBULANCIA') || textoMayusculas.includes('MÉDICO') || textoMayusculas.includes('HERIDO')) {
            entidadesRecomendadas.push('HOSPITAL');
          }
          
          // Reemplazamos la selección con lo que encontró la IA
          setSelectedEntities(entidadesRecomendadas);
        }

      } catch (error) {
        console.error(error);
        setEmergencyForm(prev => ({ 
          ...prev, 
          description: "No se pudo contactar a la IA. Por favor, describe la emergencia manualmente." 
        }));
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  }

  const toggleEntity = (entidad) => {
    setSelectedEntities(prev => {
      if (prev.includes(entidad)) {
        return prev.filter(e => e !== entidad); 
      } else {
        return [...prev, entidad]; 
      }
    });
  }

  const getEntityTheme = (role) => {
    switch(role) {
      case 'POLICIA': return { bg: 'bg-[#031525]', text: 'text-white', accent: 'text-[#00ffff]', bgAccent: 'bg-[#00ffff]/10', icon: <Shield size={28}/>, title: 'Central de Policía' };
      case 'BOMBEROS': return { bg: 'bg-[#b91c1c]', text: 'text-white', accent: 'text-white', bgAccent: 'bg-white/10', icon: <Flame size={28}/>, title: 'Estación de Bomberos' };
      case 'HOSPITAL': return { bg: 'bg-[#064e3b]', text: 'text-white', accent: 'text-[#34d399]', bgAccent: 'bg-[#34d399]/10', icon: <Hospital size={28}/>, title: 'Red de Hospitales' };
      default: return { bg: 'bg-[#0f172a]', text: 'text-white', accent: 'text-blue-400', bgAccent: 'bg-blue-400/10', icon: <AlertTriangle size={28}/>, title: 'SIGEU Ciudadano' };
    }
  }

  if (view === 'LOGIN') {
    return (
      <>
        <style>{styles}</style>
        <div className="min-h-screen bg-[#030811] flex items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-[#0066ff] rounded-full mix-blend-screen blur-[100px] -translate-y-1/2 -translate-x-1/4 animate-siren-blue pointer-events-none"></div>
          <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-[#ff0000] rounded-full mix-blend-screen blur-[100px] -translate-y-1/2 translate-x-1/4 animate-siren-red pointer-events-none"></div>
          <div className="w-full max-w-sm bg-[#0d1525]/85 backdrop-blur-md rounded-[2rem] p-10 z-10 animate-fade-in-up border border-[#00ffff]/20 shadow-2xl text-white text-center">
            <div className="bg-[#ff0000] w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(255,0,0,0.4)]"><span className="text-3xl font-black italic">!</span></div>
            <h1 className="text-4xl font-black italic mb-1 tracking-tighter">SIGEU</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-60 mb-8 font-bold">Sistema de Gestión de Emergencias</p>
            <div className="flex gap-4 mb-8">
              <button onClick={() => setLoginRole('CITIZEN')} className={["flex-1 p-3 rounded-2xl border transition-all text-sm font-bold", loginRole === 'CITIZEN' ? "border-[#00ffff] bg-[#00ffff]/5" : "border-white/10 opacity-50"].join(" ")}>👤 Ciudadano</button>
              <button onClick={() => setLoginRole('ENTITY')} className={["flex-1 p-3 rounded-2xl border transition-all text-sm font-bold", loginRole === 'ENTITY' ? "border-[#00ffff] bg-[#00ffff]/5" : "border-white/10 opacity-50"].join(" ")}>🏛️ Entidad</button>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && <div className="text-red-400 text-xs font-bold">{loginError}</div>}
              <input type="text" placeholder="Usuario" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-[#00ffff]/50" onChange={e => setLoginData({...loginData, username: e.target.value})} required />
              <input type="password" placeholder="Contraseña" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-[#00ffff]/50" onChange={e => setLoginData({...loginData, password: e.target.value})} required />
              <button className="w-full bg-[#0066ff] p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30">INGRESAR AL SISTEMA <ArrowRight size={18}/></button>
            </form>
          </div>
        </div>
      </>
    )
  }

  const theme = getEntityTheme(user?.role);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <nav className={[theme.bg, theme.text, "p-5 shadow-lg flex justify-between items-center sticky top-0 z-50 transition-colors"].join(" ")}>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg">{theme.icon}</div>
          <div><h2 className="font-black text-lg italic leading-none">{theme.title}</h2><p className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-1">Gestión Integrada</p></div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 font-bold px-4 py-2 rounded-lg hover:bg-white/10 transition-all"><LogOut size={18} /> SALIR</button>
      </nav>

      <main className="max-w-5xl mx-auto p-6 md:p-8 animate-fade-in-up">
        {user?.role === 'CITIZEN' ? (
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-200">
            <h3 className="text-2xl font-black mb-1 italic">Emitir Alerta</h3>
            <p className="text-slate-400 text-sm mb-8 font-medium">Use la cámara para que la IA analice la escena.</p>
            <form onSubmit={handleSend} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <input type="text" placeholder="Asunto" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" value={emergencyForm.title} onChange={e => setEmergencyForm({...emergencyForm, title: e.target.value})} required />
                <div className="flex gap-2">
                  <input type="text" placeholder="Coordenadas GPS" className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" value={emergencyForm.location} onChange={e => setEmergencyForm({...emergencyForm, location: e.target.value})} required />
                  <button type="button" onClick={handleGetLocation} className="bg-slate-800 text-white p-4 rounded-xl hover:bg-slate-700 transition-all">{isLocating ? <Loader2 className="animate-spin" size={20}/> : <Navigation size={20}/>}</button>
                </div>
              </div>
              <div className="space-y-4">
                
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Análisis con IA</span>
                  <div className="flex gap-2">
                    <input type="file" accept="image/*" capture="environment" id="cameraInput" className="hidden" onChange={handleImageCapture} />
                    <label htmlFor="cameraInput" className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-xs font-black cursor-pointer flex items-center gap-2 hover:bg-blue-200 uppercase tracking-tighter transition-all shadow-sm">
                      {isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <Camera size={14}/>} {isAnalyzing ? '...' : 'Cámara'}
                    </label>

                    <input type="file" accept="image/*" id="galleryInput" className="hidden" onChange={handleImageCapture} />
                    <label htmlFor="galleryInput" className="bg-slate-100 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg text-xs font-black cursor-pointer flex items-center gap-2 hover:bg-slate-200 uppercase tracking-tighter transition-all shadow-sm">
                      {isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <Image size={14}/>} {isAnalyzing ? '...' : 'Galería'}
                    </label>
                  </div>
                </div>

                {imagePreview && <img src={imagePreview} className="w-full h-40 object-cover rounded-2xl border-2 border-blue-100 shadow-inner" alt="Evidencia" />}
                <textarea placeholder="Descripción del incidente..." className={["w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none transition-all", isAnalyzing ? "opacity-50 animate-pulse bg-blue-50" : ""].join(" ")} rows="4" value={emergencyForm.description} onChange={e => setEmergencyForm({...emergencyForm, description: e.target.value})} required disabled={isAnalyzing}></textarea>
              </div>

              <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex flex-col gap-3 justify-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entidades a Notificar:</span>
                  <div className="flex flex-col gap-2">
                    {['POLICIA', 'BOMBEROS', 'HOSPITAL'].map(ent => (
                      <label key={ent} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 transition-all shadow-sm">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 accent-blue-600 cursor-pointer"
                          checked={selectedEntities.includes(ent)}
                          onChange={() => toggleEntity(ent)}
                        />
                        <span className="font-bold text-sm text-slate-700">{ent === 'POLICIA' ? 'Policía Nacional' : (ent === 'BOMBEROS' ? 'Bomberos' : 'Hospital')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* NUEVO BOTÓN: Se desactiva y cambia de color si no hay entidades seleccionadas */}
                <button 
                  type="submit" 
                  disabled={selectedEntities.length === 0}
                  className={`w-full h-full min-h-[60px] text-white p-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transform transition-all uppercase italic ${
                    selectedEntities.length === 0 
                      ? 'bg-slate-300 cursor-not-allowed shadow-none text-slate-500' 
                      : 'bg-[#ff0000] shadow-red-500/30 hover:bg-red-700 active:scale-95'
                  }`}
                >
                  {selectedEntities.length === 0 ? 'FALSA ALARMA' : 'ENVIAR REPORTE'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <span className="font-bold text-slate-500 flex items-center gap-2 italic"> <Activity size={18} className="animate-pulse text-red-500"/> Incidentes en Tiempo Real</span>
              <span className={[theme.bg, "text-white px-4 py-1 rounded-full text-xs font-black"].join(" ")}>Total: {emergencies.length}</span>
            </div>
            <div className="grid gap-4">
              {emergencies.map(em => (
                <div key={em.id} className={["bg-white p-6 rounded-3xl shadow-sm border-l-[12px] border-slate-100 flex flex-col md:flex-row justify-between gap-6 transition-all relative overflow-hidden", em.status === 'RESOLVED' ? 'opacity-50' : '', em.status === 'IN_PROGRESS' ? 'border-orange-400' : (em.status === 'RESOLVED' ? 'border-slate-300' : 'border-red-600')].join(" ")}>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h4 className="font-black text-xl italic text-slate-900">{em.title}</h4>
                      <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{em.status === 'RESOLVED' ? 'RESUELTO' : (em.status === 'IN_PROGRESS' ? 'EN RUTA' : 'PENDIENTE')}</span>
                    </div>
                    <p className="text-slate-400 text-xs font-bold mb-3 flex items-center gap-1"><MapPin size={14} className="text-red-500"/> {em.location}</p>
                    <p className="text-slate-600 text-sm italic font-medium">"{em.description}"</p>
                    {em.image && (
                      <button onClick={() => setSelectedImage(em.image)} className="mt-4 flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-tighter hover:underline">
                        <Eye size={14}/> Ver Evidencia Fotográfica
                      </button>
                    )}
                  </div>
                  <div className="flex flex-row md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 min-w-[140px]">
                    {em.status !== 'RESOLVED' && (
                      <>
                        {em.status !== 'IN_PROGRESS' && <button onClick={() => updateStatus(em.id, 'IN_PROGRESS')} className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black shadow-md hover:bg-slate-800">ATENDER</button>}
                        <button onClick={() => updateStatus(em.id, 'RESOLVED')} className="bg-emerald-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black shadow-md hover:bg-emerald-700">RESOLVER</button>
                      </>
                    )}
                    <button onClick={() => deleteEmergency(em.id)} className="bg-white border border-slate-200 text-slate-400 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black hover:bg-red-50 hover:text-red-600">BORRAR</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {selectedImage && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-4 animate-fade-in-up" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-3xl w-full bg-white rounded-3xl p-2 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black transition-all"><X size={20}/></button>
            <img src={selectedImage} className="w-full h-auto max-h-[80vh] object-contain rounded-2xl" alt="Zoom" />
            <div className="p-4 text-center"><p className="text-xs font-black uppercase text-slate-400">Evidencia enviada por el ciudadano vía SIGEU IA</p></div>
          </div>
        </div>
      )}
    </div>
  )
}
export default App