import React, { useState, useRef, useEffect } from 'react';
import { 
  Award, CheckCircle, ShieldAlert, BookOpen, Calendar, Clock, 
  MapPin, Check, Phone, ArrowLeft, GraduationCap, Briefcase
} from 'lucide-react';
import { certificateApi } from '../../api/certificateApi';
import Card from '../../components/Card';
import logo from '../../assets/react.svg'; // fallback logo or generic

export default function VerifyCertificate() {
  const [yearDigits, setYearDigits] = useState(['', '']);
  const [numberDigits, setNumberDigits] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  // Input refs for automatic focus traversal
  const yearRefs = [useRef(null), useRef(null)];
  const numberRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Auto-focus first input on load
  useEffect(() => {
    if (yearRefs[0].current) {
      yearRefs[0].current.focus();
    }
  }, []);

  const handleYearChange = (index, val) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    const newDigits = [...yearDigits];
    newDigits[index] = cleanVal;
    setYearDigits(newDigits);

    // Focus next box if value entered
    if (cleanVal && index < 1) {
      yearRefs[index + 1].current.focus();
    } else if (cleanVal && index === 1) {
      numberRefs[0].current.focus();
    }
  };

  const handleYearKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !yearDigits[index] && index > 0) {
      yearRefs[index - 1].current.focus();
    }
  };

  const handleNumberChange = (index, val) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    const newDigits = [...numberDigits];
    newDigits[index] = cleanVal;
    setNumberDigits(newDigits);

    // Focus next box
    if (cleanVal && index < 3) {
      numberRefs[index + 1].current.focus();
    }
  };

  const handleNumberKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !numberDigits[index]) {
      if (index > 0) {
        numberRefs[index - 1].current.focus();
      } else {
        yearRefs[1].current.focus();
      }
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const yr = yearDigits.join('');
    const num = numberDigits.join('');

    if (yr.length < 2 || num.length < 4) {
      setError('Please fill in all digits of the enrollment number.');
      setSuccessResult(null);
      return;
    }

    const constructedEnrollment = `RJ/20${yr}/${num}`;

    try {
      setLoading(true);
      setError('');
      setSuccessResult(null);
      const res = await certificateApi.verifyCertificate(constructedEnrollment);
      if (res.success) {
        setSuccessResult(res.data);
      }
    } catch (err) {
      console.error('Verification failed:', err);
      setError(err.response?.data?.message || 'Certificate not found. Please check the digits and try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setYearDigits(['', '']);
    setNumberDigits(['', '', '', '']);
    setSuccessResult(null);
    setError('');
    setTimeout(() => yearRefs[0].current?.focus(), 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-[#E31C1C] selection:text-white">
      
      {/* Top Banner Offer */}
      <div className="bg-[#E31C1C] text-white text-[11px] font-bold py-2.5 px-4 text-center tracking-wide shadow-xs relative z-10 flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span>New batch starting soon — Limited seats per course.</span>
        <a href="#reserve" className="bg-white text-[#E31C1C] px-3 py-0.5 rounded-full text-[9px] font-black uppercase hover:opacity-90 transition-all select-none">
          Reserve your seat
        </a>
      </div>

      {/* Main Header / Nav */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E31C1C] flex items-center justify-center text-white font-extrabold text-sm tracking-tighter">
            JC
          </div>
          <span className="text-sm font-black text-slate-800 tracking-wider">JAINS COMPUTER</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-600">
          <a href="/" className="hover:text-slate-900 transition-colors">Home</a>
          <a href="#courses" className="hover:text-slate-900 transition-colors">Courses</a>
          <a href="#about" className="hover:text-slate-900 transition-colors">Why Choose Us</a>
          <a href="#contact" className="hover:text-slate-900 transition-colors">Contact Us</a>
          <a href="#blog" className="hover:text-slate-900 transition-colors">Blog</a>
        </nav>

        <button className="bg-[#E31C1C] hover:bg-[#b81414] text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm border-0 cursor-pointer active:scale-95 transition-all">
          Book Free Consultation
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center items-center py-12 px-4 md:px-8 max-w-7xl mx-auto w-full gap-8">
        
        {/* Verification Form and Side Details Flex Grid */}
        <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
          
          {/* Verification Box */}
          <div className="flex flex-col w-full">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-lg transition-all">
              
              {/* Header Box */}
              <div className="bg-[#E31C1C] text-white p-6 md:p-8 space-y-2">
                <div className="flex items-center gap-2">
                  <Award size={22} className="text-white" />
                  <h2 className="text-lg md:text-xl font-black tracking-tight">Certificate Verification</h2>
                </div>
                <p className="text-xs text-white/80 font-medium">Verify your certificate instantly from the central directory</p>
              </div>

              {/* Form Box */}
              <div className="p-6 md:p-8 space-y-6">
                
                {error && (
                  <div className="bg-rose-50 border border-rose-100 text-brand-red text-xs font-bold p-3 rounded-2xl animate-fade-in flex items-center gap-2">
                    <ShieldAlert size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleVerify} className="space-y-6">
                  <div className="space-y-3.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Enter Enrollment Number</label>
                    
                    {/* Digit Input boxes exactly like screenshot */}
                    <div className="flex items-center gap-3">
                      
                      {/* Year box inputs group */}
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex gap-2">
                          {yearDigits.map((digit, idx) => (
                            <input
                              key={`year-${idx}`}
                              ref={yearRefs[idx]}
                              type="text"
                              value={digit}
                              onChange={(e) => handleYearChange(idx, e.target.value)}
                              onKeyDown={(e) => handleYearKeyDown(idx, e)}
                              maxLength={1}
                              className="w-12 h-14 bg-white border-2 border-slate-200 rounded-xl text-center text-lg font-black text-slate-800 outline-none focus:border-[#E31C1C] transition-all shadow-xs"
                              placeholder="0"
                            />
                          ))}
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Year</span>
                      </div>

                      {/* Slash separator */}
                      <span className="text-2xl font-bold text-slate-300">/</span>

                      {/* Number box inputs group */}
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex gap-2">
                          {numberDigits.map((digit, idx) => (
                            <input
                              key={`num-${idx}`}
                              ref={numberRefs[idx]}
                              type="text"
                              value={digit}
                              onChange={(e) => handleNumberChange(idx, e.target.value)}
                              onKeyDown={(e) => handleNumberKeyDown(idx, e)}
                              maxLength={1}
                              className="w-12 h-14 bg-white border-2 border-slate-200 rounded-xl text-center text-lg font-black text-slate-800 outline-none focus:border-[#E31C1C] transition-all shadow-xs"
                              placeholder="0"
                            />
                          ))}
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Number</span>
                      </div>

                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#E31C1C] hover:bg-[#b81414] disabled:bg-rose-300 text-white rounded-xl text-xs font-black transition-all cursor-pointer border-0 active:scale-95 shadow-md uppercase tracking-wider block"
                  >
                    {loading ? 'Searching Ledger...' : 'Verify Certificate'}
                  </button>
                </form>
              </div>

            </div>
          </div>

          {/* Right Side Process and Trusted Badges */}
          <div className="space-y-6 w-full">
            
            {/* Verification Process Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <CheckCircle size={14} className="text-[#E31C1C]" />
                <span>Verification Process</span>
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#E31C1C] text-white flex items-center justify-center font-black text-[10px]">
                    1
                  </div>
                  <span className="text-xs font-extrabold text-slate-700">Enter enrollment year & serial number</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#E31C1C] text-white flex items-center justify-center font-black text-[10px]">
                    2
                  </div>
                  <span className="text-xs font-extrabold text-slate-700">Click on 'Verify Certificate' button</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#E31C1C] text-white flex items-center justify-center font-black text-[10px]">
                    3
                  </div>
                  <span className="text-xs font-extrabold text-slate-700">View real-time certification parameters</span>
                </div>
              </div>
            </div>

            {/* Trusted Certification Badges */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Award size={14} className="text-[#E31C1C]" />
                <span>Trusted Certification</span>
              </h3>

              <div className="flex flex-wrap gap-3.5 pt-1.5">
                <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>ISO Certified Institute</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Instant Verification</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Trusted by Students</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Secure Student Database</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Verification Success Details View */}
        {successResult && (
          <div className="w-full animate-fade-in pt-4">
            <Card className="border-2 border-emerald-100 relative overflow-hidden bg-white max-w-4xl mx-auto p-6 md:p-8 rounded-3xl shadow-xl">
              
              {/* Premium Verification Seal */}
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 pointer-events-none select-none opacity-80">
                <div className="text-center font-black text-[9px] text-emerald-600 uppercase tracking-wider rotate-12">
                  VERIFIED<br/>REGISTRY
                </div>
              </div>

              {/* Verified Header Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-6">
                <CheckCircle size={13} />
                <span>AUTHENTIC GRADUATION CREDENTIAL VALIDATED</span>
              </div>

              {/* Student details display */}
              <div className="space-y-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Student Name</span>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">{successResult.studentName}</h3>
                </div>

                <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-100">
                  
                  {/* Enrollment Number */}
                  <div className="space-y-1.5 flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Award size={11} /> Enrollment Number
                    </span>
                    <strong className="text-slate-800 text-sm font-black font-mono">{successResult.enrollmentNumber}</strong>
                  </div>

                  {/* Course Name */}
                  <div className="space-y-1.5 flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <BookOpen size={11} /> Course Name
                    </span>
                    <strong className="text-slate-800 text-sm font-extrabold">{successResult.course}</strong>
                  </div>

                  {/* Course Duration */}
                  <div className="space-y-1.5 flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Clock size={11} /> Duration
                    </span>
                    <strong className="text-slate-800 text-sm font-extrabold">{successResult.duration}</strong>
                  </div>

                  {/* Course Issue Date */}
                  <div className="space-y-1.5 flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={11} /> Course Issue Date
                    </span>
                    <strong className="text-slate-800 text-sm font-bold text-slate-655">{successResult.courseIssueDate}</strong>
                  </div>

                  {/* Internship Experience */}
                  <div className="space-y-1.5 flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Briefcase size={11} /> Internship Experience
                    </span>
                    <strong className="text-slate-800 text-sm font-bold text-slate-655">
                      {successResult.internship === 'Yes' 
                        ? `Yes (${successResult.internshipDuration || '3 Months'})` 
                        : 'No'}
                    </strong>
                  </div>

                  {/* Registry Issue Date */}
                  <div className="space-y-1.5 flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={11} /> Registry Sign Date
                    </span>
                    <strong className="text-slate-800 text-sm font-bold text-slate-655">{successResult.issueDate}</strong>
                  </div>

                </div>

                <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                  <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <CheckCircle size={10} className="text-emerald-500" />
                    <span>ISO 9001:2015 Verified Electronic Certificate Registry</span>
                  </div>

                  <button
                    onClick={resetSearch}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold transition-all cursor-pointer border-0 active:scale-95"
                  >
                    Verify Another Certificate
                  </button>
                </div>

              </div>

            </Card>
          </div>
        )}

      </main>

      {/* Footer Contact Bubble */}
      <a
        href="tel:+919876543210"
        className="fixed bottom-6 right-6 w-12 h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 z-40 outline-none"
        title="Call Counselor"
      >
        <Phone size={20} />
      </a>

      {/* Footer copyright */}
      <footer className="py-6 bg-white border-t border-slate-200 text-center text-[10px] font-bold text-slate-400 tracking-wide">
        © 2026 Jains Computer. All rights reserved. Scalable Registry Edition.
      </footer>

    </div>
  );
}
