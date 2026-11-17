import React, { Component, ErrorInfo, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteUser,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError } from './firebase';
import {
  Assignment,
  FeedbackTicket,
  FocusSession,
  Message,
  OperationType,
  PublicUser,
  Schedule,
  StudentProfile,
  UserRole,
} from './types';
import {
  cleanupAnonymousParentSession,
  createSelfStudentWorkspace,
  deleteAccountAndData,
  fetchUserProfiles,
  linkStudentByCode,
  registerUserAndWorkspace,
  syncStudentMembershipAcrossDocs,
  verifyStudentLinkCode,
} from './services/nhiphocService';
import { AuthOnboarding } from './components/AuthOnboarding';
import { StudentDashboard, StudentTab } from './components/StudentDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { AssistantDashboard } from './components/AssistantDashboard';
import { MascotAvatar } from './components/MascotAvatar';
import { NhiphocToast, ToastViewport } from './components/ToastViewport';
import { isSoundEnabled, playClickSound } from './utils/soundEffects';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nhiphoc ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FBF8F1] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E5DBC4] rounded-2xl p-6 space-y-4 text-center">
            <MascotAvatar size="lg" mood="surprised" className="mx-auto" />
            <h1 className="text-lg font-bold text-[#231E18]">Đã xảy ra sự cố kết nối</h1>
            <p className="text-xs text-[#6B6154] break-words">{this.state.errorMessage}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#C45A15] text-white text-xs font-semibold hover:bg-[#AA4C0F]"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function getRoleFilterField(role: UserRole): 'studentUid' | 'parentUid' | 'assistantUid' {
  if (role === 'parent') return 'parentUid';
  if (role === 'assistant') return 'assistantUid';
  return 'studentUid';
}

function playToastChime() {
  if (!isSoundEnabled()) return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [587.33, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      gain.gain.setValueAtTime(0.001, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.07, now + idx * 0.11 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.11 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.42);
    });
  } catch {
    // Ignore audio block when user hasn't interacted yet
  }
}

