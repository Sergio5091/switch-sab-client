const comptes = [
  { role: 'Admin',    couleur: 'orange',  pseudo: 'admin',   telephone: '+22900000001', mdp: 'admin123'  },
  { role: 'Gérant 1', couleur: 'purple',  pseudo: 'gerant1', telephone: '+22900000002', mdp: 'gerant123' },
  { role: 'Gérant 2', couleur: 'purple',  pseudo: 'gerant2', telephone: '+22900000003', mdp: 'gerant123' },
  { role: 'Client',   couleur: 'green',   pseudo: 'kofi',    telephone: '+22900000004', mdp: 'client123' },
  { role: 'Client',   couleur: 'green',   pseudo: 'amina',   telephone: '+22900000005', mdp: 'client123' },
]

const badge: Record<string, string> = {
  orange: 'bg-orange-100 text-orange-700',
  purple: 'bg-purple-100 text-purple-700',
  green:  'bg-green-100 text-green-700',
}

function App() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-10 shadow-xl w-full max-w-lg">

        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-1 text-center">Switch SAB Local</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Projet initialisé ✅ — Backend sur port 3000</p>

        {/* Comptes démo */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Comptes de test
        </h2>
        <div className="space-y-2">
          {comptes.map((c, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge[c.couleur]}`}>
                  {c.role}
                </span>
                <span className="text-sm font-mono text-gray-700">{c.pseudo}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{c.telephone}</p>
                <p className="text-xs font-mono text-gray-500">{c.mdp}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Info API */}
        <div className="mt-6 bg-gray-900 rounded-xl px-4 py-3 text-xs font-mono text-green-400">
          <p>POST http://localhost:3000/auth/login</p>
          <p className="text-gray-500 mt-1">{'{ "telephone": "...", "motDePasse": "..." }'}</p>
        </div>

      </div>
    </div>
  )
}

export default App
