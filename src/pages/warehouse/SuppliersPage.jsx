import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Field from '../../components/common/Field'
import Input from '../../components/common/Input'

const emptyForm = { name: '', name_am: '', contact_phone: '', contact_person: '', payment_terms: '' }

export default function SuppliersPage() {
  const { t, i18n } = useTranslation()
  const { role } = useAuth()
  const isAm = i18n.language?.startsWith('am')
  const canManage = ['super_admin', 'warehouse_keeper'].includes(role)

  const [suppliers, setSuppliers] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setSuppliers(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('suppliers').insert(form)
    setSaving(false)
    if (!error) {
      setOpen(false)
      setForm(emptyForm)
      load()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">{t('warehouse.suppliers')}</h1>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> {t('warehouse.addSupplier')}
          </Button>
        )}
      </div>

      <Card>
        <DataTable
          columns={[
            { key: 'name', header: t('common.name'), render: (r) => (isAm ? r.name_am || r.name : r.name) },
            { key: 'contact_phone', header: t('warehouse.contactPhone') },
            { key: 'payment_terms', header: t('warehouse.paymentTerms') }
          ]}
          rows={suppliers}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t('warehouse.addSupplier')}>
        <form onSubmit={submit}>
          <Field label={t('common.name')} required>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t('warehouse.itemNameAm')}>
            <Input
              className="font-amharic"
              value={form.name_am}
              onChange={(e) => setForm({ ...form, name_am: e.target.value })}
            />
          </Field>
          <Field label={t('warehouse.contactPhone')}>
            <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          </Field>
          <Field label={t('warehouse.paymentTerms')}>
            <Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
