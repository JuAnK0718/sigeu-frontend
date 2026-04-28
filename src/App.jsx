import { useState, useEffect } from 'react'
import { Shield, Flame, Hospital, User, Lock, ArrowRight, LogOut, AlertTriangle, MapPin, Send } from 'lucide-react'

function App() {
  const [view, setView] = useState('LOGIN')
  const [user, setUser] = useState(null)
  const [emergencies, setEmergencies] = useState([])
  const [loginData, setLoginData] = useState({ username: '', password: '' })
  const [emergencyForm, setEmergencyForm] = useState({ title: '', description: '', location: '', type: 'ACCIDENT', targetEntity: 'POLICE' })

  const API = 'https://sigeu-backend-production.up.railway.app/api'

  useEffect(() => {
    if (view === 'DASHBOARD' && user?.role !== 'CITIZEN') {
      fetch(`${API}/emergencies?target=${user.role}`).then(res => res.json()).then(setEmergencies)
    }
  }, [view, user])

  const handleLogin = async (e) => {
    e.preventDefault()
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    })
    if (res.ok) { setUser(await res.json()); setView('DASHBOARD') }
    else alert('Error')
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const res = await fetch(`${API}/emergencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emergencyForm)
    })
    if (res.ok) { alert('Enviado'); setEmergencyForm({ title: '', description: '', location: '', type: 'ACCIDENT', targetEntity: 'POLICE' }) }
  }

  if (view === 'LOGIN') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="bg-red-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"><AlertTriangle /></div>
            <h1 className="text-4xl font-black italic italic tracking-tighter">SIGEU</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-4 text-gray-500" size={20} />
              <input type="text" placeholder="Usuario" className="w-full bg-black/20 border border-white/10 p-4 pl-12 rounded-xl outline-none" onChange={e => setLoginData({...loginData, username: e.target.value})} />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-gray-500" size={20} />
              <input type="password" placeholder="Contraseña" className="w-full bg-black/20 border border-white/10 p-4 pl-12 rounded-xl outline-none" onChange={e => setLoginData({...loginData, password: e.target.value})} />
            </div>
            <button className="w-full bg-blue-600 p-4 rounded-xl font-bold flex items-center justify-center gap-2">Ingresar <ArrowRight /></button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-[#0f172a] text-white p-6 flex justify-between items-center">
        <h2 className="font-black italic text-2xl">SIGEU</h2>
        <button onClick={() => setView('LOGIN')} className="text-red-500 flex items-center gap-2 font-bold"><LogOut /> SALIR</button>
      </nav>
      <main className="max-w-4xl mx-auto p-6">
        {user?.role === 'CITIZEN' ? (
          <form onSubmit={handleSend} className="bg-white p-8 rounded-3xl shadow-sm space-y-4">
            <input type="text" placeholder="¿Qué sucede?" className="w-full p-4 bg-slate-50 rounded-xl" value={emergencyForm.title} onChange={e => setEmergencyForm({...emergencyForm, title: e.target.value})} />
            <input type="text" placeholder="Ubicación" className="w-full p-4 bg-slate-50 rounded-xl" value={emergencyForm.location} onChange={e => setEmergencyForm({...emergencyForm, location: e.target.value})} />
            <textarea placeholder="Descripción" className="w-full p-4 bg-slate-50 rounded-xl" rows="3" value={emergencyForm.description} onChange={e => setEmergencyForm({...emergencyForm, description: e.target.value})}></textarea>
            <select className="w-full p-4 bg-slate-50 rounded-xl font-bold text-red-600" value={emergencyForm.targetEntity} onChange={e => setEmergencyForm({...emergencyForm, targetEntity: e.target.value})}>
              <option value="POLICE">Policía</option>
              <option value="FIREFIGHTERS">Bomberos</option>
              <option value="HOSPITAL">Hospital</option>
            </select>
            <button className="w-full bg-red-600 text-white p-4 rounded-xl font-black">ENVIAR REPORTE</button>
          </form>
        ) : (
          <div className="space-y-4">
            <h3 className="text-2xl font-black">Bandeja: {user?.role}</h3>
            {emergencies.map(em => (
              <div key={em.id} className="bg-white p-6 rounded-2xl border-l-[10px] border-red-600 shadow-sm">
                <h4 className="font-bold text-xl">{em.title}</h4>
                <p className="text-slate-500">📍 {em.location}</p>
                <p className="mt-2 italic">"{em.description}"</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
export default App