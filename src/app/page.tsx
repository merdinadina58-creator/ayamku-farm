'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bird,
  Wheat,
  Scale,
  Calculator,
  Plus,
  Trash2,
  TrendingUp,
  Package,
  DollarSign,
  Calendar,
  ChevronRight,
  BarChart3,
  ArrowLeft,
  CheckCircle2,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
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
  notes: string | null
  createdAt: string
  updatedAt: string
  feedRecords: FeedRecord[]
  weightRecords: WeightRecord[]
}

interface DashboardData {
  totalBatches: number
  activeBatches: number
  harvestedBatches: number
  totalChickens: number
  totalFeedKg: number
  totalFeedCost: number
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
  }>
}

// Color palette
const COLORS = ['#16a34a', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899']
const FEED_TYPE_COLORS: Record<string, string> = {
  'Starter': '#16a34a',
  'Grower': '#f59e0b',
  'Finisher': '#ef4444',
  'Pre-Starter': '#06b6d4',
  'Lainnya': '#8b5cf6',
}

export default function HomePage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [view, setView] = useState<'dashboard' | 'batch-detail'>('dashboard')
  const { toast } = useToast()

  // Dialog states
  const [addBatchOpen, setAddBatchOpen] = useState(false)
  const [addFeedOpen, setAddFeedOpen] = useState(false)
  const [addWeightOpen, setAddWeightOpen] = useState(false)
  const [harvestOpen, setHarvestOpen] = useState(false)

  // Form states
  const [batchForm, setBatchForm] = useState({
    name: '', terminNumber: '1', arrivalDate: '', initialWeight: '', quantity: '', notes: '',
  })
  const [feedForm, setFeedForm] = useState({
    date: '', feedType: 'Starter', quantityKg: '', pricePerKg: '', notes: '',
  })
  const [weightForm, setWeightForm] = useState({
    date: '', averageWeightGram: '', ageDays: '', sampleCount: '1', notes: '',
  })
  const [harvestForm, setHarvestForm] = useState({
    harvestDate: '', harvestWeight: '',
  })

  const fetchData = useCallback(async () => {
    try {
      const [batchRes, dashRes] = await Promise.all([
        fetch('/api/batches'),
        fetch('/api/dashboard'),
      ])
      const batchData = await batchRes.json()
      const dashData = await dashRes.json()
      setBatches(batchData)
      setDashboard(dashData)
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
    }
  }

  const handleAddFeed = async () => {
    if (!selectedBatch) return
    try {
      const res = await fetch(`/api/batches/${selectedBatch.id}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedForm),
      })
      if (!res.ok) throw new Error()
      setAddFeedOpen(false)
      setFeedForm({ date: '', feedType: 'Starter', quantityKg: '', pricePerKg: '', notes: '' })
      toast({ title: 'Berhasil! 🌾', description: 'Pakan berhasil ditambahkan' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menambahkan pakan', variant: 'destructive' })
    }
  }

  const handleAddWeight = async () => {
    if (!selectedBatch) return
    try {
      const res = await fetch(`/api/batches/${selectedBatch.id}/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weightForm),
      })
      if (!res.ok) throw new Error()
      setAddWeightOpen(false)
      setWeightForm({ date: '', averageWeightGram: '', ageDays: '', sampleCount: '1', notes: '' })
      toast({ title: 'Berhasil! ⚖️', description: 'Data berat berhasil ditambahkan' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menambahkan data berat', variant: 'destructive' })
    }
  }

  const handleHarvest = async () => {
    if (!selectedBatch) return
    try {
      const res = await fetch(`/api/batches/${selectedBatch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'harvested',
          harvestDate: harvestForm.harvestDate,
          harvestWeight: harvestForm.harvestWeight,
        }),
      })
      if (!res.ok) throw new Error()
      setHarvestOpen(false)
      setHarvestForm({ harvestDate: '', harvestWeight: '' })
      toast({ title: 'Berhasil! 🎉', description: 'Ayam berhasil dipanen' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal memperbarui status panen', variant: 'destructive' })
    }
  }

  const handleDeleteFeed = async (id: string) => {
    try {
      await fetch(`/api/feed/${id}`, { method: 'DELETE' })
      toast({ title: 'Dihapus', description: 'Data pakan berhasil dihapus' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus data pakan', variant: 'destructive' })
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

  const handleDeleteBatch = async (id: string) => {
    if (!confirm('Yakin ingin menghapus termin ini? Semua data pakan dan berat juga akan dihapus.')) return
    try {
      await fetch(`/api/batches/${id}`, { method: 'DELETE' })
      toast({ title: 'Dihapus', description: 'Termin berhasil dihapus' })
      setView('dashboard')
      setSelectedBatch(null)
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus termin', variant: 'destructive' })
    }
  }

  const openBatchDetail = (batch: Batch) => {
    setSelectedBatch(batch)
    setView('batch-detail')
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
    const latestWeight = batch.weightRecords.length > 0
      ? batch.weightRecords.reduce((latest, r) => new Date(r.date) > new Date(latest.date) ? r : latest, batch.weightRecords[0]).averageWeightGram
      : batch.initialWeight * 1000
    const weightGain = latestWeight - batch.initialWeight * 1000
    const fcr = weightGain > 0 && batch.quantity > 0 ? (totalFeed * 1000) / (batch.quantity * weightGain) : 0
    const now = new Date()
    const arrival = new Date(batch.arrivalDate)
    const ageDays = Math.floor((now.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24))
    const feedPerEkor = batch.quantity > 0 ? totalFeed / batch.quantity : 0

    return { totalFeed, totalCost, latestWeight, weightGain, fcr, ageDays, feedPerEkor }
  }

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-amber-50/20 to-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-200">
              <Bird className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-700 to-amber-600 bg-clip-text text-transparent">
                AyamKu Farm
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Sistem Manajemen Peternakan Ayam</p>
            </div>
          </div>
          <Dialog open={addBatchOpen} onOpenChange={setAddBatchOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-200/50 gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Tambah Termin</span>
                <span className="sm:hidden">Tambah</span>
              </Button>
            </DialogTrigger>
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
                <Button onClick={handleAddBatch} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800" disabled={!batchForm.name || !batchForm.arrivalDate || !batchForm.initialWeight || !batchForm.quantity}>
                  Simpan Termin
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
              {/* Hero Banner */}
              <div className="relative rounded-2xl overflow-hidden mb-6 shadow-xl">
                <img src="/chicken-farm-hero.png" alt="Peternakan Ayam" className="w-full h-40 sm:h-56 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 via-emerald-900/50 to-transparent flex items-center">
                  <div className="px-6 sm:px-10">
                    <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Selamat Datang di AyamKu Farm</h2>
                    <p className="text-emerald-100 text-xs sm:text-base max-w-md">Kelola bibit, pakan, dan berat ayam Anda dengan mudah dan efisien dalam satu tempat.</p>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {[
                  { icon: Package, label: 'Total Termin', value: dashboard?.totalBatches || 0, color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-200/50' },
                  { icon: Bird, label: 'Ayam Aktif', value: dashboard?.totalChickens || 0, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-200/50' },
                  { icon: Wheat, label: 'Total Pakan', value: `${dashboard?.totalFeedKg || 0} kg`, color: 'from-teal-500 to-cyan-600', shadow: 'shadow-teal-200/50' },
                  { icon: DollarSign, label: 'Biaya Pakan', value: formatCurrency(dashboard?.totalFeedCost || 0), color: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-200/50' },
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
                          <div>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium">{stat.label}</p>
                            <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{stat.value}</p>
                          </div>
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadow}`}>
                            <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="termin" className="space-y-4">
                <TabsList className="bg-white shadow-sm border p-1">
                  <TabsTrigger value="termin" className="gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                    <Package className="w-4 h-4" /> Termin
                  </TabsTrigger>
                  <TabsTrigger value="pakan" className="gap-2 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
                    <Wheat className="w-4 h-4" /> Pakan
                  </TabsTrigger>
                  <TabsTrigger value="berat" className="gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">
                    <Scale className="w-4 h-4" /> Berat
                  </TabsTrigger>
                  <TabsTrigger value="hitung" className="gap-2 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-700">
                    <Calculator className="w-4 h-4" /> Hitung
                  </TabsTrigger>
                </TabsList>

                {/* Termin Tab */}
                <TabsContent value="termin">
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
                                  <div>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                      {batch.name}
                                      <Badge variant={batch.status === 'active' ? 'default' : 'secondary'} className={batch.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
                                        {batch.status === 'active' ? 'Aktif' : 'Panen'}
                                      </Badge>
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                      Termin #{batch.terminNumber} • {formatDate(batch.arrivalDate)}
                                    </CardDescription>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-emerald-50/50 rounded-lg p-2.5">
                                    <p className="text-xs text-muted-foreground">Jumlah</p>
                                    <p className="text-sm font-bold text-emerald-700">{batch.quantity.toLocaleString('id-ID')} ekor</p>
                                  </div>
                                  <div className="bg-amber-50/50 rounded-lg p-2.5">
                                    <p className="text-xs text-muted-foreground">Umur</p>
                                    <p className="text-sm font-bold text-amber-700">{stats.ageDays} hari</p>
                                  </div>
                                  <div className="bg-teal-50/50 rounded-lg p-2.5">
                                    <p className="text-xs text-muted-foreground">Total Pakan</p>
                                    <p className="text-sm font-bold text-teal-700">{stats.totalFeed.toFixed(1)} kg</p>
                                  </div>
                                  <div className="bg-rose-50/50 rounded-lg p-2.5">
                                    <p className="text-xs text-muted-foreground">FCR</p>
                                    <p className="text-sm font-bold text-rose-700">{stats.fcr.toFixed(2)}</p>
                                  </div>
                                </div>
                                {/* Weight progress bar */}
                                <div className="mt-3">
                                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>Berat: {(stats.latestWeight / 1000).toFixed(2)} kg</span>
                                    <span>Target: ~1.8 kg</span>
                                  </div>
                                  <Progress value={Math.min((stats.latestWeight / 1800) * 100, 100)} className="h-2" />
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Pakan Tab - All feed across batches */}
                <TabsContent value="pakan">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wheat className="w-5 h-5 text-amber-600" />
                        Rekap Pakan Seluruh Termin
                      </CardTitle>
                      <CardDescription>Ringkasan pakan per termin dan per jenis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {batches.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Wheat className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>Belum ada data pakan</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {batches.map((batch) => {
                            const feedByType = batch.feedRecords.reduce((acc, f) => {
                              if (!acc[f.feedType]) acc[f.feedType] = { total: 0, cost: 0, count: 0 }
                              acc[f.feedType].total += f.quantityKg
                              acc[f.feedType].cost += f.quantityKg * f.pricePerKg
                              acc[f.feedType].count += 1
                              return acc
                            }, {} as Record<string, { total: number; cost: number; count: number }>)

                            const totalFeed = batch.feedRecords.reduce((s, f) => s + f.quantityKg, 0)

                            return (
                              <div key={batch.id} className="border rounded-xl p-4 bg-gradient-to-r from-white to-amber-50/20">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold">{batch.name}</h3>
                                    <Badge variant="outline" className="text-xs">Termin #{batch.terminNumber}</Badge>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-amber-700">{totalFeed.toFixed(1)} kg</p>
                                    <p className="text-xs text-muted-foreground">Total Pakan</p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {Object.entries(feedByType).map(([type, data]) => (
                                    <div key={type} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/60">
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: FEED_TYPE_COLORS[type] || '#8b5cf6' }} />
                                        <span className="text-sm font-medium">{type}</span>
                                        <span className="text-xs text-muted-foreground">({data.count}x)</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-sm font-bold">{data.total.toFixed(1)} kg</span>
                                        <span className="text-xs text-muted-foreground ml-2">{formatCurrency(data.cost)}</span>
                                      </div>
                                    </div>
                                  ))}
                                  {batch.feedRecords.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-2">Belum ada data pakan</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Berat Tab - Weight tracking across batches */}
                <TabsContent value="berat">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-teal-600" />
                        Tracking Berat Ayam
                      </CardTitle>
                      <CardDescription>Grafik pertumbuhan berat ayam per termin</CardDescription>
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
                              beratKg: (w.averageWeightGram / 1000).toFixed(2),
                            }))

                            return (
                              <div key={batch.id} className="border rounded-xl p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h3 className="font-bold">{batch.name} <Badge variant="outline" className="text-xs ml-1">Termin #{batch.terminNumber}</Badge></h3>
                                  <div className="text-right">
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
                </TabsContent>

                {/* Hitung Tab - Feed calculations per termin */}
                <TabsContent value="hitung">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-rose-600" />
                        Perhitungan Pakan Per Termin
                      </CardTitle>
                      <CardDescription>Kalkulasi total pakan, biaya, FCR, dan feed conversion per termin</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {batches.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>Belum ada data untuk dihitung</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Summary Chart */}
                          {dashboard && dashboard.batchSummaries.length > 0 && (
                            <div className="border rounded-xl p-4 bg-gradient-to-br from-white to-rose-50/20">
                              <h3 className="font-bold mb-4 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-rose-600" />
                                Perbandingan Pakan Per Termin
                              </h3>
                              <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={dashboard.batchSummaries.map((b) => ({
                                    name: b.name,
                                    'Total Pakan (kg)': b.totalFeedKg,
                                    'Biaya (Rp ribu)': Math.round(b.totalFeedCost / 1000),
                                    'Pakan/Ekor (kg)': b.feedPerEkor,
                                  }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Total Pakan (kg)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Biaya (Rp ribu)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Pakan/Ekor (kg)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
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
                                <div className="bg-gradient-to-r from-rose-50 to-amber-50 p-4 flex items-center justify-between">
                                  <div>
                                    <h3 className="font-bold text-lg">{batch.name}</h3>
                                    <p className="text-sm text-muted-foreground">Termin #{batch.terminNumber} • {batch.quantity.toLocaleString('id-ID')} ekor • {stats.ageDays} hari</p>
                                  </div>
                                  <Badge variant={batch.status === 'active' ? 'default' : 'secondary'} className={batch.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                                    {batch.status === 'active' ? 'Aktif' : 'Panen'}
                                  </Badge>
                                </div>
                                <div className="p-4">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Total Pakan</p>
                                      <p className="text-lg font-bold text-emerald-700">{stats.totalFeed.toFixed(1)} kg</p>
                                    </div>
                                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Total Biaya</p>
                                      <p className="text-lg font-bold text-amber-700">{formatCurrency(stats.totalCost)}</p>
                                    </div>
                                    <div className="bg-teal-50 rounded-xl p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Pakan/Ekor</p>
                                      <p className="text-lg font-bold text-teal-700">{stats.feedPerEkor.toFixed(2)} kg</p>
                                    </div>
                                    <div className="bg-rose-50 rounded-xl p-3 text-center">
                                      <p className="text-xs text-muted-foreground">FCR</p>
                                      <p className="text-lg font-bold text-rose-700">{stats.fcr.toFixed(2)}</p>
                                    </div>
                                  </div>

                                  {/* Pie chart for feed distribution */}
                                  {pieData.length > 0 && (
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                      <div className="w-48 h-48">
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
                                      <div className="flex-1 space-y-2">
                                        {Object.entries(feedByType).map(([type, data]) => (
                                          <div key={type} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-2">
                                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: FEED_TYPE_COLORS[type] || '#8b5cf6' }} />
                                              <span className="text-sm font-medium">{type}</span>
                                            </div>
                                            <div className="text-right">
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
                </TabsContent>
              </Tabs>
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
                  <Button variant="ghost" onClick={() => { setView('dashboard'); setSelectedBatch(null) }} className="w-fit gap-2">
                    <ArrowLeft className="w-4 h-4" /> Kembali
                  </Button>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl sm:text-2xl font-bold">{selectedBatch.name}</h2>
                      <Badge variant={selectedBatch.status === 'active' ? 'default' : 'secondary'} className={selectedBatch.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                        {selectedBatch.status === 'active' ? 'Aktif' : 'Panen'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Termin #{selectedBatch.terminNumber} • {selectedBatch.quantity.toLocaleString('id-ID')} ekor • Tiba {formatDate(selectedBatch.arrivalDate)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selectedBatch.status === 'active' && (
                      <Button variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setHarvestOpen(true)}>
                        <CheckCircle2 className="w-4 h-4" /> Panen
                      </Button>
                    )}
                    <Button variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBatch(selectedBatch.id)}>
                      <Trash2 className="w-4 h-4" /> Hapus
                    </Button>
                  </div>
                </div>

                {/* Batch Stats */}
                {(() => {
                  const stats = getBatchStats(selectedBatch)
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { icon: Bird, label: 'Jumlah', value: `${selectedBatch.quantity.toLocaleString('id-ID')} ekor`, bg: 'bg-emerald-50', text: 'text-emerald-700' },
                        { icon: Calendar, label: 'Umur', value: `${stats.ageDays} hari`, bg: 'bg-amber-50', text: 'text-amber-700' },
                        { icon: Scale, label: 'Berat', value: `${(stats.latestWeight / 1000).toFixed(2)} kg`, bg: 'bg-teal-50', text: 'text-teal-700' },
                        { icon: Wheat, label: 'Total Pakan', value: `${stats.totalFeed.toFixed(1)} kg`, bg: 'bg-cyan-50', text: 'text-cyan-700' },
                        { icon: DollarSign, label: 'Biaya Pakan', value: formatCurrency(stats.totalCost), bg: 'bg-rose-50', text: 'text-rose-700' },
                        { icon: TrendingUp, label: 'FCR', value: stats.fcr.toFixed(2), bg: 'bg-violet-50', text: 'text-violet-700' },
                      ].map((stat) => (
                        <Card key={stat.label} className="border-0 shadow-md">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <stat.icon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{stat.label}</span>
                            </div>
                            <p className={`text-sm sm:text-base font-bold ${stat.text}`}>{stat.value}</p>
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

                {/* Detail Tabs: Feed & Weight */}
                <Tabs defaultValue="pakan" className="space-y-4">
                  <TabsList className="bg-white shadow-sm border p-1">
                    <TabsTrigger value="pakan" className="gap-2 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
                      <Wheat className="w-4 h-4" /> Pakan
                    </TabsTrigger>
                    <TabsTrigger value="berat" className="gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">
                      <Scale className="w-4 h-4" /> Berat
                    </TabsTrigger>
                  </TabsList>

                  {/* Feed Records */}
                  <TabsContent value="pakan">
                    <Card className="border-0 shadow-lg">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Wheat className="w-4 h-4 text-amber-600" />
                            Riwayat Pakan
                          </CardTitle>
                          <CardDescription>Catatan pemberian pakan</CardDescription>
                        </div>
                        {selectedBatch.status === 'active' && (
                          <Button size="sm" className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700" onClick={() => setAddFeedOpen(true)}>
                            <Plus className="w-4 h-4" /> Tambah
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent>
                        {selectedBatch.feedRecords.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Wheat className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Belum ada catatan pakan</p>
                            <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setAddFeedOpen(true)}>
                              <Plus className="w-3 h-3" /> Tambah Pakan Pertama
                            </Button>
                          </div>
                        ) : (
                          <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                            {selectedBatch.feedRecords.map((feed) => (
                              <div key={feed.id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-50/50 to-transparent hover:from-amber-50 transition-colors group">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-8 rounded-full" style={{ backgroundColor: FEED_TYPE_COLORS[feed.feedType] || '#8b5cf6' }} />
                                  <div>
                                    <p className="font-medium text-sm">{feed.feedType}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(feed.date)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="font-bold text-sm">{feed.quantityKg} kg</p>
                                    <p className="text-xs text-muted-foreground">{formatCurrency(feed.quantityKg * feed.pricePerKg)}</p>
                                  </div>
                                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteFeed(feed.id) }}>
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
                          <Button size="sm" className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700" onClick={() => setAddWeightOpen(true)}>
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
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                                    <span className="text-xs font-bold text-teal-700">H{weight.ageDays}</span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{weight.averageWeightGram.toFixed(0)} gram ({(weight.averageWeightGram / 1000).toFixed(3)} kg)</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(weight.date)} • {weight.sampleCount} sampel</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Gain</p>
                                    <p className="text-sm font-bold text-emerald-600">
                                      +{(weight.averageWeightGram - selectedBatch.initialWeight * 1000).toFixed(0)}g
                                    </p>
                                  </div>
                                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteWeight(weight.id) }}>
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
                </Tabs>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Feed Dialog */}
      <Dialog open={addFeedOpen} onOpenChange={setAddFeedOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wheat className="w-5 h-5 text-amber-600" />
              Tambah Catatan Pakan
            </DialogTitle>
            <DialogDescription>Catatan pemberian pakan untuk {selectedBatch?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={feedForm.date} onChange={(e) => setFeedForm({ ...feedForm, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Jenis Pakan</Label>
                <Select value={feedForm.feedType} onValueChange={(v) => setFeedForm({ ...feedForm, feedType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pre-Starter">Pre-Starter</SelectItem>
                    <SelectItem value="Starter">Starter</SelectItem>
                    <SelectItem value="Grower">Grower</SelectItem>
                    <SelectItem value="Finisher">Finisher</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jumlah (kg)</Label>
                <Input type="number" step="0.1" min="0" placeholder="50" value={feedForm.quantityKg} onChange={(e) => setFeedForm({ ...feedForm, quantityKg: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Harga/kg (Rp)</Label>
                <Input type="number" step="100" min="0" placeholder="7500" value={feedForm.pricePerKg} onChange={(e) => setFeedForm({ ...feedForm, pricePerKg: e.target.value })} />
              </div>
            </div>
            {feedForm.quantityKg && feedForm.pricePerKg && (
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Biaya</p>
                <p className="text-lg font-bold text-amber-700">{formatCurrency(parseFloat(feedForm.quantityKg) * parseFloat(feedForm.pricePerKg))}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea placeholder="Catatan opsional..." value={feedForm.notes} onChange={(e) => setFeedForm({ ...feedForm, notes: e.target.value })} />
            </div>
            <Button onClick={handleAddFeed} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700" disabled={!feedForm.date || !feedForm.quantityKg || !feedForm.pricePerKg}>
              Simpan Pakan
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
            <DialogDescription>Catatan berat ayam untuk {selectedBatch?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" value={weightForm.date} onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Umur (hari)</Label>
                <Input type="number" min="0" placeholder="7" value={weightForm.ageDays} onChange={(e) => setWeightForm({ ...weightForm, ageDays: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Jumlah Sampel</Label>
                <Input type="number" min="1" value={weightForm.sampleCount} onChange={(e) => setWeightForm({ ...weightForm, sampleCount: e.target.value })} />
              </div>
            </div>
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
            <Button onClick={handleAddWeight} className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700" disabled={!weightForm.date || !weightForm.averageWeightGram || !weightForm.ageDays}>
              Simpan Data Timbang
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Harvest Dialog */}
      <Dialog open={harvestOpen} onOpenChange={setHarvestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-600" />
              Panen Ayam
            </DialogTitle>
            <DialogDescription>Tandai termin {selectedBatch?.name} sebagai sudah panen</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Tanggal Panen</Label>
              <Input type="date" value={harvestForm.harvestDate} onChange={(e) => setHarvestForm({ ...harvestForm, harvestDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Berat Panen Rata-rata (kg/ekor)</Label>
              <Input type="number" step="0.01" min="0" placeholder="1.8" value={harvestForm.harvestWeight} onChange={(e) => setHarvestForm({ ...harvestForm, harvestWeight: e.target.value })} />
            </div>
            <Button onClick={handleHarvest} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700" disabled={!harvestForm.harvestDate || !harvestForm.harvestWeight}>
              Konfirmasi Panen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white/80 backdrop-blur-sm py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent">AyamKu Farm</span>
            {' '}• Sistem Manajemen Peternakan Ayam
          </p>
        </div>
      </footer>

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
