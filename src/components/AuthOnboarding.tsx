import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Camera,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  GraduationCap,
  HeartHandshake,
  KeyRound,
  Lightbulb,
  LogOut,
  MessageSquareText,
  ShieldCheck,
  Star,
  Trees,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { UserRole } from '../types';
import {
  HeartbeatSlogan,
  MascotAvatar,
  MascotMood,
  NhiphocAnimatedLogo,
  NhiphocLogoMark,
} from './MascotAvatar';
import { isSoundEnabled, playMascotSound, setSoundEnabled } from '../utils/soundEffects';

interface AuthOnboardingProps {
  firebaseUser: User | null;
  authLoading: boolean;
  authError: string | null;
  preferredRole: UserRole;
  onChangePreferredRole: (role: UserRole) => void;
  onClearAuthError: () => void;
  onGoogleSignIn: () => Promise<void>;
  onParentCodeSignIn: (params: {
    linkCode?: string;
    displayName?: string;
    studentName?: string;
    grade?: string;
  }) => Promise<void>;
  onSignOut: () => Promise<void>;
  onCompleteRegistration: (data: {
    displayName: string;
    phone: string;
    role: UserRole;
    studentName?: string;
    grade?: string;
    linkCodeInput?: string;
  }) => Promise<void>;
}

const ROLE_CARDS: Array<{
  role: UserRole;
  title: string;
  subtitle: string;
  features: string[];
  icon: React.FC<{ className?: string }>;
}> = [
  {
    role: 'student',
    title: 'Học sinh',
    subtitle: 'Tập trung sâu trên từng trang note',
    features: [
      'Danh sách bài tập hôm nay & bài tập tự luyện bổ sung',
      'Chụp ảnh bài làm trực tiếp bằng camera, tự động nén rõ chữ',
      'Đồng hồ Pomodoro & Cây tập trung lưu lại từng phút học',
    ],
    icon: GraduationCap,
  },
  {
    role: 'parent',
    title: 'Phụ huynh',
    subtitle: 'Giao diện sáng dịu mắt, theo dõi an tâm',
    features: [
      'Tổng quan tỷ lệ hoàn thành, biểu đồ tập trung theo tuần & ảnh bài của con',
      'Bản tin cuối ngày tóm tắt kết quả cùng gợi ý đồng hành cụ thể',
      'Nhắn tin trực tiếp, đặt lịch hẹn & gửi phản hồi tới trợ lý',
    ],
    icon: HeartHandshake,
  },
  {
    role: 'assistant',
    title: 'Trợ lý',
    subtitle: 'Quản lý danh sách & chấm bài tức thì',
    features: [
      'Quản lý nhiều học sinh qua mã kết nối NH... và giao bài theo ngày',
      'Xem ảnh bài nộp, chấm điểm & gửi nhận xét chi tiết ngay trên web',
      'Bật trạng thái Đang trực tuyến và xác nhận lịch hẹn phụ huynh',
    ],
    icon: Users,
  },
];

const MASCOT_MOODS: Array<{
  mood: MascotMood;
  label: string;
  caption: string;
}> = [
  {
    mood: 'happy',
    label: 'Vui vẻ',
    caption: 'Chào bạn! Nhịp Nhỏ sẽ đồng hành giúp bạn giữ nhịp học êm ái mỗi ngày.',
  },
  {
    mood: 'trying',
    label: 'Cố gắng',
    caption: 'Chỉ cần tập trung trọn 25 phút thôi — từng dòng note nhỏ tạo nên tiến bộ lớn.',
  },
  {
    mood: 'surprised',
    label: 'Bất ngờ',
    caption: 'Ting! Trợ lý vừa gửi nhận xét và chấm xong bài tập bạn vừa nộp ảnh đấy.',
  },
  {
    mood: 'relax',
    label: 'Thư giãn',
    caption: 'Xong phiên học rồi! Nghỉ mắt một chút để giữ sự tỉnh táo cho chặng tiếp theo.',
  },
  {
    mood: 'creative',
    label: 'Sáng tạo',
    caption: 'Cùng Nhịp Nhỏ thử sức thêm bài tập bổ sung và vẽ nên những ý tưởng mới thật vui!',
  },
];

