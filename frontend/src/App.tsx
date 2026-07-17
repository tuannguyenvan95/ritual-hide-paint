import { useState, useRef, useEffect, useCallback } from 'react'
import { WagmiProvider, useAccount, useConnect, useDisconnect, useBalance } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/web3'
import { Brush, Crosshair, Award, CheckCircle2, Eraser, Bot, Users, Pipette, User, Wallet, Eye, Palette, Move, Trophy, AlertCircle } from 'lucide-react'

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
  const [hiddenPosition, setHiddenPosition] = useState<{x: number, y: number} | null>(null)
  const [gameStatus, setGameStatus] = useState<'waiting' | 'painting' | 'ready' | 'finished'>('waiting')
  const [gameResult, setGameResult] = useState<'win' | 'loss' | null>(null)
  
  const [paintColor, setPaintColor] = useState('#8b5cf6')
  const [activeTool, setActiveTool] = useState<'brush' | 'eraser' | 'picker' | 'move'>('brush')
  const [isDragging, setIsDragging] = useState(false)
  const [characterPixels, setCharacterPixels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ritual_char_global')
      if (saved) return JSON.parse(saved)
    } catch(e) {}
    return CHARACTER_MASK.map(m => m === 1 ? '#8b5cf6' : 'transparent')
  }) 

  useEffect(() => {
    localStorage.setItem('ritual_char_global', JSON.stringify(characterPixels))
  }, [characterPixels])
  
  const imgRef = useRef<HTMLImageElement>(null)
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null)

  const [txPending, setTxPending] = useState(false)

  const [showWalletModal, setShowWalletModal] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [nameSet, setNameSet] = useState(false)
  const [setupTab, setSetupTab] = useState<'config' | 'character' | 'preview'>('config')
  const [betAmount, setBetAmount] = useState<number | string>(1)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboard, setLeaderboard] = useState<{name: string, wins: number}[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('ritual_leaderboard')
    if (saved) {
      setLeaderboard(JSON.parse(saved))
    } else {
      // Mock data if empty
      const mock = [
        { name: 'Vitalik', wins: 42 },
        { name: '0xGhost', wins: 24 },
        { name: 'PixelNinja', wins: 15 },
      ]
      setLeaderboard(mock)
      localStorage.setItem('ritual_leaderboard', JSON.stringify(mock))
    }
  }, [])

  const recordWin = () => {
    const name = playerName.trim() || 'Anonymous'
    setLeaderboard(prev => {
      const newList = [...prev]
      const existing = newList.find(p => p.name === name)
      if (existing) {
        existing.wins += 1
      } else {
        newList.push({ name, wins: 1 })
      }
      newList.sort((a, b) => b.wins - a.wins)
      localStorage.setItem('ritual_leaderboard', JSON.stringify(newList))
      return newList
    })
  }

  // Fetch native token balance on Ritual Testnet
  const { data: balanceData } = useBalance({ address: address, chainId: 1979 })
  const maxBalance = balanceData ? Number(balanceData.value) / 1e18 : 0
  const displayBalance = maxBalance.toFixed(4)
  const hasInsufficientBalance = Number(betAmount) > maxBalance

  // Load player name from local storage when wallet connects
  useEffect(() => {
    if (address) {
      const savedName = localStorage.getItem(`ritual_name_${address}`)
      if (savedName) {
        setPlayerName(savedName)
        setNameSet(true)
      } else {
        setPlayerName('')
        setNameSet(false)
      }
    }
  }, [address])

  // Dynamically pixelated map
  const [pixelatedMapUrl, setPixelatedMapUrl] = useState<string>('')

  // ===== SOUND EFFECTS SYSTEM (Web Audio API) =====
  const audioCtxRef = useRef<AudioContext | null>(null)
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    return audioCtxRef.current
  }, [])

  const playSound = useCallback((type: 'click' | 'hover' | 'success' | 'start' | 'paint') => {
    try {
      const ctx = getAudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      switch (type) {
        case 'click':
          osc.type = 'square'; osc.frequency.setValueAtTime(600, ctx.currentTime)
          osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1)
          gain.gain.setValueAtTime(0.08, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12)
          break
        case 'hover':
          osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime)
          gain.gain.setValueAtTime(0.03, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.06)
          break
        case 'success':
          osc.type = 'square'
          osc.frequency.setValueAtTime(523, ctx.currentTime)
          osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
          osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
          gain.gain.setValueAtTime(0.08, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35)
          break
        case 'start':
          osc.type = 'square'
          osc.frequency.setValueAtTime(262, ctx.currentTime)
          osc.frequency.setValueAtTime(330, ctx.currentTime + 0.08)
          osc.frequency.setValueAtTime(392, ctx.currentTime + 0.16)
          osc.frequency.setValueAtTime(523, ctx.currentTime + 0.24)
          gain.gain.setValueAtTime(0.1, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)
          break
        case 'paint':
          osc.type = 'triangle'; osc.frequency.setValueAtTime(400 + Math.random() * 200, ctx.currentTime)
          gain.gain.setValueAtTime(0.04, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.05)
          break
      }
    } catch {}
  }, [getAudioCtx])

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
    setHiddenPosition(null)
    setGameStatus('waiting')

  }

  const handleCellClick = (index: number) => {
    if (gameStatus === 'finished') return
    if (activeTool === 'picker' && mode === 'hider') return

    if (mode === 'seeker') {
      if (gameStatus === 'waiting' || opponent === 'bot') return 
      const newGrid = [...grid]
      newGrid[index] = 1 
      setGrid(newGrid)
    }
  }

  const handlePaintPixel = (idx: number) => {
    if (activeTool === 'picker') {
      pickColorFromBackground(idx)
      setActiveTool('brush')
      return
    }
    if (activeTool === 'move') return

    if (CHARACTER_MASK[idx] === 0) return 

    const newPixels = [...characterPixels]
    newPixels[idx] = activeTool === 'eraser' ? 'transparent' : paintColor
    setCharacterPixels(newPixels)
  }

  const pickColorFromBackground = (idx: number) => {
    if (!hiddenCanvasRef.current || hiddenPosition === null || !pixelatedMapUrl) return
    
    const canvas = hiddenCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const img = new Image()
    img.src = pixelatedMapUrl
    img.onload = () => {
      canvas.width = 160
      canvas.height = 160
      ctx.drawImage(img, 0, 0)
      
      const cellX = hiddenPosition.x
      const cellY = hiddenPosition.y
      
      const pxX = idx % 16
      const pxY = Math.floor(idx / 16)
      
      const sampleX = cellX + pxX
      const sampleY = cellY + pxY
      
      const imgData = ctx.getImageData(sampleX, sampleY, 1, 1)
      const [r, g, b] = imgData.data
      const pickedHex = rgbToHex(r, g, b)
      setPaintColor(pickedHex)
    }
  }

  const pickColorFromGlobalXY = (pxX: number, pxY: number) => {
    if (!hiddenCanvasRef.current || !pixelatedMapUrl) return
    const canvas = hiddenCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const img = new Image()
    img.src = pixelatedMapUrl
    img.onload = () => {
      canvas.width = 160
      canvas.height = 160
      ctx.drawImage(img, 0, 0)
      const imgData = ctx.getImageData(pxX, pxY, 1, 1)
      const [r, g, b] = imgData.data
      const pickedHex = rgbToHex(r, g, b)
      setPaintColor(pickedHex)
    }
  }

  const handleMapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const scaleX = 160 / rect.width
    const scaleY = 160 / rect.height
    
    const pxX = Math.floor(x * scaleX)
    const pxY = Math.floor(y * scaleY)

    if (activeTool === 'picker' && mode === 'hider' && (gameStatus === 'painting' || gameStatus === 'waiting')) {
      pickColorFromGlobalXY(pxX, pxY)
      setActiveTool('brush')
      e.stopPropagation()
      e.preventDefault()
    } else if (mode === 'hider' && (gameStatus === 'painting' || gameStatus === 'waiting')) {
      if (hiddenPosition && activeTool !== 'move') {
        const inCharBounds = pxX >= hiddenPosition.x && pxX < hiddenPosition.x + 16 &&
                             pxY >= hiddenPosition.y && pxY < hiddenPosition.y + 16
        if (inCharBounds && gameStatus === 'painting') return
      }
      
      const charX = Math.max(0, Math.min(160 - 16, Math.floor(pxX - 8)))
      const charY = Math.max(0, Math.min(160 - 16, Math.floor(pxY - 8)))
      setHiddenPosition({ x: charX, y: charY })
      setIsDragging(true)
      if (gameStatus === 'waiting') setGameStatus('painting')
      e.stopPropagation()
      e.preventDefault()
    }
  }

  const handleMapMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    if (mode === 'hider' && (gameStatus === 'painting' || gameStatus === 'waiting')) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const scaleX = 160 / rect.width
      const scaleY = 160 / rect.height
      const pxX = Math.floor(x * scaleX)
      const pxY = Math.floor(y * scaleY)
      const charX = Math.max(0, Math.min(160 - 16, Math.floor(pxX - 8)))
      const charY = Math.max(0, Math.min(160 - 16, Math.floor(pxY - 8)))
      setHiddenPosition({ x: charX, y: charY })
    }
  }

  const handleMapMouseUp = () => {
    setIsDragging(false)
  }

  const confirmHideAndBotSeek = async () => {
    if (hiddenPosition === null) return
    setGameStatus('ready')
    setTxPending(true)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    setTxPending(false)

    if (opponent === 'bot') {
      runBotAILogic()
    }
  }

  const runBotAILogic = () => {

    
    setTimeout(() => {
      if (hiddenCanvasRef.current && hiddenPosition !== null && pixelatedMapUrl) {
        const canvas = hiddenCanvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const img = new Image()
          img.src = pixelatedMapUrl
          img.onload = () => {
            canvas.width = 160
            canvas.height = 160
            ctx.drawImage(img, 0, 0)
            
            const imgData = ctx.getImageData(hiddenPosition.x, hiddenPosition.y, 16, 16)
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

              setGameResult('loss')
              setGameStatus('finished')
              return
            }

            const avgCharColor = [cr/paintedCount, cg/paintedCount, cb/paintedCount]
            const distance = colorDistance(avgMapColor, avgCharColor)
            
            const isHard = mapDifficulties[map] === 'Hard'
            const threshold = isHard ? 60 : 100 

            if (distance < threshold) {
              setGameResult('win')
              recordWin()
            } else {

              setGameResult('loss')
            }
            
            setGameStatus('finished')
          }
        }
      }
    }, 2500)
  }

  if (inGame) {
    return (
      <div className="flex flex-col h-screen overflow-hidden p-4 bg-ritual-dark">
        <div className="w-full max-w-7xl flex flex-col h-full mx-auto min-h-0">
          <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
          
          <header className="flex justify-between items-center mb-4 bg-slate-800/80 p-3 rounded-xl border border-slate-700 backdrop-blur-md shadow-lg z-50 flex-shrink-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-ritual-primary to-ritual-accent bg-clip-text text-transparent drop-shadow-sm">Ritual Hide & Paint</h1>
            <p className="text-slate-400 text-sm">Mode: <span className="text-white capitalize font-semibold">{mode} (vs {opponent})</span> | Map: <span className="text-white font-semibold">{mapNames[map]}</span></p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-ritual-gold/10 border border-ritual-gold/30 px-4 py-2 rounded-lg">
              <span className="text-ritual-gold font-bold">{betAmount} RITUAL</span>
              <span className="text-slate-400 text-xs uppercase tracking-wider">Pot</span>
            </div>
            <div className="flex items-center gap-2 bg-ritual-primary/10 border border-ritual-primary/30 px-4 py-2 rounded-lg">
              <User size={16} className="text-ritual-primary" />
              <span className="text-white font-bold">{playerName}</span>
            </div>
            <button onClick={() => setInGame(false)} className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-semibold">Quit Game</button>
          </div>
        </header>

        <main className="flex-1 flex gap-4 min-h-0">
          <div className="flex-1 rounded-2xl border-2 border-slate-700 overflow-hidden flex items-center justify-center relative bg-slate-900 shadow-2xl relative group p-4">
            
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full border border-slate-600 shadow-xl flex items-center gap-3">
              {gameStatus === 'waiting' && mode === 'hider' && <span className="text-ritual-accent font-bold animate-pulse">Click a grid cell to move your character there!</span>}
              {gameStatus === 'painting' && <span className="text-yellow-400 font-bold">Use the tools to camouflage your character!</span>}
              {gameStatus === 'ready' && <span className="text-white font-bold"><CheckCircle2 className="inline text-ritual-accent mr-2" size={20} />{txPending ? 'Staking RITUAL...' : 'Character Hidden!'}</span>}
              {gameStatus === 'finished' && <span className="text-ritual-primary font-bold">Game Over</span>}
            </div>

            <div 
              className={`relative rounded-xl overflow-hidden shadow-2xl border border-slate-600 aspect-square h-full max-w-full ${activeTool === 'picker' ? 'cursor-crosshair' : activeTool === 'move' ? 'cursor-move' : isDragging ? 'cursor-grabbing' : ''}`}
              style={{ imageRendering: 'pixelated' }}
              onMouseDownCapture={handleMapMouseDown}
              onMouseMove={handleMapMouseMove}
              onMouseUp={handleMapMouseUp}
              onMouseLeave={handleMapMouseUp}
            >
              {gameStatus === 'finished' && gameResult && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                  <div className={`p-8 rounded-2xl border-2 flex flex-col items-center shadow-2xl ${gameResult === 'win' ? 'border-ritual-accent bg-ritual-accent/20' : 'border-red-500 bg-red-500/20'}`}>
                    {gameResult === 'win' ? (
                      <Trophy className="w-24 h-24 mb-4 text-ritual-accent animate-bounce" />
                    ) : (
                      <AlertCircle className="w-24 h-24 mb-4 text-red-500 animate-pulse" />
                    )}
                    <h2 className={`text-6xl font-black tracking-widest uppercase ${gameResult === 'win' ? 'text-ritual-accent' : 'text-red-500'}`} style={{ fontFamily: "'Orbitron', sans-serif" }}>
                      {gameResult === 'win' ? 'You Win!' : 'You Lose!'}
                    </h2>
                    <p className="text-white text-xl mt-4 font-bold">
                      {gameResult === 'win' ? 'Your camouflage was perfect.' : 'The AI found you.'}
                    </p>
                  </div>
                </div>
              )}

              {pixelatedMapUrl && <img ref={imgRef} src={pixelatedMapUrl} alt="Map" className="absolute inset-0 w-full h-full object-cover opacity-90 pointer-events-none" />}
              
              {mode !== 'hider' && (
                <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 gap-0">
                  {grid.map((cellState, index) => (
                    <div 
                      key={index}
                      onClick={() => handleCellClick(index)}
                      className={`
                        border border-white/10 hover:border-white/50 hover:bg-white/10 cursor-pointer transition-all flex items-center justify-center
                        ${cellState === 2 ? 'bg-red-500/50 backdrop-blur-sm' : ''}
                      `}
                    ></div>
                  ))}
                </div>
              )}

              {mode === 'hider' && hiddenPosition && gameStatus !== 'waiting' && (
                <div 
                  className="absolute z-10 grid shadow-[0_0_20px_rgba(0,0,0,0.8)] border border-white/20"
                  style={{ 
                    left: `${(hiddenPosition.x / 160) * 100}%`,
                    top: `${(hiddenPosition.y / 160) * 100}%`,
                    width: '10%',
                    height: '10%',
                    gridTemplateColumns: 'repeat(16, minmax(0, 1fr))', 
                    gridTemplateRows: 'repeat(16, minmax(0, 1fr))' 
                  }}
                >
                   {characterPixels.map((color, i) => (
                     <div 
                       key={i} 
                       onMouseDown={() => handlePaintPixel(i)}
                       onMouseEnter={(e) => { if(e.buttons===1) handlePaintPixel(i) }}
                       style={{ backgroundColor: CHARACTER_MASK[i] ? color : 'transparent' }} 
                       className="w-full h-full"
                     ></div>
                   ))}
                </div>
              )}
            </div>
          </div>

          <div className="w-full max-w-[380px] flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
            {mode === 'hider' && (gameStatus === 'painting' || gameStatus === 'ready' || gameStatus === 'finished') && (
              <div className="bg-slate-800/80 p-4 md:p-5 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-md">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Brush className="text-ritual-primary"/> Character Camouflage</h3>
                
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
                  <button 
                    onClick={() => setActiveTool('move')}
                    className={`flex items-center justify-center p-3 rounded-lg transition-colors ${activeTool === 'move' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-orange-400 hover:bg-slate-700'}`}
                    title="Move Character"
                  >
                    <Move size={18} />
                  </button>
                </div>

                <div className="relative w-full aspect-square rounded-xl border-2 border-slate-600 overflow-hidden mb-4 shadow-inner bg-slate-900" style={{ imageRendering: 'pixelated' }}>
                  {hiddenPosition !== null && pixelatedMapUrl && (
                     <div 
                       className="absolute inset-0 opacity-60 pointer-events-none"
                       style={{
                         backgroundImage: `url(${pixelatedMapUrl})`,
                         backgroundSize: '1000% 1000%', 
                         backgroundPosition: `${(hiddenPosition.x / 144) * 100}% ${(hiddenPosition.y / 144) * 100}%`
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


          </div>
        </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* ===== ANIMATED BACKGROUND ===== */}
      <div className="game-bg">
        <div className="aurora"></div>
        <div className="scanlines"></div>
      </div>

      {/* ===== FLOATING PIXEL PARTICLES ===== */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        {[...Array(8)].map((_, i) => <div key={i} className="pixel-particle" />)}
      </div>

      {/* ===== LEADERBOARD MODAL ===== */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowLeaderboard(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md"></div>
          <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-yellow-500/10 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
            </div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif" }}><Trophy className="text-yellow-400"/> Top Winners</h3>
              <button onClick={() => { setShowLeaderboard(false); playSound('click') }} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-lg">&times;</button>
            </div>
            
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {leaderboard.length === 0 ? (
                <div className="text-center text-slate-500 py-8">No winners yet. Be the first!</div>
              ) : (
                leaderboard.map((player, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : idx === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/50' : idx === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/50' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                        {idx + 1}
                      </div>
                      <span className="font-bold text-slate-200">{player.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700">
                      <span className="text-yellow-400 font-bold">{player.wins}</span>
                      <span className="text-slate-500 text-xs">wins</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== WALLET MODAL ===== */}
      {showWalletModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowWalletModal(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md"></div>
          <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-ritual-primary/10 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-ritual-primary/50 to-transparent"></div>
            </div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>Connect Wallet</h3>
              <button onClick={() => { setShowWalletModal(false); playSound('click') }} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-lg">&times;</button>
            </div>
            <p className="text-slate-400 text-sm mb-5">Choose your preferred wallet to connect to Ritual Testnet.</p>
            <div className="flex flex-col gap-2.5">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => { connect({ connector }); setShowWalletModal(false); playSound('success') }}
                  onMouseEnter={() => playSound('hover')}
                  className="w-full py-3.5 px-4 bg-slate-800/60 hover:bg-ritual-primary/10 text-slate-200 hover:text-white font-semibold rounded-xl border border-slate-700/60 hover:border-ritual-primary/40 shadow-sm hover:shadow-[0_0_25px_rgba(168,85,247,0.12)] transition-all duration-200 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-600/40 flex-shrink-0 overflow-hidden">
                    {connector.icon ? (
                      <img src={connector.icon} alt={connector.name} className="w-7 h-7 object-contain" />
                    ) : (
                      <Award size={20} className="text-ritual-primary" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">{connector.name}</div>
                    <div className="text-xs text-slate-500">Click to connect</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-5xl w-full relative z-10">
        {/* TITLE SECTION */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-block mb-3">
            <span className="pixel-subtitle text-ritual-accent tracking-[0.3em] opacity-80">⬢ ON-CHAIN GAMING ⬢</span>
          </div>
          <h1 className="neon-title text-5xl md:text-7xl font-black mb-5 bg-gradient-to-r from-ritual-primary via-purple-300 to-ritual-accent bg-clip-text text-transparent tracking-tight leading-tight">
            Ritual Hide & Paint
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Paint your ultimate <span className="text-ritual-accent font-semibold">camouflage</span> and fool the <span className="text-ritual-pink font-semibold">AI Seeker</span>
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Ritual Testnet</span>
            <span>•</span>
            <span>Chain ID 1979</span>
            <span>•</span>
            <span className="text-ritual-gold">🏆 Win RITUAL tokens</span>
          </div>
        </div>

        {!isConnected ? (
          /* ===== NOT CONNECTED: HERO CARD ===== */
          <div className="flex flex-col items-center justify-center py-8 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <div className="game-card p-10 rounded-3xl text-center max-w-md w-full relative overflow-hidden">
              {/* Top glow line */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-ritual-primary/40 to-transparent"></div>
              {/* Shimmer overlay */}
              <div className="absolute inset-0 animate-shimmer pointer-events-none rounded-3xl"></div>

              <div className="relative z-10">
                <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-ritual-primary/20 to-ritual-accent/20 flex items-center justify-center border border-ritual-primary/20 shadow-lg shadow-ritual-primary/10">
                  <Award className="w-12 h-12 text-ritual-primary drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]" />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>Ready to Play?</h2>
                <p className="text-slate-400 mb-8 text-sm leading-relaxed">Connect your wallet to start your pixel art camouflage adventure on the Ritual blockchain.</p>
                <button
                  onClick={() => { setShowWalletModal(true); playSound('click') }}
                  onMouseEnter={() => playSound('hover')}
                  className="glow-btn w-full py-4 bg-gradient-to-r from-ritual-primary to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-ritual-primary/25 hover:shadow-ritual-primary/40 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-3 relative z-10"
                >
                  <Award size={20} />
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem', letterSpacing: '0.05em' }}>CONNECT WALLET</span>
                </button>
              </div>
            </div>

            {/* Feature cards below */}
            <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg w-full">
              {[
                { emoji: '🎨', label: 'Pixel Paint', desc: 'Draw camouflage' },
                { emoji: '🤖', label: 'AI Seeker', desc: 'vs Smart Bot' },
                { emoji: '💰', label: 'Win Rewards', desc: 'Earn RITUAL' },
              ].map((f, i) => (
                <div key={i} className="game-card rounded-xl p-4 text-center" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                  <div className="text-2xl mb-2">{f.emoji}</div>
                  <div className="text-xs font-bold text-white mb-0.5" style={{ fontFamily: "'Orbitron', sans-serif" }}>{f.label}</div>
                  <div className="text-[10px] text-slate-500">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ===== CONNECTED: GAME SETUP ===== */
          <div className="animate-fade-in-up space-y-6">
            {/* ===== TOP BAR: Wallet + Balance + Player Name ===== */}
            <div className="game-card rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-ritual-accent/40 to-transparent"></div>
              <div className="flex flex-wrap items-center gap-4 md:gap-6">
                {/* Wallet */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-ritual-primary to-ritual-accent flex items-center justify-center shadow-lg shadow-ritual-primary/20">
                    <span className="text-white text-xs font-bold">{address?.slice(2, 4)}</span>
                  </div>
                  <div>
                    <span className="text-slate-300 font-mono text-sm block">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                    <span className="text-[10px] text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>Connected</span>
                  </div>
                </div>

                {/* Balance */}
                <div className="flex items-center gap-2 bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-700/50">
                  <Wallet size={16} className="text-ritual-gold" />
                  <span className="text-ritual-gold font-bold text-sm" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem' }}>{displayBalance}</span>
                  <span className="text-slate-500 text-xs">RITUAL</span>
                </div>

                {/* Player Name */}
                {!nameSet ? (
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <div className="flex-1 relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && playerName.trim()) { setNameSet(true); if (address) localStorage.setItem(`ritual_name_${address}`, playerName.trim()); playSound('success') } }}
                        placeholder="Enter your name..."
                        maxLength={20}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-ritual-primary/50 focus:shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all"
                      />
                    </div>
                    <button
                      onClick={() => { if (playerName.trim()) { setNameSet(true); if (address) localStorage.setItem(`ritual_name_${address}`, playerName.trim()); playSound('success') } }}
                      disabled={!playerName.trim()}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${playerName.trim() ? 'bg-ritual-primary/20 text-ritual-primary border border-ritual-primary/30 hover:bg-ritual-primary/30' : 'bg-slate-800/50 text-slate-600 border border-slate-700/30 cursor-not-allowed'}`}
                    >
                      Set
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-ritual-primary/10 px-4 py-2.5 rounded-xl border border-ritual-primary/20">
                    <User size={14} className="text-ritual-primary" />
                    <span className="text-white font-bold text-sm" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem' }}>{playerName}</span>
                    <button onClick={() => setNameSet(false)} className="text-slate-500 hover:text-white text-xs ml-1">✏️</button>
                  </div>
                )}

                <div className="flex gap-2 ml-auto">
                  <button onClick={() => { setShowLeaderboard(true); playSound('click') }} className="text-sm px-3 py-2 bg-yellow-500/10 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition-colors font-medium border border-yellow-500/10 flex items-center gap-1"><Trophy size={14} /> Leaderboard</button>
                  <button onClick={() => { disconnect(); playSound('click') }} className="text-sm px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors font-medium border border-red-500/10">Disconnect</button>
                </div>
              </div>
            </div>

            {/* ===== TAB NAVIGATION ===== */}
            <div className="flex gap-2 bg-slate-900/40 p-1.5 rounded-xl border border-slate-700/30">
              {[
                { key: 'config' as const, icon: <Crosshair size={16} />, label: 'Game Config' },
                { key: 'character' as const, icon: <Palette size={16} />, label: 'Character' },
                { key: 'preview' as const, icon: <Eye size={16} />, label: 'Map Preview' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setSetupTab(tab.key); playSound('click') }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${setupTab === tab.key ? 'bg-ritual-primary/15 text-white border border-ritual-primary/30 shadow-lg shadow-ritual-primary/5' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                  style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem' }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* ===== TAB CONTENT ===== */}
            <div className="game-card rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-ritual-accent/40 to-transparent"></div>

              {/* TAB 1: Game Config */}
              {setupTab === 'config' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in">
                  <div className="space-y-7 flex flex-col h-full">
                    {/* Opponent */}
                    <div>
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem' }}>
                        <Users className="text-ritual-accent" size={18}/> SELECT OPPONENT
                      </h3>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => { setOpponent('bot'); playSound('click') }}
                          onMouseEnter={() => playSound('hover')}
                          className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${opponent === 'bot' ? 'border-ritual-accent bg-ritual-accent/10 text-white shadow-lg shadow-ritual-accent/10' : 'border-slate-700/50 text-slate-400 hover:border-slate-500 bg-slate-900/50'}`}
                        >
                          <Bot className="mx-auto mb-2" size={22} /> <span className="text-sm">vs AI Bot</span>
                        </button>
                        <button 
                          onClick={() => { setOpponent('pvp'); playSound('click') }}
                          onMouseEnter={() => playSound('hover')}
                          className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${opponent === 'pvp' ? 'border-ritual-primary bg-ritual-primary/10 text-white shadow-lg shadow-ritual-primary/10' : 'border-slate-700/50 text-slate-400 hover:border-slate-500 bg-slate-900/50'}`}
                        >
                          <Users className="mx-auto mb-2" size={22} /> <span className="text-sm">PvP</span>
                        </button>
                      </div>
                    </div>

                    {/* Role */}
                    <div>
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem' }}>
                        <Crosshair className="text-ritual-primary" size={18}/> SELECT ROLE
                      </h3>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => { setMode('hider'); playSound('click') }}
                          onMouseEnter={() => playSound('hover')}
                          className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${mode === 'hider' ? 'border-ritual-primary bg-ritual-primary/10 text-white shadow-lg shadow-ritual-primary/10' : 'border-slate-700/50 text-slate-400 hover:border-slate-500 bg-slate-900/50'}`}
                        >
                          🎨 <span className="text-sm">Hider</span>
                        </button>
                        <button 
                          onClick={() => { setMode('seeker'); playSound('click') }}
                          onMouseEnter={() => playSound('hover')}
                          disabled={opponent === 'bot'} 
                          className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${mode === 'seeker' ? 'border-ritual-accent bg-ritual-accent/10 text-white shadow-lg shadow-ritual-accent/10' : 'border-slate-700/50 text-slate-400 hover:border-slate-500 bg-slate-900/50'} ${opponent === 'bot' ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          🔍 <span className="text-sm">Seeker</span>
                        </button>
                      </div>
                    </div>

                    {/* How to play */}
                    <div className="pt-4 mt-auto">
                      <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl">
                        <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-slate-300" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem' }}>
                          <span className="text-ritual-primary">💡</span> HOW TO PLAY
                        </h3>
                        <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                          <li>Select your role: <span className="text-white">Hider</span> (Camouflage) or <span className="text-white">Seeker</span> (Find).</li>
                          <li>Stake your <span className="text-yellow-400">RITUAL</span> tokens to enter the match.</li>
                          <li><span className="text-white">Hiders</span> paint their character to blend into the map.</li>
                          <li><span className="text-white">Seekers</span> have limited time/clicks to find the hidden player.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-7 flex flex-col">
                    {/* Map Selection */}
                    <div>
                      <h3 className="text-lg font-bold mb-3" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem' }}>SELECT MAP</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {mapNames.map((m, idx) => (
                          <button
                            key={m}
                            onClick={() => { setMap(idx); playSound('click') }}
                            onMouseEnter={() => playSound('hover')}
                            className={`map-card relative h-28 rounded-xl font-semibold border-2 overflow-hidden transition-all ${map === idx ? 'border-ritual-primary ring-2 ring-ritual-primary/30 text-white' : 'border-slate-700/50 text-slate-300 hover:border-slate-500'}`}
                          >
                            <img src={mapImages[idx]} alt={m} className={`absolute inset-0 w-full h-full object-cover transition-opacity ${map === idx ? 'opacity-50' : 'opacity-25'}`} style={{ imageRendering: 'pixelated' }} />
                            <div className="relative z-10 flex flex-col items-center justify-center h-full gap-1.5">
                              <span className="text-base tracking-wide drop-shadow-lg font-bold" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem' }}>{m.toUpperCase()}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border bg-black/60 backdrop-blur-sm ${mapDiffColors[idx]}`}>
                                {mapDifficulties[idx]}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Betting Amount */}
                    <div>
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem' }}>
                        <Wallet className="text-ritual-gold" size={18}/> WAGER AMOUNT (RITUAL)
                      </h3>
                      <div className="flex gap-2 relative">
                        <input
                          type="number"
                          min="0.001"
                          step="0.01"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value ? Number(e.target.value) : '')}
                          className="w-full bg-slate-900/50 border-2 border-slate-700/50 focus:border-ritual-gold rounded-xl py-3 px-4 text-ritual-gold font-bold focus:outline-none transition-all focus:shadow-lg focus:shadow-ritual-gold/10 text-lg"
                          placeholder="Enter amount..."
                        />
                        <button 
                          onClick={() => {
                            setBetAmount(Math.floor(maxBalance * 100) / 100)
                          }}
                          className="px-4 py-3 bg-slate-800 text-ritual-gold font-bold text-sm rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors"
                        >
                          MAX
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 text-center">Stake RITUAL tokens to play. Winner takes all!</p>
                      {hasInsufficientBalance && (
                        <p className="text-xs text-red-500 font-bold mt-2 text-center animate-pulse">
                          Insufficient balance! You only have {maxBalance.toFixed(4)} RITUAL.
                        </p>
                      )}
                    </div>

                    {/* Start Button */}
                    <button 
                      onClick={() => { if (nameSet) { startGame(); playSound('start') } else { playSound('click'); setSetupTab('config') } }}
                      onMouseEnter={() => playSound('hover')}
                      disabled={!mode || !nameSet || hasInsufficientBalance || Number(betAmount) <= 0}
                      className={`glow-btn w-full mt-auto py-5 rounded-xl font-extrabold text-lg transition-all transform shadow-xl relative z-10 ${mode && nameSet ? 'bg-gradient-to-r from-ritual-primary via-purple-500 to-ritual-accent text-white hover:shadow-ritual-primary/40 hover:-translate-y-1' : 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-700/50'}`}
                      style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.1em' }}
                    >
                      {!nameSet ? 'SET YOUR NAME FIRST' : mode ? '▶ START GAME' : 'SELECT A ROLE'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Character Preview & Creation */}
              {setupTab === 'character' && (
                <div className="animate-fade-in">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem' }}>
                    <Palette className="text-ritual-primary" size={18}/> YOUR CHARACTER
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Character pixel editor */}
                    <div>
                      <p className="text-slate-400 text-sm mb-4">This is your base character. You'll paint over it during the game to blend with the map. Try some colors now!</p>
                      <div className="relative w-full max-w-[320px] aspect-square rounded-xl border-2 border-slate-600 overflow-hidden shadow-inner bg-slate-900 mx-auto" style={{ imageRendering: 'pixelated' }}>
                        <div className="absolute inset-0 bg-[repeating-conic-gradient(rgba(255,255,255,0.03)_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]"></div>
                        <div className="absolute inset-0 grid z-10" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))', gridTemplateRows: 'repeat(16, minmax(0, 1fr))' }}>
                          {characterPixels.map((color, i) => (
                            <div 
                              key={i} 
                              onMouseDown={() => { if (CHARACTER_MASK[i]) { const newPx = [...characterPixels]; newPx[i] = paintColor; setCharacterPixels(newPx); playSound('paint') } }}
                              onMouseEnter={(e) => { if (e.buttons === 1 && CHARACTER_MASK[i]) { const newPx = [...characterPixels]; newPx[i] = paintColor; setCharacterPixels(newPx) } }}
                              style={{ backgroundColor: CHARACTER_MASK[i] ? (color === 'transparent' ? 'rgba(255,255,255,0.05)' : color) : 'transparent' }}
                              className={`border-[0.2px] border-white/5 ${CHARACTER_MASK[i] ? 'cursor-crosshair hover:border-white/30' : ''}`}
                            ></div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Color palette quick picks */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-2 font-semibold" style={{ fontFamily: "'Orbitron', sans-serif" }}>PICK COLOR</p>
                        <input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} className="w-full h-12 rounded-lg cursor-pointer border-2 border-slate-600 bg-slate-900" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-2 font-semibold" style={{ fontFamily: "'Orbitron', sans-serif" }}>QUICK PALETTE</p>
                        <div className="grid grid-cols-8 gap-1.5">
                          {['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#ffffff','#94a3b8','#64748b','#334155','#1e293b','#0f172a','#7c3aed','#14b8a6'].map(c => (
                            <button key={c} onClick={() => { setPaintColor(c); playSound('click') }} className={`w-full aspect-square rounded-md border-2 transition-all hover:scale-110 ${paintColor === c ? 'border-white shadow-lg' : 'border-slate-700'}`} style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-2 font-semibold" style={{ fontFamily: "'Orbitron', sans-serif" }}>ACTIONS</p>
                        <div className="flex gap-2">
                          <button onClick={() => { setCharacterPixels(CHARACTER_MASK.map(m => m === 1 ? '#8b5cf6' : 'transparent')); playSound('click') }} className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold border border-slate-700 transition-all">Reset</button>
                          <button onClick={() => { setCharacterPixels(CHARACTER_MASK.map(m => m === 1 ? paintColor : 'transparent')); playSound('click') }} className="flex-1 py-2.5 rounded-lg bg-ritual-primary/20 text-ritual-primary hover:bg-ritual-primary/30 text-xs font-bold border border-ritual-primary/30 transition-all">Fill All</button>
                        </div>
                      </div>
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/30 mt-4">
                        <p className="text-xs text-slate-400 leading-relaxed">💡 <strong className="text-slate-300">Tip:</strong> During the actual game, you'll use the Eyedropper tool to pick exact colors from the map background. This is just a practice area!</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Map Preview */}
              {setupTab === 'preview' && (
                <div className="animate-fade-in">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem' }}>
                    <Eye className="text-ritual-accent" size={18}/> MAP PREVIEW — {mapNames[map].toUpperCase()}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Full map preview */}
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-slate-400 text-sm">Select a map to preview its layout and plan your camouflage.</p>
                        <div className="flex gap-2">
                          {mapNames.map((m, idx) => (
                            <button 
                              key={idx}
                              onClick={() => { setMap(idx); playSound('click') }}
                              className={`w-10 h-10 rounded-md border-2 overflow-hidden transition-all hover:scale-105 ${map === idx ? 'border-ritual-accent shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'border-slate-700/50 hover:border-slate-500 opacity-50 hover:opacity-100'}`}
                              title={m}
                            >
                              <img src={mapImages[idx]} alt={m} className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative rounded-xl overflow-hidden border-2 border-slate-600 shadow-2xl aspect-square max-w-[500px]" style={{ imageRendering: 'pixelated' }}>
                        {pixelatedMapUrl && <img src={pixelatedMapUrl} alt="Map Preview" className="w-full h-full object-cover" />}
                        <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
                          {Array(100).fill(0).map((_, i) => (
                            <div key={i} className="border border-white/5 hover:bg-white/10 transition-colors"></div>
                          ))}
                        </div>
                        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-600">
                          <span className={`text-xs font-bold ${mapDiffColors[map].split(' ')[0]}`}>{mapDifficulties[map]}</span>
                        </div>
                      </div>
                    </div>
                    {/* Map info sidebar */}
                    <div className="space-y-4">
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/30">
                        <p className="text-xs font-bold text-slate-500 mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>MAP INFO</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-slate-400">Name</span><span className="text-white font-bold">{mapNames[map]}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Difficulty</span><span className={`font-bold ${mapDiffColors[map].split(' ')[0]}`}>{mapDifficulties[map]}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Grid</span><span className="text-white font-bold">10 × 10</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Resolution</span><span className="text-white font-bold">160 × 160 px</span></div>
                        </div>
                      </div>
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/30">
                        <p className="text-xs font-bold text-slate-500 mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>YOUR CHARACTER</p>
                                  {hiddenPosition !== null && pixelatedMapUrl && (
                    <div className="w-24 h-24 rounded-lg border border-slate-600 overflow-hidden relative shadow-inner">
                      <div 
                         className="absolute w-[1000%] h-[1000%]"
                         style={{
                           backgroundImage: `url(${pixelatedMapUrl})`,
                           backgroundSize: '100% 100%',
                           backgroundPosition: `${(hiddenPosition.x / 144) * 100}% ${(hiddenPosition.y / 144) * 100}%`,
                           imageRendering: 'pixelated'
                         }}
                      />
                      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))', gridTemplateRows: 'repeat(16, minmax(0, 1fr))' }}>
                        {characterPixels.map((color, i) => (
                           <div key={i} style={{ backgroundColor: CHARACTER_MASK[i] ? color : 'transparent' }} className="w-full h-full"></div>
                        ))}
                      </div>
                    </div>
                  )}
                        <p className="text-[10px] text-slate-500 text-center mt-2">Current look (pre-camouflage)</p>
                      </div>
                      <div className="bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/15">
                        <p className="text-xs text-yellow-400/80 leading-relaxed">🎯 <strong>Strategy:</strong> Observe the dominant colors in your chosen cell. In-game, use the Eyedropper to match them exactly!</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center justify-center gap-4">
          <div className="flex gap-6 items-center">
            <a href="https://discord.gg/ritual" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-indigo-400 transition-colors text-sm font-bold flex items-center gap-2">
              Discord
            </a>
            <span className="text-slate-700">•</span>
            <a href="https://twitter.com/ritualnet" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-sky-400 transition-colors text-sm font-bold flex items-center gap-2">
              X (Twitter)
            </a>
            <span className="text-slate-700">•</span>
            <a href="https://ritual.net" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors text-sm font-bold flex items-center gap-2">
              ritual.net
            </a>
          </div>
          <div className="text-slate-600 text-[10px]" style={{ fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.1em' }}>
            POWERED BY RITUAL NETWORK
          </div>
        </div>
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
