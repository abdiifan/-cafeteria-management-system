import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/common/Card'
import DataTable from '../../components/common/DataTable'
import Input from '../../components/common/Input'

export default function AuditLogPage() {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language?.startsWith('am')
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('audit_log')
      .select('*, profiles(full_name, full_name_am, role)')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setRows(data || []))
  }, [])

  const filtered = rows.filter((r) => {
    if (!search) return true
    const s = search.toLowerCase()
    return r.action?.toLowerCase().includes(s) || r.module?.toLowerCase().includes(s) || r.profiles?.full_name?.toLowerCase().includes(s)
  })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-ink">{t('audit.auditLog')}</h1>
      <Card
        actions={
          <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
        }
      >
        <DataTable
          columns={[
            {
              key: 'user',
              header: t('audit.user'),
              render: (r) => (isAm ? r.profiles?.full_name_am || r.profiles?.full_name : r.profiles?.full_name) || '—'
            },
            { key: 'action', header: t('audit.action') },
            { key: 'module', header: t('audit.module') },
            { key: 'created_at', header: t('audit.when'), render: (r) => new Date(r.created_at).toLocaleString() }
          ]}
          rows={filtered}
        />
      </Card>
    </div>
  )
}
