import { useState, useEffect } from 'react'
import { User, Lock, ArrowRight, LogOut, AlertTriangle, MapPin, CheckCircle, Activity, Shield, Flame, Hospital, Navigation, Camera, Loader2, Eye, EyeOff, X, Image, ArrowLeft, Moon, Sun, Search, Clock, Clipboard, ExternalLink, Layers, Radio, ListFilter, FileText, Bot, Users, Truck, Ambulance, TimerReset } from 'lucide-react'
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_MB } from './config'
import { EmergencyDashboard, EmergencyReport } from './models/EmergencyReport'
import { SigeuUser } from './models/SigeuUser'
import { analyzeIncidentImage, clearAuthToken, createEmergency, deleteEmergencyById, fetchEmergenciesByTarget, fetchResourceSummary, loginUser, recoverUser, registerUser, setAuthToken, updateEmergencyStatus } from './services/sigeuApi'
import { formatEmergencyTime, getIncidentMapEmbedUrl, getIncidentMapUrl, getStatusConfig } from './utils/emergencies'

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
  .sigeu-report-textarea {
    font-family: "Segoe UI", Inter, Roboto, Arial, sans-serif;
    font-size: 0.96rem;
    font-weight: 500;
    line-height: 1.75;
    letter-spacing: 0;
  }
  .sigeu-report-textarea::placeholder {
    font-weight: 500;
  }
