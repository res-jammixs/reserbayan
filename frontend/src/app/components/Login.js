'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { X, Mail, Lock, Phone, FileText, CheckCircle, Eye, EyeOff, Calendar } from 'lucide-react';
import NotificationModal from '@/app/components/NotificationModal';

// --- Sorted and Title Cased Sitios ---
const SITIO_OPTIONS = [
  "Aco", "Adelfa", "Campar", "Cyo", "Dons Valley", "Honey Homes",
  "Itamda", "J. Tabura", "Kabulihan", "Kawayan", "La Familia",
  "Lower Lusimba", "Lower Tabucanal", "Mahayahay 1", "Middle Tabucanal",
  "Molave", "Nalupi", "Panas", "Papa Chapel", "Pob. Pardo Proper",
  "Sagrada", "Sto. Niño", "Sunrise", "Upper Tabucanal", "Villa Bayabas"
];

export default function SignUpContainer({ onClose }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('login'); // Default to login based on context
  const [employmentFile, setEmploymentFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // --- Form States ---
  // Shared/Signup States
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

  // --- STYLES (Optimized for Spacing) ---
  const inputHeight = `h-12`; // Taller inputs (48px)
  const inputStyle = `pl-11 text-base ${inputHeight} bg-white`; 
  const iconStyle = `absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5`; 
  const labelStyle = `block text-base font-medium text-gray-700 mb-2.5`; // More space below label
  
  const dropdownStyle = (value) => `
    w-full border border-gray-200 rounded-lg px-4 ${inputHeight} text-base 
    focus:outline-none focus:ring-2 focus:ring-ring focus:border-input bg-white
    ${value ? 'text-black' : 'text-gray-400'}
  `;

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
      // --- LOGIN LOGIC ---
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            identifier: loginEmail, // Backend expects 'identifier' usually
            password: loginPassword 
          }),
        });

        const data = await response.json();

        if (data.success) {
          // 1. Store user data
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem("role", data.role);
          // Store userType as per your request
          if (data.userType) localStorage.setItem("userType", data.userType);

          // 2. Update UI
          window.dispatchEvent(new CustomEvent('userLogin'));
          onClose();

          // 3. Redirect logic (Redirecting to dashboard for residents)
          console.log('User role:', data.role); // Debug logging
          if (data.role === 'SUPER_ADMIN' || data.role === 'ADMIN') {
             console.log('Redirecting to superadmin dashboard');
             window.location.href = '/superadmin/dashboard';
          } else {
             console.log('Redirecting to user dashboard');
             sessionStorage.setItem('showDashboardAnnouncementModal', 'true');
             window.location.href = '/dashboard';
          }
        } else {
          setLoginError(data.message || "Login failed");
        }
      } catch (error) {
        setNotificationModal({ type: 'error', title: 'Network Error', message: 'Please try again.' });
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
        const response = await fetch('/api/auth/register', {
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
    setEmploymentFile(e.target.files[0]);
  };

  // Listen for external switch events
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

  return (
    // PADDING INCREASED: p-10 md:p-14 for cleaner layout
    // FLEX LAYOUT: Ensures login can be vertically centered
    <div className={`bg-white border-gray-200 border rounded-2xl shadow-sm p-10 md:p-14 w-full max-w-[680px] mx-auto md:mx-0 relative min-h-[700px] max-h-[90vh] overflow-y-auto flex flex-col`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      
      <style jsx>{`
        div::-webkit-scrollbar { display: none; }
        input[type="date"]::-webkit-calendar-picker-indicator {
            background: transparent;
            bottom: 0;
            color: transparent;
            cursor: pointer;
            height: auto;
            left: 0;
            position: absolute;
            right: 0;
            top: 0;
            width: auto;
        }
        select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.75rem center;
          background-repeat: no-repeat;
          background-size: 1.25em 1.25em;
        }
      `}</style>

      <button onClick={onClose} className={`absolute top-6 right-6 transition-colors text-gray-400 hover:text-gray-600`} aria-label="Close form">
        <X size={28} />
      </button>

      {/* Tabs Spacing */}
      <div className="flex justify-center gap-10 mb-10 font-semibold text-xl flex-shrink-0">
        <button onClick={() => setActiveTab('login')} className={`pb-3 px-4 transition-colors ${activeTab === 'login' ? 'text-[#243b8e] border-b-4 border-[#243b8e]' : `text-gray-400 hover:text-[#243b8e]`}`}>Log In</button>
        <button onClick={() => setActiveTab('signup')} className={`pb-3 px-4 transition-colors ${activeTab === 'signup' ? 'text-[#243b8e] border-b-4 border-[#243b8e]' : `text-gray-400 hover:text-[#243b8e]`}`}>Sign Up</button>
      </div>

      {/* --- LOGIN FORM (Vertically Centered) --- */}
      {activeTab === 'login' && (
        <div className="flex flex-col justify-center flex-grow py-4">
          <form onSubmit={handleSubmit} className="space-y-8">
             <div className="space-y-1">
              <label htmlFor="login-email" className={labelStyle}>Email or Username</label>
              <div className="relative">
                <Mail className={iconStyle} />
                <Input 
                  id="login-email" 
                  type="text" 
                  placeholder="Enter your email or username" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className={inputStyle} 
                  required 
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label htmlFor="login-password" className={labelStyle}>Password</label>
              <div className="relative">
                <Lock className={iconStyle} />
                <Input 
                  id="login-password" 
                  type={showLoginPassword ? "text" : "password"} 
                  placeholder="Enter your password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`${inputStyle} pr-10`} 
                  required 
                />
                <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {loginError && (<div className="text-center mt-2"><p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{loginError}</p></div>)}
            
            <div className="pt-6">
              <Button type="submit" className={`w-full bg-[#243b8e] hover:bg-[#122361] text-white font-bold rounded-xl ${inputHeight} text-lg shadow-sm transition-all`} disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </Button>
            </div>
            
            <div className="text-center pt-6">
              <p className={`text-base text-gray-500`}>Don&apos;t have an account? <button type="button" onClick={() => setActiveTab('signup')} className="text-[#243b8e] font-bold hover:underline ml-1">Sign Up</button></p>
            </div>
          </form>
        </div>
      )}

      {/* --- SIGN UP FORM --- */}
      {activeTab === 'signup' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grid Spacing: gap-5 */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label htmlFor="first-name" className={labelStyle}>First Name</label>
              <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={inputStyle} required />
            </div>
            <div>
              <label htmlFor="last-name" className={labelStyle}>Last Name</label>
              <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className={inputStyle} required />
            </div>
          </div>

          <div>
            <label htmlFor="middle-name" className={labelStyle}>Middle Name <span className={`text-gray-400 font-normal ml-1`}>(Optional)</span></label>
            <Input id="middle-name" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Middle name" className={inputStyle} />
          </div>

          {/* DATE AND GENDER */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label htmlFor="birthdate" className={labelStyle}>Date of Birth</label>
              <div className="relative group">
                <Calendar className={`${iconStyle} pointer-events-none z-10`} />
                <Input 
                  id="birthdate" 
                  type="date" 
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={maxDate}
                  required 
                  className={`${inputStyle} w-full cursor-pointer appearance-none ${birthDate ? 'text-black' : 'text-gray-400'}`}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="gender" className={labelStyle}>Gender</label>
              <div className="relative">
                <select 
                  id="gender" 
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                  className={dropdownStyle(gender)}
                >
                  <option value="" disabled>Select</option>
                  <option value="Male" className="text-black">Male</option>
                  <option value="Female" className="text-black">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* REGION AND PROVINCE */}
          <div className="grid grid-cols-2 gap-5">
             <div>
              <label htmlFor="region" className={labelStyle}>Region</label>
              <select 
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                required
                className={dropdownStyle(region)}
              >
                <option value="" disabled>Select Region</option>
                <option value="Region VII">Region VII</option>
              </select>
            </div>
            <div>
              <label htmlFor="province" className={labelStyle}>Province</label>
              <select 
                id="province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                required
                className={dropdownStyle(province)}
              >
                <option value="" disabled>Select Province</option>
                <option value="Cebu">Cebu</option>
              </select>
            </div>
          </div>

          {/* CITY AND BARANGAY */}
          <div className="grid grid-cols-2 gap-5">
             <div>
              <label htmlFor="city" className={labelStyle}>City/Municipality</label>
              <select 
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className={dropdownStyle(city)}
              >
                <option value="" disabled>Select City</option>
                <option value="Cebu City">Cebu City</option>
              </select>
            </div>
            <div>
              <label htmlFor="barangay" className={labelStyle}>Barangay</label>
              <select 
                id="barangay"
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                required
                className={dropdownStyle(barangay)}
              >
                <option value="" disabled>Select Barangay</option>
                <option value="Pardo (Pob.)">Pardo (Pob.)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="sitio" className={labelStyle}>Sitio</label>
            <div className="relative">
              <select 
                id="sitio" 
                value={sitio}
                onChange={(e) => setSitio(e.target.value)}
                required
                className={dropdownStyle(sitio)}
              >
                <option value="" disabled>Select Sitio</option>
                {SITIO_OPTIONS.map((option) => (
                  <option key={option} value={option} className="text-black">{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="address-line-1" className={labelStyle}>Address Line 1</label>
            <Input id="address-line-1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="House No., Street Name, etc." className={inputStyle} required />
          </div>

          <div>
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
          </div>

          <div>
            <label htmlFor="email" className={labelStyle}>Email Address</label>
            <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={handleEmailChange} className={`${inputStyle} ${emailError ? 'border-red-500 focus:border-red-500' : ''}`} required />
            {emailError && (<p className="text-sm text-red-600 mt-2">{emailError}</p>)}
          </div>

          <div>
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
          </div>

          <div>
            <label htmlFor="confirm-password" className={labelStyle}>Confirm Password</label>
            <div className="relative">
              <Lock className={iconStyle} />
              <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onPaste={(e) => e.preventDefault()} className={`${inputStyle} pr-10 ${confirmPassword && password !== confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`} required />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (<p className="text-sm text-red-600 mt-2">Passwords do not match</p>)}
          </div>

          <div>
            <label htmlFor="file-upload" className={`block text-base font-medium flex items-center gap-2 text-gray-700 mb-2.5`}>
              <FileText className="w-5 h-5" /> Valid ID Document {employmentFile && <CheckCircle className="w-5 h-5 text-green-500" />}
            </label>
            <div className="relative">
              <input id="file-upload" type="file" accept="image/*,application/pdf" onChange={handleFileChange} required className={`border border-gray-300 rounded-lg p-2.5 w-full text-base file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#243b8e] file:text-white hover:file:bg-[#122361] transition-colors ${inputHeight}`} />
            </div>
            <p className={`text-sm ml-1 text-gray-500 mt-2`}>Upload a valid government-issued ID (PNG, JPG, or PDF)</p>
          </div>

          <div className="pt-8">
            <Button type="submit" className={`w-full bg-[#243b8e] hover:bg-[#122361] text-white font-bold rounded-xl ${inputHeight} text-lg shadow-sm transition-all`} disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </div>

          <div className="text-center pt-4 pb-2">
            <p className={`text-base text-gray-500`}>Already have an account? <button type="button" onClick={() => setActiveTab('login')} className="text-[#243b8e] font-bold hover:underline ml-1">Log In</button></p>
          </div>
        </form>
      )}

      <NotificationModal isOpen={!!notificationModal} onClose={() => setNotificationModal(null)} type={notificationModal?.type} title={notificationModal?.title} message={notificationModal?.message} autoClose={notificationModal?.autoClose} autoCloseDelay={notificationModal?.autoCloseDelay} />
    </div>
  );
}
