function App() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-10 shadow-xl text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 bg-red-500">Switch SAB Local</h1>
        <p className="text-gray-500 text-sm mb-6">Projet initialisé ✅</p>
        <div className="flex gap-3 justify-center">
          <span className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-sm font-medium">Admin</span>
          <span className="bg-purple-100 text-purple-700 px-4 py-1 rounded-full text-sm font-medium">Gérant</span>
          <span className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-sm font-medium">Client</span>
        </div>
      </div>
    </div>
  )
}

export default App
