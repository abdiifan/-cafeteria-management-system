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
import Select from '../../components/common/Select'

const emptyItemForm = { name_en: '', name_am: '', category: 'food', guest_price: '', staff_price: '', made_to_order: false }

export default function MenuRecipesPage() {
  const { t, i18n } = useTranslation()
  const { role } = useAuth()
  const isAm = i18n.language?.startsWith('am')
  const canManageMenu = role === 'super_admin'

  const [menuCost, setMenuCost] = useState([])
  const [rawItems, setRawItems] = useState([])
  const [openAdd, setOpenAdd] = useState(false)
  const [itemForm, setItemForm] = useState(emptyItemForm)

  const [recipeFor, setRecipeFor] = useState(null) // menu item row
  const [recipeRows, setRecipeRows] = useState([])
  const [ingredientId, setIngredientId] = useState('')
  const [ingredientQty, setIngredientQty] = useState('')

  const [editItem, setEditItem] = useState(null) // menu item row being price-edited
  const [editForm, setEditForm] = useState(emptyItemForm)

  const load = async () => {
    const [{ data: cost }, { data: raw }] = await Promise.all([
      supabase.from('menu_item_cost').select('*'),
      supabase.from('items').select('id, name_en, name_am, unit')
    ])
    setMenuCost(cost || [])
    setRawItems(raw || [])
  }

  useEffect(() => {
    load()
  }, [])

  const submitMenuItem = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('menu_items').insert({
      ...itemForm,
      guest_price: Number(itemForm.guest_price) || 0,
      staff_price: Number(itemForm.staff_price) || 0
    })
    if (!error) {
      setOpenAdd(false)
      setItemForm(emptyItemForm)
      load()
    }
  }

  const openRecipe = async (menuItem) => {
    setRecipeFor(menuItem)
    const { data } = await supabase
      .from('recipe_items')
      .select('*, items(name_en, name_am, unit)')
      .eq('menu_item_id', menuItem.menu_item_id)
    setRecipeRows(data || [])
  }

  const addIngredient = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('recipe_items').insert({
      menu_item_id: recipeFor.menu_item_id,
      item_id: ingredientId,
      quantity_required: Number(ingredientQty)
    })
    if (!error) {
      setIngredientId('')
      setIngredientQty('')
      openRecipe(recipeFor)
      load()
    }
  }

  const openEdit = async (menuItem) => {
    const { data } = await supabase.from('menu_items').select('*').eq('id', menuItem.menu_item_id).single()
    setEditItem(menuItem)
    setEditForm({
      name_en: data?.name_en || '',
      name_am: data?.name_am || '',
      category: data?.category || 'food',
      guest_price: data?.guest_price ?? '',
      staff_price: data?.staff_price ?? '',
      made_to_order: !!data?.made_to_order
    })
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from('menu_items')
      .update({
        name_en: editForm.name_en,
        name_am: editForm.name_am,
        category: editForm.category,
        guest_price: Number(editForm.guest_price) || 0,
        staff_price: Number(editForm.staff_price) || 0,
        made_to_order: editForm.made_to_order
      })
      .eq('id', editItem.menu_item_id)
    if (!error) {
      setEditItem(null)
      load()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">{t('nav.menuRecipes')}</h1>
        {canManageMenu && (
          <Button onClick={() => setOpenAdd(true)}>
            <Plus size={16} /> {t('kitchen.addMenuItem')}
          </Button>
        )}
      </div>

      <Card>
        <DataTable
          columns={[
            { key: 'name', header: t('common.name'), render: (r) => (isAm ? r.name_am || r.name_en : r.name_en) },
            { key: 'guest_price', header: t('kitchen.guestPrice'), render: (r) => `${r.guest_price} ${t('common.birr')}` },
            { key: 'staff_price', header: t('kitchen.staffPrice'), render: (r) => `${r.staff_price} ${t('common.birr')}` },
            {
              key: 'estimated_cost',
              header: t('kitchen.estimatedCost'),
              render: (r) => `${Number(r.estimated_cost || 0).toFixed(2)} ${t('common.birr')}`
            },
            {
              key: 'actions',
              header: t('common.actions'),
              render: (r) => (
                <div className="flex gap-2">
                  {canManageMenu && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                      {t('common.edit')}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openRecipe(r)}>
                    {t('kitchen.recipe')}
                  </Button>
                </div>
              )
            }
          ]}
          rows={menuCost}
        />
      </Card>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title={t('kitchen.addMenuItem')}>
        <form onSubmit={submitMenuItem}>
          <Field label={t('kitchen.nameEn')} required>
            <Input required value={itemForm.name_en} onChange={(e) => setItemForm({ ...itemForm, name_en: e.target.value })} />
          </Field>
          <Field label={t('kitchen.nameAm')}>
            <Input
              className="font-amharic"
              value={itemForm.name_am}
              onChange={(e) => setItemForm({ ...itemForm, name_am: e.target.value })}
            />
          </Field>
          <Field label={t('kitchen.menuCategory')}>
            <Select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>
              <option value="food">food</option>
              <option value="drink">drink</option>
              <option value="snack">snack</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('kitchen.guestPrice')} required>
              <Input
                type="number"
                required
                value={itemForm.guest_price}
                onChange={(e) => setItemForm({ ...itemForm, guest_price: e.target.value })}
              />
            </Field>
            <Field label={t('kitchen.staffPrice')}>
              <Input
                type="number"
                value={itemForm.staff_price}
                onChange={(e) => setItemForm({ ...itemForm, staff_price: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={itemForm.made_to_order}
              onChange={(e) => setItemForm({ ...itemForm, made_to_order: e.target.checked })}
            />
            {t('kitchen.madeToOrder')}
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpenAdd(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!recipeFor} onClose={() => setRecipeFor(null)} title={recipeFor ? `${t('kitchen.recipe')} — ${isAm ? recipeFor.name_am || recipeFor.name_en : recipeFor.name_en}` : ''}>
        <DataTable
          columns={[
            { key: 'item', header: t('common.name'), render: (r) => (isAm ? r.items?.name_am || r.items?.name_en : r.items?.name_en) },
            { key: 'quantity_required', header: t('common.quantity'), render: (r) => `${r.quantity_required} ${r.items?.unit || ''}` }
          ]}
          rows={recipeRows}
        />
        {canManageMenu && (
          <form onSubmit={addIngredient} className="mt-4 flex items-end gap-2">
            <Field label={t('kitchen.addIngredient')}>
              <Select required value={ingredientId} onChange={(e) => setIngredientId(e.target.value)}>
                <option value="">—</option>
                {rawItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {isAm ? it.name_am || it.name_en : it.name_en}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('common.quantity')}>
              <Input type="number" step="0.001" required value={ingredientQty} onChange={(e) => setIngredientQty(e.target.value)} />
            </Field>
            <Button type="submit" size="sm">
              {t('common.add')}
            </Button>
          </form>
        )}
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={t('kitchen.editMenuItem')}>
        <form onSubmit={submitEdit}>
          <Field label={t('kitchen.nameEn')} required>
            <Input required value={editForm.name_en} onChange={(e) => setEditForm({ ...editForm, name_en: e.target.value })} />
          </Field>
          <Field label={t('kitchen.nameAm')}>
            <Input
              className="font-amharic"
              value={editForm.name_am}
              onChange={(e) => setEditForm({ ...editForm, name_am: e.target.value })}
            />
          </Field>
          <Field label={t('kitchen.menuCategory')}>
            <Select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
              <option value="food">food</option>
              <option value="drink">drink</option>
              <option value="snack">snack</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('kitchen.guestPrice')} required>
              <Input
                type="number"
                required
                value={editForm.guest_price}
                onChange={(e) => setEditForm({ ...editForm, guest_price: e.target.value })}
              />
            </Field>
            <Field label={t('kitchen.staffPrice')}>
              <Input
                type="number"
                value={editForm.staff_price}
                onChange={(e) => setEditForm({ ...editForm, staff_price: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={editForm.made_to_order}
              onChange={(e) => setEditForm({ ...editForm, made_to_order: e.target.checked })}
            />
            {t('kitchen.madeToOrder')}
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
