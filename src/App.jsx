import { useState, useEffect } from 'react'
import { User, Lock, ArrowRight, LogOut, AlertTriangle, MapPin, CheckCircle, Activity, Shield, Flame, Hospital, Navigation, Camera, Loader2, Eye, X, Image, ArrowLeft, Moon, Sun } from 'lucide-react'

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

const parseEmergencyCoordinates = (location) => {
  const matches = String(location || '').match(/-?\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length < 2) return null;

  const [lat, lng] = matches.slice(0, 2).map(value => Number(value.replace(',', '.')));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

const getIncidentMapEmbedUrl = ({ lat, lng }) => {
  const margin = 0.006;
  const bbox = `${lng - margin},${lat - margin},${lng + margin},${lat + margin}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
}

const getIncidentMapUrl = ({ lat, lng }) => {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

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
  const [registerData, setRegisterData] = useState({ username: '', password: '', role: 'CITIZEN' })
  const [recoverData, setRecoverData] = useState({ username: '' })
  
  const [loginRole, setLoginRole] = useState('CITIZEN')
  
  
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [formErrors, setFormErrors] = useState({});
  const [emergencyForm, setEmergencyForm] = useState({ 
    title: '', description: '', location: '', type: 'ACCIDENT', image: '' 
  })
  const [selectedEntities, setSelectedEntities] = useState(['POLICIA'])
  const [citizenMode, setCitizenMode] = useState(() => localStorage.getItem('sigeu_citizen_mode') || 'light')

  const [isLocating, setIsLocating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)

  const API = 'https://sigeu-backend-production.up.railway.app/api'
  const AI_SERVICE_URL = 'https://sigeu-ai-service-production.up.railway.app/analizar'

  
  useEffect(() => {
    setAuthError('')
    setAuthSuccess('')
  }, [view])

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
    setAuthError('')
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginData)
      })
      if (res.ok) { 
        const userData = await res.json()
        const esCiudadanoBD = userData.role === 'CITIZEN';
        const seleccionCiudadano = loginRole === 'CITIZEN';

        if (seleccionCiudadano && !esCiudadanoBD) {
          setAuthError('Estas credenciales son de Entidad. Selecciona Entidad.');
          return;
        }
        if (!seleccionCiudadano && esCiudadanoBD) {
          setAuthError('Estas credenciales son de Ciudadano. Selecciona Ciudadano.');
          return;
        }

        setUser(userData)
        localStorage.setItem('sigeu_user', JSON.stringify(userData))
        setView('DASHBOARD') 
      } else {
        const errorText = await res.text()
        setAuthError(errorText || 'Error en las credenciales')
      }
    } catch (err) {
      setAuthError('Error de conexión con el servidor')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setAuthError('')
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registerData)
      })
      if (res.ok) {
        setAuthSuccess('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.')
        setTimeout(() => setView('LOGIN'), 2000)
      } else {
        const errorText = await res.text()
        setAuthError(errorText || 'Error al crear la cuenta. El usuario podría ya existir.')
      }
    } catch (err) {
      setAuthError('Error de conexión con el servidor')
    }
  }

  const handleRecover = async (e) => {
    e.preventDefault()
    setAuthError('')
    try {
      // Nota: En la vida real esto envía un correo. Aquí haremos que el backend reinicie la clave o mande un aviso.
      const res = await fetch(`${API}/auth/recover`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(recoverData)
      })
      if (res.ok) {
        setAuthSuccess('Instrucciones de recuperación enviadas. (Revisa tu base de datos o consola)')
      } else {
        const errorText = await res.text()
        setAuthError(errorText || 'Usuario no encontrado')
      }
    } catch (err) {
      setAuthError('Error de conexión con el servidor')
    }
  }

  const handleLogout = () => {
    setUser(null); localStorage.removeItem('sigeu_user'); setView('LOGIN'); setImagePreview(null);
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (selectedEntities.length === 0) return;
    let enviosExitosos = 0;
    for (const entidad of selectedEntities) {
      const res = await fetch(`${API}/emergencies`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...emergencyForm, targetEntity: entidad }) 
      });
      if (res.ok) enviosExitosos++;
    }
    if (enviosExitosos > 0) { 
      alert(`¡Éxito! Reporte enviado a ${enviosExitosos} entidad(es).`); 
      setEmergencyForm({ title: '', description: '', location: '', type: 'ACCIDENT', image: '' }); setSelectedEntities(['POLICIA']); setImagePreview(null)
    }
  }

  const updateStatus = async (id, newStatus) => {
    const res = await fetch(`${API}/emergencies/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus })
    })
    if (res.ok) setEmergencies(emergencies.map(em => em.id === id ? { ...em, status: newStatus } : em))
  }

  const deleteEmergency = async (id) => {
    if(!window.confirm("¿Confirmar eliminación?")) return;
    const res = await fetch(`${API}/emergencies/${id}`, { method: 'DELETE' })
    if (res.ok) setEmergencies(emergencies.filter(em => em.id !== id))
  }

  const GEO_ERROR = { PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }

  const getLocationErrorMessage = (error) => {
    if (!window.isSecureContext) {
      return "La ubicacion automatica necesita HTTPS. En iPhone no funciona si abres la app por http o por una IP local sin certificado.";
    }

    if (!error) return "No se pudo obtener la ubicacion.";

    switch (error.code) {
      case GEO_ERROR.PERMISSION_DENIED:
        return "";
      case GEO_ERROR.POSITION_UNAVAILABLE:
        return "El iPhone no pudo calcular la ubicacion. Activa Localizacion y prueba con buena senal GPS o WiFi.";
      case GEO_ERROR.TIMEOUT:
        return "El iPhone tardo demasiado en responder la ubicacion. Intentalo de nuevo en unos segundos.";
      default:
        return "No se pudo obtener la ubicacion.";
    }
  }

  const getCurrentLocation = (options) => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  const handleGetLocation = async () => {
    if (!window.isSecureContext) {
      alert(getLocationErrorMessage());
      return;
    }

    if (!navigator.geolocation) {
      alert("Este navegador no permite obtener ubicacion automatica.");
      return;
    }

    setIsLocating(true);
    try {
      let pos;
      try {
        pos = await getCurrentLocation({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      } catch (error) {
        const canRetry = error.code === GEO_ERROR.TIMEOUT || error.code === GEO_ERROR.POSITION_UNAVAILABLE;
        if (!canRetry) throw error;
        pos = await getCurrentLocation({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
      }

      setEmergencyForm(prev => ({
        ...prev,
        location: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`
      }));
    } catch (error) {
      const message = getLocationErrorMessage(error);
      if (message) alert(message);
    } finally {
      setIsLocating(false);
    }
  }

  const handleImageCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setImagePreview(base64String);
      setIsAnalyzing(true);
      setEmergencyForm(prev => ({ ...prev, image: base64String, description: "Conectando con la IA..." }));
      try {
        const response = await fetch(AI_SERVICE_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imagen: base64String })
        });
        if (!response.ok) throw new Error("Error IA");
        const data = await response.json();
        const textoIA = data.descripcion;
        setEmergencyForm(prev => ({ ...prev, description: `[ANÁLISIS DE IA]: ${textoIA}` }));
        const textoMayusculas = textoIA.toUpperCase();
        if (textoMayusculas.includes('NO ES NECESARIA') || textoMayusculas.includes('NINGUNA EMERGENCIA')) {
          setSelectedEntities([]);
        } else {
          const recomendadas = [];
          if (textoMayusculas.includes('POLICÍA') || textoMayusculas.includes('POLICIA')) recomendadas.push('POLICIA');
          if (textoMayusculas.includes('BOMBERO') || textoMayusculas.includes('FUEGO') || textoMayusculas.includes('INCENDIO')) recomendadas.push('BOMBEROS');
          if (textoMayusculas.includes('HOSPITAL') || textoMayusculas.includes('AMBULANCIA') || textoMayusculas.includes('MÉDICO') || textoMayusculas.includes('HERIDO')) recomendadas.push('HOSPITAL');
          setSelectedEntities(recomendadas);
        }
      } catch (error) {
        setEmergencyForm(prev => ({ ...prev, description: "Error IA. Describe manualmente." }));
      } finally { setIsAnalyzing(false); }
    };
    reader.readAsDataURL(file);
  }

  const toggleEntity = (ent) => setSelectedEntities(prev => prev.includes(ent) ? prev.filter(e => e !== ent) : [...prev, ent])

  const toggleCitizenMode = () => {
    const nextMode = citizenMode === 'dark' ? 'light' : 'dark';
    setCitizenMode(nextMode);
    localStorage.setItem('sigeu_citizen_mode', nextMode);
  }

  const getEntityTheme = (role) => {
    switch(role) {
      case 'POLICIA': return { bg: 'bg-[#031525]', text: 'text-white', icon: <Shield size={28}/>, title: 'Central de Policía' };
      case 'BOMBEROS': return { bg: 'bg-[#b91c1c]', text: 'text-white', icon: <Flame size={28}/>, title: 'Estación de Bomberos' };
      case 'HOSPITAL': return { bg: 'bg-[#064e3b]', text: 'text-white', icon: <Hospital size={28}/>, title: 'Red de Hospitales' };
      default: return { bg: 'bg-[#0f172a]', text: 'text-white', icon: <AlertTriangle size={28}/>, title: 'SIGEU Ciudadano' };
    }
  }

  if (view === 'LOGIN' || view === 'REGISTER' || view === 'RECOVER') {
    return (
      <>
        <style>{styles}</style>
        <div className="min-h-screen bg-[#020610] relative overflow-hidden font-sans text-white">
          <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-blue-600 rounded-full mix-blend-screen blur-[120px] -translate-y-1/2 -translate-x-1/3 animate-siren-blue pointer-events-none opacity-60"></div>
          <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-red-600 rounded-full mix-blend-screen blur-[120px] -translate-y-1/2 translate-x-1/3 animate-siren-red pointer-events-none opacity-60"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,rgba(2,6,16,0)_0%,rgba(2,6,16,0.95)_100%)] pointer-events-none"></div>

          <nav className="relative z-10 max-w-7xl mx-auto px-5 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#ff0000] w-11 h-11 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(255,0,0,0.6)]">
                <span className="text-3xl font-black italic text-white">!</span>
              </div>
              <div>
                <h1 className="text-2xl font-black italic leading-none">SIGEU</h1>
                <p className="text-[10px] uppercase tracking-[.28em] text-cyan-200/80 font-bold">Sistema de Gestion</p>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-200/85">
              <span>Plataforma</span>
              <span>Alertas IA</span>
              <span>Entidades</span>
              <span>Soporte</span>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <button type="button" onClick={() => setView('LOGIN')} className={["px-5 py-2.5 rounded-xl border text-sm font-bold transition-all shadow-sm", view === 'REGISTER' ? "border-white/25 text-slate-200 hover:bg-white/10 hover:text-white" : "border-cyan-300/50 bg-cyan-300/10 text-white shadow-cyan-950/40"].join(" ")}>Iniciar sesion</button>
              <button type="button" onClick={() => setView('REGISTER')} className={["px-5 py-2.5 rounded-xl border text-sm font-bold transition-all shadow-sm", view === 'REGISTER' ? "border-cyan-300/50 bg-cyan-300/10 text-white shadow-cyan-950/40" : "border-white/25 text-slate-200 hover:bg-white/10 hover:text-white"].join(" ")}>Inscribete</button>
            </div>
          </nav>

          <main className="relative z-10 max-w-7xl mx-auto px-5 pb-10 pt-4 md:pt-10 grid lg:grid-cols-[1.1fr_460px] gap-10 items-center min-h-[calc(100vh-92px)]">
            <section className="animate-fade-in-up text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 text-xs font-black uppercase mb-7">
                <AlertTriangle size={14}/> Respuesta ciudadana en tiempo real
              </div>
              <h2 className="text-4xl md:text-6xl xl:text-7xl font-black leading-[1.02] tracking-normal max-w-4xl">
                Reporta emergencias y coordina ayuda con SIGEU IA.
              </h2>
              <p className="mt-6 text-base md:text-xl text-slate-200/80 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Una plataforma para que ciudadanos, policia, bomberos y hospitales gestionen incidentes desde una sola central.
              </p>
              <div className="mt-9 grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto lg:mx-0">
                <div className="border border-white/10 bg-white/[0.06] rounded-2xl p-4 text-left">
                  <Shield size={22} className="text-cyan-300 mb-3"/>
                  <p className="text-sm font-black">Triaje automatico</p>
                  <p className="text-xs text-slate-300 mt-1">La IA ayuda a priorizar la escena.</p>
                </div>
                <div className="border border-white/10 bg-white/[0.06] rounded-2xl p-4 text-left">
                  <MapPin size={22} className="text-cyan-300 mb-3"/>
                  <p className="text-sm font-black">Ubicacion GPS</p>
                  <p className="text-xs text-slate-300 mt-1">Coordenadas listas para operar.</p>
                </div>
                <div className="border border-white/10 bg-white/[0.06] rounded-2xl p-4 text-left">
                  <Camera size={22} className="text-cyan-300 mb-3"/>
                  <p className="text-sm font-black">Evidencia visual</p>
                  <p className="text-xs text-slate-300 mt-1">Imagenes para cada entidad.</p>
                </div>
              </div>
            </section>

            <div className="w-full max-w-md mx-auto bg-[#091120]/90 backdrop-blur-xl rounded-[2rem] p-7 md:p-9 z-10 animate-fade-in-up border border-white/10 shadow-2xl text-center shadow-black/50">
            <div className="bg-[#ff0000] w-14 h-14 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_25px_rgba(255,0,0,0.5)]"><span className="text-4xl font-black italic text-white">!</span></div>
            <h1 className="text-5xl font-black italic mb-1 tracking-normal text-white">SIGEU</h1>
            <p className="text-xs uppercase tracking-[.3em] opacity-80 mb-8 font-semibold text-cyan-200">
              {view === 'LOGIN' ? 'Sistema de Gestion' : view === 'REGISTER' ? 'Nuevo Registro' : 'Recuperacion'}
            </p>

            {authError && <div className="text-red-400 text-xs font-bold bg-red-950/40 p-3 rounded-xl border border-red-900 mb-4">{authError}</div>}
            {authSuccess && <div className="text-emerald-400 text-xs font-bold bg-emerald-950/40 p-3 rounded-xl border border-emerald-900 mb-4">{authSuccess}</div>}

            {view === 'LOGIN' && (
              <>
                <div className="flex gap-4 mb-8">
                  <button type="button" onClick={() => setLoginRole('CITIZEN')} className={["flex-1 p-4 rounded-xl border transition-all text-base font-bold flex items-center justify-center gap-2", loginRole === 'CITIZEN' ? "border-cyan-400 bg-cyan-950 text-white shadow-md shadow-cyan-950" : "border-white/5 opacity-50 text-slate-400"].join(" ")}><User size={18}/> Ciudadano</button>
                  <button type="button" onClick={() => setLoginRole('ENTITY')} className={["flex-1 p-4 rounded-xl border transition-all text-base font-bold flex items-center justify-center gap-2", loginRole === 'ENTITY' ? "border-cyan-400 bg-cyan-950 text-white shadow-md shadow-cyan-950" : "border-white/5 opacity-50 text-slate-400"].join(" ")}><Shield size={18}/> Entidad</button>
                </div>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="relative">
                    <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input type="text" placeholder="Usuario" className="w-full bg-white/5 border border-white/10 py-5 pl-12 pr-5 rounded-2xl outline-none focus:border-cyan-400 focus:bg-white/[0.08] text-white text-base" onChange={e => setLoginData({...loginData, username: e.target.value})} required />
                  </div>
                  <div className="relative">
                    <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input type="password" placeholder="Contrasena" className="w-full bg-white/5 border border-white/10 py-5 pl-12 pr-5 rounded-2xl outline-none focus:border-cyan-400 focus:bg-white/[0.08] text-white text-base" onChange={e => setLoginData({...loginData, password: e.target.value})} required />
                  </div>
                  <button type="submit" className="w-full h-16 bg-cyan-600 p-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-3 shadow-lg hover:bg-cyan-500 transform active:scale-95 transition-all shadow-cyan-950">
                    INGRESAR <ArrowRight size={22}/>
                  </button>
                  <button type="button" onClick={() => setView('RECOVER')} className="text-cyan-400 text-sm hover:underline block mt-4 transition-all w-full text-center">Olvidaste la contrasena?</button>
                  <div className="border-t border-white/5 mt-8 pt-8">
                    <button type="button" onClick={() => setView('REGISTER')} className="w-full h-14 border border-cyan-400 text-cyan-400 hover:bg-cyan-950 p-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transform active:scale-95 transition-all shadow-md">
                      Crear una cuenta
                    </button>
                  </div>
                </form>
                <div className="mt-8 text-center px-2">
                  <p className="text-slate-400 text-xs font-medium leading-relaxed italic">
                    <span className="text-cyan-400 font-bold">SIGEU IA:</span> Reporte ciudadano con analisis visual, triaje automatico y coordinacion de entidades de socorro.
                  </p>
                </div>
              </>
            )}

            {view === 'REGISTER' && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const errors = {};
                
                const usernameRegex = /^[a-z0-9_]{4,15}$/;
                if (!usernameRegex.test(registerData.username)) {
                  errors.username = "Usa 4-15 caracteres (solo minúsculas, números o guión bajo).";
                }

                const passwordRegex = /^(?=.*[A-Z])[a-zA-Z0-9@#_\-\.]{8,20}$/;
                if (!passwordRegex.test(registerData.password)) {
                  errors.password = "Debe tener 8-20 caracteres, al menos 1 mayúscula y sin símbolos raros.";
                }

                if (Object.keys(errors).length > 0) {
                  setFormErrors(errors);
                  return;
                }
                
                setFormErrors({});
                handleRegister(e);
              }} className="space-y-4">
                
                {/* --- ENCABEZADO DINÁMICO --- */}
                <div className="text-left mb-6 border-b border-white/10 pb-4">
                  <h3 className="text-white font-black text-xl flex items-center gap-2">
                    {registerData.role === 'CITIZEN' ? 'Alta de Ciudadano' : 'Registro Institucional'}
                  </h3>
                  <p className={`text-xs mt-1 ${registerData.role === 'CITIZEN' ? 'text-slate-400' : 'text-orange-400 font-medium'}`}>
                    {registerData.role === 'CITIZEN' 
                      ? 'Regístrate para reportar incidentes en tu sector.' 
                      : '⚠️ Acceso exclusivo para entidades operativas y de socorro.'}
                  </p>
                </div>

                {/* --- 1. SELECTOR DE ROL --- */}
                <div className="space-y-1 text-left">
                  <label className="text-slate-300 text-xs font-bold ml-1 uppercase tracking-wider">Tipo de Perfil</label>
                  <select 
                    className="w-full bg-[#091120] border border-white/10 p-4 rounded-2xl outline-none focus:border-cyan-400 text-white text-sm cursor-pointer transition-all"
                    value={registerData.role || "CITIZEN"}
                    onChange={e => setRegisterData({...registerData, role: e.target.value})}
                    required
                  >
                    <option value="CITIZEN">👤 Registrar como Ciudadano</option>
                    <option value="POLICIA">🚓 Entidad: Central de Policía</option>
                    <option value="BOMBEROS">🚒 Entidad: Estación de Bomberos</option>
                    <option value="HOSPITAL">🏥 Entidad: Red de Hospitales</option>
                  </select>
                </div>

                {/* --- 2. NOMBRE (CAMBIA SEGÚN EL ROL) --- */}
                <div className="space-y-1 text-left">
                  <label className="text-slate-300 text-xs font-bold ml-1 uppercase tracking-wider">
                    {registerData.role === 'CITIZEN' ? 'Nombre completo' : 'Nombre de la Estación / Unidad'}
                  </label>
                  <input 
                    type="text" 
                    placeholder={registerData.role === 'CITIZEN' ? 'Ej. Juan Camilo Pérez' : 'Ej. Estación Central Sur'} 
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-cyan-400 focus:bg-white/[0.08] text-white text-sm transition-all" 
                    onChange={e => setRegisterData({...registerData, fullName: e.target.value})} 
                    required 
                  />
                </div>

                {/* --- 3. USUARIO (CAMBIA SEGÚN EL ROL) --- */}
                <div className="space-y-1 text-left">
                  <label className="text-slate-300 text-xs font-bold ml-1 uppercase tracking-wider">
                    {registerData.role === 'CITIZEN' ? 'Nombre de usuario' : 'Código de Operador (Usuario)'}
                  </label>
                  <input 
                    type="text" 
                    placeholder={registerData.role === 'CITIZEN' ? 'Ej. juancamilo_99' : 'Ej. pol_central_01'} 
                    className={`w-full bg-white/5 border ${formErrors.username ? 'border-red-500' : 'border-white/10 focus:border-cyan-400'} p-4 rounded-2xl outline-none focus:bg-white/[0.08] text-white text-sm transition-all`}
                    onChange={e => {
                      setRegisterData({...registerData, username: e.target.value});
                      if(formErrors.username) setFormErrors({...formErrors, username: null});
                    }} 
                    required 
                  />
                  {formErrors.username && <p className="text-red-400 text-[10px] ml-1 mt-1">{formErrors.username}</p>}
                </div>
                
                {/* --- 4. CONTRASEÑA --- */}
                <div className="space-y-1 text-left">
                  <label className="text-slate-300 text-xs font-bold ml-1 uppercase tracking-wider">
                    {registerData.role === 'CITIZEN' ? 'Contraseña' : 'Clave de Acceso Institucional'}
                  </label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className={`w-full bg-white/5 border ${formErrors.password ? 'border-red-500' : 'border-white/10 focus:border-cyan-400'} p-4 rounded-2xl outline-none focus:bg-white/[0.08] text-white text-sm transition-all`}
                    onChange={e => {
                      setRegisterData({...registerData, password: e.target.value});
                      if(formErrors.password) setFormErrors({...formErrors, password: null});
                    }} 
                    required 
                  />
                  {formErrors.password && <p className="text-red-400 text-[10px] ml-1 mt-1 leading-tight">{formErrors.password}</p>}
                </div>

                {/* --- BOTONES DE ACCIÓN --- */}
                <div className="pt-4">
                  <button type="submit" className={`w-full h-14 p-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 shadow-lg transform active:scale-95 transition-all ${registerData.role === 'CITIZEN' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950' : 'bg-cyan-700 hover:bg-cyan-600 shadow-cyan-950'}`}>
                    {registerData.role === 'CITIZEN' ? 'CONFIRMAR REGISTRO' : 'REGISTRAR ENTIDAD'}
                  </button>
                  <button type="button" onClick={() => setView('LOGIN')} className="text-slate-400 text-xs font-bold hover:text-white flex items-center justify-center gap-2 transition-all w-full mt-6">
                    <ArrowLeft size={14}/> Volver al inicio de sesión
                  </button>
                </div>
              </form>
            )}

            {view === 'RECOVER' && (
              <form onSubmit={handleRecover} className="space-y-5">
                <p className="text-slate-300 text-sm mb-4">Ingresa tu usuario y enviaremos una notificación al sistema para restablecer tu acceso.</p>
                <input type="text" placeholder="Tu Usuario" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-orange-400 focus:bg-white/[0.08] text-white text-base" onChange={e => setRecoverData({username: e.target.value})} required />
                <button type="submit" className="w-full h-16 bg-orange-600 p-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-3 shadow-lg hover:bg-orange-500 transform active:scale-95 transition-all shadow-orange-950">
                  RECUPERAR CUENTA
                </button>
                <button type="button" onClick={() => setView('LOGIN')} className="text-slate-400 text-sm hover:text-white flex items-center justify-center gap-2 mt-4 transition-all w-full mt-6">
                  <ArrowLeft size={16}/> Volver al inicio
                </button>
              </form>
            )}

          </div>
          </main>
        </div>
      </>
    )
  }

  const theme = getEntityTheme(user?.role);
  const isCitizen = user?.role === 'CITIZEN';
  const isCitizenDark = citizenMode === 'dark';
  const citizenCardClass = isCitizenDark ? 'border-slate-700 bg-slate-900/95 shadow-black/30' : 'border-slate-200 bg-white shadow-sm';
  const citizenInputClass = isCitizenDark ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-cyan-900/60' : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100';
  const citizenLabelClass = isCitizenDark ? 'text-slate-300' : 'text-slate-500';
  const citizenMutedClass = isCitizenDark ? 'text-slate-400' : 'text-slate-400';

  return (
    <div className={["min-h-screen font-sans transition-colors duration-300", isCitizen ? (isCitizenDark ? "bg-[#07111f] text-slate-100" : "bg-[#edf3fb] text-slate-800") : "bg-slate-50 text-slate-800"].join(" ")}>
      <nav className={[theme.bg, theme.text, "p-5 shadow-lg flex justify-between items-center sticky top-0 z-50 transition-colors"].join(" ")}>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg">{theme.icon}</div>
          <div><h2 className="font-black text-lg italic leading-none">{theme.title}</h2><p className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-1">Gestión Integrada</p></div>
        </div>
        <div className="flex items-center gap-2">
          {isCitizen && (
            <button type="button" onClick={toggleCitizenMode} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black uppercase transition-all hover:bg-white/10">
              {isCitizenDark ? <Sun size={16}/> : <Moon size={16}/>} <span className="hidden sm:inline">{isCitizenDark ? 'Claro' : 'Oscuro'}</span>
            </button>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 font-bold px-4 py-2 rounded-lg hover:bg-white/10 transition-all"><LogOut size={18} /> SALIR</button>
        </div>
      </nav>

      <main className={[isCitizen ? "relative max-w-7xl" : "max-w-5xl", "mx-auto p-4 sm:p-6 md:p-8 animate-fade-in-up"].join(" ")}>
        {isCitizen && (
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[2rem]">
            <div className={["absolute inset-x-4 top-4 h-44 rounded-[2rem] border", isCitizenDark ? "border-cyan-400/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(239,68,68,0.12),rgba(15,23,42,0))]" : "border-white/70 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(239,68,68,0.12),rgba(255,255,255,0.55))]"].join(" ")}></div>
            <div className={["absolute inset-0 opacity-60", isCitizenDark ? "bg-[linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(180deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" : "bg-[linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:42px_42px]"].join(" ")}></div>
          </div>
        )}
        {isCitizen ? (
          <div className={["relative z-10 overflow-hidden rounded-3xl border shadow-2xl", isCitizenDark ? "border-slate-700 bg-slate-900 shadow-black/30" : "border-slate-200 bg-white shadow-slate-200/70"].join(" ")}>
            <div className="relative overflow-hidden bg-[#0f172a] px-6 py-7 text-white md:px-10 md:py-9">
              <div className="absolute left-0 top-0 h-full w-2 bg-red-600"></div>
              <div className="absolute right-0 top-0 h-full w-2 bg-blue-600"></div>
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase text-cyan-100">
                    <Activity size={13} className="text-red-300"/> Reporte ciudadano
                  </span>
                  <h3 className="mt-4 text-3xl font-black italic tracking-normal md:text-4xl">Emitir Alerta</h3>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-300">
                    Registra la escena con ubicacion, evidencia y entidades de respuesta en un solo envio.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                    <Navigation size={18} className="mx-auto text-cyan-300"/>
                    <p className="mt-2 text-[10px] font-black uppercase text-slate-200">GPS</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                    <Camera size={18} className="mx-auto text-cyan-300"/>
                    <p className="mt-2 text-[10px] font-black uppercase text-slate-200">Foto</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                    <Shield size={18} className="mx-auto text-cyan-300"/>
                    <p className="mt-2 text-[10px] font-black uppercase text-slate-200">Apoyo</p>
                  </div>
                </div>
              </div>
            </div>
            <form onSubmit={handleSend} className={["grid gap-6 p-5 md:p-8 lg:p-10 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.8fr)]", isCitizenDark ? "bg-slate-950/70" : "bg-slate-50/80"].join(" ")}>
              <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <label className="space-y-2">
                  <span className={["ml-1 text-[10px] font-black uppercase", citizenLabelClass].join(" ")}>Asunto del reporte</span>
                  <input type="text" placeholder="Ej. Accidente en la avenida" className={["w-full rounded-2xl border p-4 shadow-sm outline-none transition-all focus:ring-4", citizenInputClass].join(" ")} value={emergencyForm.title} onChange={e => setEmergencyForm({...emergencyForm, title: e.target.value})} required />
                </label>
                <label className="space-y-2">
                  <span className={["ml-1 text-[10px] font-black uppercase", citizenLabelClass].join(" ")}>Coordenadas GPS</span>
                  <input type="text" placeholder="Latitud, longitud" className={["w-full rounded-2xl border p-4 shadow-sm outline-none transition-all focus:ring-4", citizenInputClass].join(" ")} value={emergencyForm.location} onChange={e => setEmergencyForm({...emergencyForm, location: e.target.value})} required />
                </label>
                <button type="button" onClick={handleGetLocation} className={["flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl px-5 font-black uppercase text-white shadow-lg transition-all active:scale-95 lg:w-auto", isCitizenDark ? "bg-cyan-700 shadow-cyan-950/50 hover:bg-cyan-600" : "bg-slate-900 shadow-slate-300 hover:bg-blue-700"].join(" ")} title="Obtener ubicacion GPS">
                  {isLocating ? <Loader2 className="animate-spin" size={20}/> : <Navigation size={20}/>}
                  <span className="text-xs">GPS</span>
                </button>
              </div>
              <div className={["rounded-3xl border p-5", citizenCardClass].join(" ")}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-700">Analisis con IA</span>
                    <p className={["mt-1 text-xs font-semibold", citizenMutedClass].join(" ")}>Agrega una imagen para ayudar a priorizar la emergencia.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input type="file" accept="image/*" capture="environment" id="cameraInput" className="hidden" onChange={handleImageCapture} />
                    <label htmlFor="cameraInput" className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black uppercase text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700">
                      {isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <Camera size={14}/>} Camara
                    </label>
                    <input type="file" accept="image/*" id="galleryInput" className="hidden" onChange={handleImageCapture} />
                    <label htmlFor="galleryInput" className={["flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black uppercase shadow-sm transition-all", isCitizenDark ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"].join(" ")}>
                      {isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <Image size={14}/>} Galeria
                    </label>
                  </div>
                </div>
                {imagePreview && (
                  <div className={["mt-5 overflow-hidden rounded-2xl border p-2", isCitizenDark ? "border-blue-900/60 bg-blue-950/30" : "border-blue-100 bg-blue-50"].join(" ")}>
                    <img src={imagePreview} className="h-44 w-full rounded-xl object-cover shadow-inner" alt="Evidencia" />
                  </div>
                )}
                <textarea placeholder="Descripcion del incidente..." className={["mt-5 min-h-[260px] w-full rounded-2xl border p-4 outline-none transition-all focus:ring-4", citizenInputClass, isAnalyzing ? "opacity-50 animate-pulse" : ""].join(" ")} rows="8" value={emergencyForm.description} onChange={e => setEmergencyForm({...emergencyForm, description: e.target.value})} required disabled={isAnalyzing}></textarea>
              </div>
              </div>
              <div className="space-y-5 xl:sticky xl:top-28 xl:self-start">
                <div className={["rounded-3xl border p-5", citizenCardClass].join(" ")}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className={["text-[10px] font-black uppercase", citizenLabelClass].join(" ")}>Entidades a notificar</span>
                    <span className={["rounded-full px-3 py-1 text-[10px] font-black", isCitizenDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500"].join(" ")}>{selectedEntities.length}/3 seleccionadas</span>
                  </div>
                  <div className="grid gap-3">
                    {[
                      { id: 'POLICIA', label: 'Policia', detail: 'Robos, violencia y seguridad', icon: <Shield size={19}/>, active: isCitizenDark ? 'border-blue-500/60 bg-blue-950/60 text-blue-100' : 'border-blue-300 bg-blue-50 text-blue-900', iconClass: 'bg-blue-600 text-white' },
                      { id: 'BOMBEROS', label: 'Bomberos', detail: 'Incendios, rescates y riesgos', icon: <Flame size={19}/>, active: isCitizenDark ? 'border-red-500/60 bg-red-950/60 text-red-100' : 'border-red-300 bg-red-50 text-red-900', iconClass: 'bg-red-600 text-white' },
                      { id: 'HOSPITAL', label: 'Hospital', detail: 'Heridos, ambulancia y salud', icon: <Hospital size={19}/>, active: isCitizenDark ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-100' : 'border-emerald-300 bg-emerald-50 text-emerald-900', iconClass: 'bg-emerald-600 text-white' }
                    ].map(ent => {
                      const isSelected = selectedEntities.includes(ent.id);
                      return (
                        <label key={ent.id} className={["flex cursor-pointer items-center gap-4 rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5", isSelected ? ent.active : (isCitizenDark ? "border-slate-700 bg-slate-950/70 text-slate-200 hover:border-cyan-700 hover:bg-slate-900" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-white")].join(" ")}>
                          <input type="checkbox" className="sr-only" checked={isSelected} onChange={() => toggleEntity(ent.id)} />
                          <span className={["flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", isSelected ? ent.iconClass : (isCitizenDark ? "border border-slate-700 bg-slate-900 text-slate-400" : "border border-slate-200 bg-white text-slate-500")].join(" ")}>
                            {ent.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black uppercase">{ent.label}</span>
                            <span className="block text-xs font-semibold opacity-70">{ent.detail}</span>
                          </span>
                          {isSelected && <CheckCircle size={20} className="shrink-0 text-emerald-500"/>}
                        </label>
                      )
                    })}
                  </div>
                </div>
                <div className={["rounded-3xl border p-5", isCitizenDark ? "border-red-900/40 bg-slate-900/95 shadow-black/20" : "border-red-100 bg-white shadow-sm"].join(" ")}>
                  <button type="submit" disabled={selectedEntities.length === 0} className={`relative flex min-h-[190px] w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl p-6 text-center font-black uppercase italic text-white shadow-xl transition-all active:scale-95 sm:min-h-[210px] ${selectedEntities.length === 0 ? (isCitizenDark ? 'bg-slate-800 text-slate-500 shadow-none cursor-not-allowed' : 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed') : 'bg-[#ff0000] shadow-red-200 hover:bg-red-700'}`}>
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                      {selectedEntities.length === 0 ? <AlertTriangle size={30}/> : <ArrowRight size={30}/>}
                    </span>
                    <span className="text-xl tracking-normal sm:text-2xl">{selectedEntities.length === 0 ? 'Selecciona entidad' : 'Enviar reporte'}</span>
                    <span className="max-w-xs text-xs not-italic opacity-80">
                      {selectedEntities.length === 0 ? 'El reporte necesita al menos una entidad.' : `Se notificara a ${selectedEntities.length} entidad(es) con la ubicacion y evidencia.`}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <span className="font-bold text-slate-500 flex items-center gap-2 italic"> <Activity size={18} className="animate-pulse text-red-500"/> Incidentes Activos</span>
            </div>
            <div className="grid gap-4">
              {emergencies.map(em => {
                // --- LÓGICA DE ESTADOS VISUALES ---
                const isResolved = em.status === 'RESOLVED';
                const isInProgress = em.status === 'IN_PROGRESS';
                
                let borderClass = 'border-red-600';
                let statusBadge = <span className="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-full font-black ml-2 uppercase animate-pulse">Nueva Alerta</span>;

                if (isResolved) {
                  borderClass = 'border-emerald-500 opacity-60'; // Se pone verde y un poco transparente
                  statusBadge = <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-1 rounded-full font-black ml-2 uppercase">Resuelto</span>;
                } else if (isInProgress) {
                  borderClass = 'border-amber-500'; // Se pone amarilla
                  statusBadge = <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-1 rounded-full font-black ml-2 uppercase animate-pulse">En Proceso</span>;
                }

                const coordinates = parseEmergencyCoordinates(em.location);

                return (
                  <div key={em.id} className={`bg-white p-6 rounded-3xl shadow-sm border-l-[12px] ${borderClass} flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden transition-all duration-500`}>
                    <div className="flex-1">
                      <h4 className="font-black text-xl italic text-slate-900 mb-2 flex items-center flex-wrap gap-2">
                        {em.title} {statusBadge}
                      </h4>
                      <p className="text-slate-400 text-xs font-bold mb-3 flex items-center gap-1"><MapPin size={14}/> {em.location}</p>
                      <p className="text-slate-600 text-sm italic font-medium">"{em.description}"</p>
                      {coordinates ? (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-white border-b border-slate-200">
                            <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                              <MapPin size={14} className="text-red-600"/> Mapa del incidente
                            </span>
                            <a
                              href={getIncidentMapUrl(coordinates)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 transition-all"
                            >
                              Ver mapa grande
                            </a>
                          </div>
                          <iframe
                            title={`Mapa del incidente ${em.id}`}
                            src={getIncidentMapEmbedUrl(coordinates)}
                            className="w-full h-64 border-0"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          ></iframe>
                        </div>
                      ) : (
                        <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[10px] font-black uppercase text-amber-700">
                          <MapPin size={13}/> Ubicacion sin coordenadas validas
                        </p>
                      )}
                      {em.image && <button onClick={() => setSelectedImage(em.image)} className="mt-4 flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-tighter hover:underline"><Eye size={14}/> Ver Evidencia</button>}
                    </div>
                    
                    <div className="flex flex-row md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 min-w-[140px]">
                      
                      {/* Ocultar botón ATENDER si ya está resuelto o en progreso */}
                      {!isResolved && !isInProgress && (
                        <button onClick={() => updateStatus(em.id, 'IN_PROGRESS')} className="bg-amber-500 text-white p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black shadow-md hover:bg-amber-600 transition-all active:scale-95">ATENDER</button>
                      )}
                      
                      {/* Ocultar botón RESOLVER si ya está resuelto */}
                      {!isResolved && (
                        <button onClick={() => updateStatus(em.id, 'RESOLVED')} className="bg-emerald-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black shadow-md hover:bg-emerald-700 transition-all active:scale-95">RESOLVER</button>
                      )}
                      
                      <button onClick={() => deleteEmergency(em.id)} className="bg-white border border-slate-200 text-slate-400 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black hover:bg-red-50 hover:text-red-600 transition-all active:scale-95">BORRAR</button>
                </div>
              </div>
            );
            
          })} 
        </div>
          </div>
        )}
      </main>
      
      

      {selectedImage && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-4 animate-fade-in-up" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-3xl w-full bg-white rounded-3xl p-2 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black transition-all"><X size={20}/></button>
            <img src={selectedImage} className="w-full h-auto max-h-[80vh] object-contain rounded-2xl" alt="Zoom" />
          </div>
        </div>
      )}
    </div>
  )
}
export default App
