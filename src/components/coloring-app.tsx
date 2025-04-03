"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Maximize, Printer, Trash2, Download, RotateCcw, ZoomIn, ZoomOut, PaintBucket , ArrowLeft} from "lucide-react"

import a_img from "@/assets/images/a.png"

export default function ColoringApp() {
  const [activeColor, setActiveColor] = useState("#ff0000")
  const [activeTool, setActiveTool] = useState<"brush" | "fill" | "eraser">("brush")
  const [brushSize, setBrushSize] = useState(10)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [canvasContext, setCanvasContext] = useState<CanvasRenderingContext2D | null>(null)
  const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [zoom, setZoom] = useState(1)
  const imageRef = useRef<HTMLImageElement | null>(null)

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

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setCanvasContext(ctx)

    // Set canvas size
    canvas.width = 800
    canvas.height = 600

    // Fill with gray background
    ctx.fillStyle = "#888888"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Load the coloring image
    const img = new Image()
    imageRef.current = img
    img.crossOrigin = "anonymous"
    img.src = a_img.src
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      // Save initial state
      const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setCanvasHistory([initialState])
      setHistoryIndex(0)
    }
  }, [])

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasContext || !canvasRef.current) return

    setIsDrawing(true)
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom

    canvasContext.beginPath()
    canvasContext.moveTo(x, y)

    if (activeTool === "fill") {
      floodFill(Math.floor(x), Math.floor(y), activeColor)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasContext || !canvasRef.current) return
    if (activeTool === "fill") return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom

    canvasContext.lineTo(x, y)
    canvasContext.strokeStyle = activeTool === "eraser" ? "#888888" : activeColor
    canvasContext.lineWidth = brushSize
    canvasContext.lineCap = "round"
    canvasContext.lineJoin = "round"
    canvasContext.stroke()
  }

  const endDrawing = () => {
    if (!isDrawing || !canvasContext || !canvasRef.current) return

    setIsDrawing(false)
    canvasContext.closePath()

    // Save state for undo
    const canvas = canvasRef.current
    const newState = canvasContext.getImageData(0, 0, canvas.width, canvas.height)

    // Remove any redo states
    const newHistory = canvasHistory.slice(0, historyIndex + 1)
    setCanvasHistory([...newHistory, newState])
    setHistoryIndex(newHistory.length)
  }

  // Flood fill algorithm
  const floodFill = (x: number, y: number, fillColor: string) => {
    if (!canvasContext || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvasContext
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Convert hex color to RGBA
    const fillColorRGB = hexToRgb(fillColor)
    if (!fillColorRGB) return

    // Get the color of the clicked pixel
    const targetColor = getPixelColor(imageData, x, y)

    // Don't fill if the colors are the same
    if (colorsMatch(targetColor, [fillColorRGB.r, fillColorRGB.g, fillColorRGB.b, 255])) return

    // Queue for flood fill
    const queue: [number, number][] = []
    queue.push([x, y])

    while (queue.length > 0) {
      const [currentX, currentY] = queue.shift()!

      // Check if the pixel is within the canvas
      if (currentX < 0 || currentY < 0 || currentX >= canvas.width || currentY >= canvas.height) {
        continue
      }

      // Get the color of the current pixel
      const currentColor = getPixelColor(imageData, currentX, currentY)

      // If the color matches the target color, fill it
      if (colorsMatch(currentColor, targetColor)) {
        // Set the pixel color
        setPixelColor(imageData, currentX, currentY, [fillColorRGB.r, fillColorRGB.g, fillColorRGB.b, 255])

        // Add adjacent pixels to the queue
        queue.push([currentX + 1, currentY])
        queue.push([currentX - 1, currentY])
        queue.push([currentX, currentY + 1])
        queue.push([currentX, currentY - 1])
      }
    }

    // Update the canvas
    ctx.putImageData(imageData, 0, 0)
  }

  // Helper functions for flood fill
  const getPixelColor = (imageData: ImageData, x: number, y: number): [number, number, number, number] => {
    const index = (y * imageData.width + x) * 4
    return [imageData.data[index], imageData.data[index + 1], imageData.data[index + 2], imageData.data[index + 3]]
  }

  const setPixelColor = (imageData: ImageData, x: number, y: number, color: [number, number, number, number]) => {
    const index = (y * imageData.width + x) * 4
    imageData.data[index] = color[0]
    imageData.data[index + 1] = color[1]
    imageData.data[index + 2] = color[2]
    imageData.data[index + 3] = color[3]
  }

  const colorsMatch = (color1: [number, number, number, number], color2: [number, number, number, number]): boolean => {
    const threshold = 10 // Allow some difference for anti-aliasing
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

  // Reset canvas
  const resetCanvas = () => {
    if (!canvasContext || !canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    canvasContext.fillStyle = "#888888"
    canvasContext.fillRect(0, 0, canvas.width, canvas.height)
    canvasContext.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height)

    // Save new state
    const newState = canvasContext.getImageData(0, 0, canvas.width, canvas.height)
    setCanvasHistory([newState])
    setHistoryIndex(0)
  }

  // Download canvas as image
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
        className="relative flex w-full h-full"
        style={{

          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Left Toolbar */}
        <div className="flex flex-col items-center gap-4 p-4 w-20">
          <ToolButton onClick={() => {}} icon={<Maximize className="w-6 h-6 text-white" />} color="bg-blue-500" />
          <ToolButton onClick={() => {}} icon={<Printer className="w-6 h-6 text-white" />} color="bg-blue-500" />
          <ToolButton onClick={resetCanvas} icon={<Trash2 className="w-6 h-6 text-white" />} color="bg-blue-500" />
          <ToolButton onClick={downloadImage} icon={<Download className="w-6 h-6 text-white" />} color="bg-green-500" />
          <div className="mt-auto">
            <button
              onClick={() => {console.log("Back to main menu")}}
              className="w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-md flex items-center justify-center hover:opacity-90 transition"
            >
              <ArrowLeft className="w-8 h-8 text-white" />
            </button>
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
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                width: "100%",
                height: "100%",
              }}
              className="absolute top-0 left-0"
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
            <ToolButton
              onClick={() => setActiveTool("brush")}
              icon={
                <div className="w-6 h-6 rounded-full border-2 border-white" style={{ background: activeColor }}></div>
              }
              color={activeTool === "brush" ? "bg-blue-500" : "bg-blue-400"}
            />
            <ToolButton
              onClick={() => setActiveTool("fill")}
              icon={<PaintBucket className="w-6 h-6 text-white" />}
              color={activeTool === "fill" ? "bg-green-500" : "bg-green-400"}
            />
            <ToolButton
              onClick={() => setActiveTool("eraser")}
              icon={<div className="w-6 h-6 bg-white rounded-sm"></div>}
              color={activeTool === "eraser" ? "bg-green-500" : "bg-green-400"}
            />
          </div>

          {/* Zoom Controls */}
          <div className="mt-4 flex flex-col gap-2">
            <ToolButton onClick={zoomIn} icon={<ZoomIn className="w-6 h-6 text-white" />} color="bg-blue-500" />
            <ToolButton onClick={zoomOut} icon={<ZoomOut className="w-6 h-6 text-white" />} color="bg-blue-500" />
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

