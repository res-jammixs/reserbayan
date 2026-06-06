'use client';
import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { X, Mail, Lock, FileText, CheckCircle, Eye, EyeOff, Calendar, ChevronDown } from 'lucide-react';
import NotificationModal from '@/app/components/NotificationModal';

// --- Sorted and Title Cased Sitios ---
const SITIO_OPTIONS = [
  "Aco", "Adelfa", "Campar", "Cyo", "Dons Valley", "Honey Homes",
  "Itamda", "J. Tabura", "Kabulihan", "Kawayan", "La Familia",
  "Lower Lusimba", "Lower Tabucanal", "Mahayahay 1", "Middle Tabucanal",
  "Molave", "Nalupi", "Panas", "Papa Chapel", "Pob. Pardo Proper",
  "Sagrada", "Sto. Niño", "Sunrise", "Upper Tabucanal", "Villa Bayabas"
];

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

const REGION_OPTIONS = [{ value: 'Region VII', label: 'Region VII' }];
const PROVINCE_OPTIONS = [{ value: 'Cebu', label: 'Cebu' }];
const CITY_OPTIONS = [{ value: 'Cebu City', label: 'Cebu City' }];
const BARANGAY_OPTIONS = [{ value: 'Pardo (Pob.)', label: 'Pardo (Pob.)' }];
const SITIO_SELECT_OPTIONS = SITIO_OPTIONS.map((option) => ({ value: option, label: option }));

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(value) {
  if (!value) return 'mm/dd/yyyy';
  const [year, month, day] = value.split('-');
  return `${month}/${day}/${year}`;
}

