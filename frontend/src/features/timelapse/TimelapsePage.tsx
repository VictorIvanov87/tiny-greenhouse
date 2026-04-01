import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Datepicker,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Spinner,
} from 'flowbite-react'
import { getTimelapse, type TimelapseFrame } from './api'

type FilterFormState = {
  from: string
  to: string
}

const defaultFormState: FilterFormState = {
  from: '',
  to: '',
}

const dateToLocal = (date: Date, endOfDay = false): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}T${endOfDay ? '23:59' : '00:00'}`
}

const parseDate = (value: string): Date | undefined => {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

const toISOIfPresent = (value: string): string | undefined => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? trimmed : date.toISOString()
}

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const speedOptions = [
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
]

const TimelapsePage = () => {
  const [form, setForm] = useState<FilterFormState>(defaultFormState)
  const [query, setQuery] = useState<{ from?: string; to?: string }>({})
  const [items, setItems] = useState<TimelapseFrame[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const fetchFrames = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getTimelapse(query)
      setItems(response.items)
      setTotal(response.total)
      if (response.items.length === 0) {
        setModalOpen(false)
        setPlaying(false)
      } else {
        setActiveIndex(0)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load timelapse frames'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    fetchFrames()
  }, [fetchFrames])

  useEffect(() => {
    if (!modalOpen || !playing || items.length === 0) {
      return
    }

    const intervalMs = Math.max(200, 1000 / speed)
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length)
    }, intervalMs)

    return () => {
      window.clearInterval(id)
    }
  }, [items.length, modalOpen, playing, speed])

  const parsedTimestamp = (frame: TimelapseFrame) => timestampFormatter.format(new Date(frame.timestamp))

  const handleRefresh = () => {
    setQuery({
      from: toISOIfPresent(form.from),
      to: toISOIfPresent(form.to),
    })
  }

  const handleOpenModal = (index: number) => {
    setActiveIndex(index)
    setModalOpen(true)
    setPlaying(false)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setPlaying(false)
  }

  const handlePrev = () => {
    setActiveIndex((prev) => {
      if (items.length === 0) return prev
      return (prev - 1 + items.length) % items.length
    })
  }

  const handleNext = () => {
    setActiveIndex((prev) => {
      if (items.length === 0) return prev
      return (prev + 1) % items.length
    })
  }

  const renderGallery = () => {
    if (loading) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size="xl" />
        </div>
      )
    }

    if (error) {
      return (
        <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] p-6 shadow-sm">
          <Alert color="failure" className="mb-4">
            <span className="font-semibold">Unable to load timelapse.</span> {error}
          </Alert>
          <Button color="gray" outline={true} onClick={fetchFrames}>
            Retry
          </Button>
        </Card>
      )
    }

    if (items.length === 0) {
      return (
        <Alert color="info" className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-300">
          No timelapse frames yet. Once your cameras upload, they'll appear here automatically.
        </Alert>
      )
    }

    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {items.map((frame, index) => (
          <button
            key={frame.id}
            type="button"
            onClick={() => handleOpenModal(index)}
            className="group relative overflow-hidden rounded-2xl border border-[#1f2a3d] bg-[#0b1220] transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <img
              src={frame.url}
              alt={parsedTimestamp(frame)}
              className="aspect-video w-full object-cover"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                const placeholder = target.nextElementSibling as HTMLElement | null
                if (placeholder) placeholder.style.display = 'flex'
              }}
            />
            <div className="hidden aspect-video w-full items-center justify-center bg-[#0b1220] text-xs text-slate-500">
              Image unavailable
            </div>
            <div className="absolute inset-0 bg-black/10 opacity-0 transition group-hover:opacity-100" />
            <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white">
              {new Date(frame.timestamp).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    )
  }

  const modalContent = () => {
    if (!modalOpen || items.length === 0) {
      return null
    }

    const frame = items[activeIndex]

    return (
      <Modal show={modalOpen} onClose={handleCloseModal} size="5xl">
        <ModalHeader>Timelapse player</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="relative flex w-full items-center justify-center">
              <img
                src={frame.url}
                alt={parsedTimestamp(frame)}
                className="max-h-[70vh] w-auto rounded-xl object-contain"
              />
              <div className="absolute bottom-4 right-6 rounded-md bg-black/70 px-3 py-1 text-sm text-white shadow-lg">
                {parsedTimestamp(frame)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button color="gray" outline={true} onClick={handlePrev}>
                Prev
              </Button>
              {playing ? (
                <Button color="gray" outline={true} onClick={() => setPlaying(false)}>
                  Pause
                </Button>
              ) : (
                <Button color="gray" outline={true} onClick={() => setPlaying(true)} disabled={items.length <= 1}>
                  Play
                </Button>
              )}
              <Button color="gray" outline={true} onClick={handleNext}>
                Next
              </Button>
              <div className="flex items-center gap-2">
                <Label htmlFor="timelapse-speed" className="text-sm">
                  Speed
                </Label>
                <Select
                  id="timelapse-speed"
                  value={String(speed)}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                  className="w-24"
                >
                  {speedOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <span className="ml-auto text-sm text-slate-500">
                Frame {activeIndex + 1} of {items.length}
              </span>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="gray" outline={true} onClick={handleCloseModal}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">Timelapse gallery</h1>
          <p className="text-sm text-slate-400">
            Review recent frames captured by your greenhouse cameras.
          </p>
        </div>
        <p className="text-sm tabular-nums text-slate-400">
          {items.length} of {total} frames
        </p>
      </div>

      <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="w-full sm:min-w-0 sm:flex-1">
            <Label htmlFor="from" className="mb-1 text-xs text-slate-400">
              From
            </Label>
            <Datepicker
              id="from"
              value={parseDate(form.from)}
              onChange={(date) =>
                setForm((prev) => ({ ...prev, from: date ? dateToLocal(date) : '' }))
              }
            />
          </div>
          <div className="w-full sm:min-w-0 sm:flex-1">
            <Label htmlFor="to" className="mb-1 text-xs text-slate-400">
              To
            </Label>
            <Datepicker
              id="to"
              value={parseDate(form.to)}
              onChange={(date) =>
                setForm((prev) => ({ ...prev, to: date ? dateToLocal(date, true) : '' }))
              }
            />
          </div>
          <div>
            <Button color="gray" outline={true} onClick={handleRefresh} className="w-full sm:w-auto">
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {renderGallery()}
      {modalContent()}
    </div>
  )
}

export default TimelapsePage
