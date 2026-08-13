import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Wifi, WifiOff } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import Field from '../../components/common/Field'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'

const ROLES = ['super_admin', 'warehouse_keeper', 'kitchen_staff', 'cashier', 'auditor', 'customer']
const emptyForm = { email: '', password: '', full_name: '', full_name_am: '', role: 'cashier' }

export default function UsersPage() {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language?.startsWith('am')

  const [users, setUsers] = useState([])
  const [connected, setConnected] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
  }, [])

  useEffect(() => {
    load()
    // Live updates so a second admin's changes (new account, role change)
    // show up here without a manual refresh.
    const channel = supabase
      .channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    const poll = setInterval(load, 20000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [load])

  const updateRole = async (row, role) => {
    setBusyId(row.id)
    await supabase.from('profiles').update({ role }).eq('id', row.id)
    setBusyId(null)
    load()
  }

  const toggleActive = async (row) => {
    setBusyId(row.id)
    await supabase.from('profiles').update({ is_active: !row.is_active }).eq('id', row.id)
    setBusyId(null)
    load()
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { data, error: invokeError } = await supabase.functions.invoke('admin-create-user', { body: form })
    setSaving(false)
    if (invokeError || data?.error) {
      setError(data?.error || invokeError.message || t('common.error'))
      return
    }
    setOpen(false)
    setForm(emptyForm)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl text-ink">{t('admin.usersRoles')}</h1>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${connected ? 'bg-forestLight/20 text-forest' : 'bg-stone text-bark/50'}`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? t('kitchen.live') : t('kitchen.reconnecting')}
          </span>
          <Button
            onClick={() => {
              setForm(emptyForm)
              setError('')
              setOpen(true)
            }}
          >
            <Plus size={16} /> {t('admin.createAccount')}
          </Button>
        </div>
      </div>

      <Card>
        <DataTable
          columns={[
            {
              key: 'name',
              header: t('common.name'),
              render: (r) => (isAm && r.full_name_am) || r.full_name
            },
            { key: 'email', header: t('auth.email') },
            {
              key: 'role',
              header: t('admin.role'),
              render: (r) => (
                <Select value={r.role} disabled={busyId === r.id} onChange={(e) => updateRole(r, e.target.value)}>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {t(`roles.${role}`)}
                    </option>
                  ))}
                </Select>
              )
            },
            {
              key: 'status',
              header: t('common.status'),
              render: (r) => <StatusBadge status={r.is_active ? 'approved' : 'rejected'} />
            },
            {
              key: 'actions',
              header: t('common.actions'),
              render: (r) => (
                <Button size="sm" variant={r.is_active ? 'danger' : 'outline'} disabled={busyId === r.id} onClick={() => toggleActive(r)}>
                  {r.is_active ? t('admin.deactivate') : t('admin.activate')}
                </Button>
              )
            }
          ]}
          rows={users}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t('admin.createAccount')}>
        <form onSubmit={submit}>
          <Field label={t('auth.email')} required>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={t('admin.tempPassword')} required>
            <Input
              type="text"
              required
              minLength={8}
              placeholder={t('admin.tempPasswordHint')}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label={t('admin.fullNameEn')} required>
            <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label={t('admin.fullNameAm')}>
            <Input
              className="font-amharic"
              value={form.full_name_am}
              onChange={(e) => setForm({ ...form, full_name_am: e.target.value })}
            />
          </Field>
          <Field label={t('admin.role')} required>
            <Select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`roles.${role}`)}
                </option>
              ))}
            </Select>
          </Field>

          {error && <p className="text-sm text-clay mb-3">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('settings.updating') : t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
