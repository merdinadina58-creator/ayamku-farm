'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bird,
  Scale,
  Calculator,
  Plus,
  Trash2,
  TrendingUp,
  Package,
  DollarSign,
  Calendar,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  ArrowLeft,
  CheckCircle2,
  Activity,
  Skull,
  ShoppingBasket,
  LayoutDashboard,
  Menu,
  X,
  Settings,
  Upload,
  Image as ImageIcon,
  Save,
  Info,
  Loader2,
  Wrench,
  Pencil,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts'

// Types
interface FeedRecord {
  id: string
  batchId: string
  date: string
  feedType: string
  quantityKg: number
  pricePerKg: number
  notes: string | null
  createdAt: string
}

interface WeightRecord {
  id: string
  batchId: string
  date: string
  averageWeightGram: number
  ageDays: number
  sampleCount: number
  notes: string | null
  createdAt: string
}

interface MortalityRecord {
  id: string
  batchId: string
  date: string
  quantity: number
  reason: string
  notes: string | null
  createdAt: string
}

interface Batch {
  id: string
  name: string
  terminNumber: number
  arrivalDate: string
  initialWeight: number
  quantity: number
  status: string
  harvestDate: string | null
  harvestWeight: number | null
  harvestQuantity: number | null
  sellingPricePerKg: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
  feedRecords: FeedRecord[]
  weightRecords: WeightRecord[]
  mortalityRecords: MortalityRecord[]
  equipment: Equipment[]
}

interface DashboardData {
  totalBatches: number
  activeBatches: number
  harvestedBatches: number
  totalChickens: number
  totalMortality: number
  totalFeedKg: number
  totalFeedCost: number
  totalHarvestRevenue: number
  batchSummaries: Array<{
    id: string
    name: string
    terminNumber: number
    quantity: number
    status: string
    initialWeight: number
    latestWeightGram: number
    ageDays: number
    totalFeedKg: number
    totalFeedCost: number
    fcr: number
    feedPerEkor: number
    totalDead: number
    aliveCount: number
    mortalityRate: number
    harvestQuantity: number
    harvestWeight: number
    sellingPricePerKg: number
    totalHarvestKg: number
    totalHarvestValue: number
    profit: number
  }>
}

interface CalendarEvent {
  type: 'tiba' | 'panen'
  batch: Batch
}

interface Equipment {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  unitPrice: number
  purchaseDate: string
  notes: string | null
  batchId: string | null
  batch?: { id: string; name: string; terminNumber: number }
  createdAt: string
  updatedAt: string
}

interface Unit {
  id: string
  name: string
}

const EQUIPMENT_CATEGORIES = [
  'Kandang & Infrastruktur',
  'Peralatan Pakan & Minum',
  'Pemanas & Ventilasi',
  'Kebersihan & Sanitasi',
  'Alat Timbang & Ukur',
  'Alat Kesehatan',
  'Lainnya',
] as const

// Color palette
const COLORS = ['#16a34a', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899']
const FEED_TYPE_COLORS: Record<string, string> = {
  'Starter': '#16a34a',
  'Grower': '#f59e0b',
  'Finisher': '#ef4444',
  'Pre-Starter': '#06b6d4',
  'Lainnya': '#8b5cf6',
}
const MORTALITY_REASON_LABELS: Record<string, string> = {
  'sakit': 'Sakit',
  'stress': 'Stress / Heat',
  'kecelakaan': 'Kecelakaan',
  'afkir': 'Afkir / Culling',
  'lainnya': 'Lainnya',
}
const MORTALITY_REASON_COLORS: Record<string, string> = {
  'sakit': '#ef4444',
  'stress': '#f59e0b',
  'kecelakaan': '#8b5cf6',
  'afkir': '#06b6d4',
  'lainnya': '#6b7280',
}

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  termin: 'Termin',
  berat: 'Berat',
  mortalitas: 'Mortalitas',
  biaya: 'Biaya',
  panen: 'Panen',
  hitung: 'Perhitungan',
  kalender: 'Kalender',
  settings: 'Pengaturan',
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, iconColor: 'text-emerald-600' },
  { id: 'termin', label: 'Termin', icon: Package, iconColor: 'text-emerald-600' },
  { id: 'berat', label: 'Berat', icon: Scale, iconColor: 'text-teal-600' },
  { id: 'mortalitas', label: 'Mortalitas', icon: Skull, iconColor: 'text-red-600' },
  { id: 'biaya', label: 'Biaya', icon: Wrench, iconColor: 'text-indigo-600' },
  { id: 'panen', label: 'Panen', icon: ShoppingBasket, iconColor: 'text-amber-600' },
  { id: 'hitung', label: 'Perhitungan', icon: Calculator, iconColor: 'text-rose-600' },
  { id: 'kalender', label: 'Kalender', icon: CalendarDays, iconColor: 'text-emerald-600' },
  { id: 'settings', label: 'Pengaturan', icon: Settings, iconColor: 'text-gray-600' },
] as const

