'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const sizeClasses = {
  md: {
    button: 'h-11 gap-2.5 rounded-2xl px-3',
    icon: 'h-4 w-4',
    menuOffset: 'top-[calc(100%+0.4rem)]',
    option: 'px-3 py-2',
  },
  lg: {
    button: 'h-[3.25rem] gap-3 rounded-2xl px-4',
    icon: 'h-4 w-4',
    menuOffset: 'top-[calc(100%+0.5rem)]',
    option: 'px-4 py-2.5',
  },
  form: {
    button: 'h-12 gap-3 rounded-2xl px-4',
    icon: 'h-4 w-4',
    menuOffset: 'top-[calc(100%+0.5rem)]',
    option: 'px-4 py-2.5',
  },
  square: {
    button: 'h-11 min-w-0 justify-center rounded-2xl p-0',
    icon: 'h-4.5 w-4.5',
    menuOffset: 'top-[calc(100%+0.45rem)]',
    option: 'px-4 py-2.5',
  },
};

const surfaceClasses = {
  white: {
    closed: 'border-slate-200 bg-white hover:border-[#c2cbea]',
    open: 'border-[#2f84c0] bg-white ring-4 ring-[#d8def2]',
  },
  muted: {
    closed: 'border-slate-200 bg-slate-50/80 hover:border-[#c2cbea] hover:bg-white',
    open: 'border-[#2f84c0] bg-white ring-4 ring-[#d8def2]',
  },
};

export default function FilterDropdown({
  icon: Icon,
  options,
  value,
  onChange,
  ariaLabel,
  size = 'lg',
  surface = 'muted',
  iconClassName = 'text-slate-400',
  iconOnly = false,
  active = false,
  menuAlign = 'left',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];
  const sizeConfig = sizeClasses[size] || sizeClasses.lg;
  const surfaceConfig = surfaceClasses[surface] || surfaceClasses.muted;
  const menuPositionClass = iconOnly
    ? `${menuAlign === 'right' ? 'right-0' : 'left-0'} w-64`
    : 'left-0 right-0';

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative z-30 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        className={`flex w-full items-center border text-left text-sm font-bold text-slate-700 outline-none transition-all ${
          sizeConfig.button
        } ${isOpen ? surfaceConfig.open : active ? 'border-[#9eaddd] bg-[#eef3ff] text-[#122361]' : surfaceConfig.closed}`}
        title={iconOnly ? selectedOption?.label : undefined}
      >
        {Icon && <Icon className={`${sizeConfig.icon} shrink-0 ${iconClassName}`} />}
        {iconOnly ? (
          <span className="sr-only">{selectedOption?.label}</span>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate">{selectedOption?.label}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className={`absolute ${menuPositionClass} ${sizeConfig.menuOffset} z-50 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.08)]`}>
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center rounded-xl text-left text-sm font-semibold transition-all ${sizeConfig.option} ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#243b8e] to-[#2f84c0] text-white shadow-sm'
                    : 'text-slate-700 hover:bg-[#eef3ff] hover:text-[#122361]'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
