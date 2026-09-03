"use client"

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Loader2, Plus, X } from 'lucide-react'

import { useLocale } from '@/components/i18n'
import { dashboardCopy } from '@/components/dashboard/copy'
import {
  createInvoice,
  updateInvoice,
  type CreateInvoiceInput,
  type Invoice,
  type InvoiceItemInput,
  type UpdateInvoiceInput,
} from '@/lib/dashboard/invoices'
import { listCompanies, type CompanyRecord } from '@/lib/dashboard/companies'
import { listContracts, type ContractRecord } from '@/lib/dashboard/contracts'
import { listActiveServices, type ActiveService } from '@/lib/dashboard/active-services'
import { listUsers, type User } from '@/lib/dashboard/users'
import { listEmployees, type EmployeeRecord } from '@/lib/dashboard/employees'
import { listSuppliers, type SupplierRecord } from '@/lib/dashboard/suppliers'
import { listServiceCatalog, type ServiceCatalog } from '@/lib/dashboard/service-catalog'
import { formatCurrencyAmount } from '@/lib/dashboard/format'
import { cn } from '@/lib/utils'
import styles from '@/components/dashboard/dashboard.module.css'

const CURRENCIES = ['AED', 'SAR', 'USD', 'EUR', 'GBP', 'KWD', 'BHD', 'QAR', 'OMR', 'EGP', 'JOD', 'LBP', 'MAD', 'TND', 'DZD']

type FieldErrors = Record<string, string[]>

type FormItem = {
  description: string
  service_catalog_id: string
  service_name_snapshot: string
  service_details: string
  service_start_date: string
  service_end_date: string
  booking_reference: string
  supplier_id: string
  quantity: string
  unit_price: string
  purchase_unit_cost: string
  purchase_currency: string
  exchange_rate: string
}

