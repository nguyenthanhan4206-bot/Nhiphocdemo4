import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Flame,
  LogOut,
  Menu,
  MessageSquareText,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Sprout,
  Star,
  Trash2,
  Trees,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  Assignment,
  FocusSession,
  Message,
  PublicUser,
  StudentProfile,
} from '../types';
import {
  createAssignment,
  getTreeStageLabel,
  logFocusSession,
  sendMessage,
  submitAssignmentPhoto,
} from '../services/nhiphocService';
import { formatCountdownMs, formatTimeAgoVi } from '../utils/imageCompress';
import { CameraCaptureModal } from './CameraCaptureModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import {
  FocusTreeIllustration,
  HeartbeatSlogan,
  MascotAvatar,
  NhiphocAnimatedLogo,
  NhiphocLogoMark,
} from './MascotAvatar';
import { playSuccessSound } from '../utils/soundEffects';

export type StudentTab = 'today' | 'extra' | 'focus_tree';

interface StudentDashboardProps {
  user: PublicUser;
  student: StudentProfile;
  assignments: Assignment[];
  focusSessions: FocusSession[];
  messages: Message[];
  unreadMessagesCount?: number;
  requestedTab?: { tab: StudentTab; nonce: number } | null;
  openMessagesNonce?: number;
  onMarkMessagesRead?: () => void;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

type StatusFilter = 'all' | 'pending' | 'needs_revision' | 'submitted' | 'graded';

function playGentleChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.14 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.85);
    });
  } catch {
    // Ignore audio context block
  }
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  student,
  assignments,
  focusSessions,
  messages,
  unreadMessagesCount = 0,
  requestedTab,
  openMessagesNonce = 0,
  onMarkMessagesRead,
  onSignOut,
  onDeleteAccount,
}) => {
  const [activeTab, setActiveTab] = useState<StudentTab>('today');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Messages drawer state
  const [showMessagesDrawer, setShowMessagesDrawer] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Camera modal & photo preview modal
  const [submittingAssignment, setSubmittingAssignment] = useState<Assignment | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ title: string; url: string } | null>(null);

  // Add self-practice assignment modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubject, setNewSubject] = useState('Toán học');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  // Focus Timer state
  const [presetMinutes, setPresetMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [focusNote, setFocusNote] = useState('');
  const [savingFocus, setSavingFocus] = useState(false);
  const [focusSavedBanner, setFocusSavedBanner] = useState<string | null>(null);

  const timerLoggedRef = useRef(false);

  const studentMessages = useMemo(
    () => messages.filter((m) => m.studentId === student.id),
    [messages, student.id],
  );

  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab.tab);
      setFilter('all');
    }
  }, [requestedTab]);

  useEffect(() => {
    if (openMessagesNonce > 0) {
      setShowMessagesDrawer(true);
    }
  }, [openMessagesNonce]);

  useEffect(() => {
    if (showMessagesDrawer) {
      onMarkMessagesRead?.();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showMessagesDrawer, studentMessages.length, onMarkMessagesRead]);

  // Tick every second for 1-hour feedback countdown & Focus Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (secondsLeft === 0 && !timerLoggedRef.current) {
      timerLoggedRef.current = true;
      setTimerRunning(false);
      if (soundEnabled) playGentleChime();
      handleSaveFocusSession(presetMinutes);
    }
  }, [secondsLeft, soundEnabled, presetMinutes]);

  const handleSelectPreset = (mins: number) => {
    setTimerRunning(false);
    setPresetMinutes(mins);
    setSecondsLeft(mins * 60);
    timerLoggedRef.current = false;
    setFocusSavedBanner(null);
  };

  const handleResetTimer = () => {
    setTimerRunning(false);
    setSecondsLeft(presetMinutes * 60);
    timerLoggedRef.current = false;
    setFocusSavedBanner(null);
  };

  const handleSaveFocusSession = async (minsOverride?: number) => {
    const elapsedSeconds = presetMinutes * 60 - secondsLeft;
    const minsToSave = minsOverride ?? Math.max(1, Math.round(elapsedSeconds / 60));
    setSavingFocus(true);
    try {
      await logFocusSession({
        student,
        uid: user.uid,
        durationMinutes: minsToSave,
        note: focusNote || `Phiên tập trung ${minsToSave} phút`,
      });
      setFocusSavedBanner(`Đã tưới thêm ${minsToSave} phút cho Cây tập trung của bạn.`);
      playSuccessSound();
      setFocusNote('');
      setSecondsLeft(presetMinutes * 60);
      setTimerRunning(false);
      timerLoggedRef.current = false;
    } finally {
      setSavingFocus(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(student.linkCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAddingTask(true);
    try {
      await createAssignment({
        student,
        createdBy: user.uid,
        type: activeTab === 'extra' ? 'extra' : 'today',
        subject: newSubject,
        title: newTitle,
        description: newDesc,
        dueLabel: activeTab === 'extra' ? 'Tự luyện bổ sung' : 'Hôm nay',
      });
      setNewTitle('');
      setNewDesc('');
      setShowAddModal(false);
    } finally {
      setAddingTask(false);
    }
  };

  const handleSendStudentMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    setSendingMsg(true);
    try {
      await sendMessage({
        student,
        senderUid: user.uid,
        senderName: user.displayName,
        senderRole: 'student',
        content: msgInput,
      });
      setMsgInput('');
    } finally {
      setSendingMsg(false);
    }
  };

  const currentTypeAssignments = useMemo(() => {
    const targetType = activeTab === 'extra' ? 'extra' : 'today';
    return assignments.filter((a) => a.type === targetType);
  }, [assignments, activeTab]);

  const filteredAssignments = useMemo(() => {
    if (filter === 'all') return currentTypeAssignments;
    return currentTypeAssignments.filter((a) => a.status === filter);
  }, [currentTypeAssignments, filter]);

  const todayStats = useMemo(() => {
    const todayList = assignments.filter((a) => a.type === 'today');
    const submittedOrGraded = todayList.filter(
      (a) => a.status === 'submitted' || a.status === 'graded',
    ).length;
    const graded = todayList.filter((a) => a.status === 'graded').length;
    const needsRevision = todayList.filter((a) => a.status === 'needs_revision').length;
    const pct = todayList.length > 0 ? Math.round((submittedOrGraded / todayList.length) * 100) : 0;
    return { total: todayList.length, submittedOrGraded, graded, needsRevision, pct };
  }, [assignments]);

  const currentNeedsRevisionCount = useMemo(
    () => currentTypeAssignments.filter((a) => a.status === 'needs_revision').length,
    [currentTypeAssignments],
  );

  const treeStage = getTreeStageLabel(student.focusMinutesTotal);
  const nextMilestone =
    student.focusMinutesTotal < 30
      ? 30
      : student.focusMinutesTotal < 90
        ? 90
        : student.focusMinutesTotal < 180
          ? 180
          : 300;
  const stageProgressPct = Math.min(100, Math.round((student.focusMinutesTotal / nextMilestone) * 100));

  const timerDisplay = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(
    secondsLeft % 60,
  ).padStart(2, '0')}`;

  const navItems: Array<{
    id: StudentTab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'today', label: 'Bài tập hôm nay', icon: BookOpen },
    { id: 'extra', label: 'Bài tập bổ sung', icon: Sparkles },
    { id: 'focus_tree', label: 'Cây tập trung', icon: Trees },
  ];

  const mascotBannerMood =
    activeTab === 'focus_tree'
      ? timerRunning
        ? 'trying'
        : 'relax'
      : activeTab === 'extra'
        ? 'creative'
        : todayStats.total > 0 && todayStats.submittedOrGraded === todayStats.total
          ? 'happy'
          : 'study';

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between p-5">
      <div className="space-y-6">
        {/* Brand Header with Folded-Note Mark */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5DBC4]">
          <NhiphocLogoMark className="w-10 h-10 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-extrabold tracking-tight text-[#231E18] leading-tight">
              Nhịp<span className="text-[#C45A15]">Học</span>
            </p>
            <p className="text-xs text-[#6B6154] truncate">
              {student.studentName} · {student.grade}
            </p>
          </div>
        </div>

        {/* 3 Navigation Items */}
        <nav className="space-y-1.5" aria-label="Menu học sinh">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setFilter('all');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#C45A15] text-white shadow-sm'
                    : 'text-[#5C5347] hover:bg-[#FDF3D0] hover:text-[#231E18]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    item.id === 'focus_tree'
                      ? 'animate-tree-sway'
                      : item.id === 'extra'
                        ? 'animate-star-twinkle'
                        : ''
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Link Code Box for Parent / Assistant */}
        <div className="rounded-xl border border-[#E5DBC4] bg-[#FDF3D0]/75 p-3.5 space-y-2">
          <p className="text-xs font-bold text-[#C45A15]">Mã kết nối gia đình</p>
          <p className="text-xs text-[#6B6154] leading-relaxed">
            Gửi mã này cho Phụ huynh hoặc Trợ lý để kết nối cùng theo dõi bài tập.
          </p>
          <button
            type="button"
            onClick={handleCopyCode}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-[#E5DBC4] text-xs font-mono font-bold text-[#231E18] hover:border-[#C45A15] transition-colors"
          >
            <span>{student.linkCode}</span>
            <span className="inline-flex items-center gap-1 text-[#C45A15] font-sans">
              <Copy className="w-3.5 h-3.5" />
              {copiedCode ? 'Đã chép' : 'Sao chép'}
            </span>
          </button>
        </div>
      </div>

      {/* Footer Account */}
      <div className="pt-4 border-t border-[#E5DBC4] space-y-3">
        <div className="text-xs text-[#6B6154]">
          <p className="font-bold text-[#231E18] truncate">{user.displayName}</p>
          <p className="truncate">
            Trợ lý: {student.assistantOnline ? 'Đang trực tuyến' : 'Ngoại tuyến (nhận xét sau 1h)'}
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-[#E5DBC4] text-xs font-semibold text-[#5C5347] hover:bg-[#FDF3D0] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Đăng xuất / Đổi vai trò
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#8C8172] hover:text-red-700 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Xóa tài khoản
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-[#231E18] flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 bg-white border-r border-[#E5DBC4] sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#231E18]/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full border-r border-[#E5DBC4] z-10">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-[#6B6154] hover:bg-[#FDF3D0]"
              aria-label="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Workspace Top Bar */}
        <header className="bg-[#FBF8F1]/95 backdrop-blur-sm border-b border-[#E5DBC4] sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-3.5 sm:px-8 py-3 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-[#231E18] hover:bg-[#FDF3D0] shrink-0"
                aria-label="Mở menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#6B6154]">
                  Học sinh · {student.grade}
                </p>
                <h1 className="text-[15px] sm:text-lg font-extrabold text-[#231E18] leading-snug">
                  {navItems.find((n) => n.id === activeTab)?.label}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowMessagesDrawer(true)}
                aria-label="Tin nhắn trợ lý"
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                  unreadMessagesCount > 0
                    ? 'border-[#C45A15] bg-[#FDF3D0] text-[#C45A15]'
                    : 'border-[#E5DBC4] bg-white text-[#5C5347] hover:bg-[#FDF3D0]'
                }`}
              >
                <MessageSquareText className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <span className="hidden md:inline">Tin nhắn trợ lý</span>
                  <span className="hidden sm:inline md:hidden">Tin nhắn</span>
                  {unreadMessagesCount > 0
                    ? ` (${unreadMessagesCount})`
                    : studentMessages.length > 0
                      ? ` (${studentMessages.length})`
                      : ''}
                </span>
              </button>
              {activeTab !== 'focus_tree' && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 sm:px-4 py-2 rounded-lg bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden md:inline">Thêm bài tự luyện</span>
                  <span className="md:hidden">Thêm</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-5 sm:px-8 py-7 space-y-6">
          {/* Nhịp Nhỏ Sticky-Note Rhythm Banner */}
          <section className="rounded-2xl border border-[#E5DBC4] bg-[#FDF3D0] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <NhiphocAnimatedLogo size="sm" />
                <MascotAvatar size="xl" mood={mascotBannerMood} />
              </div>
              <div className="space-y-1.5">
                <HeartbeatSlogan className="text-xs sm:text-sm" />
                <h2 className="text-lg sm:text-xl font-extrabold text-[#231E18]">
                  {activeTab === 'extra'
                    ? `Xin chào, ${student.studentName}! Cùng khám phá bài tự luyện sáng tạo nhé!`
                    : activeTab === 'focus_tree'
                      ? `Xin chào, ${student.studentName}! Giữ nhịp tập trung để Cây xanh lớn nhanh nhé!`
                      : `Xin chào, ${student.studentName}! Giữ sự tập trung trên từng mục nhé!`}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0 border-t sm:border-t-0 sm:border-l border-[#E6D6AC] pt-3 sm:pt-0 sm:pl-6 tabular-nums">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#C45A15] shrink-0 animate-flame" />
                <div>
                  <p className="text-xs text-[#6B6154]">Chuỗi ngày</p>
                  <p className="text-base font-extrabold text-[#231E18]">
                    {student.streakDays} ngày
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[#C45A15] shrink-0 animate-star-twinkle" />
                <div>
                  <p className="text-xs text-[#6B6154]">Cây tập trung</p>
                  <p className="text-base font-extrabold text-[#C45A15]">
                    {student.focusMinutesTotal} phút
                  </p>
                </div>
              </div>
            </div>
          </section>

          {activeTab !== 'focus_tree' ? (
            <>
              {/* Daily Progress Tracker + 2 Clean Note Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-6 p-5 rounded-2xl bg-white border border-[#E5DBC4] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#6B6154]">
                      Hôm nay em đã hoàn thành
                    </p>
                    <span className="text-xs font-mono font-bold text-[#C45A15] tabular-nums">
                      {todayStats.pct}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-2xl font-extrabold text-[#231E18] tabular-nums">
                      {todayStats.submittedOrGraded}/{todayStats.total}{' '}
                      <span className="text-sm font-semibold text-[#6B6154]">nhiệm vụ</span>
                    </p>
                    <span className="text-xs text-[#6B6154] tabular-nums">
                      {todayStats.graded} bài đã chấm
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#FDF3D0] overflow-hidden">
                    <div
                      className="h-full bg-[#C45A15] rounded-full transition-all duration-300"
                      style={{ width: `${todayStats.pct}%` }}
                    />
                  </div>
                </div>

                <div className="lg:col-span-3 p-5 rounded-2xl bg-white border border-[#E5DBC4] flex flex-col justify-between">
                  <p className="text-xs font-semibold text-[#6B6154]">Trợ lý đã chấm xong</p>
                  <p className="text-2xl font-extrabold text-[#3F6A52] mt-2 tabular-nums">
                    {todayStats.graded}/{todayStats.total} bài
                  </p>
                </div>

                <div className="lg:col-span-3 p-5 rounded-2xl bg-white border border-[#E5DBC4] flex flex-col justify-between">
                  <p className="text-xs font-semibold text-[#6B6154]">Trạng thái trợ lý</p>
                  <p className="text-sm font-bold text-[#231E18] mt-2 leading-snug">
                    {student.assistantOnline
                      ? 'Đang trực · Nhận xét ngay'
                      : 'Ngoại tuyến · Nhận xét sau 1h'}
                  </p>
                </div>
              </div>

              {/* Interactive Filter Segmented Control */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F3ECDC] border border-[#E5DBC4]">
                  {(
                    [
                      { id: 'all', label: 'Tất cả' },
                      { id: 'pending', label: 'Chưa nộp' },
                      {
                        id: 'needs_revision',
                        label: `Cần nộp lại${currentNeedsRevisionCount > 0 ? ` (${currentNeedsRevisionCount})` : ''}`,
                      },
                      { id: 'submitted', label: 'Đã nộp' },
                      { id: 'graded', label: 'Đã chấm xong' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        filter === tab.id
                          ? 'bg-white text-[#231E18] shadow-sm'
                          : tab.id === 'needs_revision' && currentNeedsRevisionCount > 0
                            ? 'text-amber-900 font-bold hover:text-[#231E18]'
                            : 'text-[#6B6154] hover:text-[#231E18]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-[#6B6154] tabular-nums">
                  Hiển thị {filteredAssignments.length} bài tập
                </p>
              </div>

              {/* Assignment Checklist */}
              {filteredAssignments.length === 0 ? (
                <div className="rounded-2xl border border-[#E5DBC4] bg-white p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FDF3D0] border border-[#E5DBC4] text-[#C45A15] flex items-center justify-center mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#231E18]">
                    Chưa có bài tập nào trong mục này
                  </h3>
                  <p className="text-sm text-[#6B6154] max-w-md mx-auto">
                    Trợ lý sẽ giao bài mới tại đây, hoặc bạn có thể chủ động thêm một bài tự luyện
                    để chụp ảnh và lưu tiến độ.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm bài tập mới
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAssignments.map((item) => {
                    const isSubmitted = item.status === 'submitted';
                    const isNeedsRevision = item.status === 'needs_revision';
                    const isGraded = item.status === 'graded';
                    const canResubmit = isSubmitted || isNeedsRevision || isGraded;
                    const feedbackUnlocked =
                      isSubmitted &&
                      (student.assistantOnline ||
                        (item.feedbackScheduledAtMs > 0 && nowMs >= item.feedbackScheduledAtMs));

                    return (
                      <article
                        key={item.id}
                        className={`rounded-2xl border bg-white p-5 sm:p-6 space-y-4 ${
                          isNeedsRevision ? 'border-amber-400' : 'border-[#E5DBC4]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            {/* Dual-Tick To-Do Status Control */}
                            <div
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                                isGraded
                                  ? 'bg-[#3F6A52] border-[#3F6A52] text-white'
                                  : isNeedsRevision
                                    ? 'bg-amber-100 border-amber-500 text-amber-800'
                                    : isSubmitted
                                      ? 'bg-[#FDF3D0] border-[#C45A15] text-[#C45A15]'
                                      : 'bg-[#FBF8F1] border-[#DDD1B8] text-[#8C8172]'
                              }`}
                              title={
                                isGraded
                                  ? 'Đã chấm xong'
                                  : isNeedsRevision
                                    ? 'Cần làm lại & nộp lại'
                                    : isSubmitted
                                      ? 'Đã nộp bài'
                                      : 'Chưa nộp'
                              }
                            >
                              {isGraded ? (
                                <CheckCheck className="w-4 h-4" />
                              ) : isNeedsRevision ? (
                                <RotateCcw className="w-4 h-4" />
                              ) : isSubmitted ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-[#D8CBB1]" />
                              )}
                            </div>

                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6154]">
                                <span className="font-bold text-[#C45A15]">{item.subject}</span>
                                <span aria-hidden="true">·</span>
                                <span>{item.dueLabel}</span>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={
                                    isGraded
                                      ? 'font-bold text-[#3F6A52]'
                                      : isNeedsRevision
                                        ? 'font-bold text-amber-800'
                                        : isSubmitted
                                          ? 'font-semibold text-[#C45A15]'
                                          : 'text-[#8C8172]'
                                  }
                                >
                                  {isGraded
                                    ? 'Tick: Đã chấm xong'
                                    : isNeedsRevision
                                      ? 'Cần làm lại & nộp lại'
                                      : isSubmitted
                                        ? 'Tick: Đã nộp (chờ chấm chi tiết)'
                                        : 'Chưa nộp'}
                                </span>
                              </div>

                              <h3 className="text-base font-bold text-[#231E18]">
                                {item.title}
                              </h3>

                              {item.description && (
                                <p className="text-sm text-[#6B6154] leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pl-10 sm:pl-0">
                            {item.photoDataUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewPhoto({
                                    title: `Ảnh em đã nộp · ${item.title}`,
                                    url: item.photoDataUrl,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5DBC4] bg-[#FBF8F1] text-xs font-semibold text-[#231E18] hover:bg-[#FDF3D0] transition-colors whitespace-nowrap"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Xem ảnh đã nộp
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSubmittingAssignment(item)}
                              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                isNeedsRevision || !canResubmit
                                  ? 'bg-[#C45A15] text-white hover:bg-[#AA4C0F]'
                                  : 'border border-[#C45A15] text-[#C45A15] hover:bg-[#FDF3D0]'
                              }`}
                            >
                              {canResubmit ? (
                                <RotateCcw className="w-3.5 h-3.5" />
                              ) : (
                                <Camera className="w-3.5 h-3.5" />
                              )}
                              {isNeedsRevision
                                ? 'Nộp lại bài ngay'
                                : isSubmitted
                                  ? 'Nộp lại ảnh khác'
                                  : isGraded
                                    ? 'Nộp lại bài'
                                    : 'Chụp ảnh nộp bài'}
                            </button>
                          </div>
                        </div>

                        {/* Submitted Status & 1h / Instant Feedback Box */}
                        {isSubmitted && (
                          <div className="ml-10 rounded-xl border border-[#E5DBC4] bg-[#FBF8F1] p-4 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-[#C45A15] inline-flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-[#C45A15]" />
                                Đã tích hoàn thành nộp bài ({formatTimeAgoVi(item.submittedAtMs)})
                              </span>
                              {!feedbackUnlocked && (
                                <span className="font-mono text-[#6B6154] inline-flex items-center gap-1.5 tabular-nums">
                                  <Clock className="w-3.5 h-3.5" />
                                  Nhận xét mở sau: {formatCountdownMs(item.feedbackScheduledAtMs, nowMs)}
                                </span>
                              )}
                            </div>

                            {feedbackUnlocked ? (
                              <p className="text-sm text-[#3F382F] leading-relaxed">
                                {item.instantFeedbackNote ||
                                  'Bài nộp đã được chuyển tới trợ lý. Trợ lý đang rà soát từng câu để gửi chấm điểm hoàn tất.'}
                              </p>
                            ) : (
                              <p className="text-xs text-[#6B6154] leading-relaxed">
                                Trợ lý hiện đang ngoại tuyến. Bạn vẫn đã được tick Đã nộp trong
                                todolist; nhận xét sơ bộ sẽ hiển thị sau 1 giờ hoặc ngay khi trợ lý
                                trực tuyến trở lại.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Needs Revision Box */}
                        {isNeedsRevision && (
                          <div className="ml-10 rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold text-amber-900 inline-flex items-center gap-1.5">
                                <RotateCcw className="w-4 h-4" />
                                Trợ lý yêu cầu làm lại & nộp lại
                              </span>
                              {item.scoreLabel && (
                                <span className="text-xs font-bold text-amber-950 tabular-nums">
                                  {item.scoreLabel}
                                </span>
                              )}
                            </div>
                            {item.assistantFeedback && (
                              <p className="text-sm text-[#231E18] leading-relaxed whitespace-pre-wrap">
                                {item.assistantFeedback}
                              </p>
                            )}
                            {item.assistantFeedbackPhotoUrl && (
                              <div className="pt-1 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-amber-950">
                                    Ảnh trợ lý chấm & hướng dẫn sửa
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewPhoto({
                                        title: `Ảnh trợ lý chấm · ${item.title}`,
                                        url: item.assistantFeedbackPhotoUrl || '',
                                      })
                                    }
                                    className="inline-flex items-center gap-1 text-xs font-bold text-[#C45A15] hover:underline"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Xem ảnh lớn
                                  </button>
                                </div>
                                <img
                                  src={item.assistantFeedbackPhotoUrl}
                                  alt="Ảnh trợ lý chấm bài"
                                  onClick={() =>
                                    setPreviewPhoto({
                                      title: `Ảnh trợ lý chấm · ${item.title}`,
                                      url: item.assistantFeedbackPhotoUrl || '',
                                    })
                                  }
                                  className="max-h-56 rounded-lg border border-amber-200 bg-white object-contain cursor-zoom-in"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Graded Feedback Box */}
                        {isGraded && (
                          <div className="ml-10 rounded-xl border border-[#E5DBC4] bg-[#FDF3D0]/80 p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#3F6A52] inline-flex items-center gap-1.5">
                                <MessageSquareText className="w-4 h-4" />
                                Nhận xét từ trợ lý · Đã chấm xong
                              </span>
                              <span className="text-xs font-bold text-[#231E18] tabular-nums">
                                Kết quả: {item.scoreLabel || 'Hoàn thành tốt'}
                              </span>
                            </div>
                            {item.assistantFeedback && (
                              <p className="text-sm text-[#231E18] leading-relaxed whitespace-pre-wrap">
                                {item.assistantFeedback}
                              </p>
                            )}
                            {item.assistantFeedbackPhotoUrl && (
                              <div className="pt-1 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-[#3F6A52]">
                                    Ảnh bài đã chấm từ Trợ lý
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewPhoto({
                                        title: `Ảnh trợ lý chấm · ${item.title}`,
                                        url: item.assistantFeedbackPhotoUrl || '',
                                      })
                                    }
                                    className="inline-flex items-center gap-1 text-xs font-bold text-[#C45A15] hover:underline"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Xem ảnh lớn
                                  </button>
                                </div>
                                <img
                                  src={item.assistantFeedbackPhotoUrl}
                                  alt="Ảnh trợ lý chấm bài"
                                  onClick={() =>
                                    setPreviewPhoto({
                                      title: `Ảnh trợ lý chấm · ${item.title}`,
                                      url: item.assistantFeedbackPhotoUrl || '',
                                    })
                                  }
                                  className="max-h-56 rounded-lg border border-[#E5DBC4] bg-white object-contain cursor-zoom-in"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Section 3: Cây tập trung */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Tree Visual & Growth Progress */}
              <div className="lg:col-span-6 rounded-2xl border border-[#E5DBC4] bg-white p-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#6B6154]">Cấp độ hiện tại</p>
                    <h2 className="text-xl font-extrabold text-[#231E18]">
                      Cấp {treeStage.level} · {treeStage.label}
                    </h2>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-xs text-[#6B6154]">Tổng tích lũy</p>
                    <p className="text-lg font-extrabold text-[#C45A15]">
                      {student.focusMinutesTotal} phút
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E5DBC4] overflow-hidden aspect-square max-h-[340px] w-full">
                  <FocusTreeIllustration level={treeStage.level} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#6B6154] tabular-nums">
                    <span>Tiến độ lên cấp tiếp theo</span>
                    <span>
                      {student.focusMinutesTotal}/{nextMilestone} phút ({stageProgressPct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#FDF3D0] overflow-hidden">
                    <div
                      className="h-full bg-[#3F6A52] rounded-full transition-all duration-300"
                      style={{ width: `${stageProgressPct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#EFE6D2]">
                  <div>
                    <p className="text-xs text-[#6B6154]">Chuỗi ngày tập trung</p>
                    <p className="text-lg font-bold text-[#231E18] tabular-nums">
                      {student.streakDays} ngày
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B6154]">Số phiên đã lưu</p>
                    <p className="text-lg font-bold text-[#231E18] tabular-nums">
                      {focusSessions.length} phiên
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Interactive Focus Timer + History */}
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-[#E5DBC4] bg-white p-6 space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#6B6154]">Đồng hồ Pomodoro</p>
                      <h3 className="text-lg font-bold text-[#231E18]">
                        Bấm giờ nuôi Cây tập trung
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSoundEnabled((v) => !v)}
                      className="p-2 rounded-lg border border-[#E5DBC4] text-[#6B6154] hover:text-[#231E18] hover:bg-[#FDF3D0] transition-colors"
                      aria-label={soundEnabled ? 'Tắt chuông báo' : 'Bật chuông báo'}
                      title={soundEnabled ? 'Chuông báo đang bật' : 'Chuông báo đang tắt'}
                    >
                      {soundEnabled ? (
                        <Volume2 className="w-4 h-4" />
                      ) : (
                        <VolumeX className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Preset selector */}
                  <div className="grid grid-cols-4 gap-2 p-1 rounded-xl bg-[#F3ECDC] border border-[#E5DBC4]">
                    {[5, 15, 25, 45].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => handleSelectPreset(mins)}
                        className={`py-2 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
                          presetMinutes === mins
                            ? 'bg-white text-[#231E18] shadow-sm'
                            : 'text-[#6B6154] hover:text-[#231E18]'
                        }`}
                      >
                        {mins} phút
                      </button>
                    ))}
                  </div>

                  {/* Big Tabular Timer Display */}
                  <div className="py-6 rounded-2xl bg-[#FDF3D0]/75 border border-[#E5DBC4] text-center space-y-2">
                    <p className="font-mono text-5xl sm:text-6xl font-bold text-[#C45A15] tracking-tight tabular-nums">
                      {timerDisplay}
                    </p>
                    <p className="text-xs text-[#6B6154]">
                      {timerRunning
                        ? 'Nhịp Nhỏ đang đồng hành — giữ sự chú ý nhé!'
                        : 'Sẵn sàng cho phiên học sâu không xao nhãng'}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="focus-note"
                      className="block text-xs font-semibold text-[#231E18] mb-1.5"
                    >
                      Mục tiêu phiên học này
                    </label>
                    <input
                      id="focus-note"
                      type="text"
                      maxLength={200}
                      value={focusNote}
                      onChange={(e) => setFocusNote(e.target.value)}
                      placeholder="Ví dụ: Làm trọn bộ 5 bài Toán phương trình"
                      className="w-full rounded-xl border border-[#E5DBC4] px-3.5 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFocusSavedBanner(null);
                        setTimerRunning((r) => !r);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C45A15] text-white text-sm font-bold hover:bg-[#AA4C0F] transition-colors whitespace-nowrap"
                    >
                      {timerRunning ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Tạm dừng
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Bắt đầu tập trung
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleResetTimer}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-[#E5DBC4] text-sm font-medium text-[#5C5347] hover:bg-[#FDF3D0] transition-colors whitespace-nowrap"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Đặt lại
                    </button>

                    {presetMinutes * 60 - secondsLeft >= 60 && (
                      <button
                        type="button"
                        disabled={savingFocus}
                        onClick={() => handleSaveFocusSession()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FDF3D0] border border-[#E5DBC4] text-xs font-bold text-[#3F6A52] hover:bg-[#F8E7B2] transition-colors"
                      >
                        <Sprout className="w-4 h-4" />
                        {savingFocus ? 'Đang lưu...' : 'Lưu số phút đã tập trung vào Cây'}
                      </button>
                    )}
                  </div>

                  {focusSavedBanner && (
                    <p className="text-xs font-semibold text-[#3F6A52] bg-[#FDF3D0] border border-[#E5DBC4] rounded-xl px-4 py-3">
                      {focusSavedBanner}
                    </p>
                  )}
                </div>

                {/* Recent Focus Log */}
                <div className="rounded-2xl border border-[#E5DBC4] bg-white p-6 space-y-4">
                  <h3 className="text-base font-bold text-[#231E18]">
                    Nhật ký tưới cây gần đây
                  </h3>
                  {focusSessions.length === 0 ? (
                    <p className="text-sm text-[#6B6154]">
                      Hoàn thành phiên tập trung đầu tiên để ghi nhận thành tích tại đây.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#EFE6D2]">
                      {focusSessions.slice(0, 6).map((s) => (
                        <div
                          key={s.id}
                          className="py-3 flex items-center justify-between gap-4 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[#231E18] truncate">{s.note}</p>
                            <p className="text-xs text-[#6B6154]">{s.treeStage}</p>
                          </div>
                          <span className="font-mono font-bold text-[#C45A15] tabular-nums shrink-0">
                            +{s.durationMinutes} phút
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Camera / Upload Modal */}
      {submittingAssignment && (
        <CameraCaptureModal
          assignmentTitle={submittingAssignment.title}
          initialNote={submittingAssignment.studentNote}
          modalSubtitle={
            submittingAssignment.status !== 'pending'
              ? 'Nộp lại ảnh bài tập'
              : 'Chụp ảnh nộp bài'
          }
          confirmLabel={
            submittingAssignment.status !== 'pending' ? 'Xác nhận nộp lại' : 'Xác nhận nộp bài'
          }
          submittingLabel={
            submittingAssignment.status !== 'pending' ? 'Đang nộp lại...' : 'Đang nộp bài...'
          }
          revisionBanner={
            submittingAssignment.status === 'needs_revision'
              ? submittingAssignment.assistantFeedback
              : undefined
          }
          onClose={() => setSubmittingAssignment(null)}
          onSubmit={async (photoDataUrl, studentNote) => {
            await submitAssignmentPhoto({
              assignmentId: submittingAssignment.id,
              photoDataUrl,
              studentNote,
              assistantOnline: student.assistantOnline,
              isResubmission: submittingAssignment.status !== 'pending',
            });
            playSuccessSound();
          }}
        />
      )}

      {/* Photo Preview Lightbox */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#231E18]/60 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="max-w-2xl w-full bg-white rounded-2xl border border-[#E5DBC4] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-[#EFE6D2] flex items-center justify-between">
              <p className="text-sm font-bold text-[#231E18] truncate">{previewPhoto.title}</p>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 rounded-lg text-[#6B6154] hover:bg-[#FDF3D0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-[#FBF8F1]">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[70vh] mx-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Self-Practice Task Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#231E18]/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5DBC4] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#231E18]">
                Thêm {activeTab === 'extra' ? 'bài tập bổ sung' : 'bài tập hôm nay'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-[#6B6154] hover:bg-[#FDF3D0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#231E18] mb-1.5">
                  Môn học
                </label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full rounded-xl border border-[#E5DBC4] px-3.5 py-2.5 text-sm text-[#231E18] bg-white focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25"
                >
                  <option value="Toán học">Toán học</option>
                  <option value="Ngữ văn">Ngữ văn</option>
                  <option value="Tiếng Anh">Tiếng Anh</option>
                  <option value="Khoa học">Khoa học</option>
                  <option value="Tổng hợp">Tổng hợp</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E18] mb-1.5">
                  Tên bài tập
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Ôn tập 10 câu trắc nghiệm hình học"
                  className="w-full rounded-xl border border-[#E5DBC4] px-3.5 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E18] mb-1.5">
                  Mô tả ngắn
                </label>
                <textarea
                  rows={3}
                  maxLength={800}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ghi chú trang sách hoặc yêu cầu cần hoàn thành..."
                  className="w-full rounded-xl border border-[#E5DBC4] px-3.5 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6B6154] hover:bg-[#FDF3D0]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addingTask}
                  className="px-4 py-2 rounded-lg bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] disabled:opacity-50"
                >
                  {addingTask ? 'Đang tạo...' : 'Lưu bài tập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Messages Slide-over Drawer */}
      {showMessagesDrawer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#231E18]/45"
          onClick={() => setShowMessagesDrawer(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Tin nhắn với trợ lý"
        >
          <div
            className="w-full max-w-md bg-white h-full border-l border-[#E5DBC4] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#E5DBC4] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[#231E18]">
                  Tin nhắn với Trợ lý
                </h3>
                <p className="text-xs text-[#6B6154] truncate">
                  {student.assistantOnline
                    ? 'Trợ lý đang trực tuyến · phản hồi nhanh'
                    : 'Gửi câu hỏi hoặc xem nhận xét từ trợ lý & gia đình'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMessagesDrawer(false)}
                className="p-2 rounded-lg text-[#6B6154] hover:bg-[#FDF3D0]"
                aria-label="Đóng hộp tin nhắn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#FBF8F1]">
              {studentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12 space-y-2">
                  <MessageSquareText className="w-8 h-8 text-[#C45A15]/60" />
                  <p className="text-sm font-bold text-[#231E18]">Chưa có tin nhắn nào</p>
                  <p className="text-xs text-[#6B6154] leading-relaxed">
                    Khi Trợ lý gửi lời nhắc hoặc phản hồi về bài làm, thông báo đẩy sẽ hiện ngay trên màn hình và lưu tại đây.
                  </p>
                </div>
              ) : (
                studentMessages.map((m) => {
                  const mine = m.senderUid === user.uid;
                  const roleLabel =
                    m.senderRole === 'assistant'
                      ? 'Trợ lý'
                      : m.senderRole === 'parent'
                        ? 'Phụ huynh'
                        : 'Bạn';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          mine
                            ? 'bg-[#C45A15] text-white'
                            : 'bg-white border border-[#E5DBC4] text-[#231E18]'
                        }`}
                      >
                        <p
                          className={`text-xs font-semibold mb-1 ${
                            mine ? 'text-[#FDF3D0]' : 'text-[#C45A15]'
                          }`}
                        >
                          {mine ? 'Bạn' : `${roleLabel} · ${m.senderName}`}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      </div>
                      <span className="text-xs text-[#8C8172] mt-1 px-1">
                        {formatTimeAgoVi(m.createdAt?.toMillis?.() || nowMs)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSendStudentMessage}
              className="p-4 border-t border-[#E5DBC4] bg-white flex items-center gap-2.5"
            >
              <input
                type="text"
                maxLength={1000}
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                placeholder="Nhắn hỏi trợ lý về bài tập..."
                className="flex-1 rounded-xl border border-[#E5DBC4] px-3.5 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
              />
              <button
                type="submit"
                disabled={sendingMsg || !msgInput.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                Gửi
              </button>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          displayName={user.displayName}
          onClose={() => setShowDeleteModal(false)}
          onConfirmDelete={onDeleteAccount}
        />
      )}
    </div>
  );
};
