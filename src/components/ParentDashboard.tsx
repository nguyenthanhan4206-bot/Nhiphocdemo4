import React, { useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Check,
  CheckCheck,
  ClipboardList,
  Eye,
  HelpCircle,
  ImagePlus,
  Lightbulb,
  Link2,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  Assignment,
  FeedbackTicket,
  FocusSession,
  Message,
  PublicUser,
  Schedule,
  StudentProfile,
  TicketCategory,
} from '../types';
import {
  createAssignmentsBatch,
  createFeedbackTicket,
  createSchedule,
  deletePendingAssignment,
  getTreeStageLabel,
  linkStudentByCode,
  ParsedTeacherTask,
  parseTeacherMessageToTasks,
  sendMessage,
} from '../services/nhiphocService';
import { compressImageFileToDataUrl, formatTimeAgoVi } from '../utils/imageCompress';
import { DeleteAccountModal } from './DeleteAccountModal';
import {
  MascotAvatar,
  NhiphocAnimatedLogo,
  NhiphocLogoMark,
  NhiphocRhythmMark,
} from './MascotAvatar';

interface ParentDashboardProps {
  user: PublicUser;
  students: StudentProfile[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  assignments: Assignment[];
  focusSessions: FocusSession[];
  messages: Message[];
  schedules: Schedule[];
  tickets: FeedbackTicket[];
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

type ParentTab = 'child_progress' | 'teacher_tasks' | 'contact_schedule' | 'feedback_help';

interface DraftTodoTask extends ParsedTeacherTask {
  localId: string;
  selected: boolean;
}

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  user,
  students,
  selectedStudentId,
  onSelectStudent,
  assignments,
  focusSessions,
  messages,
  schedules,
  tickets,
  onSignOut,
  onDeleteAccount,
}) => {
  const [activeTab, setActiveTab] = useState<ParentTab>('child_progress');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Link child modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCodeInput, setLinkCodeInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Chat state
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Schedule state
  const [schTitle, setSchTitle] = useState('Trao đổi tiến độ tuần');
  const [schDate, setSchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [schTime, setSchTime] = useState('19:30');
  const [schNote, setSchNote] = useState('');
  const [creatingSch, setCreatingSch] = useState(false);

  // Feedback / Help state
  const [ticketCategory, setTicketCategory] = useState<TicketCategory>('feedback');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [sendingTicket, setSendingTicket] = useState(false);
  const [ticketNotice, setTicketNotice] = useState<string | null>(null);

  // Photo preview
  const [previewPhoto, setPreviewPhoto] = useState<{ title: string; url: string } | null>(null);

  // Teacher message -> To-do List tracker state
  const [teacherMsgText, setTeacherMsgText] = useState('');
  const [teacherImages, setTeacherImages] = useState<string[]>([]);
  const [autoAddParsed, setAutoAddParsed] = useState(true);
  const [parsingTeacherMsg, setParsingTeacherMsg] = useState(false);
  const [addingDraftTasks, setAddingDraftTasks] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedSummary, setParsedSummary] = useState('');
  const [draftTasks, setDraftTasks] = useState<DraftTodoTask[]>([]);
  const [lastAddedIds, setLastAddedIds] = useState<string[]>([]);
  const [lastAddedNotice, setLastAddedNotice] = useState<string | null>(null);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const teacherFileInputRef = useRef<HTMLInputElement | null>(null);

  const student = students.find((s) => s.id === selectedStudentId) || students[0] || null;

  const studentAssignments = useMemo(
    () => (student ? assignments.filter((a) => a.studentId === student.id) : []),
    [assignments, student],
  );

  const studentMessages = useMemo(
    () => (student ? messages.filter((m) => m.studentId === student.id) : []),
    [messages, student],
  );

  const studentSchedules = useMemo(
    () => (student ? schedules.filter((s) => s.studentId === student.id) : []),
    [schedules, student],
  );

  const studentTickets = useMemo(
    () => (student ? tickets.filter((t) => t.studentId === student.id) : []),
    [tickets, student],
  );

  const studentFocusSessions = useMemo(
    () => (student ? focusSessions.filter((f) => f.studentId === student.id) : []),
    [focusSessions, student],
  );

  const progressStats = useMemo(() => {
    const total = studentAssignments.length;
    const submitted = studentAssignments.filter(
      (a) => a.status === 'submitted' || a.status === 'graded',
    ).length;
    const graded = studentAssignments.filter((a) => a.status === 'graded').length;
    const completionPct = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, graded, completionPct };
  }, [studentAssignments]);

  const weeklyFocusMinutes = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    studentFocusSessions.forEach((s) => {
      const ms = s.createdAt?.toMillis?.();
      if (!ms) return;
      const day = new Date(ms).getDay();
      const idx = day === 0 ? 6 : day - 1;
      totals[idx] += s.durationMinutes || 0;
    });
    const maxMins = Math.max(30, ...totals);
    return totals.map((mins, i) => ({
      label: WEEKDAY_LABELS[i],
      mins,
      heightPct: Math.max(10, Math.round((mins / maxMins) * 100)),
    }));
  }, [studentFocusSessions]);

  const latestHighlightAssignment = useMemo(() => {
    return (
      studentAssignments.find((a) => a.status === 'needs_revision') ||
      studentAssignments.find((a) => a.status === 'graded') ||
      studentAssignments.find((a) => a.status === 'submitted') ||
      studentAssignments[0] ||
      null
    );
  }, [studentAssignments]);

  const nextPendingAssignment = useMemo(
    () =>
      studentAssignments.find(
        (a) => a.status === 'needs_revision' || a.status === 'pending',
      ) || null,
    [studentAssignments],
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !msgText.trim()) return;
    setSendingMsg(true);
    try {
      await sendMessage({
        student,
        senderUid: user.uid,
        senderName: user.displayName,
        senderRole: 'parent',
        content: msgText,
      });
      setMsgText('');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !schTitle.trim()) return;
    setCreatingSch(true);
    try {
      await createSchedule({
        student,
        createdBy: user.uid,
        title: schTitle,
        dateStr: schDate,
        timeStr: schTime,
        note: schNote,
      });
      setSchNote('');
    } finally {
      setCreatingSch(false);
    }
  };

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !ticketSubject.trim() || !ticketMessage.trim()) return;
    setSendingTicket(true);
    setTicketNotice(null);
    try {
      await createFeedbackTicket({
        student,
        createdBy: user.uid,
        category: ticketCategory,
        subject: ticketSubject,
        message: ticketMessage,
      });
      setTicketSubject('');
      setTicketMessage('');
      setTicketNotice('Đã gửi phản hồi tới trợ lý. Bạn sẽ nhận được hồi âm ngay tại mục này.');
    } finally {
      setSendingTicket(false);
    }
  };

  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    setLinking(true);
    try {
      const id = await linkStudentByCode(linkCodeInput, user.uid, 'parent');
      onSelectStudent(id);
      setLinkCodeInput('');
      setShowLinkModal(false);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Không thể kết nối mã học sinh.');
    } finally {
      setLinking(false);
    }
  };

  const handleTeacherImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setParseError(null);

    const remainingSlots = Math.max(0, 3 - teacherImages.length);
    if (remainingSlots === 0) {
      setParseError('Mỗi lần tải tối đa 3 ảnh chụp tin nhắn giáo viên.');
      return;
    }

    const compressedList: string[] = [];
    try {
      for (const file of files.slice(0, remainingSlots)) {
        const compressed = await compressImageFileToDataUrl(file, 1080, 0.78);
        compressedList.push(compressed);
      }
      setTeacherImages((prev) => [...prev, ...compressedList].slice(0, 3));
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : 'Không thể đọc ảnh tin nhắn giáo viên đã chọn.',
      );
    }
  };

  const handleParseTeacherMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setParseError(null);
    setLastAddedNotice(null);

    if (!teacherMsgText.trim() && teacherImages.length === 0) {
      setParseError('Vui lòng dán tin nhắn của giáo viên hoặc tải lên ảnh chụp tin nhắn.');
      return;
    }

    setParsingTeacherMsg(true);
    try {
      const result = await parseTeacherMessageToTasks({
        messageText: teacherMsgText,
        imageDataUrls: teacherImages,
        studentName: student.studentName,
        studentGrade: student.grade,
      });

      setParsedSummary(result.summaryNote);

      if (result.tasks.length === 0) {
        setDraftTasks([]);
        setLastAddedIds([]);
        setParseError(
          'Chưa thấy bài tập hay nhiệm vụ cụ thể nào trong tin nhắn này. Bạn có thể bổ sung thêm nội dung rồi thử lại.',
        );
        return;
      }

      if (autoAddParsed) {
        const createdIds = await createAssignmentsBatch({
          student,
          createdBy: user.uid,
          tasks: result.tasks,
        });
        setDraftTasks([]);
        setLastAddedIds(createdIds);
        setLastAddedNotice(
          `Đã tự động tách và thêm ${createdIds.length} bài tập vào danh sách của ${student.studentName}.`,
        );
        setTeacherMsgText('');
        setTeacherImages([]);
      } else {
        setDraftTasks(
          result.tasks.map((t, idx) => ({
            ...t,
            localId: `${Date.now()}_${idx}`,
            selected: true,
          })),
        );
        setLastAddedIds([]);
      }
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : 'Không thể phân tích tin nhắn giáo viên.',
      );
    } finally {
      setParsingTeacherMsg(false);
    }
  };

  const handleConfirmDraftTasks = async () => {
    if (!student) return;
    const selected = draftTasks.filter((t) => t.selected && t.title.trim());
    if (selected.length === 0) {
      setParseError('Vui lòng chọn ít nhất 1 bài tập để thêm cho con.');
      return;
    }
    setParseError(null);
    setAddingDraftTasks(true);
    try {
      const createdIds = await createAssignmentsBatch({
        student,
        createdBy: user.uid,
        tasks: selected,
      });
      setLastAddedIds(createdIds);
      setDraftTasks([]);
      setTeacherMsgText('');
      setTeacherImages([]);
      setLastAddedNotice(
        `Đã thêm ${createdIds.length} bài tập từ tin nhắn giáo viên vào danh sách của ${student.studentName}.`,
      );
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Không thể thêm bài tập cho con.');
    } finally {
      setAddingDraftTasks(false);
    }
  };

  const handleDeletePendingTask = async (assignmentId: string) => {
    setDeletingAssignmentId(assignmentId);
    try {
      await deletePendingAssignment(assignmentId);
      setLastAddedIds((prev) => prev.filter((id) => id !== assignmentId));
    } finally {
      setDeletingAssignmentId(null);
    }
  };

  const navItems: Array<{
    id: ParentTab;
    label: string;
    shortLabel: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'child_progress', label: 'Kiểm tra tiến độ của con', shortLabel: 'Tiến độ của con', icon: BarChart3 },
    {
      id: 'teacher_tasks',
      label: 'Tin nhắn giáo viên → Bài tập',
      shortLabel: 'Tin nhắn GV',
      icon: ClipboardList,
    },
    { id: 'contact_schedule', label: 'Liên lạc & Lên lịch', shortLabel: 'Liên lạc & Lịch', icon: MessageSquare },
    { id: 'feedback_help', label: 'Phản hồi & Trợ giúp', shortLabel: 'Phản hồi & Trợ giúp', icon: HelpCircle },
  ];

  const renderSidebar = () => (
    <div className="flex flex-col h-full justify-between p-5">
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5DBC4]">
          <NhiphocLogoMark className="w-10 h-10 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-extrabold tracking-tight text-[#231E18] leading-tight">
              Nhịp<span className="text-[#C45A15]">Học</span>
            </p>
            <p className="text-xs text-[#6B6154] truncate">Phụ huynh đồng hành</p>
          </div>
        </div>

        {/* Child Switcher */}
        {students.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6B6154]">
              <span>Học sinh đang theo dõi</span>
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="text-[#C45A15] hover:underline font-semibold inline-flex items-center gap-1"
              >
                <Link2 className="w-3 h-3" />
                Kết nối thêm
              </button>
            </div>
            <select
              value={student?.id || ''}
              onChange={(e) => onSelectStudent(e.target.value)}
              className="w-full rounded-xl bg-white border border-[#E5DBC4] px-3 py-2 text-xs font-semibold text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.studentName} ({s.grade})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3 Nav Items */}
        <nav className="space-y-1.5" aria-label="Menu phụ huynh">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#C45A15] text-white shadow-sm'
                    : 'text-[#5C5347] hover:bg-[#FDF3D0] hover:text-[#231E18]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {student && (
          <div className="rounded-xl border border-[#E5DBC4] bg-[#FDF3D0]/75 p-3.5 space-y-1.5 text-xs">
            <p className="text-[#6B6154]">Mã hồ sơ của con</p>
            <p className="font-mono font-bold text-[#C45A15] tracking-wider">
              {student.linkCode}
            </p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-[#E5DBC4] space-y-3">
        <div className="text-xs text-[#6B6154]">
          <p className="font-bold text-[#231E18] truncate">{user.displayName}</p>
          <p className="truncate">Không gian Phụ huynh</p>
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

  const ringRadius = 36;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (progressStats.completionPct / 100) * ringCircumference;

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-[#231E18] flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 bg-white border-r border-[#E5DBC4] sticky top-0 h-screen">
        {renderSidebar()}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-[#231E18]/40" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full border-r border-[#E5DBC4] z-10">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-[#6B6154] hover:bg-[#FDF3D0]"
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebar()}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-[#FBF8F1]/95 backdrop-blur-sm border-b border-[#E5DBC4] sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-[#231E18] hover:bg-[#FDF3D0] shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#6B6154] truncate">
                  {student ? `${student.studentName} · ${student.grade}` : 'Phụ huynh'}
                </p>
                <h1 className="text-base sm:text-lg font-extrabold text-[#231E18] leading-tight whitespace-nowrap">
                  {navItems.find((n) => n.id === activeTab)?.shortLabel}
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLinkModal(true)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg border border-[#E5DBC4] bg-white text-xs font-semibold text-[#C45A15] hover:bg-[#FDF3D0] transition-colors whitespace-nowrap shrink-0"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nhập mã kết nối con</span>
              <span className="sm:hidden">Nhập mã</span>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-5 sm:px-8 py-7 space-y-6">
          {student && (
            <section className="rounded-2xl border border-[#E5DBC4] bg-[#FDF3D0] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <NhiphocAnimatedLogo size="sm" />
                  <MascotAvatar size="lg" mood="happy" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <NhiphocRhythmMark />
                    <span className="text-xs font-bold text-[#C45A15]">
                      Nhịp Nhỏ đồng hành cùng {student.studentName}
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-[#231E18]">
                    {progressStats.submitted}/{progressStats.total} bài đã nộp ·{' '}
                    {student.focusMinutesTotal} phút tập trung
                  </h2>
                </div>
              </div>
              <div className="text-xs font-semibold text-[#5C5347] shrink-0">
                {student.assistantOnline ? 'Trợ lý đang trực tuyến' : 'Trợ lý sẽ phản hồi theo lịch'}
              </div>
            </section>
          )}

          {!student ? (
            <div className="rounded-2xl border border-[#E5DBC4] bg-white p-10 text-center space-y-4">
              <p className="text-base font-bold text-[#231E18]">
                Bạn chưa kết nối với hồ sơ học sinh nào
              </p>
              <p className="text-sm text-[#6B6154] max-w-md mx-auto">
                Hãy nhập Mã kết nối (NH...) từ tài khoản của con hoặc của trợ lý để xem toàn bộ
                tiến độ học tập.
              </p>
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="px-5 py-2.5 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F]"
              >
                Kết nối ngay
              </button>
            </div>
          ) : activeTab === 'teacher_tasks' ? (
            /* Section: Upload tin nhắn giáo viên -> Tự động tạo To-do bài tập cho con */
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Upload / Paste Teacher Message */}
                <form
                  onSubmit={handleParseTeacherMessage}
                  className="lg:col-span-6 rounded-2xl border border-[#E5DBC4] bg-white p-6 space-y-4"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#C45A15] inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Tự động theo dõi bài tập từ tin nhắn giáo viên
                    </p>
                    <h2 className="text-base font-bold text-[#231E18]">
                      Dán tin nhắn hoặc tải ảnh chụp thông báo lớp
                    </h2>
                    <p className="text-xs text-[#6B6154] leading-relaxed">
                      Dán nội dung tin nhắn Zalo/SMS hoặc chọn ảnh chụp màn hình từ giáo viên. Hệ
                      thống sẽ tự động tách từng môn thành To-do list và thêm vào mục bài tập của{' '}
                      <span className="font-semibold text-[#231E18]">{student.studentName}</span>.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="teacher-msg-input"
                      className="block text-xs font-semibold text-[#5C5347] mb-1.5"
                    >
                      Nội dung tin nhắn giáo viên
                    </label>
                    <textarea
                      id="teacher-msg-input"
                      rows={5}
                      maxLength={6000}
                      value={teacherMsgText}
                      onChange={(e) => setTeacherMsgText(e.target.value)}
                      placeholder="Ví dụ: Chào phụ huynh lớp 8A, tối nay các con hoàn thành:&#10;1. Toán: Bài tập 1, 2, 3 trang 45 SGK.&#10;2. Ngữ văn: Soạn bài Bếp lửa.&#10;3. Tiếng Anh: Học 10 từ vựng Unit 4, hạn nộp sáng mai."
                      className="w-full rounded-xl bg-white border border-[#E5DBC4] px-3.5 py-2.5 text-sm text-[#231E18] placeholder:text-[#968A7B] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                    />
                  </div>

                  {/* Screenshot Upload */}
                  <div className="rounded-xl border border-[#E5DBC4] bg-[#FBF8F1] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#231E18] flex items-center gap-1.5">
                          <ImagePlus className="w-4 h-4 text-[#C45A15]" />
                          Ảnh chụp màn hình tin nhắn (tối đa 3 ảnh)
                        </p>
                        <p className="text-xs text-[#6B6154] mt-0.5">
                          Hỗ trợ chụp ảnh Zalo, bảng dặn dò hoặc phiếu bài tập trên lớp.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => teacherFileInputRef.current?.click()}
                        disabled={teacherImages.length >= 3}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5DBC4] bg-white text-xs font-semibold text-[#231E18] hover:bg-[#FDF3D0] disabled:opacity-45 transition-colors whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#C45A15]" />
                        Tải ảnh tin nhắn
                      </button>
                    </div>

                    <input
                      ref={teacherFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleTeacherImageUpload}
                      className="hidden"
                    />

                    {teacherImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2.5">
                        {teacherImages.map((imgUrl, idx) => (
                          <div
                            key={`${idx}_${imgUrl.slice(0, 24)}`}
                            className="relative rounded-lg border border-[#E5DBC4] bg-white p-1.5"
                          >
                            <img
                              src={imgUrl}
                              alt={`Ảnh tin nhắn giáo viên ${idx + 1}`}
                              onClick={() =>
                                setPreviewPhoto({
                                  title: `Ảnh tin nhắn giáo viên #${idx + 1}`,
                                  url: imgUrl,
                                })
                              }
                              className="h-24 w-full object-cover rounded cursor-zoom-in"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setTeacherImages((prev) => prev.filter((_, i) => i !== idx))
                              }
                              aria-label="Xóa ảnh"
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#231E18] text-white flex items-center justify-center hover:bg-red-700 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Auto-add option */}
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoAddParsed}
                      onChange={(e) => setAutoAddParsed(e.target.checked)}
                      className="mt-0.5 rounded border-[#C45A15] text-[#C45A15] focus:ring-[#C45A15]"
                    />
                    <span className="text-xs text-[#5C5347] leading-relaxed">
                      <span className="font-bold text-[#231E18]">
                        Tự động thêm ngay vào bài tập của con
                      </span>{' '}
                      (bỏ chọn nếu bạn muốn xem lại và chỉnh sửa từng đầu việc trước khi giao).
                    </span>
                  </label>

                  {parseError && (
                    <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                      {parseError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={parsingTeacherMsg}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#C45A15] text-white text-sm font-bold hover:bg-[#AA4C0F] disabled:opacity-50 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    {parsingTeacherMsg
                      ? 'Đang đọc tin nhắn & tách thành To-do...'
                      : autoAddParsed
                        ? 'Tách To-do & tự động thêm bài tập'
                        : 'Phân tích tin nhắn thành To-do'}
                  </button>
                </form>

                {/* Right: Parsed To-Do Preview / Tracked Results */}
                <div className="lg:col-span-6 space-y-5">
                  {draftTasks.length > 0 ? (
                    <div className="rounded-2xl border border-[#E5DBC4] bg-white p-6 space-y-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#C45A15]">Xem trước To-do đã tách</p>
                        <h3 className="text-base font-bold text-[#231E18]">
                          Kiểm tra và chọn bài tập muốn thêm cho {student.studentName}
                        </h3>
                        {parsedSummary && (
                          <p className="text-xs text-[#5C5347] bg-[#FDF3D0]/80 border border-[#E5DBC4] rounded-lg px-3 py-2">
                            {parsedSummary}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                        {draftTasks.map((task, idx) => (
                          <div
                            key={task.localId}
                            className={`rounded-xl border p-4 space-y-2.5 transition-colors ${
                              task.selected
                                ? 'border-[#C45A15]/60 bg-[#FBF8F1]'
                                : 'border-[#E5DBC4] bg-white opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <label className="inline-flex items-center gap-2 text-xs font-bold text-[#231E18] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={task.selected}
                                  onChange={(e) =>
                                    setDraftTasks((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, selected: e.target.checked } : item,
                                      ),
                                    )
                                  }
                                />
                                Đầu việc #{idx + 1}
                              </label>
                              <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-white border border-[#E5DBC4]">
                                {(
                                  [
                                    { id: 'today', label: 'Hôm nay' },
                                    { id: 'extra', label: 'Bổ sung' },
                                  ] as const
                                ).map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() =>
                                      setDraftTasks((prev) =>
                                        prev.map((item, i) =>
                                          i === idx ? { ...item, type: opt.id } : item,
                                        ),
                                      )
                                    }
                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                      task.type === opt.id
                                        ? 'bg-[#C45A15] text-white'
                                        : 'text-[#6B6154]'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                maxLength={40}
                                value={task.subject}
                                onChange={(e) =>
                                  setDraftTasks((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, subject: e.target.value } : item,
                                    ),
                                  )
                                }
                                placeholder="Môn học"
                                className="rounded-lg border border-[#E5DBC4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#C45A15]"
                              />
                              <input
                                type="text"
                                maxLength={60}
                                value={task.dueLabel}
                                onChange={(e) =>
                                  setDraftTasks((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, dueLabel: e.target.value } : item,
                                    ),
                                  )
                                }
                                placeholder="Hạn nộp"
                                className="rounded-lg border border-[#E5DBC4] bg-white px-2.5 py-1.5 text-xs text-[#5C5347]"
                              />
                            </div>

                            <input
                              type="text"
                              maxLength={120}
                              value={task.title}
                              onChange={(e) =>
                                setDraftTasks((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, title: e.target.value } : item,
                                  ),
                                )
                              }
                              placeholder="Tên bài tập"
                              className="w-full rounded-lg border border-[#E5DBC4] bg-white px-3 py-1.5 text-sm font-bold text-[#231E18]"
                            />

                            <textarea
                              rows={2}
                              maxLength={800}
                              value={task.description}
                              onChange={(e) =>
                                setDraftTasks((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, description: e.target.value } : item,
                                  ),
                                )
                              }
                              placeholder="Chi tiết bài tập..."
                              className="w-full rounded-lg border border-[#E5DBC4] bg-white px-3 py-1.5 text-xs text-[#5C5347]"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#EFE6D2]">
                        <button
                          type="button"
                          onClick={() => setDraftTasks([])}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6B6154] hover:bg-[#FDF3D0]"
                        >
                          Hủy bản nháp
                        </button>
                        <button
                          type="button"
                          disabled={addingDraftTasks}
                          onClick={handleConfirmDraftTasks}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#3F6A52] text-white text-xs font-bold hover:bg-[#345944] disabled:opacity-50 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          {addingDraftTasks
                            ? 'Đang thêm...'
                            : `Thêm ${draftTasks.filter((t) => t.selected).length} bài tập cho con`}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#E5DBC4] bg-white p-6 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-[#231E18]">
                            To-do bài tập đang theo dõi của {student.studentName}
                          </h3>
                          <p className="text-xs text-[#6B6154]">
                            Mọi bài tập được tách từ tin nhắn giáo viên đều đồng bộ ngay sang máy của con và trợ lý.
                          </p>
                        </div>
                        <span className="text-xs font-bold text-[#C45A15] tabular-nums shrink-0">
                          {progressStats.submitted}/{progressStats.total} xong
                        </span>
                      </div>

                      {lastAddedNotice && (
                        <div className="rounded-xl border border-[#3F6A52]/30 bg-[#FDF3D0] p-3.5 space-y-1">
                          <p className="text-xs font-bold text-[#3F6A52] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4" />
                            {lastAddedNotice}
                          </p>
                          {parsedSummary && (
                            <p className="text-xs text-[#5C5347]">{parsedSummary}</p>
                          )}
                        </div>
                      )}

                      {studentAssignments.length === 0 ? (
                        <div className="rounded-xl border border-[#E5DBC4] bg-[#FBF8F1] p-6 text-center space-y-2">
                          <ClipboardList className="w-7 h-7 text-[#C45A15]/60 mx-auto" />
                          <p className="text-sm font-bold text-[#231E18]">Chưa có bài tập nào</p>
                          <p className="text-xs text-[#6B6154]">
                            Dán tin nhắn hoặc tải ảnh thông báo của giáo viên ở khung bên cạnh để
                            tự động tạo danh sách To-do đầu tiên.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-[#EFE6D2] max-h-[460px] overflow-y-auto">
                          {studentAssignments.map((a) => {
                            const isJustAdded = lastAddedIds.includes(a.id);
                            const canDelete = a.status === 'pending' && a.createdBy === user.uid;
                            return (
                              <div
                                key={a.id}
                                className={`py-3 flex items-start justify-between gap-3 ${
                                  isJustAdded ? 'bg-[#FDF3D0]/45 px-2.5 rounded-lg' : ''
                                }`}
                              >
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#6B6154]">
                                    <span className="font-bold text-[#C45A15]">{a.subject}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{a.type === 'today' ? 'Bài hôm nay' : 'Bài bổ sung'}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{a.dueLabel}</span>
                                    {isJustAdded && (
                                      <span className="font-bold text-[#3F6A52]">· Mới thêm</span>
                                    )}
                                  </div>
                                  <p className="text-sm font-bold text-[#231E18]">{a.title}</p>
                                  {a.description && (
                                    <p className="text-xs text-[#5C5347] line-clamp-2">
                                      {a.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={`text-xs font-semibold whitespace-nowrap ${
                                      a.status === 'graded'
                                        ? 'text-[#3F6A52]'
                                        : a.status === 'needs_revision'
                                          ? 'text-amber-800'
                                          : a.status === 'submitted'
                                            ? 'text-[#C45A15]'
                                            : 'text-[#8C8172]'
                                    }`}
                                  >
                                    {a.status === 'graded'
                                      ? 'Đã chấm'
                                      : a.status === 'needs_revision'
                                        ? 'Cần nộp lại'
                                        : a.status === 'submitted'
                                          ? 'Đã nộp'
                                          : 'Chưa nộp'}
                                  </span>
                                  {canDelete && (
                                    <button
                                      type="button"
                                      disabled={deletingAssignmentId === a.id}
                                      onClick={() => handleDeletePendingTask(a.id)}
                                      title="Xóa bài tập này"
                                      aria-label={`Xóa bài tập ${a.title}`}
                                      className="p-1.5 rounded-lg text-[#8C8172] hover:text-red-700 hover:bg-red-50 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'contact_schedule' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Direct Message Thread */}
              <section className="lg:col-span-7 rounded-2xl border border-[#E5DBC4] bg-white flex flex-col h-[540px]">
                <div className="px-5 py-4 border-b border-[#EFE6D2] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#231E18]">
                      Trao đổi trực tiếp với Trợ lý
                    </h2>
                    <p className="text-xs text-[#6B6154]">
                      {student.assistantOnline
                        ? 'Trợ lý đang trực tuyến'
                        : 'Trợ lý sẽ phản hồi khi trực tuyến'}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#FBF8F1]/60">
                  {studentMessages.length === 0 ? (
                    <p className="text-sm text-[#6B6154] text-center py-12">
                      Chưa có tin nhắn nào. Phụ huynh có thể nhắn hỏi tình hình học tập của con tại
                      đây.
                    </p>
                  ) : (
                    studentMessages.map((m) => {
                      const isMe = m.senderUid === user.uid;
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-xs text-[#6B6154] mb-1">
                            {m.senderName} ·{' '}
                            {m.senderRole === 'assistant'
                              ? 'Trợ lý'
                              : m.senderRole === 'parent'
                                ? 'Phụ huynh'
                                : 'Học sinh'}
                          </span>
                          <div
                            className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                              isMe
                                ? 'bg-[#C45A15] text-white'
                                : 'bg-white border border-[#E5DBC4] text-[#231E18]'
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-[#EFE6D2] bg-white flex items-center gap-2.5"
                >
                  <input
                    type="text"
                    maxLength={1000}
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    placeholder="Nhắn tin cho trợ lý..."
                    className="flex-1 rounded-xl bg-white border border-[#E5DBC4] px-4 py-2.5 text-sm text-[#231E18] placeholder:text-[#968A7B] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg || !msgText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] disabled:opacity-45 transition-colors whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Gửi
                  </button>
                </form>
              </section>

              {/* Right: Schedule Session */}
              <section className="lg:col-span-5 space-y-5">
                <form
                  onSubmit={handleCreateSchedule}
                  className="rounded-2xl border border-[#E5DBC4] bg-white p-5 space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-[#231E18]">
                    <Calendar className="w-4 h-4 text-[#C45A15]" />
                    <span>Đặt lịch trao đổi / kèm học</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5C5347] mb-1">
                      Nội dung buổi hẹn
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={schTitle}
                      onChange={(e) => setSchTitle(e.target.value)}
                      className="w-full rounded-xl bg-white border border-[#E5DBC4] px-3.5 py-2 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#5C5347] mb-1">Ngày</label>
                      <input
                        type="date"
                        required
                        value={schDate}
                        onChange={(e) => setSchDate(e.target.value)}
                        className="w-full rounded-xl bg-white border border-[#E5DBC4] px-3 py-2 text-sm text-[#231E18] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5C5347] mb-1">Giờ</label>
                      <input
                        type="time"
                        required
                        value={schTime}
                        onChange={(e) => setSchTime(e.target.value)}
                        className="w-full rounded-xl bg-white border border-[#E5DBC4] px-3 py-2 text-sm text-[#231E18] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5C5347] mb-1">
                      Ghi chú thêm
                    </label>
                    <textarea
                      rows={2}
                      maxLength={400}
                      value={schNote}
                      onChange={(e) => setSchNote(e.target.value)}
                      placeholder="Ví dụ: Nhờ trợ lý đánh giá kỹ phần Toán hình của con..."
                      className="w-full rounded-xl bg-white border border-[#E5DBC4] px-3.5 py-2 text-sm text-[#231E18] placeholder:text-[#968A7B] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creatingSch}
                    className="w-full py-2.5 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] disabled:opacity-50 transition-colors"
                  >
                    {creatingSch ? 'Đang gửi lịch...' : 'Gửi đề xuất lịch hẹn'}
                  </button>
                </form>

                <div className="rounded-2xl border border-[#E5DBC4] bg-white p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#231E18]">Lịch đã đặt</h3>
                  {studentSchedules.length === 0 ? (
                    <p className="text-xs text-[#6B6154]">Chưa có lịch hẹn nào.</p>
                  ) : (
                    <div className="divide-y divide-[#EFE6D2]">
                      {studentSchedules.map((sch) => (
                        <div key={sch.id} className="py-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[#231E18] truncate">
                              {sch.title}
                            </p>
                            <span
                              className={`text-xs font-semibold shrink-0 ${
                                sch.status === 'confirmed' || sch.status === 'completed'
                                  ? 'text-[#3F6A52]'
                                  : 'text-[#C45A15]'
                              }`}
                            >
                              {sch.status === 'confirmed'
                                ? 'Đã xác nhận'
                                : sch.status === 'completed'
                                  ? 'Đã hoàn thành'
                                  : sch.status === 'cancelled'
                                    ? 'Đã hủy'
                                    : 'Chờ xác nhận'}
                            </span>
                          </div>
                          <p className="text-xs text-[#6B6154] tabular-nums">
                            {sch.dateStr} · {sch.timeStr}
                          </p>
                          {sch.note && <p className="text-xs text-[#5C5347]">{sch.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : activeTab === 'child_progress' ? (
            <div className="space-y-6">
              {/* Top 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl border border-[#E5DBC4] bg-white">
                  <p className="text-xs text-[#6B6154]">Bài tập đã nộp</p>
                  <p className="text-2xl font-extrabold text-[#231E18] mt-1 tabular-nums">
                    {progressStats.submitted}/{progressStats.total}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-[#E5DBC4] bg-white">
                  <p className="text-xs text-[#6B6154]">Đã chấm xong</p>
                  <p className="text-2xl font-extrabold text-[#C45A15] mt-1 tabular-nums">
                    {progressStats.graded}/{progressStats.total}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-[#E5DBC4] bg-white">
                  <p className="text-xs text-[#6B6154]">Cây tập trung</p>
                  <p className="text-2xl font-extrabold text-[#3F6A52] mt-1 tabular-nums">
                    {student.focusMinutesTotal} phút
                  </p>
                  <p className="text-xs text-[#6B6154] mt-0.5">
                    {getTreeStageLabel(student.focusMinutesTotal).label}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-[#E5DBC4] bg-white">
                  <p className="text-xs text-[#6B6154]">Phiên tập trung</p>
                  <p className="text-2xl font-extrabold text-[#231E18] mt-1 tabular-nums">
                    {studentFocusSessions.length} phiên
                  </p>
                </div>
              </div>

              {/* Overview Row: Completion Ring + Weekly Focus Bars + Daily Summary & Companion Tip */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-6 rounded-2xl border border-[#E5DBC4] bg-white p-6 flex flex-col justify-between gap-5">
                  <div>
                    <p className="text-xs font-bold text-[#C45A15]">Tổng quan hoàn thành</p>
                    <h2 className="text-base font-bold text-[#231E18] mt-0.5">
                      Tiến độ bài tập & phút tập trung trong tuần
                    </h2>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
                          <circle
                            cx="44"
                            cy="44"
                            r={ringRadius}
                            fill="none"
                            stroke="#EFE6D2"
                            strokeWidth="8"
                          />
                          <circle
                            cx="44"
                            cy="44"
                            r={ringRadius}
                            fill="none"
                            stroke="#C45A15"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringOffset}
                          />
                        </svg>
                        <span className="absolute text-lg font-extrabold text-[#231E18] tabular-nums">
                          {progressStats.completionPct}%
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-[#231E18]">Mức độ hoàn thành</p>
                        <p className="text-[#6B6154] tabular-nums">
                          {progressStats.submitted} trên {progressStats.total} bài tập
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 flex items-end justify-between gap-2 h-24 pt-2 border-b border-[#EFE6D2] pb-1">
                      {weeklyFocusMinutes.map((d) => (
                        <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <div className="w-full max-w-[20px] flex-1 flex items-end">
                            <div
                              className={`w-full rounded-t-md transition-all ${
                                d.mins > 0 ? 'bg-[#C45A15]' : 'bg-[#EFE6D2]'
                              }`}
                              style={{ height: `${d.heightPct}%` }}
                              title={`${d.label}: ${d.mins} phút`}
                            />
                          </div>
                          <span className="text-xs text-[#6B6154] font-medium">{d.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bản tin cuối ngày & Gợi ý đồng hành */}
                <div className="lg:col-span-6 rounded-2xl border border-[#E5DBC4] bg-[#FDF3D0]/65 p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Star className="w-5 h-5 text-[#C45A15] shrink-0 mt-0.5 animate-star-twinkle" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#C45A15]">Bản tin cuối ngày</p>
                        <p className="text-sm text-[#231E18] leading-relaxed">
                          {latestHighlightAssignment
                            ? latestHighlightAssignment.status === 'needs_revision'
                              ? `Trợ lý đã nhận xét bài "${latestHighlightAssignment.title}" cần con làm lại & nộp lại (${latestHighlightAssignment.assistantFeedback}).`
                              : latestHighlightAssignment.status === 'graded'
                                ? `${student.studentName} đã hoàn thành "${latestHighlightAssignment.title}" (${latestHighlightAssignment.scoreLabel || 'Đã chấm'}) — ${latestHighlightAssignment.assistantFeedback}`
                                : latestHighlightAssignment.status === 'submitted'
                                  ? `${student.studentName} đã nộp ảnh bài "${latestHighlightAssignment.title}" và đang chờ trợ lý chấm chi tiết.`
                                  : `${student.studentName} hiện có ${progressStats.total - progressStats.submitted} bài tập đang chờ hoàn thành.`
                            : `Chưa có bài tập nào được giao cho ${student.studentName}.`}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E6D6AC] flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-[#3F6A52] shrink-0 mt-0.5 animate-glow-pulse" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#3F6A52]">Gợi ý đồng hành</p>
                        <p className="text-xs text-[#5C5347] leading-relaxed">
                          {nextPendingAssignment
                            ? `Tối nay cha mẹ có thể hỏi thăm con về bài "${nextPendingAssignment.title}" (${nextPendingAssignment.subject}) hoặc nhắc con bật Cây tập trung 25 phút nhé.`
                            : `Con đã hoàn thành hết các bài đã giao! Cha mẹ có thể khen ngợi chuỗi ${student.streakDays} ngày học đều của con hoặc nhắn trao đổi thêm với trợ lý.`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveTab('contact_schedule')}
                      className="text-xs font-bold text-[#C45A15] hover:underline"
                    >
                      Nhắn tin hoặc đặt lịch cùng Trợ lý →
                    </button>
                  </div>
                </div>
              </div>

              {/* Clean Assignment Progress Table/List */}
              <div className="rounded-2xl border border-[#E5DBC4] bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-[#EFE6D2] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-bold text-[#231E18]">
                      Chi tiết bài tập của {student.studentName}
                    </h2>
                    <span className="text-xs text-[#6B6154] tabular-nums">
                      ({studentAssignments.length} bài tập)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('teacher_tasks')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FDF3D0] border border-[#E5DBC4] text-xs font-bold text-[#C45A15] hover:bg-[#F7E7B5] transition-colors whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Thêm từ tin nhắn giáo viên
                  </button>
                </div>

                {studentAssignments.length === 0 ? (
                  <p className="p-6 text-sm text-[#6B6154]">
                    {student.studentUid || student.assistantUid
                      ? 'Chưa có bài tập hiển thị — nếu con hoặc Trợ lý đã tạo bài trước khi bạn nhập mã kết nối, bài tập sẽ tự đồng bộ ngay khi thiết bị của con/Trợ lý mở NhịpHọc.'
                      : 'Chưa có bài tập nào được giao.'}
                  </p>
                ) : (
                  <div className="divide-y divide-[#EFE6D2]">
                    {studentAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6154]">
                            <span className="text-[#C45A15] font-bold">{a.subject}</span>
                            <span aria-hidden="true">·</span>
                            <span>{a.type === 'today' ? 'Bài hôm nay' : 'Bài bổ sung'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{a.dueLabel}</span>
                          </div>
                          <p className="text-sm font-bold text-[#231E18]">{a.title}</p>
                          {a.assistantFeedback && (
                            <p className="text-xs text-[#5C5347] pt-1">
                              Nhận xét trợ lý ({a.scoreLabel || 'Đã chấm'}): {a.assistantFeedback}
                            </p>
                          )}
                          {a.submittedAtMs > 0 && (
                            <p className="text-xs text-[#8C8172]">
                              Nộp lúc: {formatTimeAgoVi(a.submittedAtMs)}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          {a.photoDataUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  title: `Ảnh con nộp · ${a.title}`,
                                  url: a.photoDataUrl,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5DBC4] bg-[#FBF8F1] text-xs font-semibold text-[#231E18] hover:bg-[#FDF3D0] whitespace-nowrap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Xem ảnh bài
                            </button>
                          )}
                          {a.assistantFeedbackPhotoUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  title: `Ảnh trợ lý chấm · ${a.title}`,
                                  url: a.assistantFeedbackPhotoUrl || '',
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C45A15]/40 bg-[#FDF3D0] text-xs font-semibold text-[#C45A15] hover:bg-[#F7E7B5] whitespace-nowrap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ảnh trợ lý chấm
                            </button>
                          )}
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
                              a.status === 'graded'
                                ? 'text-[#3F6A52]'
                                : a.status === 'needs_revision'
                                  ? 'text-amber-800'
                                  : a.status === 'submitted'
                                    ? 'text-[#C45A15]'
                                    : 'text-[#8C8172]'
                            }`}
                          >
                            {a.status === 'graded' ? (
                              <>
                                <CheckCheck className="w-4 h-4" />
                                Đã chấm xong
                              </>
                            ) : a.status === 'needs_revision' ? (
                              <>
                                <RotateCcw className="w-4 h-4" />
                                Cần nộp lại
                              </>
                            ) : a.status === 'submitted' ? (
                              <>
                                <Check className="w-4 h-4" />
                                Đã nộp
                              </>
                            ) : (
                              'Chưa nộp'
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Section 3: Phản hồi & Trợ giúp */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleSendTicket}
                className="lg:col-span-5 rounded-2xl border border-[#E5DBC4] bg-white p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-[#231E18]">
                  Gửi phản hồi hoặc yêu cầu trợ giúp
                </h2>

                <div>
                  <label className="block text-xs font-semibold text-[#5C5347] mb-1.5">
                    Phân loại
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F3ECDC] border border-[#E5DBC4]">
                    <button
                      type="button"
                      onClick={() => setTicketCategory('feedback')}
                      className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                        ticketCategory === 'feedback'
                          ? 'bg-[#C45A15] text-white shadow-sm'
                          : 'text-[#5C5347] hover:text-[#231E18]'
                      }`}
                    >
                      Phản hồi học tập
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketCategory('support')}
                      className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                        ticketCategory === 'support'
                          ? 'bg-[#C45A15] text-white shadow-sm'
                          : 'text-[#5C5347] hover:text-[#231E18]'
                      }`}
                    >
                      Cần trợ giúp
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5C5347] mb-1.5">
                    Tiêu đề
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Ví dụ: Điều chỉnh thời lượng bài tập buổi tối"
                    className="w-full rounded-xl bg-white border border-[#E5DBC4] px-3.5 py-2.5 text-sm text-[#231E18] placeholder:text-[#968A7B] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5C5347] mb-1.5">
                    Nội dung chi tiết
                  </label>
                  <textarea
                    rows={4}
                    required
                    maxLength={1000}
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Chia sẻ mong muốn hoặc vấn đề gia đình đang gặp phải..."
                    className="w-full rounded-xl bg-white border border-[#E5DBC4] px-3.5 py-2.5 text-sm text-[#231E18] placeholder:text-[#968A7B] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                  />
                </div>

                {ticketNotice && (
                  <p className="text-xs font-medium text-[#3F6A52] bg-[#FDF3D0] border border-[#E5DBC4] rounded-xl px-3.5 py-2.5">
                    {ticketNotice}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sendingTicket}
                  className="w-full py-3 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] disabled:opacity-50 transition-colors"
                >
                  {sendingTicket ? 'Đang gửi...' : 'Gửi phản hồi / yêu cầu'}
                </button>
              </form>

              <div className="lg:col-span-7 rounded-2xl border border-[#E5DBC4] bg-white p-6 space-y-4">
                <h2 className="text-base font-bold text-[#231E18]">
                  Lịch sử phản hồi & hồi âm từ Trợ lý
                </h2>

                {studentTickets.length === 0 ? (
                  <p className="text-sm text-[#6B6154] py-6">
                    Chưa có yêu cầu phản hồi hay trợ giúp nào.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {studentTickets.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-xl border border-[#E5DBC4] bg-[#FBF8F1] p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-[#6B6154] font-medium">
                            {t.category === 'feedback'
                              ? 'Phản hồi'
                              : t.category === 'support'
                                ? 'Trợ giúp'
                                : 'Quản lý'}
                          </span>
                          <span
                            className={`font-semibold ${
                              t.status === 'replied' ? 'text-[#3F6A52]' : 'text-[#C45A15]'
                            }`}
                          >
                            {t.status === 'replied'
                              ? 'Trợ lý đã phản hồi'
                              : t.status === 'closed'
                                ? 'Đã đóng'
                                : 'Đang chờ xử lý'}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-[#231E18]">{t.subject}</p>
                        <p className="text-xs text-[#5C5347] leading-relaxed">{t.message}</p>
                        {t.reply && (
                          <div className="pt-2.5 border-t border-[#E5DBC4] text-xs">
                            <p className="font-bold text-[#C45A15] mb-1">Hồi âm từ Trợ lý:</p>
                            <p className="text-[#231E18] leading-relaxed">{t.reply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Photo Modal */}
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

      {/* Link Child Modal */}
      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#231E18]/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#E5DBC4] bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#231E18]">
                Kết nối hồ sơ con bằng mã NH
              </h3>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="p-1.5 rounded-lg text-[#6B6154] hover:bg-[#FDF3D0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleLinkChild} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5C5347] mb-1.5">
                  Nhập mã kết nối (ví dụ: NH842K19)
                </label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  value={linkCodeInput}
                  onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
                  placeholder="NH..."
                  className="w-full rounded-xl bg-white border border-[#E5DBC4] px-3.5 py-2.5 text-sm font-mono uppercase text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                />
              </div>
              {linkError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {linkError}
                </p>
              )}
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#6B6154] hover:bg-[#FDF3D0]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={linking}
                  className="px-4 py-2 rounded-lg bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] disabled:opacity-50"
                >
                  {linking ? 'Đang kết nối...' : 'Kết nối'}
                </button>
              </div>
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
