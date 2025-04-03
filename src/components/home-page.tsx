"use client"

import { useState } from "react"
import Image from "next/image"
import { Search } from "lucide-react"
import ColoringApp from "./coloring-app"
import { coloringImages } from "@/lib/coloring-data"

export default function HomePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  if (selectedImage) {
    return <ColoringApp imagePath={selectedImage} onBack={() => setSelectedImage(null)} />
  }

  const filteredImages = coloringImages.filter((image) => image.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold">ColorKids</h1>

          </div>
          <div className="flex items-center">
            <div className="flex items-center bg-white rounded-md overflow-hidden">
              <input
                type="text"
                placeholder="Rechercher"
                className="px-4 py-2 text-gray-800 w-64 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="bg-white px-3 py-2 text-gray-600">
                <Search size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white py-4 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-center space-x-8">
            <NavItem title="COLORIAGES" icon="/icons/test.png" active />
            <NavItem title="DESSINS POUR LES ENFANTS" icon="/icons/test.png" />
            <NavItem title="ACTIVITÉS MANUELLES" icon="/icons/test.png" />
            <NavItem title="JEUX EN LIGNE GRATUITS" icon="/icons/test.png" />
            <NavItem title="LECTURE" icon="/icons/test.png" />
            <NavItem title="VIDÉOS ET TUTORIELS" icon="/icons/test.png" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 bg-yellow-200 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
            <div className="flex flex-wrap">
              {/* Coloring Images Grid */}
              <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative overflow-hidden rounded-lg shadow-md cursor-pointer transform transition-transform hover:scale-105"
                    onClick={() => setSelectedImage(image.path)}
                  >
                    <Image
                      src={image.thumbnail || "/placeholder.svg"}
                      alt={image.title}
                      width={500}
                      height={400}
                      className="w-full h-auto"
                    />
                    {image.special && (
                      <div className="absolute bottom-0 right-0 bg-red-500 text-white px-4 py-1 rounded-tl-lg">
                        SPÉCIAL
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="w-full lg:w-1/3 pl-0 lg:pl-6 mt-6 lg:mt-0">
                <div className="bg-orange-500 text-white p-6 rounded-lg">
                  <h2 className="text-2xl font-bold mb-4">COLORIAGES</h2>
                  <p className="text-sm">
                    Découvre les milliers de coloriages à imprimer ou à colorier en ligne que nous avons sélectionnés
                    pour toi : des coloriages de super-héros, de princesses, d&apos;animaux, de mandalas, des coloriages
                    de tes dessins animés et films préférés, des coloriages magiques et tout un tas d&apos;autres
                    coloriages gratuits !
                  </p>
                  <p className="text-sm mt-4">
                    Avec ColorKids, tu peux même fabriquer tes propres coloriages personnalisés !
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

interface NavItemProps {
  title: string
  icon: string
  active?: boolean
}

function NavItem({ title, icon, active }: NavItemProps) {
  return (
    <div className={`flex flex-col items-center ${active ? "text-orange-500" : "text-gray-600"} cursor-pointer`}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100">
        <Image src={icon || "/placeholder.svg"} alt={title} width={32} height={32} />
      </div>
      <span className="text-xs font-bold mt-1 text-center max-w-[100px]">{title}</span>
    </div>
  )
}

