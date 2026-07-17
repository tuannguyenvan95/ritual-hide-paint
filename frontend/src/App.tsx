import { useState, useRef, useEffect } from 'react'
import { WagmiProvider, useAccount, useConnect, useDisconnect } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/web3'
import { Brush, Crosshair, Award, CheckCircle2, Eraser, Bot, Users, Pipette } from 'lucide-react'

import forestMap from './assets/forest_map.jpg'
import cityMap from './assets/city_map.jpg'
import spaceMap from './assets/space_map.jpg'
import underwaterMap from './assets/underwater_map.jpg'

const mapImages = [spaceMap, underwaterMap, cityMap, forestMap]
const mapNames = ['Space', 'Underwater', 'City', 'Forest']
const mapDifficulties = ['Easy', 'Easy', 'Normal', 'Hard']
const mapDiffColors = ['text-green-400 border-green-400/30', 'text-green-400 border-green-400/30', 'text-yellow-400 border-yellow-400/30', 'text-red-400 border-red-400/30']

const queryClient = new QueryClient()

function colorDistance(rgb1: number[], rgb2: number[]) {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  )
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).padStart(6, '0')
}

const CHARACTER_MASK = [
  0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
  0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,
  0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,
  0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,
  0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
  0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,
  0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,
  0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,
  0,0,0,1,1,1,0,0,0,0,1,1,1,0,0,0,
  0,0,0,1,1,1,0,0,0,0,1,1,1,0,0,0,
  0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0
]