function CustomDatePicker({ id, value, onChange, maxDate, required = false }) {
  const pickerRef = useRef(null);
  const maxDateObject = new Date(`${maxDate}T00:00:00`);
  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate || maxDateObject);
  const [pickerMode, setPickerMode] = useState('days');

  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startYear = maxDateObject.getFullYear() - 100;
  const years = Array.from({ length: 101 }, (_, index) => maxDateObject.getFullYear() - index);
  const firstDayOfMonth = new Date(year, month, 1);
  const firstCalendarDate = new Date(firstDayOfMonth);
  firstCalendarDate.setDate(firstCalendarDate.getDate() - firstDayOfMonth.getDay());

  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCalendarDate);
    date.setDate(firstCalendarDate.getDate() + index);
    return date;
  });

  const changeMonth = (offset) => {
    setPickerMode('days');
    setViewDate((currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const updateMonth = (monthIndex) => {
    setViewDate((currentDate) => new Date(currentDate.getFullYear(), monthIndex, 1));
    setPickerMode('days');
  };

  const updateYear = (selectedYear) => {
    setViewDate((currentDate) => {
      const nextMonth = selectedYear === maxDateObject.getFullYear()
        ? Math.min(currentDate.getMonth(), maxDateObject.getMonth())
        : currentDate.getMonth();

      return new Date(selectedYear, nextMonth, 1);
    });
    setPickerMode('months');
  };

  return (
    <div ref={pickerRef} className="relative">
      <input
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        required={required}
        onChange={() => {}}
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-expanded={isOpen}
        className={`flex h-11 w-full items-center gap-3 rounded-2xl border bg-gradient-to-r from-white to-[#eef3ff]/40 px-4 text-left text-base shadow-sm outline-none transition-all ${
          isOpen
            ? 'border-[#2f84c0] ring-4 ring-[#d8def2]'
            : 'border-slate-200 hover:border-[#c2cbea]'
        } ${value ? 'text-slate-900' : 'text-slate-400'}`}
      >
        <Calendar className="h-5 w-5 shrink-0 text-[#2f84c0]" />
        <span className="flex-1">{formatDateForDisplay(value)}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[90] w-[19rem] overflow-hidden rounded-3xl bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => changeMonth(-1)} className="rounded-full p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#122361]">
              <ChevronDown className="h-5 w-5 rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => setPickerMode((currentMode) => currentMode === 'days' ? 'months' : 'days')}
              className="rounded-full px-3 py-1.5 text-sm font-extrabold text-slate-800 transition-all hover:bg-[#eef3ff] hover:text-[#122361]"
            >
              {MONTH_NAMES[month]} {year}
            </button>
            <button type="button" onClick={() => changeMonth(1)} className="rounded-full p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#122361]">
              <ChevronDown className="h-5 w-5 -rotate-90" />
            </button>
          </div>

          {pickerMode === 'days' && (
            <>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
                {WEEKDAY_LABELS.map((weekday) => (
                  <span key={weekday} className="py-1">{weekday}</span>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {calendarDays.map((date) => {
                  const dateValue = formatDateForInput(date);
                  const isCurrentMonth = date.getMonth() === month;
                  const isSelected = value === dateValue;
                  const isDisabled = date > maxDateObject;

                  return (
                    <button
                      key={dateValue}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        onChange(dateValue);
                        setIsOpen(false);
                      }}
                      className={`h-9 rounded-xl text-sm font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#243b8e] text-white shadow-sm shadow-[#d8def2]'
                          : isDisabled
                            ? 'cursor-not-allowed text-slate-300'
                            : isCurrentMonth
                              ? 'text-slate-700 hover:bg-[#eef3ff] hover:text-[#122361]'
                              : 'text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {pickerMode === 'months' && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setPickerMode('years')}
                className="mb-3 w-full rounded-2xl bg-[#eef3ff] px-3 py-2 text-sm font-extrabold text-[#122361] transition-all hover:bg-[#d8def2]"
              >
                Change year: {year}
              </button>
              <div className="grid grid-cols-3 gap-2">
                {MONTH_NAMES.map((monthName, monthIndex) => {
                  const isDisabled = year === maxDateObject.getFullYear() && monthIndex > maxDateObject.getMonth();
                  const isSelected = monthIndex === month;

                  return (
                    <button
                      key={monthName}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => updateMonth(monthIndex)}
                      className={`rounded-2xl px-3 py-2 text-sm font-bold transition-all ${
                        isSelected
                          ? 'bg-[#243b8e] text-white shadow-sm shadow-[#d8def2]'
                          : isDisabled
                            ? 'cursor-not-allowed bg-slate-50 text-slate-300'
                            : 'bg-slate-50 text-slate-700 hover:bg-[#eef3ff] hover:text-[#122361]'
                      }`}
                    >
                      {monthName.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {pickerMode === 'years' && (
            <div className="mt-4 max-h-72 overflow-y-auto pr-1">
              <div className="grid grid-cols-4 gap-2">
                {years.map((yearOption) => {
                  const isSelected = yearOption === year;

                  return (
                    <button
                      key={yearOption}
                      type="button"
                      disabled={yearOption < startYear}
                      onClick={() => updateYear(yearOption)}
                      className={`rounded-2xl px-3 py-2 text-sm font-bold transition-all ${
                        isSelected
                          ? 'bg-[#243b8e] text-white shadow-sm shadow-[#d8def2]'
                          : 'bg-slate-50 text-slate-700 hover:bg-[#eef3ff] hover:text-[#122361]'
                      }`}
                    >
                      {yearOption}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {pickerMode === 'days' && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-full px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(maxDate);
                setIsOpen(false);
              }}
              className="rounded-full bg-[#eef3ff] px-3 py-1.5 text-sm font-bold text-[#122361] hover:bg-[#d8def2]"
            >
              Today
            </button>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

function CustomSelect({ id, value, onChange, placeholder, options, required = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={selectRef} className="relative">
      <input
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        required={required}
        onChange={() => {}}
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-expanded={isOpen}
        className={`flex h-11 w-full items-center gap-3 rounded-2xl border bg-white px-4 text-left text-base shadow-sm outline-none transition-all ${
          isOpen
            ? 'border-[#2f84c0] ring-4 ring-[#d8def2]'
            : 'border-slate-200 hover:border-[#c2cbea]'
        } ${selectedOption ? 'text-slate-900' : 'text-slate-400'}`}
      >
        <span className="min-w-0 flex-1 truncate">{selectedOption?.label || placeholder}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-[80] overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
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
                className={`flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#243b8e] to-[#2f84c0] text-white'
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

export default function SignUpContainer({ onClose }) {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('login'); 
  const [employmentFile, setEmploymentFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // --- Form States ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');

  // Login Specific States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Dropdown States
  const [gender, setGender] = useState('');
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [barangay, setBarangay] = useState('');
  const [sitio, setSitio] = useState('');
  
  // Validation States
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [notificationModal, setNotificationModal] = useState(null);
  const [fileError, setFileError] = useState('');

  // --- STYLES ---
  const inputHeight = `h-11`; 
  const inputStyle = `pl-11 text-base ${inputHeight} bg-white rounded-2xl border-slate-200 shadow-sm focus-visible:ring-4 focus-visible:ring-[#d8def2] focus-visible:border-[#2f84c0]`; 
  const iconStyle = `absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5`; 
  const labelStyle = `block text-base font-medium text-gray-700 mb-2`; 
  
  const clearEmploymentFile = () => {
    setEmploymentFile(null);
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- VALIDATION HELPERS ---
  const validatePassword = (pwd) => {
    const hasMinLength = pwd.length >= 8;
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecialChar = /[^A-Za-z0-9\s]/.test(pwd);
    return hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;
  };

  // --- HANDLERS ---
  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    setIsPasswordValid(validatePassword(pwd));
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  const handlePhoneChange = (e) => {
    const input = e.target.value;
    const numbersOnly = input.replace(/\D/g, '');

    if (numbersOnly.length <= 11) {
      setPhone(numbersOnly);
      if (numbersOnly.length > 0) {
        if (!numbersOnly.startsWith('09')) {
          setPhoneError('Must start with 09');
        } else if (numbersOnly.length < 11) {
          setPhoneError('Must be 11 digits');
        } else {
          setPhoneError('');
        }
      } else {
        setPhoneError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");

    if (activeTab === 'login') {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            identifier: loginEmail,
            password: loginPassword 
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (data.success) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem("role", data.role);
          if (data.userType) localStorage.setItem("userType", data.userType);

          window.dispatchEvent(new CustomEvent('userLogin'));
          onClose();

          if (data.role === 'SUPER_ADMIN') {
             window.location.href = '/superadmin/dashboard';
          } else if (data.role === 'ADMIN') {
             window.location.href = '/admin/dashboard';
          } else {
             sessionStorage.setItem('showDashboardAnnouncementModal', 'true');
             window.location.href = '/dashboard';
          }
        } else {
          setLoginError(data.message || "Account not found or password is incorrect. Please check your login details.");
        }
      } catch (error) {
        setLoginError("We could not connect to the server. Please try again in a moment.");
      } finally {
        setLoading(false);
      }
    } else {
      // --- SIGN UP LOGIC ---
      if (!isPasswordValid) {
        setNotificationModal({ type: 'warning', title: 'Invalid Password', message: 'Please ensure your password meets all requirements.' });
        setLoading(false); return;
      }
      if (password !== confirmPassword) {
        setNotificationModal({ type: 'warning', title: 'Password Mismatch', message: 'Passwords do not match.' });
        setLoading(false); return;
      }
      if (phoneError || phone.length !== 11 || !phone.startsWith('09')) {
        setNotificationModal({ type: 'warning', title: 'Invalid Phone Number', message: 'Please enter a valid Philippine mobile number (e.g., 0917xxxxxxx).' });
        setLoading(false); return;
      }
      if (!employmentFile) {
        setNotificationModal({ type: 'warning', title: 'Valid ID Required', message: 'Please upload a valid government-issued ID image.' });
        setLoading(false); return;
      }
      if (fileError) {
        setNotificationModal({ type: 'warning', title: 'Invalid File', message: fileError });
        setLoading(false); return;
      }

      const formData = new FormData();
      formData.append('userType', 'user');
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('middleName', middleName);
      formData.append('birthDate', birthDate); 
      formData.append('email', email);
      formData.append('password', password);
      formData.append('phoneNumber', phone);
      formData.append('region', region);
      formData.append('province', province);
      formData.append('city', city);
      formData.append('barangay', barangay);
      formData.append('sitio', sitio);
      formData.append('addressLine1', addressLine1);
      formData.append('gender', gender);

      if (employmentFile) formData.append('validId', employmentFile);

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.success) {
          setNotificationModal({ type: 'success', title: 'Registration Successful', message: 'Your account is pending approval.', autoClose: true, autoCloseDelay: 5000 });
          setActiveTab('login');
        } else {
          if (data.message && (data.message.includes('Email already registered') || data.message.includes('already exists'))) {
            setEmailError(data.message);
          } else {
            setNotificationModal({ type: 'error', title: 'Registration Failed', message: data.message || 'Registration failed' });
          }
        }
      } catch (error) {
        setNotificationModal({ type: 'error', title: 'Network Error', message: 'Please try again.' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      clearEmploymentFile();
      return;
    }

    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      const fileType = file.type.toLowerCase();
      
      if (!allowedTypes.includes(fileType)) {
        setFileError('Invalid file type. Only PNG, JPG, and JPEG files are allowed.');
        setEmploymentFile(null);
        // Clear the input
        e.target.value = '';
        return;
      }
      
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setFileError('File size too large. Maximum size is 5MB.');
        setEmploymentFile(null);
        e.target.value = '';
        return;
      }
      
      setFileError('');
      setEmploymentFile(file);
    }
  };

  useEffect(() => {
    const handleSwitchToLogin = () => setActiveTab('login');
    const handleSwitchToSignup = () => setActiveTab('signup');
    window.addEventListener('switchToLogin', handleSwitchToLogin);
    window.addEventListener('switchToSignup', handleSwitchToSignup);
    return () => {
      window.removeEventListener('switchToLogin', handleSwitchToLogin);
      window.removeEventListener('switchToSignup', handleSwitchToSignup);
    };
  }, []);

  const maxDate = new Date().toISOString().split("T")[0];
  const formVariants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
        staggerChildren: 0.035,
        delayChildren: 0.02,
      },
    },
    exit: {
      opacity: 0,
      y: -6,
      transition: { duration: 0.14, ease: 'easeIn' },
    },
  };
  const fieldVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  };

  return (
    <div className={`bg-white border-gray-200 border rounded-2xl shadow-sm p-6 md:p-7 w-full max-w-[820px] mx-auto md:mx-0 relative max-h-[90vh] overflow-y-auto flex flex-col`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      
      <style jsx>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>

      <button onClick={onClose} className={`absolute top-6 right-6 transition-colors text-gray-400 hover:text-gray-600`} aria-label="Close form">
        <X size={28} />
      </button>

      <div className="mb-4 flex flex-col items-center justify-center gap-2 pr-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Image
            src="/reserbayan-logo.png"
            alt="ReserBayan logo"
            width={30}
            height={30}
            className="h-10 w-10 object-contain"
            priority
          />
          <span className="text-2xl font-bold text-[#122361]">ReserBayan</span>
        </div>
      </div>

    

      <div className="flex justify-center gap-10 mb-5 font-semibold text-xl flex-shrink-0">
        <button onClick={() => setActiveTab('login')} className={`pb-3 px-4 transition-colors ${activeTab === 'login' ? 'text-[#243b8e] border-b-4 border-[#243b8e]' : `text-gray-400 hover:text-[#243b8e]`}`}>Log In</button>
        <button onClick={() => setActiveTab('signup')} className={`pb-3 px-4 transition-colors ${activeTab === 'signup' ? 'text-[#243b8e] border-b-4 border-[#243b8e]' : `text-gray-400 hover:text-[#243b8e]`}`}>Sign Up</button>
      </div>

      <AnimatePresence mode="wait">
      {/* --- LOGIN FORM: Vertically Centered with Tighter Spacing --- */}
      {activeTab === 'login' && (
        <motion.div
          key="login"
          variants={formVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="flex flex-col justify-center flex-grow py-1 max-w-[520px] w-full mx-auto"
        >
          {/* Reduced space-y-8 to space-y-5 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {loginError && (
              <div
                className="relative z-20 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-left shadow-sm"
                role="alert"
                aria-live="polite"
              >
                <p className="text-sm font-bold leading-6 text-red-700">{loginError}</p>
              </div>
            )}

             <motion.div variants={fieldVariants} className="space-y-1">
              <label htmlFor="login-email" className={labelStyle}>Email or Username</label>
              <div className="relative">
                <Mail className={iconStyle} />
                <Input 
                  id="login-email" 
                  type="text" 
                  placeholder="Enter your email or username" 
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  className={inputStyle} 
                  required 
                />
              </div>
            </motion.div>
            
            <motion.div variants={fieldVariants} className="space-y-1">
              <label htmlFor="login-password" className={labelStyle}>Password</label>
              <div className="relative">
                <Lock className={iconStyle} />
                <Input 
                  id="login-password" 
                  type={showLoginPassword ? "text" : "password"} 
                  placeholder="Enter your password" 
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  className={`${inputStyle} pr-10`} 
                  required 
                />
                <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </motion.div>

            <motion.div variants={fieldVariants} className="pt-4">
              <Button type="submit" className={`w-full bg-[#243b8e] hover:bg-[#122361] text-white font-bold rounded-xl ${inputHeight} text-lg shadow-sm transition-all`} disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </Button>
            </motion.div>
            
            <motion.div variants={fieldVariants} className="text-center pt-4">
              <p className={`text-base text-gray-500`}>Don't have an account? <button type="button" onClick={() => setActiveTab('signup')} className="text-[#243b8e] font-bold hover:underline ml-1">Sign Up</button></p>
            </motion.div>
          </form>
        </motion.div>
      )}

      {/* --- SIGN UP FORM --- */}
      {activeTab === 'signup' && (
        <motion.form
          key="signup"
          variants={formVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div className="space-y-4">
              <motion.div variants={fieldVariants}>
                <label htmlFor="first-name" className={labelStyle}>First Name</label>
                <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={inputStyle} required />
              </motion.div>
              <motion.div variants={fieldVariants}>
                <label htmlFor="middle-name" className={labelStyle}>Middle Name <span className={`text-gray-400 font-normal ml-1`}>(Optional)</span></label>
                <Input id="middle-name" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Middle name" className={inputStyle} />
              </motion.div>
              <motion.div variants={fieldVariants}>
                <label htmlFor="last-name" className={labelStyle}>Last Name</label>
                <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className={inputStyle} required />
              </motion.div>
            </div>

            <div className="space-y-4">
              <motion.div variants={fieldVariants}>
                <label htmlFor="gender" className={labelStyle}>Gender</label>
                <CustomSelect
                  id="gender"
                  value={gender}
                  onChange={setGender}
                  placeholder="Select"
                  options={GENDER_OPTIONS}
                  required
                />
              </motion.div>
              <motion.div variants={fieldVariants}>
                <label htmlFor="birthdate" className={labelStyle}>Date of Birth</label>
                <CustomDatePicker
                  id="birthdate"
                  value={birthDate}
                  onChange={setBirthDate}
                  maxDate={maxDate}
                  required
                />
              </motion.div>
              <motion.div variants={fieldVariants}>
                <label htmlFor="phone" className={labelStyle}>Phone Number</label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="0917xxxxxxx" 
                  value={phone} 
                  onChange={handlePhoneChange}
                  className={`${inputStyle} ${phoneError ? 'border-red-500 focus:border-red-500' : ''}`} 
                  required 
                />
                {phoneError && (<p className="text-sm text-red-600 mt-2">{phoneError}</p>)}
              </motion.div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
             <motion.div variants={fieldVariants}>
              <label htmlFor="region" className={labelStyle}>Region</label>
              <CustomSelect
                id="region"
                value={region}
                onChange={setRegion}
                placeholder="Select Region"
                options={REGION_OPTIONS}
                required
              />
            </motion.div>
            <motion.div variants={fieldVariants}>
              <label htmlFor="province" className={labelStyle}>Province</label>
              <CustomSelect
                id="province"
                value={province}
                onChange={setProvince}
                placeholder="Select Province"
                options={PROVINCE_OPTIONS}
                required
              />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
             <motion.div variants={fieldVariants}>
              <label htmlFor="city" className={labelStyle}>City/Municipality</label>
              <CustomSelect
                id="city"
                value={city}
                onChange={setCity}
                placeholder="Select City"
                options={CITY_OPTIONS}
                required
              />
            </motion.div>
            <motion.div variants={fieldVariants}>
              <label htmlFor="barangay" className={labelStyle}>Barangay</label>
              <CustomSelect
                id="barangay"
                value={barangay}
                onChange={setBarangay}
                placeholder="Select Barangay"
                options={BARANGAY_OPTIONS}
                required
              />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <motion.div variants={fieldVariants}>
              <label htmlFor="sitio" className={labelStyle}>Sitio</label>
              <CustomSelect
                id="sitio"
                value={sitio}
                onChange={setSitio}
                placeholder="Select Sitio"
                options={SITIO_SELECT_OPTIONS}
                required
              />
            </motion.div>

            <motion.div variants={fieldVariants}>
              <label htmlFor="address-line-1" className={labelStyle}>Address Line 1</label>
              <Input id="address-line-1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="House No., Street Name, etc." className={inputStyle} required />
            </motion.div>
          </div>

          <motion.div variants={fieldVariants}>
            <label htmlFor="email" className={labelStyle}>Email Address</label>
            <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={handleEmailChange} className={`${inputStyle} ${emailError ? 'border-red-500 focus:border-red-500' : ''}`} required />
            {emailError && (<p className="text-sm text-red-600 mt-2">{emailError}</p>)}
          </motion.div>

          <motion.div variants={fieldVariants}>
            <label htmlFor="password" className={labelStyle}>Password</label>
            <div className="relative">
              <Lock className={iconStyle} />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a password" value={password} onChange={handlePasswordChange} className={`${inputStyle} pr-10 ${password && !isPasswordValid ? 'border-red-500 focus:border-red-500' : ''}`} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {password && (
              <div className="text-sm space-y-2 mt-3 p-3 bg-gray-50 rounded-lg">
                <p className={`flex items-center gap-2 ${password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>{password.length >= 8 ? '✓' : '•'} At least 8 characters</p>
                <p className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>{/[A-Z]/.test(password) ? '✓' : '•'} One uppercase letter</p>
                <p className={`flex items-center gap-2 ${/\d/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>{/\d/.test(password) ? '✓' : '•'} One number</p>
                <p className={`flex items-center gap-2 ${/[^A-Za-z0-9\s]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>{/[^A-Za-z0-9\s]/.test(password) ? '✓' : '•'} One special character</p>
              </div>
            )}
          </motion.div>

          <motion.div variants={fieldVariants}>
            <label htmlFor="confirm-password" className={labelStyle}>Confirm Password</label>
            <div className="relative">
              <Lock className={iconStyle} />
              <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onPaste={(e) => e.preventDefault()} className={`${inputStyle} pr-10 ${confirmPassword && password !== confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`} required />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (<p className="text-sm text-red-600 mt-2">Passwords do not match</p>)}
          </motion.div>

          <motion.div variants={fieldVariants}>
            <label htmlFor="file-upload" className={`block text-base font-medium flex items-center gap-2 text-gray-700 mb-2.5`}>
              <FileText className="w-5 h-5" /> Valid ID Document {employmentFile && <CheckCircle className="w-5 h-5 text-green-500" />}
            </label>
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-[#eef3ff]/50 p-4 shadow-sm">
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                className="sr-only"
              />
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#243b8e] px-6 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#122361]"
                >
                  {employmentFile ? 'Replace Image' : 'Choose File'}
                </button>

                {employmentFile && (
                  <div className="flex w-full items-center gap-3 rounded-2xl border border-[#d8def2] bg-white px-4 py-2.5 shadow-inner">
                    <FileText className="h-5 w-5 shrink-0 text-[#243b8e]" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
                      {employmentFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={clearEmploymentFile}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove selected valid ID image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className={`text-sm ml-1 text-gray-500 mt-2`}>Upload a valid government-issued ID (PNG, JPG, JPEG only)</p>
            {fileError && (<p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-100">{fileError}</p>)}
          </motion.div>

          <motion.div variants={fieldVariants} className="pt-3">
            <Button type="submit" className={`w-full bg-[#243b8e] hover:bg-[#122361] text-white font-bold rounded-xl ${inputHeight} text-lg shadow-sm transition-all`} disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </motion.div>

          <motion.div variants={fieldVariants} className="text-center pt-1 pb-1">
            <p className={`text-base text-gray-500`}>Already have an account? <button type="button" onClick={() => setActiveTab('login')} className="text-[#243b8e] font-bold hover:underline ml-1">Log In</button></p>
          </motion.div>
        </motion.form>
      )}
      </AnimatePresence>

      <NotificationModal isOpen={!!notificationModal} onClose={() => setNotificationModal(null)} type={notificationModal?.type} title={notificationModal?.title} message={notificationModal?.message} autoClose={notificationModal?.autoClose} autoCloseDelay={notificationModal?.autoCloseDelay} />
    </div>
  );
}
