import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, CheckCircle, Mail, Phone, User, Building, Lock } from 'lucide-react';
import { employeeApi } from '../../api/employeeApi';
import { ROUTES } from '../../constants/Routes';

const compressImage = (base64Str, maxWidth = 150, maxHeight = 150) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

export default function EmployeeRegister() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result);
        setProfilePicture(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !lastName || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await employeeApi.register({
        name,
        lastName,
        email,
        phone,
        department: department || undefined,
        password,
        profilePicture
      });
      if (res.success) {
        setIsSubmitted(true);
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error. Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center font-sans">
        <div className="w-full max-w-md min-h-screen sm:min-h-[80vh] sm:rounded-3xl sm:shadow-2xl bg-white flex flex-col p-8 items-center justify-center text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center shadow-md animate-bounce">
            <CheckCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-800">Registration Submitted</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[280px] mx-auto">
              Your profile has been created successfully! Please wait for a system administrator to approve your account.
            </p>
          </div>
          <button
            onClick={() => navigate(ROUTES.EMPLOYEE_LOGIN)}
            className="px-6 py-2.5 bg-brand-red hover:bg-brand-red-hover text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer border-0 w-full max-w-xs"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center font-sans">
      <div className="w-full max-w-md min-h-screen sm:min-h-[85vh] sm:max-h-[90vh] sm:rounded-3xl sm:shadow-2xl bg-white flex flex-col p-8 relative overflow-hidden animate-fade-in justify-between">
        
        {/* Header */}
        <div className="space-y-4 shrink-0 mb-4">
          <div className="flex items-center gap-3">
            <img 
              src="/jains.svg" 
              alt="Jains" 
              className="h-7 w-auto object-contain"
            />
            <span className="text-[10px] text-slate-300 font-bold">|</span>
            <span className="text-[10px] font-black text-brand-red tracking-widest uppercase">REGISTRATION</span>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Create Employee Account</h1>
            <p className="text-xs text-slate-450 font-semibold leading-relaxed">
              Register below to submit your profile for admin approval.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-brand-red text-xs font-bold p-3 rounded-2xl animate-fade-in shrink-0 mb-3">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 justify-between">
          
          {/* Scrollable Fields Box */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 min-h-0 mb-4">
            {/* Image Selector Canvas */}
            <div className="flex flex-col items-center gap-2.5 pb-2">
              <div className="relative">
                {profilePicture ? (
                  <img 
                    src={profilePicture} 
                    alt="Preview" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-brand-red shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                    <User size={28} />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-brand-red border border-white text-white flex items-center justify-center cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-all">
                  <Camera size={12} />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                    className="hidden" 
                  />
                </label>
              </div>
              <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">Profile Picture</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">First Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First Name"
                    className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 pl-9 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                    required
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Last Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 pl-9 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                    required
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Department</label>
                <div className="relative">
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Department"
                    className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 pl-9 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                    required
                  />
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Phone Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone"
                    className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 pl-9 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 pl-9 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                  required
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (Min 6 chars)"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 pl-9 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 pl-9 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Register Button */}
          <div className="shrink-0">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-brand-red-hover text-white text-xs font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer border-0 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                'Register Profile'
              )}
            </button>
          </div>
        </form>

        {/* Footer Navigation */}
        <div className="pt-4 text-center text-xs font-bold text-slate-450 border-t border-slate-100 shrink-0 mt-4">
          Already have an account?{' '}
          <Link 
            to={ROUTES.EMPLOYEE_LOGIN} 
            className="text-brand-red hover:underline font-extrabold"
          >
            Log In
          </Link>
        </div>

      </div>
    </div>
  );
}
