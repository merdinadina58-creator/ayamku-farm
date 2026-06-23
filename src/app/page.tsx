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
  AlertTriangle,
  Wallet,
  Banknote,
  Clock,
  ReceiptText,
  Download,
  Search,
  Target,
  FileText,
  FileSpreadsheet,
  Eye,
  Printer,
  RotateCcw,
  Receipt,
  Camera,
  X as XIcon,
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
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Types

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

interface HarvestRecord {
  id: string
  batchId: string
  date: string
  quantity: number
  weightPerEkor: number
  sellingPricePerKg: number
  buyerName: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
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
  weightRecords: WeightRecord[]
  mortalityRecords: MortalityRecord[]
  equipment: Equipment[]
  harvestRecords: HarvestRecord[]
}

interface DashboardData {
  totalBatches: number
  activeBatches: number
  harvestedBatches: number
  totalChickens: number
  totalMortality: number
  totalHarvestRevenue: number
  totalHarvestedEkor: number
  // Ringkasan metode pembayaran Cash vs BON di seluruh equipment.
  // totalCashSpent = total nilai equipment yang dibayar tunai.
  // totalBonAmount = total nilai equipment yang masih BON (utang).
  // bonCount = jumlah transaksi equipment berstatus BON.
  totalCashSpent: number
  totalBonAmount: number
  bonCount: number
  batchSummaries: Array<{
    id: string
    name: string
    terminNumber: number
    quantity: number
    status: string
    initialWeight: number
    latestWeightGram: number
    ageDays: number
    totalDead: number
    aliveCount: number
    mortalityRate: number
    harvestQuantity: number
    harvestWeight: number
    sellingPricePerKg: number
    totalHarvestKg: number
    totalHarvestValue: number
    profit: number
    harvestRecordsCount: number
    bonAmount: number
  }>
}

interface CalendarEvent {
  type: 'tiba' | 'panen'
  batch: Batch
  // Untuk event 'panen' partial — referensi ke harvest record spesifik.
  // Jika undefined, event ini dari legacy batch.harvestDate.
  harvestRecord?: HarvestRecord
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
  // Foto nota pembelian peralatan (base64 JPEG data URL, sudah dikompres).
  notaData: string | null
  notaName: string | null
  batchId: string | null
  // Metode pembayaran: "cash" (tunai) atau "bon" (utang / belum dibayar).
  // Default "cash" — data lama otomatis dapat "cash" lewat @default Prisma.
  paymentMethod: string
  batch?: { id: string; name: string; terminNumber: number }
  createdAt: string
  updatedAt: string
}

interface Unit {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

// Item dalam mode multi-item form. Field shared (tanggal beli, foto nota)
// tetap disimpan di `equipmentForm`; field per-item disimpan di sini.
// `newUnitName` & `newCategoryName` dipakai untuk inline "tambah baru" per item.
// `paymentMethod` per-item — tiap item bisa Cash atau BON secara independen.
interface EquipmentFormItem {
  id: string
  name: string
  category: string
  quantity: string
  unit: string
  unitPrice: string
  notes: string
  newUnitName: string
  newCategoryName: string
  paymentMethod: string
}

// Kategori default — juga dipakai API untuk auto-seed tabel Category saat kosong.
// Di UI, kategori diambil dinamis dari /api/categories agar user bisa tambah baru.
const DEFAULT_EQUIPMENT_CATEGORY = 'Peralatan Pakan & Minum'

// Color palette
const COLORS = ['#16a34a', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899']
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

// Pure helper for batch statistics (module-level so it can be used in useMemos
// without being recreated every render). Mirrors the logic previously inline
// in the component's getBatchStats closure.
//
// Catatan: fitur Pakan (feedRecords) sudah dihapus — totalCost sekarang
// murni dari equipment (biaya operasional). FCR & feedPerEktor dihilangkan.
function computeBatchStats(batch: Batch) {
  const totalCost = batch.equipment?.reduce((s, e) => s + e.quantity * e.unitPrice, 0) || 0
  const totalDead = batch.mortalityRecords.reduce((s, m) => s + m.quantity, 0)
  const aliveCount = batch.quantity - totalDead
  const latestWeight = batch.weightRecords.length > 0
    ? batch.weightRecords.reduce((latest, r) => new Date(r.date) > new Date(latest.date) ? r : latest, batch.weightRecords[0]).averageWeightGram
    : batch.initialWeight * 1000
  const weightGain = latestWeight - batch.initialWeight * 1000
  // Reference date untuk hitung umur: jika batch sudah panen, pakai tanggal
  // panen terbaru dari harvestRecords (atau legacy harvestDate).
  const latestHarvestDate = batch.harvestRecords.length > 0
    ? batch.harvestRecords
        .map((h) => new Date(h.date))
        .reduce((latest, d) => d > latest ? d : latest, new Date(batch.harvestRecords[0].date))
    : batch.harvestDate
  const now = batch.status === 'harvested' && latestHarvestDate ? new Date(latestHarvestDate) : new Date()
  const arrival = new Date(batch.arrivalDate)
  const ageDays = Math.floor((now.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24))
  const mortalityRate = batch.quantity > 0 ? (totalDead / batch.quantity) * 100 : 0
  // Harvest calculations — dari sum harvestRecords (atau fallback legacy).
  // Virtual migration di API menjamin batch.harvestRecords selalu terisi
  // jika ada data panen (legacy atau baru).
  const harvestQty = batch.harvestRecords.reduce((s, h) => s + h.quantity, 0)
  const totalHarvestKg = batch.harvestRecords.reduce((s, h) => s + h.quantity * h.weightPerEkor, 0)
  const totalHarvestValue = batch.harvestRecords.reduce(
    (s, h) => s + h.quantity * h.weightPerEkor * h.sellingPricePerKg,
    0
  )
  // Berat rata-rata & harga rata-rata tertimbang (untuk display).
  const harvestWt = harvestQty > 0 ? totalHarvestKg / harvestQty : 0
  const sellPrice = totalHarvestKg > 0 ? totalHarvestValue / totalHarvestKg : 0
  const profit = totalHarvestValue - totalCost
  return {
    totalCost, latestWeight, weightGain, ageDays,
    totalDead, aliveCount, mortalityRate,
    harvestQty, harvestWt, sellPrice, totalHarvestKg, totalHarvestValue, profit,
  }
}

// Build a filesystem-safe export file name in the format:
//   "{AppName}_{TerminName}_Termin-{N}"
// Spaces & Unicode letters are preserved (e.g. "AyamKu Farm_Termin 2 Bulan Mei_Termin-2"),
// only filesystem-illegal characters ([\\/:*?"<>|] and control chars) are stripped.
// Empty inputs fall back to safe defaults so the file always has a usable name.
// The termin number is always appended (falls back to 1 if invalid) so users can
// tell apart reports from different termin even when names are similar.
function buildExportFileName(appName: string, terminName: string, terminNumber?: number | string): string {
  const sanitize = (s: string) =>
    (s || '')
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, '') // filesystem-illegal chars
      .replace(/\s+/g, ' ')                  // collapse multiple spaces
      .trim()
  const app = sanitize(appName) || 'AyamKu Farm'
  const termin = sanitize(terminName) || 'Termin'
  // Normalize termin number: accept number or numeric string, fallback to 1.
  const num = Number(terminNumber)
  const safeNum = Number.isFinite(num) && num > 0 ? num : 1
  return `${app}_${termin}_Termin-${safeNum}`
}

// ============================================================
// Kompresi foto nota sebelum disimpan ke database (Opsi A: base64).
// Resize gambar ke maksimal `maxSize` px (preserve aspect ratio),
// lalu encode sebagai JPEG quality 0.7. Hasilnya cukup kecil
// (biasanya 100-400KB) untuk disimpan sebagai base64 di PostgreSQL
// Text column, tapi tetap jelas terbaca saat dilihat/dicetak.
// ============================================================
async function compressNotaImage(file: File, maxSize = 900, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxSize || height > maxSize) {
          if (width >= height) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          } else {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas context tidak tersedia')); return }
        // Background putih agar nota transparan (PNG) tidak jadi item
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('Gagal memuat gambar'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
}

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  termin: 'Termin',
  panen: 'Panen',
  kalender: 'Kalender',
  settings: 'Pengaturan',
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, iconColor: 'text-emerald-600' },
  { id: 'termin', label: 'Termin', icon: Package, iconColor: 'text-emerald-600' },
  { id: 'panen', label: 'Panen', icon: ShoppingBasket, iconColor: 'text-amber-600' },
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
  const [activeSection, setActiveSection] = useState<'dashboard' | 'termin' | 'panen' | 'kalender' | 'settings'>('dashboard')
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

  // Termin search & filter state
  const [terminSearch, setTerminSearch] = useState('')
  const [terminFilter, setTerminFilter] = useState<'all' | 'active' | 'harvested'>('all')

  // PDF preview state: holds the batch being previewed + the blob URL of the
  // generated PDF so it can be rendered in an iframe inside a dialog.
  const [pdfPreview, setPdfPreview] = useState<{ batch: Batch; url: string } | null>(null)

