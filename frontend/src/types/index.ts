// TypeScript interfaces matching Go backend JSON structs

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

export type HospitalType = 'public' | 'private' | 'clinic' | 'ngo'

export type AlertStatus = 'active' | 'fulfilled' | 'expired' | 'cancelled'

export type DonorStatus = 'available' | 'unavailable' | 'en_route' | 'donated'

export type UrgencyLevel = 'critical' | 'high' | 'medium'

export interface Location {
  lat: number
  lng: number
  address?: string
  city?: string
  district?: string
}

export interface Hospital {
  id: string
  name: string
  type: HospitalType
  location: Location
  licenseNumber: string
  phone: string
  email: string
  verified: boolean
  verificationStatus: 'pending' | 'approved' | 'rejected'
  documentsUrls?: string[]
  createdAt: string
}

export interface Donor {
  id: string
  firstName: string
  lastName: string
  phone: string
  bloodType: BloodType
  location: Location
  status: DonorStatus
  totalDonations: number
  livesImpacted: number
  trophies: Trophy[]
  donationHistory: DonationRecord[]
  createdAt: string
}

export interface Alert {
  id: string
  hospitalId: string
  hospitalName: string
  bloodType: BloodType
  quantity: number
  urgencyLevel: UrgencyLevel
  status: AlertStatus
  videoUrl?: string
  thumbnailUrl?: string
  message?: string
  location: Location
  distance?: number
  matchedDonors: DonorMatch[]
  respondedCount: number
  createdAt: string
  expiresAt: string
}

export interface DonorMatch {
  donorId: string
  donorName: string
  distance: number
  status: DonorStatus
  estimatedArrival?: number
  acceptedAt?: string
  phone?: string
}

export interface Trophy {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt?: string
  locked: boolean
}

export interface DonationRecord {
  id: string
  hospitalName: string
  date: string
  bloodType: BloodType
  thankYouNote?: string
}

export interface HealthCheck {
  weight?: number
  lastDonation?: string
  hasChronicCondition?: boolean
  onMedication?: boolean
  ateRecently?: boolean
  eligible?: boolean
}

export interface DocumentUpload {
  id: string
  file: File
  name: string
  type: 'license' | 'certification' | 'identity' | 'other'
  uploadProgress: number
  uploadedUrl?: string
  status: 'pending' | 'uploading' | 'done' | 'error'
}

export interface APIResponse<T> {
  data: T
  success: boolean
  message?: string
  error?: string
}

export interface HeatmapPoint {
  lat: number
  lng: number
  intensity: number
  bloodType: BloodType
}
