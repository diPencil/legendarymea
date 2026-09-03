"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Edit, Plus, Search, Tags, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { useDashboardAuth } from '@/components/dashboard/auth-provider'
import { dashboardCopy } from '@/components/dashboard/copy'
import { DashboardLoading, DashboardState } from '@/components/dashboard/dashboard-states'
import { DashboardApiError } from '@/lib/dashboard/api'
import { canAccessPermission } from '@/lib/dashboard/permissions'
import {
  createServiceCatalog,
  listDashboardServiceCatalog,
  updateServiceCatalog,
  type ServiceCatalog,
  type ServiceCatalogInput,
} from '@/lib/dashboard/service-catalog'
import type { PaginationMeta } from '@/lib/dashboard/companies'
import { cn } from '@/lib/utils'

import styles from './dashboard.module.css'

type DialogMode = 'create' | 'edit'
type FieldErrors = Record<string, string[]>

const pageSizes = [10, 15, 25, 50]

const emptyServiceForm: ServiceCatalogInput = {
  code: '',
  name_en: '',
  name_ar: '',
  category: '',
  description_en: '',
  description_ar: '',
  show_in_contact: true,
  available_for_active_service: true,
  available_for_invoice: true,
  active: true,
  sort_order: 0,
}

export function ServiceCatalogPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const labels = pageLabels(locale)
  const { user, clearSession } = useDashboardAuth()

  const [services, setServices] = useState<ServiceCatalog[]>([])
  const [allServices, setAllServices] = useState<ServiceCatalog[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null)
  const [selectedService, setSelectedService] = useState<ServiceCatalog | null>(null)
  const [form, setForm] = useState<ServiceCatalogInput>(emptyServiceForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canView = canAccessPermission(user, ['view_settings', 'manage_settings'])
  const canManage = canAccessPermission(user, 'manage_settings')
  const page = positiveNumber(searchParams.get('page'), 1)
  const perPageValue = positiveNumber(searchParams.get('per_page'), 15)
  const perPage = pageSizes.includes(perPageValue) ? perPageValue : 15
  const query = useMemo(() => ({
    page,
    per_page: perPage,
    search: searchParams.get('search') ?? '',
    category: searchParams.get('category') ?? '',
    status: parseStatus(searchParams.get('status')),
  }), [page, perPage, searchParams])

  const categories = useMemo(
    () => Array.from(new Set(allServices.map((service) => service.category).filter(Boolean) as string[])).sort(),
    [allServices],
  )

  const handleDashboardError = useCallback((requestError: unknown) => {
    if (requestError instanceof DashboardApiError && requestError.code === 401) {
      clearSession(copy.sessionExpired)
      return
    }
    setError(requestError instanceof Error ? requestError.message : labels.loadError)
  }, [clearSession, copy.sessionExpired, labels.loadError])

  const setQueryParam = useCallback((updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    const queryString = next.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const refreshServices = useCallback(async (quiet = false) => {
    if (!canView) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }
    if (quiet) setIsRefreshing(true)
    else setIsLoading(true)
    setError('')

    try {
      const [list, all] = await Promise.all([
        listDashboardServiceCatalog(query),
        listDashboardServiceCatalog({ per_page: 500 }),
      ])
      setServices(list.data)
      setMeta(list.meta)
      setAllServices(all.data)
    } catch (requestError) {
      handleDashboardError(requestError)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [canView, handleDashboardError, query])

  useEffect(() => {
    void refreshServices()
  }, [refreshServices])

  useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== query.search) setQueryParam({ search: searchInput, page: '1' })
    }, 360)
    return () => window.clearTimeout(timeout)
  }, [query.search, searchInput, setQueryParam])

  function openCreateDialog() {
    setSelectedService(null)
    setForm({ ...emptyServiceForm, sort_order: allServices.length })
    setFieldErrors({})
    setDialogMode('create')
  }

  function openEditDialog(service: ServiceCatalog) {
    setSelectedService(service)
    setForm({
      code: service.code,
      name_en: service.name_en,
      name_ar: service.name_ar,
      category: service.category ?? '',
      description_en: service.description_en ?? '',
      description_ar: service.description_ar ?? '',
      show_in_contact: service.show_in_contact,
      available_for_active_service: service.available_for_active_service,
      available_for_invoice: service.available_for_invoice,
      active: service.active,
      sort_order: service.sort_order,
    })
    setFieldErrors({})
    setDialogMode('edit')
  }

  function closeDialog() {
    setDialogMode(null)
    setSelectedService(null)
    setFieldErrors({})
    setIsSubmitting(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    const payload: ServiceCatalogInput = {
      ...form,
      code: form.code.trim(),
      name_en: form.name_en.trim(),
      name_ar: form.name_ar.trim(),
      category: form.category?.trim() || null,
      description_en: form.description_en?.trim() || null,
      description_ar: form.description_ar?.trim() || null,
      sort_order: Number(form.sort_order) || 0,
    }

    try {
      if (dialogMode === 'edit' && selectedService) {
        await updateServiceCatalog(selectedService.id, payload)
        setNotice(labels.updated)
      } else {
        await createServiceCatalog(payload)
        setNotice(labels.created)
      }
      closeDialog()
      void refreshServices(true)
    } catch (requestError) {
      if (requestError instanceof DashboardApiError && requestError.code === 422) {
        setFieldErrors(requestError.errors)
      } else {
        setFieldErrors({ general: [requestError instanceof Error ? requestError.message : labels.saveError] })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canView) {
    return <DashboardState title={copy.accessDenied} body={copy.accessDeniedBody} tone="danger" />
  }

  const hasActiveQuery = Boolean(query.search || query.category || query.status)

  return (
    <div className={styles.employeesPage}>
      <section className={styles.managementHeader}>
        <div>
          <span>{copy.commercial}</span>
          <h2>{labels.title}</h2>
          <p>{labels.description}</p>
        </div>
        {canManage ? (
          <button type="button" className={styles.primaryButton} onClick={openCreateDialog}>
            <Plus aria-hidden="true" />
            {labels.create}
          </button>
        ) : null}
      </section>

      {notice ? <p className={styles.successAlert} role="status">{notice}</p> : null}

      <section className={styles.companyToolbar} aria-label={labels.searchLabel}>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" />
          <span className={styles.srOnly}>{labels.search}</span>
          <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={labels.search} />
        </label>
        <SelectField label={labels.category} value={query.category} onChange={(value) => setQueryParam({ category: value, page: '1' })}>
          <option value="">{labels.allCategories}</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </SelectField>
        <SelectField label={copy.status} value={query.status} onChange={(value) => setQueryParam({ status: value, page: '1' })}>
          <option value="">{copy.allStatuses}</option>
          <option value="active">{copy.active}</option>
          <option value="inactive">{copy.inactive}</option>
        </SelectField>
        <SelectField label={copy.pageSize} value={String(query.per_page)} onChange={(value) => setQueryParam({ per_page: value, page: '1' })}>
          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </SelectField>
      </section>

      <section className={cn(styles.employeePanel, isRefreshing && styles.employeePanelRefreshing)}>
        {isLoading ? (
          <DashboardLoading label={copy.loadingData} inline />
        ) : error ? (
          <DashboardState title={copy.errorTitle} body={error} actionLabel={copy.retry} onAction={() => void refreshServices()} inline />
        ) : services.length ? (
          <>
            <div className={styles.employeeTableWrap}>
              <table className={cn(styles.employeeTable, styles.companyTable)}>
                <thead>
                  <tr>
                    <th>{labels.service}</th>
                    <th>{labels.code}</th>
                    <th>{labels.category}</th>
                    <th>{labels.contact}</th>
                    <th>{labels.activeServices}</th>
                    <th>{labels.invoice}</th>
                    <th>{copy.status}</th>
                    <th>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td>
                        <div className={styles.employeeIdentity}>
                          <span aria-hidden="true"><Tags aria-hidden="true" /></span>
                          <div>
                            <strong>{locale === 'ar' ? service.name_ar : service.name_en}</strong>
                            <small>{locale === 'ar' ? service.name_en : service.name_ar}</small>
                          </div>
                        </div>
                      </td>
                      <td dir="ltr">{service.code}</td>
                      <td>{service.category || '-'}</td>
                      <td><FlagBadge enabled={service.show_in_contact} labels={labels} /></td>
                      <td><FlagBadge enabled={service.available_for_active_service} labels={labels} /></td>
                      <td><FlagBadge enabled={service.available_for_invoice} labels={labels} /></td>
                      <td><span className={cn(styles.statusBadge, service.active ? styles.status_active : styles.status_inactive)}>{service.active ? copy.active : copy.inactive}</span></td>
                      <td>
                        <div className={styles.rowActions}>
                          {canManage ? (
                            <button type="button" className={styles.iconButton} onClick={() => openEditDialog(service)} aria-label={`${labels.edit} ${service.name_en}`}>
                              <Edit aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.employeeMobileList}>
              {services.map((service) => (
                <article className={styles.employeeMobileCard} key={service.id}>
                  <header className={styles.mobileCardHeader}>
                    <div className={styles.employeeIdentity}>
                      <span aria-hidden="true"><Tags aria-hidden="true" /></span>
                      <div>
                        <strong>{locale === 'ar' ? service.name_ar : service.name_en}</strong>
                        <small dir="ltr">{service.code}</small>
                      </div>
                    </div>
                    <span className={cn(styles.statusBadge, service.active ? styles.status_active : styles.status_inactive)}>{service.active ? copy.active : copy.inactive}</span>
                  </header>
                  <dl>
                    <div><dt>{labels.category}</dt><dd>{service.category || '-'}</dd></div>
                    <div><dt>{labels.contact}</dt><dd><FlagBadge enabled={service.show_in_contact} labels={labels} /></dd></div>
                    <div><dt>{labels.activeServices}</dt><dd><FlagBadge enabled={service.available_for_active_service} labels={labels} /></dd></div>
                    <div><dt>{labels.invoice}</dt><dd><FlagBadge enabled={service.available_for_invoice} labels={labels} /></dd></div>
                  </dl>
                  <div className={styles.rowActions}>
                    {canManage ? (
                      <button type="button" className={styles.iconButton} onClick={() => openEditDialog(service)} aria-label={`${labels.edit} ${service.name_en}`}>
                        <Edit aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <DashboardState title={hasActiveQuery ? labels.noMatches : labels.empty} body={hasActiveQuery ? labels.noMatchesBody : labels.emptyBody} inline />
        )}
        {meta ? <Pagination meta={meta} /> : null}
      </section>

      {dialogMode ? (
        <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className={cn(styles.employeeDialog, styles.companyDialog)} role="dialog" aria-modal="true" aria-labelledby="service-catalog-dialog-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>{labels.title}</span>
                <h2 id="service-catalog-dialog-title">{dialogMode === 'create' ? labels.create : labels.edit}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={closeDialog} aria-label={copy.close}>
                <X aria-hidden="true" />
              </button>
            </div>
            <form className={styles.companyForm} onSubmit={handleSubmit}>
              {fieldErrors.general ? <p className={styles.inlineAlert}>{fieldErrors.general[0]}</p> : null}
              <fieldset className={styles.formSection}>
                <legend>{labels.service}</legend>
                <div className={styles.formGrid}>
                  <TextField label={labels.nameEn} value={form.name_en} onChange={(value) => setForm((current) => ({ ...current, name_en: value }))} required error={fieldErrors.name_en?.[0]} />
                  <TextField label={labels.nameAr} value={form.name_ar} onChange={(value) => setForm((current) => ({ ...current, name_ar: value }))} required error={fieldErrors.name_ar?.[0]} />
                  <TextField label={labels.code} value={form.code} onChange={(value) => setForm((current) => ({ ...current, code: value }))} required error={fieldErrors.code?.[0]} />
                  <TextField label={labels.category} value={form.category ?? ''} onChange={(value) => setForm((current) => ({ ...current, category: value }))} error={fieldErrors.category?.[0]} />
                  <TextField label={labels.sortOrder} value={String(form.sort_order)} onChange={(value) => setForm((current) => ({ ...current, sort_order: Number(value) }))} type="number" error={fieldErrors.sort_order?.[0]} />
                </div>
                <div className={styles.formGrid}>
                  <TextAreaField label={labels.descriptionEn} value={form.description_en ?? ''} onChange={(value) => setForm((current) => ({ ...current, description_en: value }))} error={fieldErrors.description_en?.[0]} />
                  <TextAreaField label={labels.descriptionAr} value={form.description_ar ?? ''} onChange={(value) => setForm((current) => ({ ...current, description_ar: value }))} error={fieldErrors.description_ar?.[0]} />
                </div>
              </fieldset>
              <fieldset className={styles.formSection}>
                <legend>{labels.flags}</legend>
                <div className={styles.formGrid}>
                  <CheckboxField label={labels.showOnContact} checked={form.show_in_contact} onChange={(value) => setForm((current) => ({ ...current, show_in_contact: value }))} />
                  <CheckboxField label={labels.availableForActiveService} checked={form.available_for_active_service} onChange={(value) => setForm((current) => ({ ...current, available_for_active_service: value }))} />
                  <CheckboxField label={labels.availableForInvoice} checked={form.available_for_invoice} onChange={(value) => setForm((current) => ({ ...current, available_for_invoice: value }))} />
                  <CheckboxField label={labels.active} checked={form.active} onChange={(value) => setForm((current) => ({ ...current, active: value }))} />
                </div>
              </fieldset>
              <div className={styles.dialogActions}>
                <button type="button" className={styles.secondaryButton} onClick={closeDialog}>{copy.cancel}</button>
                <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? copy.saving : copy.save}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )

  function Pagination({ meta: pageMeta }: { meta: PaginationMeta }) {
    const pages = pageNumbers(pageMeta.current_page, pageMeta.last_page)
    const from = pageMeta.from ?? (pageMeta.total === 0 ? 0 : (pageMeta.current_page - 1) * pageMeta.per_page + 1)
    const to = pageMeta.to ?? Math.min(pageMeta.current_page * pageMeta.per_page, pageMeta.total)
    return (
      <nav className={styles.pagination} aria-label="Pagination">
        <p>{copy.range.replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(pageMeta.total))}</p>
        <div>
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page <= 1} onClick={() => setQueryParam({ page: String(pageMeta.current_page - 1) })}>
            <ChevronLeft aria-hidden="true" />{copy.previous}
          </button>
          {pages.map((pageNumber) => (
            <button type="button" key={pageNumber} className={cn(styles.pageButton, pageNumber === pageMeta.current_page && styles.pageButtonActive)} aria-current={pageNumber === pageMeta.current_page ? 'page' : undefined} onClick={() => setQueryParam({ page: String(pageNumber) })}>
              {pageNumber}
            </button>
          ))}
          <button type="button" className={styles.secondaryButton} disabled={pageMeta.current_page >= pageMeta.last_page} onClick={() => setQueryParam({ page: String(pageMeta.current_page + 1) })}>
            {copy.next}<ChevronRight aria-hidden="true" />
          </button>
        </div>
      </nav>
    )
  }
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </label>
  )
}

function TextField({ label, value, onChange, required = false, type = 'text', error }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; error?: string }) {
  return (
    <label className={styles.formField}>
      <span>{label}{required ? <em> *</em> : null}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
      {error ? <small className={styles.fieldError}>{error}</small> : null}
    </label>
  )
}

function TextAreaField({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <label className={styles.formField}>
      <span>{label}</span>
      <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
      {error ? <small className={styles.fieldError}>{error}</small> : null}
    </label>
  )
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className={styles.formCheckbox}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function FlagBadge({ enabled, labels }: { enabled: boolean; labels: ReturnType<typeof pageLabels> }) {
  return <span className={cn(styles.statusBadge, enabled ? styles.status_active : styles.status_inactive)}>{enabled ? labels.yes : labels.no}</span>
}

function positiveNumber(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseStatus(value: string | null): 'active' | 'inactive' | '' {
  return value === 'active' || value === 'inactive' ? value : ''
}

function pageNumbers(current: number, last: number) {
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function pageLabels(locale: 'en' | 'ar') {
  return locale === 'ar'
    ? {
        title: 'كتالوج الخدمات',
        description: 'القائمة الرئيسية للخدمات التي تظهر في التواصل والخدمات النشطة والفواتير.',
        create: 'إنشاء خدمة',
        edit: 'تعديل الخدمة',
        created: 'تم إنشاء الخدمة بنجاح.',
        updated: 'تم تحديث الخدمة بنجاح.',
        loadError: 'تعذر تحميل كتالوج الخدمات.',
        saveError: 'تعذر حفظ الخدمة.',
        search: 'ابحث في الخدمات',
        searchLabel: 'البحث في كتالوج الخدمات',
        service: 'الخدمة',
        code: 'الكود',
        category: 'الفئة',
        allCategories: 'كل الفئات',
        contact: 'التواصل',
        activeServices: 'الخدمات النشطة',
        invoice: 'الفواتير',
        nameEn: 'الاسم بالإنجليزية',
        nameAr: 'الاسم بالعربية',
        descriptionEn: 'الوصف بالإنجليزية',
        descriptionAr: 'الوصف بالعربية',
        flags: 'ظهور الخدمة',
        showOnContact: 'تظهر في التواصل',
        availableForActiveService: 'متاحة للخدمات النشطة',
        availableForInvoice: 'متاحة للفواتير',
        active: 'نشطة',
        sortOrder: 'ترتيب العرض',
        yes: 'نعم',
        no: 'لا',
        empty: 'لا توجد خدمات بعد',
        emptyBody: 'أنشئ أول خدمة في الكتالوج.',
        noMatches: 'لا توجد خدمات مطابقة',
        noMatchesBody: 'عدّل البحث أو المرشحات للعثور على خدمة.',
      }
    : {
        title: 'Service Catalog',
        description: 'The master list of services used by contact forms, active services, invoices, and CRM service interest.',
        create: 'Create service',
        edit: 'Edit service',
        created: 'Service created successfully.',
        updated: 'Service updated successfully.',
        loadError: 'Service catalog could not be loaded.',
        saveError: 'Service could not be saved.',
        search: 'Search services',
        searchLabel: 'Search service catalog',
        service: 'Service',
        code: 'Code',
        category: 'Category',
        allCategories: 'All categories',
        contact: 'Contact',
        activeServices: 'Active Services',
        invoice: 'Invoice',
        nameEn: 'Name EN',
        nameAr: 'Name AR',
        descriptionEn: 'Description EN',
        descriptionAr: 'Description AR',
        flags: 'Service visibility',
        showOnContact: 'Show on Contact',
        availableForActiveService: 'Available for Active Service',
        availableForInvoice: 'Available for Invoice',
        active: 'Active',
        sortOrder: 'Sort Order',
        yes: 'Yes',
        no: 'No',
        empty: 'No services yet',
        emptyBody: 'Create the first catalog service.',
        noMatches: 'No matching services',
        noMatchesBody: 'Adjust search or filters to find a service.',
      }
}