function NhiphocApp() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [publicUser, setPublicUser] = useState<PublicUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Real-time workspace state
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Push Toast Notifications & Student deep-link triggers
  const [toasts, setToasts] = useState<NhiphocToast[]>([]);
  const [unreadStudentMsgCount, setUnreadStudentMsgCount] = useState(0);
  const [studentRequestedTab, setStudentRequestedTab] = useState<{
    tab: StudentTab;
    nonce: number;
  } | null>(null);
  const [studentOpenMessagesNonce, setStudentOpenMessagesNonce] = useState(0);
  const toastSeqRef = useRef(0);

  // Preferred role on onboarding / switching accounts
  const [preferredRole, setPreferredRole] = useState<UserRole>('student');
  const pendingAnonymousSetupRef = useRef<boolean>(false);

  // Fallback workspace link/create state if user has no student yet
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<NhiphocToast, 'id' | 'createdAtMs'>) => {
      toastSeqRef.current += 1;
      const id = `toast_${Date.now()}_${toastSeqRef.current}`;
      setToasts((prev) => [
        { ...toast, id, createdAtMs: Date.now() },
        ...prev.slice(0, 4),
      ]);
      playToastChime();
    },
    [],
  );

  const handleMarkMessagesRead = useCallback(() => {
    setUnreadStudentMsgCount(0);
  }, []);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-custom-sound="true"]')) return;
      const interactive = target.closest(
        'button:not(:disabled), a[href], [role="button"], select'
      );
      if (interactive) {
        playClickSound();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setPublicUser(null);
        setStudents([]);
        setAssignments([]);
        setFocusSessions([]);
        setMessages([]);
        setSchedules([]);
        setTickets([]);
        setToasts([]);
        setUnreadStudentMsgCount(0);
        setAuthReady(true);
        return;
      }

      if (user.isAnonymous && pendingAnonymousSetupRef.current) {
        return;
      }

      setProfileLoading(true);
      try {
        const { publicUser: loaded } = await fetchUserProfiles(user.uid);
        setPublicUser(loaded);
      } catch (err) {
        setPublicUser(null);
        setAuthError(err instanceof Error ? err.message : 'Không tải được hồ sơ người dùng.');
      } finally {
        setProfileLoading(false);
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Attach Firestore real-time listeners once publicUser is ready
  useEffect(() => {
    if (!firebaseUser || !publicUser) return;

    const uid = firebaseUser.uid;
    const roleField = getRoleFilterField(publicUser.role);
    setDataLoading(true);

    // Per-subscription baseline tracking so initial load never floods toasts
    let assignmentsReady = false;
    const knownAssignmentStatus = new Map<string, Assignment['status']>();
    let messagesReady = false;
    const knownMessageIds = new Set<string>();
    let ticketsReady = false;
    const knownTicketStatus = new Map<string, FeedbackTicket['status']>();

    const unsubStudents = onSnapshot(
      query(collection(db, 'students'), where(roleField, '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as StudentProfile);
        setStudents(list);
        setSelectedStudentId((prev) =>
          list.length > 0 && !list.some((s) => s.id === prev) ? list[0].id : prev,
        );
        setDataLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'students'),
    );

    const unsubAssignments = onSnapshot(
      query(collection(db, 'assignments'), where(roleField, '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Assignment);
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setAssignments(list);

        if (!assignmentsReady) {
          list.forEach((a) => knownAssignmentStatus.set(a.id, a.status));
          assignmentsReady = true;
          return;
        }

        const addedForStudent: Assignment[] = [];

        snap.docChanges().forEach((change) => {
          const a = change.doc.data() as Assignment;
          const prevStatus = knownAssignmentStatus.get(a.id);

          if (change.type === 'added' && !knownAssignmentStatus.has(a.id)) {
            if (publicUser.role === 'student' && a.createdBy !== uid) {
              addedForStudent.push(a);
            }
          } else if (change.type === 'modified') {
            if (publicUser.role === 'student' && prevStatus !== 'graded' && a.status === 'graded') {
              const targetTab: StudentTab = a.type === 'extra' ? 'extra' : 'today';
              pushToast({
                category: 'graded',
                title: 'Trợ lý đã chấm xong bài tập!',
                message: a.assistantFeedback
                  ? `${a.title}: "${a.assistantFeedback}"`
                  : `${a.subject} — ${a.title} đã có kết quả chấm mới.`,
                actionLabel: 'Xem kết quả',
                onAction: () => {
                  setStudentRequestedTab({ tab: targetTab, nonce: Date.now() });
                },
              });
            } else if (
              publicUser.role === 'student' &&
              prevStatus !== 'needs_revision' &&
              a.status === 'needs_revision'
            ) {
              const targetTab: StudentTab = a.type === 'extra' ? 'extra' : 'today';
              pushToast({
                category: 'assignment',
                title: 'Bài tập cần làm lại & nộp lại',
                message: a.assistantFeedback
                  ? `${a.title}: "${a.assistantFeedback}"`
                  : `${a.subject} — ${a.title} chưa đạt yêu cầu, hãy xem góp ý và nộp lại nhé.`,
                actionLabel: 'Nộp lại ngay',
                onAction: () => {
                  setStudentRequestedTab({ tab: targetTab, nonce: Date.now() });
                },
              });
            } else if (publicUser.role === 'assistant' && a.status === 'submitted') {
              const isResubmitted = prevStatus !== undefined && prevStatus !== 'pending';
              pushToast({
                category: 'assignment',
                title: isResubmitted
                  ? 'Học sinh vừa nộp lại bài ảnh'
                  : 'Học sinh vừa nộp bài ảnh mới',
                message: `${a.subject}: ${a.title}`,
              });
            } else if (
              publicUser.role === 'parent' &&
              prevStatus !== 'graded' &&
              a.status === 'graded'
            ) {
              pushToast({
                category: 'graded',
                title: 'Trợ lý vừa chấm bài cho con',
                message: `${a.subject}: ${a.title}`,
              });
            } else if (
              publicUser.role === 'parent' &&
              prevStatus !== 'needs_revision' &&
              a.status === 'needs_revision'
            ) {
              pushToast({
                category: 'assignment',
                title: 'Trợ lý yêu cầu con nộp lại bài',
                message: `${a.subject}: ${a.title}`,
              });
            }
          }

          knownAssignmentStatus.set(a.id, a.status);
        });

        if (addedForStudent.length === 1) {
          const single = addedForStudent[0];
          const targetTab: StudentTab = single.type === 'extra' ? 'extra' : 'today';
          pushToast({
            category: 'assignment',
            title: single.type === 'extra' ? 'Có bài tập bổ sung mới' : 'Có bài tập mới hôm nay',
            message: `${single.subject}: ${single.title}`,
            actionLabel: 'Xem bài tập',
            onAction: () => {
              setStudentRequestedTab({ tab: targetTab, nonce: Date.now() });
            },
          });
        } else if (addedForStudent.length > 1) {
          const hasToday = addedForStudent.some((x) => x.type === 'today');
          const targetTab: StudentTab = hasToday ? 'today' : 'extra';
          pushToast({
            category: 'assignment',
            title: `Có ${addedForStudent.length} bài tập mới vừa được thêm`,
            message: addedForStudent
              .slice(0, 3)
              .map((x) => `${x.subject}: ${x.title}`)
              .join(' · '),
            actionLabel: 'Xem danh sách',
            onAction: () => {
              setStudentRequestedTab({ tab: targetTab, nonce: Date.now() });
            },
          });
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'assignments'),
    );

    const unsubFocus = onSnapshot(
      query(collection(db, 'focus_sessions'), where(roleField, '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as FocusSession);
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setFocusSessions(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'focus_sessions'),
    );

    const unsubMessages = onSnapshot(
      query(collection(db, 'messages'), where(roleField, '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Message);
        list.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        setMessages(list);

        if (!messagesReady) {
          list.forEach((m) => knownMessageIds.add(m.id));
          messagesReady = true;
          return;
        }

        snap.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const m = change.doc.data() as Message;
          if (knownMessageIds.has(m.id)) return;
          knownMessageIds.add(m.id);

          if (m.senderUid === uid) return;

          const roleLabel =
            m.senderRole === 'assistant'
              ? 'Trợ lý'
              : m.senderRole === 'parent'
                ? 'Phụ huynh'
                : 'Học sinh';

          if (publicUser.role === 'student') {
            setUnreadStudentMsgCount((c) => c + 1);
            pushToast({
              category: 'message',
              title: `${roleLabel} ${m.senderName} vừa gửi phản hồi`,
              message: m.content,
              actionLabel: 'Đọc & trả lời',
              onAction: () => {
                setStudentOpenMessagesNonce((n) => n + 1);
              },
            });
          } else {
            pushToast({
              category: 'message',
              title: `Tin nhắn mới từ ${roleLabel} ${m.senderName}`,
              message: m.content,
            });
          }
        });
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'messages'),
    );

    const unsubSchedules = onSnapshot(
      query(collection(db, 'schedules'), where(roleField, '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Schedule);
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setSchedules(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'schedules'),
    );

    const unsubTickets = onSnapshot(
      query(collection(db, 'feedback_tickets'), where(roleField, '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as FeedbackTicket);
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setTickets(list);

        if (!ticketsReady) {
          list.forEach((t) => knownTicketStatus.set(t.id, t.status));
          ticketsReady = true;
          return;
        }

        snap.docChanges().forEach((change) => {
          const t = change.doc.data() as FeedbackTicket;
          const prev = knownTicketStatus.get(t.id);

          if (change.type === 'added' && !knownTicketStatus.has(t.id)) {
            if (publicUser.role === 'assistant' && t.createdBy !== uid) {
              pushToast({
                category: 'info',
                title: 'Yêu cầu hỗ trợ mới từ phụ huynh',
                message: t.subject,
              });
            }
          } else if (change.type === 'modified' && prev !== 'replied' && t.status === 'replied') {
            if (publicUser.role === 'parent') {
              pushToast({
                category: 'message',
                title: 'Trợ lý đã phản hồi yêu cầu hỗ trợ',
                message: t.reply || t.subject,
              });
            }
          }

          knownTicketStatus.set(t.id, t.status);
        });
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'feedback_tickets'),
    );

    return () => {
      unsubStudents();
      unsubAssignments();
      unsubFocus();
      unsubMessages();
      unsubSchedules();
      unsubTickets();
    };
  }, [firebaseUser, publicUser, pushToast]);

  // Keep member UIDs synced across linked student documents
  useEffect(() => {
    if (!students.length) return;
    students.forEach((student) => {
      syncStudentMembershipAcrossDocs({
        student,
        assignments,
        focusSessions,
        messages,
        schedules,
        tickets,
      });
    });
  }, [students, assignments, focusSessions, messages, schedules, tickets]);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Trình duyệt đang chặn cửa sổ bật lên. Vui lòng cho phép popup và thử lại.');
      } else {
        setAuthError(err instanceof Error ? err.message : 'Đăng nhập thất bại, vui lòng thử lại.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleParentCodeSignIn = async (params: {
    linkCode?: string;
    displayName?: string;
    studentName?: string;
    grade?: string;
  }) => {
    setAuthError(null);
    const cleanCode = (params.linkCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanCode && !(params.studentName || '').trim()) {
      throw new Error('Vui lòng nhập mã kết nối của con (ví dụ: NH842K19).');
    }
    if (cleanCode && (cleanCode.length < 6 || cleanCode.length > 12)) {
      throw new Error('Mã kết nối phải gồm 6–12 ký tự chữ hoa và số (ví dụ: NH842K19).');
    }

    pendingAnonymousSetupRef.current = true;
    try {
      const cred = await signInAnonymously(auth);
      const uid = cred.user.uid;

      if (cleanCode) {
        try {
          await verifyStudentLinkCode(cleanCode);
        } catch (err) {
          pendingAnonymousSetupRef.current = false;
          try {
            await deleteUser(cred.user);
          } catch {
            await signOut(auth);
          }
          throw err;
        }
      }

      const { linkedStudentId } = await registerUserAndWorkspace({
        uid,
        email: '',
        displayName: (params.displayName || '').trim() || 'Phụ huynh',
        phone: '',
        role: 'parent',
        studentName: (params.studentName || '').trim() || 'Học sinh NhịpHọc',
        grade: (params.grade || '').trim() || 'Lớp 8',
        linkCodeInput: cleanCode,
      });
      const { publicUser: fresh } = await fetchUserProfiles(uid);
      pendingAnonymousSetupRef.current = false;
      setPublicUser(fresh);
      setSelectedStudentId(linkedStudentId);
      setProfileLoading(false);
      setAuthReady(true);
    } catch (err) {
      pendingAnonymousSetupRef.current = false;
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
        throw new Error(
          'Cần bật "Anonymous" trong Firebase Console (Authentication → Sign-in method → Anonymous → Enable) để Phụ huynh đăng nhập trực tiếp chỉ bằng mã kết nối.',
        );
      }
      throw new Error(err instanceof Error ? err.message : 'Không thể đăng nhập bằng mã kết nối.');
    }
  };

  const handleSignOut = async () => {
    if (firebaseUser?.isAnonymous) {
      await cleanupAnonymousParentSession(firebaseUser.uid, students);
    }
    await signOut(auth);
  };

  const handleDeleteAccount = async () => {
    if (!firebaseUser) return;
    await deleteAccountAndData({
      uid: firebaseUser.uid,
      students,
      assignments,
      focusSessions,
      messages,
      schedules,
      tickets,
    });
  };

  const handleCompleteRegistration = async (data: {
    displayName: string;
    phone: string;
    role: UserRole;
    studentName?: string;
    grade?: string;
    linkCodeInput?: string;
  }) => {
    if (!firebaseUser) return;
    const { linkedStudentId } = await registerUserAndWorkspace({
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: data.displayName,
      phone: data.phone.trim() || firebaseUser.phoneNumber || '',
      role: data.role,
      studentName: data.studentName,
      grade: data.grade,
      linkCodeInput: data.linkCodeInput,
    });
    const { publicUser: fresh } = await fetchUserProfiles(firebaseUser.uid);
    setPublicUser(fresh);
    setSelectedStudentId(linkedStudentId);
  };

  const renderView = () => {
    if (!authReady || profileLoading) {
      return (
        <div className="min-h-screen bg-[#FBF8F1] flex flex-col items-center justify-center gap-4 p-6">
          <MascotAvatar size="lg" mood="happy" />
          <p className="text-sm font-semibold text-[#C45A15]">Đang khởi động NhịpHọc...</p>
        </div>
      );
    }

    if (!firebaseUser || !publicUser) {
      return (
        <AuthOnboarding
          firebaseUser={firebaseUser}
          authLoading={authLoading}
          authError={authError}
          preferredRole={preferredRole}
          onChangePreferredRole={setPreferredRole}
          onClearAuthError={() => setAuthError(null)}
          onGoogleSignIn={handleGoogleSignIn}
          onParentCodeSignIn={handleParentCodeSignIn}
          onSignOut={handleSignOut}
          onCompleteRegistration={handleCompleteRegistration}
        />
      );
    }

    if (dataLoading && students.length === 0) {
      return (
        <div className="min-h-screen bg-[#FBF8F1] flex flex-col items-center justify-center gap-4 p-6">
          <MascotAvatar size="lg" mood="study" />
          <p className="text-sm font-semibold text-[#C45A15]">
            Đang tải không gian {publicUser.role === 'parent' ? 'Phụ huynh' : publicUser.role === 'assistant' ? 'Trợ lý' : 'Học sinh'}...
          </p>
        </div>
      );
    }

    if (publicUser.role === 'student') {
      const myStudent = students[0];
      if (!myStudent) {
        return (
          <div className="min-h-screen bg-[#FBF8F1] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white border border-[#E5DBC4] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <MascotAvatar size="md" mood="happy" />
                <div>
                  <h1 className="text-lg font-bold text-[#231E18]">Kết nối hồ sơ học sinh</h1>
                  <p className="text-xs text-[#6B6154]">Xin chào {publicUser.displayName}</p>
                </div>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setRecoveryError(null);
                  setRecoveryLoading(true);
                  try {
                    if (recoveryCode.trim()) {
                      await linkStudentByCode(recoveryCode, publicUser.uid, 'student');
                    } else {
                      await createSelfStudentWorkspace({
                        uid: publicUser.uid,
                        studentName: publicUser.displayName,
                        grade: 'Lớp 8',
                      });
                    }
                  } catch (err) {
                    setRecoveryError(err instanceof Error ? err.message : 'Không thể kết nối');
                  } finally {
                    setRecoveryLoading(false);
                  }
                }}
                className="space-y-3"
              >
                <label className="block text-xs font-semibold text-[#231E18]">
                  Nhập mã kết nối (NH...) nếu phụ huynh/trợ lý đã tạo sẵn cho bạn
                </label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  placeholder="NH842K19"
                  className="w-full rounded-xl border border-[#E5DBC4] px-3.5 py-2.5 text-sm font-mono uppercase text-[#231E18] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
                />
                {recoveryError && <p className="text-xs text-red-700">{recoveryError}</p>}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-xs font-semibold text-[#6B6154] hover:underline"
                  >
                    Đăng xuất
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="px-4 py-2 rounded-xl bg-[#C45A15] text-white text-xs font-semibold hover:bg-[#AA4C0F]"
                  >
                    {recoveryLoading ? 'Đang kết nối...' : 'Kết nối hồ sơ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      }

      return (
        <StudentDashboard
          user={publicUser}
          student={myStudent}
          assignments={assignments}
          focusSessions={focusSessions}
          messages={messages}
          unreadMessagesCount={unreadStudentMsgCount}
          requestedTab={studentRequestedTab}
          openMessagesNonce={studentOpenMessagesNonce}
          onMarkMessagesRead={handleMarkMessagesRead}
          onSignOut={handleSignOut}
          onDeleteAccount={handleDeleteAccount}
        />
      );
    }

    if (publicUser.role === 'parent') {
      return (
        <ParentDashboard
          user={publicUser}
          students={students}
          selectedStudentId={selectedStudentId}
          onSelectStudent={setSelectedStudentId}
          assignments={assignments}
          focusSessions={focusSessions}
          messages={messages}
          schedules={schedules}
          tickets={tickets}
          onSignOut={handleSignOut}
          onDeleteAccount={handleDeleteAccount}
        />
      );
    }

    return (
      <AssistantDashboard
        user={publicUser}
        students={students}
        assignments={assignments}
        messages={messages}
        schedules={schedules}
        tickets={tickets}
        onSignOut={handleSignOut}
        onDeleteAccount={handleDeleteAccount}
      />
    );
  };

  return (
    <>
      {renderView()}
      <ToastViewport
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <NhiphocApp />
    </AppErrorBoundary>
  );
}