`;

const FIELD_LIMITS = {
  username: 30,
  password: 72,
  name: 120,
  title: 120,
  description: 1000,
  location: 120,
};

const limitText = (value, maxLength) => {
  return (value || '').slice(0, maxLength)
}

const IMPORTANT_TEXT_SPLIT = /(Analisis de IA:|POLIC[ÍI]A|BOMBEROS?|HOSPITAL|AMBULANCIA|HERID[OA]S?|FUEGO|INCENDIO|LLAMAS|INMEDIATO|URGENTE|EMERGENCIA|RESCATE|ACCIDENTE|VIOLENCIA|PELIGRO|RIESGO)/gi
const IMPORTANT_TEXT_MATCH = /^(Analisis de IA:|POLIC[ÍI]A|BOMBEROS?|HOSPITAL|AMBULANCIA|HERID[OA]S?|FUEGO|INCENDIO|LLAMAS|INMEDIATO|URGENTE|EMERGENCIA|RESCATE|ACCIDENTE|VIOLENCIA|PELIGRO|RIESGO)$/i

const renderHighlightedDescription = (text, importantClass) => {
  const lines = text.split('\n')
  return lines.map((line, lineIndex) => (
    <span key={`line-${lineIndex}`}>
      {line.split(IMPORTANT_TEXT_SPLIT).map((part, partIndex) => {
        if (!part) return null
        if (IMPORTANT_TEXT_MATCH.test(part)) {
          return <strong key={`part-${lineIndex}-${partIndex}`} className={importantClass}>{part}</strong>
        }
        return <span key={`part-${lineIndex}-${partIndex}`}>{part}</span>
      })}
      {lineIndex < lines.length - 1 && <br />}
    </span>
  ))
}

const buildReportDescription = (aiDescription, additionalDescription) => {
  const parts = []

  if (aiDescription.trim()) {
    parts.push(aiDescription.trim())
  }

  if (additionalDescription.trim()) {
    parts.push(`Descripcion adicional:\n${additionalDescription.trim()}`)
  }

  return limitText(parts.join('\n\n'), FIELD_LIMITS.description)
}

function App() {
  const [user, setUser] = useState(() => {
    return SigeuUser.fromStorage(localStorage.getItem('sigeu_user'))
  })
  
  
  const [view, setView] = useState(() => {
    return SigeuUser.fromStorage(localStorage.getItem('sigeu_user')) ? 'DASHBOARD' : 'LOGIN'
  })
  
  const [emergencies, setEmergencies] = useState([])
  const [loginData, setLoginData] = useState({ username: '', password: '' })
  const [registerData, setRegisterData] = useState({ username: '', password: '', fullName: '', role: 'CITIZEN' })
  const [recoverData, setRecoverData] = useState({ username: '' })
  
  const [loginRole, setLoginRole] = useState('CITIZEN')
  
  
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [formErrors, setFormErrors] = useState({});
  const [emergencyForm, setEmergencyForm] = useState({ 
    title: '', description: '', location: '', type: 'ACCIDENT', image: '' 
  })
  const [aiDescription, setAiDescription] = useState('')
  const [selectedEntities, setSelectedEntities] = useState(['POLICIA'])
  const [citizenMode, setCitizenMode] = useState(() => localStorage.getItem('sigeu_citizen_mode') || 'light')

  const [isLocating, setIsLocating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [appNotice, setAppNotice] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)
  const [entityFilter, setEntityFilter] = useState('ALL')
  const [entitySearch, setEntitySearch] = useState('')
  const [resourceSummary, setResourceSummary] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [isSendingReport, setIsSendingReport] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const passwordRequirements = [
    {
      id: 'length',
      label: '8 a 72 caracteres',
      isValid: registerData.password.length >= 8 && registerData.password.length <= FIELD_LIMITS.password,
    },
    {
      id: 'uppercase',
      label: 'Al menos 1 letra mayuscula',
      isValid: /[A-Z]/.test(registerData.password),
    },
    {
      id: 'allowed',
      label: 'Solo letras, numeros y @ # _ . -',
      isValid: /^[a-zA-Z0-9@#_.-]*$/.test(registerData.password),
    },
  ]

  const clearAuthFeedback = () => {
    setAuthError('')
    setAuthSuccess('')
  }

  const clearSensitiveAuthFields = () => {
    setLoginData(current => ({ ...current, password: '' }))
    setRegisterData(current => ({ ...current, password: '' }))
  }

  const goToView = (nextView) => {
    clearAuthFeedback()
    setView(nextView)
  }

  useEffect(() => {
    if (user?.token) {
      setAuthToken(user.token)
      localStorage.setItem('sigeu_user', JSON.stringify(user))
    }
  }, [user])

  useEffect(() => {
    let intervalId;
    if (view === 'DASHBOARD' && user?.role !== 'CITIZEN') {
      const fetchEmergencies = async () => {
        try {
          const [res, resourcesRes] = await Promise.all([
            fetchEmergenciesByTarget(user.role),
            fetchResourceSummary(user.role),
          ]);
          if (res.ok) {
            const data = await res.json();
            setEmergencies(data);
          }
          if (resourcesRes.ok) {
            const resources = await resourcesRes.json();
            setResourceSummary(resources);
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
    setAuthLoading(true)
    const credentials = {
      username: loginData.username,
      password: loginData.password,
    }
    try {
      const res = await loginUser(credentials)
      if (res.ok) { 
        const userData = await res.json()
        const sessionUser = SigeuUser.fromApi(userData)

        if (loginRole === 'CITIZEN' && !sessionUser.isCitizen()) {
          setAuthError('Estas credenciales son de Entidad. Selecciona Entidad.');
          return;
        }
        if (!sessionUser.matchesLoginMode(loginRole)) {
          setAuthError('Estas credenciales son de Ciudadano. Selecciona Ciudadano.');
          return;
        }

        setUser(sessionUser)
        localStorage.setItem('sigeu_user', JSON.stringify(sessionUser))
        goToView('DASHBOARD') 
      } else {
        const errorText = await res.text()
        setAuthError(errorText || 'Error en las credenciales')
      }
    } catch {
      setAuthError('Error de conexión con el servidor')
    } finally {
      clearSensitiveAuthFields()
      setAuthLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    const registrationData = {
      ...registerData,
    }
    try {
      const res = await registerUser(registrationData)
      if (res.ok) {
        setAuthSuccess('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.')
        const loginRes = await loginUser({
          username: registrationData.username,
          password: registrationData.password,
        })

        if (loginRes.ok) {
          const userData = await loginRes.json()
          const sessionUser = SigeuUser.fromApi(userData)

          setUser(sessionUser)
          setLoginRole(sessionUser.isCitizen() ? 'CITIZEN' : 'ENTITY')
          localStorage.setItem('sigeu_user', JSON.stringify(sessionUser))
          goToView('DASHBOARD')
        } else {
          setAuthSuccess('Cuenta creada. Inicia sesion con tu usuario y password.')
          setView('LOGIN')
        }
      } else {
        const errorText = await res.text()
        setAuthError(errorText || 'Error al crear la cuenta. El usuario podría ya existir.')
      }
    } catch {
      setAuthError('Error de conexión con el servidor')
    } finally {
      clearSensitiveAuthFields()
      setAuthLoading(false)
    }
  }

  const handleRecover = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      // Nota: En la vida real esto envía un correo. Aquí haremos que el backend reinicie la clave o mande un aviso.
      const res = await recoverUser(recoverData)
      if (res.ok) {
        setAuthSuccess('Instrucciones de recuperación enviadas. (Revisa tu base de datos o consola)')
      } else {
        const errorText = await res.text()
        setAuthError(errorText || 'Usuario no encontrado')
      }
    } catch {
      setAuthError('Error de conexión con el servidor')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setUser(null); clearAuthToken(); localStorage.removeItem('sigeu_user'); goToView('LOGIN'); setImagePreview(null); setAiDescription('');
  }

  const showAppNotice = (message, type = 'warning') => {
    setAppNotice({ message, type });
    setTimeout(() => {
      setAppNotice(current => current?.message === message && current?.type === type ? null : current);
    }, 4500);
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (selectedEntities.length === 0 || isSendingReport || isAnalyzing) return;
    const reportDescription = buildReportDescription(aiDescription, emergencyForm.description)
    if (!reportDescription) {
      showAppNotice('Agrega una descripcion manual o una imagen para generar el analisis con IA.', 'warning');
      return;
    }
    setIsSendingReport(true)
    const failedDeliveries = [];
    let successfulDeliveries = 0;
    try {
      for (const entidad of selectedEntities) {
        const payload = {
          ...emergencyForm,
          title: limitText(emergencyForm.title.trim(), FIELD_LIMITS.title),
          description: reportDescription,
          location: limitText(emergencyForm.location.trim(), FIELD_LIMITS.location),
          targetEntity: entidad,
        };
        const res = await createEmergency(payload);
        if (res.ok) {
          successfulDeliveries++;
        } else {
          const errorText = await res.text();
          failedDeliveries.push(`${entidad}: ${errorText || `error ${res.status}`}`);
        }
      }
    } catch (error) {
      console.error(error);
      showAppNotice('No se pudo conectar con el backend. Revisa que Railway o el backend local esten activos.', 'error');
      return;
    } finally {
      setIsSendingReport(false)
    }
    if (successfulDeliveries > 0) { 
      const allSent = successfulDeliveries === selectedEntities.length;
      showAppNotice(
        allSent
          ? `Reporte enviado a ${successfulDeliveries} entidad(es).`
          : `Reporte enviado a ${successfulDeliveries} de ${selectedEntities.length}. Fallo: ${failedDeliveries.join(' | ')}`,
        allSent ? 'success' : 'warning'
      );
      setEmergencyForm({ title: '', description: '', location: '', type: 'ACCIDENT', image: '' }); setSelectedEntities(['POLICIA']); setImagePreview(null)
      setAiDescription('')
    } else {
      showAppNotice(`No se pudo enviar el reporte. ${failedDeliveries.join(' | ') || 'El backend no respondio.'}`, 'error');
    }
  }

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await updateEmergencyStatus(id, newStatus)
      if (res.ok) {
        const updatedEmergency = await res.json()
        setEmergencies(current => current.map(em => em.id === id ? updatedEmergency : em))
        setDetailTarget(current => current?.id === id ? updatedEmergency : current)
      } else {
        showAppNotice('No se pudo actualizar el estado del incidente.', 'error');
      }
    } catch {
      showAppNotice('No se pudo conectar con el servidor para actualizar el incidente.', 'error');
    }
  }

  const requestDeleteEmergency = (emergency) => {
    setDeleteTarget(emergency);
  }

  const deleteEmergency = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    let res;
    try {
      res = await deleteEmergencyById(id)
    } catch {
      showAppNotice('No se pudo conectar con el servidor para borrar el incidente.', 'error');
      return;
    }
    if (res.ok) {
      setEmergencies(current => current.filter(em => em.id !== id))
      setDeleteTarget(null)
      setDetailTarget(current => current?.id === id ? null : current)
    } else {
      showAppNotice('No se pudo borrar el incidente. Inténtalo nuevamente.', 'error');
    }
  }

  const copyEmergencyLocation = async (location) => {
    if (!location) {
      showAppNotice('Este incidente no tiene coordenadas para copiar.', 'warning');
      return;
    }
    try {
      await navigator.clipboard.writeText(location);
      showAppNotice('Coordenadas copiadas.', 'success');
    } catch {
      showAppNotice('No se pudieron copiar las coordenadas.', 'warning');
    }
  }

  const GEO_ERROR = { PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }

  const getLocationErrorMessage = (error) => {
    if (!window.isSecureContext) {
      return "La ubicación automática necesita HTTPS. En iPhone no funciona si abres la app por http o por una IP local sin certificado.";
    }

    if (!error) return "No se pudo obtener la ubicación.";

    switch (error.code) {
      case GEO_ERROR.PERMISSION_DENIED:
        return "";
      case GEO_ERROR.POSITION_UNAVAILABLE:
        return "El iPhone no pudo calcular la ubicación. Activa Localización y prueba con buena señal GPS o WiFi.";
      case GEO_ERROR.TIMEOUT:
        return "El iPhone tardó demasiado en responder la ubicación. Inténtalo de nuevo en unos segundos.";
      default:
        return "No se pudo obtener la ubicación.";
    }
  }

  const getCurrentLocation = (options) => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  const handleGetLocation = async () => {
    if (!window.isSecureContext) {
      showAppNotice(getLocationErrorMessage(), 'warning');
      return;
    }

    if (!navigator.geolocation) {
      showAppNotice("Este navegador no permite obtener ubicación automática.", 'warning');
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
        location: limitText(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`, FIELD_LIMITS.location)
      }));
    } catch (error) {
      const message = getLocationErrorMessage(error);
      if (message) showAppNotice(message, 'warning');
    } finally {
      setIsLocating(false);
    }
  }

  const handleImageCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showAppNotice('Selecciona un archivo de imagen válido.', 'warning');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      showAppNotice(`La imagen supera ${MAX_IMAGE_SIZE_MB} MB. Usa una foto más liviana.`, 'warning');
      return;
    }

    setAiDescription('');
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setImagePreview(base64String);
      setIsAnalyzing(true);
      setEmergencyForm(prev => ({ ...prev, image: base64String }));
      try {
        const response = await analyzeIncidentImage(base64String);
        if (!response.ok) throw new Error("Error IA");
        const data = await response.json();
        const textoIA = data.descripcion || 'La IA no devolvió una descripción clara.';
        setAiDescription(limitText(`Analisis de IA:\n${textoIA}`, FIELD_LIMITS.description));
        const textoMayusculas = textoIA.toUpperCase();
        if (textoMayusculas.includes('NO ES NECESARIA') || textoMayusculas.includes('NINGUNA EMERGENCIA')) {
          setSelectedEntities([]);
        } else {
          const recomendadas = [];
          if (textoMayusculas.includes('POLICÍA') || textoMayusculas.includes('POLICIA')) recomendadas.push('POLICIA');
          if (textoMayusculas.includes('BOMBERO') || textoMayusculas.includes('FUEGO') || textoMayusculas.includes('INCENDIO')) recomendadas.push('BOMBEROS');
          if (textoMayusculas.includes('HOSPITAL') || textoMayusculas.includes('AMBULANCIA') || textoMayusculas.includes('MÉDICO') || textoMayusculas.includes('HERIDO')) recomendadas.push('HOSPITAL');
          if (recomendadas.length > 0) {
            setSelectedEntities(recomendadas);
          } else {
            showAppNotice('La IA no identificó una entidad específica. Revisa la selección manualmente.', 'warning');
          }
        }
      } catch {
        setAiDescription('');
        showAppNotice('No se pudo analizar la imagen con IA. Puedes continuar con la descripción manual.', 'warning');
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
                <p className="text-[10px] uppercase tracking-[.28em] text-cyan-200/80 font-bold">Sistema de Gestión</p>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-200/85">
              <span>Plataforma</span>
              <span>Alertas IA</span>
              <span>Entidades</span>
              <span>Soporte</span>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <button type="button" onClick={() => goToView('LOGIN')} className={["px-5 py-2.5 rounded-xl border text-sm font-bold transition-all shadow-sm", view === 'REGISTER' ? "border-white/25 text-slate-200 hover:bg-white/10 hover:text-white" : "border-cyan-300/50 bg-cyan-300/10 text-white shadow-cyan-950/40"].join(" ")}>Iniciar sesión</button>
              <button type="button" onClick={() => goToView('REGISTER')} className={["px-5 py-2.5 rounded-xl border text-sm font-bold transition-all shadow-sm", view === 'REGISTER' ? "border-cyan-300/50 bg-cyan-300/10 text-white shadow-cyan-950/40" : "border-white/25 text-slate-200 hover:bg-white/10 hover:text-white"].join(" ")}>Inscríbete</button>
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
                Una plataforma para que ciudadanos, policía, bomberos y hospitales gestionen incidentes desde una sola central.
              </p>
              <div className="mt-9 grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto lg:mx-0">
                <div className="border border-white/10 bg-white/[0.06] rounded-2xl p-4 text-left">
                  <Shield size={22} className="text-cyan-300 mb-3"/>
                  <p className="text-sm font-black">Triaje automático</p>
                  <p className="text-xs text-slate-300 mt-1">La IA ayuda a priorizar la escena.</p>
                </div>
                <div className="border border-white/10 bg-white/[0.06] rounded-2xl p-4 text-left">
                  <MapPin size={22} className="text-cyan-300 mb-3"/>
                  <p className="text-sm font-black">Ubicación GPS</p>
                  <p className="text-xs text-slate-300 mt-1">Coordenadas listas para operar.</p>
                </div>
                <div className="border border-white/10 bg-white/[0.06] rounded-2xl p-4 text-left">
                  <Camera size={22} className="text-cyan-300 mb-3"/>
                  <p className="text-sm font-black">Evidencia visual</p>
                  <p className="text-xs text-slate-300 mt-1">Imágenes para cada entidad.</p>
                </div>
              </div>
            </section>

            <div className="w-full max-w-md mx-auto bg-[#091120]/90 backdrop-blur-xl rounded-[2rem] p-7 md:p-9 z-10 animate-fade-in-up border border-white/10 shadow-2xl text-center shadow-black/50">
            <div className="bg-[#ff0000] w-14 h-14 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_25px_rgba(255,0,0,0.5)]"><span className="text-4xl font-black italic text-white">!</span></div>
            <h1 className="text-5xl font-black italic mb-1 tracking-normal text-white">SIGEU</h1>
            <p className="text-xs uppercase tracking-[.3em] opacity-80 mb-8 font-semibold text-cyan-200">
              {view === 'LOGIN' ? 'Sistema de Gestión' : view === 'REGISTER' ? 'Nuevo Registro' : 'Recuperación'}
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
                    <input type="text" placeholder="Usuario" value={loginData.username} maxLength={FIELD_LIMITS.username} autoComplete="username" autoCapitalize="none" spellCheck={false} className="w-full bg-white/5 border border-white/10 py-5 pl-12 pr-5 rounded-2xl outline-none focus:border-cyan-400 focus:bg-white/[0.08] text-white text-base" onChange={e => setLoginData({...loginData, username: e.target.value})} required />
                  </div>
                  <div className="relative">
                    <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input type={showLoginPassword ? "text" : "password"} placeholder="Contraseña" value={loginData.password} maxLength={FIELD_LIMITS.password} autoComplete="current-password" autoCapitalize="none" spellCheck={false} className="w-full bg-white/5 border border-white/10 py-5 pl-12 pr-12 rounded-2xl outline-none focus:border-cyan-400 focus:bg-white/[0.08] text-white text-base" onChange={e => setLoginData({...loginData, password: e.target.value})} required />
                    <button type="button" onClick={() => setShowLoginPassword(current => !current)} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-all hover:bg-white/10 hover:text-white" aria-label={showLoginPassword ? "Ocultar password" : "Mostrar password"}>
                      {showLoginPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                  <button type="submit" disabled={authLoading} className="w-full h-16 bg-cyan-600 p-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-3 shadow-lg hover:bg-cyan-500 transform active:scale-95 transition-all shadow-cyan-950 disabled:cursor-not-allowed disabled:opacity-70">
                    {authLoading ? 'INGRESANDO...' : 'INGRESAR'} {authLoading ? <Loader2 className="animate-spin" size={22}/> : <ArrowRight size={22}/>}
                  </button>
                  <button type="button" onClick={() => goToView('RECOVER')} className="text-cyan-400 text-sm hover:underline block mt-4 transition-all w-full text-center">¿Olvidaste la contraseña?</button>
                  <div className="border-t border-white/5 mt-8 pt-8">
                    <button type="button" onClick={() => goToView('REGISTER')} className="w-full h-14 border border-cyan-400 text-cyan-400 hover:bg-cyan-950 p-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transform active:scale-95 transition-all shadow-md">
                      Crear una cuenta
                    </button>
                  </div>
                </form>
                <div className="mt-8 text-center px-2">
                  <p className="text-slate-400 text-xs font-medium leading-relaxed italic">
                    <span className="text-cyan-400 font-bold">SIGEU IA:</span> Reporte ciudadano con análisis visual, triaje automático y coordinación de entidades de socorro.
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

                const passwordRegex = /^(?=.*[A-Z])[a-zA-Z0-9@#_.-]{8,72}$/;
                if (!passwordRegex.test(registerData.password)) {
                  errors.password = "Debe tener 8-72 caracteres, al menos 1 mayuscula y solo @ # _ . -";
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
                    value={registerData.fullName}
                    maxLength={FIELD_LIMITS.name}
                    autoComplete="name"
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
                    value={registerData.username}
                    maxLength={15}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
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
                  <div className="relative">
                    <input 
                      type={showRegisterPassword ? "text" : "password"} 
                      placeholder="Password seguro" 
                      value={registerData.password}
                      maxLength={FIELD_LIMITS.password}
                      autoComplete="new-password"
                      autoCapitalize="none"
                      spellCheck={false}
                      className={`w-full bg-white/5 border ${formErrors.password ? 'border-red-500' : 'border-white/10 focus:border-cyan-400'} p-4 pr-12 rounded-2xl outline-none focus:bg-white/[0.08] text-white text-sm transition-all`}
                      onChange={e => {
                        setRegisterData({...registerData, password: e.target.value});
                        if(formErrors.password) setFormErrors({...formErrors, password: null});
                      }} 
                      required 
                    />
                    <button type="button" onClick={() => setShowRegisterPassword(current => !current)} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-all hover:bg-white/10 hover:text-white" aria-label={showRegisterPassword ? "Ocultar password" : "Mostrar password"}>
                      {showRegisterPassword ? <EyeOff size={17}/> : <Eye size={17}/>}
                    </button>
                  </div>
                  <div className="mt-2 grid gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    {passwordRequirements.map(requirement => (
                      <p
                        key={requirement.id}
                        className={`flex items-center gap-2 text-[10px] font-bold leading-tight ${requirement.isValid ? 'text-emerald-400' : 'text-slate-400'}`}
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${requirement.isValid ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                        {requirement.label}
                      </p>
                    ))}
                  </div>
                  {formErrors.password && <p className="text-red-400 text-[10px] ml-1 mt-1 leading-tight">{formErrors.password}</p>}
                </div>

                {/* --- BOTONES DE ACCIÓN --- */}
                <div className="pt-4">
                  <button type="submit" disabled={authLoading} className={`w-full h-14 p-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 shadow-lg transform active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-70 ${registerData.role === 'CITIZEN' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950' : 'bg-cyan-700 hover:bg-cyan-600 shadow-cyan-950'}`}>
                    {authLoading ? 'PROCESANDO...' : registerData.role === 'CITIZEN' ? 'CONFIRMAR REGISTRO' : 'REGISTRAR ENTIDAD'}
                  </button>
                  <button type="button" onClick={() => goToView('LOGIN')} className="text-slate-400 text-xs font-bold hover:text-white flex items-center justify-center gap-2 transition-all w-full mt-6">
                    <ArrowLeft size={14}/> Volver al inicio de sesión
                  </button>
                </div>
              </form>
            )}

            {view === 'RECOVER' && (
              <form onSubmit={handleRecover} className="space-y-5">
                <p className="text-slate-300 text-sm mb-4">Ingresa tu usuario y enviaremos una notificación al sistema para restablecer tu acceso.</p>
                <input type="text" placeholder="Tu Usuario" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-orange-400 focus:bg-white/[0.08] text-white text-base" onChange={e => setRecoverData({username: e.target.value})} required />
                <button type="submit" disabled={authLoading} className="w-full h-16 bg-orange-600 p-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-3 shadow-lg hover:bg-orange-500 transform active:scale-95 transition-all shadow-orange-950 disabled:cursor-not-allowed disabled:opacity-70">
                  {authLoading ? 'ENVIANDO...' : 'RECUPERAR CUENTA'}
                </button>
                <button type="button" onClick={() => goToView('LOGIN')} className="text-slate-400 text-sm hover:text-white flex items-center justify-center gap-2 mt-4 transition-all w-full mt-6">
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
  const titleCounterClass = emergencyForm.title.length >= FIELD_LIMITS.title ? 'text-red-500' : citizenLabelClass;
  const locationCounterClass = emergencyForm.location.length >= FIELD_LIMITS.location ? 'text-red-500' : citizenLabelClass;
  const descriptionCounterClass = emergencyForm.description.length >= FIELD_LIMITS.description ? 'text-red-500' : citizenMutedClass;
  const descriptionPreviewClass = isCitizenDark ? 'border-cyan-900/50 bg-cyan-950/20 text-slate-100' : 'border-blue-100 bg-blue-50/80 text-slate-800';
  const importantDescriptionClass = isCitizenDark ? 'font-black text-cyan-200' : 'font-black text-slate-950';
  const dashboard = new EmergencyDashboard(emergencies, user?.role);
  const entityStats = dashboard.stats;
  const groupedEmergencies = dashboard.groupByStatus(entitySearch, entityFilter);
  const entityFilterOptions = [
    { id: 'ALL', label: 'Todos', count: entityStats.total },
    { id: 'PENDING', label: 'Nuevas', count: entityStats.pending },
    { id: 'WAITING', label: 'En espera', count: entityStats.waiting },
    { id: 'IN_PROGRESS', label: 'En atención', count: entityStats.progress },
    { id: 'RESOLVED', label: 'Resueltas', count: entityStats.resolved },
    { id: 'HIGH', label: 'Prioridad alta', count: entityStats.high },
    { id: 'IMAGE', label: 'Con evidencia', count: entityStats.image },
    { id: 'MAP', label: 'Con mapa', count: entityStats.map }
  ];
  const entityColumns = [
    { id: 'PENDING', title: 'Nuevas alertas', icon: <Radio size={16}/>, tone: 'border-red-200 bg-red-50/70 text-red-700' },
    { id: 'WAITING', title: 'En espera', icon: <TimerReset size={16}/>, tone: 'border-sky-200 bg-sky-50/70 text-sky-700' },
    { id: 'IN_PROGRESS', title: 'En atención', icon: <Clock size={16}/>, tone: 'border-amber-200 bg-amber-50/70 text-amber-700' },
    { id: 'RESOLVED', title: 'Resueltas', icon: <CheckCircle size={16}/>, tone: 'border-emerald-200 bg-emerald-50/70 text-emerald-700' }
  ];
  const resourceIcon = user?.role === 'HOSPITAL' ? <Ambulance size={20}/> : user?.role === 'BOMBEROS' ? <Truck size={20}/> : <Users size={20}/>;
  const resourceUnitName = resourceSummary?.unitName || (user?.role === 'HOSPITAL' ? 'ambulancias' : user?.role === 'BOMBEROS' ? 'camiones' : 'policias');
  const resourceTotal = resourceSummary?.totalUnits ?? 0;
  const resourceUsed = resourceSummary?.usedUnits ?? 0;
  const resourceAvailable = resourceSummary?.availableUnits ?? 0;
  const resourceUsagePercent = resourceTotal ? Math.min(Math.round((resourceUsed / resourceTotal) * 100), 100) : 0;
  const detailReport = detailTarget ? EmergencyReport.fromApi(detailTarget, user?.role) : null;
  const detailCoordinates = detailReport ? detailReport.coordinates : null;
  const detailStatus = detailReport ? getStatusConfig(detailReport.status) : null;
  const detailPriority = detailReport ? detailReport.priority : null;
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
                    Registra la escena con ubicación, evidencia y entidades de respuesta en un solo envío.
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
                  <span className="flex items-center justify-between gap-3">
                    <span className={["ml-1 text-[10px] font-black uppercase", citizenLabelClass].join(" ")}>Asunto del reporte</span>
                    <span className={["text-[10px] font-black tabular-nums", titleCounterClass].join(" ")}>{emergencyForm.title.length}/{FIELD_LIMITS.title}</span>
                  </span>
                  <input type="text" placeholder="Ej. Accidente en la avenida" maxLength={FIELD_LIMITS.title} className={["w-full rounded-2xl border p-4 shadow-sm outline-none transition-all focus:ring-4", citizenInputClass].join(" ")} value={emergencyForm.title} onChange={e => setEmergencyForm({...emergencyForm, title: limitText(e.target.value, FIELD_LIMITS.title)})} required />
                </label>
                <label className="space-y-2">
                  <span className="flex items-center justify-between gap-3">
                    <span className={["ml-1 text-[10px] font-black uppercase", citizenLabelClass].join(" ")}>Coordenadas GPS</span>
                    <span className={["text-[10px] font-black tabular-nums", locationCounterClass].join(" ")}>{emergencyForm.location.length}/{FIELD_LIMITS.location}</span>
                  </span>
                  <input type="text" placeholder="Latitud, longitud" maxLength={FIELD_LIMITS.location} className={["w-full rounded-2xl border p-4 shadow-sm outline-none transition-all focus:ring-4", citizenInputClass].join(" ")} value={emergencyForm.location} onChange={e => setEmergencyForm({...emergencyForm, location: limitText(e.target.value, FIELD_LIMITS.location)})} required />
                </label>
                <button type="button" onClick={handleGetLocation} className={["flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl px-5 font-black uppercase text-white shadow-lg transition-all active:scale-95 lg:w-auto", isCitizenDark ? "bg-cyan-700 shadow-cyan-950/50 hover:bg-cyan-600" : "bg-slate-900 shadow-slate-300 hover:bg-blue-700"].join(" ")} title="Obtener ubicación GPS">
                  {isLocating ? <Loader2 className="animate-spin" size={20}/> : <Navigation size={20}/>}
                  <span className="text-xs">GPS</span>
                </button>
              </div>
              <div className={["rounded-3xl border p-5", citizenCardClass].join(" ")}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-700">Análisis con IA</span>
                    <p className={["mt-1 text-xs font-semibold", citizenMutedClass].join(" ")}>Agrega una imagen para ayudar a priorizar la emergencia.</p>
                  </div>
                  <span className={["text-[10px] font-black tabular-nums", descriptionCounterClass].join(" ")}>
                    {emergencyForm.description.length}/{FIELD_LIMITS.description}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <input type="file" accept="image/*" capture="environment" id="cameraInput" className="hidden" onChange={handleImageCapture} />
                    <label htmlFor="cameraInput" className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black uppercase text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700">
                      {isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <Camera size={14}/>} Cámara
                    </label>
                    <input type="file" accept="image/*" id="galleryInput" className="hidden" onChange={handleImageCapture} />
                    <label htmlFor="galleryInput" className={["flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black uppercase shadow-sm transition-all", isCitizenDark ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"].join(" ")}>
                      {isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <Image size={14}/>} Galería
                    </label>
                  </div>
                </div>
                {imagePreview && (
                  <div className={["mt-5 overflow-hidden rounded-2xl border p-2", isCitizenDark ? "border-blue-900/60 bg-blue-950/30" : "border-blue-100 bg-blue-50"].join(" ")}>
                    <img src={imagePreview} className="h-44 w-full rounded-xl object-cover shadow-inner" alt="Evidencia" />
                  </div>
                )}
                {aiDescription.trim() && (
                  <div className={["sigeu-report-textarea mt-5 rounded-2xl border p-5 shadow-inner", descriptionPreviewClass].join(" ")}>
                    {renderHighlightedDescription(aiDescription, importantDescriptionClass)}
                  </div>
                )}
                <textarea placeholder={aiDescription ? "Descripción adicional para las entidades..." : "Descripción del incidente..."} maxLength={FIELD_LIMITS.description} className={["sigeu-report-textarea mt-3 min-h-[180px] w-full rounded-2xl border p-5 outline-none transition-all focus:ring-4", citizenInputClass, isAnalyzing ? "opacity-50 animate-pulse" : ""].join(" ")} rows="6" value={emergencyForm.description} onChange={e => setEmergencyForm({...emergencyForm, description: limitText(e.target.value, FIELD_LIMITS.description)})} required={!aiDescription.trim()} disabled={isAnalyzing}></textarea>
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
                      { id: 'POLICIA', label: 'Policía', detail: 'Robos, violencia y seguridad', icon: <Shield size={19}/>, active: isCitizenDark ? 'border-blue-500/60 bg-blue-950/60 text-blue-100' : 'border-blue-300 bg-blue-50 text-blue-900', iconClass: 'bg-blue-600 text-white' },
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
                  <button type="submit" disabled={selectedEntities.length === 0 || isSendingReport || isAnalyzing} className={`relative flex min-h-[190px] w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl p-6 text-center font-black uppercase italic text-white shadow-xl transition-all active:scale-95 sm:min-h-[210px] ${selectedEntities.length === 0 || isSendingReport || isAnalyzing ? (isCitizenDark ? 'bg-slate-800 text-slate-500 shadow-none cursor-not-allowed' : 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed') : 'bg-[#ff0000] shadow-red-200 hover:bg-red-700'}`}>
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                      {isSendingReport ? <Loader2 className="animate-spin" size={30}/> : selectedEntities.length === 0 ? <AlertTriangle size={30}/> : <ArrowRight size={30}/>}
                    </span>
                    <span className="text-xl tracking-normal sm:text-2xl">{isSendingReport ? 'Enviando...' : selectedEntities.length === 0 ? 'Selecciona entidad' : 'Enviar reporte'}</span>
                    <span className="max-w-xs text-xs not-italic opacity-80">
                      {selectedEntities.length === 0 ? 'El reporte necesita al menos una entidad.' : `Se notificará a ${selectedEntities.length} entidad(es) con la ubicación y evidencia.`}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <>
          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className={[theme.bg, "p-6 text-white md:p-8"].join(" ")}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase">
                      <Radio size={13}/> Central operativa
                    </span>
                    <h3 className="mt-4 text-3xl font-black italic tracking-normal">Incidentes activos</h3>
                    <p className="mt-2 max-w-2xl text-sm font-medium text-white/70">
                      Gestiona alertas nuevas, reportes en atención y casos resueltos desde una sola vista.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                      <p className="text-2xl font-black">{entityStats.pending}</p>
                      <p className="mt-1 text-[10px] font-black uppercase text-white/70">Nuevas</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                      <p className="text-2xl font-black">{entityStats.waiting}</p>
                      <p className="mt-1 text-[10px] font-black uppercase text-white/70">Espera</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                      <p className="text-2xl font-black">{entityStats.progress}</p>
                      <p className="mt-1 text-[10px] font-black uppercase text-white/70">Atención</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                      <p className="text-2xl font-black">{entityStats.resolved}</p>
                      <p className="mt-1 text-[10px] font-black uppercase text-white/70">Resueltas</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      {resourceIcon}
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Recursos operativos</p>
                      <h4 className="text-xl font-black text-slate-900">{resourceAvailable} disponibles</h4>
                      <p className="text-xs font-bold text-slate-500">{resourceUsed} ocupados de {resourceTotal} {resourceUnitName}</p>
                    </div>
                  </div>
                  <div className="min-w-[180px]">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${resourceUsagePercent}%` }}></div>
                    </div>
                    <p className="mt-2 text-right text-[10px] font-black uppercase text-slate-400">{resourceUsagePercent}% en uso</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <Bot size={20}/>
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase text-blue-700">IA operativa</p>
                    <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700">
                      Asigna recursos, atiende casos con cupo, deja alertas en espera y libera unidades al resolver.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              {[
                { label: 'Total', value: entityStats.total, icon: <Layers size={18}/>, color: 'text-slate-700 bg-slate-100' },
                { label: 'Nuevas', value: entityStats.pending, icon: <Radio size={18}/>, color: 'text-red-700 bg-red-100' },
                { label: 'En espera', value: entityStats.waiting, icon: <TimerReset size={18}/>, color: 'text-sky-700 bg-sky-100' },
                { label: 'En atención', value: entityStats.progress, icon: <Clock size={18}/>, color: 'text-amber-700 bg-amber-100' },
                { label: 'Alta prioridad', value: entityStats.high, icon: <AlertTriangle size={18}/>, color: 'text-red-700 bg-red-100' },
                { label: 'Con evidencia', value: entityStats.image, icon: <Image size={18}/>, color: 'text-blue-700 bg-blue-100' }
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className={["flex h-10 w-10 items-center justify-center rounded-xl", item.color].join(" ")}>{item.icon}</span>
                    <span className="text-3xl font-black text-slate-900">{item.value}</span>
                  </div>
                  <p className="mt-3 text-[10px] font-black uppercase text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative min-w-0 flex-1">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input
                    type="text"
                    placeholder="Buscar por asunto, descripción o coordenadas"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm font-semibold outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    value={entitySearch}
                    onChange={e => setEntitySearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {entityFilterOptions.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setEntityFilter(option.id)}
                      className={["rounded-xl border px-3 py-2 text-[10px] font-black uppercase transition-all", entityFilter === option.id ? "border-slate-900 bg-slate-900 text-white shadow-md" : "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-700"].join(" ")}
                    >
                      {option.label} <span className="ml-1 opacity-70">{option.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-4">
              {entityColumns.map(column => (
                <div key={column.id} className="min-h-[280px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className={["mb-4 flex items-center justify-between rounded-2xl border px-4 py-3", column.tone].join(" ")}>
                    <span className="flex items-center gap-2 text-xs font-black uppercase">{column.icon} {column.title}</span>
                    <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black">{groupedEmergencies[column.id].length}</span>
                  </div>
                  {groupedEmergencies[column.id].length === 0 ? (
                    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                      <ListFilter size={24} className="text-slate-300"/>
                      <p className="mt-3 text-xs font-black uppercase text-slate-400">Sin reportes aquí</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupedEmergencies[column.id].map(em => {
                        const status = getStatusConfig(em.status);
                        const isResolved = em.status === 'RESOLVED';
                        const isInProgress = em.status === 'IN_PROGRESS';
                        return (
                          <article key={em.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="text-base font-black italic text-slate-900">{em.title}</h4>
                                <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-slate-400"><Clock size={12}/> {formatEmergencyTime(em.createdAt)}</p>
                              </div>
                              <span className={["shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase", em.priority.className].join(" ")}>
                                {em.priority.label}
                              </span>
                            </div>
                            <p className="mt-3 flex items-start gap-1 text-xs font-bold text-slate-500"><MapPin size={13} className="mt-0.5 shrink-0"/> {em.location || 'Sin ubicación'}</p>
                            <p className="mt-3 max-h-14 overflow-hidden text-sm font-medium leading-relaxed text-slate-600">"{em.description}"</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className={["inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase", status.className].join(" ")}>
                                <span className={["h-2 w-2 rounded-full", status.dot].join(" ")}></span>{status.label}
                              </span>
                              {em.image && <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700"><Image size={11}/> Evidencia</span>}
                              {em.coordinates && <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[10px] font-black uppercase text-cyan-700"><MapPin size={11}/> Mapa</span>}
                              {em.assignedUnits > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-600"><Users size={11}/> {em.assignedUnits} {em.resourceLabel || resourceUnitName}</span>}
                            </div>
                            {em.operationalNote && (
                              <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold leading-relaxed text-blue-800">{em.operationalNote}</p>
                            )}
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button type="button" onClick={() => setDetailTarget(em)} className="rounded-xl bg-slate-900 p-3 text-xs font-black uppercase text-white transition-all hover:bg-slate-700">Detalle</button>
                              {em.coordinates ? (
                                <a href={getIncidentMapUrl(em.coordinates)} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white p-3 text-center text-xs font-black uppercase text-blue-700 transition-all hover:bg-blue-50">Mapa</a>
                              ) : (
                                <button type="button" disabled className="rounded-xl border border-slate-200 bg-slate-100 p-3 text-xs font-black uppercase text-slate-400">Sin mapa</button>
                              )}
                              <button type="button" onClick={() => copyEmergencyLocation(em.location)} className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-black uppercase text-slate-600 transition-all hover:bg-slate-100">Copiar</button>
                              {em.image ? (
                                <button type="button" onClick={() => setSelectedImage(em.image)} className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-black uppercase text-blue-700 transition-all hover:bg-blue-100">Evidencia</button>
                              ) : (
                                <button type="button" disabled className="rounded-xl border border-slate-200 bg-slate-100 p-3 text-xs font-black uppercase text-slate-400">Sin foto</button>
                              )}
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {!isResolved && !isInProgress && (
                                <button type="button" onClick={() => updateStatus(em.id, 'IN_PROGRESS')} className="rounded-xl bg-amber-500 p-3 text-xs font-black uppercase text-white shadow-sm transition-all hover:bg-amber-600">Atender</button>
                              )}
                              {!isResolved && (
                                <button type="button" onClick={() => updateStatus(em.id, 'RESOLVED')} className="rounded-xl bg-emerald-600 p-3 text-xs font-black uppercase text-white shadow-sm transition-all hover:bg-emerald-700">Resolver</button>
                              )}
                              <button type="button" onClick={() => requestDeleteEmergency(em)} className="rounded-xl border border-red-100 bg-white p-3 text-xs font-black uppercase text-red-500 transition-all hover:bg-red-50">Borrar</button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </section>
          </div>
          </>
        )}
      </main>
      
      

      {appNotice && (
        <div className="fixed right-4 top-24 z-[120] max-w-sm animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/20">
          <div className="flex items-start gap-3">
            <div className={["mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white", appNotice.type === 'error' ? "bg-red-600" : appNotice.type === 'success' ? "bg-emerald-600" : "bg-amber-500"].join(" ")}>
              <AlertTriangle size={18}/>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase text-slate-500">SIGEU</p>
              <p className="mt-1 text-sm font-bold leading-relaxed text-slate-800">{appNotice.message}</p>
            </div>
            <button type="button" onClick={() => setAppNotice(null)} className="rounded-lg p-1 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700">
              <X size={16}/>
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 animate-fade-in-up" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle size={24}/>
              </div>
              <div>
                <h3 className="text-xl font-black italic text-slate-900">Eliminar incidente</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                  Esta acción borrará el reporte "{deleteTarget.title}". Puedes cancelar si aún necesitas conservarlo.
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black uppercase text-slate-600 transition-all hover:bg-slate-50">
                Cancelar
              </button>
              <button type="button" onClick={deleteEmergency} className="rounded-2xl bg-red-600 p-4 text-sm font-black uppercase text-white shadow-lg shadow-red-100 transition-all hover:bg-red-700 active:scale-95">
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {detailTarget && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/85 p-4 animate-fade-in-up" onClick={() => setDetailTarget(null)}>
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className={[theme.bg, "sticky top-0 z-10 flex items-start justify-between gap-4 p-5 text-white md:p-6"].join(" ")}>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase text-white/70"><FileText size={13}/> Detalle del incidente</p>
                <h3 className="mt-2 text-2xl font-black italic tracking-normal">{detailTarget.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {detailStatus && (
                    <span className={["inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-black uppercase", detailStatus.className].join(" ")}>
                      <span className={["h-2 w-2 rounded-full", detailStatus.dot].join(" ")}></span>{detailStatus.label}
                    </span>
                  )}
                  {detailPriority && (
                    <span className={["inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-black uppercase", detailPriority.className].join(" ")}>
                      <span className={["h-2 w-2 rounded-full", detailPriority.dot].join(" ")}></span>Prioridad {detailPriority.label}
                    </span>
                  )}
                  {detailReport?.assignedUnits > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase text-white">
                      <Users size={12}/> {detailReport.assignedUnits} {detailReport.resourceLabel || resourceUnitName}
                    </span>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setDetailTarget(null)} className="rounded-xl bg-white/10 p-2 text-white transition-all hover:bg-white/20">
                <X size={20}/>
              </button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.25fr)] md:p-6">
              <section className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase text-slate-400">Descripción</p>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-700">"{detailTarget.description}"</p>
                </div>
                {detailReport?.operationalNote && (
                  <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                        <Bot size={17}/>
                      </span>
                      <div>
                        <p className="text-[10px] font-black uppercase text-blue-700">IA operativa</p>
                        <p className="mt-2 text-sm font-bold leading-relaxed text-blue-950">{detailReport.operationalNote}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-xs font-bold text-blue-900">
                      {detailReport.autoStartedAt && (
                        <p className="flex items-center gap-2"><Clock size={14}/> Atención iniciada: {formatEmergencyTime(detailReport.autoStartedAt)}</p>
                      )}
                      {detailReport.autoResolveAt && (
                        <p className="flex items-center gap-2"><CheckCircle size={14}/> Resolución estimada: {formatEmergencyTime(detailReport.autoResolveAt)}</p>
                      )}
                      {detailReport.autoDeleteAt && (
                        <p className="flex items-center gap-2"><TimerReset size={14}/> Borrado automático: {formatEmergencyTime(detailReport.autoDeleteAt)}</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-[10px] font-black uppercase text-slate-400">Ubicación</p>
                  <p className="mt-3 flex items-start gap-2 text-sm font-bold text-slate-700"><MapPin size={16} className="mt-0.5 shrink-0 text-red-600"/> {detailTarget.location || 'Sin ubicación'}</p>
                  <p className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-400"><Clock size={14}/> {formatEmergencyTime(detailTarget.createdAt)} · Hora Colombia</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => copyEmergencyLocation(detailTarget.location)} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-black uppercase text-slate-600 transition-all hover:bg-slate-50">
                    <Clipboard size={15}/> Copiar
                  </button>
                  {detailCoordinates ? (
                    <a href={getIncidentMapUrl(detailCoordinates)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-black uppercase text-blue-700 transition-all hover:bg-blue-100">
                      <ExternalLink size={15}/> Mapa
                    </a>
                  ) : (
                    <button type="button" disabled className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-xs font-black uppercase text-slate-400">Sin mapa</button>
                  )}
                  {detailTarget.image ? (
                    <button type="button" onClick={() => setSelectedImage(detailTarget.image)} className="flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-black uppercase text-blue-700 transition-all hover:bg-blue-100">
                      <Eye size={15}/> Evidencia
                    </button>
                  ) : (
                    <button type="button" disabled className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-xs font-black uppercase text-slate-400">Sin foto</button>
                  )}
                  <button type="button" onClick={() => requestDeleteEmergency(detailTarget)} className="rounded-2xl border border-red-100 bg-white p-4 text-xs font-black uppercase text-red-500 transition-all hover:bg-red-50">
                    Borrar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {detailTarget.status !== 'RESOLVED' && detailTarget.status !== 'IN_PROGRESS' && (
                    <button type="button" onClick={() => updateStatus(detailTarget.id, 'IN_PROGRESS')} className="rounded-2xl bg-amber-500 p-4 text-xs font-black uppercase text-white shadow-sm transition-all hover:bg-amber-600">
                      Atender
                    </button>
                  )}
                  {detailTarget.status !== 'RESOLVED' && (
                    <button type="button" onClick={() => updateStatus(detailTarget.id, 'RESOLVED')} className="rounded-2xl bg-emerald-600 p-4 text-xs font-black uppercase text-white shadow-sm transition-all hover:bg-emerald-700">
                      Resolver
                    </button>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                {detailCoordinates ? (
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-inner">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                      <span className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><MapPin size={14} className="text-red-600"/> Mapa operativo</span>
                      <a href={getIncidentMapUrl(detailCoordinates)} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800">Abrir grande</a>
                    </div>
                    <iframe
                      title={`Mapa detallado del incidente ${detailTarget.id}`}
                      src={getIncidentMapEmbedUrl(detailCoordinates)}
                      className="h-[360px] w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                ) : (
                  <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-amber-200 bg-amber-50 p-5 text-center">
                    <MapPin size={28} className="text-amber-500"/>
                    <p className="mt-3 text-xs font-black uppercase text-amber-700">Ubicación sin coordenadas válidas</p>
                  </div>
                )}
                {detailTarget.image && (
                  <button type="button" onClick={() => setSelectedImage(detailTarget.image)} className="block w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 p-2 text-left transition-all hover:border-blue-200">
                    <img src={detailTarget.image} className="h-56 w-full rounded-2xl object-cover" alt="Evidencia del incidente" />
                  </button>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 bg-slate-950/90 z-[130] flex items-center justify-center p-4 animate-fade-in-up" onClick={() => setSelectedImage(null)}>
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
