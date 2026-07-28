import { MapContainer, TileLayer, Circle, CircleMarker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Centro aproximado de Breves/PA — ponto de partida do mapa.
export const CENTRO_BREVES: [number, number] = [-1.682, -50.48]

// Usamos CircleMarker (SVG) em vez de Marker com ícone PNG de propósito:
// os ícones do Leaflet quebram em bundlers como o Vite (caminho de imagem),
// e um círculo desenhado resolve sem depender de asset nenhum.

function CapturaClique({ aoEscolher }: { aoEscolher: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      aoEscolher(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

interface Props {
  lat: number | null
  lng: number | null
  raioKm: number
  aoEscolher: (lat: number, lng: number) => void
}

export function SeletorLocal({ lat, lng, raioKm, aoEscolher }: Props) {
  const centro: [number, number] = lat != null && lng != null ? [lat, lng] : CENTRO_BREVES

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-tinta/10">
      <MapContainer
        center={centro}
        zoom={13}
        style={{ height: 260, width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CapturaClique aoEscolher={aoEscolher} />

        {lat != null && lng != null && (
          <>
            {/* área atendida */}
            <Circle
              center={[lat, lng]}
              radius={raioKm * 1000}
              pathOptions={{ color: '#1B7A5A', fillColor: '#1B7A5A', fillOpacity: 0.12, weight: 2 }}
            />
            {/* ponto base */}
            <CircleMarker
              center={[lat, lng]}
              radius={8}
              pathOptions={{ color: '#F2760C', fillColor: '#F2760C', fillOpacity: 1, weight: 3 }}
            />
          </>
        )}
      </MapContainer>
    </div>
  )
}
