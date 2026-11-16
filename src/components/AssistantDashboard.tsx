import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CheckCheck,
  ClipboardCheck,
  Copy,
  Link2,
  LogOut,
  Menu,
  MessageSquareReply,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  Assignment,
  AssignmentType,
  FeedbackTicket,
  Message,
  PublicUser,
  Schedule,
  StudentProfile,
} from '../types';
import {
  createAssignment,
  createFeedbackTicket,
  createNewStudentByAdult,
  gradeAssignment,
  linkStudentByCode,
  replyFeedbackTicket,
  sendMessage,
  toggleAssistantOnlinePresence,
  updateScheduleStatus,
} from '../services/nhiphocService';
import { formatTimeAgoVi } from '../utils/imageCompress';
import { DeleteAccountModal } from './DeleteAccountModal';
import {
  MascotAvatar,
  NhiphocAnimatedLogo,
  NhiphocLogoMark,
  NhiphocRhythmMark,
} from './MascotAvatar';

interface AssistantDashboardProps {
  user: PublicUser;
  students: StudentProfile[];
  assignments: Assignment[];
  messages: Message[];
  schedules: Schedule[];
  tickets: FeedbackTicket[];
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

type AssistantTab = 'students' | 'review' | 'parent_requests';
type ReviewFilter = 'submitted' | 'graded' | 'pending' | 'all';

export const AssistantDashboard: React.FC<AssistantDashboardProps> = ({
  user,
  students,
  assignments,
  messages,
  schedules,
  tickets,
  onSignOut,
  onDeleteAccount,
}) => {
  const [activeTab, setActiveTab] = useState<AssistantTab>('students');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [isOnline, setIsOnline] = useState(user.isOnline);
  const [togglingOnline, setTogglingOnline] = useState(false);

  // Add / Link Student modals
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addStudentMode, setAddStudentMode] = useState<'new' | 'code'>('new');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('Lớp 8');
  const [linkCodeInput, setLinkCodeInput] = useState('');
  const [studentModalError, setStudentModalError] = useState<string | null>(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Assign Homework Modal
  const [assignTargetStudent, setAssignTargetStudent] = useState<StudentProfile | null>(null);
  const [assignType, setAssignType] = useState<AssignmentType>('today');
  const [assignSubject, setAssignSubject] = useState('Toán học');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDue, setAssignDue] = useState('Hôm nay · 20:00');
  const [assigning, setAssigning] = useState(false);

  // Review / Grading Tab state
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('submitted');
  const [reviewStudentFilter, setReviewStudentFilter] = useState<string>('all');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [scoreInput, setScoreInput] = useState('9/10 · Hoàn thành tốt');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [grading, setGrading] = useState(false);

  // Parent Requests Tab state
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [replyingTicketId, setReplyingTicketId] = useState<string | null>(null);
  const [mgmtSubject, setMgmtSubject] = useState('');
  const [mgmtMessage, setMgmtMessage] = useState('');
  const [sendingMgmt, setSendingMgmt] = useState(false);