function GameContent() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

  const [mode, setMode] = useState<'hider' | 'seeker' | null>(null)
  const [opponent, setOpponent] = useState<'bot' | 'pvp'>('bot')
  const [map, setMap] = useState<number>(0)
  
  const [inGame, setInGame] = useState(false)
  const [grid, setGrid] = useState<number[]>(Array(100).fill(0))
  const [hiddenIndex, setHiddenIndex] = useState<number | null>(null)
  const [gameStatus, setGameStatus] = useState<'waiting' | 'painting' | 'ready' | 'finished'>('waiting')
  
  const [paintColor, setPaintColor] = useState('#8b5cf6')
  const [activeTool, setActiveTool] = useState<'brush' | 'eraser' | 'picker'>('brush')
  const [characterPixels, setCharacterPixels] = useState<string[]>(
    CHARACTER_MASK.map(m => m === 1 ? '#8b5cf6' : 'transparent')
  ) 
  
  const imgRef = useRef<HTMLImageElement>(null)
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null)

  const [txPending, setTxPending] = useState(false)
  const [botMessage, setBotMessage] = useState('')

  // Dynamically pixelated map
  const [pixelatedMapUrl, setPixelatedMapUrl] = useState<string>('')

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = mapImages[map]
    img.onload = () => {
      const canvas = document.createElement('canvas')
      // 10 cells * 16 pixels/cell = 160x160 total pixel resolution
      canvas.width = 160
      canvas.height = 160
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, 160, 160)
        setPixelatedMapUrl(canvas.toDataURL('image/png'))
      }
    }
  }, [map])

  const startGame = () => {
    if (!mode || !isConnected) return
    setInGame(true)
    setGrid(Array(100).fill(0))
    setHiddenIndex(null)
    setCharacterPixels(CHARACTER_MASK.map(m => m === 1 ? '#8b5cf6' : 'transparent'))
    setGameStatus('waiting')
    setBotMessage('')
  }

  const handleCellClick = (index: number) => {
    if (gameStatus === 'finished') return

    if (mode === 'hider') {
      if (gameStatus === 'ready' || gameStatus === 'painting') return 
      setHiddenIndex(index)
      setGameStatus('painting')
    } else {
      if (gameStatus === 'waiting' || opponent === 'bot') return 
      const newGrid = [...grid]
      if (index === hiddenIndex) {
        newGrid[index] = 2 
        setGameStatus('finished')
        alert("You found it! You win the pot!")
      } else {
        newGrid[index] = 1 
      }
      setGrid(newGrid)
    }
  }

  const handlePaintPixel = (idx: number) => {
    if (activeTool === 'picker') {
      pickColorFromBackground(idx)
      setActiveTool('brush')
      return
    }

    if (CHARACTER_MASK[idx] === 0) return 

    const newPixels = [...characterPixels]
    newPixels[idx] = activeTool === 'eraser' ? 'transparent' : paintColor
    setCharacterPixels(newPixels)
  }

  const pickColorFromBackground = (idx: number) => {
    if (!hiddenCanvasRef.current || hiddenIndex === null || !pixelatedMapUrl) return
    
    const canvas = hiddenCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const img = new Image()
    img.src = pixelatedMapUrl
    img.onload = () => {
      canvas.width = 160
      canvas.height = 160
      ctx.drawImage(img, 0, 0)
      
      const cellWidth = 16
      const cellHeight = 16
      const cellX = hiddenIndex % 10
      const cellY = Math.floor(hiddenIndex / 10)
      
      const pxX = idx % 16
      const pxY = Math.floor(idx / 16)
      
      const sampleX = cellX * cellWidth + pxX
      const sampleY = cellY * cellHeight + pxY
      
      const imgData = ctx.getImageData(sampleX, sampleY, 1, 1)
      const [r, g, b] = imgData.data
      const pickedHex = rgbToHex(r, g, b)
      setPaintColor(pickedHex)
    }
  }

  const confirmHideAndBotSeek = async () => {
    if (hiddenIndex === null) return
    setGameStatus('ready')
    setTxPending(true)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    setTxPending(false)

    if (opponent === 'bot') {
      runBotAILogic()
    }
  }

  const runBotAILogic = () => {
    setBotMessage("Bot AI is scanning the environment pixels...")
    
    setTimeout(() => {
      if (hiddenCanvasRef.current && hiddenIndex !== null && pixelatedMapUrl) {
        const canvas = hiddenCanvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const img = new Image()
          img.src = pixelatedMapUrl
          img.onload = () => {
            canvas.width = 160
            canvas.height = 160
            ctx.drawImage(img, 0, 0)
            
            const cellWidth = 16
            const cellHeight = 16
            const x = hiddenIndex % 10
            const y = Math.floor(hiddenIndex / 10)
            
            const imgData = ctx.getImageData(x * cellWidth, y * cellHeight, cellWidth, cellHeight)
            const data = imgData.data
            
            let r = 0, g = 0, b = 0
            for (let i = 0; i < data.length; i += 4) {
              r += data[i]
              g += data[i+1]
              b += data[i+2]
            }
            const pixelCount = data.length / 4
            const avgMapColor = [r/pixelCount, g/pixelCount, b/pixelCount]

            let cr = 0, cg = 0, cb = 0, paintedCount = 0
            characterPixels.forEach((hex, idx) => {
              if (CHARACTER_MASK[idx] === 1 && hex !== 'transparent') {
                const hexNum = hex.replace('#', '')
                cr += parseInt(hexNum.substring(0,2), 16)
                cg += parseInt(hexNum.substring(2,4), 16)
                cb += parseInt(hexNum.substring(4,6), 16)
                paintedCount++
              }
            })
            
            if (paintedCount === 0) {
              setBotMessage("Bot: You didn't paint anything! Found you immediately!")
              setGameStatus('finished')
              return
            }

            const avgCharColor = [cr/paintedCount, cg/paintedCount, cb/paintedCount]
            const distance = colorDistance(avgMapColor, avgCharColor)
            
            const isHard = mapDifficulties[map] === 'Hard'
            const threshold = isHard ? 60 : 100 

            if (distance < threshold) {
              setBotMessage(`Bot: "I scanned everywhere... but your camouflage (${Math.round(100 - (distance/3))}%) was too perfect for this ${mapDifficulties[map]} map! I lose!"`)
            } else {
              setBotMessage(`Bot: "Found you! Your colors stood out. Mismatch: ${Math.round(distance)} (Needed < ${threshold} for this map). I win!"`)
              const newGrid = [...grid]
              newGrid[hiddenIndex] = 2 
              setGrid(newGrid)
            }
            
            setGameStatus('finished')
          }
        }
      }
    }, 2500)
  }

  if (inGame) {
    return (
      <div className="flex flex-col h-screen p-6 bg-ritual-dark">
        <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
        
        <header className="flex justify-between items-center mb-6 bg-slate-800/80 p-4 rounded-xl border border-slate-700 backdrop-blur-md shadow-lg z-50">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-ritual-primary to-ritual-accent bg-clip-text text-transparent drop-shadow-sm">Ritual Hide & Paint</h1>
            <p className="text-slate-400 text-sm">Mode: <span className="text-white capitalize font-semibold">{mode} (vs {opponent})</span> | Map: <span className="text-white font-semibold">{mapNames[map]}</span></p>
          </div>
          <button onClick={() => setInGame(false)} className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-semibold">Quit Game</button>
        </header>

        <main className="flex-1 flex gap-6 min-h-0">
          <div className="flex-1 rounded-2xl border-2 border-slate-700 overflow-hidden flex flex-col relative bg-slate-900 shadow-2xl relative group">
            
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full border border-slate-600 shadow-xl flex items-center gap-3">
              {gameStatus === 'waiting' && mode === 'hider' && <span className="text-ritual-accent font-bold animate-pulse">Click a grid cell to move your character there!</span>}
              {gameStatus === 'painting' && <span className="text-yellow-400 font-bold">Use the tools to camouflage your character!</span>}
              {gameStatus === 'ready' && <span className="text-white font-bold"><CheckCircle2 className="inline text-ritual-accent mr-2" size={20} />{txPending ? 'Staking RITUAL...' : 'Character Hidden!'}</span>}
              {gameStatus === 'finished' && <span className="text-ritual-primary font-bold">Game Over</span>}
            </div>

            <div className="flex-1 relative m-8 rounded-xl overflow-hidden shadow-2xl border border-slate-600 max-w-3xl max-h-[800px] aspect-square mx-auto my-auto" style={{ imageRendering: 'pixelated' }}>
              {pixelatedMapUrl && <img ref={imgRef} src={pixelatedMapUrl} alt="Map" className="absolute inset-0 w-full h-full object-cover opacity-90" />}
              
              <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 gap-0">
                {grid.map((cellState, index) => (
                  <div 
                    key={index}
                    onClick={() => handleCellClick(index)}
                    className={`
                      border border-white/10 hover:border-white/50 hover:bg-white/10 cursor-pointer transition-all flex items-center justify-center
                      ${hiddenIndex === index ? 'bg-black/10 border-ritual-primary ring-2 ring-ritual-primary ring-inset backdrop-blur-sm' : ''}
                      ${cellState === 2 ? 'bg-red-500/50 backdrop-blur-sm' : ''}
                    `}
                  >
                    {hiddenIndex === index && gameStatus !== 'waiting' && (
                      <div className="w-full h-full grid grid-cols-16 grid-rows-16 shadow-2xl drop-shadow-2xl" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))', gridTemplateRows: 'repeat(16, minmax(0, 1fr))' }}>
                         {characterPixels.map((color, i) => (
                           <div key={i} style={{ backgroundColor: CHARACTER_MASK[i] ? color : 'transparent' }} className="w-full h-full"></div>
                         ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-[420px] flex flex-col gap-6">
            {mode === 'hider' && (gameStatus === 'painting' || gameStatus === 'ready' || gameStatus === 'finished') && (
              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-md">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Brush className="text-ritual-primary"/> Character Camouflage</h3>
                
                <div className="flex gap-2 mb-4 bg-slate-900 p-2 rounded-xl border border-slate-700">
                  <input 
                    type="color" 
                    value={paintColor} 
                    onChange={(e) => {setPaintColor(e.target.value); setActiveTool('brush')}} 
                    className="w-12 h-12 rounded cursor-pointer border-2 border-slate-600 bg-slate-900 flex-shrink-0" 
                  />
                  <button 
                    onClick={() => setActiveTool('brush')}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors ${activeTool === 'brush' ? 'bg-ritual-primary text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    <Brush size={18} /> Paint
                  </button>
                  <button 
                    onClick={() => setActiveTool('picker')}
                    className={`flex items-center justify-center p-3 rounded-lg transition-colors ${activeTool === 'picker' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-blue-400 hover:bg-slate-700'}`}
                    title="Eyedropper: Pick color from background map"
                  >
                    <Pipette size={18} />
                  </button>
                  <button 
                    onClick={() => setActiveTool('eraser')}
                    className={`flex items-center justify-center p-3 rounded-lg transition-colors ${activeTool === 'eraser' ? 'bg-red-500 text-white' : 'bg-slate-800 text-red-400 hover:bg-slate-700'}`}
                    title="Eraser"
                  >
                    <Eraser size={18} />
                  </button>
                </div>

                <div className="relative w-full aspect-square rounded-xl border-2 border-slate-600 overflow-hidden mb-6 shadow-inner bg-slate-900" style={{ imageRendering: 'pixelated' }}>
                  {hiddenIndex !== null && pixelatedMapUrl && (
                     <div 
                       className="absolute inset-0 opacity-60 pointer-events-none"
                       style={{
                         backgroundImage: `url(${pixelatedMapUrl})`,
                         backgroundSize: '1000% 1000%', 
                         backgroundPosition: `${(hiddenIndex % 10) * 11.11}% ${Math.floor(hiddenIndex / 10) * 11.11}%`
                       }}
                     />
                  )}
                  
                  <div className="absolute inset-0 grid grid-cols-16 grid-rows-16 z-10" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))', gridTemplateRows: 'repeat(16, minmax(0, 1fr))' }}>
                    {characterPixels.map((color, i) => (
                      <div 
                        key={i} 
                        onMouseDown={() => handlePaintPixel(i)}
                        onMouseEnter={(e) => { if(e.buttons === 1) handlePaintPixel(i) }}
                        style={{ backgroundColor: CHARACTER_MASK[i] ? (color === 'transparent' ? 'rgba(255,255,255,0.05)' : color) : 'transparent' }}
                        className={`
                          border-[0.2px] border-white/10 transition-colors
                          ${CHARACTER_MASK[i] ? 'cursor-crosshair hover:border-white/50' : 'cursor-crosshair'}
                        `}
                      ></div>
                    ))}
                  </div>
                </div>

                {gameStatus === 'painting' && (
                  <button 
                    onClick={confirmHideAndBotSeek}
                    disabled={txPending}
                    className="w-full py-4 rounded-xl font-bold text-lg shadow-xl bg-gradient-to-r from-ritual-primary to-ritual-accent text-white hover:-translate-y-1 transition-all"
                  >
                    {txPending ? 'Staking...' : 'Confirm Disguise'}
                  </button>
                )}
              </div>
            )}

            {opponent === 'bot' && (
              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-md flex-1">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Bot className="text-ritual-accent"/> AI Seeker Status</h3>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 min-h-[150px] flex items-center justify-center font-mono text-sm text-slate-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><Bot size={80} /></div>
                  <p className="relative z-10 text-center leading-relaxed px-4">
                    {botMessage || "Waiting for you to hide..."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ritual-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-ritual-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-ritual-accent/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-5xl w-full bg-slate-800/40 p-10 rounded-3xl border border-slate-700 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-ritual-primary via-purple-400 to-ritual-accent bg-clip-text text-transparent tracking-tight">Ritual Hide & Paint</h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">Paint your ultimate camouflage and fool the AI Seeker!</p>
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-700 text-center max-w-sm w-full shadow-lg">
              <Award className="w-20 h-20 text-ritual-primary mx-auto mb-6 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
              <h2 className="text-2xl font-bold mb-2">Ready to Play?</h2>
              <p className="text-slate-400 mb-8">Connect your wallet to start hiding or seeking.</p>
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  className="w-full py-4 bg-gradient-to-r from-ritual-primary to-purple-600 hover:from-purple-500 hover:to-ritual-primary text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-1"
                >
                  Connect {connector.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
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
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Users className="text-ritual-accent"/> Select Opponent</h3>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setOpponent('bot')}
                    className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${opponent === 'bot' ? 'border-ritual-accent bg-ritual-accent/20 text-white shadow-lg' : 'border-slate-700 text-slate-400 hover:border-slate-500 bg-slate-900/50'}`}
                  >
                    <Bot className="mx-auto mb-2" /> Play vs AI Bot
                  </button>
                  <button 
                    onClick={() => setOpponent('pvp')}
                    className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${opponent === 'pvp' ? 'border-ritual-primary bg-ritual-primary/20 text-white shadow-lg' : 'border-slate-700 text-slate-400 hover:border-slate-500 bg-slate-900/50'}`}
                  >
                    <Users className="mx-auto mb-2" /> Play PvP
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Crosshair className="text-ritual-primary"/> Select Role</h3>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setMode('hider')}
                    className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${mode === 'hider' ? 'border-ritual-primary bg-ritual-primary/20 text-white shadow-lg' : 'border-slate-700 text-slate-400 hover:border-slate-500 bg-slate-900/50'}`}
                  >
                    Hider
                  </button>
                  <button 
                    onClick={() => setMode('seeker')}
                    disabled={opponent === 'bot'} 
                    className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${mode === 'seeker' ? 'border-ritual-accent bg-ritual-accent/20 text-white shadow-lg' : 'border-slate-700 text-slate-400 hover:border-slate-500 bg-slate-900/50'} ${opponent === 'bot' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Seeker
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-8 flex flex-col">
              <div>
                <h3 className="text-xl font-bold mb-4">Select Map & Difficulty</h3>
                <div className="grid grid-cols-2 gap-4">
                  {mapNames.map((m, idx) => (
                    <button
                      key={m}
                      onClick={() => setMap(idx)}
                      className={`relative h-28 rounded-xl font-semibold border-2 overflow-hidden transition-all group ${map === idx ? 'border-ritual-primary ring-4 ring-ritual-primary/20 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}
                    >
                      <img src={mapImages[idx]} alt={m} className={`absolute inset-0 w-full h-full object-cover transition-opacity ${map === idx ? 'opacity-60' : 'opacity-30 group-hover:opacity-40'}`} style={{ imageRendering: 'pixelated' }} />
                      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-1">
                        <span className="text-lg tracking-wide drop-shadow-md font-bold">{m}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border bg-black/50 backdrop-blur-sm ${mapDiffColors[idx]}`}>
                          {mapDifficulties[idx]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={startGame}
                disabled={!mode}
                className={`w-full mt-auto py-5 rounded-xl font-extrabold text-xl transition-all transform shadow-xl ${mode ? 'bg-gradient-to-r from-ritual-primary to-ritual-accent text-white hover:shadow-ritual-primary/40 hover:-translate-y-1' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
              >
                {mode ? `Start Game` : 'Select a Role'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
