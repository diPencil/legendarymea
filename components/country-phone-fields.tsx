'use client'

import { Combobox } from '@base-ui/react/combobox'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { countryPhoneData, type CountryPhoneRecord } from '@/lib/country-phone-data'

type CountryPhoneFieldsProps = {
  isAr: boolean
  countryLabel: string
  phoneLabel: string
  children?: ReactNode
  variant?: 'contact' | 'dashboard'
  countryCode?: string
  onCountryCodeChange?: (code: string) => void
  phoneValue?: string
  onPhoneChange?: (phone: string) => void
  fieldClassName?: string
}

function findCountryRecord(value?: string | null) {
  if (!value) return null
  return countryPhoneData.find((country) => country.dialCode === value || country.iso === value) || null
}

function normalizeArabic(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
}

function normalizeSearch(value: string) {
  return normalizeArabic(value)
    .toLocaleLowerCase('en')
    .replace(/[\s\-_.()/]/g, '')
}

function toAsciiDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
}

function normalizeLocalPhone(value: string) {
  return toAsciiDigits(value).replace(/\D/g, '')
}

export function CountryPhoneFields({ 
  isAr, 
  countryLabel, 
  phoneLabel, 
  children,
  variant = 'contact',
  countryCode,
  onCountryCodeChange,
  phoneValue,
  onPhoneChange,
  fieldClassName
}: CountryPhoneFieldsProps) {
  const [country, setCountry] = useState<CountryPhoneRecord | null>(() => {
    return findCountryRecord(countryCode)
  })
  const [localPhone, setLocalPhone] = useState(phoneValue || '')
  const locale = isAr ? 'ar' : 'en'
  const isDashboard = variant === 'dashboard'

  const completePhone = useMemo(() => {
    const localDigits = normalizeLocalPhone(localPhone)
    return country && localDigits ? `${country.dialCode}${localDigits}` : ''
  }, [country, localPhone])

  const handleCountryChange = (record: CountryPhoneRecord | null) => {
    setCountry(record)
    onCountryCodeChange?.(record?.dialCode ?? '')
  }

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^0-9٠-٩۰-۹\s().-]/g, '')
    setLocalPhone(cleaned)
    if (onPhoneChange) {
      onPhoneChange(cleaned)
    }
  }

  const countryName = (record: CountryPhoneRecord) => isAr ? record.nameAr : record.nameEn
  const countrySearch = (record: CountryPhoneRecord, query: string) => {
    const normalizedQuery = normalizeSearch(query)
    if (!normalizedQuery) return true

    return [record.nameEn, record.nameAr, record.iso, record.dialCode]
      .some(value => normalizeSearch(value).includes(normalizedQuery))
  }

  const countryWrapperClass = isDashboard ? fieldClassName : "contact-country-field"
  const phoneWrapperClass = isDashboard ? fieldClassName : "contact-phone-field"

  // If we have an unknown country code that didn't match our dataset, preserve it for display.
  const displayDialCode = country?.dialCode ?? countryCode ?? '—'

  useEffect(() => {
    setCountry(findCountryRecord(countryCode))
  }, [countryCode])

  useEffect(() => {
    setLocalPhone(phoneValue || '')
  }, [phoneValue])

  return (
    <>
      <div className={countryWrapperClass}>
        {isDashboard ? (
          <span>{countryLabel}</span>
        ) : (
          <label className="label-text" htmlFor="contact-country">{countryLabel}</label>
        )}
        <Combobox.Root<CountryPhoneRecord>
          key={locale}
          name="country"
          items={countryPhoneData}
          value={country}
          onValueChange={handleCountryChange}
          filter={countrySearch}
          itemToStringLabel={countryName}
          itemToStringValue={record => record.iso}
          isItemEqualToValue={(record, selected) => record.iso === selected.iso}
          autoHighlight
          locale={locale}
        >
          <Combobox.InputGroup className="country-combobox-control" data-variant={variant}>
            <Search className="country-search-icon" size={17} aria-hidden="true" />
            <Combobox.Input
              id="contact-country"
              className="country-combobox-input"
              placeholder={isAr ? 'اختر الدولة أو ابحث عنها' : 'Select or search country'}
              autoComplete="off"
              aria-label={countryLabel}
            />
            <Combobox.Trigger className="country-combobox-trigger" aria-label={isAr ? 'فتح قائمة الدول' : 'Open country list'}>
              <ChevronDown size={18} aria-hidden="true" />
            </Combobox.Trigger>
          </Combobox.InputGroup>
          <Combobox.Portal>
            <Combobox.Positioner className="country-combobox-positioner" sideOffset={7} align="start">
              <Combobox.Popup className="country-combobox-popup" dir={isAr ? 'rtl' : 'ltr'}>
                <div className="country-combobox-heading">
                  {isAr ? 'ابحث باسم الدولة أو رمز الاتصال' : 'Search country or calling code'}
                </div>
                <Combobox.Empty className="country-combobox-empty">
                  {isAr ? 'لا توجد دولة مطابقة' : 'No matching country'}
                </Combobox.Empty>
                <Combobox.List className="country-combobox-list">
                  {(record: CountryPhoneRecord, index: number) => (
                    <Combobox.Item key={record.iso} value={record} index={index} className="country-combobox-item">
                      <span className="country-option-name">{countryName(record)}</span>
                      <span className="country-option-meta" dir="ltr">
                        <span>{record.iso}</span>
                        <b>{record.dialCode}</b>
                      </span>
                      <Combobox.ItemIndicator className="country-option-check">
                        <Check size={16} aria-hidden="true" />
                      </Combobox.ItemIndicator>
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      </div>

      {children}

      <label className={phoneWrapperClass} htmlFor="contact-phone-local">
        {isDashboard ? (
          <span>{phoneLabel}</span>
        ) : (
          <span className="label-text">{phoneLabel}</span>
        )}
        <span className="contact-phone-control" dir="ltr" data-variant={variant}>
          <span className={`contact-phone-prefix ${(country || countryCode) ? 'has-country' : ''}`} aria-label={isAr ? 'رمز الاتصال الدولي' : 'International calling code'}>
            {displayDialCode}
          </span>
          <input
            id="contact-phone-local"
            className="contact-phone-local"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={localPhone}
            onChange={event => handlePhoneChange(event.target.value)}
            placeholder={(country || countryCode) ? (isAr ? 'رقم الهاتف بدون رمز الدولة' : 'Local phone number') : (isAr ? 'اختر الدولة أولًا' : 'Select country first')}
            aria-label={isAr ? 'رقم الهاتف المحلي' : 'Local phone number'}
          />
          {!isDashboard && <input type="hidden" name="phone" value={completePhone} />}
        </span>
      </label>
    </>
  )
}