const EMPTY_ITEM: FormItem = {
  description: '',
  service_catalog_id: '',
  service_name_snapshot: '',
  service_details: '',
  service_start_date: '',
  service_end_date: '',
  booking_reference: '',
  supplier_id: '',
  quantity: '1',
  unit_price: '0',
  purchase_unit_cost: '',
  purchase_currency: 'USD',
  exchange_rate: '1',
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function safeLineTotal(quantity: string, unitPrice: string) {
  return (toNumber(quantity) * toNumber(unitPrice)).toFixed(2)
}

function safeLineCost(quantity: string, cost: string, rate: string) {
  const total = toNumber(quantity) * toNumber(cost) * (toNumber(rate) || 1)
  return total > 0 ? total.toFixed(2) : '0.00'
}

function resolvePurchaseCurrency(item: FormItem, invoiceCurrency: string) {
  return item.purchase_currency || invoiceCurrency
}

function resolveExchangeRate(item: FormItem, invoiceCurrency: string) {
  return resolvePurchaseCurrency(item, invoiceCurrency) === invoiceCurrency ? '1' : item.exchange_rate
}

function formatCustomerLabel(invoice: Invoice) {
  return invoice.customer.name ?? invoice.customer_user?.name ?? invoice.company?.name ?? '—'
}

function formatServiceCatalogName(service: ServiceCatalog, locale: 'en' | 'ar') {
  return locale === 'ar' ? service.name_ar : service.name_en
}

function fallbackItemTitle(index: number, locale: 'en' | 'ar') {
  return locale === 'ar' ? `بند فاتورة ${index + 1}` : `Invoice item ${index + 1}`
}

export function InvoiceForm({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice?: Invoice
  onClose: () => void
  onSuccess: () => void
}) {
  const { locale } = useLocale()
  const copy = dashboardCopy[locale]
  const isEditing = Boolean(invoice)

  const labels = locale === 'ar'
    ? {
        customerType: 'نوع العميل',
        companyCustomer: 'شركة',
        userCustomer: 'مستخدم',
        clientUser: 'مستخدم عميل',
        salesOwner: 'مسؤول المبيعات',
        internalNotes: 'ملاحظات داخلية',
        serviceName: 'اسم الخدمة',
        service: 'الخدمة',
        serviceDates: 'تواريخ الخدمة',
        serviceDetails: 'تفاصيل الخدمة',
        bookingReference: 'مرجع الحجز',
        supplier: 'المورد',
        purchaseCost: 'تكلفة الشراء',
        purchaseCurrency: 'عملة الشراء',
        exchangeRate: 'سعر الصرف',
        sameCurrencyFxRate: 'عندما تتطابق العملتان يكون سعر الصرف 1.',
        estimatedCost: 'التكلفة التقديرية',
        estimatedProfit: 'الربح التقديري',
        customer: 'العميل',
        terms: 'الشروط',
      }
    : {
        customerType: 'Customer type',
        companyCustomer: 'Company',
        userCustomer: 'User',
        clientUser: 'Client user',
        salesOwner: 'Sales owner',
        internalNotes: 'Internal notes',
        serviceName: 'Service name',
        service: 'Service',
        serviceDates: 'Service dates',
        serviceDetails: 'Service details',
        bookingReference: 'Booking reference',
        supplier: 'Supplier',
        purchaseCost: 'Purchase cost',
        purchaseCurrency: 'Purchase currency',
        exchangeRate: 'Exchange rate',
        sameCurrencyFxRate: 'When purchase and invoice currencies match, the FX rate is 1.',
        estimatedCost: 'Estimated cost',
        estimatedProfit: 'Estimated profit',
        customer: 'Customer',
        terms: 'Terms',
      }

  const [isLoadingRelated, setIsLoadingRelated] = useState(true)
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [activeServices, setActiveServices] = useState<ActiveService[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [catalogServices, setCatalogServices] = useState<ServiceCatalog[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  const [customerType, setCustomerType] = useState<'company' | 'user'>(invoice?.customer_type ?? 'company')
  const [companyId, setCompanyId] = useState(invoice?.company?.id ? String(invoice.company.id) : '')
  const [customerUserId, setCustomerUserId] = useState(invoice?.customer_user?.id ? String(invoice.customer_user.id) : '')
  const [salesEmployeeId, setSalesEmployeeId] = useState(invoice?.sold_by_employee?.id ? String(invoice.sold_by_employee.id) : '')
  const [contractId, setContractId] = useState(invoice?.contract?.id ? String(invoice.contract.id) : '')
  const [activeServiceId, setActiveServiceId] = useState(invoice?.active_service?.id ? String(invoice.active_service.id) : '')
  const [currency, setCurrency] = useState(invoice?.currency ?? 'AED')
  const [issueDate, setIssueDate] = useState(invoice?.issue_date ?? '')
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? '')
  const [discountAmount, setDiscountAmount] = useState(invoice?.discount_amount ?? '0')
  const [taxAmount, setTaxAmount] = useState(invoice?.tax_amount ?? '0')
  const [notes, setNotes] = useState(invoice?.notes ?? '')
  const [internalNotes, setInternalNotes] = useState(invoice?.internal_notes ?? '')
  const [terms, setTerms] = useState(invoice?.terms ?? '')
  const [items, setItems] = useState<FormItem[]>(
    invoice?.items?.length
      ? invoice.items.map((item) => ({
          description: item.description,
          service_catalog_id: item.service_catalog_id ? String(item.service_catalog_id) : '',
          service_name_snapshot: item.service_name_snapshot ?? '',
          service_details: item.service_details ?? '',
          service_start_date: item.service_start_date ?? '',
          service_end_date: item.service_end_date ?? '',
          booking_reference: item.booking_reference ?? '',
          supplier_id: item.supplier?.id ? String(item.supplier.id) : '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          purchase_unit_cost: item.purchase_unit_cost ?? '',
          purchase_currency: item.purchase_currency ?? 'USD',
          exchange_rate: item.exchange_rate ?? '1',
        }))
      : [{ ...EMPTY_ITEM }],
  )

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const [companyResponse, contractResponse, serviceResponse, userResponse, employeeResponse, supplierResponse, catalogResponse] = await Promise.all([
          listCompanies({
            page: 1,
            perPage: 500,
            search: '',
            status: '',
            relationship: '',
            countryCode: '',
            accountManagerId: '',
            sortBy: 'name',
            sortOrder: 'asc',
          }),
          listContracts({ page: 1, per_page: 500, search: '', sort_by: 'created_at', sort_order: 'desc' }),
          listActiveServices({ page: 1, per_page: 500, search: '', sort: 'created_at', direction: 'desc' }),
          listUsers({ page: 1, per_page: 500, sort: 'name', direction: 'asc' }),
          listEmployees({ page: 1, perPage: 500, search: '', status: 'active', department: 'Sales', managerId: '', sortBy: 'employee_code', sortOrder: 'asc' }),
          listSuppliers({ page: 1, per_page: 500 }),
          listServiceCatalog({ available_for_invoice: 1, active: 1 }),
        ])

        if (!mounted) return

        setCompanies(companyResponse.data)
        setContracts(contractResponse.data)
        setActiveServices(serviceResponse.data)
        setUsers(userResponse.data.filter((user) => user.roles.some((role) => (typeof role === 'string' ? role : role.name) === 'client')))
        setEmployees(employeeResponse.data.filter((employee) => employee.status === 'active' && employee.department === 'Sales'))
        setSuppliers(supplierResponse.data.filter((supplier) => supplier.status === 'active'))
        setCatalogServices(Array.isArray(catalogResponse.data) ? catalogResponse.data : [])
      } finally {
        if (mounted) setIsLoadingRelated(false)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (customerType === 'company') {
      setCustomerUserId('')
    } else {
      setCompanyId('')
      setContractId('')
      setActiveServiceId('')
    }
  }, [customerType])

  const visibleContracts = companyId
    ? contracts.filter((entry) => entry.company?.id === Number(companyId))
    : customerType === 'company'
      ? contracts
      : []

  const visibleActiveServices = activeServices.filter((entry) => {
    if (customerType !== 'company') return false
    if (companyId && entry.company.id !== Number(companyId)) return false
    if (contractId && entry.contract.id !== Number(contractId)) return false
    return true
  })

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unit_price), 0).toFixed(2),
    [items],
  )

  const estimatedCost = useMemo(
    () => items.reduce((sum, item) => sum + Number(safeLineCost(item.quantity, item.purchase_unit_cost, resolveExchangeRate(item, currency))), 0).toFixed(2),
    [items, currency],
  )

  const total = useMemo(
    () => (toNumber(subtotal) - toNumber(discountAmount) + toNumber(taxAmount)).toFixed(2),
    [subtotal, discountAmount, taxAmount],
  )

  const estimatedProfit = useMemo(
    () => (toNumber(total) - toNumber(estimatedCost)).toFixed(2),
    [estimatedCost, total],
  )

  function addItem() {
    setItems((current) => [...current, { ...EMPTY_ITEM }])
  }

  function removeItem(index: number) {
    setItems((current) => (current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current))
  }

  function updateItem(index: number, field: keyof FormItem, value: string) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      const itemPayload: InvoiceItemInput[] = items.map((item, index) => {
        const hasPurchaseCost = item.purchase_unit_cost.trim() !== ''

        return {
          description: item.description,
          service_catalog_id: item.service_catalog_id ? Number(item.service_catalog_id) : null,
          service_name_snapshot: item.service_name_snapshot.trim() || null,
          service_details: item.service_details || null,
          service_start_date: item.service_start_date || null,
          service_end_date: item.service_end_date || null,
          booking_reference: item.booking_reference || null,
          supplier_id: item.supplier_id ? Number(item.supplier_id) : null,
          quantity: toNumber(item.quantity),
          unit_price: toNumber(item.unit_price),
          purchase_unit_cost: hasPurchaseCost ? toNumber(item.purchase_unit_cost) : null,
          purchase_currency: hasPurchaseCost ? resolvePurchaseCurrency(item, currency) : null,
          exchange_rate: hasPurchaseCost ? toNumber(resolveExchangeRate(item, currency) || '1') : null,
          sort_order: index,
        }
      })

      const payload: CreateInvoiceInput = {
        customer_type: customerType,
        company_id: customerType === 'company' && companyId ? Number(companyId) : null,
        customer_user_id: customerType === 'user' && customerUserId ? Number(customerUserId) : null,
        sold_by_employee_id: salesEmployeeId ? Number(salesEmployeeId) : null,
        contract_id: customerType === 'company' && contractId ? Number(contractId) : null,
        active_service_id: customerType === 'company' && activeServiceId ? Number(activeServiceId) : null,
        currency,
        issue_date: issueDate || null,
        due_date: dueDate || null,
        discount_amount: toNumber(discountAmount),
        tax_amount: toNumber(taxAmount),
        notes: notes || null,
        internal_notes: internalNotes || null,
        terms: terms || null,
        items: itemPayload,
      }

      if (isEditing && invoice) {
        await updateInvoice(invoice.id, payload as UpdateInvoiceInput)
      } else {
        await createInvoice(payload)
      }

      onSuccess()
    } catch (error) {
      const resolved = error as { status?: number; message?: string; data?: { errors?: FieldErrors } }
      if (resolved.status === 422 && resolved.data?.errors) {
        setErrors(resolved.data.errors)
      } else {
        setErrors({ general: [resolved.message ?? 'Error saving invoice'] })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={cn(styles.employeeDialog, styles.companyDialog, styles.largeDialog)} role="dialog" aria-modal="true" aria-labelledby="invoice-dialog-title">
        <div className={styles.dialogHeader}>
          <div>
            <span>{copy.invoices}</span>
            <h2 id="invoice-dialog-title">{isEditing ? copy.editInvoiceTitle : copy.createInvoiceTitle}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}>
            <X aria-hidden="true" />
          </button>
        </div>

        {isLoadingRelated ? (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} aria-hidden="true" />
          </div>
        ) : (
          <form className={styles.companyForm} onSubmit={handleSubmit}>
            {errors.general ? <p className={styles.inlineAlert}>{errors.general[0]}</p> : null}

            <fieldset className={styles.formSection}>
              <legend>{copy.invoiceContext}</legend>
              <div className={styles.formSectionStack}>
                <div className={styles.invoiceThreeColumnGrid}>
                  <label className={styles.formField}>
                    <span>{labels.customerType}</span>
                    <select value={customerType} onChange={(event) => setCustomerType(event.target.value as 'company' | 'user')}>
                      <option value="company">{labels.companyCustomer}</option>
                      <option value="user">{labels.userCustomer}</option>
                    </select>
                  </label>

                  {customerType === 'company' ? (
                    <label className={styles.formField}>
                      <span>{copy.company} <em>{copy.required}</em></span>
                      <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} required aria-invalid={Boolean(errors.company_id)}>
                        <option value="">{copy.none}</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name} ({company.reference})
                          </option>
                        ))}
                      </select>
                      <FieldError name="company_id" errors={errors} />
                    </label>
                  ) : (
                    <label className={styles.formField}>
                      <span>{labels.clientUser} <em>{copy.required}</em></span>
                      <select value={customerUserId} onChange={(event) => setCustomerUserId(event.target.value)} required aria-invalid={Boolean(errors.customer_user_id)}>
                        <option value="">{copy.none}</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                      <FieldError name="customer_user_id" errors={errors} />
                    </label>
                  )}

                  <label className={styles.formField}>
                    <span>{labels.salesOwner}</span>
                    <select value={salesEmployeeId} onChange={(event) => setSalesEmployeeId(event.target.value)} aria-invalid={Boolean(errors.sold_by_employee_id)}>
                      <option value="">{copy.none}</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.user?.name ?? employee.employee_code} ({employee.employee_code})
                        </option>
                      ))}
                    </select>
                    <FieldError name="sold_by_employee_id" errors={errors} />
                  </label>

                  <label className={styles.formField}>
                    <span>{copy.contract}</span>
                    <select value={contractId} onChange={(event) => setContractId(event.target.value)} disabled={customerType !== 'company'} aria-invalid={Boolean(errors.contract_id)}>
                      <option value="">{copy.none}</option>
                      {visibleContracts.map((contract) => (
                        <option key={contract.id} value={contract.id}>
                          {contract.reference} - {contract.title}
                        </option>
                      ))}
                    </select>
                    <FieldError name="contract_id" errors={errors} />
                  </label>

                  <label className={styles.formField}>
                    <span>{copy.activeService}</span>
                    <select value={activeServiceId} onChange={(event) => setActiveServiceId(event.target.value)} disabled={customerType !== 'company'} aria-invalid={Boolean(errors.active_service_id)}>
                      <option value="">{copy.none}</option>
                      {visibleActiveServices.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.reference} - {service.title}
                        </option>
                      ))}
                    </select>
                    <FieldError name="active_service_id" errors={errors} />
                  </label>

                  <label className={styles.formField}>
                    <span>{copy.currency} <em>{copy.required}</em></span>
                    <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                      {CURRENCIES.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.formField}>
                    <span>{copy.issueDate}</span>
                    <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
                  </label>

                  <label className={styles.formField}>
                    <span>{copy.dueDate}</span>
                    <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                  </label>
                </div>
              </div>
            </fieldset>

            <fieldset className={styles.formSection}>
              <legend>{copy.invoiceItems}</legend>
              <div className={styles.formSectionStack}>
                {items.map((item, index) => {
                  const lineTotal = safeLineTotal(item.quantity, item.unit_price)
                  const purchaseCurrency = resolvePurchaseCurrency(item, currency)
                  const exchangeRate = resolveExchangeRate(item, currency)
                  const lineCost = safeLineCost(item.quantity, item.purchase_unit_cost, exchangeRate)
                  const lineProfit = (toNumber(lineTotal) - toNumber(lineCost)).toFixed(2)
                  const selectedService = catalogServices.find((service) => String(service.id) === item.service_catalog_id)
                  const itemTitle = item.service_name_snapshot.trim() || (selectedService ? formatServiceCatalogName(selectedService, locale) : fallbackItemTitle(index, locale))
                  const purchaseFxLabel = purchaseCurrency === currency ? labels.exchangeRate : `${labels.exchangeRate} (${purchaseCurrency} → ${currency})`

                  return (
                    <div key={`item-${index}`} className={styles.detailPanel}>
                      <div className={styles.sectionHeader}>
                        <div>
                          <span>{copy.invoice}</span>
                          <h2>{itemTitle}</h2>
                        </div>
                        <button type="button" className={styles.iconButton} onClick={() => removeItem(index)} aria-label={copy.delete}>
                          <X aria-hidden="true" />
                        </button>
                      </div>

                      <div className={styles.invoiceThreeColumnGrid}>
                        <label className={styles.formField}>
                          <span>{labels.service}</span>
                          <select value={item.service_catalog_id} onChange={(event) => updateItem(index, 'service_catalog_id', event.target.value)}>
                            <option value="">{copy.none}</option>
                            {catalogServices.map((svc) => (
                              <option key={svc.id} value={svc.id}>{formatServiceCatalogName(svc, locale)}</option>
                            ))}
                          </select>
                          <FieldError name={`items.${index}.service_catalog_id`} errors={errors} />
                        </label>

                        <label className={styles.formField}>
                          <span>{labels.serviceName}</span>
                          <input type="text" value={item.service_name_snapshot} onChange={(event) => updateItem(index, 'service_name_snapshot', event.target.value)} />
                        </label>

                        <label className={styles.formField}>
                          <span>{labels.supplier}</span>
                          <select value={item.supplier_id} onChange={(event) => updateItem(index, 'supplier_id', event.target.value)}>
                            <option value="">{copy.none}</option>
                            {suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.name} ({supplier.reference})
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className={styles.formField}>
                          <span>{labels.bookingReference}</span>
                          <input type="text" value={item.booking_reference} onChange={(event) => updateItem(index, 'booking_reference', event.target.value)} />
                        </label>

                        <label className={styles.formField}>
                          <span>{copy.quantity} <em>{copy.required}</em></span>
                          <input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} required />
                        </label>

                        <label className={styles.formField}>
                          <span>{copy.unitPrice} <em>{copy.required}</em></span>
                          <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => updateItem(index, 'unit_price', event.target.value)} required />
                        </label>
                        <label className={styles.formField}>
                          <span>{labels.purchaseCost}</span>
                          <input type="number" min="0" step="0.01" value={item.purchase_unit_cost} onChange={(event) => updateItem(index, 'purchase_unit_cost', event.target.value)} />
                        </label>

                        <label className={styles.formField}>
                          <span>{labels.purchaseCurrency}</span>
                          <select value={item.purchase_currency || currency} onChange={(event) => updateItem(index, 'purchase_currency', event.target.value)}>
                            {CURRENCIES.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>

                        <label className={styles.formField}>
                          <span>{purchaseFxLabel}</span>
                          <input
                            type="number"
                            min="0.000001"
                            step="0.000001"
                            value={exchangeRate}
                            onChange={(event) => updateItem(index, 'exchange_rate', event.target.value)}
                            disabled={purchaseCurrency === currency}
                          />
                          {purchaseCurrency === currency ? <p className={styles.fieldHint}>{labels.sameCurrencyFxRate}</p> : null}
                        </label>

                        <div className={styles.readOnlyField}>
                          <strong className={styles.readOnlyValue}>{copy.lineTotal}: {formatCurrencyAmount(lineTotal, currency, locale)}</strong>
                          <div className={styles.readOnlyMeta}>
                            <span>{labels.estimatedCost}: {formatCurrencyAmount(lineCost, currency, locale)}</span>
                            <span>{labels.estimatedProfit}: {formatCurrencyAmount(lineProfit, currency, locale)}</span>
                          </div>
                        </div>

                        <label className={cn(styles.formField, styles.invoiceWideField)}>
                          <span>{copy.description} <em>{copy.required}</em></span>
                          <input type="text" value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} required />
                          <FieldError name={`items.${index}.description`} errors={errors} />
                        </label>

                        <label className={styles.formField}>
                          <span>{labels.serviceDates}</span>
                          <div className={styles.formGrid}>
                            <input type="date" value={item.service_start_date} onChange={(event) => updateItem(index, 'service_start_date', event.target.value)} />
                            <input type="date" value={item.service_end_date} onChange={(event) => updateItem(index, 'service_end_date', event.target.value)} />
                          </div>
                        </label>
                      </div>

                      <label className={styles.formField}>
                        <span>{labels.serviceDetails}</span>
                        <textarea rows={3} value={item.service_details} onChange={(event) => updateItem(index, 'service_details', event.target.value)} />
                      </label>
                    </div>
                  )
                })}

                <div>
                  <button type="button" className={styles.secondaryButton} onClick={addItem}>
                    <Plus aria-hidden="true" />
                    {copy.addItem}
                  </button>
                </div>
              </div>
            </fieldset>

            <fieldset className={styles.formSection}>
              <legend>{copy.invoiceAdjustments}</legend>
              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span>{copy.discount}</span>
                  <input type="number" min="0" step="0.01" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} />
                </label>
                <label className={styles.formField}>
                  <span>{copy.tax}</span>
                  <input type="number" min="0" step="0.01" value={taxAmount} onChange={(event) => setTaxAmount(event.target.value)} />
                </label>
              </div>

              <div className={styles.readOnlyField}>
                <strong className={styles.readOnlyValue}>{copy.total}: {formatCurrencyAmount(total, currency, locale)}</strong>
                <div className={styles.readOnlyMeta}>
                  <span>{copy.subtotal}: {formatCurrencyAmount(subtotal, currency, locale)}</span>
                  <span>{labels.estimatedCost}: {formatCurrencyAmount(estimatedCost, currency, locale)}</span>
                  <span>{labels.estimatedProfit}: {formatCurrencyAmount(estimatedProfit, currency, locale)}</span>
                </div>
              </div>
            </fieldset>

            <fieldset className={styles.formSection}>
              <legend>{copy.invoiceTermsNotes}</legend>
              <div className={styles.formSectionStack}>
                <label className={styles.formField}>
                  <span>{copy.notes}</span>
                  <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
                </label>
                <label className={styles.formField}>
                  <span>{labels.internalNotes}</span>
                  <textarea rows={4} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
                </label>
                <label className={styles.formField}>
                  <span>{labels.terms}</span>
                  <textarea rows={4} value={terms} onChange={(event) => setTerms(event.target.value)} />
                </label>
              </div>
            </fieldset>

            {isEditing && invoice ? (
              <div className={styles.readOnlyField}>
                <strong className={styles.readOnlyValue}>{labels.customer}: {formatCustomerLabel(invoice)}</strong>
                <div className={styles.readOnlyMeta}>
                  <span dir="ltr">{invoice.reference}</span>
                  <span>{invoice.status}</span>
                </div>
              </div>
            ) : null}

            <div className={styles.dialogActions}>
              <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>{copy.cancel}</button>
              <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                {isSubmitting ? copy.saving : copy.save}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

function FieldError({
  name,
  errors,
}: {
  name: string
  errors: FieldErrors
}) {
  const message = errors[name]?.[0]
  return message ? <small className={styles.inlineAlert}>{message}</small> : null
}
