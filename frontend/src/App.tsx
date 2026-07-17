import { useState } from 'react'
import { WagmiProvider, useAccount, useConnect, useDisconnect } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/web3'
import { Brush, Search, Zap, Crosshair, Award, MapPin, CheckCircle2 } from 'lucide-react'

// Import assets
import forestMap from './assets/forest_map.jpg'
import cityMap from './assets/city_map.jpg'
import spaceMap from './assets/space_map.jpg'
import underwaterMap from './assets/underwater_map.jpg'

const mapImages = [forestMap, cityMap, spaceMap, underwaterMap]
const mapNames = ['Forest', 'City', 'Space', 'Underwater']



const queryClient = new QueryClient()

function GameContent() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

  const [mode, setMode] = useState<'hider' | 'seeker' | null>(null)
  const [map, setMap] = useState<number>(0)
  const [bet, setBet] = useState('0.01')
  const [inGame, setInGame] = useState(false)
  const [grid, setGrid] = useState<number[]>(Array(100).fill(0)) // 10x10 grid
  const [hiddenIndex, setHiddenIndex] = useState<number | null>(null)
  const [gameStatus, setGameStatus] = useState<'waiting' | 'ready' | 'finished'>('waiting')
  
  // Simulated transactions since this is a demo without a real wallet balance for the pot
  const [txPending, setTxPending] = useState(false)

  const startGame = () => {
    if (!mode || !isConnected) return
    setInGame(true)
    setGrid(Array(100).fill(0))
    setHiddenIndex(null)
    setGameStatus('waiting')
  }

  const handleCellClick = (index: number) => {
    if (gameStatus === 'finished') return

    if (mode === 'hider') {
      if (gameStatus === 'ready') return // Already hidden
      setHiddenIndex(index)
    } else {
      // Seeker
      if (gameStatus === 'waiting') return // Waiting for hider
      
      // Simulate checking if found
      const newGrid = [...grid]
      if (index === hiddenIndex) {
        newGrid[index] = 2 // Found!
        setGameStatus('finished')
        alert("You found it! You win the pot!")
      } else {
        newGrid[index] = 1 // Missed
      }
      setGrid(newGrid)
    }
  }

  const confirmHide = async () => {
    if (hiddenIndex === null) return
    setTxPending(true)
    // Simulate Blockchain TX for demo
    setTimeout(() => {
      setTxPending(false)
      setGameStatus('ready')
    }, 1500)
  }

  if (inGame) {
    return (
      <div className="flex flex-col h-screen p-6 bg-ritual-dark">
        <header className="flex justify-between items-center mb-6 bg-slate-800/80 p-4 rounded-xl border border-slate-700 backdrop-blur-md shadow-lg">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-ritual-primary to-ritual-accent bg-clip-text text-transparent drop-shadow-sm">Ritual Hide & Paint</h1>
            <p className="text-slate-400 text-sm">Mode: <span className="text-white capitalize font-semibold">{mode}</span> | Map: <span className="text-white font-semibold">{mapNames[map]}</span></p>
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
            <button onClick={() => setInGame(false)} className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-semibold">Quit Game</button>
          </div>
        </header>

        <main className="flex-1 rounded-2xl border-2 border-slate-700 overflow-hidden flex flex-col relative bg-slate-900 shadow-2xl">
          {/* Top Info Bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-600 shadow-xl flex items-center gap-3">
            {mode === 'hider' && gameStatus === 'waiting' && <span className="text-ritual-accent font-bold animate-pulse">Click a grid cell to hide your item!</span>}
            {mode === 'hider' && gameStatus === 'ready' && <span className="text-white font-bold"><CheckCircle2 className="inline text-ritual-accent mr-2" size={20} />Item Hidden. Waiting for Seeker...</span>}
            
            {mode === 'seeker' && gameStatus === 'waiting' && <span className="text-yellow-400 font-bold">Waiting for Hider to place item... (Simulated Demo: Click anywhere to guess)</span>}
            {mode === 'seeker' && gameStatus === 'finished' && <span className="text-ritual-accent font-bold text-xl">🎉 Game Over! Winner 🎉</span>}
          </div>

          <div className="flex-1 relative">
            <img src={mapImages[map]} alt="Map" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            
            {/* 10x10 Grid Overlay */}
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 gap-0 p-8 max-w-4xl max-h-4xl mx-auto my-auto aspect-square">
              {grid.map((cellState, index) => (
                <div 
                  key={index}
                  onClick={() => handleCellClick(index)}
                  className={`
                    border border-white/10 hover:border-white/50 hover:bg-white/10 cursor-pointer transition-all flex items-center justify-center
                    ${mode === 'hider' && hiddenIndex === index ? 'bg-ritual-primary/40 border-ritual-primary ring-2 ring-ritual-primary ring-inset' : ''}
                    ${cellState === 1 ? 'bg-red-500/30' : ''}
                    ${cellState === 2 ? 'bg-green-500/50' : ''}
                  `}
                >
                  {mode === 'hider' && hiddenIndex === index && <MapPin className="text-white drop-shadow-md" />}
                  {cellState === 1 && <span className="text-red-300 font-bold drop-shadow-md">X</span>}
                  {cellState === 2 && <MapPin className="text-green-300 drop-shadow-md animate-bounce" />}
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          {mode === 'hider' && gameStatus === 'waiting' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
               <button 
                onClick={confirmHide}
                disabled={hiddenIndex === null || txPending}
                className={`px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all ${
                  hiddenIndex !== null ? 'bg-ritual-primary hover:bg-purple-500 text-white hover:-translate-y-1' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {txPending ? 'Confirming on Chain...' : `Confirm Hide & Stake ${bet} RITUAL`}
              </button>
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ritual-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-ritual-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-ritual-accent/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-5xl w-full bg-slate-800/40 p-10 rounded-3xl border border-slate-700 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-ritual-primary via-purple-400 to-ritual-accent bg-clip-text text-transparent tracking-tight">Ritual Hide & Paint</h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">A decentralized canvas game where you hide art and seek glory on the Ritual Testnet. Powered by TEE Precompiles for ultimate fairness.</p>
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-700 text-center max-w-sm w-full shadow-lg">
              <Award className="w-20 h-20 text-ritual-primary mx-auto mb-6 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
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
              <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-ritual-primary to-ritual-accent flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{address?.slice(2, 4)}</span>
                  </div>
                  <span className="text-slate-300 font-mono text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                </div>
                <button onClick={() => disconnect()} className="text-sm px-3 py-1 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors font-medium">Disconnect</button>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Crosshair className="text-ritual-primary"/> Select Role</h3>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setMode('hider')}
                    className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${mode === 'hider' ? 'border-ritual-primary bg-ritual-primary/20 text-white shadow-lg shadow-ritual-primary/20' : 'border-slate-700 text-slate-400 hover:border-slate-500 bg-slate-900/50'}`}
                  >
                    Hider
                  </button>
                  <button 
                    onClick={() => setMode('seeker')}
                    className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${mode === 'seeker' ? 'border-ritual-accent bg-ritual-accent/20 text-white shadow-lg shadow-ritual-accent/20' : 'border-slate-700 text-slate-400 hover:border-slate-500 bg-slate-900/50'}`}
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
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-2xl font-mono text-white focus:outline-none focus:border-ritual-primary focus:ring-1 focus:ring-ritual-primary transition-all shadow-inner"
                  step="0.01"
                />
              </div>
            </div>

            {/* Right Column: Map Selection */}
            <div className="space-y-8 flex flex-col">
              <div>
                <h3 className="text-xl font-bold mb-4">Select Map</h3>
                <div className="grid grid-cols-2 gap-4">
                  {mapNames.map((m, idx) => (
                    <button
                      key={m}
                      onClick={() => setMap(idx)}
                      className={`relative h-28 rounded-xl font-semibold border-2 overflow-hidden transition-all group ${map === idx ? 'border-ritual-primary ring-4 ring-ritual-primary/20 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}
                    >
                      <img src={mapImages[idx]} alt={m} className={`absolute inset-0 w-full h-full object-cover transition-opacity ${map === idx ? 'opacity-50' : 'opacity-30 group-hover:opacity-40'}`} />
                      <span className="relative z-10 text-lg tracking-wide drop-shadow-md">{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-auto bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700 relative overflow-hidden shadow-lg">
                <div className="absolute right-0 top-0 opacity-5 -translate-y-4 translate-x-4"><Zap size={140} /></div>
                <h4 className="font-bold text-ritual-accent mb-2 text-lg">Daily Challenge</h4>
                <p className="text-sm text-slate-400 mb-4">Win 3 games in a row to earn an exclusive NFT Badge.</p>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-ritual-accent/20 border-2 border-ritual-accent flex items-center justify-center text-sm font-bold text-ritual-accent shadow-[0_0_10px_rgba(16,185,129,0.3)]">1</div>
                  <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-sm font-bold text-slate-500">2</div>
                  <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-sm font-bold text-slate-500">3</div>
                </div>
              </div>

              <button 
                onClick={startGame}
                disabled={!mode}
                className={`w-full py-5 rounded-xl font-extrabold text-xl transition-all transform shadow-xl ${mode ? 'bg-gradient-to-r from-ritual-primary to-ritual-accent text-white hover:shadow-ritual-primary/40 hover:-translate-y-1' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
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