  // Dialog states
  const [addBatchOpen, setAddBatchOpen] = useState(false)
  const [addWeightOpen, setAddWeightOpen] = useState(false)
  const [addMortalityOpen, setAddMortalityOpen] = useState(false)
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false)

  // Panen (multiple harvest records) — satu termin bisa dipanen beberapa kali.
  const [addHarvestRecordOpen, setAddHarvestRecordOpen] = useState(false)
  const [editingHarvestRecord, setEditingHarvestRecord] = useState<HarvestRecord | null>(null)
  // Batch yang jadi konteks form panen (default = selectedBatch, atau bisa di-override
  // lewat dropdown termin di dialog saat dibuka dari section global).
  const [harvestRecordBatchId, setHarvestRecordBatchId] = useState('')
  const [harvestRecordForm, setHarvestRecordForm] = useState({
    date: '', quantity: '', weightPerEkor: '', sellingPricePerKg: '', buyerName: '', notes: '',
  })

  // Tab aktif di batch detail (Berat/Mortalitas/Biaya/Panen). Default 'berat'.
  // Dipakai supaya tombol "Kelola Panen" bisa langsung switch ke tab Panen.
  const [activeBatchTab, setActiveBatchTab] = useState<'berat' | 'mortalitas' | 'biaya' | 'panen'>('berat')

  // When adding weight/mortality from a MAIN section (not from batch detail),
  // we need the user to pick which batch the record belongs to.
  const [dialogBatchId, setDialogBatchId] = useState('')

  // Equipment form — peralatan dibeli PER TERMIN (terikat ke batch).
  // Tidak ada lagi state `equipments` terpisah; semua peralatan datang
  // nested di setiap batch (batches[].equipment), sama seperti berat/mortalitas.
  const [equipmentForm, setEquipmentForm] = useState({
    name: '', category: 'Peralatan Pakan & Minum', quantity: '', unit: 'Unit', unitPrice: '', purchaseDate: '', notes: '', notaData: '', notaName: '', paymentMethod: 'cash',
  })
  // Multi-item mode: catat beberapa item dalam 1 nota sekaligus.
  // Field shared (purchaseDate, notaData, notaName) tetap di `equipmentForm`;
  // field per-item (name, category, quantity, unit, unitPrice, notes) di `equipmentItems`.
  // Hanya aktif saat menambah (bukan edit) — toggle disembunyikan saat editingEquipment.
  const [multiItemMode, setMultiItemMode] = useState(false)
  const [equipmentItems, setEquipmentItems] = useState<EquipmentFormItem[]>([])
  // Master daftar satuan (Sak, Karung, Liter, kg, dll) + state untuk tambah satuan baru
  const [units, setUnits] = useState<Unit[]>([])
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [newUnitName, setNewUnitName] = useState('')
  const [savingUnit, setSavingUnit] = useState(false)

  // Master daftar kategori biaya + state untuk tambah kategori baru (mirror Unit)
  const [categories, setCategories] = useState<Category[]>([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)

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

  // Edit mode states — null = add mode, object = edit mode
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [editingWeight, setEditingWeight] = useState<WeightRecord | null>(null)
  const [editingMortality, setEditingMortality] = useState<MortalityRecord | null>(null)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)

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

  // Validasi tanggal panen: tidak boleh sebelum tanggal ayam masuk.
  // Dipakai untuk menampilkan pesan error di Harvest Record Dialog.
  // Backend juga melakukan validasi yang sama (defensive).
  const harvestDateError = useMemo(() => {
    if (!selectedBatch || !harvestRecordForm.date) return null
    const hd = new Date(harvestRecordForm.date)
    const ad = new Date(selectedBatch.arrivalDate)
    if (isNaN(hd.getTime()) || isNaN(ad.getTime())) return null
    hd.setHours(0, 0, 0, 0)
    ad.setHours(0, 0, 0, 0)
    if (hd < ad) {
      const adStr = ad.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      return `Tanggal panen tidak boleh sebelum tanggal ayam masuk (${adStr})`
    }
    return null
  }, [selectedBatch, harvestRecordForm.date])

  // Semua peralatan dari seluruh termin, diturunkan dari state `batches`
  // (peralatan datang nested di setiap batch). Dipakai untuk ringkasan di
  // section Hitung. Tidak ada fetch terpisah lagi.
  const allEquipments = useMemo(
    () => batches.flatMap((b) => b.equipment ?? []),
    [batches]
  )

  const fetchData = useCallback(async () => {
    try {
      const [batchRes, dashRes, settingsRes, unitsRes, categoriesRes] = await Promise.all([
        fetch('/api/batches'),
        fetch('/api/dashboard'),
        fetch('/api/settings'),
        fetch('/api/units'),
        fetch('/api/categories'),
      ])

      // Parse each response, guarding against non-OK responses so the UI
      // never crashes when the database is unreachable / not yet set up.
      const batchData = batchRes.ok ? await batchRes.json() : []
      const dashData = dashRes.ok ? await dashRes.json() : null
      const settingsData = settingsRes.ok ? await settingsRes.json() : {}
      const unitsData = unitsRes.ok ? await unitsRes.json() : []
      const categoriesData = categoriesRes.ok ? await categoriesRes.json() : []

      setBatches(Array.isArray(batchData) ? batchData : [])
      setDashboard(dashData)
      setAppSettings({ appName: settingsData.appName || 'AyamKu Farm', logoData: settingsData.logoData || '' })
      setSettingsForm({ appName: settingsData.appName || 'AyamKu Farm', logoData: settingsData.logoData || '' })
      setLogoPreview(settingsData.logoData || '')
      setUnits(Array.isArray(unitsData) ? unitsData : [])
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
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
    const isEdit = !!editingBatch
    try {
      if (isEdit) {
        const editId = editingBatch!.id
        const res = await fetch(`/api/batches/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: batchForm.name,
            terminNumber: batchForm.terminNumber,
            arrivalDate: batchForm.arrivalDate,
            initialWeight: batchForm.initialWeight,
            quantity: batchForm.quantity,
            notes: batchForm.notes,
          }),
        })
        if (!res.ok) throw new Error()
        setAddBatchOpen(false)
        setEditingBatch(null)
        setBatchForm({ name: '', terminNumber: '1', arrivalDate: '', initialWeight: '', quantity: '', notes: '' })
        toast({ title: 'Berhasil! ✏️', description: 'Termin berhasil diperbarui' })
        await fetchData()
        // Refresh selectedBatch if user is viewing the edited batch in detail view
        if (view === 'batch-detail' && selectedBatch?.id === editId) {
          try {
            const freshRes = await fetch('/api/batches')
            if (freshRes.ok) {
              const freshBatches = await freshRes.json()
              const updated = (Array.isArray(freshBatches) ? freshBatches : []).find((b: Batch) => b.id === editId)
              if (updated) setSelectedBatch(updated)
            }
          } catch {}
        }
      } else {
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
      }
    } catch {
      toast({ title: 'Error', description: isEdit ? 'Gagal memperbarui termin' : 'Gagal menambahkan termin', variant: 'destructive' })
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
    const isEdit = !!editingWeight
    try {
      const payload = {
        date: weightForm.date,
        averageWeightGram: weightForm.averageWeightGram,
        ageDays: String(computedAgeDays),
        sampleCount: weightForm.sampleCount,
        notes: weightForm.notes,
      }
      if (isEdit) {
        const editId = editingWeight!.id
        const res = await fetch(`/api/weight/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        setAddWeightOpen(false)
        setEditingWeight(null)
        setDialogBatchId('')
        setWeightForm({ date: '', averageWeightGram: '', ageDays: '', sampleCount: '1', notes: '' })
        toast({ title: 'Berhasil! ✏️', description: 'Data berat berhasil diperbarui' })
        await fetchData()
        if (view === 'batch-detail' && selectedBatch?.id === batchId) {
          try {
            const freshRes = await fetch('/api/batches')
            if (freshRes.ok) {
              const freshBatches = await freshRes.json()
              const updated = (Array.isArray(freshBatches) ? freshBatches : []).find((b: Batch) => b.id === batchId)
              if (updated) setSelectedBatch(updated)
            }
          } catch {}
        }
      } else {
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
      }
    } catch {
      toast({ title: 'Error', description: isEdit ? 'Gagal memperbarui data berat' : 'Gagal menambahkan data berat', variant: 'destructive' })
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
    const isEdit = !!editingMortality
    try {
      if (isEdit) {
        const editId = editingMortality!.id
        const res = await fetch(`/api/mortality/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: mortalityForm.date,
            quantity: mortalityForm.quantity,
            reason: mortalityForm.reason,
            notes: mortalityForm.notes,
          }),
        })
        if (!res.ok) throw new Error()
        setAddMortalityOpen(false)
        setEditingMortality(null)
        setDialogBatchId('')
        setMortalityForm({ date: '', quantity: '', reason: 'sakit', notes: '' })
        toast({ title: 'Berhasil! ✏️', description: 'Data mortalitas berhasil diperbarui' })
        await fetchData()
        if (view === 'batch-detail' && selectedBatch?.id === batchId) {
          try {
            const freshRes = await fetch('/api/batches')
            if (freshRes.ok) {
              const freshBatches = await freshRes.json()
              const updated = (Array.isArray(freshBatches) ? freshBatches : []).find((b: Batch) => b.id === batchId)
              if (updated) setSelectedBatch(updated)
            }
          } catch {}
        }
      } else {
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
      }
    } catch {
      toast({ title: 'Error', description: isEdit ? 'Gagal memperbarui data mortalitas' : 'Gagal menambahkan data kematian', variant: 'destructive' })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  // ============================================================
  // Edit helpers (dari origin/main — fitur edit untuk semua entitas)
  // ============================================================
  const openEditBatch = (batch: Batch) => {
    setEditingBatch(batch)
    setBatchForm({
      name: batch.name,
      terminNumber: batch.terminNumber.toString(),
      arrivalDate: batch.arrivalDate ? new Date(batch.arrivalDate).toISOString().split('T')[0] : '',
      initialWeight: batch.initialWeight.toString(),
      quantity: batch.quantity.toString(),
      notes: batch.notes || '',
    })
    setAddBatchOpen(true)
  }

  const openEditWeight = (weight: WeightRecord, batch: Batch) => {
    setEditingWeight(weight)
    setSelectedBatch(batch)
    setWeightForm({
      date: weight.date ? new Date(weight.date).toISOString().split('T')[0] : '',
      averageWeightGram: weight.averageWeightGram.toString(),
      ageDays: weight.ageDays.toString(),
      sampleCount: weight.sampleCount.toString(),
      notes: weight.notes || '',
    })
    setAddWeightOpen(true)
  }

  const openEditMortality = (m: MortalityRecord, batch: Batch) => {
    setEditingMortality(m)
    setSelectedBatch(batch)
    setMortalityForm({
      date: m.date ? new Date(m.date).toISOString().split('T')[0] : '',
      quantity: m.quantity.toString(),
      reason: m.reason,
      notes: m.notes || '',
    })
    setAddMortalityOpen(true)
  }

  const openEditEquipment = (e: Equipment) => {
    setEditingEquipment(e)
    setEquipmentForm({
      name: e.name,
      category: e.category,
      quantity: e.quantity.toString(),
      unit: e.unit,
      unitPrice: e.unitPrice.toString(),
      purchaseDate: e.purchaseDate ? new Date(e.purchaseDate).toISOString().split('T')[0] : '',
      notes: e.notes || '',
      notaData: e.notaData || '',
      notaName: e.notaName || '',
      // paymentMethod: "cash" atau "bon". Fallback "cash" bila data lama null/undefined.
      paymentMethod: e.paymentMethod === 'bon' ? 'bon' : 'cash',
    })
    setShowAddUnit(false)
    setNewUnitName('')
    // Edit selalu pakai single-item form — pastikan mode multi-item mati.
    setMultiItemMode(false)
    setEquipmentItems([])
    setAddEquipmentOpen(true)
  }

  // ============================================================
  // Panen (multiple harvest records) helpers
  // ============================================================

  // Buka dialog tambah panen. Jika dari batch detail, batchId = selectedBatch.id.
  // Jika dari section global (tanpa selectedBatch), batchId = batch pertama.
  const openAddHarvestRecordDialog = (batch: Batch) => {
    setSelectedBatch(batch)
    setHarvestRecordBatchId(batch.id)
    setEditingHarvestRecord(null)
    // Default tanggal = hari ini.
    const today = new Date().toISOString().split('T')[0]
    setHarvestRecordForm({
      date: today, quantity: '', weightPerEkor: '', sellingPricePerKg: '', buyerName: '', notes: '',
    })
    setAddHarvestRecordOpen(true)
  }

  // Buka dialog edit panen — pre-fill form dari record yang ada.
  const openEditHarvestRecordDialog = (batch: Batch, record: HarvestRecord) => {
    setSelectedBatch(batch)
    setHarvestRecordBatchId(batch.id)
    setEditingHarvestRecord(record)
    setHarvestRecordForm({
      date: new Date(record.date).toISOString().split('T')[0],
      quantity: String(record.quantity),
      weightPerEkor: String(record.weightPerEkor),
      sellingPricePerKg: String(record.sellingPricePerKg),
      buyerName: record.buyerName || '',
      notes: record.notes || '',
    })
    setAddHarvestRecordOpen(true)
  }

  const handleSaveHarvestRecord = async () => {
    const batchId = harvestRecordBatchId || selectedBatch?.id
    if (!batchId) return
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    const isEdit = !!editingHarvestRecord
    try {
      const payload = {
        date: harvestRecordForm.date,
        quantity: harvestRecordForm.quantity,
        weightPerEkor: harvestRecordForm.weightPerEkor,
        sellingPricePerKg: harvestRecordForm.sellingPricePerKg,
        buyerName: harvestRecordForm.buyerName,
        notes: harvestRecordForm.notes,
      }
      const res = isEdit
        ? await fetch(`/api/harvest-records/${editingHarvestRecord!.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/harvest-records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, batchId }),
          })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Gagal menyimpan panen')
      }
      // Update selectedBatch agar UI detail langsung sinkron.
      await fetchData()
      setAddHarvestRecordOpen(false)
      setEditingHarvestRecord(null)
      setHarvestRecordBatchId('')
      setHarvestRecordForm({
        date: '', quantity: '', weightPerEkor: '', sellingPricePerKg: '', buyerName: '', notes: '',
      })
      toast({
        title: 'Berhasil! 🎉',
        description: isEdit ? 'Panen berhasil diperbarui' : 'Panen berhasil dicatat',
      })
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Gagal menyimpan panen',
        variant: 'destructive',
      })

    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleDeleteHarvestRecord = async (record: HarvestRecord) => {
    if (!confirm(`Yakin ingin menghapus catatan panen ${record.quantity} ekor tanggal ${formatDate(record.date)}?`)) return
    try {
      const res = await fetch(`/api/harvest-records/${record.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Dihapus', description: 'Catatan panen dihapus' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus catatan panen', variant: 'destructive' })
    }
  }

  // Navigasi ke batch detail + switch tab ke Panen (dipakai tombol "Kelola Panen" / "Panen").
  const goToBatchPanenTab = (batch: Batch) => {
    setSelectedBatch(batch)
    setActiveBatchTab('panen')
    setView('batch-detail')
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
    setActiveBatchTab('berat')
    setView('batch-detail')
  }

  // ============================================================
  // Multi-item mode helpers
  // ============================================================

  // Factory item kosong siap diisi. id dipakai sebagai React key.
  const createEmptyEquipmentItem = (): EquipmentFormItem => ({
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    category: DEFAULT_EQUIPMENT_CATEGORY,
    quantity: '',
    unit: 'Unit',
    unitPrice: '',
    notes: '',
    newUnitName: '',
    newCategoryName: '',
    // Default Cash — user bisa toggle ke BON per item di form.
    paymentMethod: 'cash',
  })

  // Toggle mode multi-item. Saat ON: pindahkan data form single ke item pertama
  // (agar tidak hilang). Saat OFF: ambil item pertama kembali ke form single;
  // jika ada >1 item, minta konfirmasi dulu (item lain akan dibuang).
  const handleToggleMultiItem = (checked: boolean) => {
    if (checked) {
      const firstItem: EquipmentFormItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: equipmentForm.name,
        category: equipmentForm.category || DEFAULT_EQUIPMENT_CATEGORY,
        quantity: equipmentForm.quantity,
        unit: equipmentForm.unit || 'Unit',
        unitPrice: equipmentForm.unitPrice,
        notes: equipmentForm.notes,
        newUnitName: '',
        newCategoryName: '',
        // Pertahankan metode pembayaran dari form single saat beralih.
        paymentMethod: equipmentForm.paymentMethod === 'bon' ? 'bon' : 'cash',
      }
      setEquipmentItems([firstItem])
      setMultiItemMode(true)
    } else {
      if (equipmentItems.length > 1) {
        if (!confirm(
          `Anda memiliki ${equipmentItems.length} item. Beralih ke mode single ` +
          `akan menghapus ${equipmentItems.length - 1} item lain. Lanjutkan?`
        )) {
          return
        }
      }
      const first = equipmentItems[0]
      if (first) {
        setEquipmentForm((prev) => ({
          ...prev,
          name: first.name,
          category: first.category && first.category !== '__add_new__' ? first.category : DEFAULT_EQUIPMENT_CATEGORY,
          quantity: first.quantity,
          unit: first.unit && first.unit !== '__add_new__' ? first.unit : 'Unit',
          unitPrice: first.unitPrice,
          notes: first.notes,
          // Bawa juga paymentMethod item pertama ke form single.
          paymentMethod: first.paymentMethod === 'bon' ? 'bon' : 'cash',
        }))
      }
      setMultiItemMode(false)
      setEquipmentItems([])
    }
  }

  // Update satu field pada item tertentu (immutably).
  const updateEquipmentItem = (itemId: string, patch: Partial<EquipmentFormItem>) => {
    setEquipmentItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, ...patch } : it)))
  }

  // Tambah baris item kosong baru. Diblokir jika ada item yang sedang dalam
  // mode "tambah kategori/satuan baru" (kategori/unit === '__add_new__') agar
  // user menyelesaikan input kategori/satuan dulu sebelum menambah item lain.
  const addEquipmentItem = () => {
    const hasPendingNew = equipmentItems.some(
      (it) => it.category === '__add_new__' || it.unit === '__add_new__'
    )
    if (hasPendingNew) {
      toast({
        title: 'Selesaikan dulu',
        description: 'Selesaikan input kategori/satuan baru pada item sebelum menambah item lain',
        variant: 'destructive',
      })
      return
    }
    setEquipmentItems((prev) => [...prev, createEmptyEquipmentItem()])
  }

  // Hapus item berdasarkan id. Tidak boleh menghapus item terakhir.
  const removeEquipmentItem = (itemId: string) => {
    setEquipmentItems((prev) => (prev.length <= 1 ? prev : prev.filter((it) => it.id !== itemId)))
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
    const isEdit = !!editingEquipment
    try {
      if (isEdit) {
        const editId = editingEquipment!.id
        const res = await fetch(`/api/equipment/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...equipmentForm }),
        })
        if (!res.ok) throw new Error()
        setAddEquipmentOpen(false)
        setEditingEquipment(null)
        setDialogBatchId('')
        setShowAddUnit(false)
        setNewUnitName('')
        setEquipmentForm({ name: '', category: 'Peralatan Pakan & Minum', quantity: '', unit: 'Unit', unitPrice: '', purchaseDate: '', notes: '', notaData: '', notaName: '', paymentMethod: 'cash' })
        toast({ title: 'Berhasil! ✏️', description: 'Biaya berhasil diperbarui' })
        await fetchData()
        if (view === 'batch-detail' && selectedBatch?.id === batchId) {
          try {
            const freshRes = await fetch('/api/batches')
            if (freshRes.ok) {
              const freshBatches = await freshRes.json()
              const updated = (Array.isArray(freshBatches) ? freshBatches : []).find((b: Batch) => b.id === batchId)
              if (updated) setSelectedBatch(updated)
            }
          } catch {}
        }
      } else if (multiItemMode) {
        // ============================================================
        // Mode multi-item: POST setiap item valid secara sequential dengan
        // shared purchaseDate, notaData, notaName, batchId. Item yang tidak
        // valid (name/qty/price kosong) di-skip. Jika ada error di tengah,
        // lanjutkan item berikutnya lalu laporkan count di akhir.
        // ============================================================
        const validItems = equipmentItems.filter(
          (it) =>
            it.name.trim() &&
            parseFloat(it.quantity) > 0 &&
            parseFloat(it.unitPrice) > 0 &&
            it.category !== '__add_new__' &&
            it.unit !== '__add_new__'
        )
        if (validItems.length === 0) {
          toast({
            title: 'Tidak ada item valid',
            description: 'Isi minimal 1 item dengan nama, jumlah, dan harga yang valid',
            variant: 'destructive',
          })
          return
        }
        if (!equipmentForm.purchaseDate) {
          toast({ title: 'Tanggal Beli wajib', description: 'Pilih tanggal beli untuk nota ini', variant: 'destructive' })
          return
        }
        let successCount = 0
        let failCount = 0
        for (const item of validItems) {
          try {
            const res = await fetch('/api/equipment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: item.unitPrice,
                purchaseDate: equipmentForm.purchaseDate,
                notes: item.notes,
                notaData: equipmentForm.notaData,
                notaName: equipmentForm.notaName,
                // paymentMethod per-item (Cash/BON). Fallback "cash" bila invalid.
                paymentMethod: item.paymentMethod === 'bon' ? 'bon' : 'cash',
                batchId,
              }),
            })
            if (!res.ok) throw new Error()
            successCount++
          } catch {
            failCount++
          }
        }
        const totalAttempted = successCount + failCount
        // Reset state & tutup dialog.
        setAddEquipmentOpen(false)
        setDialogBatchId('')
        setMultiItemMode(false)
        setEquipmentItems([])
        setEquipmentForm({ name: '', category: 'Peralatan Pakan & Minum', quantity: '', unit: 'Unit', unitPrice: '', purchaseDate: '', notes: '', notaData: '', notaName: '', paymentMethod: 'cash' })
        if (failCount === 0) {
          toast({ title: 'Berhasil! 💰', description: `${successCount} item berhasil ditambahkan ke termin` })
        } else {
          toast({
            title: failCount === totalAttempted ? 'Gagal' : 'Sebagian berhasil',
            description: `${successCount} dari ${totalAttempted} item berhasil ditambahkan`,
            variant: failCount === totalAttempted ? 'destructive' : 'default',
          })
        }
        await fetchData()
        if (view === 'batch-detail' && selectedBatch?.id === batchId) {
          try {
            const freshRes = await fetch('/api/batches')
            if (freshRes.ok) {
              const freshBatches = await freshRes.json()
              const updated = (Array.isArray(freshBatches) ? freshBatches : []).find((b: Batch) => b.id === batchId)
              if (updated) setSelectedBatch(updated)
            }
          } catch {}
        }
      } else {
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
        setEquipmentForm({ name: '', category: 'Peralatan Pakan & Minum', quantity: '', unit: 'Unit', unitPrice: '', purchaseDate: '', notes: '', notaData: '', notaName: '', paymentMethod: 'cash' })
        toast({ title: 'Berhasil! 💰', description: 'Biaya berhasil ditambahkan ke termin' })
        fetchData()
      }
    } catch {
      toast({ title: 'Error', description: isEdit ? 'Gagal memperbarui biaya' : 'Gagal menambahkan biaya', variant: 'destructive' })
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

  // ============================================================
  // Batalkan Panen — kembalikan status batch dari 'harvested' menjadi
  // 'active' dan hapus semua data panen (tanggal, jumlah, berat, harga
  // jual). Dipakai untuk memperbaiki panen yang salah termin atau salah
  // catat. Data mortalitas, berat, pakan, dan biaya tetap tersimpan.
  // ============================================================
  const handleCancelHarvest = async (batch: Batch) => {
    if (!confirm(
      'Yakin batalkan panen untuk termin ini?\n\n' +
      'Status akan kembali menjadi AKTIF dan semua data panen ' +
      '(tanggal, jumlah, berat, harga jual) akan dihapus. ' +
      'Data mortalitas, berat, pakan, dan biaya tetap tersimpan.'
    )) return
    try {
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'active',
          harvestDate: null,
          harvestWeight: null,
          harvestQuantity: null,
          sellingPricePerKg: null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Gagal membatalkan panen')
      }
      toast({
        title: 'Panen Dibatalkan',
        description: `Termin ${batch.name} kembali aktif`,
      })
      await fetchData()
      if (view === 'batch-detail' && selectedBatch?.id === batch.id) {
        try {
          const freshRes = await fetch('/api/batches')
          if (freshRes.ok) {
            const freshBatches = await freshRes.json()
            const updated = (Array.isArray(freshBatches) ? freshBatches : []).find((b: Batch) => b.id === batch.id)
            if (updated) setSelectedBatch(updated)
          }
        } catch {}
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membatalkan panen'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    }
  }

  // ============================================================
  // Upload foto nota pembelian — untuk peralatan.
  // Foto dikompresi (resize max 900px, JPEG q=0.7) sebelum disimpan
  // sebagai base64 data URL di state form, lalu dikirim ke API dan
  // disimpan langsung di database (Opsi A: base64 di PostgreSQL).
  // ============================================================
  const [notaViewer, setNotaViewer] = useState<{ src: string; title: string; fileName?: string } | null>(null)
  const [notaUploading, setNotaUploading] = useState(false)

  const handleEquipmentNotaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'File harus berupa gambar', variant: 'destructive' })
      e.target.value = ''
      return
    }
    setNotaUploading(true)
    try {
      const compressed = await compressNotaImage(file)
      setEquipmentForm((prev) => ({ ...prev, notaData: compressed, notaName: file.name }))
      toast({ title: 'Foto nota ditambahkan 📷', description: 'Foto akan tersimpan bersama catatan biaya ini' })
    } catch {
      toast({ title: 'Error', description: 'Gagal memproses foto nota', variant: 'destructive' })
    } finally {
      setNotaUploading(false)
      e.target.value = ''
    }
  }

  // Download foto nota dari viewer (trigger anchor download).
  const handleDownloadNota = () => {
    if (!notaViewer) return
    const a = document.createElement('a')
    a.href = notaViewer.src
    const baseName = (notaViewer.fileName || 'nota').replace(/\.[^.]+$/, '')
    a.download = `${baseName}.jpg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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

  // Tambah kategori biaya baru (Kandang, Peralatan Pakan & Minum, dll) ke master
  // daftar. Kategori baru otomatis terpilih di form peralatan setelah disimpan.
  // Pola identik dengan handleAddUnit — master daftar di backend, dipakai dropdown.
  const handleAddCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) {
      toast({ title: 'Oops', description: 'Nama kategori tidak boleh kosong', variant: 'destructive' })
      return
    }
    if (savingCategory) return
    setSavingCategory(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      const created: Category = await res.json()
      // Tambahkan ke daftar kategori (hindari duplikat di state), urut abjad.
      setCategories((prev) =>
        prev.some((c) => c.name.toLowerCase() === created.name.toLowerCase())
          ? prev
          : [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      )
      setEquipmentForm((prev) => ({ ...prev, category: created.name }))
      setNewCategoryName('')
      setShowAddCategory(false)
      toast({ title: 'Kategori ditambahkan ✅', description: `Kategori "${created.name}" siap dipakai` })
    } catch {
      toast({ title: 'Error', description: 'Gagal menambah kategori', variant: 'destructive' })
    } finally {
      setSavingCategory(false)
    }
  }

  // ============================================================
  // Tambah satuan / kategori baru dari dalam mode multi-item.
  // Sama seperti handleAddUnit/handleAddCategory, tapi target update adalah
  // item spesifik di `equipmentItems` (bukan `equipmentForm`).
  // ============================================================
  const handleAddUnitForItem = async (itemId: string) => {
    const item = equipmentItems.find((it) => it.id === itemId)
    if (!item) return
    const name = item.newUnitName.trim()
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
      setUnits((prev) =>
        prev.some((u) => u.name.toLowerCase() === created.name.toLowerCase())
          ? prev
          : [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      )
      setEquipmentItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, unit: created.name, newUnitName: '' } : it))
      )
      toast({ title: 'Satuan ditambahkan ✅', description: `Satuan "${created.name}" siap dipakai` })
    } catch {
      toast({ title: 'Error', description: 'Gagal menambah satuan', variant: 'destructive' })
    } finally {
      setSavingUnit(false)
    }
  }

  const handleAddCategoryForItem = async (itemId: string) => {
    const item = equipmentItems.find((it) => it.id === itemId)
    if (!item) return
    const name = item.newCategoryName.trim()
    if (!name) {
      toast({ title: 'Oops', description: 'Nama kategori tidak boleh kosong', variant: 'destructive' })
      return
    }
    if (savingCategory) return
    setSavingCategory(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      const created: Category = await res.json()
      setCategories((prev) =>
        prev.some((c) => c.name.toLowerCase() === created.name.toLowerCase())
          ? prev
          : [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      )
      setEquipmentItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, category: created.name, newCategoryName: '' } : it))
      )
      toast({ title: 'Kategori ditambahkan ✅', description: `Kategori "${created.name}" siap dipakai` })
    } catch {
      toast({ title: 'Error', description: 'Gagal menambah kategori', variant: 'destructive' })
    } finally {
      setSavingCategory(false)
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

  // Computed values for selected batch (delegates to module-level pure helper)
  const getBatchStats = (batch: Batch) => computeBatchStats(batch)

  // Estimate harvest readiness for an active batch.
  // Uses the last two weight records to compute average daily gain (ADG),
  // then projects how many days until the batch reaches the target weight.
  // Returns null if insufficient data.
  const estimateHarvest = (batch: Batch, targetGram = 2000): { daysToTarget: number; estDate: Date; adg: number } | null => {
    if (batch.status !== 'active' || batch.weightRecords.length < 2) return null
    const sorted = [...batch.weightRecords].sort((a, b) => a.ageDays - b.ageDays)
    const latest = sorted[sorted.length - 1]
    const first = sorted[0]
    const daySpan = latest.ageDays - first.ageDays
    if (daySpan <= 0) return null
    const weightGain = latest.averageWeightGram - first.averageWeightGram
    if (weightGain <= 0) return null
    const adg = weightGain / daySpan // gram per day
    if (latest.averageWeightGram >= targetGram) return { daysToTarget: 0, estDate: new Date(), adg }
    const daysToTarget = Math.ceil((targetGram - latest.averageWeightGram) / adg)
    const estDate = new Date()
    estDate.setDate(estDate.getDate() + daysToTarget)
    return { daysToTarget, estDate, adg }
  }

  // Export a full per-batch report as a CSV file (client-side).
  // Includes: batch info, weight records, mortality records, feed records,
  // equipment costs, and summary statistics. Triggers a browser download.
  const exportBatchCSV = (batch: Batch) => {
    const stats = computeBatchStats(batch)
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows: string[][] = []
    // Section 1: Batch info
    rows.push([`LAPORAN TERMIN - ${(appSettings.appName || 'AYAMKU FARM').toUpperCase()}`])
    rows.push([])
    rows.push(['Informasi Termin'])
    rows.push(['Nama Termin', batch.name])
    rows.push(['Nomor Termin', batch.terminNumber])
    rows.push(['Tanggal Tiba', formatDate(batch.arrivalDate)])
    rows.push(['Status', batch.status === 'active' ? 'Aktif' : 'Panen'])
    rows.push(['Jumlah Awal (ekor)', batch.quantity])
    rows.push(['Berat Awal (kg)', batch.initialWeight])
    rows.push(['Catatan', batch.notes || '-'])
    if (batch.status === 'harvested') {
      rows.push([])
      rows.push(['Data Panen'])
      rows.push(['Tanggal Panen', batch.harvestDate ? formatDate(batch.harvestDate) : '-'])
      rows.push(['Jumlah Panen (ekor)', batch.harvestQuantity ?? '-'])
      rows.push(['Berat Panen (kg/ekor)', batch.harvestWeight ?? '-'])
      rows.push(['Harga Jual (Rp/kg)', batch.sellingPricePerKg ?? '-'])
    }
    // Section 2: Summary stats
    rows.push([])
    rows.push(['Ringkasan Statistik'])
    rows.push(['Umur (hari)', stats.ageDays])
    rows.push(['Ayam Hidup (ekor)', stats.aliveCount])
    rows.push(['Total Mati (ekor)', stats.totalDead])
    rows.push(['Tingkat Mortalitas (%)', stats.mortalityRate.toFixed(2)])
    rows.push(['Berat Terkini (gram)', stats.latestWeight])
    rows.push(['Berat Terkini (kg)', (stats.latestWeight / 1000).toFixed(3)])
    rows.push(['Pertambahan Berat (gram)', Math.round(stats.weightGain)])
    rows.push(['Total Biaya (Rp)', Math.round(stats.totalCost)])
    if (batch.status === 'harvested') {
      rows.push(['Total Panen (kg)', stats.totalHarvestKg.toFixed(2)])
      rows.push(['Pendapatan (Rp)', Math.round(stats.totalHarvestValue)])
      rows.push(['Laba/Rugi (Rp)', Math.round(stats.profit)])
    }
    // Section 3: Weight records
    rows.push([])
    rows.push(['Riwayat Penimbangan'])
    rows.push(['Tanggal', 'Umur (hari)', 'Berat Rata-rata (gram)', 'Berat (kg)', 'Jumlah Sampel', 'Catatan'])
    ;[...batch.weightRecords].sort((a, b) => a.ageDays - b.ageDays).forEach((w) => {
      rows.push([formatDate(w.date), w.ageDays, w.averageWeightGram, (w.averageWeightGram / 1000).toFixed(3), w.sampleCount, w.notes || '-'])
    })
    // Section 4: Mortality records
    rows.push([])
    rows.push(['Riwayat Mortalitas'])
    rows.push(['Tanggal', 'Jumlah (ekor)', 'Alasan', 'Catatan'])
    ;[...batch.mortalityRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach((m) => {
      rows.push([formatDate(m.date), m.quantity, m.reason, m.notes || '-'])
    })
    // Section 5: Equipment costs
    rows.push([])
    rows.push(['Riwayat Biaya / Peralatan'])
    rows.push(['Tanggal Beli', 'Nama', 'Kategori', 'Jumlah', 'Satuan', 'Harga Satuan (Rp)', 'Total (Rp)', 'Metode', 'Ada Nota', 'Catatan'])
    ;[...batch.equipment].sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()).forEach((e) => {
      rows.push([formatDate(e.purchaseDate), e.name, e.category, e.quantity, e.unit, e.unitPrice, Math.round(e.quantity * e.unitPrice), e.paymentMethod === 'bon' ? 'BON' : 'Cash', e.notaData ? 'Ya' : 'Tidak', e.notes || '-'])
    })
    // Sub-ringkasan Cash vs BON untuk equipment termin ini.
    const cashEquipTotal = batch.equipment.filter((e) => e.paymentMethod !== 'bon').reduce((s, e) => s + e.quantity * e.unitPrice, 0)
    const bonEquipTotal = batch.equipment.filter((e) => e.paymentMethod === 'bon').reduce((s, e) => s + e.quantity * e.unitPrice, 0)
    if (batch.equipment.length > 0) {
      rows.push([])
      rows.push(['Ringkasan Pembayaran'])
      rows.push(['Total Cash (Rp)', Math.round(cashEquipTotal)])
      rows.push(['Total BON (Rp)', Math.round(bonEquipTotal)])
      rows.push(['Jumlah Transaksi BON', batch.equipment.filter((e) => e.paymentMethod === 'bon').length])
    }

    const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
    // Prepend BOM so Excel reads UTF-8 correctly
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${buildExportFileName(appSettings.appName, batch.name, batch.terminNumber)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({ title: 'Laporan terunduh 📄', description: `CSV untuk ${batch.name} berhasil diunduh` })
  }

  // Build a full per-batch report as a jsPDF document (client-side).
  // Returns the jsPDF instance so callers can either preview it (via blob
  // URL in an iframe) or save it directly. Shared by preview & download flows.
  const generateBatchPDF = (batch: Batch) => {
    const stats = computeBatchStats(batch)
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 40
    const contentWidth = pageWidth - margin * 2

    // --- Header banner ---
    doc.setFillColor(16, 185, 129) // emerald-500
    doc.rect(0, 0, pageWidth, 70, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text(appSettings.appName || 'AyamKu Farm', margin, 32)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text('Laporan Termin Peternakan Ayam', margin, 52)
    doc.setFontSize(9)
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pageWidth - margin, 52, { align: 'right' })

    let y = 90

    // Helper: section title bar
    const sectionTitle = (title: string) => {
      // Check space, add page if needed
      if (y > pageHeight - 80) { doc.addPage(); y = margin + 10 }
      doc.setFillColor(236, 253, 245) // emerald-50
      doc.rect(margin, y - 12, contentWidth, 22, 'F')
      doc.setTextColor(6, 95, 70) // emerald-700
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(title, margin + 8, y + 3)
      y += 22
    }

    // --- Section 1: Informasi Termin ---
    sectionTitle('Informasi Termin')
    doc.setTextColor(31, 41, 55)
    doc.setFontSize(9)
    const infoRows: Array<[string, string]> = [
      ['Nama Termin', batch.name],
      ['Nomor Termin', `Termin #${batch.terminNumber}`],
      ['Tanggal Tiba', formatDate(batch.arrivalDate)],
      ['Status', batch.status === 'active' ? 'Aktif' : 'Panen'],
      ['Jumlah Awal', `${batch.quantity.toLocaleString('id-ID')} ekor`],
      ['Berat Awal', `${batch.initialWeight} kg/ekor`],
      ['Catatan', batch.notes || '-'],
    ]
    if (batch.status === 'harvested') {
      infoRows.push(['Tanggal Panen', batch.harvestDate ? formatDate(batch.harvestDate) : '-'])
      infoRows.push(['Jumlah Panen', `${(batch.harvestQuantity ?? 0).toLocaleString('id-ID')} ekor`])
      infoRows.push(['Berat Panen', `${(batch.harvestWeight ?? 0).toFixed(2)} kg/ekor`])
      infoRows.push(['Harga Jual', formatCurrency(batch.sellingPricePerKg ?? 0) + '/kg'])
    }
    autoTable(doc, {
      startY: y,
      head: [['Atribut', 'Nilai']],
      body: infoRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: [31, 41, 55] },
      columnStyles: { 0: { cellWidth: 160, fontStyle: 'bold' }, 1: { cellWidth: contentWidth - 160 } },
      margin: { left: margin, right: margin },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16

    // --- Section 2: Ringkasan Statistik ---
    sectionTitle('Ringkasan Statistik')
    const statRows: Array<[string, string]> = [
      ['Umur', `${stats.ageDays} hari`],
      ['Ayam Hidup', `${stats.aliveCount.toLocaleString('id-ID')} ekor`],
      ['Total Mati', `${stats.totalDead} ekor (${stats.mortalityRate.toFixed(2)}%)`],
      ['Berat Terkini', `${(stats.latestWeight / 1000).toFixed(3)} kg (${stats.latestWeight} g)`],
      ['Pertambahan Berat', `${Math.round(stats.weightGain)} g`],
      ['Total Biaya', formatCurrency(stats.totalCost)],
    ]
    if (batch.status === 'harvested') {
      statRows.push(['Total Panen', `${stats.totalHarvestKg.toFixed(2)} kg`])
      statRows.push(['Pendapatan', formatCurrency(stats.totalHarvestValue)])
      statRows.push(['Laba/Rugi', formatCurrency(stats.profit)])
    }
    autoTable(doc, {
      startY: y,
      head: [['Metrik', 'Nilai']],
      body: statRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: [31, 41, 55] },
      columnStyles: { 0: { cellWidth: 160, fontStyle: 'bold' }, 1: { cellWidth: contentWidth - 160 } },
      margin: { left: margin, right: margin },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16

    // --- Section 3: Riwayat Penimbangan ---
    if (batch.weightRecords.length > 0) {
      sectionTitle('Riwayat Penimbangan')
      autoTable(doc, {
        startY: y,
        head: [['Tanggal', 'Umur (hari)', 'Berat (g)', 'Berat (kg)', 'Sampel', 'Catatan']],
        body: [...batch.weightRecords].sort((a, b) => a.ageDays - b.ageDays).map((w) => [
          formatDate(w.date), String(w.ageDays), String(w.averageWeightGram),
          (w.averageWeightGram / 1000).toFixed(3), String(w.sampleCount), w.notes || '-',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 8, fontStyle: 'bold' }, // teal-600
        bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
        margin: { left: margin, right: margin },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16
    }

    // --- Section 4: Riwayat Mortalitas ---
    if (batch.mortalityRecords.length > 0) {
      sectionTitle('Riwayat Mortalitas')
      autoTable(doc, {
        startY: y,
        head: [['Tanggal', 'Jumlah (ekor)', 'Alasan', 'Catatan']],
        body: [...batch.mortalityRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((m) => [
          formatDate(m.date), String(m.quantity), m.reason, m.notes || '-',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 8, fontStyle: 'bold' }, // red-500
        bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
        margin: { left: margin, right: margin },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16
    }

    // --- Section 5: Riwayat Biaya / Peralatan ---
    if (batch.equipment.length > 0) {
      sectionTitle('Riwayat Biaya / Peralatan')
      autoTable(doc, {
        startY: y,
        head: [['Tanggal', 'Nama', 'Kategori', 'Jml', 'Satuan', 'Harga Satuan', 'Total', 'Metode']],
        body: [...batch.equipment].sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()).map((e) => [
          formatDate(e.purchaseDate), e.name, e.category, String(e.quantity), e.unit,
          formatCurrency(e.unitPrice), formatCurrency(Math.round(e.quantity * e.unitPrice)),
          e.paymentMethod === 'bon' ? 'BON' : 'Cash',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 8, fontStyle: 'bold' }, // indigo-500
        bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
        // Highlight baris BON dengan warna amber lembut, baris Cash tetap default.
        // (didImplement via willDrawCell — di sini pakai columnStyles untuk Metode).
        columnStyles: { 7: { fontStyle: 'bold', halign: 'center' } },
        margin: { left: margin, right: margin },
        didParseCell: (data) => {
          // Beri warna kolom Metode sesuai status (emerald untuk Cash, amber untuk BON).
          if (data.section === 'body' && data.column.index === 7) {
            const isBon = data.cell.text[0] === 'BON'
            data.cell.styles.textColor = isBon ? [180, 83, 9] : [4, 120, 87] // amber-700 / emerald-700
          }
        },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12

      // Sub-ringkasan Cash vs BON di bawah tabel equipment.
      const cashEquipTotal = batch.equipment.filter((e) => e.paymentMethod !== 'bon').reduce((s, e) => s + e.quantity * e.unitPrice, 0)
      const bonEquipTotal = batch.equipment.filter((e) => e.paymentMethod === 'bon').reduce((s, e) => s + e.quantity * e.unitPrice, 0)
      const bonCount = batch.equipment.filter((e) => e.paymentMethod === 'bon').length
      autoTable(doc, {
        startY: y,
        head: [['Ringkasan Pembayaran', 'Nilai']],
        body: [
          ['Total Cash (tunai, lunas)', formatCurrency(cashEquipTotal)],
          [`Total BON (utang, ${bonCount} transaksi)`, formatCurrency(bonEquipTotal)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
        columnStyles: { 0: { cellWidth: contentWidth * 0.65, fontStyle: 'bold' }, 1: { cellWidth: contentWidth * 0.35, halign: 'right' } },
        margin: { left: margin, right: margin },
      })
    }

    // --- Section 6: Lampiran Foto Nota ---
    // Tampilkan thumbnail foto nota untuk peralatan yang punya nota.
    // Layout: 2 gambar per baris, masing-masing ~250pt lebar dengan label.
    const equipNotas = batch.equipment.filter((e) => e.notaData)
    const allNotas: Array<{ data: string; label: string }> = [
      ...equipNotas.map((e) => ({ data: e.notaData!, label: `${e.name} — ${formatDate(e.purchaseDate)}` })),
    ]
    if (allNotas.length > 0) {
      sectionTitle('Lampiran: Foto Nota')
      const thumbW = (contentWidth - 12) / 2 // 2 gambar per baris, gap 12pt
      const thumbH = 150
      let col = 0
      for (const nota of allNotas) {
        if (col === 0 && y > pageHeight - thumbH - 40) { doc.addPage(); y = margin + 10 }
        const x = margin + col * (thumbW + 12)
        // Label
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(100, 100, 100)
        doc.text(nota.label, x, y)
        // Border + image
        doc.setDrawColor(220, 220, 220)
        doc.rect(x, y + 4, thumbW, thumbH)
        try {
          doc.addImage(nota.data, 'JPEG', x + 2, y + 6, thumbW - 4, thumbH - 8, undefined, 'FAST')
        } catch {
          doc.setFontSize(8)
          doc.setTextColor(200, 80, 80)
          doc.text('(gagal memuat foto)', x + thumbW / 2, y + thumbH / 2, { align: 'center' })
        }
        col++
        if (col >= 2) { col = 0; y += thumbH + 24 }
      }
      if (col !== 0) y += thumbH + 24 // tutup baris terakhir yang belum penuh
    }

    // --- Footer: page numbers on every page ---
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `${appSettings.appName || 'AyamKu Farm'} • Laporan ${batch.name} (Termin #${batch.terminNumber})`,
        margin, pageHeight - 16
      )
      doc.text(`Halaman ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 16, { align: 'right' })
    }

    return doc
  }

  // Open a preview dialog showing the generated PDF (rendered in an iframe
  // via a blob URL). The user can review the report before deciding to
  // download or close. The blob URL is revoked when the dialog closes.
  const previewBatchPDF = (batch: Batch) => {
    try {
      const doc = generateBatchPDF(batch)
      const blob = doc.output('blob')
      const url = URL.createObjectURL(blob)
      setPdfPreview({ batch, url })
    } catch {
      toast({ title: 'Gagal', description: 'Gagal membuat preview PDF', variant: 'destructive' })
    }
  }

  // Save the PDF directly to the user's device (no preview).
  const downloadBatchPDF = (batch: Batch) => {
    const doc = generateBatchPDF(batch)
    doc.save(`${buildExportFileName(appSettings.appName, batch.name, batch.terminNumber)}.pdf`)
    toast({ title: 'PDF terunduh 📄', description: `Laporan PDF untuk ${batch.name} berhasil diunduh` })
  }

  // Clean up the blob URL when the preview dialog closes.
  const closePdfPreview = () => {
    if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url)
    setPdfPreview(null)
  }

  // Sisa ayam yang masih bisa dipanen untuk sebuah batch (kapasitas - sudah dipanen).
  // Dipakai untuk hint di form tambah/edit panen.
  const getRemainingHarvestable = (batch: Batch) => {
    const totalDead = batch.mortalityRecords.reduce((s, m) => s + m.quantity, 0)
    const totalHarvested = batch.harvestRecords.reduce((s, h) => s + h.quantity, 0)
    return Math.max(0, batch.quantity - totalDead - totalHarvested)
  }

  // Calendar events derived from batches
  const calendarEvents = useMemo(() => {
    const events: Record<string, CalendarEvent[]> = {}
    batches.forEach((batch) => {
      const arriveKey = new Date(batch.arrivalDate).toDateString()
      if (!events[arriveKey]) events[arriveKey] = []
      events[arriveKey].push({ type: 'tiba', batch })
      // Setiap harvest record → satu event panen (partial harvest).
      // Virtual migration di API menjamin batch.harvestRecords terisi
      // untuk data lama (legacy) juga.
      batch.harvestRecords.forEach((hr) => {
        const key = new Date(hr.date).toDateString()
        if (!events[key]) events[key] = []
        events[key].push({ type: 'panen', batch, harvestRecord: hr })
      })
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

  // === Dashboard derivations (all pure, derived from `batches`) ===

  // Growth chart data: merge all active batches' weight records by age (days),
  // plus a standard broiler "Target" reference curve for comparison.
  const dashboardGrowthData = useMemo(() => {
    const activeBatches = batches.filter((b) => b.status === 'active' && b.weightRecords.length > 0)
    if (activeBatches.length === 0) return []
    const ageSet = new Set<number>()
    activeBatches.forEach((b) => b.weightRecords.forEach((w) => ageSet.add(w.ageDays)))
    const ages = Array.from(ageSet).sort((a, b) => a - b)
    const targetCurve: Record<number, number> = { 1: 42, 7: 180, 14: 430, 21: 850, 28: 1400, 35: 2050, 42: 2700 }
    const targetKeys = Object.keys(targetCurve).map(Number).sort((a, b) => a - b)
    return ages.map((age) => {
      const row: Record<string, number | string> = { umur: `H${age}` }
      activeBatches.forEach((b) => {
        const recs = b.weightRecords.filter((w) => w.ageDays === age)
        if (recs.length > 0) {
          const avg = recs.reduce((s, r) => s + r.averageWeightGram, 0) / recs.length
          row[b.name] = Math.round(avg)
        }
      })
      // interpolate target
      let target = targetCurve[targetKeys[0]]
      for (let i = 0; i < targetKeys.length; i++) {
        if (age <= targetKeys[i]) {
          if (i === 0) { target = targetCurve[targetKeys[0]]; break }
          const x0 = targetKeys[i - 1], x1 = targetKeys[i]
          const y0 = targetCurve[x0], y1 = targetCurve[x1]
          target = Math.round(y0 + ((y1 - y0) * (age - x0)) / (x1 - x0))
          break
        }
        if (i === targetKeys.length - 1) target = targetCurve[x1]
      }
      row['Target'] = target
      return row
    })
  }, [batches])

  // Line config (name + color) for each active batch on the growth chart
  const dashboardActiveBatchLines = useMemo(
    () => batches
      .filter((b) => b.status === 'active' && b.weightRecords.length > 0)
      .map((b, i) => ({ name: b.name, color: COLORS[i % COLORS.length] })),
    [batches]
  )

  // Cost breakdown for pie chart: equipment cost grouped by category
  const dashboardCostBreakdown = useMemo(() => {
    const eqByCat: Record<string, number> = {}
    batches.forEach((b) => b.equipment?.forEach((e) => {
      const cat = e.category || 'Lainnya'
      eqByCat[cat] = (eqByCat[cat] || 0) + e.quantity * e.unitPrice
    }))
    const result: Array<{ name: string; value: number; color: string }> = []
    Object.entries(eqByCat).forEach(([name, value], i) => {
      if (value > 0) result.push({ name, value: Math.round(value), color: COLORS[i % COLORS.length] })
    })
    return result
  }, [batches])

  // Harvest performance (profit per harvested batch) for bar chart
  const dashboardHarvestPerformance = useMemo(
    () => batches
      .filter((b) => b.status === 'harvested')
      .map((b) => {
        const stats = computeBatchStats(b)
        return {
          name: b.name.length > 12 ? b.name.slice(0, 12) + '…' : b.name,
          profit: Math.round(stats.profit),
        }
      }),
    [batches]
  )

  // Extra totals not in the dashboard API response
  const dashExtras = useMemo(() => {
    const equipmentCost = batches.reduce(
      (s, b) => s + (b.equipment?.reduce((s2, e) => s2 + e.quantity * e.unitPrice, 0) || 0),
      0
    )
    const totalCost = equipmentCost
    const totalProfit = batches
      .filter((b) => b.status === 'harvested')
      .reduce((s, b) => s + computeBatchStats(b).profit, 0)
    return { totalCost, totalProfit, equipmentCost }
  }, [batches])

  // Smart alerts/insights across all batches
  const dashboardAlerts = useMemo(() => {
    const alerts: Array<{ level: 'warning' | 'info' | 'success'; title: string; desc: string; batchId?: string }> = []
    batches.forEach((b) => {
      const stats = computeBatchStats(b)
      if (b.status === 'active') {
        if (stats.mortalityRate > 5) {
          alerts.push({ level: 'warning', title: `${b.name}: Mortalitas Tinggi`, desc: `Tingkat kematian ${stats.mortalityRate.toFixed(1)}% (${stats.totalDead} ekor). Perlu evaluasi manajemen kandang.`, batchId: b.id })
        }
        if (stats.ageDays >= 30 && stats.latestWeight >= 2000) {
          alerts.push({ level: 'success', title: `${b.name}: Siap Panen`, desc: `Umur ${stats.ageDays} hari, berat rata-rata ${(stats.latestWeight / 1000).toFixed(2)} kg. Sudah mencapai target panen (2 kg).`, batchId: b.id })
        }
        const latestWeightDate = b.weightRecords.length > 0
          ? b.weightRecords.reduce((latest, r) => new Date(r.date) > new Date(latest.date) ? r : latest, b.weightRecords[0]).date
          : null
        const daysSince = latestWeightDate ? (Date.now() - new Date(latestWeightDate).getTime()) / 86400000 : Infinity
        if (!latestWeightDate || daysSince > 7) {
          alerts.push({ level: 'info', title: `${b.name}: Belum Timbang`, desc: `Data penimbangan terakhir ${latestWeightDate ? ` ${Math.floor(daysSince)} hari lalu` : 'belum ada'}. Lakukan penimbangan rutin.`, batchId: b.id })
        }
      } else if (b.status === 'harvested' && stats.profit < 0) {
        alerts.push({ level: 'warning', title: `${b.name}: Panen Rugi`, desc: `Terjadi kerugian pada panen ini. Evaluasi biaya produksi & harga jual.`, batchId: b.id })
      }
    })
    return alerts
  }, [batches])

  // Recent activity timeline (latest 10 events across all batches)
  const dashboardRecentActivity = useMemo(() => {
    type EvType = 'weight' | 'mortality' | 'equipment' | 'harvest' | 'arrival'
    const events: Array<{ type: EvType; batchName: string; date: string; detail: string; batchId: string }> = []
    batches.forEach((b) => {
      events.push({ type: 'arrival', batchName: b.name, date: b.arrivalDate, detail: `${b.quantity.toLocaleString('id-ID')} ekor DOC masuk`, batchId: b.id })
      b.weightRecords.forEach((w) => events.push({ type: 'weight', batchName: b.name, date: w.date, detail: `Timbang: ${w.averageWeightGram} g (umur ${w.ageDays} hari)`, batchId: b.id }))
      b.mortalityRecords.forEach((m) => events.push({ type: 'mortality', batchName: b.name, date: m.date, detail: `${m.quantity} ekor mati — ${m.reason}`, batchId: b.id }))
      b.equipment?.forEach((e) => events.push({ type: 'equipment', batchName: b.name, date: e.purchaseDate, detail: `${e.name}: ${e.quantity} ${e.unit}`, batchId: b.id }))
      if (b.status === 'harvested' && b.harvestDate) {
        events.push({ type: 'harvest', batchName: b.name, date: b.harvestDate, detail: `Panen ${b.harvestQuantity?.toLocaleString('id-ID')} ekor @ ${(b.harvestWeight || 0).toFixed(2)} kg`, batchId: b.id })
      }
    })
    return events
      .sort((a, b2) => new Date(b2.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
  }, [batches])

  // Filtered batches for the Termin section (search + status filter)
  const filteredBatches = useMemo(() => {
    const q = terminSearch.trim().toLowerCase()
    return batches.filter((b) => {
      if (terminFilter !== 'all' && b.status !== terminFilter) return false
      if (!q) return true
      return (
        b.name.toLowerCase().includes(q) ||
        `termin ${b.terminNumber}`.includes(q) ||
        `termin#${b.terminNumber}`.includes(q) ||
        formatDate(b.arrivalDate).toLowerCase().includes(q)
      )
    })
  }, [batches, terminSearch, terminFilter])

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
          onClick={() => { setEditingBatch(null); setBatchForm({ name: '', terminNumber: '1', arrivalDate: '', initialWeight: '', quantity: '', notes: '' }); setAddBatchOpen(true) }}
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
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-emerald-50 via-amber-50/30 to-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex bg-gradient-to-br from-emerald-50/80 via-amber-50/20 to-white">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-emerald-100 bg-white/70 backdrop-blur-xl shrink-0 sticky top-0 h-dvh">
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
              onClick={() => { setEditingBatch(null); setBatchForm({ name: '', terminNumber: '1', arrivalDate: '', initialWeight: '', quantity: '', notes: '' }); setAddBatchOpen(true) }}
              className="hidden lg:flex bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-200/50 gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Termin</span>
            </Button>
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
                {/* === Dashboard Section (upgraded) === */}
                {activeSection === 'dashboard' && (
                  <>
                    {/* Hero Banner */}
                    <div className="relative rounded-2xl overflow-hidden mb-5 shadow-xl">
                      <img src="/chicken-farm-hero.png" alt="Peternakan Ayam" className="w-full h-36 sm:h-48 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/85 via-emerald-900/55 to-transparent flex items-center">
                        <div className="px-5 sm:px-8">
                          <h2 className="text-lg sm:text-2xl font-bold text-white mb-1">{appSettings.appName}</h2>
                          <p className="text-emerald-100 text-xs sm:text-sm max-w-md">Pantau performa peternakan secara real-time — KPI, grafik pertumbuhan, biaya, dan aktivitas terkini.</p>
                        </div>
                      </div>
                    </div>

                    {/* KPI Cards — Total Termin, Ayam, Mortalitas, Total Biaya, Pendapatan,
                        ditambah 2 kartu ringkasan Cash vs BON (Total Cash, Total BON). */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 mb-5">
                      {[
                        { icon: Package, label: 'Total Termin', value: String(dashboard?.totalBatches || 0), sub: `${dashboard?.activeBatches || 0} aktif · ${dashboard?.harvestedBatches || 0} panen`, color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-200/50' },
                        { icon: Bird, label: 'Ayam Hidup', value: (dashboard?.totalChickens || 0).toLocaleString('id-ID'), sub: 'ekor aktif', color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-200/50' },
                        { icon: Skull, label: 'Mortalitas', value: (dashboard?.totalMortality || 0).toLocaleString('id-ID'), sub: 'ekor total', color: 'from-red-500 to-red-700', shadow: 'shadow-red-200/50' },
                        { icon: Wallet, label: 'Total Biaya', value: formatCurrency(dashExtras.totalCost), sub: 'Peralatan & operasional', color: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-200/50' },
                        { icon: TrendingUp, label: 'Pendapatan', value: formatCurrency(dashboard?.totalHarvestRevenue || 0), sub: `Laba: ${formatCurrency(dashExtras.totalProfit)}`, color: 'from-teal-500 to-cyan-600', shadow: 'shadow-teal-200/50' },
                        // Ringkasan Cash (tunai) — sebagian besar biaya operasional dibayar tunai.
                        { icon: Banknote, label: 'Total Cash', value: formatCurrency(dashboard?.totalCashSpent || 0), sub: 'Pembayaran tunai (lunas)', color: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-200/50' },
                        // Ringkasan BON (utang) — menunjukkan berapa utang yang masih belum dibayar.
                        { icon: ReceiptText, label: 'Total BON', value: formatCurrency(dashboard?.totalBonAmount || 0), sub: `${dashboard?.bonCount || 0} transaksi belum dibayar`, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-200/50' },
                      ].map((stat, i) => (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden h-full">
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">{stat.label}</p>
                                  <p className="text-base sm:text-xl font-bold mt-0.5 truncate">{stat.value}</p>
                                  <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 mt-0.5 truncate">{stat.sub}</p>
                                </div>
                                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadow} shrink-0`}>
                                  <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      <Button size="sm" className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700" onClick={() => {
                        const nextTermin = batches.length > 0 ? Math.max(...batches.map((b) => b.terminNumber)) + 1 : 1
                        setEditingBatch(null)
                        setBatchForm({ name: '', terminNumber: String(nextTermin), arrivalDate: '', initialWeight: '', quantity: '', notes: '' })
                        setAddBatchOpen(true)
                      }}>
                        <Plus className="w-4 h-4" /> Termin Baru
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50" onClick={() => {
                        const activeBatches = batches.filter((b) => b.status === 'active')
                        if (activeBatches.length === 0) {
                          toast({ title: 'Info', description: 'Belum ada termin aktif untuk ditimbang' })
                          return
                        }
                        setEditingWeight(null)
                        setSelectedBatch(null) // pastikan selector termin tampil
                        // Jika hanya 1 termin aktif → pre-select; jika banyak → user pilih sendiri
                        setDialogBatchId(activeBatches.length === 1 ? activeBatches[0].id : '')
                        setWeightForm({ date: new Date().toISOString().slice(0, 10), averageWeightGram: '', ageDays: '', sampleCount: '1', notes: '' })
                        setAddWeightOpen(true)
                      }}>
                        <Scale className="w-4 h-4" /> Timbang
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50" onClick={() => {
                        const ab = batches.find((b) => b.status === 'active')
                        if (ab) {
                          setEditingEquipment(null)
                          setDialogBatchId(ab.id)
                          setEquipmentForm({ name: '', category: 'Peralatan Pakan & Minum', quantity: '', unit: 'Unit', unitPrice: '', purchaseDate: '', notes: '', notaData: '', notaName: '', paymentMethod: 'cash' })
                          setShowAddUnit(false)
                          setNewUnitName('')
                          setAddEquipmentOpen(true)
                        } else {
                          toast({ title: 'Info', description: 'Belum ada batch aktif untuk mencatat biaya' })
                        }
                      }}>
                        <Wrench className="w-4 h-4" /> Catat Biaya
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setActiveSection('panen')}>
                        <ShoppingBasket className="w-4 h-4" /> Kelola Panen
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setActiveSection('kalender')}>
                        <CalendarDays className="w-4 h-4" /> Kalender
                      </Button>
                    </div>

                    {/* Alerts / Insights */}
                    {dashboardAlerts.length > 0 && (
                      <div className="mb-5 space-y-2">
                        {dashboardAlerts.slice(0, 4).map((alert, i) => {
                          const styles = alert.level === 'warning'
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : alert.level === 'success'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-sky-50 border-sky-200 text-sky-800'
                          const Icon = alert.level === 'warning' ? AlertTriangle : alert.level === 'success' ? CheckCircle2 : Info
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={`flex items-start gap-3 rounded-xl border p-3 ${styles}`}
                            >
                              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">{alert.title}</p>
                                <p className="text-xs opacity-80">{alert.desc}</p>
                              </div>
                              {alert.batchId && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs px-2 shrink-0" onClick={() => { const b = batches.find((x) => x.id === alert.batchId); if (b) openBatchDetail(b) }}>
                                  Lihat <ChevronRight className="w-3 h-3" />
                                </Button>
                              )}
                            </motion.div>
                          )
                        })}
                      </div>
                    )}

                    {/* Charts row: Growth + Cost breakdown */}
                    <div className="grid gap-4 lg:grid-cols-2 mb-5">
                      {/* Growth chart */}
                      <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600" /> Grafik Pertumbuhan Batch Aktif
                          </CardTitle>
                          <CardDescription className="text-xs">Berat rata-rata (gram) vs umur (hari), dibanding kurva target standar</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {dashboardGrowthData.length > 1 ? (
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dashboardGrowthData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis dataKey="umur" tick={{ fontSize: 11 }} />
                                  <YAxis tick={{ fontSize: 11 }} unit="g" />
                                  <Tooltip formatter={(value: number) => [`${value} g`, '']} />
                                  <Legend wrapperStyle={{ fontSize: 11 }} />
                                  <Line type="monotone" dataKey="Target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                  {dashboardActiveBatchLines.map((b) => (
                                    <Line key={b.name} type="monotone" dataKey={b.name} stroke={b.color} strokeWidth={2.5} dot={{ r: 3 }} />
                                  ))}
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                              <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
                              <p className="text-sm">Belum ada data timbang cukup</p>
                              <p className="text-xs">Catat minimal 2x penimbangan pada batch aktif</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Cost breakdown pie */}
                      <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-rose-600" /> Distribusi Biaya
                          </CardTitle>
                          <CardDescription className="text-xs">Total {formatCurrency(dashExtras.totalCost)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {dashboardCostBreakdown.length > 0 && dashExtras.totalCost > 0 ? (
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={dashboardCostBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry: { percent?: number }) => entry.percent ? `${(entry.percent * 100).toFixed(0)}%` : ''}>
                                    {dashboardCostBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                  </Pie>
                                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                  <Legend wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                              <Wallet className="w-10 h-10 mb-2 opacity-30" />
                              <p className="text-sm">Belum ada data biaya</p>
                              <p className="text-xs">Catat biaya peralatan untuk melihat distribusi</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Harvest performance bar */}
                    {dashboardHarvestPerformance.length > 0 && (
                      <Card className="border-0 shadow-lg mb-5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-amber-600" /> Performa Panen per Termin
                          </CardTitle>
                          <CardDescription className="text-xs">Laba/Rugi — hijau = untung, merah = rugi</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={dashboardHarvestPerformance}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Bar dataKey="profit" name="Laba" radius={[6, 6, 0, 0]}>
                                  {dashboardHarvestPerformance.map((entry, i) => (
                                    <Cell key={i} fill={entry.profit >= 0 ? '#16a34a' : '#ef4444'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Active batch status */}
                    {batches.filter((b) => b.status === 'active').length > 0 && (
                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-600" /> Status Batch Aktif
                          </h3>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setActiveSection('termin')}>Semua Termin <ChevronRight className="w-3 h-3" /></Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {batches.filter((b) => b.status === 'active').map((batch, i) => {
                            const stats = getBatchStats(batch)
                            const progress = Math.min((stats.latestWeight / 2000) * 100, 100)
                            // Hitung total BON per-batch (untuk badge utang di kartu).
                            const batchBonAmount = (batch.equipment ?? [])
                              .filter((e) => e.paymentMethod === 'bon')
                              .reduce((s, e) => s + e.quantity * e.unitPrice, 0)
                            return (
                              <motion.div key={batch.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                                <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden" onClick={() => openBatchDetail(batch)}>
                                  <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="font-bold text-sm truncate">{batch.name}</p>
                                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">Aktif</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                      <div><p className="text-muted-foreground">Umur</p><p className="font-semibold">{stats.ageDays} hari</p></div>
                                      <div><p className="text-muted-foreground">Berat</p><p className="font-semibold">{(stats.latestWeight / 1000).toFixed(2)} kg</p></div>
                                      <div><p className="text-muted-foreground">Biaya</p><p className="font-semibold">{formatCurrency(stats.totalCost)}</p></div>
                                      <div><p className="text-muted-foreground">Mati</p><p className="font-semibold text-red-600">{stats.totalDead} ({stats.mortalityRate.toFixed(1)}%)</p></div>
                                    </div>
                                    {/* Badge BON — muncul hanya jika ada utang (paymentMethod "bon") di termin ini. */}
                                    {batchBonAmount > 0 && (
                                      <div className="mb-2 -mt-1 flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] text-amber-800">
                                        <ReceiptText className="w-3 h-3 shrink-0" />
                                        <span className="truncate">BON: <strong className="font-semibold">{formatCurrency(batchBonAmount)}</strong> belum dibayar</span>
                                      </div>
                                    )}
                                    <div className="mb-1">
                                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                        <span>Progress ke target (2 kg)</span>
                                        <span>{progress.toFixed(0)}%</span>
                                      </div>
                                      <Progress value={progress} className="h-1.5" />
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="text-xs text-muted-foreground">{stats.aliveCount.toLocaleString('id-ID')} ekor hidup</span>
                                      <span className="text-xs font-semibold text-emerald-700">{formatCurrency(stats.totalCost)}</span>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recent activity */}
                    <Card className="border-0 shadow-lg">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Clock className="w-4 h-4 text-emerald-600" /> Aktivitas Terbaru
                        </CardTitle>
                        <CardDescription className="text-xs">10 catatan terkini di seluruh termin</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {dashboardRecentActivity.length > 0 ? (
                          <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                            {dashboardRecentActivity.map((ev, i) => {
                              const cfg = {
                                weight: { icon: Scale, color: 'bg-teal-100 text-teal-700' },
                                mortality: { icon: Skull, color: 'bg-red-100 text-red-700' },
                                equipment: { icon: Wrench, color: 'bg-indigo-100 text-indigo-700' },
                                harvest: { icon: ShoppingBasket, color: 'bg-orange-100 text-orange-700' },
                                arrival: { icon: Bird, color: 'bg-emerald-100 text-emerald-700' },
                              }[ev.type]
                              const Icon = cfg.icon
                              return (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{ev.detail}</p>
                                    <p className="text-xs text-muted-foreground truncate">{ev.batchName} · {formatDate(ev.date)}</p>
                                  </div>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => { const b = batches.find((x) => x.id === ev.batchId); if (b) openBatchDetail(b) }}>
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Belum ada aktivitas</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
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
                          <Button className="mt-4 bg-gradient-to-r from-emerald-600 to-emerald-700 gap-2" onClick={() => { setEditingBatch(null); setBatchForm({ name: '', terminNumber: '1', arrivalDate: '', initialWeight: '', quantity: '', notes: '' }); setAddBatchOpen(true) }}>
                            <Plus className="w-4 h-4" /> Tambah Termin Pertama
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        {/* Search & Filter bar */}
                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                              placeholder="Cari termin (nama / nomor / tanggal)..."
                              value={terminSearch}
                              onChange={(e) => setTerminSearch(e.target.value)}
                              className="pl-9 h-10"
                            />
                          </div>
                          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                            {([['all', 'Semua'], ['active', 'Aktif'], ['harvested', 'Panen']] as const).map(([val, label]) => (
                              <button
                                key={val}
                                onClick={() => setTerminFilter(val)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                                  terminFilter === val
                                    ? 'bg-white shadow-sm text-emerald-700'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {filteredBatches.length === 0 ? (
                          <Card className="border-dashed border-2">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                              <Search className="w-10 h-10 text-muted-foreground/30 mb-2" />
                              <h3 className="text-base font-semibold text-gray-700">Tidak ada termin ditemukan</h3>
                              <p className="text-muted-foreground text-sm mt-1">Coba kata kunci atau filter lain</p>
                              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setTerminSearch(''); setTerminFilter('all') }}>
                                Reset filter
                              </Button>
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredBatches.map((batch, i) => {
                              const stats = getBatchStats(batch)
                              const harvestEst = estimateHarvest(batch)
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
                                      <span>Target: ~2 kg</span>
                                    </div>
                                    <Progress value={Math.min((stats.latestWeight / 2000) * 100, 100)} className="h-2" />
                                  </div>
                                  {/* Estimasi Panen - only for active batches with enough weight data */}
                                  {batch.status === 'active' && harvestEst && (
                                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5">
                                      <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[10px] text-muted-foreground leading-tight">Estimasi siap panen</p>
                                        <p className="text-xs font-bold text-emerald-700 leading-tight truncate">
                                          {harvestEst.daysToTarget === 0
                                            ? 'Sudah siap panen!'
                                            : `~${harvestEst.daysToTarget} hari lagi (${formatDate(harvestEst.estDate.toISOString())})`}
                                        </p>
                                      </div>
                                    </div>
                                  )}
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
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); openEditBatch(batch) }}>
                                      <Pencil className="w-3 h-3" /> Edit
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openBatchDetail(batch)}>
                                      <ChevronRight className="w-3 h-3" /> Detail
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-teal-300 text-teal-700 hover:bg-teal-50" onClick={() => { setEditingWeight(null); setDialogBatchId(batch.id); setWeightForm({ date: new Date().toISOString().slice(0, 10), averageWeightGram: '', ageDays: '', sampleCount: '1', notes: '' }); setAddWeightOpen(true) }}>
                                      <Scale className="w-3 h-3" /> Timbang
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50" onClick={() => { setEditingEquipment(null); setDialogBatchId(batch.id); setEquipmentForm({ name: '', category: 'Peralatan Pakan & Minum', quantity: '', unit: 'Unit', unitPrice: '', purchaseDate: '', notes: '', notaData: '', notaName: '', paymentMethod: 'cash' }); setShowAddUnit(false); setNewUnitName(''); setAddEquipmentOpen(true) }}>
                                      <Plus className="w-3 h-3" /> Biaya
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-cyan-300 text-cyan-700 hover:bg-cyan-50" onClick={(e) => e.stopPropagation()}>
                                          <Download className="w-3 h-3" /> Export
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenuItem onClick={() => previewBatchPDF(batch)} className="gap-2 text-xs">
                                          <Eye className="w-3.5 h-3.5" /> Preview PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => downloadBatchPDF(batch)} className="gap-2 text-xs">
                                          <Download className="w-3.5 h-3.5" /> Download PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => exportBatchCSV(batch)} className="gap-2 text-xs">
                                          <FileSpreadsheet className="w-3.5 h-3.5" /> CSV (untuk Excel)
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => openAddHarvestRecordDialog(batch)}>
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
                  </>
                )}

{/* Panen Section */}
                {activeSection === 'panen' && (() => {
                  // Termin yang PUNYA harvest records (status=harvested ATAU partial harvested).
                  // Virtual migration menjamin batch dengan legacy harvestDate punya
                  // setidaknya 1 virtual harvest record.
                  const batchesWithHarvest = batches.filter(b => b.harvestRecords.length > 0)
                  const activeBatches = batches.filter(b => b.status === 'active')
                  const totalHarvestQty = batches.reduce((s, b) => s + b.harvestRecords.reduce((s2, h) => s2 + h.quantity, 0), 0)
                  const totalHarvestKg = batches.reduce((s, b) => s + b.harvestRecords.reduce((s2, h) => s2 + h.quantity * h.weightPerEkor, 0), 0)
                  const totalRevenue = batches.reduce(
                    (s, b) => s + b.harvestRecords.reduce((s2, h) => s2 + h.quantity * h.weightPerEkor * h.sellingPricePerKg, 0),
                    0
                  )
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
                            <p className="text-2xl font-bold text-amber-700">{batchesWithHarvest.length}</p>
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
                            <p className="text-xs text-muted-foreground">dari {batchesWithHarvest.length} termin</p>
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
                              : 'Catat panen partial (bertahap) — satu termin bisa dipanen beberapa kali sampai semua ayam terjual'}
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
                              {/* Batches yang sudah punya catatan panen (partial atau lengkap) */}
                              {batchesWithHarvest.map((batch) => {
                                const stats = getBatchStats(batch)
                                const remaining = getRemainingHarvestable(batch)
                                const lastHarvestDate = batch.harvestRecords[0]?.date
                                return (
                                  <Card key={batch.id} className="border-amber-200 bg-amber-50/40 overflow-hidden">
                                    <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h4 className="font-bold truncate">{batch.name}</h4>
                                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                              {batch.status === 'harvested' ? 'Panen Lengkap' : 'Panen Sebagian'}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">{batch.harvestRecords.length} catatan</Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground mb-2">
                                            Panen terakhir: {lastHarvestDate ? formatDate(lastHarvestDate) : '—'} • Termin #{batch.terminNumber}
                                          </p>
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className="bg-white/60 rounded-lg p-2">
                                              <p className="text-[10px] text-muted-foreground">Dipanen</p>
                                              <p className="text-sm font-bold text-amber-700">{stats.harvestQty.toLocaleString('id-ID')} ekor</p>
                                            </div>
                                            <div className="bg-white/60 rounded-lg p-2">
                                              <p className="text-[10px] text-muted-foreground">Berat Total</p>
                                              <p className="text-sm font-bold text-orange-700">{stats.totalHarvestKg.toFixed(1)} kg</p>
                                            </div>
                                            <div className="bg-white/60 rounded-lg p-2">
                                              <p className="text-[10px] text-muted-foreground">Sisa</p>
                                              <p className={`text-sm font-bold ${remaining > 0 ? 'text-emerald-700' : 'text-gray-500'}`}>{remaining.toLocaleString('id-ID')} ekor</p>
                                            </div>
                                            <div className="bg-white/60 rounded-lg p-2">
                                              <p className="text-[10px] text-muted-foreground">Pendapatan</p>
                                              <p className="text-sm font-bold text-green-700 break-words">{formatCurrency(stats.totalHarvestValue)}</p>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex flex-col gap-2 shrink-0">
                                          <Button variant="outline" size="sm" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => goToBatchPanenTab(batch)}>
                                            <Pencil className="w-4 h-4" /> Kelola Panen
                                          </Button>
                                          {remaining > 0 && (
                                            <Button size="sm" className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700" onClick={() => openAddHarvestRecordDialog(batch)}>
                                              <Plus className="w-4 h-4" /> Tambah Panen
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )
                              })}

                              {/* Active batches yang belum punya catatan panen sama sekali */}
                              {activeBatches.filter((b) => b.harvestRecords.length === 0).map((batch) => {
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
                                        <Button size="sm" className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shrink-0" onClick={() => openAddHarvestRecordDialog(batch)}>
                                          <CheckCircle2 className="w-4 h-4" /> Panen
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )
                              })}

                              {batches.length > 0 && batchesWithHarvest.length === 0 && (
                                <p className="text-center text-xs text-muted-foreground pt-2">
                                  Belum ada termin yang dipanen. Klik tombol <span className="font-semibold text-amber-700">Panen</span> pada termin di atas untuk mencatat panen pertama.
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )
                })()}


                                {/* Kalender Section */}
                {activeSection === 'kalender' && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-emerald-600" />
                            Kalender Peternakan
                          </CardTitle>
                          <CardDescription>Jadwal kedatangan bibit & panen seluruh termin — klik tanggal untuk lihat detail</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {batches.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>Belum ada termin tercatat</p>
                          <p className="text-xs mt-1">Buat termin terlebih dahulu untuk melihat jadwal di kalender</p>
                        </div>
                      ) : (
                        <>
                          {/* Summary cards */}
                          {(() => {
                            const tibaCount = batches.length
                            const panenCount = batches.filter((b) => b.status === 'harvested').length
                            const upcomingPanen = batches.filter((b) => b.status === 'active').length
                            return (
                              <div className="grid grid-cols-3 gap-3 mb-5">
                                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                  <p className="text-xs text-muted-foreground">Total Tiba</p>
                                  <p className="text-lg font-bold text-emerald-700">{tibaCount}</p>
                                </div>
                                <div className="bg-amber-50 rounded-xl p-3 text-center">
                                  <p className="text-xs text-muted-foreground">Sudah Panen</p>
                                  <p className="text-lg font-bold text-amber-700">{panenCount}</p>
                                </div>
                                <div className="bg-teal-50 rounded-xl p-3 text-center">
                                  <p className="text-xs text-muted-foreground">Aktif (Belum Panen)</p>
                                  <p className="text-lg font-bold text-teal-700">{upcomingPanen}</p>
                                </div>
                              </div>
                            )
                          })()}

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

                          {/* Day header */}
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                            ))}
                          </div>

                          {/* Calendar grid — SEMUA event dari SEMUA batch, klik untuk detail */}
                          <div className="grid grid-cols-7 gap-1">
                            {calendarCells.map((cell, i) => {
                              if (!cell.date) {
                                return <div key={`blank-${i}`} className="min-h-[56px] sm:min-h-[72px]" />
                              }
                              const events = cell.events
                              const hasTiba = events.some((e) => e.type === 'tiba')
                              const hasPanen = events.some((e) => e.type === 'panen')
                              const isToday = new Date().toDateString() === cell.date.toDateString()
                              const hasEvents = events.length > 0
                              return (
                                <button
                                  key={cell.day}
                                  type="button"
                                  disabled={!hasEvents}
                                  onClick={() => hasEvents && setDayDetail({ date: cell.date!, events })}
                                  className={`min-h-[56px] sm:min-h-[72px] p-1.5 rounded-lg border text-left transition-all ${
                                    hasEvents
                                      ? 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-100 hover:border-emerald-400 cursor-pointer'
                                      : 'border-gray-100 cursor-default'
                                  } ${isToday ? 'ring-2 ring-emerald-400' : ''}`}
                                >
                                  <p className={`text-xs font-medium ${isToday ? 'text-emerald-700' : 'text-gray-600'}`}>{cell.day}</p>
                                  {hasTiba && (
                                    <div className="mt-1 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                      <span className="block text-[10px] font-medium text-emerald-700 truncate">
                                        {events.filter((e) => e.type === 'tiba').length > 1 ? `${events.filter((e) => e.type === 'tiba').length} Tiba` : 'Tiba'}
                                      </span>
                                    </div>
                                  )}
                                  {hasPanen && (
                                    <div className="mt-0.5 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                      <span className="block text-[10px] font-medium text-amber-700 truncate">
                                        {events.filter((e) => e.type === 'panen').length > 1 ? `${events.filter((e) => e.type === 'panen').length} Panen` : 'Panen'}
                                      </span>
                                    </div>
                                  )}
                                  {hasEvents && events.length > 2 && (
                                    <p className="text-[9px] text-muted-foreground mt-0.5">+{events.length - 2} lainnya</p>
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
                            <div className="flex items-center gap-1.5">
                              <Info className="w-3 h-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Klik tanggal berwarna untuk detail</span>
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
                    <Button variant="ghost" onClick={() => { setView('dashboard'); setSelectedBatch(null); setActiveSection('termin'); setActiveBatchTab('berat') }} className="w-fit gap-2">
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
                    <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                      <Button variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex-1 sm:flex-none" onClick={() => openEditBatch(selectedBatch)}>
                        <Pencil className="w-4 h-4" /> Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50 flex-1 sm:flex-none">
                            <Download className="w-4 h-4" /> Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => previewBatchPDF(selectedBatch)} className="gap-2">
                            <Eye className="w-4 h-4" /> Preview PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadBatchPDF(selectedBatch)} className="gap-2">
                            <Download className="w-4 h-4" /> Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportBatchCSV(selectedBatch)} className="gap-2">
                            <FileSpreadsheet className="w-4 h-4" /> CSV (untuk Excel)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 flex-1 sm:flex-none" onClick={() => setActiveBatchTab('panen')}>
                        <ShoppingBasket className="w-4 h-4" /> Kelola Panen
                      </Button>
                      {selectedBatch.status === 'harvested' && (
                        <Button variant="outline" className="gap-2 border-red-300 text-red-600 hover:bg-red-50 flex-1 sm:flex-none" onClick={() => handleCancelHarvest(selectedBatch)}>
                          <RotateCcw className="w-4 h-4" /> Batalkan Panen
                        </Button>
                      )}
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
                          { icon: Wallet, label: 'Biaya', value: formatCurrency(stats.totalCost), bg: 'bg-violet-50', text: 'text-violet-700' },
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

                  {/* Detail Tabs: Weight, Mortality, Biaya, Panen */}
                  <Tabs value={activeBatchTab} onValueChange={(v) => setActiveBatchTab(v as 'berat' | 'mortalitas' | 'biaya' | 'panen')} className="space-y-4">
                    <TabsList className="bg-white shadow-sm border p-1 grid grid-cols-4 sm:flex sm:flex-wrap">
                      <TabsTrigger value="berat" className="gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 w-full sm:w-auto">
                        <Scale className="w-4 h-4" /> Berat
                      </TabsTrigger>
                      <TabsTrigger value="mortalitas" className="gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700 w-full sm:w-auto">
                        <Skull className="w-4 h-4" /> Mortalitas
                      </TabsTrigger>
                      <TabsTrigger value="biaya" className="gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 w-full sm:w-auto">
                        <Wrench className="w-4 h-4" /> Biaya
                      </TabsTrigger>
                      <TabsTrigger value="panen" className="gap-2 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 w-full sm:w-auto">
                        <ShoppingBasket className="w-4 h-4" /> Panen
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
                            <Button size="sm" className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shrink-0" onClick={() => { setEditingWeight(null); setWeightForm({ date: new Date().toISOString().slice(0, 10), averageWeightGram: '', ageDays: '', sampleCount: '1', notes: '' }); setAddWeightOpen(true) }}>
                              <Plus className="w-4 h-4" /> Tambah
                            </Button>
                          )}
                        </CardHeader>
                        <CardContent>
                          {selectedBatch.weightRecords.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Scale className="w-10 h-10 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">Belum ada catatan berat</p>
                              <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => { setEditingWeight(null); setWeightForm({ date: new Date().toISOString().slice(0, 10), averageWeightGram: '', ageDays: '', sampleCount: '1', notes: '' }); setAddWeightOpen(true) }}>
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
                                    <Button variant="ghost" size="icon" className="opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); openEditWeight(weight, selectedBatch) }}>
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
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
                            <Button size="sm" className="gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shrink-0" onClick={() => { setEditingMortality(null); setMortalityForm({ date: '', quantity: '', reason: 'sakit', notes: '' }); setAddMortalityOpen(true) }}>
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
                                    <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => { setEditingMortality(null); setMortalityForm({ date: '', quantity: '', reason: 'sakit', notes: '' }); setAddMortalityOpen(true) }}>
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
                                          <Button variant="ghost" size="icon" className="opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); openEditMortality(m, selectedBatch) }}>
                                            <Pencil className="w-3.5 h-3.5" />
                                          </Button>
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
                          <Button size="sm" className="gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shrink-0" onClick={() => { setEditingEquipment(null); setEquipmentForm({ name: '', category: 'Peralatan Pakan & Minum', quantity: '', unit: 'Unit', unitPrice: '', purchaseDate: '', notes: '', notaData: '', notaName: '', paymentMethod: 'cash' }); setShowAddUnit(false); setNewUnitName(''); setAddEquipmentOpen(true) }}>
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
                                    <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => { setEditingEquipment(null); setEquipmentForm({ name: '', category: 'Peralatan Pakan & Minum', quantity: '', unit: 'Unit', unitPrice: '', purchaseDate: '', notes: '', notaData: '', notaName: '', paymentMethod: 'cash' }); setShowAddUnit(false); setNewUnitName(''); setAddEquipmentOpen(true) }}>
                                      <Plus className="w-3 h-3" /> Tambah Biaya Pertama
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                                    {equipList.map((e) => (
                                      <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-indigo-50/50 to-transparent hover:from-indigo-50 transition-colors group">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${e.paymentMethod === 'bon' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                                            {e.paymentMethod === 'bon'
                                              ? <ReceiptText className="w-5 h-5 text-amber-600" />
                                              : <Banknote className="w-5 h-5 text-emerald-600" />}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-medium text-sm truncate">{e.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{e.quantity} {e.unit} × {formatCurrency(e.unitPrice)} • {formatDate(e.purchaseDate)}{e.notes ? ` • ${e.notes}` : ''}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${e.paymentMethod === 'bon' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`} title={e.paymentMethod === 'bon' ? 'BON — utang, belum dibayar' : 'Cash — tunai, lunas'}>
                                            {e.paymentMethod === 'bon' ? 'BON' : 'Cash'}
                                          </Badge>
                                          <p className="font-bold text-sm">{formatCurrency(e.quantity * e.unitPrice)}</p>
                                          {e.notaData && (
                                            <Button variant="ghost" size="icon" className="opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={(ev) => { ev.stopPropagation(); setNotaViewer({ src: e.notaData!, title: `Nota ${e.name}`, fileName: e.notaName || undefined }) }} title="Lihat foto nota">
                                              <Receipt className="w-3.5 h-3.5" />
                                            </Button>
                                          )}
                                          <Button variant="ghost" size="icon" className="opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-100" onClick={(ev) => { ev.stopPropagation(); openEditEquipment(e) }}>
                                            <Pencil className="w-3.5 h-3.5" />
                                          </Button>
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

                    {/* Panen Records (partial harvest) */}
                    <TabsContent value="panen">
                      <Card className="border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <ShoppingBasket className="w-4 h-4 text-amber-600" />
                              Riwayat Panen
                            </CardTitle>
                            <CardDescription>Catat panen bertahap — satu termin bisa dipanen beberapa kali</CardDescription>
                          </div>
                          {getRemainingHarvestable(selectedBatch) > 0 && (
                            <Button size="sm" className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shrink-0" onClick={() => openAddHarvestRecordDialog(selectedBatch)}>
                              <Plus className="w-4 h-4" /> Tambah Panen
                            </Button>
                          )}
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const harvestList = selectedBatch.harvestRecords
                            const totalHarvested = harvestList.reduce((s, h) => s + h.quantity, 0)
                            const totalKg = harvestList.reduce((s, h) => s + h.quantity * h.weightPerEkor, 0)
                            const totalRevenue = harvestList.reduce((s, h) => s + h.quantity * h.weightPerEkor * h.sellingPricePerKg, 0)
                            const totalDead = selectedBatch.mortalityRecords.reduce((s, m) => s + m.quantity, 0)
                            const remaining = Math.max(0, selectedBatch.quantity - totalDead - totalHarvested)
                            return (
                              <>
                                {/* Summary row */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Total Dipanen</p>
                                    <p className="text-lg font-bold text-amber-700">{totalHarvested.toLocaleString('id-ID')} ekor</p>
                                  </div>
                                  <div className="bg-orange-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Total Berat</p>
                                    <p className="text-lg font-bold text-orange-700">{totalKg.toFixed(1)} kg</p>
                                  </div>
                                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Sisa Ayam</p>
                                    <p className={`text-lg font-bold ${remaining > 0 ? 'text-emerald-700' : 'text-gray-500'}`}>{remaining.toLocaleString('id-ID')} ekor</p>
                                  </div>
                                  <div className="bg-green-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Pendapatan</p>
                                    <p className="text-sm sm:text-lg font-bold text-green-700 break-words">{formatCurrency(totalRevenue)}</p>
                                  </div>
                                </div>

                                {/* Status badge row */}
                                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <Badge className={selectedBatch.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
                                      {selectedBatch.status === 'active' ? 'Aktif' : 'Panen Lengkap'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {harvestList.length} catatan panen
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    Kapasitas: {(selectedBatch.quantity - totalDead).toLocaleString('id-ID')} ekor • Terpanen: {totalHarvested.toLocaleString('id-ID')} ({selectedBatch.quantity - totalDead > 0 ? Math.round((totalHarvested / (selectedBatch.quantity - totalDead)) * 100) : 0}%)
                                  </span>
                                </div>

                                {harvestList.length === 0 ? (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <ShoppingBasket className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Belum ada catatan panen</p>
                                    <p className="text-xs mt-1">Klik &quot;Tambah Panen&quot; untuk mencatat penjualan ayam.</p>
                                    {getRemainingHarvestable(selectedBatch) > 0 && (
                                      <Button size="sm" variant="outline" className="mt-3 gap-2 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => openAddHarvestRecordDialog(selectedBatch)}>
                                        <Plus className="w-3 h-3" /> Tambah Panen Pertama
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                                    {harvestList.map((h) => {
                                      const revenue = h.quantity * h.weightPerEkor * h.sellingPricePerKg
                                      const totalKgH = h.quantity * h.weightPerEkor
                                      return (
                                        <div key={h.id} className="p-3 rounded-xl bg-gradient-to-r from-amber-50/50 to-transparent hover:from-amber-50 transition-colors group">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                                <ShoppingBasket className="w-5 h-5 text-amber-600" />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <p className="font-medium text-sm">{formatDate(h.date)}</p>
                                                  {h.buyerName && (
                                                    <Badge variant="outline" className="text-xs">{h.buyerName}</Badge>
                                                  )}
                                                  {h.id.startsWith('legacy_') && (
                                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Data Lama</Badge>
                                                  )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                  {h.quantity.toLocaleString('id-ID')} ekor × {h.weightPerEkor.toFixed(2)} kg × {formatCurrency(h.sellingPricePerKg)}/kg
                                                </p>
                                                {h.notes && (
                                                  <p className="text-xs text-muted-foreground mt-0.5 italic truncate">"{h.notes}"</p>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                              <p className="font-bold text-sm text-green-700">{formatCurrency(revenue)}</p>
                                              <p className="text-[10px] text-muted-foreground">{totalKgH.toFixed(1)} kg</p>
                                              <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-7 w-7 text-amber-700 hover:text-amber-900 hover:bg-amber-100" onClick={(e) => { e.stopPropagation(); openEditHarvestRecordDialog(selectedBatch, h) }} title="Edit panen">
                                                  <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                {/* Tombol hapus disembunyikan untuk virtual (legacy) record. */}
                                                {!h.id.startsWith('legacy_') && (
                                                  <Button variant="ghost" size="icon" className="opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteHarvestRecord(h) }} title="Hapus panen">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
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
        <footer className="mt-auto border-t bg-white/80 backdrop-blur-sm py-4 pb-safe">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent">{appSettings.appName}</span>
              {' '}• Sistem Manajemen Peternakan Ayam
            </p>
          </div>
        </footer>
      </div>

      {/* Add Batch Dialog */}
      <Dialog open={addBatchOpen} onOpenChange={(open) => { setAddBatchOpen(open); if (!open) setEditingBatch(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              {editingBatch ? 'Edit Termin' : 'Tambah Termin Baru'}
            </DialogTitle>
            <DialogDescription>{editingBatch ? 'Perbarui data termin' : 'Tambahkan bibit ayam baru ke peternakan'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
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
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : (editingBatch ? 'Simpan Perubahan' : 'Simpan Termin')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Weight Dialog */}
      <Dialog open={addWeightOpen} onOpenChange={(open) => { setAddWeightOpen(open); if (!open) setEditingWeight(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-teal-600" />
              {editingWeight ? 'Edit Data Timbang' : 'Tambah Data Timbang'}
            </DialogTitle>
            <DialogDescription>{editingWeight ? `Perbarui data berat untuk ${selectedBatch?.name || 'termin ini'}` : `Catatan berat ayam${selectedBatch ? ` untuk ${selectedBatch.name}` : ''}`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            {!selectedBatch && (
              <div className="space-y-2">
                <Label>Termin</Label>
                <Select value={dialogBatchId} onValueChange={(v) => setDialogBatchId(v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih termin..." /></SelectTrigger>
                  <SelectContent>
                    {/* Hanya termin aktif yang bisa ditimbang (ayam sudah panen tidak ditimbang) */}
                    {batches.filter((b) => b.status === 'active').map((b) => (
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
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : (editingWeight ? 'Simpan Perubahan' : 'Simpan Data Timbang')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Mortality Dialog */}
      <Dialog open={addMortalityOpen} onOpenChange={(open) => { setAddMortalityOpen(open); if (!open) setEditingMortality(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Skull className="w-5 h-5 text-red-600" />
              {editingMortality ? 'Edit Data Mortalitas' : 'Tambah Data Mortalitas'}
            </DialogTitle>
            <DialogDescription>{editingMortality ? `Perbarui data mortalitas untuk ${selectedBatch?.name || 'termin ini'}` : `Catatan ayam mati/afkir${selectedBatch ? ` untuk ${selectedBatch.name}` : ''}`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
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
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : (editingMortality ? 'Simpan Perubahan' : 'Simpan Data Mortalitas')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Harvest Record Dialog (partial harvest) */}
      <Dialog open={addHarvestRecordOpen} onOpenChange={(open) => { setAddHarvestRecordOpen(open); if (!open) { setEditingHarvestRecord(null); setHarvestRecordBatchId('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBasket className="w-5 h-5 text-amber-600" />
              {editingHarvestRecord ? 'Edit Catatan Panen' : 'Tambah Catatan Panen'}
            </DialogTitle>
            <DialogDescription>
              {editingHarvestRecord
                ? `Perbarui data panen untuk termin ${selectedBatch?.name ?? ''}`
                : `Catat panen partial untuk termin ${selectedBatch?.name ?? ''}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Pilih termin — hanya muncul jika tidak ada selectedBatch (dari section global). */}
            {!selectedBatch && (
              <div className="space-y-2">
                <Label>Termin</Label>
                <Select
                  value={harvestRecordBatchId}
                  onValueChange={(v) => setHarvestRecordBatchId(v)}
                >
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
              <Label>Tanggal Panen</Label>
              <Input type="date" value={harvestRecordForm.date} onChange={(e) => setHarvestRecordForm({ ...harvestRecordForm, date: e.target.value })} />
            </div>
            {/* Info sisa ayam yang bisa dipanen */}
            {(() => {
              const ctxBatch = selectedBatch || batches.find((b) => b.id === harvestRecordBatchId)
              if (!ctxBatch) return null
              // Untuk edit mode: sisa = remaining + qty record ini (karena qty record ini akan di-replace).
              const baseRemaining = getRemainingHarvestable(ctxBatch)
              const editableQty = editingHarvestRecord ? editingHarvestRecord.quantity : 0
              const effectiveRemaining = baseRemaining + editableQty
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                  Sisa ayam yang bisa dipanen: <span className="font-bold">{effectiveRemaining.toLocaleString('id-ID')} ekor</span>
                  {editingHarvestRecord && (
                    <span className="block text-[10px] text-amber-600 mt-0.5">(termasuk {editableQty} ekor dari catatan ini yang sedang di-edit)</span>
                  )}
                </div>
              )
            })()}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jumlah Ekor</Label>
                <Input type="number" min="1" placeholder="100" value={harvestRecordForm.quantity} onChange={(e) => setHarvestRecordForm({ ...harvestRecordForm, quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Berat per Ekor (kg)</Label>
                <Input type="number" step="0.01" min="0" placeholder="1.8" value={harvestRecordForm.weightPerEkor} onChange={(e) => setHarvestRecordForm({ ...harvestRecordForm, weightPerEkor: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Harga per Kg (Rp)</Label>
              <Input type="number" step="100" min="0" placeholder="22000" value={harvestRecordForm.sellingPricePerKg} onChange={(e) => setHarvestRecordForm({ ...harvestRecordForm, sellingPricePerKg: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nama Pembeli (opsional)</Label>
              <Input placeholder="mis. Pak Budi, CV Ayam Sehat" value={harvestRecordForm.buyerName} onChange={(e) => setHarvestRecordForm({ ...harvestRecordForm, buyerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Textarea placeholder="Catatan tambahan..." value={harvestRecordForm.notes} onChange={(e) => setHarvestRecordForm({ ...harvestRecordForm, notes: e.target.value })} />
            </div>
            {/* Live preview total */}
            {harvestRecordForm.quantity && harvestRecordForm.weightPerEkor && harvestRecordForm.sellingPricePerKg && (
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Berat</p>
                    <p className="text-lg font-bold text-amber-700">{(parseFloat(harvestRecordForm.quantity) * parseFloat(harvestRecordForm.weightPerEkor)).toFixed(1)} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Pendapatan</p>
                    <p className="text-base sm:text-lg font-bold text-green-700 break-words">{formatCurrency(parseFloat(harvestRecordForm.quantity) * parseFloat(harvestRecordForm.weightPerEkor) * parseFloat(harvestRecordForm.sellingPricePerKg))}</p>
                  </div>
                </div>
              </div>
            )}
            <Button
              onClick={handleSaveHarvestRecord}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
              disabled={submitting || !harvestRecordForm.date || !harvestRecordForm.quantity || !harvestRecordForm.weightPerEkor || !harvestRecordForm.sellingPricePerKg || (!selectedBatch && !harvestRecordBatchId)}
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : (editingHarvestRecord ? 'Simpan Perubahan' : 'Simpan Panen')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Biaya Dialog — mendukung 2 mode:
          • Single (default): 1 item per submit, behavior seperti sedia kala.
          • Multi-item: beberapa item dalam 1 nota (shared tanggal beli & foto
            nota), POST sequential per item. Toggle hanya tampil saat menambah
            (bukan edit). Edit mode selalu single-item. */}
      <Dialog open={addEquipmentOpen} onOpenChange={(open) => {
        setAddEquipmentOpen(open)
        if (!open) {
          setEditingEquipment(null)
          // Reset mode multi-item saat dialog ditutup agar selalu mulai fresh.
          setMultiItemMode(false)
          setEquipmentItems([])
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-600" />
              {editingEquipment ? 'Edit Biaya' : (multiItemMode ? 'Tambah Beberapa Biaya' : 'Tambah Biaya')}
            </DialogTitle>
            <DialogDescription>{editingEquipment ? 'Perbarui catatan biaya' : `Catat pembelian dan biaya operasional${selectedBatch ? ` untuk ${selectedBatch.name}` : ''}`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
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

            {/* Toggle multi-item — hanya saat menambah (bukan edit). */}
            {!editingEquipment && (
              <label className="flex items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50/40 px-3 py-2.5 cursor-pointer">
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-indigo-800">Catat beberapa item dalam 1 nota</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">Tanggal beli & foto nota dipakai bersama untuk semua item</span>
                </span>
                <Switch checked={multiItemMode} onCheckedChange={handleToggleMultiItem} aria-label="Catat beberapa item dalam 1 nota" />
              </label>
            )}

            {multiItemMode && !editingEquipment ? (
              <>
                {/* ===== Shared fields (dipakai semua item) ===== */}
                <div className="space-y-2">
                  <Label>Tanggal Beli <span className="text-destructive">*</span></Label>
                  <Input type="date" value={equipmentForm.purchaseDate} onChange={(e) => setEquipmentForm({ ...equipmentForm, purchaseDate: e.target.value })} />
                </div>
                {/* Foto nota shared — pakai UI upload yang sama (kamera + galeri). */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> Foto Nota (opsional, dipakai semua item)</Label>
                  {equipmentForm.notaData ? (
                    <div className="relative rounded-lg overflow-hidden border border-indigo-200 group">
                      <img src={equipmentForm.notaData} alt="Nota pembelian" className="w-full max-h-48 object-contain bg-slate-50" />
                      <button
                        type="button"
                        onClick={() => setEquipmentForm((prev) => ({ ...prev, notaData: '', notaName: '' }))}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                        aria-label="Hapus foto nota"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                      {equipmentForm.notaName && (
                        <p className="text-xs text-muted-foreground truncate px-2 py-1 bg-white border-t">{equipmentForm.notaName}</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed border-indigo-300 rounded-lg p-3 cursor-pointer hover:bg-indigo-50/50 transition-colors ${notaUploading ? 'pointer-events-none opacity-60' : ''}`}>
                        {notaUploading ? (
                          <><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /><span className="text-[11px] text-muted-foreground">Memproses...</span></>
                        ) : (
                          <><Camera className="w-5 h-5 text-indigo-500" /><span className="text-[11px] font-medium text-indigo-700 text-center leading-tight">Ambil Foto<br /><span className="text-[9px] text-muted-foreground font-normal">dari kamera</span></span></>
                        )}
                        <input type="file" accept="image/*" capture="environment" onChange={handleEquipmentNotaUpload} className="hidden" />
                      </label>
                      <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed border-indigo-300 rounded-lg p-3 cursor-pointer hover:bg-indigo-50/50 transition-colors ${notaUploading ? 'pointer-events-none opacity-60' : ''}`}>
                        {notaUploading ? (
                          <><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /><span className="text-[11px] text-muted-foreground">Memproses...</span></>
                        ) : (
                          <><ImageIcon className="w-5 h-5 text-indigo-500" /><span className="text-[11px] font-medium text-indigo-700 text-center leading-tight">Pilih Galeri<br /><span className="text-[9px] text-muted-foreground font-normal">JPG/PNG • dikompres</span></span></>
                        )}
                        <input type="file" accept="image/*" onChange={handleEquipmentNotaUpload} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>

                {/* ===== List items (scrollable) ===== */}
                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                  {equipmentItems.map((item, idx) => (
                    <div key={item.id} className="rounded-lg border border-indigo-200 bg-white p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-700">Item {idx + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
                          disabled={equipmentItems.length === 1}
                          onClick={() => removeEquipmentItem(item.id)}
                          aria-label={`Hapus item ${idx + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {/* Nama Barang */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nama Barang <span className="text-destructive">*</span></Label>
                        <Input placeholder="mis. Broiler Pelet, Tempat Minum" value={item.name} onChange={(e) => updateEquipmentItem(item.id, { name: e.target.value })} />
                      </div>
                      {/* Kategori */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Kategori</Label>
                        <Select
                          value={item.category === '__add_new__' ? '__add_new__' : item.category}
                          onValueChange={(v) => updateEquipmentItem(item.id, { category: v })}
                        >
                          <SelectTrigger className="h-9"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                            <SelectItem value="__add_new__">➕ Tambah Kategori Baru…</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {item.category === '__add_new__' && (
                        <div className="flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 p-2">
                          <Input
                            placeholder="Kategori baru, mis. Obat & Vitamin…"
                            value={item.newCategoryName}
                            onChange={(e) => updateEquipmentItem(item.id, { newCategoryName: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategoryForItem(item.id) } }}
                            autoFocus
                          />
                          <Button type="button" size="sm" className="shrink-0 bg-indigo-600 hover:bg-indigo-700" onClick={() => handleAddCategoryForItem(item.id)} disabled={savingCategory || !item.newCategoryName.trim()}>
                            {savingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => updateEquipmentItem(item.id, { category: DEFAULT_EQUIPMENT_CATEGORY, newCategoryName: '' })}>
                            Batal
                          </Button>
                        </div>
                      )}
                      {/* Jumlah + Satuan */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Jumlah <span className="text-destructive">*</span></Label>
                          <Input type="number" min="1" placeholder="5" value={item.quantity} onChange={(e) => updateEquipmentItem(item.id, { quantity: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Satuan</Label>
                          <Select
                            value={item.unit === '__add_new__' ? '__add_new__' : item.unit}
                            onValueChange={(v) => updateEquipmentItem(item.id, { unit: v })}
                          >
                            <SelectTrigger className="h-9"><SelectValue placeholder="Pilih satuan" /></SelectTrigger>
                            <SelectContent>
                              {units.map((u) => (
                                <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                              ))}
                              <SelectItem value="__add_new__">➕ Tambah Satuan Baru…</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {item.unit === '__add_new__' && (
                        <div className="flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 p-2">
                          <Input
                            placeholder="Satuan baru, mis. Sak, Karung…"
                            value={item.newUnitName}
                            onChange={(e) => updateEquipmentItem(item.id, { newUnitName: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUnitForItem(item.id) } }}
                            autoFocus
                          />
                          <Button type="button" size="sm" className="shrink-0 bg-indigo-600 hover:bg-indigo-700" onClick={() => handleAddUnitForItem(item.id)} disabled={savingUnit || !item.newUnitName.trim()}>
                            {savingUnit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => updateEquipmentItem(item.id, { unit: 'Unit', newUnitName: '' })}>
                            Batal
                          </Button>
                        </div>
                      )}
                      {/* Harga / satuan */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Harga / {item.unit && item.unit !== '__add_new__' ? item.unit : 'satuan'} (Rp) <span className="text-destructive">*</span></Label>
                        <Input type="number" step="100" min="0" placeholder="500000" value={item.unitPrice} onChange={(e) => updateEquipmentItem(item.id, { unitPrice: e.target.value })} />
                      </div>
                      {/* Metode Pembayaran per item — Cash atau BON (independen per item). */}
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Metode Pembayaran</Label>
                        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={`Metode pembayaran item ${idx + 1}`}>
                          <Button
                            type="button"
                            onClick={() => updateEquipmentItem(item.id, { paymentMethod: 'cash' })}
                            role="radio"
                            aria-checked={item.paymentMethod !== 'bon'}
                            className={`h-auto py-1.5 gap-1 text-xs ${
                              item.paymentMethod !== 'bon'
                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-emerald-600'
                                : 'text-emerald-700 border-emerald-300 hover:bg-emerald-50 bg-white'
                            }`}
                          >
                            <Banknote className="w-3.5 h-3.5" /> Cash
                          </Button>
                          <Button
                            type="button"
                            onClick={() => updateEquipmentItem(item.id, { paymentMethod: 'bon' })}
                            role="radio"
                            aria-checked={item.paymentMethod === 'bon'}
                            className={`h-auto py-1.5 gap-1 text-xs ${
                              item.paymentMethod === 'bon'
                                ? 'bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-amber-600'
                                : 'text-amber-700 border-amber-300 hover:bg-amber-50 bg-white'
                            }`}
                          >
                            <ReceiptText className="w-3.5 h-3.5" /> BON
                          </Button>
                        </div>
                      </div>
                      {/* Catatan per item */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Catatan</Label>
                        <Textarea placeholder="Catatan opsional..." value={item.notes} onChange={(e) => updateEquipmentItem(item.id, { notes: e.target.value })} className="min-h-[56px] text-sm" />
                      </div>
                      {/* Subtotal per item — warna mengikuti metode pembayaran (Cash=emerald, BON=amber). */}
                      {item.quantity && item.unitPrice && parseFloat(item.quantity) > 0 && parseFloat(item.unitPrice) > 0 && (
                        <div className={`rounded-lg p-2 text-center ${item.paymentMethod === 'bon' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                          <p className="text-[10px] text-muted-foreground">Subtotal ({item.paymentMethod === 'bon' ? 'BON' : 'Cash'})</p>
                          <p className={`text-sm font-bold ${item.paymentMethod === 'bon' ? 'text-amber-700' : 'text-emerald-700'}`}>{formatCurrency(parseFloat(item.quantity) * parseFloat(item.unitPrice))}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* + Tambah Item — diblokir jika ada item sedang input kategori/satuan baru. */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  onClick={addEquipmentItem}
                  disabled={equipmentItems.some((it) => it.category === '__add_new__' || it.unit === '__add_new__')}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Tambah Item
                </Button>

                {/* Total keseluruhan — dengan rincian Cash vs BON. */}
                {(() => {
                  const validItems = equipmentItems.filter(
                    (it) => it.name.trim() && parseFloat(it.quantity) > 0 && parseFloat(it.unitPrice) > 0 && it.category !== '__add_new__' && it.unit !== '__add_new__'
                  )
                  if (validItems.length === 0) return null
                  const total = validItems.reduce((sum, it) => sum + parseFloat(it.quantity) * parseFloat(it.unitPrice), 0)
                  const cashTotal = validItems
                    .filter((it) => it.paymentMethod !== 'bon')
                    .reduce((s, it) => s + parseFloat(it.quantity) * parseFloat(it.unitPrice), 0)
                  const bonTotal = validItems
                    .filter((it) => it.paymentMethod === 'bon')
                    .reduce((s, it) => s + parseFloat(it.quantity) * parseFloat(it.unitPrice), 0)
                  return (
                    <div className="bg-indigo-50 rounded-lg p-3 text-center border border-indigo-200 space-y-1.5">
                      <p className="text-xs text-muted-foreground">Total Keseluruhan ({validItems.length} item)</p>
                      <p className="text-xl font-bold text-indigo-700">{formatCurrency(total)}</p>
                      <div className="flex items-center justify-center gap-3 text-[11px] pt-1 border-t border-indigo-200/60">
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <Banknote className="w-3 h-3" /> Cash: {formatCurrency(cashTotal)}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <ReceiptText className="w-3 h-3" /> BON: {formatCurrency(bonTotal)}
                        </span>
                      </div>
                    </div>
                  )
                })()}

                {/* Tombol Simpan Semua Item */}
                <Button
                  onClick={handleAddEquipment}
                  className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                  disabled={
                    submitting ||
                    (!selectedBatch && !dialogBatchId) ||
                    !equipmentForm.purchaseDate ||
                    equipmentItems.length === 0 ||
                    equipmentItems.every((it) => !it.name.trim() || !(parseFloat(it.quantity) > 0) || !(parseFloat(it.unitPrice) > 0)) ||
                    equipmentItems.some((it) => it.category === '__add_new__' || it.unit === '__add_new__')
                  }
                >
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Semua Item'}
                </Button>
              </>
            ) : (
              <>
                {/* ===== Single-item mode (default & edit) — behavior tidak berubah ===== */}
                <div className="space-y-2">
                  <Label>Nama Barang</Label>
                  <Input placeholder="mis. Broiler Pelet, Tempat Minum Otomatis" value={equipmentForm.name} onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select
                    value={showAddCategory ? '__add_new__' : equipmentForm.category}
                    onValueChange={(v) => {
                      if (v === '__add_new__') {
                        setShowAddCategory(true)
                      } else {
                        setShowAddCategory(false)
                        setEquipmentForm({ ...equipmentForm, category: v })
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                      <SelectItem value="__add_new__">➕ Tambah Kategori Baru…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {showAddCategory && (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 p-2">
                    <Input
                      placeholder="Kategori baru, mis. Obat & Vitamin, Listrik…"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() } }}
                      autoFocus
                    />
                    <Button type="button" size="sm" className="shrink-0 bg-indigo-600 hover:bg-indigo-700" onClick={handleAddCategory} disabled={savingCategory || !newCategoryName.trim()}>
                      {savingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => { setShowAddCategory(false); setNewCategoryName('') }}>
                      Batal
                    </Button>
                  </div>
                )}
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
                {/* Metode Pembayaran — Cash (tunai) atau BON (utang/belum dibayar). */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5" /> Metode Pembayaran
                  </Label>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Metode Pembayaran">
                    <Button
                      type="button"
                      variant={equipmentForm.paymentMethod === 'bon' ? 'outline' : 'default'}
                      onClick={() => setEquipmentForm((prev) => ({ ...prev, paymentMethod: 'cash' }))}
                      role="radio"
                      aria-checked={equipmentForm.paymentMethod !== 'bon'}
                      className={`h-auto py-2.5 flex-col gap-0.5 ${
                        equipmentForm.paymentMethod !== 'bon'
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-200/50'
                          : 'text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span className="text-xs font-semibold">Cash</span>
                      <span className="text-[10px] opacity-80 leading-none">Tunai · Lunas</span>
                    </Button>
                    <Button
                      type="button"
                      variant={equipmentForm.paymentMethod === 'bon' ? 'default' : 'outline'}
                      onClick={() => setEquipmentForm((prev) => ({ ...prev, paymentMethod: 'bon' }))}
                      role="radio"
                      aria-checked={equipmentForm.paymentMethod === 'bon'}
                      className={`h-auto py-2.5 flex-col gap-0.5 ${
                        equipmentForm.paymentMethod === 'bon'
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-amber-600 shadow-md shadow-amber-200/50'
                          : 'text-amber-700 border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      <ReceiptText className="w-4 h-4" />
                      <span className="text-xs font-semibold">BON</span>
                      <span className="text-[10px] opacity-80 leading-none">Utang · Belum dibayar</span>
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Beli</Label>
                  <Input type="date" value={equipmentForm.purchaseDate} onChange={(e) => setEquipmentForm({ ...equipmentForm, purchaseDate: e.target.value })} />
                </div>
                {equipmentForm.quantity && equipmentForm.unitPrice && (
                  <div className={`rounded-lg p-3 text-center ${equipmentForm.paymentMethod === 'bon' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                    <p className="text-xs text-muted-foreground">Total Harga · {equipmentForm.paymentMethod === 'bon' ? 'BON (utang)' : 'Cash (lunas)'}</p>
                    <p className={`text-lg font-bold ${equipmentForm.paymentMethod === 'bon' ? 'text-amber-700' : 'text-emerald-700'}`}>{formatCurrency(parseFloat(equipmentForm.quantity) * parseFloat(equipmentForm.unitPrice))}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {equipmentForm.quantity || 0} {equipmentForm.unit || 'satuan'} × {formatCurrency(parseFloat(equipmentForm.unitPrice) || 0)}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Catatan</Label>
                  <Textarea placeholder="Catatan opsional..." value={equipmentForm.notes} onChange={(e) => setEquipmentForm({ ...equipmentForm, notes: e.target.value })} />
                </div>
                {/* Foto nota pembelian peralatan — upload, preview, & hapus */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> Foto Nota (opsional)</Label>
                  {equipmentForm.notaData ? (
                    <div className="relative rounded-lg overflow-hidden border border-indigo-200 group">
                      <img src={equipmentForm.notaData} alt="Nota pembelian" className="w-full max-h-48 object-contain bg-slate-50" />
                      <button
                        type="button"
                        onClick={() => setEquipmentForm((prev) => ({ ...prev, notaData: '', notaName: '' }))}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                        aria-label="Hapus foto nota"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                      {equipmentForm.notaName && (
                        <p className="text-xs text-muted-foreground truncate px-2 py-1 bg-white border-t">{equipmentForm.notaName}</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {/* Ambil Foto langsung dari kamera.
                          `capture="environment"` membuka kamera belakang di mobile
                          (Android Chrome & iOS Safari). Di desktop, browser akan
                          fall back ke file picker biasa. */}
                      <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed border-indigo-300 rounded-lg p-3 cursor-pointer hover:bg-indigo-50/50 transition-colors ${notaUploading ? 'pointer-events-none opacity-60' : ''}`}>
                        {notaUploading ? (
                          <><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /><span className="text-[11px] text-muted-foreground">Memproses...</span></>
                        ) : (
                          <><Camera className="w-5 h-5 text-indigo-500" /><span className="text-[11px] font-medium text-indigo-700 text-center leading-tight">Ambil Foto<br /><span className="text-[9px] text-muted-foreground font-normal">dari kamera</span></span></>
                        )}
                        <input type="file" accept="image/*" capture="environment" onChange={handleEquipmentNotaUpload} className="hidden" />
                      </label>
                      {/* Pilih dari galeri / file explorer. */}
                      <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed border-indigo-300 rounded-lg p-3 cursor-pointer hover:bg-indigo-50/50 transition-colors ${notaUploading ? 'pointer-events-none opacity-60' : ''}`}>
                        {notaUploading ? (
                          <><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /><span className="text-[11px] text-muted-foreground">Memproses...</span></>
                        ) : (
                          <><ImageIcon className="w-5 h-5 text-indigo-500" /><span className="text-[11px] font-medium text-indigo-700 text-center leading-tight">Pilih Galeri<br /><span className="text-[9px] text-muted-foreground font-normal">JPG/PNG • dikompres</span></span></>
                        )}
                        <input type="file" accept="image/*" onChange={handleEquipmentNotaUpload} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
                <Button onClick={handleAddEquipment} className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700" disabled={submitting || (!selectedBatch && !dialogBatchId) || !equipmentForm.name || !equipmentForm.quantity || !equipmentForm.unitPrice || !equipmentForm.purchaseDate}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : (editingEquipment ? 'Simpan Perubahan' : 'Simpan Biaya')}
                </Button>
              </>
            )}
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
          <div className="space-y-3 pt-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
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
                      : `Panen • ${event.harvestRecord ? `${event.harvestRecord.quantity.toLocaleString('id-ID')} ekor` : `${event.batch.harvestQuantity?.toLocaleString('id-ID') || 0} ekor`}`}
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

      {/* PDF Preview Dialog — renders the generated PDF in an iframe so the
          user can review the report before downloading. */}
      <Dialog open={!!pdfPreview} onOpenChange={(open) => { if (!open) closePdfPreview() }}>
        <DialogContent className="sm:max-w-4xl h-[90dvh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-emerald-100 flex-row items-center justify-between space-y-0">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="truncate">Preview Laporan — {pdfPreview?.batch.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Termin #{pdfPreview?.batch.terminNumber} • Tinjau laporan sebelum mengunduh
              </DialogDescription>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  if (pdfPreview) window.open(pdfPreview.url, '_blank')
                }}
              >
                <Printer className="w-4 h-4" /> Buka Tab
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700"
                onClick={() => {
                  if (pdfPreview) {
                    downloadBatchPDF(pdfPreview.batch)
                    closePdfPreview()
                  }
                }}
              >
                <Download className="w-4 h-4" /> Download PDF
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted/30">
            {pdfPreview?.url && (
              <iframe
                src={pdfPreview.url}
                title="Preview PDF"
                className="w-full h-full border-0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Nota Viewer Dialog — menampilkan foto nota pembelian ukuran penuh
          dengan tombol download. Dipakai bersama oleh list pakan & peralatan. */}
      <Dialog open={!!notaViewer} onOpenChange={(open) => !open && setNotaViewer(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-600" />
              {notaViewer?.title || 'Foto Nota'}
            </DialogTitle>
            <DialogDescription>
              {notaViewer?.fileName || 'Foto nota pembelian'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            {notaViewer && (
              <div className="rounded-xl overflow-hidden border bg-slate-50 max-h-[60dvh] flex items-center justify-center">
                <img
                  src={notaViewer.src}
                  alt={notaViewer.title}
                  className="w-full max-h-[60dvh] object-contain"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleDownloadNota}
              >
                <Download className="w-4 h-4" /> Download Foto
              </Button>
              <Button
                variant="ghost"
                className="gap-2"
                onClick={() => setNotaViewer(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