export const AuthOnboarding: React.FC<AuthOnboardingProps> = ({
  firebaseUser,
  authLoading,
  authError,
  preferredRole,
  onChangePreferredRole,
  onClearAuthError,
  onGoogleSignIn,
  onParentCodeSignIn,
  onSignOut,
  onCompleteRegistration,
}) => {
  const isCodeSession = Boolean(firebaseUser?.isAnonymous);

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    isCodeSession ? 'parent' : preferredRole,
  );
  const [selectedMood, setSelectedMood] = useState<MascotMood>('happy');
  const [displayName, setDisplayName] = useState(firebaseUser?.displayName || '');
  const [phone, setPhone] = useState('');
  const [joinMode, setJoinMode] = useState<'new' | 'code'>('new');
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('Lớp 8');
  const [linkCodeInput, setLinkCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());

  // Parent child-code sign-in states
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [parentNameInput, setParentNameInput] = useState('');
  const [parentCreateMode, setParentCreateMode] = useState(false);
  const [parentStudentName, setParentStudentName] = useState('');
  const [parentStudentGrade, setParentStudentGrade] = useState('Lớp 8');
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState<string | null>(null);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) {
      playMascotSound('happy');
    }
  };

  const selectRole = (role: UserRole) => {
    setSelectedRole(role);
    onChangePreferredRole(role);
    setParentError(null);
    setFormError(null);
    onClearAuthError();
  };

  React.useEffect(() => {
    if (isCodeSession) {
      setSelectedRole('parent');
      onChangePreferredRole('parent');
    }
  }, [isCodeSession, onChangePreferredRole]);

  React.useEffect(() => {
    if (firebaseUser?.displayName && !displayName) {
      setDisplayName(firebaseUser.displayName);
    }
  }, [firebaseUser, displayName]);

  const handleJumpToParentCode = () => {
    selectRole('parent');
    setTimeout(() => {
      document.getElementById('start-panel')?.scrollIntoView({ behavior: 'smooth' });
      document.getElementById('parent-link-code-input')?.focus();
    }, 100);
  };

  const handleSwitchToParentFromGoogle = async () => {
    await onSignOut();
    selectRole('parent');
    setTimeout(() => {
      document.getElementById('start-panel')?.scrollIntoView({ behavior: 'smooth' });
      document.getElementById('parent-link-code-input')?.focus();
    }, 160);
  };

  const handleSwitchToGoogleFromCode = async () => {
    await onSignOut();
    selectRole('student');
    setTimeout(() => {
      document.getElementById('start-panel')?.scrollIntoView({ behavior: 'smooth' });
    }, 160);
  };

  const handleParentCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParentError(null);
    onClearAuthError();
    setParentLoading(true);
    try {
      await onParentCodeSignIn({
        linkCode: parentCreateMode ? '' : parentCodeInput,
        displayName: parentNameInput,
        studentName: parentCreateMode ? parentStudentName : '',
        grade: parentCreateMode ? parentStudentGrade : 'Lớp 8',
      });
    } catch (err) {
      setParentError(
        err instanceof Error ? err.message : 'Không thể đăng nhập bằng mã kết nối.',
      );
    } finally {
      setParentLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (selectedRole === 'parent' && !isCodeSession) {
      setFormError(
        'Phụ huynh chỉ cần nhập mã kết nối của con (NH...) để đăng nhập, không dùng email. Vui lòng chuyển sang đăng nhập bằng mã NH...',
      );
      return;
    }
    if (selectedRole !== 'parent' && isCodeSession) {
      setFormError(
        'Phiên mã kết nối dành riêng cho Phụ huynh. Học sinh / Trợ lý vui lòng đổi sang đăng nhập Google.',
      );
      return;
    }
    if (!displayName.trim()) {
      setFormError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (joinMode === 'code' && !linkCodeInput.trim()) {
      setFormError('Vui lòng nhập mã kết nối học sinh (ví dụ: NH842K19).');
      return;
    }
    if (joinMode === 'new' && selectedRole !== 'student' && !studentName.trim()) {
      setFormError('Vui lòng nhập tên học sinh cần theo dõi.');
      return;
    }

    setSubmitting(true);
    try {
      await onCompleteRegistration({
        displayName,
        phone,
        role: selectedRole,
        studentName: selectedRole === 'student' ? displayName : studentName,
        grade,
        linkCodeInput: joinMode === 'code' ? linkCodeInput : '',
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Đăng ký thất bại, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeMoodMeta = MASCOT_MOODS.find((m) => m.mood === selectedMood) || MASCOT_MOODS[0];
  const roleMismatch =
    (selectedRole === 'parent' && !isCodeSession) ||
    (selectedRole !== 'parent' && isCodeSession);

  const renderRegistrationForm = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between gap-4 border-b border-[#EFE6D2] pb-4">
        <div>
          <p className="text-xs font-bold text-[#C45A15]">Hoàn tất hồ sơ NhịpHọc</p>
          <h2 className="text-xl font-extrabold text-[#231E18] mt-0.5">
            {isCodeSession
              ? 'Hoàn tất thông tin Phụ huynh'
              : 'Chọn vai trò để vào không gian làm việc'}
          </h2>
        </div>
        <MascotAvatar size="sm" mood="happy" />
      </div>

      <div className="text-xs text-[#6B6154] bg-[#FDF3D0]/70 border border-[#E5DBC4] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
        <span className="truncate font-medium text-[#231E18]">
          {isCodeSession ? 'Phiên đăng nhập Phụ huynh (Mã kết nối)' : firebaseUser?.email}
        </span>
        <span className="font-bold text-[#C45A15] shrink-0">
          {isCodeSession ? 'Không dùng email' : 'Đã xác thực Google'}
        </span>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#231E18] mb-1.5">
          Vai trò của bạn
        </label>
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#F6EFE0] border border-[#E5DBC4]">
          {ROLE_CARDS.map((item) => {
            const active = selectedRole === item.role;
            return (
              <button
                key={item.role}
                type="button"
                onClick={() => selectRole(item.role)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#C45A15] text-white shadow-sm'
                    : 'text-[#6B6154] hover:text-[#231E18]'
                }`}
              >
                {item.title}
              </button>
            );
          })}
        </div>

        {selectedRole === 'parent' && !isCodeSession && (
          <div className="mt-3 rounded-xl border border-[#E5C99B] bg-[#FDF3D0] p-3.5 space-y-2.5">
            <p className="text-xs text-[#4F463B] leading-relaxed">
              <strong>Phụ huynh không dùng email</strong> — chỉ cần nhập mã kết nối của con (
              <span className="font-mono font-semibold">NH...</span>) để vào thẳng giao diện Phụ
              huynh.
            </p>
            <button
              type="button"
              onClick={handleSwitchToParentFromGoogle}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Đăng xuất &amp; Vào Phụ huynh bằng mã NH...
            </button>
          </div>
        )}

        {selectedRole !== 'parent' && isCodeSession && (
          <div className="mt-3 rounded-xl border border-[#E5C99B] bg-[#FDF3D0] p-3.5 space-y-2.5">
            <p className="text-xs text-[#4F463B] leading-relaxed">
              Phiên hiện tại dành cho <strong>Phụ huynh</strong>. Để vào vai trò Học sinh hoặc Trợ
              lý, hãy đổi sang tài khoản Google.
            </p>
            <button
              type="button"
              onClick={handleSwitchToGoogleFromCode}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E5DBC4] text-[#231E18] text-xs font-bold hover:bg-[#F6EFE0] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-[#C45A15]" />
              Đổi sang đăng nhập Google
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="reg-name" className="block text-xs font-semibold text-[#231E18] mb-1.5">
            Họ và tên
          </label>
          <input
            id="reg-name"
            type="text"
            required
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={selectedRole === 'parent' ? 'Phụ huynh bé Minh Anh' : 'Nguyễn Minh Anh'}
            className="w-full rounded-xl border border-[#E5DBC4] bg-white px-3.5 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
          />
        </div>
        <div>
          <label htmlFor="reg-phone" className="block text-xs font-semibold text-[#231E18] mb-1.5">
            Số điện thoại (tùy chọn)
          </label>
          <input
            id="reg-phone"
            type="tel"
            maxLength={30}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0912 345 678"
            className="w-full rounded-xl border border-[#E5DBC4] bg-white px-3.5 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
          />
        </div>
      </div>

      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[#F6EFE0] border border-[#E5DBC4]">
          <button
            type="button"
            onClick={() => setJoinMode('new')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              joinMode === 'new'
                ? 'bg-white text-[#231E18] shadow-sm'
                : 'text-[#6B6154] hover:text-[#231E18]'
            }`}
          >
            Tạo hồ sơ học sinh mới
          </button>
          <button
            type="button"
            onClick={() => setJoinMode('code')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              joinMode === 'code'
                ? 'bg-white text-[#231E18] shadow-sm'
                : 'text-[#6B6154] hover:text-[#231E18]'
            }`}
          >
            Nhập mã kết nối (NH...)
          </button>
        </div>

        {joinMode === 'new' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {selectedRole !== 'student' && (
              <div>
                <label
                  htmlFor="reg-student-name"
                  className="block text-xs font-semibold text-[#231E18] mb-1.5"
                >
                  Tên học sinh
                </label>
                <input
                  id="reg-student-name"
                  type="text"
                  maxLength={80}
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Bé Minh Anh"
                  className="w-full rounded-xl border border-[#E5DBC4] bg-white px-3.5 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                />
              </div>
            )}
            <div className={selectedRole === 'student' ? 'sm:col-span-2' : ''}>
              <label
                htmlFor="reg-grade"
                className="block text-xs font-semibold text-[#231E18] mb-1.5"
              >
                Khối / Bậc học
              </label>
              <input
                id="reg-grade"
                type="text"
                maxLength={40}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="Lớp 8 hoặc Sinh viên Đại học"
                className="w-full rounded-xl border border-[#E5DBC4] bg-white px-3.5 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Tiểu học', 'Lớp 8', 'Lớp 12', 'Sinh viên'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setGrade(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      grade === preset
                        ? 'bg-[#C45A15] text-white'
                        : 'bg-[#FDF3D0] text-[#6B6154] hover:text-[#231E18]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label
              htmlFor="reg-link-code"
              className="block text-xs font-semibold text-[#231E18] mb-1.5"
            >
              Mã kết nối học sinh (NH...)
            </label>
            <input
              id="reg-link-code"
              type="text"
              maxLength={12}
              value={linkCodeInput}
              onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
              placeholder="NH842K19"
              className="w-full rounded-xl border border-[#E5DBC4] bg-white px-3.5 py-2.5 text-sm font-mono uppercase tracking-wider text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
            />
          </div>
        )}
      </div>

      {formError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          {formError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || roleMismatch}
        className="w-full py-3.5 px-5 rounded-2xl bg-[#C45A15] text-white text-sm font-bold hover:bg-[#AA4C0F] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        <span>{submitting ? 'Đang khởi tạo không gian...' : 'Hoàn tất & Vào NhịpHọc'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-[#231E18] flex flex-col">
      {/* Sticky Top Navigation Bar (3 exact zones) */}
      <header className="border-b border-[#E5DBC4] bg-[#FBF8F1]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1240px] mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <a
            href="#intro"
            className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-[#231E18] whitespace-nowrap shrink-0 font-display"
          >
            <NhiphocLogoMark className="w-8 h-8 shrink-0" />
            <span>
              Nhịp<span className="text-[#C45A15]">Học</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6B6154]">
            <a href="#intro" className="hover:text-[#C45A15] transition-colors whitespace-nowrap shrink-0">
              Giới thiệu
            </a>
            <a href="#features" className="hover:text-[#C45A15] transition-colors whitespace-nowrap shrink-0">
              Tính năng
            </a>
            <a href="#guide" className="hover:text-[#C45A15] transition-colors whitespace-nowrap shrink-0">
              Hướng dẫn
            </a>
            <a href="#start-panel" className="hover:text-[#C45A15] transition-colors whitespace-nowrap shrink-0">
              Bắt đầu
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleSound}
              data-custom-sound="true"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5DBC4] bg-white text-xs font-bold text-[#5C5347] hover:bg-[#FDF3D0] hover:text-[#231E18] transition-colors whitespace-nowrap shrink-0"
              aria-label={soundOn ? 'Tắt âm thanh nhấn' : 'Bật âm thanh nhấn'}
              title={soundOn ? 'Đang bật tiếng động khi ấn' : 'Đang tắt tiếng động'}
            >
              {soundOn ? (
                <Volume2 className="w-3.5 h-3.5 text-[#C45A15]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-[#8A7D6B]" />
              )}
              <span className="hidden sm:inline">{soundOn ? 'Âm thanh' : 'Đã tắt tiếng'}</span>
            </button>

            {firebaseUser ? (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5DBC4] bg-white text-xs font-semibold text-[#231E18] hover:bg-[#FDF3D0] transition-colors whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 text-[#C45A15]" />
                Đổi tài khoản
              </button>
            ) : (
              <a
                href="#start-panel"
                className="px-4 py-2 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] transition-colors whitespace-nowrap shrink-0"
              >
                Đăng nhập / Bắt đầu ngay
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* If already authenticated with Google (Step 2), present onboarding completion immediately */}
        {firebaseUser && (
          <section className="border-b border-[#E5DBC4] bg-[#FDF3D0]/55 py-10">
            <div className="max-w-2xl mx-auto px-6">
              <div className="rounded-3xl border border-[#E5DBC4] bg-white p-6 sm:p-8 shadow-[0_18px_45px_-28px_rgba(35,30,24,0.2)]">
                {renderRegistrationForm()}
              </div>
            </div>
          </section>
        )}

        {/* Section 1: Hero Banner (Natural Landing Page flow) */}
        <section id="intro" className="relative overflow-hidden border-b border-[#E5DBC4]">
          <div className="absolute inset-0 nhiphoc-grid-bg opacity-70 pointer-events-none" />
          <div className="relative max-w-[1240px] mx-auto px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Left Copy */}
            <div className="lg:col-span-6 space-y-7">
              <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
                <HeartbeatSlogan />
              </div>

              <h1
                className="font-extrabold tracking-tight text-[#231E18] leading-[1.12]"
                style={{ fontSize: 'clamp(2.4rem, 4.2vw, 3.65rem)', textWrap: 'balance' }}
              >
                Giữ nhịp tập trung trên từng trang note cùng{' '}
                <span className="text-[#C45A15]">NhịpHọc</span>
              </h1>

              <p className="text-base sm:text-lg text-[#5C5347] leading-relaxed max-w-xl">
                Thiết kế lấy cảm hứng từ giấy note kem dịu mắt giúp giảm mỏi thị giác và tăng khả
                năng chú ý khi tự học. Mọi bài tập, ảnh bài làm, giờ tập trung Pomodoro và lời
                nhận xét đều đồng bộ theo thời gian thực.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {!firebaseUser ? (
                  <>
                    <button
                      type="button"
                      onClick={handleJumpToParentCode}
                      className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-[#C45A15] text-white text-sm font-bold hover:bg-[#AA4C0F] transition-colors shadow-sm whitespace-nowrap"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Phụ huynh · Nhập mã kết nối của con</span>
                    </button>

                    <button
                      type="button"
                      onClick={onGoogleSignIn}
                      disabled={authLoading}
                      className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-2xl border border-[#E5DBC4] bg-white text-[#231E18] text-sm font-bold hover:bg-[#FDF3D0] disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      <span>
                        {authLoading ? 'Đang mở Google...' : 'Học sinh / Trợ lý · Google'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#C45A15]" />
                    </button>
                  </>
                ) : (
                  <a
                    href="#features"
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#C45A15] text-white text-sm font-bold hover:bg-[#AA4C0F] transition-colors whitespace-nowrap"
                  >
                    <span>Khám phá các không gian</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}

                <a
                  href="#guide"
                  className="inline-flex items-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-semibold text-[#5C5347] hover:text-[#C45A15] transition-colors whitespace-nowrap"
                >
                  Xem hướng dẫn 3 bước
                </a>
              </div>

              {authError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 max-w-xl">
                  {authError}
                </div>
              )}

              <div className="pt-4 border-t border-[#E5DBC4] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#6B6154]">
                <span>Tông màu giấy note chống lóa</span>
                <span aria-hidden="true">·</span>
                <span>Chụp ảnh nộp bài trực tiếp</span>
                <span aria-hidden="true">·</span>
                <span>Lưu trữ đồng bộ đa thiết bị</span>
              </div>
            </div>

            {/* Hero Right: Nhịp Nhỏ Living Animated Showcase (No square box!) */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-[#E5DBC4] bg-[#FDF3D0] p-6 sm:p-8 space-y-6 shadow-[0_22px_50px_-30px_rgba(35,30,24,0.22)]">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#8A6D46] border-b border-[#EBDAB0] pb-3">
                  <HeartbeatSlogan />
                  <span className="font-mono tabular-nums shrink-0">Nhịp Nhỏ</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <NhiphocAnimatedLogo size="md" />
                    <motion.div
                      key={selectedMood}
                      initial={{ scale: 0.9, y: 8 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                      className="flex items-center justify-center shrink-0"
                    >
                      <MascotAvatar size="2xl" mood={selectedMood} />
                    </motion.div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#C45A15]">Linh vật Nhịp Nhỏ (Chạm để tương tác)</p>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#231E18]">
                      Chú bút chì đồng hành giữ nhịp tập trung
                    </h2>
                    <p className="text-sm text-[#4F463B] leading-relaxed">
                      {activeMoodMeta.caption}
                    </p>
                  </div>
                </div>

                {/* Interactive Mood Switcher */}
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-[#6B6154]">
                    Chọn biểu cảm hoạt cảnh của Nhịp Nhỏ:
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {MASCOT_MOODS.map((item) => {
                      const active = selectedMood === item.mood;
                      return (
                        <button
                          key={item.mood}
                          type="button"
                          data-custom-sound="true"
                          onClick={() => {
                            setSelectedMood(item.mood);
                            playMascotSound(item.mood);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-[#C45A15] text-white shadow-sm'
                              : 'bg-white text-[#5C5347] border border-[#E5DBC4] hover:text-[#231E18]'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Note Preview Snippet */}
                <div className="rounded-2xl border border-[#E5DBC4] bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#231E18]">Ghi chú nhiệm vụ hôm nay</span>
                    <span className="font-mono font-bold text-[#C45A15] tabular-nums">
                      3/4 hoàn thành
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#FDF3D0] overflow-hidden">
                    <div className="h-full w-3/4 bg-[#C45A15] rounded-full" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#6B6154] pt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCheck className="w-3.5 h-3.5 text-[#3F6A52]" />
                      Toán học: Đã chấm xong (9.5/10)
                    </span>
                    <span className="font-mono tabular-nums text-[#C45A15] font-semibold">
                      25:00
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Dedicated Feature Blocks for Student, Parent, Assistant */}
        <section id="features" className="bg-white py-20 border-b border-[#E5DBC4]">
          <div className="max-w-[1240px] mx-auto px-6 space-y-14">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-bold text-[#C45A15]">Tính năng theo từng vai trò</p>
              <h2
                className="text-3xl sm:text-4xl font-extrabold text-[#231E18] leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Ba không gian chuyên biệt kết nối nhịp nhàng trong một hệ thống
              </h2>
              <p className="text-base text-[#6B6154] leading-relaxed">
                Mỗi tài khoản bước vào đúng giao diện mình cần: Học sinh rèn thói quen tập trung,
                Phụ huynh nắm bắt an tâm, Trợ lý theo dõi và phản hồi kịp thời.
              </p>
            </div>

            {/* Block 01: Featured Student Space (Wide 12-col sticky note spread) */}
            <div className="rounded-3xl border border-[#E5DBC4] bg-[#FBF8F1] p-7 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-5">
                <div className="flex items-center gap-2.5 text-xs font-bold text-[#C45A15]">
                  <span>01. Không gian Học sinh</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#6B6154]">Giấy note sáng dịu tập trung</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#231E18]">
                  Làm bài tập rõ từng bước, bấm giờ nuôi Cây tập trung
                </h3>
                <p className="text-sm sm:text-base text-[#5C5347] leading-relaxed">
                  Không gian học sinh chia gọn thành 3 mục: <strong>Bài tập hôm nay</strong>,{' '}
                  <strong>Bài tập bổ sung</strong> và <strong>Cây tập trung</strong>. Khi làm xong
                  bài trên vở, học sinh chụp ảnh nộp ngay tại chỗ và nhận thông báo đẩy khi trợ lý
                  chấm xong.
                </p>
                <ul className="space-y-2.5 text-sm text-[#3F382F]">
                  <li className="flex items-start gap-2.5">
                    <Camera className="w-4 h-4 text-[#C45A15] shrink-0 mt-0.5 animate-float-gentle" />
                    <span>Chụp ảnh vở bài tập bằng camera hoặc chọn ảnh, nén nét chữ viết tự động</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-[#C45A15] shrink-0 mt-0.5 animate-float-gentle" />
                    <span>Hai lần tick rõ ràng: Đã nộp ngay lập tức & Đã chấm xong khi có điểm</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Trees className="w-4 h-4 text-[#3F6A52] shrink-0 mt-0.5 animate-tree-sway" />
                    <span>Đồng hồ Pomodoro (5–45 phút) tưới Cây tập trung qua 5 cấp độ sinh trưởng</span>
                  </li>
                </ul>
              </div>

              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#E5DBC4] bg-[#FDF3D0] p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#6B6154]">
                    <span className="font-bold text-[#C45A15]">Toán học</span>
                    <span>Hôm nay</span>
                  </div>
                  <p className="text-sm font-bold text-[#231E18]">
                    Hoàn thành 5 bài phương trình bậc nhất
                  </p>
                  <div className="pt-2 border-t border-[#E8DAB7] flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#3F6A52]">
                      <Check className="w-3.5 h-3.5" />
                      Đã nộp ảnh vở
                    </span>
                    <span className="text-[#6B6154]">Chờ chấm</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E5DBC4] bg-white p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#6B6154]">
                    <span className="font-bold text-[#3F6A52]">Cây tập trung</span>
                    <span className="font-mono tabular-nums">Cấp 3</span>
                  </div>
                  <p className="text-2xl font-extrabold font-mono text-[#C45A15] tabular-nums">
                    25:00
                  </p>
                  <p className="text-xs text-[#6B6154] leading-relaxed">
                    Phiên học sâu cùng Nhịp Nhỏ · Tích lũy 120 phút tuần này
                  </p>
                </div>

                <div className="sm:col-span-2 rounded-2xl border border-[#E5DBC4] bg-white p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#C45A15]">
                      Phản hồi trợ lý (Tức thì / Đếm ngược 1 giờ)
                    </p>
                    <p className="text-sm text-[#231E18]">
                      “Bài trình bày sạch sẽ, câu 3b em tính đúng hướng rồi nhé!”
                    </p>
                  </div>
                  <MessageSquareText className="w-5 h-5 text-[#C45A15] shrink-0 animate-float-gentle" />
                </div>
              </div>
            </div>

            {/* Block 02 & 03: Parent Dark Desk + Assistant Hub */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Block 02: Parent (Warm Light Sticky-Note Mode) */}
              <div className="lg:col-span-6 rounded-3xl border border-[#E5DBC4] bg-[#FDF3D0]/70 text-[#231E18] p-7 sm:p-9 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-[#C45A15]">
                    <span>02. Không gian Phụ huynh</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#6B6154]">Giao diện sáng dịu mắt</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#231E18]">
                    Nắm bắt tiến độ của con và đồng hành cùng Trợ lý
                  </h3>
                  <p className="text-sm text-[#5C5347] leading-relaxed">
                    Giao diện giấy note sáng ấm giúp phụ huynh kiểm tra bài tập thoải mái bất cứ lúc
                    nào. Xem tỷ lệ hoàn thành, biểu đồ tập trung theo tuần, ảnh bài làm của con, bản
                    tin cuối ngày và đặt lịch trao đổi trực tiếp.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E5DBC4] bg-white p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6B6154]">Bản tin cuối ngày</span>
                    <span className="font-mono font-bold text-[#C45A15] tabular-nums">
                      Hoàn thành 92%
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Star className="w-4 h-4 text-[#C45A15] shrink-0 mt-0.5 animate-star-twinkle" />
                    <p className="text-xs text-[#231E18] leading-relaxed">
                      Con đã hoàn thành bài Toán & Tiếng Anh, đạt 95 phút trên Cây tập trung.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#EFE6D2] flex items-start gap-3">
                    <Lightbulb className="w-4 h-4 text-[#C45A15] shrink-0 mt-0.5 animate-glow-pulse" />
                    <p className="text-xs text-[#5C5347] leading-relaxed">
                      Gợi ý đồng hành: Tối nay hỏi thăm con phần hình học hoặc đặt lịch trao đổi 15
                      phút cùng trợ lý.
                    </p>
                  </div>
                </div>
              </div>

              {/* Block 03: Assistant */}
              <div className="lg:col-span-6 rounded-3xl border border-[#E5DBC4] bg-[#FBF8F1] p-7 sm:p-9 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-[#C45A15]">
                    <span>03. Không gian Trợ lý</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#6B6154]">Điều phối & Chấm bài trực tiếp</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#231E18]">
                    Quản lý học sinh, chấm ảnh bài làm và xác nhận lịch hẹn
                  </h3>
                  <p className="text-sm text-[#5C5347] leading-relaxed">
                    Trợ lý quản lý danh sách học sinh theo dõi, giao bài tập mới theo ngày hoặc bài
                    bổ sung, xem ảnh bài làm để chấm điểm kèm nhận xét, bật trạng thái Đang trực và
                    hồi âm phản hồi của phụ huynh.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E5DBC4] bg-white p-5 space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#231E18]">Hàng chờ chấm bài ảnh</span>
                    <span className="font-semibold text-[#C45A15]">Đang trực tuyến</span>
                  </div>
                  <div className="space-y-2 text-xs text-[#5C5347]">
                    <div className="flex items-center justify-between py-2 border-b border-[#EFE6D2]">
                      <span>Minh Anh · Toán học (Ảnh bài làm)</span>
                      <span className="font-bold text-[#C45A15]">Chấm bài →</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#3F6A52]" />
                        Lịch hẹn phụ huynh: 19:30 Thứ 5
                      </span>
                      <span className="font-semibold text-[#3F6A52]">Đã xác nhận</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Hướng dẫn 3 bước & Bảng màu giấy note */}
        <section id="guide" className="bg-[#FBF8F1] py-20 border-b border-[#E5DBC4]">
          <div className="max-w-[1240px] mx-auto px-6 space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-xl space-y-2">
                <p className="text-xs font-bold text-[#C45A15]">Hướng dẫn sử dụng</p>
                <h2 className="text-3xl font-extrabold text-[#231E18]">
                  Bắt đầu đồng hành chỉ với 3 bước đơn giản
                </h2>
              </div>
              <p className="text-sm text-[#6B6154] max-w-md">
                Dữ liệu lưu trữ an toàn trên Cloud Firestore — đăng nhập lại ở máy tính hay điện
                thoại đều giữ nguyên toàn bộ tiến độ.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-7 rounded-2xl border border-[#E5DBC4] bg-white space-y-3">
                <p className="text-xs font-mono font-bold text-[#C45A15]">Bước 01</p>
                <h3 className="text-lg font-bold text-[#231E18]">
                  Đăng nhập & kết nối bằng mã NH
                </h3>
                <p className="text-sm text-[#5C5347] leading-relaxed">
                  Phụ huynh chỉ cần nhập mã{' '}
                  <span className="font-mono font-semibold text-[#231E18]">NH...</span> của con để
                  đăng nhập ngay; Học sinh &amp; Trợ lý đăng nhập bằng Google để tạo và quản lý hồ
                  sơ học tập.
                </p>
              </div>

              <div className="p-7 rounded-2xl border border-[#E5DBC4] bg-[#FDF3D0]/75 space-y-3">
                <p className="text-xs font-mono font-bold text-[#C45A15]">Bước 02</p>
                <h3 className="text-lg font-bold text-[#231E18]">
                  Chụp ảnh nộp bài & bấm giờ tập trung
                </h3>
                <p className="text-sm text-[#5C5347] leading-relaxed">
                  Học sinh xem danh sách việc cần làm, bật đồng hồ Pomodoro nuôi Cây tập trung và
                  chụp ảnh trang vở để tick Đã nộp ngay.
                </p>
              </div>

              <div className="p-7 rounded-2xl border border-[#E5DBC4] bg-white space-y-3">
                <p className="text-xs font-mono font-bold text-[#C45A15]">Bước 03</p>
                <h3 className="text-lg font-bold text-[#231E18]">
                  Nhận xét kịp thời & theo dõi cùng gia đình
                </h3>
                <p className="text-sm text-[#5C5347] leading-relaxed">
                  Trợ lý chấm ảnh bài làm và gửi điểm số, đồng thời thông báo đẩy báo cho học sinh
                  và cập nhật ngay sang giao diện Phụ huynh.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Registration / Login Panel */}
        <section id="start-panel" className="bg-white py-20 border-b border-[#E5DBC4]">
          <div className="max-w-[1040px] mx-auto px-6">
            {!firebaseUser ? (
              <div className="rounded-3xl border border-[#E5DBC4] bg-[#FBF8F1] p-7 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-5">
                  <p className="text-xs font-bold text-[#C45A15]">Bắt đầu cùng NhịpHọc</p>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#231E18]">
                    Chọn vai trò của bạn và đăng nhập chỉ trong 10 giây
                  </h2>
                  <p className="text-sm text-[#5C5347] leading-relaxed">
                    Dù bạn là Học sinh đang luyện tập, Phụ huynh muốn đồng hành buổi tối, hay Trợ
                    lý quản lý lớp học — toàn bộ dữ liệu đều đồng bộ mượt mà.
                  </p>

                  <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#F3ECDC] border border-[#E5DBC4]">
                    {ROLE_CARDS.map((item) => {
                      const Icon = item.icon;
                      const active = selectedRole === item.role;
                      return (
                        <button
                          key={item.role}
                          type="button"
                          onClick={() => selectRole(item.role)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                            active
                              ? 'bg-[#C45A15] text-white shadow-sm'
                              : 'text-[#5C5347] hover:text-[#231E18]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-6 space-y-5">
                  <div
                    className={`rounded-2xl border p-6 space-y-4 transition-colors ${
                      selectedRole === 'parent'
                        ? 'bg-[#FDF3D0]/70 border-[#E5DBC4] text-[#231E18]'
                        : 'bg-white border-[#E5DBC4] text-[#231E18]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[#C45A15]">
                        Không gian {ROLE_CARDS.find((r) => r.role === selectedRole)?.title}
                      </p>
                      <span className="text-xs text-[#6B6154]">
                        {ROLE_CARDS.find((r) => r.role === selectedRole)?.subtitle}
                      </span>
                    </div>

                    <ul className="space-y-2.5">
                      {ROLE_CARDS.find((r) => r.role === selectedRole)?.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-xs leading-relaxed">
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#C45A15]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedRole === 'parent' ? (
                    <div className="rounded-2xl border border-[#E5DBC4] bg-white p-5 space-y-4 shadow-sm">
                      <div>
                        <p className="text-sm font-extrabold text-[#231E18] flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-[#C45A15]" />
                          {parentCreateMode
                            ? 'Tạo hồ sơ học sinh mới (Phụ huynh)'
                            : 'Đăng nhập Phụ huynh bằng Mã kết nối của con'}
                        </p>
                        <p className="text-xs text-[#6B6154] mt-0.5">
                          {parentCreateMode
                            ? 'Tạo nhanh hồ sơ mới và nhận mã NH... để kết nối với máy của con.'
                            : 'Không cần email hay OTP — chỉ cần nhập mã NH... hiển thị ở màn hình của con.'}
                        </p>
                      </div>

                      <form onSubmit={handleParentCodeSubmit} className="space-y-3">
                        {!parentCreateMode ? (
                          <div>
                            <label
                              htmlFor="parent-link-code-input"
                              className="block text-xs font-semibold text-[#231E18] mb-1.5"
                            >
                              Mã kết nối của con (ví dụ: NH842K19)
                            </label>
                            <input
                              id="parent-link-code-input"
                              type="text"
                              required
                              maxLength={12}
                              value={parentCodeInput}
                              onChange={(e) => setParentCodeInput(e.target.value.toUpperCase())}
                              placeholder="NH842K19"
                              className="w-full rounded-xl border border-[#E5DBC4] bg-[#FBF8F1] px-3.5 py-2.5 text-base font-mono font-bold uppercase tracking-[0.2em] text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label
                                htmlFor="parent-new-student-name"
                                className="block text-xs font-semibold text-[#231E18] mb-1.5"
                              >
                                Tên của con
                              </label>
                              <input
                                id="parent-new-student-name"
                                type="text"
                                required
                                maxLength={80}
                                value={parentStudentName}
                                onChange={(e) => setParentStudentName(e.target.value)}
                                placeholder="Bé Minh Anh"
                                className="w-full rounded-xl border border-[#E5DBC4] bg-[#FBF8F1] px-3.5 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="parent-new-student-grade"
                                className="block text-xs font-semibold text-[#231E18] mb-1.5"
                              >
                                Lớp / Khối học
                              </label>
                              <input
                                id="parent-new-student-grade"
                                type="text"
                                maxLength={40}
                                value={parentStudentGrade}
                                onChange={(e) => setParentStudentGrade(e.target.value)}
                                placeholder="Lớp 8"
                                className="w-full rounded-xl border border-[#E5DBC4] bg-[#FBF8F1] px-3.5 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label
                            htmlFor="parent-display-name-input"
                            className="block text-xs font-semibold text-[#231E18] mb-1.5"
                          >
                            Tên gọi của phụ huynh (tùy chọn)
                          </label>
                          <input
                            id="parent-display-name-input"
                            type="text"
                            maxLength={80}
                            value={parentNameInput}
                            onChange={(e) => setParentNameInput(e.target.value)}
                            placeholder="Ví dụ: Mẹ Minh Anh (để trống vẫn vào ngay)"
                            className="w-full rounded-xl border border-[#E5DBC4] bg-[#FBF8F1] px-3.5 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={parentLoading}
                          className="w-full py-3.5 px-5 rounded-2xl bg-[#C45A15] text-white text-sm font-bold hover:bg-[#AA4C0F] disabled:opacity-50 transition-colors flex items-center justify-center gap-2.5 shadow-sm"
                        >
                          <KeyRound className="w-4 h-4 text-[#FDF3D0]" />
                          <span>
                            {parentLoading
                              ? 'Đang mở không gian Phụ huynh...'
                              : parentCreateMode
                                ? 'Tạo hồ sơ & Vào không gian Phụ huynh'
                                : 'Đăng nhập không gian Phụ huynh'}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </form>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setParentCreateMode((v) => !v);
                            setParentError(null);
                          }}
                          className="text-xs font-semibold text-[#C45A15] hover:underline"
                        >
                          {parentCreateMode
                            ? '← Đã có mã NH... của con? Quay lại nhập mã'
                            : 'Chưa có mã kết nối của con? Tạo hồ sơ mới ngay'}
                        </button>
                      </div>

                      {(parentError || authError) && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 leading-relaxed">
                          {parentError || authError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={onGoogleSignIn}
                        disabled={authLoading}
                        className="w-full py-3.5 px-5 rounded-2xl bg-[#C45A15] text-white text-sm font-bold hover:bg-[#AA4C0F] disabled:opacity-50 transition-colors flex items-center justify-center gap-3 shadow-sm"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#FDF3D0]" />
                        <span>
                          {authLoading ? 'Đang mở đăng nhập...' : 'Đăng nhập / Đăng ký bằng Google'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <p className="text-center text-xs text-[#6B6154]">
                        Phụ huynh không cần email —{' '}
                        <button
                          type="button"
                          onClick={() => selectRole('parent')}
                          className="font-bold text-[#C45A15] hover:underline"
                        >
                          chọn mục Phụ huynh để vào bằng mã kết nối của con
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-[#E5DBC4] bg-[#FDF3D0]/55 p-8 text-center space-y-4">
                <MascotAvatar size="lg" mood="happy" className="mx-auto" />
                <h2 className="text-xl font-extrabold text-[#231E18]">
                  Bạn đã xác thực tài khoản thành công
                </h2>
                <p className="text-sm text-[#5C5347] max-w-md mx-auto">
                  Hãy hoàn tất thông tin vai trò ở biểu mẫu phía trên đầu trang để bước vào không
                  gian NhịpHọc ngay.
                </p>
                <a
                  href="#intro"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F]"
                >
                  Lên biểu mẫu hoàn tất hồ sơ
                </a>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Full Website Footer */}
      <footer className="bg-[#F6EFE0] border-t border-[#E5DBC4] py-12 text-[#5C5347]">
        <div className="max-w-[1240px] mx-auto px-6 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <NhiphocLogoMark className="w-8 h-8 shrink-0" />
                <span className="text-lg font-extrabold text-[#231E18]">
                  Nhịp<span className="text-[#C45A15]">Học</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                Website đồng hành học tập theo nhịp điệu tự nhiên cùng linh vật Nhịp Nhỏ — sử dụng
                bảng màu giấy note dịu mắt để nuôi dưỡng sự tập trung bền bỉ mỗi ngày.
              </p>
            </div>

            <div className="md:col-span-3 space-y-3 text-sm">
              <p className="font-bold text-[#231E18]">Điều hướng trang</p>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#intro" className="hover:text-[#C45A15] transition-colors">
                    Giới thiệu NhịpHọc
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-[#C45A15] transition-colors">
                    Tính năng cho Học sinh, Phụ huynh, Trợ lý
                  </a>
                </li>
                <li>
                  <a href="#guide" className="hover:text-[#C45A15] transition-colors">
                    Hướng dẫn 3 bước
                  </a>
                </li>
                <li>
                  <a href="#start-panel" className="hover:text-[#C45A15] transition-colors">
                    Đăng nhập / Bắt đầu ngay
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3 text-sm">
              <p className="font-bold text-[#231E18]">Ba không gian đồng bộ</p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-[#C45A15]" />
                  <span>Học sinh: Bài tập hôm nay · Chụp ảnh · Cây tập trung</span>
                </li>
                <li className="flex items-center gap-2">
                  <HeartHandshake className="w-3.5 h-3.5 text-[#C45A15]" />
                  <span>Phụ huynh: Tiến độ con · Bản tin cuối ngày · Lịch hẹn</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[#C45A15]" />
                  <span>Trợ lý: Chấm bài ảnh · Nhận xét tức thì · Phản hồi</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E5DBC4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#6B6154]">
            <span>© {new Date().getFullYear()} NhịpHọc · Đồng hành cùng Nhịp Nhỏ</span>
            <span>Lưu trữ & đồng bộ thời gian thực trên Firebase Cloud Firestore</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
