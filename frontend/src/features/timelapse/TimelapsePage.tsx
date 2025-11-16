import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Spinner,
  TextInput,
} from 'flowbite-react'
import { getTimelapse, type TimelapseFrame } from './api'

type FilterFormState = {
  limit: string
  from: string
  to: string
}

const defaultFormState: FilterFormState = {
  limit: '50',
  from: '',
  to: '',
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
  const [query, setQuery] = useState<{ limit: number; from?: string; to?: string }>({
    limit: 50,
  })
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
      limit: Number(form.limit) || 50,
      from: form.from.trim() || undefined,
      to: form.to.trim() || undefined,
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
      if (items.length === 0) {
        return prev
      }
      return (prev - 1 + items.length) % items.length
    })
  }

  const handleNext = () => {
    setActiveIndex((prev) => {
      if (items.length === 0) {
        return prev
      }
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
        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Alert color="failure" className="mb-4">
            <span className="font-semibold">Unable to load timelapse.</span> {error}
          </Alert>
          <Button onClick={fetchFrames}>Retry</Button>
        </Card>
      )
    }

    if (items.length === 0) {
      return (
        <Alert color="info" className="rounded-3xl border border-slate-200 bg-white text-slate-700">
          No timelapse frames yet. Once your cameras upload, they’ll appear here automatically.
        </Alert>
      )
    }

    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((frame, index) => (
          <button
            key={frame.id}
            type="button"
            onClick={() => handleOpenModal(index)}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <img
              src={frame.url}
              alt={parsedTimestamp(frame)}
              className="h-32 w-full object-cover"
              loading="lazy"
            />
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
              <Button color="light" onClick={handlePrev}>
                Prev
              </Button>
              {playing ? (
                <Button color="warning" onClick={() => setPlaying(false)}>
                  Pause
                </Button>
              ) : (
                <Button onClick={() => setPlaying(true)} disabled={items.length <= 1}>
                  Play
                </Button>
              )}
              <Button color="light" onClick={handleNext}>
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
            <Button color="light" onClick={handleCloseModal}>
              Close
            </Button>
          </ModalFooter>
      </Modal>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Timelapse gallery</h1>
          <p className="text-sm text-slate-500">
            Review recent frames captured by your greenhouse cameras.
          </p>
        </div>
        <p className="text-sm text-slate-500">
          Showing {items.length} of {total} frames
        </p>
      </div>

      <Card className="rounded-3xl border border-slate-200 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="limit">Limit</Label>
            <Select
              id="limit"
              value={form.limit}
              onChange={(event) => setForm((prev) => ({ ...prev, limit: event.target.value }))}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="from">From (ISO)</Label>
            <TextInput
              id="from"
              value={form.from}
              onChange={(event) => setForm((prev) => ({ ...prev, from: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="to">To (ISO)</Label>
            <TextInput
              id="to"
              value={form.to}
              onChange={(event) => setForm((prev) => ({ ...prev, to: event.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleRefresh} className="w-full">
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