  const activeStudent =
    students.find((s) => s.id === selectedStudentId) || students[0] || null;

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q) ||
        s.linkCode.toLowerCase().includes(q),
    );
  }, [students, searchQuery]);

  const reviewAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (reviewStudentFilter !== 'all' && a.studentId !== reviewStudentFilter) return false;
      if (reviewFilter !== 'all' && a.status !== reviewFilter) return false;
      return true;
    });
  }, [assignments, reviewFilter, reviewStudentFilter]);

  const selectedAssignment =
    reviewAssignments.find((a) => a.id === selectedAssignmentId) || reviewAssignments[0] || null;

  const pendingReviewCount = useMemo(
    () => assignments.filter((a) => a.status === 'submitted').length,
    [assignments],
  );

  const activeStudentMessages = useMemo(
    () => (activeStudent ? messages.filter((m) => m.studentId === activeStudent.id) : []),
    [messages, activeStudent],
  );

  const activeStudentSchedules = useMemo(
    () => (activeStudent ? schedules.filter((s) => s.studentId === activeStudent.id) : []),
    [schedules, activeStudent],
  );

  const activeStudentTickets = useMemo(
    () => (activeStudent ? tickets.filter((t) => t.studentId === activeStudent.id) : []),
    [tickets, activeStudent],
  );

  const handleToggleOnline = async () => {
    const next = !isOnline;
    setTogglingOnline(true);
    setIsOnline(next);
    try {
      await toggleAssistantOnlinePresence({
        uid: user.uid,
        isOnline: next,
        students,
      });
    } catch {
      setIsOnline(!next);
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentModalError(null);
    setSavingStudent(true);
    try {
      if (addStudentMode === 'new') {
        const id = await createNewStudentByAdult({
          uid: user.uid,
          role: 'assistant',
          studentName: newStudentName,
          grade: newStudentGrade,
        });
        setSelectedStudentId(id);
        setNewStudentName('');
      } else {
        const id = await linkStudentByCode(linkCodeInput, user.uid, 'assistant');
        setSelectedStudentId(id);
        setLinkCodeInput('');
      }
      setShowAddStudent(false);
    } catch (err) {
      setStudentModalError(
        err instanceof Error ? err.message : 'Không thể thêm học sinh. Vui lòng thử lại.',
      );
    } finally {
      setSavingStudent(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetStudent || !assignTitle.trim()) return;
    setAssigning(true);
    try {
      await createAssignment({
        student: assignTargetStudent,
        createdBy: user.uid,
        type: assignType,
        subject: assignSubject,
        title: assignTitle,
        description: assignDesc,
        dueLabel: assignDue,
      });
      setAssignTitle('');
      setAssignDesc('');
      setAssignTargetStudent(null);
    } finally {
      setAssigning(false);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !feedbackInput.trim()) return;
    setGrading(true);
    try {
      await gradeAssignment({
        assignmentId: selectedAssignment.id,
        gradedBy: user.uid,
        scoreLabel: scoreInput,
        assistantFeedback: feedbackInput,
      });
      setFeedbackInput('');
    } finally {
      setGrading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !msgText.trim()) return;
    setSendingMsg(true);
    try {
      await sendMessage({
        student: activeStudent,
        senderUid: user.uid,
        senderName: user.displayName,
        senderRole: 'assistant',
        content: msgText,
      });
      setMsgText('');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleReplyTicket = async (ticketId: string) => {
    const text = (ticketReplies[ticketId] || '').trim();
    if (!text) return;
    setReplyingTicketId(ticketId);
    try {
      await replyFeedbackTicket({
        ticketId,
        repliedBy: user.uid,
        reply: text,
      });
      setTicketReplies((prev) => ({ ...prev, [ticketId]: '' }));
    } finally {
      setReplyingTicketId(null);
    }
  };

  const handleCreateManagementNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !mgmtSubject.trim() || !mgmtMessage.trim()) return;
    setSendingMgmt(true);
    try {
      await createFeedbackTicket({
        student: activeStudent,
        createdBy: user.uid,
        category: 'management',
        subject: mgmtSubject,
        message: mgmtMessage,
      });
      setMgmtSubject('');
      setMgmtMessage('');
    } finally {
      setSendingMgmt(false);
    }
  };

  const navItems: Array<{
    id: AssistantTab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'students', label: 'Danh sách học sinh đang theo', icon: Users },
    { id: 'review', label: 'Kiểm tra tiến độ & Chấm bài', icon: ClipboardCheck },
    { id: 'parent_requests', label: 'Phản hồi phụ huynh & Quản lý', icon: MessageSquareReply },
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
            <p className="text-xs text-[#6B6154] truncate">Cổng Trợ lý học tập</p>
          </div>
        </div>

        {/* Live Assistant Online Presence Toggle */}
        <div className="rounded-xl border border-[#E5DBC4] bg-[#FDF3D0]/75 p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#231E18]">Trạng thái trực</span>
            <button
              type="button"
              disabled={togglingOnline}
              onClick={handleToggleOnline}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                isOnline
                  ? 'bg-[#C45A15] text-white'
                  : 'bg-white border border-[#E5DBC4] text-[#6B6154]'
              }`}
            >
              {isOnline ? 'Đang trực' : 'Ngoại tuyến'}
            </button>
          </div>
          <p className="text-xs text-[#6B6154] leading-relaxed">
            {isOnline
              ? 'Học sinh nộp bài sẽ nhận phản hồi tiếp nhận ngay lập tức.'
              : 'Học sinh nộp bài vẫn được tick Đã nộp và hẹn nhận xét sau 1h.'}
          </p>
        </div>

        <nav className="space-y-1.5" aria-label="Menu trợ lý">
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
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors text-left ${
                  active
                    ? 'bg-[#C45A15] text-white shadow-sm'
                    : 'text-[#5C5347] hover:bg-[#FDF3D0] hover:text-[#231E18]'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'review' && pendingReviewCount > 0 && (
                  <span
                    className={`text-xs font-mono tabular-nums shrink-0 ${
                      active ? 'text-[#FDF3D0]' : 'text-[#C45A15]'
                    }`}
                  >
                    {pendingReviewCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-[#E5DBC4] space-y-3">
        <div className="text-xs text-[#6B6154]">
          <p className="font-bold text-[#231E18] truncate">{user.displayName}</p>
          <p className="tabular-nums">Đang theo dõi {students.length} học sinh</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-[#E5DBC4] text-xs font-semibold text-[#5C5347] hover:bg-[#FDF3D0] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Đăng xuất
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
      <aside className="hidden lg:block w-[276px] shrink-0 bg-white border-r border-[#E5DBC4] sticky top-0 h-screen">
        {renderSidebar()}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#231E18]/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-76 max-w-[85vw] bg-white h-full border-r border-[#E5DBC4] z-10">
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

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-[#FBF8F1]/95 backdrop-blur-sm border-b border-[#E5DBC4] sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-[#231E18] hover:bg-[#FDF3D0] shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs text-[#6B6154] whitespace-nowrap">Trợ lý NhịpHọc</p>
                <h1 className="text-base sm:text-lg font-extrabold text-[#231E18] leading-tight whitespace-nowrap">
                  {navItems.find((n) => n.id === activeTab)?.label}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setStudentModalError(null);
                  setShowAddStudent(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] transition-colors whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thêm / Kết nối học sinh</span>
                <span className="sm:hidden">Thêm HS</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-8 py-7 space-y-6">
          <section className="rounded-2xl border border-[#E5DBC4] bg-[#FDF3D0] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <NhiphocAnimatedLogo size="sm" />
                <MascotAvatar
                  size="lg"
                  mood={pendingReviewCount > 0 ? 'surprised' : 'happy'}
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <NhiphocRhythmMark />
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C45A15]">
                    {isOnline && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3F6A52] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3F6A52]" />
                      </span>
                    )}
                    Trợ lý NhịpHọc · {isOnline ? 'Đang trực tuyến' : 'Ngoại tuyến'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#231E18]">
                  Chào {user.displayName}, hiện có {pendingReviewCount} bài nộp đang chờ chấm
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0 border-t sm:border-t-0 sm:border-l border-[#E6D6AC] pt-3 sm:pt-0 sm:pl-6 tabular-nums">
              <div>
                <p className="text-xs text-[#6B6154]">Học sinh</p>
                <p className="text-base font-extrabold text-[#231E18]">{students.length} em</p>
              </div>
              <div>
                <p className="text-xs text-[#6B6154]">Chờ chấm</p>
                <p className="text-base font-extrabold text-[#C45A15]">{pendingReviewCount} bài</p>
              </div>
            </div>
          </section>

          {activeTab === 'students' ? (
            <>
              {/* Search & Roster Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="w-4 h-4 text-[#8C8172] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên học sinh, lớp hoặc mã NH..."
                    className="w-full rounded-xl border border-[#E5DBC4] bg-white pl-10 pr-4 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25"
                  />
                </div>
                <p className="text-xs text-[#6B6154] tabular-nums">
                  {filteredStudents.length} học sinh · {pendingReviewCount} bài đang chờ chấm
                </p>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="rounded-2xl border border-[#E5DBC4] bg-white p-10 text-center space-y-3">
                  <p className="text-base font-bold text-[#231E18]">
                    Chưa có học sinh nào trong danh sách
                  </p>
                  <p className="text-sm text-[#6B6154] max-w-md mx-auto">
                    Tạo hồ sơ học sinh mới hoặc nhập mã kết nối (NH...) từ phụ huynh/học sinh để
                    bắt đầu theo dõi.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddStudent(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F]"
                  >
                    <UserPlus className="w-4 h-4" />
                    Thêm học sinh đầu tiên
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#E5DBC4] bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#E5DBC4] bg-[#FBF8F1] text-xs font-bold text-[#6B6154]">
                          <th className="py-3.5 px-5">Học sinh</th>
                          <th className="py-3.5 px-4">Mã kết nối</th>
                          <th className="py-3.5 px-4 text-right">Đã nộp / Tổng bài</th>
                          <th className="py-3.5 px-4 text-right">Chờ chấm</th>
                          <th className="py-3.5 px-4 text-right">Cây tập trung</th>
                          <th className="py-3.5 px-5 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE6D2] text-sm">
                        {filteredStudents.map((stu) => {
                          const stuAsg = assignments.filter((a) => a.studentId === stu.id);
                          const submittedCnt = stuAsg.filter((a) => a.status !== 'pending').length;
                          const waitingGrade = stuAsg.filter((a) => a.status === 'submitted').length;
                          return (
                            <tr key={stu.id} className="hover:bg-[#FBF8F1] transition-colors">
                              <td className="py-4 px-5">
                                <p className="font-bold text-[#231E18]">{stu.studentName}</p>
                                <p className="text-xs text-[#6B6154]">{stu.grade}</p>
                              </td>
                              <td className="py-4 px-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(stu.linkCode);
                                    setCopiedId(stu.id);
                                    setTimeout(() => setCopiedId(null), 1800);
                                  }}
                                  className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#C45A15] hover:underline"
                                >
                                  <span>{stu.linkCode}</span>
                                  <Copy className="w-3 h-3" />
                                  {copiedId === stu.id && (
                                    <span className="font-sans text-xs">(Đã chép)</span>
                                  )}
                                </button>
                              </td>
                              <td className="py-4 px-4 text-right font-mono tabular-nums text-[#231E18]">
                                {submittedCnt}/{stuAsg.length}
                              </td>
                              <td className="py-4 px-4 text-right font-mono tabular-nums font-bold text-[#C45A15]">
                                {waitingGrade}
                              </td>
                              <td className="py-4 px-4 text-right font-mono tabular-nums text-[#6B6154]">
                                {stu.focusMinutesTotal} phút
                              </td>
                              <td className="py-4 px-5 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setAssignTargetStudent(stu)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FDF3D0] border border-[#E5DBC4] text-[#C45A15] text-xs font-bold hover:bg-[#F7E7B5] whitespace-nowrap"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Giao bài
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReviewStudentFilter(stu.id);
                                      setReviewFilter('all');
                                      setActiveTab('review');
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-[#E5DBC4] text-xs font-semibold text-[#231E18] hover:bg-[#FDF3D0] whitespace-nowrap"
                                  >
                                    Kiểm tra
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : activeTab === 'review' ? (
            /* Section 2: Kiểm tra tiến độ & Chấm bài */
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F3ECDC] border border-[#E5DBC4]">
                  {(
                    [
                      { id: 'submitted', label: 'Chờ chấm' },
                      { id: 'graded', label: 'Đã chấm xong' },
                      { id: 'pending', label: 'Chưa nộp' },
                      { id: 'all', label: 'Tất cả' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setReviewFilter(f.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        reviewFilter === f.id
                          ? 'bg-white text-[#231E18] shadow-sm'
                          : 'text-[#6B6154] hover:text-[#231E18]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <select
                  value={reviewStudentFilter}
                  onChange={(e) => setReviewStudentFilter(e.target.value)}
                  className="rounded-xl border border-[#E5DBC4] bg-white px-3.5 py-2 text-xs font-semibold text-[#231E18] focus:outline-none"
                >
                  <option value="all">Tất cả học sinh ({students.length})</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.studentName} · {s.grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Queue */}
                <div className="lg:col-span-5 rounded-2xl border border-[#E5DBC4] bg-white overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#E5DBC4] bg-[#FBF8F1] flex items-center justify-between text-xs font-bold text-[#6B6154]">
                    <span>Danh sách bài tập</span>
                    <span className="tabular-nums">{reviewAssignments.length} mục</span>
                  </div>

                  {reviewAssignments.length === 0 ? (
                    <p className="p-6 text-sm text-[#6B6154]">
                      Không có bài tập nào khớp bộ lọc hiện tại.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#EFE6D2] max-h-[600px] overflow-y-auto">
                      {reviewAssignments.map((a) => {
                        const stu = students.find((s) => s.id === a.studentId);
                        const isSelected = selectedAssignment?.id === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setSelectedAssignmentId(a.id)}
                            className={`w-full text-left p-4 transition-colors space-y-1 ${
                              isSelected ? 'bg-[#FDF3D0]/80' : 'hover:bg-[#FBF8F1]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-[#C45A15]">
                                {stu?.studentName || 'Học sinh'} · {a.subject}
                              </span>
                              <span className="inline-flex items-center gap-1 font-medium text-[#6B6154]">
                                {a.status === 'graded' ? (
                                  <>
                                    <CheckCheck className="w-3.5 h-3.5 text-[#3F6A52]" />
                                    Đã chấm
                                  </>
                                ) : a.status === 'submitted' ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-[#C45A15]" />
                                    Chờ chấm
                                  </>
                                ) : (
                                  'Chưa nộp'
                                )}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-[#231E18] line-clamp-1">
                              {a.title}
                            </p>
                            {a.submittedAtMs > 0 && (
                              <p className="text-xs text-[#8C8172]">
                                Nộp {formatTimeAgoVi(a.submittedAtMs)}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Grading Cockpit */}
                <div className="lg:col-span-7 rounded-2xl border border-[#E5DBC4] bg-white p-6 space-y-5">
                  {!selectedAssignment ? (
                    <div className="py-12 text-center text-sm text-[#6B6154]">
                      Chọn một bài tập ở cột bên trái để kiểm tra tiến độ và chấm bài.
                    </div>
                  ) : (
                    <>
                      <div className="border-b border-[#EFE6D2] pb-4 space-y-1">
                        <div className="flex items-center justify-between gap-3 text-xs text-[#6B6154]">
                          <span>
                            {students.find((s) => s.id === selectedAssignment.studentId)?.studentName}{' '}
                            · {selectedAssignment.subject} · {selectedAssignment.dueLabel}
                          </span>
                          <span className="font-bold text-[#C45A15]">
                            {selectedAssignment.status === 'graded'
                              ? 'Đã chấm xong'
                              : selectedAssignment.status === 'submitted'
                                ? 'Đã nộp · Chờ chấm'
                                : 'Chưa nộp'}
                          </span>
                        </div>
                        <h2 className="text-lg font-extrabold text-[#231E18]">
                          {selectedAssignment.title}
                        </h2>
                        {selectedAssignment.description && (
                          <p className="text-sm text-[#6B6154]">
                            {selectedAssignment.description}
                          </p>
                        )}
                      </div>

                      {/* Photo submission */}
                      {selectedAssignment.photoDataUrl ? (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-[#231E18]">
                            Ảnh bài làm học sinh đã chụp
                          </p>
                          <div className="rounded-xl border border-[#E5DBC4] bg-[#FBF8F1] p-3">
                            <img
                              src={selectedAssignment.photoDataUrl}
                              alt={selectedAssignment.title}
                              className="max-h-80 mx-auto rounded-lg object-contain"
                            />
                          </div>
                          {selectedAssignment.studentNote && (
                            <p className="text-xs text-[#5C5347] bg-[#FBF8F1] border border-[#E5DBC4] rounded-lg px-3.5 py-2.5">
                              Ghi chú của học sinh: &ldquo;{selectedAssignment.studentNote}&rdquo;
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-[#E5DBC4] bg-[#FBF8F1] p-6 text-center text-xs text-[#6B6154]">
                          Học sinh chưa chụp ảnh nộp bài này.
                        </div>
                      )}

                      {/* Grading form or Graded summary */}
                      {selectedAssignment.status === 'graded' ? (
                        <div className="rounded-xl border border-[#E5DBC4] bg-[#FDF3D0]/80 p-4 space-y-1.5">
                          <p className="text-xs font-bold text-[#3F6A52] tabular-nums">
                            Đã chấm xong · {selectedAssignment.scoreLabel}
                          </p>
                          <p className="text-sm text-[#231E18]">
                            {selectedAssignment.assistantFeedback}
                          </p>
                        </div>
                      ) : selectedAssignment.status === 'submitted' ? (
                        <form
                          onSubmit={handleGradeSubmit}
                          className="space-y-4 pt-2 border-t border-[#EFE6D2]"
                        >
                          <div>
                            <label className="block text-xs font-semibold text-[#231E18] mb-1.5">
                              Điểm số / Đánh giá nhanh
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={40}
                              value={scoreInput}
                              onChange={(e) => setScoreInput(e.target.value)}
                              placeholder="Ví dụ: 9.5/10 · Rất tốt"
                              className="w-full rounded-xl border border-[#E5DBC4] px-3.5 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#231E18] mb-1.5">
                              Nhận xét chi tiết gửi học sinh & phụ huynh
                            </label>
                            <textarea
                              rows={3}
                              required
                              maxLength={1000}
                              value={feedbackInput}
                              onChange={(e) => setFeedbackInput(e.target.value)}
                              placeholder="Khen ngợi phần làm tốt và chỉ rõ bước cần sửa nếu có..."
                              className="w-full rounded-xl border border-[#E5DBC4] px-3.5 py-2.5 text-sm text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={grading}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C45A15] text-white text-sm font-bold hover:bg-[#AA4C0F] disabled:opacity-50"
                          >
                            <CheckCheck className="w-4 h-4" />
                            {grading ? 'Đang lưu điểm...' : 'Xác nhận đã chấm xong'}
                          </button>
                        </form>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Section 3: Phản hồi phụ huynh & Quản lý thêm */
            <div className="space-y-6">
              {students.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E5DBC4] rounded-xl p-4">
                  <span className="text-xs font-semibold text-[#6B6154]">
                    Đang xem liên lạc của học sinh:
                  </span>
                  <select
                    value={activeStudent?.id || ''}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="rounded-lg border border-[#E5DBC4] bg-[#FBF8F1] px-3.5 py-2 text-xs font-bold text-[#231E18]"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.studentName} · {s.grade}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!activeStudent ? (
                <p className="text-sm text-[#6B6154]">
                  Thêm hoặc kết nối học sinh để quản lý trao đổi cùng phụ huynh.
                </p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Parent Chat */}
                  <section className="lg:col-span-6 rounded-2xl border border-[#E5DBC4] bg-white flex flex-col h-[500px]">
                    <div className="px-5 py-4 border-b border-[#EFE6D2]">
                      <h2 className="text-sm font-bold text-[#231E18]">
                        Tin nhắn trao đổi với Phụ huynh
                      </h2>
                      <p className="text-xs text-[#6B6154]">
                        Hồ sơ: {activeStudent.studentName}
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                      {activeStudentMessages.length === 0 ? (
                        <p className="text-sm text-[#6B6154] text-center py-12">
                          Chưa có tin nhắn nào từ phụ huynh.
                        </p>
                      ) : (
                        activeStudentMessages.map((m) => {
                          const isMe = m.senderUid === user.uid;
                          return (
                            <div
                              key={m.id}
                              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                            >
                              <span className="text-xs text-[#8C8172] mb-1">
                                {m.senderName} ·{' '}
                                {m.senderRole === 'parent'
                                  ? 'Phụ huynh'
                                  : m.senderRole === 'student'
                                    ? 'Học sinh'
                                    : 'Trợ lý'}
                              </span>
                              <div
                                className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm ${
                                  isMe
                                    ? 'bg-[#C45A15] text-white'
                                    : 'bg-[#FDF3D0]/80 border border-[#E5DBC4] text-[#231E18]'
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
                      className="p-4 border-t border-[#EFE6D2] flex items-center gap-2.5"
                    >
                      <input
                        type="text"
                        maxLength={1000}
                        value={msgText}
                        onChange={(e) => setMsgText(e.target.value)}
                        placeholder="Nhắn phản hồi cho phụ huynh..."
                        className="flex-1 rounded-xl border border-[#E5DBC4] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25"
                      />
                      <button
                        type="submit"
                        disabled={sendingMsg || !msgText.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] disabled:opacity-45"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Gửi
                      </button>
                    </form>
                  </section>

                  {/* Schedules & Feedback Tickets */}
                  <section className="lg:col-span-6 space-y-6">
                    {/* Schedules */}
                    <div className="rounded-2xl border border-[#E5DBC4] bg-white p-5 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#231E18]">
                        <Calendar className="w-4 h-4 text-[#C45A15]" />
                        <span>Lịch hẹn từ Phụ huynh</span>
                      </div>
                      {activeStudentSchedules.length === 0 ? (
                        <p className="text-xs text-[#6B6154]">Chưa có lịch hẹn nào.</p>
                      ) : (
                        <div className="divide-y divide-[#EFE6D2]">
                          {activeStudentSchedules.map((sch) => (
                            <div key={sch.id} className="py-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-[#231E18]">{sch.title}</p>
                                <span className="text-xs font-bold text-[#C45A15]">
                                  {sch.status === 'confirmed'
                                    ? 'Đã xác nhận'
                                    : sch.status === 'completed'
                                      ? 'Hoàn thành'
                                      : sch.status === 'cancelled'
                                        ? 'Đã hủy'
                                        : 'Chờ xác nhận'}
                                </span>
                              </div>
                              <p className="text-xs text-[#6B6154] tabular-nums">
                                {sch.dateStr} · {sch.timeStr}
                              </p>
                              {sch.status === 'requested' && (
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => updateScheduleStatus(sch.id, 'confirmed')}
                                    className="px-3 py-1.5 rounded-lg bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F]"
                                  >
                                    Xác nhận lịch
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateScheduleStatus(sch.id, 'cancelled')}
                                    className="px-3 py-1.5 rounded-lg border border-[#E5DBC4] text-xs font-medium text-[#6B6154] hover:bg-[#FDF3D0]"
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              )}
                              {sch.status === 'confirmed' && (
                                <button
                                  type="button"
                                  onClick={() => updateScheduleStatus(sch.id, 'completed')}
                                  className="px-3 py-1.5 rounded-lg bg-[#FDF3D0] border border-[#E5DBC4] text-[#3F6A52] text-xs font-bold hover:bg-[#F7E7B5]"
                                >
                                  Đánh dấu đã hoàn thành
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Parent Feedback Tickets & Management Notes */}
                    <div className="rounded-2xl border border-[#E5DBC4] bg-white p-5 space-y-4">
                      <h3 className="text-sm font-bold text-[#231E18]">
                        Phản hồi phụ huynh & Yêu cầu quản lý
                      </h3>

                      {activeStudentTickets.length === 0 ? (
                        <p className="text-xs text-[#6B6154]">
                          Chưa có phản hồi hay yêu cầu quản lý nào.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {activeStudentTickets.map((t) => (
                            <div
                              key={t.id}
                              className="rounded-xl border border-[#E5DBC4] bg-[#FBF8F1] p-4 space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs text-[#6B6154]">
                                <span>
                                  {t.category === 'feedback'
                                    ? 'Phản hồi phụ huynh'
                                    : t.category === 'support'
                                      ? 'Yêu cầu trợ giúp'
                                      : 'Yêu cầu quản lý'}
                                </span>
                                <span className="font-bold text-[#C45A15]">
                                  {t.status === 'replied'
                                    ? 'Đã trả lời'
                                    : t.status === 'closed'
                                      ? 'Đã đóng'
                                      : 'Mới'}
                                </span>
                              </div>
                              <p className="text-sm font-bold text-[#231E18]">{t.subject}</p>
                              <p className="text-xs text-[#5C5347] leading-relaxed">{t.message}</p>

                              {t.reply ? (
                                <div className="pt-2 border-t border-[#E5DBC4] text-xs text-[#3F6A52]">
                                  <span className="font-semibold">Phản hồi đã gửi: </span>
                                  <span className="text-[#231E18]">{t.reply}</span>
                                </div>
                              ) : (
                                <div className="pt-2 flex items-center gap-2">
                                  <input
                                    type="text"
                                    maxLength={1000}
                                    value={ticketReplies[t.id] || ''}
                                    onChange={(e) =>
                                      setTicketReplies((prev) => ({
                                        ...prev,
                                        [t.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Nhập hồi âm gửi phụ huynh..."
                                    className="flex-1 rounded-lg border border-[#E5DBC4] bg-white px-3 py-1.5 text-xs focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    disabled={replyingTicketId === t.id}
                                    onClick={() => handleReplyTicket(t.id)}
                                    className="px-3 py-1.5 rounded-lg bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F]"
                                  >
                                    Trả lời
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <form
                        onSubmit={handleCreateManagementNote}
                        className="pt-4 border-t border-[#EFE6D2] space-y-2.5"
                      >
                        <p className="text-xs font-bold text-[#231E18]">
                          Tạo yêu cầu quản lý / nhắc lịch mới
                        </p>
                        <input
                          type="text"
                          required
                          maxLength={120}
                          value={mgmtSubject}
                          onChange={(e) => setMgmtSubject(e.target.value)}
                          placeholder="Tiêu đề yêu cầu quản lý..."
                          className="w-full rounded-xl border border-[#E5DBC4] px-3 py-2 text-xs focus:outline-none"
                        />
                        <textarea
                          rows={2}
                          required
                          maxLength={1000}
                          value={mgmtMessage}
                          onChange={(e) => setMgmtMessage(e.target.value)}
                          placeholder="Nội dung đề xuất điều chỉnh lộ trình hoặc báo cáo tuần..."
                          className="w-full rounded-xl border border-[#E5DBC4] px-3 py-2 text-xs focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={sendingMgmt}
                          className="px-4 py-2 rounded-lg border border-[#C45A15] text-[#C45A15] text-xs font-bold hover:bg-[#FDF3D0]"
                        >
                          {sendingMgmt ? 'Đang lưu...' : 'Lưu ghi chú quản lý'}
                        </button>
                      </form>
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Add / Link Student Modal */}
      {showAddStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#231E18]/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5DBC4] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#231E18]">Thêm học sinh theo dõi</h3>
              <button
                type="button"
                onClick={() => setShowAddStudent(false)}
                className="p-1.5 rounded-lg text-[#6B6154] hover:bg-[#FDF3D0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F3ECDC] border border-[#E5DBC4]">
              <button
                type="button"
                onClick={() => setAddStudentMode('new')}
                className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                  addStudentMode === 'new' ? 'bg-white text-[#231E18] shadow-sm' : 'text-[#6B6154]'
                }`}
              >
                Tạo hồ sơ mới
              </button>
              <button
                type="button"
                onClick={() => setAddStudentMode('code')}
                className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                  addStudentMode === 'code' ? 'bg-white text-[#231E18] shadow-sm' : 'text-[#6B6154]'
                }`}
              >
                Nhập mã NH...
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              {addStudentMode === 'new' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#231E18] mb-1.5">
                      Họ và tên học sinh
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="Nguyễn Minh Anh"
                      className="w-full rounded-xl border border-[#E5DBC4] px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#231E18] mb-1.5">
                      Khối / Lớp
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={40}
                      value={newStudentGrade}
                      onChange={(e) => setNewStudentGrade(e.target.value)}
                      placeholder="Lớp 8"
                      className="w-full rounded-xl border border-[#E5DBC4] px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#231E18] mb-1.5">
                    Mã kết nối học sinh (NH...)
                  </label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-[#8C8172] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={linkCodeInput}
                      onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
                      placeholder="NH842K19"
                      className="w-full rounded-xl border border-[#E5DBC4] pl-10 pr-3.5 py-2.5 text-sm font-mono uppercase"
                    />
                  </div>
                </div>
              )}

              {studentModalError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {studentModalError}
                </p>
              )}

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6B6154] hover:bg-[#FDF3D0]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingStudent}
                  className="px-4 py-2 rounded-lg bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] disabled:opacity-50"
                >
                  {savingStudent ? 'Đang lưu...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Homework Modal */}
      {assignTargetStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#231E18]/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5DBC4] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B6154]">Giao bài cho {assignTargetStudent.studentName}</p>
                <h3 className="text-lg font-bold text-[#231E18]">Tạo bài tập mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignTargetStudent(null)}
                className="p-1.5 rounded-lg text-[#6B6154] hover:bg-[#FDF3D0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F3ECDC] border border-[#E5DBC4]">
                <button
                  type="button"
                  onClick={() => setAssignType('today')}
                  className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                    assignType === 'today' ? 'bg-white text-[#231E18] shadow-sm' : 'text-[#6B6154]'
                  }`}
                >
                  Bài tập hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setAssignType('extra')}
                  className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                    assignType === 'extra' ? 'bg-white text-[#231E18] shadow-sm' : 'text-[#6B6154]'
                  }`}
                >
                  Bài tập bổ sung
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#231E18] mb-1">Môn học</label>
                  <select
                    value={assignSubject}
                    onChange={(e) => setAssignSubject(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DBC4] px-3 py-2 text-sm bg-white"
                  >
                    <option value="Toán học">Toán học</option>
                    <option value="Ngữ văn">Ngữ văn</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Khoa học">Khoa học</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#231E18] mb-1">Hạn nộp</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={assignDue}
                    onChange={(e) => setAssignDue(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DBC4] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E18] mb-1">
                  Tên bài tập
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="Ví dụ: Hoàn thành phiếu bài tập số 4"
                  className="w-full rounded-xl border border-[#E5DBC4] px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E18] mb-1">
                  Hướng dẫn chi tiết
                </label>
                <textarea
                  rows={3}
                  maxLength={800}
                  value={assignDesc}
                  onChange={(e) => setAssignDesc(e.target.value)}
                  placeholder="Yêu cầu trình bày rõ các bước..."
                  className="w-full rounded-xl border border-[#E5DBC4] px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAssignTargetStudent(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6B6154] hover:bg-[#FDF3D0]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-4 py-2 rounded-lg bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] disabled:opacity-50"
                >
                  {assigning ? 'Đang giao...' : 'Giao bài ngay'}
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
