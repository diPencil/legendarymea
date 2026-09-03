"use client"

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BanknoteArrowDown, ChevronLeft, ChevronRight, Eye, Package2, Plus, Search, Trash2, X, PenLine } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import { listUsers, type User } from '@/lib/dashboard/users'
import { createSupplier, deleteSupplier, fundSupplierBalance, listSuppliers, updateSupplier, type SupplierInput, type SupplierRecord } from '@/lib/dashboard/suppliers'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

type DialogMode = 'create' | 'edit' | 'delete' | 'fund'
type FieldErrors = Record<string, string[]>
type QueryUpdates = Partial<Record<'page' | 'per_page' | 'search' | 'type' | 'status', string>>

const pageSizes = [10, 15, 25, 50]

export function SuppliersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const { user, clearSession } = useDashboardAuth()

  const labels = locale === 'ar'
    ? { suppliers: 'الموردون', suppliersDescription: 'إدارة الموردين والأرصدة والسجل المالي.', type: 'النوع', linkedCompany: 'شركة مرتبطة', linkedUser: 'مستخدم مرتبط', balances: 'الأرصدة', fund: 'تمويل الرصيد', userSupplier: 'مستخدم', companySupplier: 'شركة', address: 'العنوان', date: 'التاريخ' }
    : { suppliers: 'Suppliers', suppliersDescription: 'Manage suppliers, prefunding balances, and ledger visibility.', type: 'Type', linkedCompany: 'Linked company', linkedUser: 'Linked user', balances: 'Balances', fund: 'Fund balance', userSupplier: 'User', companySupplier: 'Company', address: 'Address', date: 'Date' }

  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number } | null>(null)
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRecord | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [filtersOpen, setFiltersOpen] = useState(Boolean(searchParams.get('type') || searchParams.get('status')))

  const [supplierForm, setSupplierForm] = useState<SupplierInput>({
    type: 'company',
    linked_company_id: null,
    linked_user_id: null,
    name: '',
    address: '',
    mobile: '',
    email: '',
    status: 'active',
  })
  const [fundingForm, setFundingForm] = useState({
    amount: '',
    currency: 'USD',
    transaction_date: new Date().toISOString().slice(0, 10),
    payment_method: 'bank_transfer',
    external_reference: '',
    notes: '',
  })

  const canView = canAccessPermission(user, ['view_suppliers', 'manage_suppliers'])
  const canManage = canAccessPermission(user, 'manage_suppliers')
  const canFund = canAccessPermission(user, 'fund_supplier_balances')

  const page = Math.max(Number(searchParams.get('page') ?? '1') || 1, 1)
  const perPage = pageSizes.includes(Number(searchParams.get('per_page') ?? '15')) ? Number(searchParams.get('per_page')) : 15

  const fetchData = useCallback(async (silent = false) => {
    if (!canView) {
      setIsLoading(false)
      return
    }

    if (silent) setIsRefreshing(true)
    else setIsLoading(true)

    setError('')

    try {
      const [supplierResponse, companyResponse, userResponse] = await Promise.all([
        listSuppliers({
          page,
          per_page: perPage,
          search: searchParams.get('search') ?? '',
          type: (searchParams.get('type') as 'user' | 'company' | '') ?? '',
          status: (searchParams.get('status') as 'active' | 'inactive' | '') ?? '',
        }),
        listCompanies({ page: 1, perPage: 500, search: '', status: '', relationship: '', countryCode: '', accountManagerId: '', sortBy: 'name', sortOrder: 'asc' }),
        listUsers({ page: 1, per_page: 500, sort: 'name', direction: 'asc' }),
      ])

      setSuppliers(supplierResponse.data)
      setMeta(supplierResponse.meta)
      setCompanies(companyResponse.data)
      setUsers(userResponse.data)
    } catch (requestError) {
      const resolved = requestError as { status?: number }
      if (resolved.status === 401) {
        clearSession()
        router.push('/dashboard/login')
        return
      }
      setError('Supplier records could not be loaded.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canView, clearSession, page, perPage, router, searchParams])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  function updateParams(updates: QueryUpdates) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key)
      else next.set(key, value)
    })
    router.push(next.toString() ? `${pathname}?${next.toString()}` : pathname)
  }

  function openCreate() {
    setSelectedSupplier(null)
    setSupplierForm({ type: 'company', linked_company_id: null, linked_user_id: null, name: '', address: '', mobile: '', email: '', status: 'active' })
    setFieldErrors({})
    setDialogMode('create')
  }

  function openEdit(supplier: SupplierRecord) {
    setSelectedSupplier(supplier)
    setSupplierForm({
      type: supplier.type,
      linked_company_id: supplier.linked_company?.id ?? null,
      linked_user_id: supplier.linked_user?.id ?? null,
      name: supplier.name,
      address: supplier.address,
      mobile: supplier.mobile,
      email: supplier.email,
      status: supplier.status,
    })
    setFieldErrors({})
    setDialogMode('edit')
  }

  async function submitSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      if (dialogMode === 'edit' && selectedSupplier) {
        await updateSupplier(selectedSupplier.id, supplierForm)
        setNotice('Supplier updated successfully.')
      } else {
        await createSupplier(supplierForm)
        setNotice('Supplier created successfully.')
      }
      setDialogMode(null)
      void fetchData(true)
    } catch (requestError) {
      const resolved = requestError as { status?: number; message?: string; data?: { errors?: FieldErrors } }
      if (resolved.status === 422 && resolved.data?.errors) setFieldErrors(resolved.data.errors)
      else setFieldErrors({ general: [resolved.message ?? 'Unable to save supplier.'] })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitFunding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSupplier) return
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      await fundSupplierBalance(selectedSupplier.id, {
        amount: Number(fundingForm.amount),
        currency: fundingForm.currency,
        transaction_date: fundingForm.transaction_date,
        payment_method: fundingForm.payment_method as 'bank_transfer' | 'cash' | 'card' | 'gateway' | 'other',
        external_reference: fundingForm.external_reference || null,
        notes: fundingForm.notes || null,
      })
      setNotice('Supplier balance funded successfully.')
      setDialogMode(null)
      void fetchData(true)
    } catch (requestError) {
      const resolved = requestError as { status?: number; message?: string; data?: { errors?: FieldErrors } }
      if (resolved.status === 422 && resolved.data?.errors) setFieldErrors(resolved.data.errors)
      else setFieldErrors({ general: [resolved.message ?? 'Unable to fund balance.'] })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!selectedSupplier) return
    setIsSubmitting(true)
    try {
      await deleteSupplier(selectedSupplier.id)
      setNotice('Supplier deleted successfully.')
      setDialogMode(null)
      void fetchData(true)
    } catch (requestError) {
      const resolved = requestError as { message?: string }
      setFieldErrors({ general: [resolved.message ?? 'Unable to delete supplier.'] })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canView) return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} />

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.finance}</span>
          <h2>{labels.suppliers}</h2>
          <p>{labels.suppliersDescription}</p>
        </div>
        {canManage ? (
          <button type="button" className={styles.primaryButton} onClick={openCreate}>
            <Plus aria-hidden="true" />
            {labels.suppliers}
          </button>
        ) : null}
      </section>

      <section className={styles.companyToolbar} aria-label={labels.suppliers}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{labels.suppliers}</span>
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={labels.suppliers} />
        </label>
        <label>
          <span>{labels.type}</span>
          <select value={searchParams.get('type') ?? ''} onChange={(event) => updateParams({ type: event.target.value, page: '1' })}>
            <option value="">{copy.all}</option>
            <option value="company">{labels.companySupplier}</option>
            <option value="user">{labels.userSupplier}</option>
          </select>
        </label>
        <label>
          <span>{copy.status}</span>
          <select value={searchParams.get('status') ?? ''} onChange={(event) => updateParams({ status: event.target.value, page: '1' })}>
            <option value="">{copy.allStatuses}</option>
            <option value="active">{copy.active}</option>
            <option value="inactive">{copy.inactive}</option>
          </select>
        </label>
        <label>
          <span>{copy.pageSize}</span>
          <select value={String(perPage)} onChange={(event) => updateParams({ per_page: event.target.value, page: '1' })}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <button
          type="button"
          className={styles.secondaryButton}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((current) => !current)}
        >
          {copy.filters}
        </button>
      </section>

      {filtersOpen ? (
        <section className={cn(styles.companyToolbar, styles.secondaryToolbar)} aria-label={copy.filters}>
            <label>
              <span>{labels.type}</span>
              <select value={searchParams.get('type') ?? ''} onChange={(event) => updateParams({ type: event.target.value, page: '1' })}>
                <option value="">{copy.all}</option>
                <option value="company">{labels.companySupplier}</option>
                <option value="user">{labels.userSupplier}</option>
              </select>
            </label>
            <label>
              <span>{copy.status}</span>
              <select value={searchParams.get('status') ?? ''} onChange={(event) => updateParams({ status: event.target.value, page: '1' })}>
                <option value="">{copy.allStatuses}</option>
                <option value="active">{copy.active}</option>
                <option value="inactive">{copy.inactive}</option>
              </select>
            </label>
        </section>
      ) : null}

      {notice ? (
        <div className={styles.pageNotice} role="status">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice('')} aria-label={copy.close}><X aria-hidden="true" /></button>
        </div>
      ) : null}

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void fetchData()} inline />
        ) : suppliers.length ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>{labels.suppliers}</th>
                    <th>{labels.type}</th>
                    <th>{labels.linkedCompany}</th>
                    <th>{labels.linkedUser}</th>
                    <th>{labels.balances}</th>
                    <th>{copy.status}</th>
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td><SupplierIdentity supplier={supplier} /></td>
                      <td>{supplier.type === 'company' ? labels.companySupplier : labels.userSupplier}</td>
                      <td>{supplier.linked_company?.name ?? '—'}</td>
                      <td>{supplier.linked_user?.name ?? '—'}</td>
                      <td>{supplier.balances.map((balance) => `${balance.currency} ${balance.available}`).join(' • ') || '—'}</td>
                      <td><SupplierStatusBadge status={supplier.status} /></td>
                      <td><SupplierActions supplier={supplier} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {suppliers.map((supplier) => (
                <article key={supplier.id} className={styles.employeeMobileCard}>
                  <SupplierIdentity supplier={supplier} />
                  <dl>
                    <div><dt>{copy.status}</dt><dd><SupplierStatusBadge status={supplier.status} /></dd></div>
                    <div><dt>{labels.type}</dt><dd>{supplier.type}</dd></div>
                    <div><dt>{labels.linkedCompany}</dt><dd>{supplier.linked_company?.name ?? '—'}</dd></div>
                    <div><dt>{labels.linkedUser}</dt><dd>{supplier.linked_user?.name ?? '—'}</dd></div>
                    <div><dt>{labels.balances}</dt><dd>{supplier.balances.map((balance) => `${balance.currency} ${balance.available}`).join(' • ') || '—'}</dd></div>
                  </dl>
                  <SupplierActions supplier={supplier} />
                </article>
              ))}
            </div>

            {meta ? (
              <Pagination meta={meta} />
            ) : null}
          </>
        ) : (
          <DashboardState title="No suppliers yet" body="Create the first supplier to track prefunding and usage." actionLabel={canManage ? labels.suppliers : undefined} onAction={canManage ? openCreate : undefined} />
        )}
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialogMode(null)}>
          <section className={cnDialog(dialogMode)} role="dialog" aria-modal="true" aria-labelledby="supplier-dialog-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{labels.suppliers}</span>
                <h2 id="supplier-dialog-title">{dialogMode === 'create' ? 'Create supplier' : dialogMode === 'edit' ? 'Edit supplier' : dialogMode === 'fund' ? labels.fund : 'Delete supplier'}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setDialogMode(null)} aria-label={copy.close}><X aria-hidden="true" /></button>
            </div>

            {dialogMode === 'create' || dialogMode === 'edit' ? (
              <form className={styles.companyForm} onSubmit={submitSupplier}>
                {fieldErrors.general ? <p className={styles.inlineAlert}>{fieldErrors.general[0]}</p> : null}
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>{labels.type}</span>
                    <select
                      value={supplierForm.type}
                      onChange={(event) => setSupplierForm((current) => ({
                        ...current,
                        type: event.target.value as 'user' | 'company',
                        linked_company_id: event.target.value === 'company' ? current.linked_company_id : null,
                        linked_user_id: event.target.value === 'user' ? current.linked_user_id : null,
                      }))}
                    >
                      <option value="company">{labels.companySupplier}</option>
                      <option value="user">{labels.userSupplier}</option>
                    </select>
                  </label>
                  {supplierForm.type === 'company' ? (
                    <label className={styles.formField}>
                      <span>{labels.linkedCompany}</span>
                      <select value={supplierForm.linked_company_id ? String(supplierForm.linked_company_id) : ''} onChange={(event) => setSupplierForm((current) => ({ ...current, linked_company_id: event.target.value ? Number(event.target.value) : null, linked_user_id: null }))}>
                        <option value="">{copy.none}</option>
                        {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                      </select>
                    </label>
                  ) : (
                    <label className={styles.formField}>
                      <span>{labels.linkedUser}</span>
                      <select value={supplierForm.linked_user_id ? String(supplierForm.linked_user_id) : ''} onChange={(event) => setSupplierForm((current) => ({ ...current, linked_user_id: event.target.value ? Number(event.target.value) : null, linked_company_id: null }))}>
                        <option value="">{copy.none}</option>
                        {users.map((userOption) => <option key={userOption.id} value={userOption.id}>{userOption.name}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>{copy.name}</span>
                    <input type="text" value={supplierForm.name ?? ''} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} />
                  </label>
                  <label className={styles.formField}>
                    <span>{copy.email}</span>
                    <input type="email" value={supplierForm.email ?? ''} onChange={(event) => setSupplierForm((current) => ({ ...current, email: event.target.value }))} />
                  </label>
                </div>
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>{copy.phone}</span>
                    <input type="text" value={supplierForm.mobile ?? ''} onChange={(event) => setSupplierForm((current) => ({ ...current, mobile: event.target.value }))} />
                  </label>
                  <label className={styles.formField}>
                    <span>{copy.status}</span>
                    <select value={supplierForm.status ?? 'active'} onChange={(event) => setSupplierForm((current) => ({ ...current, status: event.target.value as 'active' | 'inactive' }))}>
                      <option value="active">{copy.active}</option>
                      <option value="inactive">{copy.inactive}</option>
                    </select>
                  </label>
                </div>
                <label className={styles.formField}>
                  <span>{labels.address}</span>
                  <textarea rows={3} value={supplierForm.address ?? ''} onChange={(event) => setSupplierForm((current) => ({ ...current, address: event.target.value }))} />
                </label>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode(null)} disabled={isSubmitting}>{copy.cancel}</button>
                  <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? copy.saving : copy.save}</button>
                </div>
              </form>
            ) : null}

            {dialogMode === 'fund' ? (
              <form className={styles.companyForm} onSubmit={submitFunding}>
                {fieldErrors.general ? <p className={styles.inlineAlert}>{fieldErrors.general[0]}</p> : null}
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>{copy.amount}</span>
                    <input type="number" min="0.01" step="0.01" value={fundingForm.amount} onChange={(event) => setFundingForm((current) => ({ ...current, amount: event.target.value }))} required />
                  </label>
                  <label className={styles.formField}>
                    <span>{copy.currency}</span>
                    <input type="text" maxLength={3} value={fundingForm.currency} onChange={(event) => setFundingForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} required />
                  </label>
                </div>
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>{labels.date}</span>
                    <input type="date" value={fundingForm.transaction_date} onChange={(event) => setFundingForm((current) => ({ ...current, transaction_date: event.target.value }))} required />
                  </label>
                  <label className={styles.formField}>
                    <span>{copy.method}</span>
                    <select value={fundingForm.payment_method} onChange={(event) => setFundingForm((current) => ({ ...current, payment_method: event.target.value }))}>
                      <option value="bank_transfer">{copy.bankTransfer}</option>
                      <option value="cash">{copy.cash}</option>
                      <option value="card">{copy.card}</option>
                      <option value="gateway">{copy.gateway}</option>
                      <option value="other">{copy.other}</option>
                    </select>
                  </label>
                </div>
                <label className={styles.formField}>
                  <span>{copy.transactionReference}</span>
                  <input type="text" value={fundingForm.external_reference} onChange={(event) => setFundingForm((current) => ({ ...current, external_reference: event.target.value }))} />
                </label>
                <label className={styles.formField}>
                  <span>{copy.notes}</span>
                  <textarea rows={3} value={fundingForm.notes} onChange={(event) => setFundingForm((current) => ({ ...current, notes: event.target.value }))} />
                </label>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode(null)} disabled={isSubmitting}>{copy.cancel}</button>
                  <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? copy.saving : labels.fund}</button>
                </div>
              </form>
            ) : null}

            {dialogMode === 'delete' ? (
              <div className={styles.employeeForm}>
                {fieldErrors.general ? <p className={styles.inlineAlert}>{fieldErrors.general[0]}</p> : null}
                <p>Delete {selectedSupplier?.name}? This cannot be undone.</p>
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setDialogMode(null)} disabled={isSubmitting}>{copy.cancel}</button>
                  <button type="button" className={styles.destructiveButton} onClick={() => void confirmDelete()} disabled={isSubmitting}>{copy.delete}</button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  )

  function SupplierIdentity({ supplier }: { supplier: SupplierRecord }) {
    return (
      <div className={styles.employeeIdentity}>
        <span aria-hidden="true"><Package2 aria-hidden="true" /></span>
        <div>
          <Link href={`/dashboard/suppliers/${supplier.id}`} className={styles.textLink}>
            {supplier.name}
          </Link>
          <small dir="ltr">{supplier.reference}</small>
        </div>
      </div>
    )
  }

  function SupplierActions({ supplier }: { supplier: SupplierRecord }) {
    return (
      <div className={styles.rowActions}>
        <Link href={`/dashboard/suppliers/${supplier.id}`} className={styles.iconButton} aria-label={copy.view}><Eye aria-hidden="true" /></Link>
        {canManage ? <button type="button" className={styles.iconButton} onClick={() => openEdit(supplier)} aria-label={copy.edit}><PenLine aria-hidden="true" /></button> : null}
        {canFund ? <button type="button" className={styles.iconButton} onClick={() => { setSelectedSupplier(supplier); setDialogMode('fund') }} aria-label={labels.fund}><BanknoteArrowDown aria-hidden="true" /></button> : null}
        {canManage ? <button type="button" className={cn(styles.iconButton, styles.dangerIconButton)} onClick={() => { setSelectedSupplier(supplier); setDialogMode('delete') }} aria-label={copy.delete}><Trash2 aria-hidden="true" /></button> : null}
      </div>
    )
  }

  function SupplierStatusBadge({ status }: { status: SupplierRecord['status'] }) {
    const normalizedStatus = status === 'active' || status === 'inactive' ? status : 'inactive'
    return (
      <span className={cn(styles.statusBadge, styles[`status_${normalizedStatus}`])}>
        {status === 'active' ? copy.active : copy.inactive}
      </span>
    )
  }

  function Pagination({ meta: pageMeta }: { meta: { current_page: number; last_page: number; per_page: number; total: number } }) {
    const pages = pageNumbers(pageMeta.current_page, pageMeta.last_page)
    const derivedFrom = pageMeta.total === 0 ? 0 : (pageMeta.current_page - 1) * pageMeta.per_page + 1
    const derivedTo = Math.min(pageMeta.current_page * pageMeta.per_page, pageMeta.total)

    return (
      <nav className={styles.pagination} aria-label="Supplier pagination">
        <p>
          {copy.range.replace('{from}', String(derivedFrom)).replace('{to}', String(derivedTo)).replace('{total}', String(pageMeta.total))}
        </p>
        <div>
          <button type="button" className={styles.secondaryButton} onClick={() => updateParams({ page: String(pageMeta.current_page - 1) })} disabled={pageMeta.current_page <= 1} aria-label={copy.previous}>
            <ChevronLeft aria-hidden="true" />
            {copy.previous}
          </button>
          {pages.map((pageNumber) => (
            <button
              type="button"
              key={pageNumber}
              className={cn(styles.pageButton, pageNumber === pageMeta.current_page && styles.pageButtonActive)}
              aria-current={pageNumber === pageMeta.current_page ? 'page' : undefined}
              onClick={() => updateParams({ page: String(pageNumber) })}
            >
              {pageNumber}
            </button>
          ))}
          <button type="button" className={styles.secondaryButton} onClick={() => updateParams({ page: String(pageMeta.current_page + 1) })} disabled={pageMeta.current_page >= pageMeta.last_page} aria-label={copy.next}>
            {copy.next}
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </nav>
    )
  }
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function cnDialog(mode: DialogMode) {
  return mode === 'delete' ? `${styles.employeeDialog}` : `${styles.employeeDialog} ${styles.companyDialog}`
}