export default function HomePage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [view, setView] = useState<'dashboard' | 'batch-detail'>('dashboard')
  const { toast } = useToast()

  // Sidebar + section state
  const [activeSection, setActiveSection] = useState<'dashboard' | 'termin' | 'berat' | 'mortalitas' | 'biaya' | 'panen' | 'hitung' | 'kalender' | 'settings'>('dashboard')
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)

  // Settings state
  const [appSettings, setAppSettings] = useState({ appName: 'AyamKu Farm', logoData: '' })
  const [settingsForm, setSettingsForm] = useState({ appName: 'AyamKu Farm', logoData: '' })
  const [logoPreview, setLogoPreview] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [dayDetail, setDayDetail] = useState<{ date: Date; events: CalendarEvent[] } | null>(null)

  // Dialog states
  const [addBatchOpen, setAddBatchOpen] = useState(false)
  const [addWeightOpen, setAddWeightOpen] = useState(false)
  const [addMortalityOpen, setAddMortalityOpen] = useState(false)
  const [harvestOpen, setHarvestOpen] = useState(false)
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false)

  // When adding feed/weight/mortality from a MAIN section (not from batch detail),
  // we need the user to pick which batch the record belongs to.
  const [dialogBatchId, setDialogBatchId] = useState('')

  // Equipment form — peralatan dibeli PER TERMIN (terikat ke batch).
  // Tidak ada lagi state `equipments` terpisah; semua peralatan datang
  // nested di setiap batch (batches[].equipment), sama seperti pakan/berat/mortalitas.
  const [equipmentForm, setEquipmentForm] = useState({
    name: '', category: 'Peralatan Pakan & Minum', quantity: '', unit: 'Unit', unitPrice: '', purchaseDate: '', notes: '',
  })
  // Master daftar satuan (Sak, Karung, Liter, kg, dll) + state untuk tambah satuan baru
  const [units, setUnits] = useState<Unit[]>([])
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [newUnitName, setNewUnitName] = useState('')
  const [savingUnit, setSavingUnit] = useState(false)

  // Submission guard: prevents double-submit (double-click / race condition)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  // Form states
  const [batchForm, setBatchForm] = useState({
    name: '', terminNumber: '1', arrivalDate: '', initialWeight: '', quantity: '', notes: '',
  })
  const [weightForm, setWeightForm] = useState({
    date: '', averageWeightGram: '', ageDays: '', sampleCount: '1', notes: '',
  })
  const [mortalityForm, setMortalityForm] = useState({
    date: '', quantity: '', reason: 'sakit', notes: '',
  })
  const [harvestForm, setHarvestForm] = useState({
    harvestDate: '', harvestWeight: '', harvestQuantity: '', sellingPricePerKg: '',
  })

  // ============================================================
  // Auto-compute chicken age (umur) untuk form timbang berat.
  // Umur dihitung dari (tanggal timbang - tanggal masuk batch).
  // Batch aktif = selectedBatch (dari detail view) atau batch yang
  // dipilih di dropdown Termin dialog (dialogBatchId).
  // ============================================================
  const weightBatch = selectedBatch || batches.find((b) => b.id === dialogBatchId) || null
  const computedAgeDays = useMemo(() => {
    if (!weightBatch || !weightForm.date) return null
    const arrival = new Date(weightBatch.arrivalDate)
    const weigh = new Date(weightForm.date)
    if (isNaN(arrival.getTime()) || isNaN(weigh.getTime())) return null
    const diffMs = weigh.getTime() - arrival.getTime()
    if (diffMs < 0) return null // tanggal timbang sebelum tanggal masuk
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }, [weightBatch, weightForm.date])

  // Semua peralatan dari seluruh termin, diturunkan dari state `batches`
  // (peralatan datang nested di setiap batch). Dipakai untuk ringkasan di
  // section Hitung. Tidak ada fetch terpisah lagi.
  const allEquipments = useMemo(
    () => batches.flatMap((b) => b.equipment ?? []),
    [batches]
  )

  const fetchData = useCallback(async () => {
    try {
      const [batchRes, dashRes, settingsRes, unitsRes] = await Promise.all([
        fetch('/api/batches'),
        fetch('/api/dashboard'),
        fetch('/api/settings'),
        fetch('/api/units'),
      ])

      // Parse each response, guarding against non-OK responses so the UI
      // never crashes when the database is unreachable / not yet set up.
      const batchData = batchRes.ok ? await batchRes.json() : []
      const dashData = dashRes.ok ? await dashRes.json() : null
      const settingsData = settingsRes.ok ? await settingsRes.json() : {}
      const unitsData = unitsRes.ok ? await unitsRes.json() : []

      setBatches(Array.isArray(batchData) ? batchData : [])
      setDashboard(dashData)
      setAppSettings({ appName: settingsData.appName || 'AyamKu Farm', logoData: settingsData.logoData || '' })
      setSettingsForm({ appName: settingsData.appName || 'AyamKu Farm', logoData: settingsData.logoData || '' })
      setLogoPreview(settingsData.logoData || '')
      setUnits(Array.isArray(unitsData) ? unitsData : [])
    } catch {
      toast({ title: 'Error', description: 'Gagal memuat data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddBatch = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchForm),
      })
      if (!res.ok) throw new Error()
      setAddBatchOpen(false)
      setBatchForm({ name: '', terminNumber: '1', arrivalDate: '', initialWeight: '', quantity: '', notes: '' })
      toast({ title: 'Berhasil! 🐔', description: 'Termin baru berhasil ditambahkan' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menambahkan termin', variant: 'destructive' })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleAddWeight = async () => {
    const batchId = dialogBatchId || selectedBatch?.id
    if (!batchId) return
    // Umur ayam harus sudah otomatis terhitung dari tanggal timbang & tanggal masuk.
    if (computedAgeDays === null) return
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const payload = {
        date: weightForm.date,
        averageWeightGram: weightForm.averageWeightGram,
        ageDays: String(computedAgeDays),
        sampleCount: weightForm.sampleCount,
        notes: weightForm.notes,
      }
      const res = await fetch(`/api/batches/${batchId}/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      setAddWeightOpen(false)
      setDialogBatchId('')
      setWeightForm({ date: '', averageWeightGram: '', ageDays: '', sampleCount: '1', notes: '' })
      toast({ title: 'Berhasil! ⚖️', description: 'Data berat berhasil ditambahkan' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menambahkan data berat', variant: 'destructive' })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleAddMortality = async () => {
    const batchId = dialogBatchId || selectedBatch?.id
    if (!batchId) return
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const res = await fetch(`/api/batches/${batchId}/mortality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mortalityForm),
      })
      if (!res.ok) throw new Error()
      setAddMortalityOpen(false)
      setDialogBatchId('')
      setMortalityForm({ date: '', quantity: '', reason: 'sakit', notes: '' })
      toast({ title: 'Berhasil!', description: 'Data kematian berhasil ditambahkan' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menambahkan data kematian', variant: 'destructive' })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const openHarvestDialog = (batch: Batch) => {
    setSelectedBatch(batch)
    if (batch.status === 'harvested') {
      // Edit mode — pre-fill form dengan data panen yang sudah ada
      setHarvestForm({
        harvestDate: batch.harvestDate ? new Date(batch.harvestDate).toISOString().split('T')[0] : '',
        harvestWeight: batch.harvestWeight?.toString() || '',
        harvestQuantity: batch.harvestQuantity?.toString() || '',
        sellingPricePerKg: batch.sellingPricePerKg?.toString() || '',
      })
    } else {
      // New harvest mode — form kosong
      setHarvestForm({ harvestDate: '', harvestWeight: '', harvestQuantity: '', sellingPricePerKg: '' })
    }
    setHarvestOpen(true)
  }

  const handleHarvest = async () => {
    if (!selectedBatch) return
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    const isEdit = selectedBatch.status === 'harvested'
    try {
      const res = await fetch(`/api/batches/${selectedBatch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'harvested',
          harvestDate: harvestForm.harvestDate,
          harvestWeight: harvestForm.harvestWeight,
          harvestQuantity: harvestForm.harvestQuantity,
          sellingPricePerKg: harvestForm.sellingPricePerKg,
        }),
      })
      if (!res.ok) throw new Error()
      setHarvestOpen(false)
      setHarvestForm({ harvestDate: '', harvestWeight: '', harvestQuantity: '', sellingPricePerKg: '' })
      toast({ title: 'Berhasil! 🎉', description: isEdit ? 'Data panen berhasil diperbarui' : 'Ayam berhasil dipanen' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal memperbarui status panen', variant: 'destructive' })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleDeleteWeight = async (id: string) => {
    try {
      await fetch(`/api/weight/${id}`, { method: 'DELETE' })
      toast({ title: 'Dihapus', description: 'Data berat berhasil dihapus' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus data berat', variant: 'destructive' })
    }
  }

  const handleDeleteMortality = async (id: string) => {
    try {
      await fetch(`/api/mortality/${id}`, { method: 'DELETE' })
      toast({ title: 'Dihapus', description: 'Data kematian berhasil dihapus' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus data kematian', variant: 'destructive' })
    }
  }

  const handleDeleteBatch = async (id: string) => {
    if (!confirm('Yakin ingin menghapus termin ini? Semua data terkait juga akan dihapus.')) return
    try {
      await fetch(`/api/batches/${id}`, { method: 'DELETE' })
      toast({ title: 'Dihapus', description: 'Termin berhasil dihapus' })
      setView('dashboard')
      setSelectedBatch(null)
      setActiveSection('termin')
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus termin', variant: 'destructive' })
    }
  }

  const openBatchDetail = (batch: Batch) => {
    setSelectedBatch(batch)
    setView('batch-detail')
  }

  const handleAddEquipment = async () => {
    // Biaya wajib terikat ke sebuah termin (batch).
    const batchId = dialogBatchId || selectedBatch?.id
    if (!batchId) {
      toast({ title: 'Pilih Termin', description: 'Pilih termin untuk catatan biaya ini', variant: 'destructive' })
      return
    }
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...equipmentForm, batchId }),
      })
      if (!res.ok) throw new Error()
      setAddEquipmentOpen(false)
      setDialogBatchId('')
      setShowAddUnit(false)
      setNewUnitName('')
      setEquipmentForm({ name: '', category: 'Peralatan Pakan & Minum', quantity: '', unit: 'Unit', unitPrice: '', purchaseDate: '', notes: '' })
      toast({ title: 'Berhasil! 💰', description: 'Biaya berhasil ditambahkan ke termin' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menambahkan biaya', variant: 'destructive' })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleDeleteEquipment = async (id: string) => {
    if (!confirm('Yakin ingin menghapus catatan biaya ini?')) return
    try {
      await fetch(`/api/equipment/${id}`, { method: 'DELETE' })
      toast({ title: 'Dihapus', description: 'Biaya berhasil dihapus' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus biaya', variant: 'destructive' })
    }
  }

  // Tambah satuan baru (Sak, Karung, Liter, kg, dll) ke master daftar.
  // Satuan baru otomatis terpilih di form peralatan setelah disimpan.
  const handleAddUnit = async () => {
    const name = newUnitName.trim()
    if (!name) {
      toast({ title: 'Oops', description: 'Nama satuan tidak boleh kosong', variant: 'destructive' })
      return
    }
    if (savingUnit) return
    setSavingUnit(true)
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      const created: Unit = await res.json()
      // Tambahkan ke daftar satuan (hindari duplikat di state), urut abjad.
      setUnits((prev) =>
        prev.some((u) => u.name.toLowerCase() === created.name.toLowerCase())
          ? prev
          : [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      )
      setEquipmentForm((prev) => ({ ...prev, unit: created.name }))
      setNewUnitName('')
      setShowAddUnit(false)
      toast({ title: 'Satuan ditambahkan ✅', description: `Satuan "${created.name}" siap dipakai` })
    } catch {
      toast({ title: 'Error', description: 'Gagal menambah satuan', variant: 'destructive' })
    } finally {
      setSavingUnit(false)
    }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName: settingsForm.appName, logoData: settingsForm.logoData }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAppSettings({ appName: data.appName, logoData: data.logoData })
      toast({ title: 'Pengaturan Tersimpan! ✅', description: 'Nama aplikasi dan logo telah diperbarui' })
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan pengaturan', variant: 'destructive' })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'File harus berupa gambar', variant: 'destructive' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Ukuran gambar maksimal 2MB', variant: 'destructive' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string

      // Check image dimensions to warn about icon quality
      const img = new window.Image()
      img.onload = () => {
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (w < 192 || h < 192) {
          toast({
            title: '⚠ Ukuran gambar kecil',
            description: `Gambar ${w}×${h}px. Untuk ikon PWA & Android yang tajam, disarankan minimal 512×512px persegi. Logo akan tetap dipakai tapi mungkin pecah.`,
            duration: 6000,
          })
        } else if (w !== h) {
          toast({
            title: 'ℹ Gambar tidak persegi',
            description: `Gambar ${w}×${h}px akan otomatis di-pad jadi persegi saat dijadikan ikon. Untuk hasil terbaik, gunakan gambar persegi (mis. 512×512px).`,
            duration: 6000,
          })
        }
      }
      img.src = dataUrl

      setLogoPreview(dataUrl)
      setSettingsForm((prev) => ({ ...prev, logoData: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoPreview('')
    setSettingsForm((prev) => ({ ...prev, logoData: '' }))
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  }

  // Computed values for selected batch
  const getBatchStats = (batch: Batch) => {
    const totalFeed = batch.feedRecords.reduce((s, f) => s + f.quantityKg, 0)
    const totalCost = batch.feedRecords.reduce((s, f) => s + f.quantityKg * f.pricePerKg, 0)
    const totalDead = batch.mortalityRecords.reduce((s, m) => s + m.quantity, 0)
    const aliveCount = batch.quantity - totalDead
    const latestWeight = batch.weightRecords.length > 0
      ? batch.weightRecords.reduce((latest, r) => new Date(r.date) > new Date(latest.date) ? r : latest, batch.weightRecords[0]).averageWeightGram
      : batch.initialWeight * 1000
    const weightGain = latestWeight - batch.initialWeight * 1000
    const fcr = weightGain > 0 && aliveCount > 0 ? (totalFeed * 1000) / (aliveCount * weightGain) : 0
    const now = batch.status === 'harvested' && batch.harvestDate ? new Date(batch.harvestDate) : new Date()
    const arrival = new Date(batch.arrivalDate)
    const ageDays = Math.floor((now.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24))
    const feedPerEkor = aliveCount > 0 ? totalFeed / aliveCount : 0
    const mortalityRate = batch.quantity > 0 ? (totalDead / batch.quantity) * 100 : 0

    // Harvest calculations
    const harvestQty = batch.harvestQuantity || 0
    const harvestWt = batch.harvestWeight || 0
    const sellPrice = batch.sellingPricePerKg || 0
    const totalHarvestKg = harvestQty * harvestWt
    const totalHarvestValue = totalHarvestKg * sellPrice
    const profit = totalHarvestValue - totalCost

    return {
      totalFeed, totalCost, latestWeight, weightGain, fcr, ageDays,
      feedPerEkor, totalDead, aliveCount, mortalityRate,
      harvestQty, harvestWt, sellPrice, totalHarvestKg, totalHarvestValue, profit,
    }
  }

  // Calendar events derived from batches
  const calendarEvents = useMemo(() => {
    const events: Record<string, CalendarEvent[]> = {}
    batches.forEach((batch) => {
      const arriveKey = new Date(batch.arrivalDate).toDateString()
      if (!events[arriveKey]) events[arriveKey] = []
      events[arriveKey].push({ type: 'tiba', batch })
      if (batch.harvestDate) {
        const harvestKey = new Date(batch.harvestDate).toDateString()
        if (!events[harvestKey]) events[harvestKey] = []
        events[harvestKey].push({ type: 'panen', batch })
      }
    })
    return events
  }, [batches])

  // Calendar grid cells (data, not JSX)
  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<{ day: number | null; date: Date | null; events: CalendarEvent[] }> = []
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, date: null, events: [] })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const key = date.toDateString()
      cells.push({ day, date, events: calendarEvents[key] || [] })
    }
    return cells
  }, [calendarMonth, calendarEvents])

  const renderSidebar = () => (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <div className="p-4 border-b border-emerald-100">
        <div className="flex items-center gap-3">
          {appSettings.logoData ? (
            <img src={appSettings.logoData} alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
              <Bird className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-bold bg-gradient-to-r from-emerald-700 to-amber-600 bg-clip-text text-transparent truncate">{appSettings.appName}</h1>
            <p className="text-xs text-muted-foreground truncate">Manajemen Peternakan Ayam</p>
          </div>
        </div>
      </div>

      {/* Tambah Termin button */}
      <div className="p-3">
        <Button
          onClick={() => setAddBatchOpen(true)}
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-200/50 gap-2"
        >
          <Plus className="w-4 h-4" /> Tambah Termin
        </Button>
      </div>

      {/* Nav list */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive = view === 'dashboard' && activeSection === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); setView('dashboard'); setSelectedBatch(null); setSidebarMobileOpen(false) }}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-emerald-600" />}
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? item.iconColor : 'text-gray-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer info card */}
      <div className="p-3 border-t border-emerald-100">
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-amber-50/50 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-600">Ringkasan Termin</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-700">{dashboard?.totalBatches || 0}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-700">{dashboard?.activeBatches || 0}</p>
              <p className="text-[10px] text-muted-foreground">Aktif</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-700">{dashboard?.harvestedBatches || 0}</p>
              <p className="text-[10px] text-muted-foreground">Panen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Close button - mobile only */}
      <div className="lg:hidden p-3 border-t border-emerald-100">
        <Button variant="outline" className="w-full gap-2" onClick={() => setSidebarMobileOpen(false)}>
          <X className="w-4 h-4" /> Tutup Menu
        </Button>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-amber-50/30 to-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-emerald-50/80 via-amber-50/20 to-white">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-emerald-100 bg-white/70 backdrop-blur-xl shrink-0 sticky top-0 h-screen">
        {renderSidebar()}
      </aside>

      {/* Sidebar - Mobile */}
      <Sheet open={sidebarMobileOpen} onOpenChange={setSidebarMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 border-emerald-100 bg-white">
          <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
          <SheetDescription className="sr-only">Pilih menu untuk berpindah halaman</SheetDescription>
          {renderSidebar()}
        </SheetContent>
      </Sheet>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setSidebarMobileOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              {/* Mobile brand */}
              <div className="flex items-center gap-2 lg:hidden min-w-0">
                {appSettings.logoData ? (
                  <img src={appSettings.logoData} alt="Logo" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
                    <Bird className="w-5 h-5 text-white" />
                  </div>
                )}
                <h1 className="text-base font-bold bg-gradient-to-r from-emerald-700 to-amber-600 bg-clip-text text-transparent truncate">{appSettings.appName}</h1>
              </div>
              {/* Desktop contextual title */}
              <div className="hidden lg:block min-w-0">
                <h1 className="text-lg font-bold text-gray-800 truncate">{view === 'batch-detail' ? 'Detail Termin' : SECTION_LABELS[activeSection]}</h1>
                <p className="text-xs text-muted-foreground truncate">{view === 'batch-detail' && selectedBatch ? selectedBatch.name : 'Sistem Manajemen Peternakan Ayam'}</p>
              </div>
            </div>
            {/* Desktop Tambah Termin button */}
            <Button
              onClick={() => setAddBatchOpen(true)}
              className="hidden lg:flex bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-200/50 gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Termin</span>
            </Button>
          </div>

          {/* Horizontal Navbar - all sections accessible from top */}
          <div className="border-t border-emerald-100 bg-white/50 overflow-x-auto custom-scrollbar">
            <div className="flex gap-1 px-4 sm:px-6 py-2 min-w-max">
              {NAV_ITEMS.map((item) => {
                const isActive = view === 'dashboard' && activeSection === item.id
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveSection(item.id); setView('dashboard'); setSelectedBatch(null) }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? item.iconColor : 'text-gray-400'}`} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 pb-6">
          <AnimatePresence mode="wait">
            {view === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Hero Banner + Stats Cards - only on dashboard section */}
                {activeSection === 'dashboard' && (
                  <>
                    {/* Hero Banner */}
                    <div className="relative rounded-2xl overflow-hidden mb-6 shadow-xl">
                      <img src="/chicken-farm-hero.png" alt="Peternakan Ayam" className="w-full h-40 sm:h-56 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 via-emerald-900/50 to-transparent flex items-center">
                        <div className="px-6 sm:px-10">
                          <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Selamat Datang di {appSettings.appName}</h2>
                          <p className="text-emerald-100 text-xs sm:text-base max-w-md">Kelola bibit, biaya, berat, kematian, dan panen ayam Anda dengan mudah dan efisien.</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                      {[
                        { icon: Package, label: 'Total Termin', value: dashboard?.totalBatches || 0, color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-200/50' },
                        { icon: Bird, label: 'Ayam Hidup', value: dashboard?.totalChickens || 0, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-200/50' },
                        { icon: Skull, label: 'Total Mortalitas', value: dashboard?.totalMortality || 0, color: 'from-red-500 to-red-700', shadow: 'shadow-red-200/50' },
                      ].map((stat, i) => (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                            <CardContent className="p-4 sm:p-5">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">{stat.label}</p>
                                  <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{stat.value}</p>
                                </div>
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadow} shrink-0`}>
                                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}

                {/* Termin Section */}
                {activeSection === 'termin' && (
                  <>
                    {batches.length === 0 ? (
                      <Card className="border-dashed border-2 border-emerald-200">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                            <Bird className="w-10 h-10 text-emerald-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-700">Belum Ada Termin</h3>
                          <p className="text-muted-foreground text-sm mt-1">Mulai tambahkan bibit ayam pertama Anda</p>
                          <Button className="mt-4 bg-gradient-to-r from-emerald-600 to-emerald-700 gap-2" onClick={() => setAddBatchOpen(true)}>
                            <Plus className="w-4 h-4" /> Tambah Termin Pertama
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {batches.map((batch, i) => {
                          const stats = getBatchStats(batch)
                          return (
                            <motion.div
                              key={batch.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              <Card
                                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
                                onClick={() => openBatchDetail(batch)}
                              >
                                <div className={`h-1.5 ${batch.status === 'active' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`} />
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between">
                                    <div className="min-w-0">
                                      <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <span className="truncate">{batch.name}</span>
                                        <Badge variant={batch.status === 'active' ? 'default' : 'secondary'} className={batch.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
                                          {batch.status === 'active' ? 'Aktif' : 'Panen'}
                                        </Badge>
                                      </CardTitle>
                                      <CardDescription className="mt-1">
                                        Termin #{batch.terminNumber} • {formatDate(batch.arrivalDate)}
                                      </CardDescription>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 transition-colors shrink-0" />
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0 space-y-3">
                                  {/* 6 stats grid - all pencatatan per termin */}
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-emerald-50/50 rounded-lg p-2 text-center">
                                      <p className="text-[10px] text-muted-foreground">Awal</p>
                                      <p className="text-sm font-bold text-emerald-700">{batch.quantity.toLocaleString('id-ID')}</p>
                                    </div>
                                    <div className="bg-green-50/50 rounded-lg p-2 text-center">
                                      <p className="text-[10px] text-muted-foreground">Hidup</p>
                                      <p className="text-sm font-bold text-green-700">{stats.aliveCount.toLocaleString('id-ID')}</p>
                                    </div>
                                    <div className="bg-amber-50/50 rounded-lg p-2 text-center">
                                      <p className="text-[10px] text-muted-foreground">Umur</p>
                                      <p className="text-sm font-bold text-amber-700">{stats.ageDays} hari</p>
                                    </div>
                                    <div className="bg-teal-50/50 rounded-lg p-2 text-center">
                                      <p className="text-[10px] text-muted-foreground">Berat</p>
                                      <p className="text-sm font-bold text-teal-700">{(stats.latestWeight / 1000).toFixed(2)} kg</p>
                                    </div>
                                    <div className="bg-indigo-50/50 rounded-lg p-2 text-center">
                                      <p className="text-[10px] text-muted-foreground">Biaya</p>
                                      <p className="text-sm font-bold text-indigo-700 truncate">{formatCurrency(batch.equipment?.reduce((s, e) => s + e.quantity * e.unitPrice, 0) || 0)}</p>
                                    </div>
                                    <div className="bg-red-50/50 rounded-lg p-2 text-center">
                                      <p className="text-[10px] text-muted-foreground">Mati</p>
                                      <p className="text-sm font-bold text-red-700">{stats.totalDead} ({stats.mortalityRate.toFixed(1)}%)</p>
                                    </div>
                                  </div>
                                  {/* Weight progress bar */}
                                  <div>
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                      <span>Berat: {(stats.latestWeight / 1000).toFixed(2)} kg</span>
                                      <span>Target: ~1.8 kg</span>
                                    </div>
                                    <Progress value={Math.min((stats.latestWeight / 1800) * 100, 100)} className="h-2" />
                                  </div>
                                  {/* Panen info - only for harvested batches */}
                                  {batch.status === 'harvested' && (
                                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-2.5 border border-amber-200">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-semibold text-amber-700 flex items-center gap-1">
                                          <ShoppingBasket className="w-3 h-3" /> Panen
                                        </span>
                                        <span className="text-amber-800">{batch.harvestQuantity?.toLocaleString('id-ID')} ekor • {(batch.harvestWeight || 0).toFixed(2)} kg/ekor</span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-green-700">Pendapatan:</span>
                                        <span className="font-bold text-green-700">{formatCurrency((batch.harvestQuantity || 0) * (batch.harvestWeight || 0) * (batch.sellingPricePerKg || 0))}</span>
                                      </div>
                                    </div>
                                  )}
                                  {/* Quick action buttons - stopPropagation to prevent card click */}
                                  <div className="flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openBatchDetail(batch)}>
                                      <ChevronRight className="w-3 h-3" /> Detail
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-teal-300 text-teal-700 hover:bg-teal-50" onClick={() => { setDialogBatchId(batch.id); setWeightForm({ date: '', averageWeightGram: '', ageDays: '', sampleCount: '1', notes: '' }); setAddWeightOpen(true) }}>
                                      <Plus className="w-3 h-3" /> Berat
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50" onClick={() => { setDialogBatchId(batch.id); setEquipmentForm({ name: '', category: 'Peralatan Pakan & Minum', quantity: '', unit: 'Unit', unitPrice: '', purchaseDate: '', notes: '' }); setShowAddUnit(false); setNewUnitName(''); setAddEquipmentOpen(true) }}>
                                      <Plus className="w-3 h-3" /> Biaya
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => openHarvestDialog(batch)}>
                                      {batch.status === 'active' ? <><CheckCircle2 className="w-3 h-3" /> Panen</> : <><Pencil className="w-3 h-3" /> Edit Panen</>}
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Berat Section */}
                {activeSection === 'berat' && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2">
                            <Scale className="w-5 h-5 text-teal-600" />
                            Tracking Berat Ayam
                          </CardTitle>
                          <CardDescription>Grafik pertumbuhan berat ayam per termin</CardDescription>
                        </div>
                        {batches.length > 0 && (
                          <Button size="sm" className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shrink-0" onClick={() => { setDialogBatchId(batches[0]?.id || ''); setWeightForm({ date: '', averageWeightGram: '', ageDays: '', sampleCount: '1', notes: '' }); setAddWeightOpen(true) }}>
                            <Plus className="w-4 h-4" /> Tambah Berat
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {batches.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>Belum ada data berat</p>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {batches.map((batch) => {
                            const sortedWeights = [...batch.weightRecords].sort((a, b) => a.ageDays - b.ageDays)
                            const chartData = sortedWeights.map((w) => ({
                              umur: `Hari ${w.ageDays}`,
                              berat: w.averageWeightGram,
                            }))

                            return (
                              <div key={batch.id} className="border rounded-xl p-4">
                                <div className="flex items-center justify-between mb-4 gap-2">
                                  <h3 className="font-bold truncate">{batch.name} <Badge variant="outline" className="text-xs ml-1">Termin #{batch.terminNumber}</Badge></h3>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm text-muted-foreground">Berat Awal: {(batch.initialWeight * 1000).toFixed(0)} gram</p>
                                    <p className="text-sm font-bold text-teal-700">
                                      Berat Saat Ini: {sortedWeights.length > 0 ? `${sortedWeights[sortedWeights.length - 1].averageWeightGram.toFixed(0)} gram` : '-'}
                                    </p>
                                  </div>
                                </div>
                                {chartData.length > 1 ? (
                                  <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="umur" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} unit="g" />
                                        <Tooltip formatter={(value: number) => [`${value} gram`, 'Berat Rata-rata']} />
                                        <Line type="monotone" dataKey="berat" stroke="#16a34a" strokeWidth={3} dot={{ r: 5, fill: '#16a34a' }} activeDot={{ r: 7 }} />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground text-sm">
                                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p>Minimal 2 data berat diperlukan untuk menampilkan grafik</p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Mortalitas Section */}
                {activeSection === 'mortalitas' && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2">
                            <Skull className="w-5 h-5 text-red-600" />
                            Rekap Mortalitas Seluruh Termin
                          </CardTitle>
                          <CardDescription>Data ayam mati, afkir, dan tidak layak jual</CardDescription>
                        </div>
                        {batches.length > 0 && (
                          <Button size="sm" className="gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shrink-0" onClick={() => { setDialogBatchId(batches[0]?.id || ''); setMortalityForm({ date: '', quantity: '', reason: 'sakit', notes: '' }); setAddMortalityOpen(true) }}>
                            <Plus className="w-4 h-4" /> Tambah Mortalitas
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {batches.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Skull className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>Belum ada data mortalitas</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {batches.map((batch) => {
                            const totalDead = batch.mortalityRecords.reduce((s, m) => s + m.quantity, 0)
                            const mortalityRate = batch.quantity > 0 ? (totalDead / batch.quantity) * 100 : 0
                            const deadByReason = batch.mortalityRecords.reduce((acc, m) => {
                              if (!acc[m.reason]) acc[m.reason] = 0
                              acc[m.reason] += m.quantity
                              return acc
                            }, {} as Record<string, number>)

                            const pieData = Object.entries(deadByReason).map(([reason, qty]) => ({
                              name: MORTALITY_REASON_LABELS[reason] || reason,
                              value: qty,
                            }))

                            return (
                              <div key={batch.id} className="border rounded-xl p-4 bg-gradient-to-r from-white to-red-50/20">
                                <div className="flex items-center justify-between mb-3 gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <h3 className="font-bold truncate">{batch.name}</h3>
                                    <Badge variant="outline" className="text-xs">Termin #{batch.terminNumber}</Badge>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-lg font-bold text-red-700">{totalDead} ekor</p>
                                    <p className="text-xs text-muted-foreground">Mortalitas: {mortalityRate.toFixed(1)}%</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-3">
                                  <div className="bg-emerald-50 rounded-lg p-2 text-center">
                                    <p className="text-xs text-muted-foreground">Awal</p>
                                    <p className="text-sm font-bold text-emerald-700">{batch.quantity.toLocaleString('id-ID')}</p>
                                  </div>
                                  <div className="bg-red-50 rounded-lg p-2 text-center">
                                    <p className="text-xs text-muted-foreground">Mati/Afkir</p>
                                    <p className="text-sm font-bold text-red-700">{totalDead}</p>
                                  </div>
                                  <div className="bg-amber-50 rounded-lg p-2 text-center">
                                    <p className="text-xs text-muted-foreground">Hidup</p>
                                    <p className="text-sm font-bold text-amber-700">{(batch.quantity - totalDead).toLocaleString('id-ID')}</p>
                                  </div>
                                </div>

                                {pieData.length > 0 && (
                                  <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <div className="w-40 h-40 shrink-0">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {pieData.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={MORTALITY_REASON_COLORS[Object.keys(MORTALITY_REASON_LABELS).find(k => MORTALITY_REASON_LABELS[k] === entry.name) || 'lainnya'] || COLORS[index]} />
                                            ))}
                                          </Pie>
                                          <Tooltip formatter={(value: number) => [`${value} ekor`, 'Jumlah']} />
                                        </PieChart>
                                      </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 space-y-1.5 w-full">
                                      {Object.entries(deadByReason).map(([reason, qty]) => (
                                        <div key={reason} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/60">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: MORTALITY_REASON_COLORS[reason] || '#6b7280' }} />
                                            <span className="text-sm font-medium truncate">{MORTALITY_REASON_LABELS[reason] || reason}</span>
                                          </div>
                                          <span className="text-sm font-bold shrink-0">{qty} ekor</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Mortality timeline */}
                                {batch.mortalityRecords.length > 0 && (
                                  <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Riwayat Kematian:</p>
                                    {batch.mortalityRecords.map((m) => (
                                      <div key={m.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/40">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MORTALITY_REASON_COLORS[m.reason] || '#6b7280' }} />
                                          <span className="text-xs">{formatDate(m.date)}</span>
                                          <span className="text-xs text-muted-foreground truncate">• {MORTALITY_REASON_LABELS[m.reason] || m.reason}</span>
                                        </div>
                                        <span className="text-xs font-bold shrink-0">{m.quantity} ekor</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {batch.mortalityRecords.length === 0 && (
                                  <p className="text-sm text-muted-foreground text-center py-2">Tidak ada catatan mortalitas</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Biaya Section */}
                {activeSection === 'biaya' && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-indigo-600" />
                            Catatan Biaya per Termin
                          </CardTitle>
                          <CardDescription>Catatan pembelian dan biaya operasional untuk setiap termin</CardDescription>
                        </div>
                        {batches.length > 0 && (
                          <Button size="sm" className="gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shrink-0" onClick={() => { setDialogBatchId(batches[0]?.id || ''); setEquipmentForm({ name: '', category: 'Peralatan Pakan & Minum', quantity: '', unit: 'Unit', unitPrice: '', purchaseDate: '', notes: '' }); setShowAddUnit(false); setNewUnitName(''); setAddEquipmentOpen(true) }}>
                            <Plus className="w-4 h-4" /> Tambah Biaya
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const totalItems = allEquipments.reduce((s, e) => s + e.quantity, 0)
                        const totalCost = allEquipments.reduce((s, e) => s + e.quantity * e.unitPrice, 0)
                        return (
                          <>
                            {/* Summary cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                                <p className="text-xs text-muted-foreground">Jenis Biaya</p>
                                <p className="text-lg font-bold text-indigo-700">{allEquipments.length}</p>
                              </div>
                              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                <p className="text-xs text-muted-foreground">Total Item</p>
                                <p className="text-lg font-bold text-emerald-700">{totalItems.toLocaleString('id-ID')}</p>
                              </div>
                              <div className="bg-amber-50 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                                <p className="text-xs text-muted-foreground">Total Nilai</p>
                                <p className="text-lg font-bold text-amber-700 break-words">{formatCurrency(totalCost)}</p>
                              </div>
                            </div>

                            {batches.length === 0 ? (
                              <div className="text-center py-12 text-muted-foreground">
                                <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>Belum ada termin</p>
                                <p className="text-xs mt-1">Buat termin terlebih dahulu sebelum mencatat biaya</p>
                              </div>
                            ) : (
                              <div className="space-y-5">
                                {/* Group by termin/batch */}
                                {batches.map((batch) => {
                                  const equipList = batch.equipment ?? []
                                  const batchCost = equipList.reduce((s, e) => s + e.quantity * e.unitPrice, 0)
                                  const batchItems = equipList.reduce((s, e) => s + e.quantity, 0)
                                  return (
                                    <div key={batch.id} className="border rounded-xl p-4 bg-gradient-to-r from-white to-indigo-50/20">
                                      <div className="flex items-center justify-between mb-3 gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Wrench className="w-4 h-4 text-indigo-600 shrink-0" />
                                          <h3 className="font-bold truncate">{batch.name}</h3>
                                          <Badge variant="outline" className="text-xs shrink-0">Termin #{batch.terminNumber}</Badge>
                                          <Badge variant="outline" className="text-xs shrink-0">{equipList.length} jenis</Badge>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                          <p className="text-sm font-bold text-indigo-700">{batchItems.toLocaleString('id-ID')} item</p>
                                          <p className="text-xs text-muted-foreground">{formatCurrency(batchCost)}</p>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        {equipList.length === 0 ? (
                                          <p className="text-sm text-muted-foreground text-center py-2">Belum ada catatan biaya untuk termin ini</p>
                                        ) : (
                                          equipList.map((e) => (
                                            <div key={e.id} className="group flex items-center justify-between py-2 px-3 rounded-lg bg-white/60 gap-2">
                                              <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{e.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {e.quantity} {e.unit} × {formatCurrency(e.unitPrice)} • {formatDate(e.purchaseDate)}
                                                  {e.notes ? ` • ${e.notes}` : ''}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-sm font-bold">{formatCurrency(e.quantity * e.unitPrice)}</span>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-50 sm:opacity-0 sm:group-hover:opacity-100 text-red-500 hover:text-red-700" onClick={() => handleDeleteEquipment(e.id)}>
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </CardContent>
                  </Card>
                )}

                {/* Panen Section */}
                {activeSection === 'panen' && (() => {
                  const harvestedBatches = batches.filter(b => b.status === 'harvested')
                  const activeBatches = batches.filter(b => b.status === 'active')
                  const totalHarvestQty = harvestedBatches.reduce((s, b) => s + (b.harvestQuantity || 0), 0)
                  const totalHarvestKg = harvestedBatches.reduce((s, b) => s + ((b.harvestQuantity || 0) * (b.harvestWeight || 0)), 0)
                  const totalRevenue = harvestedBatches.reduce((s, b) => s + ((b.harvestQuantity || 0) * (b.harvestWeight || 0) * (b.sellingPricePerKg || 0)), 0)
                  return (
                    <div className="space-y-4">
                      {/* Summary cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Card className="border-0 shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                <ShoppingBasket className="w-4 h-4 text-amber-600" />
                              </div>
                              <p className="text-xs text-muted-foreground">Termin Panen</p>
                            </div>
                            <p className="text-2xl font-bold text-amber-700">{harvestedBatches.length}</p>
                            <p className="text-xs text-muted-foreground">dari {batches.length} termin</p>
                          </CardContent>
                        </Card>
                        <Card className="border-0 shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                <Bird className="w-4 h-4 text-orange-600" />
                              </div>
                              <p className="text-xs text-muted-foreground">Total Ekor Panen</p>
                            </div>
                            <p className="text-2xl font-bold text-orange-700">{totalHarvestQty.toLocaleString('id-ID')}</p>
                            <p className="text-xs text-muted-foreground">ekor</p>
                          </CardContent>
                        </Card>
                        <Card className="border-0 shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                                <Scale className="w-4 h-4 text-teal-600" />
                              </div>
                              <p className="text-xs text-muted-foreground">Total Berat Panen</p>
                            </div>
                            <p className="text-2xl font-bold text-teal-700">{totalHarvestKg.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">kg</p>
                          </CardContent>
                        </Card>
                        <Card className="border-0 shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <DollarSign className="w-4 h-4 text-green-600" />
                              </div>
                              <p className="text-xs text-muted-foreground">Total Pendapatan</p>
                            </div>
                            <p className="text-xl sm:text-2xl font-bold text-green-700 break-words">{formatCurrency(totalRevenue)}</p>
                            <p className="text-xs text-muted-foreground">dari {harvestedBatches.length} panen</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Main card with batch list */}
                      <Card className="border-0 shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <ShoppingBasket className="w-5 h-5 text-amber-600" />
                            Riwayat Panen per Termin
                          </CardTitle>
                          <CardDescription>
                            {batches.length === 0
                              ? 'Tambahkan termin terlebih dahulu untuk mencatat panen'
                              : 'Catat dan kelola data panen untuk setiap termin ayam'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {batches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                                <ShoppingBasket className="w-8 h-8 text-amber-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-700">Belum Ada Termin</h3>
                              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                                Untuk mencatat panen, tambahkan termin (batch ayam) terlebih dahulu di menu Termin.
                              </p>
                              <Button className="mt-4 gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700" onClick={() => setActiveSection('termin')}>
                                <Package className="w-4 h-4" /> Ke Menu Termin
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                              {/* Harvested batches first */}
                              {harvestedBatches.map((batch) => {
                                const revenue = (batch.harvestQuantity || 0) * (batch.harvestWeight || 0) * (batch.sellingPricePerKg || 0)
                                return (
                                  <Card key={batch.id} className="border-amber-200 bg-amber-50/40 overflow-hidden">
                                    <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h4 className="font-bold truncate">{batch.name}</h4>
                                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Panen</Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground mb-2">
                                            Tgl Panen: {batch.harvestDate ? formatDate(batch.harvestDate) : '—'} • Termin #{batch.terminNumber}
                                          </p>
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className="bg-white/60 rounded-lg p-2">
                                              <p className="text-[10px] text-muted-foreground">Jumlah</p>
                                              <p className="text-sm font-bold text-amber-700">{(batch.harvestQuantity || 0).toLocaleString('id-ID')} ekor</p>
                                            </div>
                                            <div className="bg-white/60 rounded-lg p-2">
                                              <p className="text-[10px] text-muted-foreground">Berat/Ekor</p>
                                              <p className="text-sm font-bold text-orange-700">{(batch.harvestWeight || 0).toFixed(2)} kg</p>
                                            </div>
                                            <div className="bg-white/60 rounded-lg p-2">
                                              <p className="text-[10px] text-muted-foreground">Harga/kg</p>
                                              <p className="text-sm font-bold text-emerald-700">{formatCurrency(batch.sellingPricePerKg || 0)}</p>
                                            </div>
                                            <div className="bg-white/60 rounded-lg p-2">
                                              <p className="text-[10px] text-muted-foreground">Pendapatan</p>
                                              <p className="text-sm font-bold text-green-700 break-words">{formatCurrency(revenue)}</p>
                                            </div>
                                          </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0" onClick={() => openHarvestDialog(batch)}>
                                          <Pencil className="w-4 h-4" /> Edit Panen
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )
                              })}

                              {/* Active batches (not yet harvested) */}
                              {activeBatches.map((batch) => {
                                const stats = getBatchStats(batch)
                                return (
                                  <Card key={batch.id} className="border-emerald-200 overflow-hidden">
                                    <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h4 className="font-bold truncate">{batch.name}</h4>
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aktif</Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground">
                                            Termin #{batch.terminNumber} • {stats.aliveCount.toLocaleString('id-ID')} ekor hidup • Umur {stats.ageDays} hari • Tiba {formatDate(batch.arrivalDate)}
                                          </p>
                                        </div>
                                        <Button size="sm" className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shrink-0" onClick={() => openHarvestDialog(batch)}>
                                          <CheckCircle2 className="w-4 h-4" /> Panen
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )
                              })}

                              {batches.length > 0 && harvestedBatches.length === 0 && activeBatches.length > 0 && (
                                <p className="text-center text-xs text-muted-foreground pt-2">
                                  Belum ada termin yang dipanen. Klik tombol <span className="font-semibold text-amber-700">Panen</span> pada termin di atas untuk mencatat panen.
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )
                })()}

                {/* Hitung Section */}
                {activeSection === 'hitung' && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-rose-600" />
                        Perhitungan & Total Panen Per Termin
                      </CardTitle>
                      <CardDescription>Kalkulasi biaya, FCR, mortalitas, dan total panen per termin</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {batches.length === 0 && allEquipments.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>Belum ada data untuk dihitung</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Equipment cost summary */}
                          {allEquipments.length > 0 && (() => {
                            const totalEquipCost = allEquipments.reduce((s, e) => s + e.quantity * e.unitPrice, 0)
                            const totalEquipItems = allEquipments.reduce((s, e) => s + e.quantity, 0)
                            return (
                              <div className="border rounded-xl p-4 bg-gradient-to-r from-white to-indigo-50/20">
                                <h3 className="font-bold mb-3 flex items-center gap-2">
                                  <Wrench className="w-4 h-4 text-indigo-600" />
                                  Ringkasan Biaya
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  <div className="bg-indigo-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Jenis</p>
                                    <p className="text-lg font-bold text-indigo-700">{allEquipments.length}</p>
                                  </div>
                                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Total Item</p>
                                    <p className="text-lg font-bold text-emerald-700">{totalEquipItems.toLocaleString('id-ID')}</p>
                                  </div>
                                  <div className="bg-amber-50 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                                    <p className="text-xs text-muted-foreground">Total Nilai</p>
                                    <p className="text-base sm:text-lg font-bold text-amber-700 break-words">{formatCurrency(totalEquipCost)}</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}
                          {/* Summary Chart */}
                          {dashboard && dashboard.batchSummaries.length > 0 && (
                            <div className="border rounded-xl p-4 bg-gradient-to-br from-white to-rose-50/20">
                              <h3 className="font-bold mb-4 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-rose-600" />
                                Perbandingan Per Termin
                              </h3>
                              <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={dashboard.batchSummaries.map((b) => ({
                                    name: b.name,
                                    'Total Pakan (kg)': b.totalFeedKg,
                                    'Biaya (Rp ribu)': Math.round(b.totalFeedCost / 1000),
                                    'Mati/Afkir': b.totalDead,
                                  }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Total Pakan (kg)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Biaya (Rp ribu)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Mati/Afkir" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}

                          {/* Per-termin detail cards */}
                          {batches.map((batch) => {
                            const stats = getBatchStats(batch)
                            const feedByType = batch.feedRecords.reduce((acc, f) => {
                              if (!acc[f.feedType]) acc[f.feedType] = { total: 0, cost: 0 }
                              acc[f.feedType].total += f.quantityKg
                              acc[f.feedType].cost += f.quantityKg * f.pricePerKg
                              return acc
                            }, {} as Record<string, { total: number; cost: number }>)

                            const pieData = Object.entries(feedByType).map(([type, data]) => ({
                              name: type,
                              value: data.total,
                              cost: data.cost,
                            }))

                            return (
                              <div key={batch.id} className="border rounded-xl overflow-hidden">
                                <div className="bg-gradient-to-r from-rose-50 to-amber-50 p-4 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <h3 className="font-bold text-lg truncate">{batch.name}</h3>
                                    <p className="text-sm text-muted-foreground">Termin #{batch.terminNumber} • {batch.quantity.toLocaleString('id-ID')} ekor awal • {stats.ageDays} hari</p>
                                  </div>
                                  <Badge variant={batch.status === 'active' ? 'default' : 'secondary'} className={batch.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} shrink-0>
                                    {batch.status === 'active' ? 'Aktif' : 'Panen'}
                                  </Badge>
                                </div>
                                <div className="p-4">
                                  {/* Feed & Cost stats */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Total Pakan</p>
                                      <p className="text-lg font-bold text-emerald-700">{stats.totalFeed.toFixed(1)} kg</p>
                                    </div>
                                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Total Biaya</p>
                                      <p className="text-base sm:text-lg font-bold text-amber-700 break-words">{formatCurrency(stats.totalCost)}</p>
                                    </div>
                                    <div className="bg-teal-50 rounded-xl p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Pakan/Ekor</p>
                                      <p className="text-lg font-bold text-teal-700">{stats.feedPerEkor.toFixed(2)} kg</p>
                                    </div>
                                    <div className="bg-violet-50 rounded-xl p-3 text-center">
                                      <p className="text-xs text-muted-foreground">FCR</p>
                                      <p className="text-lg font-bold text-violet-700">{stats.fcr.toFixed(2)}</p>
                                    </div>
                                  </div>

                                  {/* Mortality & Harvest stats */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    <div className="bg-red-50 rounded-xl p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Mati/Afkir</p>
                                      <p className="text-lg font-bold text-red-700">{stats.totalDead} ekor</p>
                                      <p className="text-xs text-red-500">{stats.mortalityRate.toFixed(1)}%</p>
                                    </div>
                                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Hidup</p>
                                      <p className="text-lg font-bold text-emerald-700">{stats.aliveCount.toLocaleString('id-ID')} ekor</p>
                                    </div>
                                    <div className="bg-orange-50 rounded-xl p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Total Panen</p>
                                      <p className="text-lg font-bold text-orange-700">{stats.totalHarvestKg.toFixed(1)} kg</p>
                                      {stats.harvestQty > 0 && <p className="text-xs text-muted-foreground">{stats.harvestQty} ekor × {stats.harvestWt} kg</p>}
                                    </div>
                                    <div className={`rounded-xl p-3 text-center ${stats.profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                      <p className="text-xs text-muted-foreground">{batch.status === 'harvested' ? 'Profit' : 'Estimasi Profit'}</p>
                                      <p className={`text-base sm:text-lg font-bold break-words ${stats.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(stats.profit)}</p>
                                      {stats.totalHarvestValue > 0 && <p className="text-xs text-muted-foreground break-words">Pendapatan: {formatCurrency(stats.totalHarvestValue)}</p>}
                                    </div>
                                  </div>

                                  {/* Pie chart for feed distribution */}
                                  {pieData.length > 0 && (
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                      <div className="w-48 h-48 shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                              {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={FEED_TYPE_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                                              ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Jumlah']} />
                                          </PieChart>
                                        </ResponsiveContainer>
                                      </div>
                                      <div className="flex-1 space-y-2 w-full">
                                        {Object.entries(feedByType).map(([type, data]) => (
                                          <div key={type} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: FEED_TYPE_COLORS[type] || '#8b5cf6' }} />
                                              <span className="text-sm font-medium">{type}</span>
                                            </div>
                                            <div className="text-right shrink-0">
                                              <span className="text-sm font-bold">{data.total.toFixed(1)} kg</span>
                                              <span className="text-xs text-muted-foreground ml-2">{formatCurrency(data.cost)}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {batch.feedRecords.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada data pakan untuk termin ini</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Kalender Section */}
                {activeSection === 'kalender' && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-emerald-600" />
                        Kalender Peternakan
                      </CardTitle>
                      <CardDescription>Jadwal kedatangan bibit (Tiba) dan panen ayam per termin</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {batches.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>Belum ada termin untuk ditampilkan di kalender</p>
                        </div>
                      ) : (
                        <>
                          {/* Month navigation */}
                          <div className="flex items-center justify-between mb-4">
                            <Button variant="outline" size="icon" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <h3 className="text-base font-bold capitalize">
                              {calendarMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            </h3>
                            <Button variant="outline" size="icon" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Day name headers */}
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                            ))}
                          </div>

                          {/* Calendar grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {calendarCells.map((cell, i) => {
                              if (!cell.date) {
                                return <div key={`blank-${i}`} className="min-h-[60px] sm:min-h-[80px]" />
                              }
                              const events = cell.events
                              const hasTiba = events.some((e) => e.type === 'tiba')
                              const hasPanen = events.some((e) => e.type === 'panen')
                              const isToday = new Date().toDateString() === cell.date.toDateString()
                              return (
                                <button
                                  key={cell.day}
                                  onClick={() => events.length > 0 && setDayDetail({ date: cell.date!, events })}
                                  className={`min-h-[60px] sm:min-h-[80px] p-1.5 rounded-lg border text-left transition-all ${
                                    events.length > 0
                                      ? 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer'
                                      : 'border-gray-100'
                                  } ${isToday ? 'ring-2 ring-emerald-400' : ''}`}
                                >
                                  <p className={`text-xs font-medium ${isToday ? 'text-emerald-700' : 'text-gray-600'}`}>{cell.day}</p>
                                  {hasTiba && (
                                    <div className="mt-1 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                      <span className="block text-[10px] font-medium text-emerald-700 truncate">Tiba</span>
                                    </div>
                                  )}
                                  {hasPanen && (
                                    <div className="mt-0.5 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                      <span className="block text-[10px] font-medium text-amber-700 truncate">Panen</span>
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>

                          {/* Legend */}
                          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-muted-foreground">Tiba (bibit masuk)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span className="text-muted-foreground">Panen</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded bg-white ring-2 ring-emerald-400" />
                              <span className="text-muted-foreground">Hari ini</span>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Settings Section */}
                {activeSection === 'settings' && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-600" />
                        Pengaturan Aplikasi
                      </CardTitle>
                      <CardDescription>Kustomisasi nama aplikasi dan logo. Perubahan logo akan menjadi ikon saat diinstal di Android.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* App Name */}
                      <div className="space-y-2">
                        <Label className="text-base font-medium">Nama Aplikasi</Label>
                        <Input value={settingsForm.appName} onChange={(e) => setSettingsForm({ ...settingsForm, appName: e.target.value })} placeholder="AyamKu Farm" maxLength={50} className="max-w-md" />
                        <p className="text-xs text-muted-foreground">Nama ini tampil di sidebar, header, footer, dan judul aplikasi</p>
                      </div>

                      {/* Logo Upload */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Logo Aplikasi</Label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          {/* Preview */}
                          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-emerald-200 flex items-center justify-center overflow-hidden bg-emerald-50/30 shrink-0">
                            {logoPreview ? (
                              <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-emerald-300" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2 min-w-0">
                            <div className="flex flex-wrap gap-2">
                              <label>
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                <Button variant="outline" className="gap-2 cursor-pointer" asChild>
                                  <span><Upload className="w-4 h-4" /> Pilih Gambar</span>
                                </Button>
                              </label>
                              {logoPreview && (
                                <Button variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive/10" onClick={handleRemoveLogo}>
                                  <Trash2 className="w-4 h-4" /> Hapus
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Format: PNG, JPG, SVG, WebP. Maksimal 2MB.<br />
                              <span className="text-emerald-600 font-medium">Disarankan: gambar persegi 512×512px PNG dengan latar transparan</span> untuk ikon tajam di Android & iOS.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Live Preview */}
                      <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-amber-50/30 p-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-3">PREVIEW TAMPILAN</p>
                        <div className="flex items-center gap-3">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-12 h-12 rounded-xl object-cover shadow-lg shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shrink-0">
                              <Bird className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold bg-gradient-to-r from-emerald-700 to-amber-600 bg-clip-text text-transparent truncate">{settingsForm.appName || 'AyamKu Farm'}</p>
                            <p className="text-xs text-muted-foreground">Manajemen Peternakan Ayam</p>
                          </div>
                        </div>
                      </div>

                      {/* Android Install Info */}
                      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">Cara Instal di Android</p>
                            <p className="text-xs text-blue-700">Buka aplikasi di browser Chrome Android → menu (⋮) → &quot;Tambahkan ke layar utama&quot;. Logo dan nama di atas akan menjadi ikon aplikasi.</p>
                          </div>
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t">
                        <Button variant="outline" onClick={() => { setSettingsForm({ appName: appSettings.appName, logoData: appSettings.logoData }); setLogoPreview(appSettings.logoData) }}>
                          Batal
                        </Button>
                        <Button onClick={handleSaveSettings} disabled={savingSettings} className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800">
                          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ) : selectedBatch && (
              <motion.div
                key="batch-detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Batch Detail View */}
                <div className="space-y-6">
                  {/* Back button & header */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 relative z-10">
                    <Button variant="ghost" onClick={() => { setView('dashboard'); setSelectedBatch(null); setActiveSection('termin') }} className="w-fit gap-2">
                      <ArrowLeft className="w-4 h-4" /> Kembali
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl sm:text-2xl font-bold truncate">{selectedBatch.name}</h2>
                        <Badge variant={selectedBatch.status === 'active' ? 'default' : 'secondary'} className={selectedBatch.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                          {selectedBatch.status === 'active' ? 'Aktif' : 'Panen'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Termin #{selectedBatch.terminNumber} • {selectedBatch.quantity.toLocaleString('id-ID')} ekor awal • Tiba {formatDate(selectedBatch.arrivalDate)}
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 flex-1 sm:flex-none" onClick={() => openHarvestDialog(selectedBatch)}>
                        {selectedBatch.status === 'active' ? (
                          <><CheckCircle2 className="w-4 h-4" /> Panen</>
                        ) : (
                          <><Pencil className="w-4 h-4" /> Edit Panen</>
                        )}
                      </Button>
                      <Button variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive/10 flex-1 sm:flex-none" onClick={() => handleDeleteBatch(selectedBatch.id)}>
                        <Trash2 className="w-4 h-4" /> Hapus
                      </Button>
                    </div>
                  </div>

                  {/* Batch Stats */}
                  {(() => {
                    const stats = getBatchStats(selectedBatch)
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        {[
                          { icon: Bird, label: 'Awal', value: `${selectedBatch.quantity.toLocaleString('id-ID')}`, bg: 'bg-emerald-50', text: 'text-emerald-700' },
                          { icon: Bird, label: 'Hidup', value: `${stats.aliveCount.toLocaleString('id-ID')}`, bg: 'bg-green-50', text: 'text-green-700' },
                          { icon: Skull, label: 'Mati/Afkir', value: `${stats.totalDead} (${stats.mortalityRate.toFixed(1)}%)`, bg: 'bg-red-50', text: 'text-red-700' },
                          { icon: Calendar, label: 'Umur', value: `${stats.ageDays} hari`, bg: 'bg-amber-50', text: 'text-amber-700' },
                          { icon: Scale, label: 'Berat', value: `${(stats.latestWeight / 1000).toFixed(2)} kg`, bg: 'bg-teal-50', text: 'text-teal-700' },
                          { icon: TrendingUp, label: 'FCR', value: stats.fcr.toFixed(2), bg: 'bg-violet-50', text: 'text-violet-700' },
                        ].map((stat) => (
                          <Card key={stat.label} className="border-0 shadow-md">
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-center gap-2 mb-1">
                                <stat.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground truncate">{stat.label}</span>
                              </div>
                              <p className={`text-sm sm:text-base font-bold ${stat.text} break-words`}>{stat.value}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )
                  })()}

                  {/* Weight Chart */}
                  {selectedBatch.weightRecords.length > 1 && (
                    <Card className="border-0 shadow-lg">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                          Grafik Pertumbuhan
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[...selectedBatch.weightRecords]
                              .sort((a, b) => a.ageDays - b.ageDays)
                              .map((w) => ({
                                umur: `Hari ${w.ageDays}`,
                                berat: w.averageWeightGram,
                              }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="umur" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} unit="g" />
                              <Tooltip formatter={(value: number) => [`${value} gram`, 'Berat Rata-rata']} />
                              <Line type="monotone" dataKey="berat" stroke="#16a34a" strokeWidth={3} dot={{ r: 5, fill: '#16a34a' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Detail Tabs: Weight, Mortality, Biaya */}
                  <Tabs defaultValue="berat" className="space-y-4">
                    <TabsList className="bg-white shadow-sm border p-1 grid grid-cols-3 sm:flex sm:flex-wrap">
                      <TabsTrigger value="berat" className="gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 w-full sm:w-auto">
                        <Scale className="w-4 h-4" /> Berat
                      </TabsTrigger>
                      <TabsTrigger value="mortalitas" className="gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700 w-full sm:w-auto">
                        <Skull className="w-4 h-4" /> Mortalitas
                      </TabsTrigger>
                      <TabsTrigger value="biaya" className="gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 w-full sm:w-auto">
                        <Wrench className="w-4 h-4" /> Biaya
                      </TabsTrigger>
                    </TabsList>

                    {/* Weight Records */}
                    <TabsContent value="berat">
                      <Card className="border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Scale className="w-4 h-4 text-teal-600" />
                              Riwayat Berat
                            </CardTitle>
                            <CardDescription>Catatan timbang berat ayam</CardDescription>
                          </div>
                          {selectedBatch.status === 'active' && (
                            <Button size="sm" className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shrink-0" onClick={() => setAddWeightOpen(true)}>
                              <Plus className="w-4 h-4" /> Tambah
                            </Button>
                          )}
                        </CardHeader>
                        <CardContent>
                          {selectedBatch.weightRecords.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Scale className="w-10 h-10 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">Belum ada catatan berat</p>
                              <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setAddWeightOpen(true)}>
                                <Plus className="w-3 h-3" /> Tambah Data Pertama
                              </Button>
                            </div>
                          ) : (
                            <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                              {selectedBatch.weightRecords.map((weight) => (
                                <div key={weight.id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-teal-50/50 to-transparent hover:from-teal-50 transition-colors group">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                                      <span className="text-xs font-bold text-teal-700">H{weight.ageDays}</span>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-sm truncate">{weight.averageWeightGram.toFixed(0)} gram ({(weight.averageWeightGram / 1000).toFixed(3)} kg)</p>
                                      <p className="text-xs text-muted-foreground">{formatDate(weight.date)} • {weight.sampleCount} sampel</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground">Gain</p>
                                      <p className="text-sm font-bold text-emerald-600">
                                        +{(weight.averageWeightGram - selectedBatch.initialWeight * 1000).toFixed(0)}g
                                      </p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteWeight(weight.id) }}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Mortality Records */}
                    <TabsContent value="mortalitas">
                      <Card className="border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Skull className="w-4 h-4 text-red-600" />
                              Riwayat Mortalitas
                            </CardTitle>
                            <CardDescription>Catatan ayam mati, afkir, dan tidak layak jual</CardDescription>
                          </div>
                          {selectedBatch.status === 'active' && (
                            <Button size="sm" className="gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shrink-0" onClick={() => setAddMortalityOpen(true)}>
                              <Plus className="w-4 h-4" /> Tambah
                            </Button>
                          )}
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const totalDead = selectedBatch.mortalityRecords.reduce((s, m) => s + m.quantity, 0)
                            const mortalityRate = selectedBatch.quantity > 0 ? (totalDead / selectedBatch.quantity) * 100 : 0

                            return (
                              <>
                                {/* Summary row */}
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Awal Masuk</p>
                                    <p className="text-lg font-bold text-emerald-700">{selectedBatch.quantity.toLocaleString('id-ID')} ekor</p>
                                  </div>
                                  <div className="bg-red-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Total Mati/Afkir</p>
                                    <p className="text-lg font-bold text-red-700">{totalDead} ekor ({mortalityRate.toFixed(1)}%)</p>
                                  </div>
                                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Masih Hidup</p>
                                    <p className="text-lg font-bold text-amber-700">{(selectedBatch.quantity - totalDead).toLocaleString('id-ID')} ekor</p>
                                  </div>
                                </div>

                                {selectedBatch.mortalityRecords.length === 0 ? (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <Skull className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Belum ada catatan mortalitas</p>
                                    <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setAddMortalityOpen(true)}>
                                      <Plus className="w-3 h-3" /> Tambah Data Pertama
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                                    {selectedBatch.mortalityRecords.map((m) => (
                                      <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-red-50/50 to-transparent hover:from-red-50 transition-colors group">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                                            <Skull className="w-5 h-5 text-red-600" />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-medium text-sm truncate">{MORTALITY_REASON_LABELS[m.reason] || m.reason}</p>
                                            <p className="text-xs text-muted-foreground truncate">{formatDate(m.date)}{m.notes ? ` • ${m.notes}` : ''}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                          <p className="font-bold text-sm text-red-700">{m.quantity} ekor</p>
                                          <Button variant="ghost" size="icon" className="opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteMortality(m.id) }}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Biaya Records (per termin) */}
                    <TabsContent value="biaya">
                      <Card className="border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Wrench className="w-4 h-4 text-indigo-600" />
                              Riwayat Biaya
                            </CardTitle>
                            <CardDescription>Catatan biaya & pembelian untuk termin ini</CardDescription>
                          </div>
                          <Button size="sm" className="gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shrink-0" onClick={() => { setEquipmentForm({ name: '', category: 'Peralatan Pakan & Minum', quantity: '', unit: 'Unit', unitPrice: '', purchaseDate: '', notes: '' }); setShowAddUnit(false); setNewUnitName(''); setAddEquipmentOpen(true) }}>
                            <Plus className="w-4 h-4" /> Tambah
                          </Button>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const equipList = selectedBatch.equipment ?? []
                            const totalCost = equipList.reduce((s, e) => s + e.quantity * e.unitPrice, 0)
                            const totalItems = equipList.reduce((s, e) => s + e.quantity, 0)
                            return (
                              <>
                                {/* Summary row */}
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                  <div className="bg-indigo-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Jenis</p>
                                    <p className="text-lg font-bold text-indigo-700">{equipList.length}</p>
                                  </div>
                                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Total Item</p>
                                    <p className="text-lg font-bold text-emerald-700">{totalItems.toLocaleString('id-ID')}</p>
                                  </div>
                                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Total Nilai</p>
                                    <p className="text-sm sm:text-lg font-bold text-amber-700 break-words">{formatCurrency(totalCost)}</p>
                                  </div>
                                </div>

                                {equipList.length === 0 ? (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Belum ada catatan biaya untuk termin ini</p>
                                    <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setAddEquipmentOpen(true)}>
                                      <Plus className="w-3 h-3" /> Tambah Biaya Pertama
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                                    {equipList.map((e) => (
                                      <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-indigo-50/50 to-transparent hover:from-indigo-50 transition-colors group">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                                            <Wrench className="w-5 h-5 text-indigo-600" />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-medium text-sm truncate">{e.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{e.quantity} {e.unit} × {formatCurrency(e.unitPrice)} • {formatDate(e.purchaseDate)}{e.notes ? ` • ${e.notes}` : ''}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                          <p className="font-bold text-sm">{formatCurrency(e.quantity * e.unitPrice)}</p>
                                          <Button variant="ghost" size="icon" className="opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive" onClick={(ev) => { ev.stopPropagation(); handleDeleteEquipment(e.id) }}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>

                  {/* Total Panen Card (only for harvested batches) */}
                  {selectedBatch.status === 'harvested' && (() => {
                    const stats = getBatchStats(selectedBatch)
                    return (
                      <Card className="border-0 shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <ShoppingBasket className="w-5 h-5" />
                            Total Panen
                          </h3>
                        </div>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-amber-50 rounded-xl p-3 text-center">
                              <p className="text-xs text-muted-foreground">Jumlah Panen</p>
                              <p className="text-lg font-bold text-amber-700">{stats.harvestQty.toLocaleString('id-ID')} ekor</p>
                            </div>
                            <div className="bg-orange-50 rounded-xl p-3 text-center">
                              <p className="text-xs text-muted-foreground">Total Berat Panen</p>
                              <p className="text-lg font-bold text-orange-700">{stats.totalHarvestKg.toFixed(1)} kg</p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-3 text-center">
                              <p className="text-xs text-muted-foreground">Pendapatan</p>
                              <p className="text-base sm:text-lg font-bold text-green-700 break-words">{formatCurrency(stats.totalHarvestValue)}</p>
                            </div>
                            <div className={`rounded-xl p-3 text-center ${stats.profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                              <p className="text-xs text-muted-foreground">Profit</p>
                              <p className={`text-base sm:text-lg font-bold break-words ${stats.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(stats.profit)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t bg-white/80 backdrop-blur-sm py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent">{appSettings.appName}</span>
              {' '}• Sistem Manajemen Peternakan Ayam
            </p>
          </div>
        </footer>
      </div>

      {/* Add Batch Dialog */}
      <Dialog open={addBatchOpen} onOpenChange={setAddBatchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Tambah Termin Baru
            </DialogTitle>
            <DialogDescription>Tambahkan bibit ayam baru ke peternakan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="batch-name">Nama Termin</Label>
                <Input id="batch-name" placeholder="Termin 1" value={batchForm.name} onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="termin-number">No. Termin</Label>
                <Input id="termin-number" type="number" min="1" value={batchForm.terminNumber} onChange={(e) => setBatchForm({ ...batchForm, terminNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="arrival-date">Tanggal Datang</Label>
                <Input id="arrival-date" type="date" value={batchForm.arrivalDate} onChange={(e) => setBatchForm({ ...batchForm, arrivalDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Jumlah (ekor)</Label>
                <Input id="quantity" type="number" min="1" placeholder="1000" value={batchForm.quantity} onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial-weight">Berat Awal (kg/ekor)</Label>
              <Input id="initial-weight" type="number" step="0.001" min="0" placeholder="0.040" value={batchForm.initialWeight} onChange={(e) => setBatchForm({ ...batchForm, initialWeight: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-notes">Catatan</Label>
              <Textarea id="batch-notes" placeholder="Catatan opsional..." value={batchForm.notes} onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })} />
            </div>
            <Button onClick={handleAddBatch} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800" disabled={submitting || !batchForm.name || !batchForm.arrivalDate || !batchForm.initialWeight || !batchForm.quantity}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Termin'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Weight Dialog */}
      <Dialog open={addWeightOpen} onOpenChange={setAddWeightOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-teal-600" />
              Tambah Data Timbang
            </DialogTitle>
            <DialogDescription>Catatan berat ayam{selectedBatch ? ` untuk ${selectedBatch.name}` : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {!selectedBatch && (
              <div className="space-y-2">
                <Label>Termin</Label>
                <Select value={dialogBatchId} onValueChange={(v) => setDialogBatchId(v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih termin..." /></SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name} — Termin #{b.terminNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Tanggal Timbang</Label>
              <Input type="date" value={weightForm.date} onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })} />
            </div>
            {/* Umur ayam otomatis terhitung dari tanggal timbang - tanggal masuk batch.
                Pengguna tidak perlu menginput umur lagi. */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Umur Ayam (otomatis)</Label>
                <div className="flex h-9 items-center rounded-md border border-teal-200 bg-teal-50 px-3 text-sm font-bold text-teal-700">
                  {computedAgeDays !== null ? `${computedAgeDays} hari` : '—'}
                </div>
                {weightBatch && (
                  <p className="text-xs text-muted-foreground">
                    Masuk: {formatDate(weightBatch.arrivalDate)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Jumlah Sampel</Label>
                <Input type="number" min="1" value={weightForm.sampleCount} onChange={(e) => setWeightForm({ ...weightForm, sampleCount: e.target.value })} />
              </div>
            </div>
            {weightForm.date && weightBatch && computedAgeDays === null && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-3 py-2">
                Tanggal timbang sebelum tanggal masuk batch — periksa kembali tanggalnya.
              </p>
            )}
            <div className="space-y-2">
              <Label>Berat Rata-rata (gram)</Label>
              <Input type="number" step="1" min="0" placeholder="160" value={weightForm.averageWeightGram} onChange={(e) => setWeightForm({ ...weightForm, averageWeightGram: e.target.value })} />
              {weightForm.averageWeightGram && (
                <p className="text-xs text-muted-foreground">= {(parseFloat(weightForm.averageWeightGram) / 1000).toFixed(3)} kg</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea placeholder="Catatan opsional..." value={weightForm.notes} onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })} />
            </div>
            <Button onClick={handleAddWeight} className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700" disabled={submitting || (!selectedBatch && !dialogBatchId) || !weightForm.date || !weightForm.averageWeightGram || computedAgeDays === null}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Data Timbang'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Mortality Dialog */}
      <Dialog open={addMortalityOpen} onOpenChange={setAddMortalityOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Skull className="w-5 h-5 text-red-600" />
              Tambah Data Mortalitas
            </DialogTitle>
            <DialogDescription>Catatan ayam mati/afkir{selectedBatch ? ` untuk ${selectedBatch.name}` : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {!selectedBatch && (
              <div className="space-y-2">
                <Label>Termin</Label>
                <Select value={dialogBatchId} onValueChange={(v) => setDialogBatchId(v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih termin..." /></SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name} — Termin #{b.terminNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={mortalityForm.date} onChange={(e) => setMortalityForm({ ...mortalityForm, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Jumlah (ekor)</Label>
                <Input type="number" min="1" placeholder="5" value={mortalityForm.quantity} onChange={(e) => setMortalityForm({ ...mortalityForm, quantity: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Penyebab</Label>
              <Select value={mortalityForm.reason} onValueChange={(v) => setMortalityForm({ ...mortalityForm, reason: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sakit">Sakit</SelectItem>
                  <SelectItem value="stress">Stress / Heat</SelectItem>
                  <SelectItem value="kecelakaan">Kecelakaan</SelectItem>
                  <SelectItem value="afkir">Afkir / Culling</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea placeholder="Catatan opsional..." value={mortalityForm.notes} onChange={(e) => setMortalityForm({ ...mortalityForm, notes: e.target.value })} />
            </div>
            {mortalityForm.quantity && (selectedBatch || dialogBatchId) && (() => {
              const batch = selectedBatch || batches.find((b) => b.id === dialogBatchId)
              if (!batch) return null
              return (
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Sisa Ayam Hidup (setelah input)</p>
                  <p className="text-lg font-bold text-red-700">
                    {batch.quantity - batch.mortalityRecords.reduce((s, m) => s + m.quantity, 0) - parseInt(mortalityForm.quantity || '0')} ekor
                  </p>
                </div>
              )
            })()}
            <Button onClick={handleAddMortality} className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700" disabled={submitting || (!selectedBatch && !dialogBatchId) || !mortalityForm.date || !mortalityForm.quantity}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Data Mortalitas'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Harvest Dialog */}
      <Dialog open={harvestOpen} onOpenChange={setHarvestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBasket className="w-5 h-5 text-amber-600" />
              {selectedBatch?.status === 'harvested' ? 'Edit Data Panen' : 'Panen Ayam'}
            </DialogTitle>
            <DialogDescription>
              {selectedBatch?.status === 'harvested'
                ? `Perbarui data panen untuk termin ${selectedBatch?.name}`
                : `Tandai termin ${selectedBatch?.name} sebagai sudah panen`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Tanggal Panen</Label>
              <Input type="date" value={harvestForm.harvestDate} onChange={(e) => setHarvestForm({ ...harvestForm, harvestDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jumlah Panen (ekor)</Label>
                <Input type="number" min="0" placeholder="4800" value={harvestForm.harvestQuantity} onChange={(e) => setHarvestForm({ ...harvestForm, harvestQuantity: e.target.value })} />
                {selectedBatch && (
                  <p className="text-xs text-muted-foreground">Hidup: {selectedBatch.quantity - selectedBatch.mortalityRecords.reduce((s, m) => s + m.quantity, 0)} ekor</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Berat Rata-rata (kg/ekor)</Label>
                <Input type="number" step="0.01" min="0" placeholder="1.8" value={harvestForm.harvestWeight} onChange={(e) => setHarvestForm({ ...harvestForm, harvestWeight: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Harga Jual per kg (Rp)</Label>
              <Input type="number" step="100" min="0" placeholder="22000" value={harvestForm.sellingPricePerKg} onChange={(e) => setHarvestForm({ ...harvestForm, sellingPricePerKg: e.target.value })} />
            </div>
            {harvestForm.harvestQuantity && harvestForm.harvestWeight && harvestForm.sellingPricePerKg && (
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Berat Panen</p>
                    <p className="text-lg font-bold text-amber-700">{(parseFloat(harvestForm.harvestQuantity) * parseFloat(harvestForm.harvestWeight)).toFixed(1)} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Pendapatan</p>
                    <p className="text-base sm:text-lg font-bold text-green-700 break-words">{formatCurrency(parseFloat(harvestForm.harvestQuantity) * parseFloat(harvestForm.harvestWeight) * parseFloat(harvestForm.sellingPricePerKg))}</p>
                  </div>
                </div>
              </div>
            )}
            <Button onClick={handleHarvest} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700" disabled={submitting || !harvestForm.harvestDate || !harvestForm.harvestWeight || !harvestForm.harvestQuantity || !harvestForm.sellingPricePerKg}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : (selectedBatch?.status === 'harvested' ? 'Simpan Perubahan' : 'Konfirmasi Panen')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Biaya Dialog */}
      <Dialog open={addEquipmentOpen} onOpenChange={setAddEquipmentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-600" />
              Tambah Biaya
            </DialogTitle>
            <DialogDescription>Catat pembelian dan biaya operasional{selectedBatch ? ` untuk ${selectedBatch.name}` : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Pilih termin — biaya wajib terikat ke sebuah termin. */}
            {!selectedBatch && (
              <div className="space-y-2">
                <Label>Termin</Label>
                <Select value={dialogBatchId} onValueChange={(v) => setDialogBatchId(v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih termin..." /></SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name} — Termin #{b.terminNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nama Barang</Label>
              <Input placeholder="mis. Broiler Pelet, Tempat Minum Otomatis" value={equipmentForm.name} onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={equipmentForm.category} onValueChange={(v) => setEquipmentForm({ ...equipmentForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jumlah</Label>
                <Input type="number" min="1" placeholder="5" value={equipmentForm.quantity} onChange={(e) => setEquipmentForm({ ...equipmentForm, quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Select
                  value={showAddUnit ? '__add_new__' : equipmentForm.unit}
                  onValueChange={(v) => {
                    if (v === '__add_new__') {
                      setShowAddUnit(true)
                    } else {
                      setShowAddUnit(false)
                      setEquipmentForm({ ...equipmentForm, unit: v })
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih satuan" /></SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                    ))}
                    <SelectItem value="__add_new__">➕ Tambah Satuan Baru…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {showAddUnit && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 p-2">
                <Input
                  placeholder="Satuan baru, mis. Sak, Karung, Liter…"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUnit() } }}
                  autoFocus
                />
                <Button type="button" size="sm" className="shrink-0 bg-indigo-600 hover:bg-indigo-700" onClick={handleAddUnit} disabled={savingUnit || !newUnitName.trim()}>
                  {savingUnit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => { setShowAddUnit(false); setNewUnitName('') }}>
                  Batal
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <Label>Harga / {equipmentForm.unit || 'satuan'} (Rp)</Label>
              <Input type="number" step="100" min="0" placeholder="500000" value={equipmentForm.unitPrice} onChange={(e) => setEquipmentForm({ ...equipmentForm, unitPrice: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Beli</Label>
              <Input type="date" value={equipmentForm.purchaseDate} onChange={(e) => setEquipmentForm({ ...equipmentForm, purchaseDate: e.target.value })} />
            </div>
            {equipmentForm.quantity && equipmentForm.unitPrice && (
              <div className="bg-indigo-50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Harga</p>
                <p className="text-lg font-bold text-indigo-700">{formatCurrency(parseFloat(equipmentForm.quantity) * parseFloat(equipmentForm.unitPrice))}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {equipmentForm.quantity || 0} {equipmentForm.unit || 'satuan'} × {formatCurrency(parseFloat(equipmentForm.unitPrice) || 0)}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea placeholder="Catatan opsional..." value={equipmentForm.notes} onChange={(e) => setEquipmentForm({ ...equipmentForm, notes: e.target.value })} />
            </div>
            <Button onClick={handleAddEquipment} className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700" disabled={submitting || (!selectedBatch && !dialogBatchId) || !equipmentForm.name || !equipmentForm.quantity || !equipmentForm.unitPrice || !equipmentForm.purchaseDate}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Biaya'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day Detail Dialog (Calendar) */}
      <Dialog open={!!dayDetail} onOpenChange={(open) => !open && setDayDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              {dayDetail?.date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </DialogTitle>
            <DialogDescription>
              {dayDetail?.events.length || 0} kegiatan pada tanggal ini
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {dayDetail?.events.map((event, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-white">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${event.type === 'tiba' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  {event.type === 'tiba' ? (
                    <Bird className="w-5 h-5 text-emerald-700" />
                  ) : (
                    <ShoppingBasket className="w-5 h-5 text-amber-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{event.batch.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Termin #{event.batch.terminNumber} •{' '}
                    {event.type === 'tiba'
                      ? `Bibit tiba • ${event.batch.quantity.toLocaleString('id-ID')} ekor`
                      : `Panen • ${event.batch.harvestQuantity?.toLocaleString('id-ID') || 0} ekor`}
                  </p>
                </div>
                <Badge variant="outline" className={`shrink-0 ${event.type === 'tiba' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {event.type === 'tiba' ? 'Tiba' : 'Panen'}
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  )
}
