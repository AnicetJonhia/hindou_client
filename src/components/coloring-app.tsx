"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Maximize,
  Printer,
  Trash2,
  Download,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  PaintBucket,
  ArrowLeft,
  Eraser,
} from "lucide-react"

interface ColoringAppProps {
  imagePath?: string
  onBack?: () => void
}

export default function ColoringApp({ imagePath = "/c1.png", onBack }: ColoringAppProps) {
  const [activeColor, setActiveColor] = useState("#ff0000")
  const [activeTool, setActiveTool] = useState<
    "brush-small" | "brush-medium" | "fill" | "smart-eraser" | "eraser"
  >("brush-medium")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [canvasContext, setCanvasContext] = useState<CanvasRenderingContext2D | null>(null)
  const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [zoom, setZoom] = useState(1)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)


  // Brush sizes
  const brushSizes = {
    "brush-small": 5,
    "brush-medium": 15,
    "smart-eraser": 15,
    eraser: 15,
    fill: 0, // Not applicable for fill tool
  }

  // Colors palette
  const colors = [
    "#ffff00", // yellow
    "#00ff00", // green
    "#0000ff", // blue
    "#ff0000", // red
    "#000000", // black
    "#888888", // gray
    "#ffffff", // white
  ]


  useEffect(() => {
    const canvasBg = backgroundCanvasRef.current;
    if (!canvasBg) return;
    const ctxBg = canvasBg.getContext("2d");
    const imgBg = new Image();
    imgBg.crossOrigin = "anonymous";
    imgBg.src = imagePath; // L'image à colorier
    imgBg.onload = () => {
      ctxBg.drawImage(imgBg, 0, 0, canvasBg.width, canvasBg.height);
    };
    }, [imagePath]);

  // Initialize canvas (fond transparent)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setCanvasContext(ctx)
    canvas.width = 800
    canvas.height = 600



    // Chargement de l'image de coloriage
    const img = new Image()
    imageRef.current = img
    img.crossOrigin = "anonymous"
    img.src = imagePath
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      // Sauvegarde de l'état initial
      const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setCanvasHistory([initialState])
      setHistoryIndex(0)
    }
  }, [imagePath])



  // Démarrage du dessin / effacement
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasContext || !canvasRef.current) return

    setIsDrawing(true)
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom

    lastPos.current = { x, y }

    if (activeTool === "fill") {
      floodFill(Math.floor(x), Math.floor(y), activeColor)
    } else if (activeTool === "smart-eraser") {
      // Smart‑eraser effectue un flood‑erase pour rendre transparent toute la zone
      floodErase(Math.floor(x), Math.floor(y))
    } else {
      // Pour les outils de pinceau (brush ou eraser), on dessine dès le départ
      drawCircle(x, y)
    }
  }

  // Dessin d'un cercle selon l'outil
  const drawCircle = (x: number, y: number) => {
    if (!canvasContext) return

    const brushSize = brushSizes[activeTool]
    if (activeTool === "eraser") {
      // Gomme classique : mode "destination-out" pour rendre le trait transparent
      canvasContext.globalCompositeOperation = "destination-out"
      canvasContext.fill()
    } else {
      // Mode dessin classique
      canvasContext.globalCompositeOperation = "source-over"
      canvasContext.fillStyle = activeColor
    }
    canvasContext.beginPath()
    canvasContext.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    canvasContext.fill()
  }

  // Fonction de dessin continu (pour le pinceau)
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasContext || !canvasRef.current || !lastPos.current) return
    // Pour smart‑eraser, on ne gère pas le drag (action unique sur clic)
    if (activeTool === "fill" || activeTool === "smart-eraser") return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom

    const dx = x - lastPos.current.x
    const dy = y - lastPos.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const brushSize = brushSizes[activeTool]
    const radius = brushSize / 2

    if (distance >= radius / 2) {
      const steps = Math.floor(distance / (radius / 2))
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const ix = lastPos.current.x + dx * t
        const iy = lastPos.current.y + dy * t
        drawCircle(ix, iy)
      }
      lastPos.current = { x, y }
    } else {
      drawCircle(x, y)
    }
  }

  const endDrawing = () => {
    if (!isDrawing || !canvasContext || !canvasRef.current) return

    setIsDrawing(false)
    lastPos.current = null

    // Sauvegarder l'état actuel pour l'undo
    const canvas = canvasRef.current
    const newState = canvasContext.getImageData(0, 0, canvas.width, canvas.height)
    const newHistory = canvasHistory.slice(0, historyIndex + 1)
    setCanvasHistory([...newHistory, newState])
    setHistoryIndex(newHistory.length)
  }

  // Flood fill classique
  const floodFill = (x: number, y: number, fillColor: string) => {
    if (!canvasContext || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvasContext
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const fillColorRGB = hexToRgb(fillColor)
    if (!fillColorRGB) return

    const targetColor = getPixelColor(imageData, x, y)
    if (colorsMatch(targetColor, [fillColorRGB.r, fillColorRGB.g, fillColorRGB.b, 255])) return

    const queue: [number, number][] = []
    queue.push([x, y])

    while (queue.length > 0) {
      const [currentX, currentY] = queue.shift()!
      if (currentX < 0 || currentY < 0 || currentX >= canvas.width || currentY >= canvas.height) continue

      const currentColor = getPixelColor(imageData, currentX, currentY)
      if (colorsMatch(currentColor, targetColor)) {
        setPixelColor(imageData, currentX, currentY, [
          fillColorRGB.r,
          fillColorRGB.g,
          fillColorRGB.b,
          255,
        ])
        queue.push([currentX + 1, currentY])
        queue.push([currentX - 1, currentY])
        queue.push([currentX, currentY + 1])
        queue.push([currentX, currentY - 1])
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }

  // Fonction de flood‑erase pour smart‑eraser : rend transparent tous les pixels d'une zone contiguë
  const floodErase = (x: number, y: number) => {
    if (!canvasContext || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvasContext
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const targetColor = getPixelColor(imageData, x, y)
    // Si le pixel est déjà transparent, rien à faire
    if (targetColor[3] === 0) return

    const queue: [number, number][] = []
    queue.push([x, y])

    while (queue.length > 0) {
      const [currentX, currentY] = queue.shift()!
      if (currentX < 0 || currentY < 0 || currentX >= canvas.width || currentY >= canvas.height) continue

      const currentColor = getPixelColor(imageData, currentX, currentY)
      if (colorsMatch(currentColor, targetColor)) {
        // Rendre le pixel transparent en mettant l'alpha à 0
        setPixelColor(imageData, currentX, currentY, [0, 0, 0, 0])
        queue.push([currentX + 1, currentY])
        queue.push([currentX - 1, currentY])
        queue.push([currentX, currentY + 1])
        queue.push([currentX, currentY - 1])
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }

  // Helpers pour manipuler les pixels
  const getPixelColor = (imageData: ImageData, x: number, y: number): [number, number, number, number] => {
    const index = (y * imageData.width + x) * 4
    return [
      imageData.data[index],
      imageData.data[index + 1],
      imageData.data[index + 2],
      imageData.data[index + 3],
    ]
  }

  const setPixelColor = (imageData: ImageData, x: number, y: number, color: [number, number, number, number]) => {
    const index = (y * imageData.width + x) * 4
    imageData.data[index] = color[0]
    imageData.data[index + 1] = color[1]
    imageData.data[index + 2] = color[2]
    imageData.data[index + 3] = color[3]
  }

  const colorsMatch = (
    color1: [number, number, number, number],
    color2: [number, number, number, number]
  ): boolean => {
    const threshold = 10 // Tolérance pour l'anti-aliasing
    return (
      Math.abs(color1[0] - color2[0]) < threshold &&
      Math.abs(color1[1] - color2[1]) < threshold &&
      Math.abs(color1[2] - color2[2]) < threshold
    )
  }

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : null
  }

  // Undo function
  const undo = () => {
    if (historyIndex > 0 && canvasContext && canvasRef.current) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      canvasContext.putImageData(canvasHistory[newIndex], 0, 0)
    }
  }

  // Reset canvas : ici on efface pour obtenir un fond transparent
  const resetCanvas = () => {
    if (!canvasContext || !canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    canvasContext.clearRect(0, 0, canvas.width, canvas.height)
    canvasContext.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height)

    const newState = canvasContext.getImageData(0, 0, canvas.width, canvas.height)
    setCanvasHistory([newState])
    setHistoryIndex(0)
  }

  // Télécharger l'image
  const downloadImage = () => {
    if (!canvasRef.current) return

    const link = document.createElement("a")
    link.download = "mon-coloriage.png"
    link.href = canvasRef.current.toDataURL("image/png")
    link.click()
  }

  // Zoom functions
  const zoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3))
  }

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5))
  }

  return (
    <div className="flex flex-col items-center w-full h-screen">
      <div
        className="relative flex w-full h-full "

      >
        {/* Left Toolbar */}
        <div className="flex flex-col items-center  gap-4 p-4 w-20">
          {onBack && (
            <ToolButton onClick={onBack} icon={<ArrowLeft className="w-6 h-6 text-white" />} color="bg-blue-700" />
          )}

          {/* Zoom Controls */}
          <div className="mt-4 flex flex-col gap-2">
            <ToolButton onClick={() => {}} icon={<Maximize className="w-6 h-6 text-white" />} color="bg-blue-500" />
            <ToolButton onClick={zoomIn} icon={<ZoomIn className="w-6 h-6 text-white" />} color="bg-blue-500" />
            <ToolButton onClick={zoomOut} icon={<ZoomOut className="w-6 h-6 text-white" />} color="bg-blue-500" />
          </div>
          <div className= {"flex flex-col mt-4 gap-4"} >

            <ToolButton onClick={() => {}} icon={<Printer className="w-6 h-6 text-white" />} color="bg-blue-500" />
            <ToolButton onClick={resetCanvas} icon={<Trash2 className="w-6 h-6 text-white" />} color="bg-blue-500" />
            <ToolButton onClick={downloadImage} icon={<Download className="w-6 h-6 text-white" />} color="bg-green-500" />
          </div>


        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-blue-600 p-4">
          <div
            className="relative overflow-hidden bg-gray-700 rounded-md"
            style={{
              width: "800px",
              height: "600px",
              maxWidth: "100%",
              maxHeight: "100%",
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            {/* Canvas de fond */}
            <canvas
              ref={backgroundCanvasRef}
              width={800}
              height={600}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 0,
              }}
            />
            {/* Canvas de dessin (superposé) */}
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              width={800}
              height={600}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 1,
              }}
            />
          </div>
      </div>


        {/* Right Toolbar */}
        <div className="flex flex-col items-center gap-4 p-4 w-24">
          {/* Color Palette */}
          <div className="flex flex-col gap-2">
            {colors.map((color) => (
              <ColorButton
                key={color}
                color={color}
                isActive={activeColor === color}
                onClick={() => setActiveColor(color)}
              />
            ))}
          </div>

          {/* Tool Buttons */}
          <div className="mt-4 flex flex-col gap-2">
            {/* Small Brush */}
            <ToolButton
              onClick={() => setActiveTool("brush-small")}
              icon={
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full border-2 border-white" style={{ background: activeColor }}></div>
                </div>
              }
              color={activeTool === "brush-small" ? "bg-orange-500" : "bg-blue-400"}
            />

            {/* Medium Brush */}
            <ToolButton
              onClick={() => setActiveTool("brush-medium")}
              icon={
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-white" style={{ background: activeColor }}></div>
                </div>
              }
              color={activeTool === "brush-medium" ? "bg-orange-500" : "bg-blue-400"}
            />

            {/* Fill Tool */}
            <ToolButton
              onClick={() => setActiveTool("fill")}
              icon={<PaintBucket className="w-6 h-6 text-white" />}
              color={activeTool === "fill" ? "bg-orange-500" : "bg-green-400"}
            />

            {/* Smart Eraser */}
            <ToolButton
              onClick={() => setActiveTool("smart-eraser")}
              icon={
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <PaintBucket className="w-5 h-5 text-white" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-gray-400 rounded-full"></div>
                </div>
              }
              color={activeTool === "smart-eraser" ? "bg-orange-500" : "bg-green-400"}
            />

            {/* Regular Eraser */}
            <ToolButton
              onClick={() => setActiveTool("eraser")}
              icon={<Eraser className="w-6 h-6 text-white" />}
              color={activeTool === "eraser" ? "bg-orange-500" : "bg-green-400"}
            />
          </div>



          {/* Undo Button */}
          <div className="mt-auto">
            <ToolButton onClick={undo} icon={<RotateCcw className="w-6 h-6 text-white" />} color="bg-red-500" />
          </div>
        </div>
      </div>
    </div>
  )
}

interface ToolButtonProps {
  onClick: () => void
  icon: React.ReactNode
  color: string
}

function ToolButton({ onClick, icon, color }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${color} w-16 h-16 rounded-md flex items-center justify-center text-white shadow-md hover:brightness-110 active:brightness-90 transition-all`}
    >
      {icon}
    </button>
  )
}

interface ColorButtonProps {
  color: string
  isActive: boolean
  onClick: () => void
}

function ColorButton({ color, isActive, onClick }: ColorButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-16 h-8 rounded-full flex items-center justify-center ${isActive ? "ring-4 ring-white" : ""}`}
      style={{ background: "white" }}
    >
      <div className="w-12 h-6 rounded-full" style={{ background: color }} />
    </button>
  )
}
