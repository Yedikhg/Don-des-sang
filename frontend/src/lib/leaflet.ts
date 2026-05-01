import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

let initialized = false

export function initLeaflet(): void {
  if (initialized) return
  initialized = true

  const defaultIcon = L.icon({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

  L.Marker.prototype.options.icon = defaultIcon
}
