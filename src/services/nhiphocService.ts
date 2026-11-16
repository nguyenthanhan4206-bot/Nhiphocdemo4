import { deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError } from '../firebase';
import {
  Assignment,
  AssignmentType,
  FeedbackTicket,
  FocusSession,
  Message,
  OperationType,
  PublicUser,
  Schedule,
  ScheduleStatus,
  StudentProfile,
  TicketCategory,
  UserRole,
} from '../types';
import { generateDocId, generateLinkCode } from '../utils/imageCompress';

export async function fetchUserProfiles(uid: string): Promise<{
  publicUser: PublicUser | null;
  phone: string;
}> {
  const pubPath = `users_public/${uid}`;
  const privPath = `users_private/${uid}`;
  let publicUser: PublicUser | null = null;
  let phone = '';

  try {
    const pubSnap = await getDoc(doc(db, 'users_public', uid));
    if (pubSnap.exists()) {
      publicUser = pubSnap.data() as PublicUser;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, pubPath);
  }

  try {
    const privSnap = await getDoc(doc(db, 'users_private', uid));
    if (privSnap.exists()) {
      phone = String(privSnap.data().phone || '');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, privPath);
  }

  return { publicUser, phone };
}

export async function registerUserAndWorkspace(params: {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  role: UserRole;
  studentName?: string;
  grade?: string;
  linkCodeInput?: string;
}): Promise<{ linkedStudentId: string }> {
  const cleanName = params.displayName.trim().slice(0, 80) || 'Thành viên NhịpHọc';
  const cleanPhone = params.phone.trim().slice(0, 30);
  const cleanEmail = params.email.trim().slice(0, 150);
  const cleanLinkCode = (params.linkCodeInput || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cleanLinkCode) {
    if (cleanLinkCode.length < 6 || cleanLinkCode.length > 12) {
      throw new Error('Mã kết nối phải gồm 6–12 ký tự chữ hoa và số (ví dụ: NH842K19).');
    }
    try {
      const inviteSnap = await getDoc(doc(db, 'student_invites', cleanLinkCode));
      if (!inviteSnap.exists()) {
        throw new Error('Không tìm thấy mã kết nối học sinh này. Vui lòng kiểm tra lại.');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Không tìm thấy')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.GET, `student_invites/${cleanLinkCode}`);
    }
  }

  // Create Public & Private user records
  const batch = writeBatch(db);
  batch.set(doc(db, 'users_public', params.uid), {
    uid: params.uid,
    displayName: cleanName,
    role: params.role,
    isOnline: params.role === 'assistant',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users_private', params.uid), {
    uid: params.uid,
    email: cleanEmail,
    phone: cleanPhone,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (cleanLinkCode) {
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users_public/${params.uid}`);
    }
    const linkedStudentId = await linkStudentByCode(cleanLinkCode, params.uid, params.role);
    return { linkedStudentId };
  }

  // Create a brand new student workspace + invite code + starter assignments
  const studentId = generateDocId('stu');
  const linkCode = generateLinkCode();
  const sName =
    params.role === 'student'
      ? cleanName
      : (params.studentName || '').trim().slice(0, 80) || `Học sinh của ${cleanName}`;
  const sGrade = (params.grade || '').trim().slice(0, 40) || 'Lớp 8';

  const studentUid = params.role === 'student' ? params.uid : '';
  const parentUid = params.role === 'parent' ? params.uid : '';
  const assistantUid = params.role === 'assistant' ? params.uid : '';

  batch.set(doc(db, 'students', studentId), {
    id: studentId,
    studentName: sName,
    grade: sGrade,
    linkCode,
    studentUid,
    parentUid,
    assistantUid,
    assistantOnline: params.role === 'assistant',
    focusMinutesTotal: 45,
    treeLevel: 2,
    streakDays: 3,
    createdBy: params.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'student_invites', linkCode), {
    linkCode,
    studentId,
    studentName: sName,
    grade: sGrade,
    createdBy: params.uid,
    createdAt: serverTimestamp(),
  });

  const starterAssignments: Array<{
    type: AssignmentType;
    subject: string;
    title: string;
    description: string;
    dueLabel: string;
  }> = [
    {
      type: 'today',
      subject: 'Toán học',
      title: 'Giải 5 bài phương trình bậc nhất & vẽ đồ thị',
      description:
        'Làm ra vở sạch đẹp, khoanh đáp án cuối cùng và chụp ảnh toàn trang để trợ lý chấm điểm chi tiết.',
      dueLabel: 'Hôm nay · 20:00',
    },
    {
      type: 'today',
      subject: 'Tiếng Anh',
      title: 'Viết đoạn văn 100 từ về thói quen học tập mỗi ngày',
      description:
        'Sử dụng tối thiểu 3 từ nối (However, Moreover, Therefore). Viết tay vào vở rồi chụp ảnh nộp bài.',
      dueLabel: 'Hôm nay · 21:00',
    },
    {
      type: 'extra',
      subject: 'Ngữ văn',
      title: 'Lập dàn ý phân tích khổ thơ đầu bài Mùa xuân nho nhỏ',
      description:
        'Bài tập bổ sung giúp rèn kỹ năng cảm thụ và nhận thêm 15 phút điểm Cây tập trung.',
      dueLabel: 'Linh hoạt trong tuần',
    },
  ];

  for (const item of starterAssignments) {
    const aId = generateDocId('asg');
    batch.set(doc(db, 'assignments', aId), {
      id: aId,
      studentId,
      studentUid,
      parentUid,
      assistantUid,
      createdBy: params.uid,
      type: item.type,
      subject: item.subject,
      title: item.title,
      description: item.description,
      dueLabel: item.dueLabel,
      status: 'pending',
      photoDataUrl: '',
      studentNote: '',
      submittedAtMs: 0,
      feedbackScheduledAtMs: 0,
      instantFeedbackNote: '',
      assistantFeedback: '',
      scoreLabel: '',
      gradedBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `students/${studentId}`);
  }

  return { linkedStudentId: studentId };
}

export async function linkStudentByCode(
  rawCode: string,
  uid: string,
  role: UserRole,
): Promise<string> {
  const linkCode = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (linkCode.length < 6 || linkCode.length > 12) {
    throw new Error('Mã kết nối phải gồm 6–12 ký tự chữ hoa và số (ví dụ: NH842K19).');
  }

  const invitePath = `student_invites/${linkCode}`;
  let studentId = '';
  try {
    const inviteSnap = await getDoc(doc(db, 'student_invites', linkCode));
    if (!inviteSnap.exists()) {
      throw new Error('Không tìm thấy mã kết nối học sinh này. Vui lòng kiểm tra lại.');
    }
    studentId = String(inviteSnap.data().studentId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Không tìm thấy')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, invitePath);
  }

  const studentRef = doc(db, 'students', studentId);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (role === 'student') {
    payload.studentUid = uid;
  } else if (role === 'parent') {
    payload.parentUid = uid;
  } else {
    payload.assistantUid = uid;
    payload.assistantOnline = true;
  }

  try {
    await updateDoc(studentRef, payload);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('permission')) {
      throw new Error(
        'Hồ sơ học sinh này đã được liên kết với một tài khoản cùng vai trò trước đó.',
      );
    }
    handleFirestoreError(error, OperationType.UPDATE, `students/${studentId}`);
  }

  return studentId;
}

export async function createNewStudentByAdult(params: {
  uid: string;
  role: 'parent' | 'assistant';
  studentName: string;
  grade: string;
}): Promise<string> {
  const studentId = generateDocId('stu');
  const linkCode = generateLinkCode();
  const sName = params.studentName.trim().slice(0, 80);
  const sGrade = params.grade.trim().slice(0, 40) || 'Lớp 8';
  if (!sName) {
    throw new Error('Vui lòng nhập tên học sinh.');
  }

  const studentUid = '';
  const parentUid = params.role === 'parent' ? params.uid : '';
  const assistantUid = params.role === 'assistant' ? params.uid : '';

  const batch = writeBatch(db);
  batch.set(doc(db, 'students', studentId), {
    id: studentId,
    studentName: sName,
    grade: sGrade,
    linkCode,
    studentUid,
    parentUid,
    assistantUid,
    assistantOnline: params.role === 'assistant',
    focusMinutesTotal: 0,
    treeLevel: 1,
    streakDays: 1,
    createdBy: params.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'student_invites', linkCode), {
    linkCode,
    studentId,
    studentName: sName,
    grade: sGrade,
    createdBy: params.uid,
    createdAt: serverTimestamp(),
  });

  const aId = generateDocId('asg');
  batch.set(doc(db, 'assignments', aId), {
    id: aId,
    studentId,
    studentUid,
    parentUid,
    assistantUid,
    createdBy: params.uid,
    type: 'today',
    subject: 'Toán học',
    title: 'Ôn tập bài tập trọng tâm hôm nay',
    description: 'Hoàn thành bài tập trong vở và chụp ảnh rõ nét để gửi trợ lý nhận xét.',
    dueLabel: 'Hôm nay · 20:30',
    status: 'pending',
    photoDataUrl: '',
    studentNote: '',
    submittedAtMs: 0,
    feedbackScheduledAtMs: 0,
    instantFeedbackNote: '',
    assistantFeedback: '',
    scoreLabel: '',
    gradedBy: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `students/${studentId}`);
  }

  return studentId;
}

export async function createSelfStudentWorkspace(params: {
  uid: string;
  studentName: string;
  grade: string;
}): Promise<string> {
  const studentId = generateDocId('stu');
  const linkCode = generateLinkCode();
  const sName = params.studentName.trim().slice(0, 80) || 'Học sinh NhịpHọc';
  const sGrade = params.grade.trim().slice(0, 40) || 'Lớp 8';

  const batch = writeBatch(db);
  batch.set(doc(db, 'students', studentId), {
    id: studentId,
    studentName: sName,
    grade: sGrade,
    linkCode,
    studentUid: params.uid,
    parentUid: '',
    assistantUid: '',
    assistantOnline: false,
    focusMinutesTotal: 0,
    treeLevel: 1,
    streakDays: 1,
    createdBy: params.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'student_invites', linkCode), {
    linkCode,
    studentId,
    studentName: sName,
    grade: sGrade,
    createdBy: params.uid,
    createdAt: serverTimestamp(),
  });

  const aId = generateDocId('asg');
  batch.set(doc(db, 'assignments', aId), {
    id: aId,
    studentId,
    studentUid: params.uid,
    parentUid: '',
    assistantUid: '',
    createdBy: params.uid,
    type: 'today',
    subject: 'Toán học',
    title: 'Bài tập khởi động hôm nay',
    description: 'Hoàn thành bài tập trong vở và chụp ảnh nộp bài để bắt đầu nhịp học.',
    dueLabel: 'Hôm nay · 20:00',
    status: 'pending',
    photoDataUrl: '',
    studentNote: '',
    submittedAtMs: 0,
    feedbackScheduledAtMs: 0,
    instantFeedbackNote: '',
    assistantFeedback: '',
    scoreLabel: '',
    gradedBy: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `students/${studentId}`);
  }

  return studentId;
}

export async function createAssignment(params: {
  student: StudentProfile;
  createdBy: string;
  type: AssignmentType;
  subject: string;
  title: string;
  description: string;
  dueLabel: string;
}): Promise<void> {
  const id = generateDocId('asg');
  const path = `assignments/${id}`;
  try {
    await setDoc(doc(db, 'assignments', id), {
      id,
      studentId: params.student.id,
      studentUid: params.student.studentUid,
      parentUid: params.student.parentUid,
      assistantUid: params.student.assistantUid,
      createdBy: params.createdBy,
      type: params.type,
      subject: params.subject.trim().slice(0, 40) || 'Tổng hợp',
      title: params.title.trim().slice(0, 120),
      description: params.description.trim().slice(0, 800),
      dueLabel: params.dueLabel.trim().slice(0, 60) || 'Hôm nay',
      status: 'pending',
      photoDataUrl: '',
      studentNote: '',
      submittedAtMs: 0,
      feedbackScheduledAtMs: 0,
      instantFeedbackNote: '',
      assistantFeedback: '',
      scoreLabel: '',
      gradedBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function submitAssignmentPhoto(params: {
  assignmentId: string;
  photoDataUrl: string;
  studentNote: string;
  assistantOnline: boolean;
}): Promise<void> {
  const nowMs = Date.now();
  const feedbackScheduledAtMs = params.assistantOnline ? nowMs : nowMs + 60 * 60 * 1000;
  const instantFeedbackNote = params.assistantOnline
    ? 'Trợ lý đang trực tuyến — Đã tiếp nhận bài ảnh của bạn! Trợ lý đang xem từng bước giải và sẽ gửi điểm chấm ngay.'
    : 'Hệ thống đã ghi nhận bài nộp và tích hoàn thành tạm thời. Trợ lý sẽ gửi nhận xét chi tiết sau 1 giờ hoặc ngay khi trực tuyến.';

  if (params.photoDataUrl.length > 260000) {
    throw new Error('Dung lượng ảnh vượt quá giới hạn. Vui lòng chụp lại gần hơn.');
  }
  const path = `assignments/${params.assignmentId}`;
  try {
    await updateDoc(doc(db, 'assignments', params.assignmentId), {
      status: 'submitted',
      photoDataUrl: params.photoDataUrl,
      studentNote: params.studentNote.trim().slice(0, 500),
      submittedAtMs: nowMs,
      feedbackScheduledAtMs,
      instantFeedbackNote,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function gradeAssignment(params: {
  assignmentId: string;
  gradedBy: string;
  scoreLabel: string;
  assistantFeedback: string;
}): Promise<void> {
  const path = `assignments/${params.assignmentId}`;
  try {
    await updateDoc(doc(db, 'assignments', params.assignmentId), {
      status: 'graded',
      scoreLabel: params.scoreLabel.trim().slice(0, 40) || 'Hoàn thành tốt',
      assistantFeedback: params.assistantFeedback.trim().slice(0, 1000),
      gradedBy: params.gradedBy,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleAssistantOnlinePresence(params: {
  uid: string;
  isOnline: boolean;
  students: StudentProfile[];
}): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users_public', params.uid), {
    isOnline: params.isOnline,
    updatedAt: serverTimestamp(),
  });
  for (const stu of params.students) {
    if (stu.assistantUid === params.uid) {
      batch.update(doc(db, 'students', stu.id), {
        assistantOnline: params.isOnline,
        updatedAt: serverTimestamp(),
      });
    }
  }
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users_public/${params.uid}`);
  }
}

export function getTreeStageLabel(totalMinutes: number): { level: number; label: string } {
  if (totalMinutes >= 300) return { level: 5, label: 'Cổ thụ NhịpHọc' };
  if (totalMinutes >= 180) return { level: 4, label: 'Cây tán xanh' };
  if (totalMinutes >= 90) return { level: 3, label: 'Cây vươn cành' };
  if (totalMinutes >= 30) return { level: 2, label: 'Cây con vững chãi' };
  return { level: 1, label: 'Mầm xanh mới nhú' };
}

export async function logFocusSession(params: {
  student: StudentProfile;
  uid: string;
  durationMinutes: number;
  note: string;
}): Promise<void> {
  const mins = Math.max(1, Math.min(180, Math.round(params.durationMinutes)));
  const newTotal = params.student.focusMinutesTotal + mins;
  const stage = getTreeStageLabel(newTotal);
  const sessionId = generateDocId('foc');

  const batch = writeBatch(db);
  batch.set(doc(db, 'focus_sessions', sessionId), {
    id: sessionId,
    studentId: params.student.id,
    studentUid: params.student.studentUid,
    parentUid: params.student.parentUid,
    assistantUid: params.student.assistantUid,
    durationMinutes: mins,
    treeStage: stage.label,
    note: params.note.trim().slice(0, 200) || `Tập trung ${mins} phút`,
    createdBy: params.uid,
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'students', params.student.id), {
    focusMinutesTotal: newTotal,
    treeLevel: stage.level,
    streakDays: Math.max(1, params.student.streakDays),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `focus_sessions/${sessionId}`);
  }
}

export async function sendMessage(params: {
  student: StudentProfile;
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
}): Promise<void> {
  const id = generateDocId('msg');
  try {
    await setDoc(doc(db, 'messages', id), {
      id,
      studentId: params.student.id,
      studentUid: params.student.studentUid,
      parentUid: params.student.parentUid,
      assistantUid: params.student.assistantUid,
      senderUid: params.senderUid,
      senderName: params.senderName.trim().slice(0, 80),
      senderRole: params.senderRole,
      content: params.content.trim().slice(0, 1000),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `messages/${id}`);
  }
}

export async function createSchedule(params: {
  student: StudentProfile;
  createdBy: string;
  title: string;
  dateStr: string;
  timeStr: string;
  note: string;
}): Promise<void> {
  const id = generateDocId('sch');
  try {
    await setDoc(doc(db, 'schedules', id), {
      id,
      studentId: params.student.id,
      studentUid: params.student.studentUid,
      parentUid: params.student.parentUid,
      assistantUid: params.student.assistantUid,
      createdBy: params.createdBy,
      title: params.title.trim().slice(0, 120),
      dateStr: params.dateStr.trim().slice(0, 20),
      timeStr: params.timeStr.trim().slice(0, 20),
      note: params.note.trim().slice(0, 400),
      status: 'requested',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `schedules/${id}`);
  }
}

export async function updateScheduleStatus(
  scheduleId: string,
  status: ScheduleStatus,
): Promise<void> {
  try {
    await updateDoc(doc(db, 'schedules', scheduleId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `schedules/${scheduleId}`);
  }
}

export async function createFeedbackTicket(params: {
  student: StudentProfile;
  createdBy: string;
  category: TicketCategory;
  subject: string;
  message: string;
}): Promise<void> {
  const id = generateDocId('tkt');
  try {
    await setDoc(doc(db, 'feedback_tickets', id), {
      id,
      studentId: params.student.id,
      studentUid: params.student.studentUid,
      parentUid: params.student.parentUid,
      assistantUid: params.student.assistantUid,
      createdBy: params.createdBy,
      category: params.category,
      subject: params.subject.trim().slice(0, 120),
      message: params.message.trim().slice(0, 1000),
      reply: '',
      repliedBy: '',
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `feedback_tickets/${id}`);
  }
}

export async function replyFeedbackTicket(params: {
  ticketId: string;
  repliedBy: string;
  reply: string;
}): Promise<void> {
  try {
    await updateDoc(doc(db, 'feedback_tickets', params.ticketId), {
      reply: params.reply.trim().slice(0, 1000),
      repliedBy: params.repliedBy,
      status: 'replied',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `feedback_tickets/${params.ticketId}`);
  }
}

export async function syncStudentMembershipAcrossDocs(params: {
  student: StudentProfile;
  assignments: Assignment[];
  focusSessions: FocusSession[];
  messages: Message[];
  schedules: Schedule[];
  tickets: FeedbackTicket[];
}): Promise<void> {
  const { student } = params;
  const needsSync = (d: { studentUid: string; parentUid: string; assistantUid: string }) =>
    d.studentUid !== student.studentUid ||
    d.parentUid !== student.parentUid ||
    d.assistantUid !== student.assistantUid;

  const MAX_BATCH_OPS = 450;
  let batch = writeBatch(db);
  let count = 0;
  const batches: Array<ReturnType<typeof writeBatch>> = [];

  const enqueueUpdate = (
    ref: ReturnType<typeof doc>,
    payload: Record<string, unknown>,
  ) => {
    batch.update(ref, payload);
    count++;
    if (count >= MAX_BATCH_OPS) {
      batches.push(batch);
      batch = writeBatch(db);
      count = 0;
    }
  };

  for (const a of params.assignments) {
    if (a.studentId === student.id && needsSync(a)) {
      enqueueUpdate(doc(db, 'assignments', a.id), {
        studentUid: student.studentUid,
        parentUid: student.parentUid,
        assistantUid: student.assistantUid,
        updatedAt: serverTimestamp(),
      });
    }
  }
  for (const f of params.focusSessions) {
    if (f.studentId === student.id && needsSync(f)) {
      enqueueUpdate(doc(db, 'focus_sessions', f.id), {
        studentUid: student.studentUid,
        parentUid: student.parentUid,
        assistantUid: student.assistantUid,
      });
    }
  }
  for (const m of params.messages) {
    if (m.studentId === student.id && needsSync(m)) {
      enqueueUpdate(doc(db, 'messages', m.id), {
        studentUid: student.studentUid,
        parentUid: student.parentUid,
        assistantUid: student.assistantUid,
      });
    }
  }
  for (const s of params.schedules) {
    if (s.studentId === student.id && needsSync(s)) {
      enqueueUpdate(doc(db, 'schedules', s.id), {
        studentUid: student.studentUid,
        parentUid: student.parentUid,
        assistantUid: student.assistantUid,
        updatedAt: serverTimestamp(),
      });
    }
  }
  for (const t of params.tickets) {
    if (t.studentId === student.id && needsSync(t)) {
      enqueueUpdate(doc(db, 'feedback_tickets', t.id), {
        studentUid: student.studentUid,
        parentUid: student.parentUid,
        assistantUid: student.assistantUid,
        updatedAt: serverTimestamp(),
      });
    }
  }

  if (count > 0) batches.push(batch);
  if (batches.length === 0) return;

  try {
    for (const b of batches) {
      await b.commit();
    }
  } catch (error) {
    console.warn('Sync membership batch skipped or retrying:', error);
  }
}

export async function deleteAccountAndData(params: {
  uid: string;
  students: StudentProfile[];
  assignments: Assignment[];
  focusSessions: FocusSession[];
  messages: Message[];
  schedules: Schedule[];
  tickets: FeedbackTicket[];
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== params.uid) {
    throw new Error('Phiên đăng nhập không hợp lệ.');
  }

  // Ensure recent auth before destructive deletion if needed
  const runAuthDeletion = async () => {
    try {
      await deleteUser(currentUser);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/requires-recent-login') {
        await reauthenticateWithPopup(currentUser, googleProvider);
        await deleteUser(currentUser);
      } else {
        throw err;
      }
    }
  };

  // First clean up Firestore records while the user is still authenticated
  const batch = writeBatch(db);
  const soloStudentIds = new Set<string>();

  for (const stu of params.students) {
    const isSoloOwner =
      stu.createdBy === params.uid &&
      (!stu.studentUid || stu.studentUid === params.uid) &&
      (!stu.parentUid || stu.parentUid === params.uid) &&
      (!stu.assistantUid || stu.assistantUid === params.uid);

    if (isSoloOwner) {
      soloStudentIds.add(stu.id);
      batch.delete(doc(db, 'student_invites', stu.linkCode));
      batch.delete(doc(db, 'students', stu.id));
    } else {
      const unlinkPayload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      let hasChange = false;
      if (stu.studentUid === params.uid) {
        unlinkPayload.studentUid = '';
        hasChange = true;
      }
      if (stu.parentUid === params.uid) {
        unlinkPayload.parentUid = '';
        hasChange = true;
      }
      if (stu.assistantUid === params.uid) {
        unlinkPayload.assistantUid = '';
        unlinkPayload.assistantOnline = false;
        hasChange = true;
      }
      if (hasChange) {
        batch.update(doc(db, 'students', stu.id), unlinkPayload);
      }
    }
  }

  for (const a of params.assignments) {
    if (soloStudentIds.has(a.studentId) && a.createdBy === params.uid) {
      batch.delete(doc(db, 'assignments', a.id));
    }
  }
  for (const f of params.focusSessions) {
    if (soloStudentIds.has(f.studentId) && f.createdBy === params.uid) {
      batch.delete(doc(db, 'focus_sessions', f.id));
    }
  }
  for (const m of params.messages) {
    if (soloStudentIds.has(m.studentId) && m.senderUid === params.uid) {
      batch.delete(doc(db, 'messages', m.id));
    }
  }
  for (const s of params.schedules) {
    if (soloStudentIds.has(s.studentId) && s.createdBy === params.uid) {
      batch.delete(doc(db, 'schedules', s.id));
    }
  }
  for (const t of params.tickets) {
    if (soloStudentIds.has(t.studentId) && t.createdBy === params.uid) {
      batch.delete(doc(db, 'feedback_tickets', t.id));
    }
  }

  batch.delete(doc(db, 'users_public', params.uid));
  batch.delete(doc(db, 'users_private', params.uid));

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users_public/${params.uid}`);
  }

  await runAuthDeletion();
}
