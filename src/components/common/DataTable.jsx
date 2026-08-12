import EmptyState from './EmptyState'
import { useTranslation } from 'react-i18next'

/**
 * columns: [{ key, header, render?(row) }]
 */
export default function DataTable({ columns, rows, emptyMessage }) {
  const { t } = useTranslation()
  if (!rows || rows.length === 0) {
    return <EmptyState message={emptyMessage || t('common.noResults')} />
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-bark/50 uppercase text-xs tracking-wide border-b border-bark/10">
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 font-medium whitespace-nowrap">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-bark/5 hover:bg-stone/40">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2.5 align-middle whitespace-nowrap">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
