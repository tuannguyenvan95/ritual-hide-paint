import { useState } from 'react'
import { WagmiProvider, useAccount, useConnect, useDisconnect } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/web3'
import { Brush, Search, Zap, Crosshair, Award } from 'lucide-react'

const queryClient = new QueryClient()

function GameContent() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

  const [mode, setMode] = useState<'hider' | 'seeker' | null>(null)
  const [map, setMap] = useState<number>(0)
  const [bet, setBet] = useState('0.01')
  const [inGame, setInGame] = useState(false)

  const maps = ['Forest', 'City', 'Space', 'Underwater']

  const startGame = () => {
    if (!mode || !isConnected) return
    setInGame(true)
  }

  if (inGame) {
    return (
      <div className="flex flex-col h-screen p-6 bg-ritual-dark">
        <header className="flex justify-between items-center mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-ritual-primary to-ritual-accent bg-clip-text text-transparent">Ritual Hide & Paint</h1>
            <p className="text-slate-400 text-sm">Mode: <span className="text-white capitalize">{mode}</span> | Map: <span className="text-white">{maps[map]}</span></p>
          </div>
          <div className="flex gap-4">
            {mode === 'hider' ? (
              <>
                <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2 transition-colors"><Brush size={18} /> Blur</button>
                <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2 transition-colors"><Crosshair size={18} /> Camouflage</button>
              </>
            ) : (
              <>
                <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2 transition-colors"><Search size={18} /> Zoom</button>
                <button className="px-4 py-2 bg-ritual-accent hover:bg-ritual-accentHover text-ritual-dark font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-ritual-accent/20 transition-all"><Zap size={18} /> AI Hint</button>
              </>
            )}
            <button onClick={() => setInGame(false)} className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">Quit Game</button>
          </div>
        </header>

        <main className="flex-1 rounded-2xl border-2 border-slate-700 border-dashed flex items-center justify-center bg-slate-800/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-ritual-primary/5 to-ritual-accent/5 pointer-events-none"></div>
          <p className="text-slate-500 text-lg flex items-center gap-3">
            <Brush className="animate-pulse" /> Interactive Canvas Area for {maps[map]}
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ritual-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-ritual-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-ritual-accent/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl w-full bg-slate-800/40 p-8 rounded-3xl border border-slate-700 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-ritual-primary via-purple-400 to-ritual-accent bg-clip-text text-transparent tracking-tight">Ritual Hide & Paint</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">A decentralized canvas game where you hide art and seek glory on the Ritual Testnet. Powered by TEE Precompiles for ultimate fairness.</p>
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-700 text-center max-w-sm w-full">
              <Award className="w-16 h-16 text-ritual-primary mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-2">Ready to Play?</h2>
              <p className="text-slate-400 mb-8">Connect your wallet to start hiding or seeking on the canvas.</p>
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  className="w-full py-4 bg-gradient-to-r from-ritual-primary to-purple-600 hover:from-purple-500 hover:to-ritual-primary text-white font-bold rounded-xl shadow-lg shadow-ritual-primary/30 transition-all transform hover:-translate-y-1"
                >
                  Connect {connector.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left Column: Settings */}
            <div className="space-y-8">
              <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <span className="text-slate-300 font-mono text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                <button onClick={() => disconnect()} className="text-sm text-red-400 hover:text-red-300">Disconnect</button>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Crosshair className="text-ritual-primary"/> Select Role</h3>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setMode('hider')}
                    className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${mode === 'hider' ? 'border-ritual-primary bg-ritual-primary/20 text-white shadow-lg shadow-ritual-primary/20' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    Hider
                  </button>
                  <button 
                    onClick={() => setMode('seeker')}
                    className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${mode === 'seeker' ? 'border-ritual-accent bg-ritual-accent/20 text-white shadow-lg shadow-ritual-accent/20' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    Seeker
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Award className="text-ritual-accent"/> Bet Amount (RITUAL)</h3>
                <input 
                  type="number" 
                  value={bet}
                  onChange={(e) => setBet(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-xl font-mono text-white focus:outline-none focus:border-ritual-primary focus:ring-1 focus:ring-ritual-primary transition-all"
                  step="0.01"
                />
              </div>
            </div>

            {/* Right Column: Map Selection */}
            <div className="space-y-8 flex flex-col">
              <div>
                <h3 className="text-xl font-bold mb-4">Select Map</h3>
                <div className="grid grid-cols-2 gap-4">
                  {maps.map((m, idx) => (
                    <button
                      key={m}
                      onClick={() => setMap(idx)}
                      className={`h-24 rounded-xl font-semibold border-2 transition-all ${map === idx ? 'border-purple-400 bg-purple-400/20 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-auto bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700 relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10"><Zap size={120} /></div>
                <h4 className="font-bold text-ritual-accent mb-2">Daily Challenge</h4>
                <p className="text-sm text-slate-300 mb-4">Win 3 games in a row to earn an exclusive NFT Badge.</p>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-ritual-accent/20 border border-ritual-accent flex items-center justify-center text-xs font-bold text-ritual-accent">1</div>
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs text-slate-500">2</div>
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs text-slate-500">3</div>
                </div>
              </div>

              <button 
                onClick={startGame}
                disabled={!mode}
                className={`w-full py-5 rounded-xl font-extrabold text-xl transition-all transform ${mode ? 'bg-gradient-to-r from-ritual-primary to-ritual-accent text-white hover:shadow-xl hover:shadow-ritual-primary/30 hover:-translate-y-1' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
              >
                {mode ? `Start Game as ${mode.charAt(0).toUpperCase() + mode.slice(1)}` : 'Select a Role'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <GameContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
