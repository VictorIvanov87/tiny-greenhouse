import { useCallback, useEffect, useState } from 'react'
import {
  Alert as FlowbiteAlert,
  Badge,
  Button,
  Card,
  Label,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from 'flowbite-react'
import { ackAlert, getActiveAlerts, getAlertHistory, type Alert } from './api'

const severityColor: Record<Alert['severity'], string> = {
  info: 'info',
  warn: 'warning',
  critical: 'failure',
}

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const AlertsTable = ({
  items,
  isHistory = false,
  onAck,
}: {
  items: Alert[]
  isHistory?: boolean
  onAck?: (id: string) => void
}) => {
  if (!items.length) {
    return <p className="text-sm text-slate-500">No alerts to show.</p>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeadCell>Type</TableHeadCell>
            <TableHeadCell>Severity</TableHeadCell>
            <TableHeadCell>Message</TableHeadCell>
            <TableHeadCell>Started</TableHeadCell>
            <TableHeadCell>Resolved</TableHeadCell>
            {!isHistory && <TableHeadCell>Acknowledge</TableHeadCell>}
          </TableRow>
        </TableHead>
        <TableBody className="divide-y">
          {items.map((alert) => (
            <TableRow key={alert.id}>
              <TableCell className="font-medium text-slate-900">
                {alert.type.replace(/_/g, ' ').toLowerCase()}
              </TableCell>
              <TableCell>
                <Badge color={severityColor[alert.severity]}>{alert.severity}</Badge>
              </TableCell>
              <TableCell>{alert.message}</TableCell>
              <TableCell>{formatDate(alert.startedAt)}</TableCell>
              <TableCell>{formatDate(alert.resolvedAt)}</TableCell>
              {!isHistory && (
                <TableCell>
                  {alert.acknowledged ? (
                    <span className="text-sm text-emerald-600">Acknowledged</span>
                  ) : (
                    <Button size="sm" onClick={() => onAck?.(alert.id)}>
                      Ack
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const AlertsPage = () => {
  const [active, setActive] = useState<Alert[]>([])
  const [history, setHistory] = useState<Alert[]>([])
  const [historyLimit, setHistoryLimit] = useState(100)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)

  const loadActive = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const alerts = await getActiveAlerts()
      setActive(alerts)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load alerts'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const alerts = await getAlertHistory(historyLimit)
      setHistory(alerts)
    } catch (err) {
      console.error(err)
    } finally {
      setHistoryLoading(false)
    }
  }, [historyLimit])

  useEffect(() => {
    loadActive()
  }, [loadActive])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleAck = async (id: string) => {
    await ackAlert(id)
    loadActive()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Alerts</h1>
        <p className="text-sm text-slate-500">
          Monitor environment issues and acknowledge them as you act.
        </p>
      </div>

      <Card className="rounded-3xl border border-slate-200 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Active alerts</h2>
          <Button size="sm" color="light" onClick={loadActive}>
            Refresh
          </Button>
        </div>
        {loading ? (
          <div className="flex min-h-[160px] items-center justify-center">
            <Spinner />
          </div>
        ) : error ? (
          <FlowbiteAlert color="failure">{error}</FlowbiteAlert>
        ) : (
          <AlertsTable items={active} onAck={handleAck} />
        )}
      </Card>

      <Card className="rounded-3xl border border-slate-200 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">History</h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="history-limit" value="Limit" className="text-sm text-slate-500" />
            <Select
              id="history-limit"
              value={historyLimit.toString()}
              onChange={(event) => setHistoryLimit(Number(event.target.value))}
              className="w-24"
            >
              {[50, 100, 200].map((limit) => (
                <option key={limit} value={limit}>
                  {limit}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {historyLoading ? (
          <div className="flex min-h-[160px] items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <AlertsTable items={history} isHistory />
        )}
      </Card>
    </div>
  )
}

export default AlertsPage
