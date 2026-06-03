'use client';

import { DayPicker, type DateRange } from 'react-day-picker';
import { es, enUS } from 'date-fns/locale';
import { useState, useRef, useEffect } from 'react';

import { formatDateShort } from '@/lib/format';
import 'react-day-picker/style.css';

import styles from './DateRangePicker.module.css';

interface DateRangePickerProps {
  locale: 'es' | 'en';
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  labels: { checkIn: string; checkOut: string };
  minDate?: Date;
}

export function DateRangePicker({
  locale,
  value,
  onChange,
  labels,
  minDate = new Date(),
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className={styles.cell}>
          <span className={styles.cellLabel}>{labels.checkIn}</span>
          <span className={styles.cellValue}>
            {value?.from ? formatDateShort(value.from, locale) : '—'}
          </span>
        </div>
        <div className={styles.divider} aria-hidden="true" />
        <div className={styles.cell}>
          <span className={styles.cellLabel}>{labels.checkOut}</span>
          <span className={styles.cellValue}>
            {value?.to ? formatDateShort(value.to, locale) : '—'}
          </span>
        </div>
      </button>

      {open && (
        <div className={styles.popover}>
          <DayPicker
            mode="range"
            selected={value}
            onSelect={onChange}
            locale={locale === 'en' ? enUS : es}
            disabled={{ before: minDate }}
            numberOfMonths={1}
            weekStartsOn={1}
          />
        </div>
      )}
    </div>
  );
}
