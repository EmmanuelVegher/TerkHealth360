import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Stack,
  Avatar,
  Chip,
  Badge,
  Tooltip,
  InputAdornment,
  Divider,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  List,
  ListItem,
  ListItemAvatar
} from '@mui/material';
import {
  Send,
  Search,
  Refresh,
  Lock,
  DoneAll,
  Group,
  AttachFile,
  Close,
  Download,
  InsertDriveFile,
  PictureAsPdf,
  Image as ImageIcon,
  LocalHospital,
  Shield,
  PriorityHigh,
  ChatBubbleOutline,
  Visibility,
  Reply,
  Edit,
  DeleteOutline,
  Block,
  Check,
  WarningAmber,
  AccessTime,
  PhotoCamera,
  Add,
  GroupAdd,
  InfoOutlined,
  PersonAdd,
  PersonRemove,
  SupervisorAccount,
  MoreVert,
  AdminPanelSettings
} from '@mui/icons-material';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { compressImage } from '../utils/imageCompressor';

// ─── Design Tokens & Theme Formatting ────────────────────────────────────────
const WA_TEAL = '#0f766e';
const WA_TEAL_DARK = '#115e59';
const WA_BG = '#f0f2f5';
const WA_OUTGOING_BG = '#dcfce7'; // WhatsApp-like soft emerald
const WA_INCOMING_BG = '#ffffff';

interface AttachmentData {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

interface ReplyData {
  id: string;
  senderName: string;
  text: string;
  attachmentName?: string;
}

interface StaffUser {
  id: string;
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  employeeId: string;
  designation: string;
  department: string;
  role: string;
  isActive: boolean;
  profilePicture: string | null;
  lastSeen?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export interface GroupMember {
  id: string;
  fullName: string;
  designation: string;
  department: string;
  role: string;
  profilePicture?: string | null;
}

export interface CustomGroup {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  creatorName: string;
  adminIds: string[];
  memberIds: string[];
  members: GroupMember[];
  createdAt: string;
  updatedAt?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface ChatMessage {
  id: string;
  groupId?: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderAvatar?: string;
  recipientId?: string;
  recipientName?: string;
  text: string;
  attachment?: AttachmentData | null;
  replyTo?: ReplyData | null;
  timestamp: string;
  isSystem?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  priority?: 'ROUTINE' | 'URGENT';
  read?: boolean;
}

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN');
  const isAdmin = isSuperAdmin || user?.role === 'ADMIN' || user?.roles?.includes('ADMIN') || (user?.designation || '').toLowerCase().includes('admin');

  // ── State ──────────────────────────────────────────────────────────────────
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomGroup[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | 'GROUPS' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Active selection: 'GENERAL_GROUP' | CustomGroup | StaffUser
  const [activeChat, setActiveChat] = useState<'GENERAL_GROUP' | CustomGroup | StaffUser>('GENERAL_GROUP');

  // Messages
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([]);
  const [customGroupMessages, setCustomGroupMessages] = useState<ChatMessage[]>([]);
  const [directMessages, setDirectMessages] = useState<ChatMessage[]>([]);
  const [summaryMessages, setSummaryMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<AttachmentData | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(user?.profilePicture || null);

  // Group creation modal state
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Group info & manage members modal state
  const [groupInfoModalOpen, setGroupInfoModalOpen] = useState(false);
  const [addMembersModalOpen, setAddMembersModalOpen] = useState(false);
  const [selectedAddMemberIds, setSelectedAddMemberIds] = useState<string[]>([]);
  const [addMemberSearchQuery, setAddMemberSearchQuery] = useState('');
  const [addingMembers, setAddingMembers] = useState(false);
  const [memberActionMenuAnchor, setMemberActionMenuAnchor] = useState<{ el: HTMLElement; member: GroupMember } | null>(null);
  const [removeMemberConfirm, setRemoveMemberConfirm] = useState<GroupMember | null>(null);
  const [deleteGroupConfirmOpen, setDeleteGroupConfirmOpen] = useState<CustomGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);

  // Context Menu for message actions (Reply, Edit, Delete)
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; msg: ChatMessage } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<ChatMessage | null>(null);

  // Media viewer modal
  const [previewMedia, setPreviewMedia] = useState<AttachmentData | null>(null);

  // ── Auto-scroll to bottom of message list ─────────────────────────────────
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // ── Fetch Direct Messages Summary for Unread Counts ───────────────────────
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/notifications/direct-messages/summary');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setSummaryMessages(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch direct messages summary:', e);
    }
  }, []);

  // ── Fetch Custom Groups ───────────────────────────────────────────────────
  const fetchCustomGroups = useCallback(async () => {
    try {
      const res = await api.get('/notifications/custom-groups');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setCustomGroups(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch custom groups:', e);
    }
  }, []);

  // ── Fetch Staff Directory ──────────────────────────────────────────────────
  const fetchStaffDirectory = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await api.get('/notifications/staff-directory');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const allStaff: StaffUser[] = res.data.data
          .filter((s: any) => s.id !== user?.id)
          .map((s: any) => ({
            ...s,
            unreadCount: 0
          }));
        setStaffList(allStaff);
      } else {
        const uRes = await api.get('/users?limit=100');
        if (uRes.data?.data && Array.isArray(uRes.data.data)) {
          const mapped: StaffUser[] = uRes.data.data
            .filter((u: any) => u.id !== user?.id && u.role !== 'PATIENT')
            .map((u: any) => ({
              id: u.id,
              userId: u.id,
              username: u.username,
              email: u.email,
              firstName: u.firstName || '',
              lastName: u.lastName || '',
              fullName: (u.firstName || u.lastName) ? `${u.firstName} ${u.lastName}`.trim() : u.username,
              employeeId: u.employeeId || `EMP-${u.id.slice(0, 4).toUpperCase()}`,
              designation: u.roles?.[0]?.name || u.role || 'Staff',
              department: u.departments?.[0]?.name || 'Hospital Staff',
              role: u.role,
              isActive: u.isActive !== false,
              profilePicture: u.profilePicture || null,
              lastSeen: u.isActive !== false ? 'Online' : 'Inactive',
              unreadCount: 0
            }));
          setStaffList(mapped);
        }
      }
      fetchSummary();
      fetchCustomGroups();
    } catch (e) {
      console.error('Failed to load staff directory for chat:', e);
      enqueueSnackbar('Could not refresh staff directory', { variant: 'warning' });
    } finally {
      setLoadingStaff(false);
    }
  }, [user?.id, enqueueSnackbar, fetchSummary, fetchCustomGroups]);

  // ── Fetch Conversation Messages ───────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (activeChat === 'GENERAL_GROUP') {
      try {
        const res = await api.get('/notifications/general-group/messages');
        if (res.data?.success) {
          setGroupMessages(res.data.data);
        }
      } catch (e) {
        console.error('Failed to fetch general group messages:', e);
      }
    } else if (typeof activeChat === 'object' && 'memberIds' in activeChat) {
      // Custom Group
      try {
        const res = await api.get(`/notifications/custom-groups/${activeChat.id}/messages`);
        if (res.data?.success) {
          setCustomGroupMessages(res.data.data);
        }
      } catch (e) {
        console.error('Failed to fetch custom group messages:', e);
      }
    } else if (typeof activeChat === 'object' && 'userId' in activeChat) {
      // 1-on-1 Direct Message
      try {
        const targetId = activeChat.id;
        const res = await api.get(`/notifications/direct-messages/${targetId}`);
        if (res.data?.success) {
          setDirectMessages(res.data.data);
          api.post(`/notifications/direct-messages/read/${targetId}`).catch(() => {});
          fetchSummary();
        }
      } catch (e) {
        console.error('Failed to fetch direct messages:', e);
      }
    }
  }, [activeChat, fetchSummary]);

  // ── Auto-Select Chat when opened from Global Urgent Alert ─────────────────
  const checkUrgentTarget = useCallback(() => {
    try {
      const raw = sessionStorage.getItem('urgent_chat_target');
      if (raw) {
        sessionStorage.removeItem('urgent_chat_target');
        const parsed = JSON.parse(raw);
        if (parsed.isGroup) {
          setActiveChat('GENERAL_GROUP');
        } else if (parsed.targetUserId) {
          const target = staffList.find(s => s.id === parsed.targetUserId || s.userId === parsed.targetUserId);
          if (target) {
            setActiveChat(target);
          }
        }
      }
    } catch (_) {}
  }, [staffList]);

  // Initial Load & polling
  useEffect(() => {
    fetchStaffDirectory();
  }, [fetchStaffDirectory]);

  useEffect(() => {
    checkUrgentTarget();
    window.addEventListener('urgent-chat-navigate', checkUrgentTarget);
    return () => {
      window.removeEventListener('urgent-chat-navigate', checkUrgentTarget);
    };
  }, [checkUrgentTarget]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => {
      fetchMessages();
      fetchSummary();
      fetchCustomGroups();
    }, 4500);
    return () => clearInterval(interval);
  }, [fetchMessages, fetchSummary, fetchCustomGroups]);

  useEffect(() => {
    scrollToBottom(false);
  }, [activeChat, groupMessages, customGroupMessages, directMessages]);

  // ── Handle User Profile Picture Upload with Automatic Compression ─────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      enqueueSnackbar('Please select a valid image file (PNG, JPG, WebP, GIF, HEIC)', { variant: 'warning' });
      return;
    }

    try {
      enqueueSnackbar('Optimizing & compressing profile photo...', { variant: 'info' });
      const compressed = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.85,
        outputType: 'image/jpeg'
      });

      setCurrentUserAvatar(compressed.dataUrl);

      const res = await api.post('/notifications/profile-picture', {
        profilePicture: compressed.dataUrl
      });
      if (res.data?.success) {
        enqueueSnackbar(`Profile photo updated! (${formatFileSize(compressed.size)})`, { variant: 'success' });
        if (user) {
          user.profilePicture = compressed.dataUrl;
        }
      }
    } catch (err: any) {
      console.error('Failed to compress/upload avatar:', err);
      enqueueSnackbar('Failed to optimize and update profile photo', { variant: 'error' });
    } finally {
      e.target.value = '';
    }
  };

  // ── Handle Creating a New Custom Group (Admin / Super Admin) ──────────────
  const handleCreateGroupSubmit = async () => {
    if (!newGroupName.trim()) {
      enqueueSnackbar('Group name is required', { variant: 'warning' });
      return;
    }

    setCreatingGroup(true);
    try {
      const selectedMembers: GroupMember[] = staffList
        .filter(s => selectedMemberIds.includes(s.id))
        .map(s => ({
          id: s.id,
          fullName: s.fullName,
          designation: s.designation,
          department: s.department,
          role: s.role,
          profilePicture: s.profilePicture
        }));

      const payload = {
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        members: selectedMembers
      };

      const res = await api.post('/notifications/custom-groups', payload);
      if (res.data?.success) {
        const created: CustomGroup = res.data.data;
        enqueueSnackbar(`Group "${created.name}" created successfully!`, { variant: 'success' });
        setCustomGroups(prev => [created, ...prev]);
        setActiveChat(created);
        setCreateGroupModalOpen(false);
        setNewGroupName('');
        setNewGroupDescription('');
        setSelectedMemberIds([]);
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create group', { variant: 'error' });
    } finally {
      setCreatingGroup(false);
    }
  };

  // ── Handle Adding Members to Group ─────────────────────────────────────────
  const handleAddMembersSubmit = async () => {
    if (activeChat === 'GENERAL_GROUP' || !('memberIds' in activeChat) || selectedAddMemberIds.length === 0) return;
    setAddingMembers(true);
    try {
      const membersToAdd: GroupMember[] = staffList
        .filter(s => selectedAddMemberIds.includes(s.id))
        .map(s => ({
          id: s.id,
          fullName: s.fullName,
          designation: s.designation,
          department: s.department,
          role: s.role,
          profilePicture: s.profilePicture
        }));

      const res = await api.post(`/notifications/custom-groups/${activeChat.id}/add-members`, {
        members: membersToAdd
      });

      if (res.data?.success) {
        const updated: CustomGroup = res.data.data;
        enqueueSnackbar(`Added ${membersToAdd.length} staff member(s) to group!`, { variant: 'success' });
        setActiveChat(updated);
        setCustomGroups(prev => prev.map(g => (g.id === updated.id ? updated : g)));
        setAddMembersModalOpen(false);
        setSelectedAddMemberIds([]);
        setAddMemberSearchQuery('');
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to add members', { variant: 'error' });
    } finally {
      setAddingMembers(false);
    }
  };

  // ── Handle Promoting / Demoting Group Admin ────────────────────────────────
  const handleToggleGroupAdmin = async (targetUserId: string) => {
    if (activeChat === 'GENERAL_GROUP' || !('memberIds' in activeChat)) return;
    try {
      const res = await api.post(`/notifications/custom-groups/${activeChat.id}/toggle-admin`, {
        targetUserId
      });
      if (res.data?.success) {
        const updated: CustomGroup = res.data.data;
        setActiveChat(updated);
        setCustomGroups(prev => prev.map(g => (g.id === updated.id ? updated : g)));
        enqueueSnackbar(res.data.isNowAdmin ? 'Promoted to Group Admin!' : 'Group Admin privileges revoked', { variant: 'success' });
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update admin role', { variant: 'error' });
    } finally {
      setMemberActionMenuAnchor(null);
    }
  };

  // ── Handle Removing a Member from Group ────────────────────────────────────
  const handleRemoveMember = async (targetUserId: string) => {
    if (activeChat === 'GENERAL_GROUP' || !('memberIds' in activeChat)) return;
    try {
      const res = await api.post(`/notifications/custom-groups/${activeChat.id}/remove-member`, {
        targetUserId
      });
      if (res.data?.success) {
        const updated: CustomGroup = res.data.data;
        setActiveChat(updated);
        setCustomGroups(prev => prev.map(g => (g.id === updated.id ? updated : g)));
        enqueueSnackbar('Member removed from group', { variant: 'info' });
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to remove member', { variant: 'error' });
    } finally {
      setRemoveMemberConfirm(null);
      setMemberActionMenuAnchor(null);
    }
  };

  // ── Handle Deleting a Custom Group (Admin / Super Admin / Group Admin) ────
  const handleDeleteGroupSubmit = async () => {
    if (!deleteGroupConfirmOpen) return;
    const targetGroup = deleteGroupConfirmOpen;
    setDeletingGroup(true);
    try {
      const res = await api.delete(`/notifications/custom-groups/${targetGroup.id}`);
      if (res.data?.success) {
        enqueueSnackbar(`Group "${targetGroup.name}" deleted successfully!`, { variant: 'success' });
        setCustomGroups(prev => prev.filter(g => g.id !== targetGroup.id));
        if (typeof activeChat === 'object' && 'memberIds' in activeChat && activeChat.id === targetGroup.id) {
          setActiveChat('GENERAL_GROUP');
        }
        setGroupInfoModalOpen(false);
        setDeleteGroupConfirmOpen(null);
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete group', { variant: 'error' });
    } finally {
      setDeletingGroup(false);
    }
  };

  // ── Handle File Selection for Messages with Automatic Image Compression ───
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type.startsWith('image/')) {
        enqueueSnackbar('Optimizing image for fast delivery...', { variant: 'info' });
        const compressed = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
          outputType: 'image/jpeg'
        });

        setSelectedAttachment({
          name: compressed.name,
          type: compressed.type,
          size: compressed.size,
          dataUrl: compressed.dataUrl
        });
        enqueueSnackbar(`Attached ${compressed.name} (${formatFileSize(compressed.size)})`, { variant: 'success' });
      } else {
        if (file.size > 25 * 1024 * 1024) {
          enqueueSnackbar('Document size exceeds 25MB limit', { variant: 'warning' });
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          setSelectedAttachment({
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl: reader.result as string
          });
          enqueueSnackbar(`Attached ${file.name} (${formatFileSize(file.size)})`, { variant: 'info' });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Failed to process attachment:', err);
      enqueueSnackbar('Could not attach file', { variant: 'error' });
    } finally {
      e.target.value = '';
    }
  };

  // ── Start Editing Message ─────────────────────────────────────────────────
  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessage(msg);
    setInputText(msg.text);
    setReplyingTo(null);
    setMenuAnchor(null);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
  };

  // ── Start Replying to Message ─────────────────────────────────────────────
  const handleStartReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    setEditingMessage(null);
    setMenuAnchor(null);
  };

  // ── Handle Delete Message ─────────────────────────────────────────────────
  const handleDeleteMessage = async (msg: ChatMessage) => {
    try {
      const res = await api.delete(`/notifications/messages/${msg.id}`);
      if (res.data?.success) {
        enqueueSnackbar('Message deleted', { variant: 'info' });
        const updateDeleted = (list: ChatMessage[]) =>
          list.map(m => (m.id === msg.id ? { ...m, isDeleted: true, text: 'This message was deleted', attachment: null } : m));

        setGroupMessages(updateDeleted);
        setCustomGroupMessages(updateDeleted);
        setDirectMessages(updateDeleted);
        setSummaryMessages(updateDeleted);
      }
    } catch (e) {
      enqueueSnackbar('Failed to delete message', { variant: 'error' });
    } finally {
      setDeleteConfirmOpen(null);
      setMenuAnchor(null);
    }
  };

  // ── Handle Sending or Saving Message ──────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedAttachment) || sending) return;

    // Check if direct chat recipient is inactive
    if (activeChat !== 'GENERAL_GROUP' && 'isActive' in activeChat && !activeChat.isActive) {
      enqueueSnackbar('Cannot send message: This staff account is inactive.', { variant: 'error' });
      return;
    }

    setSending(true);
    const textToSend = inputText.trim();
    const attachmentToSend = selectedAttachment;
    const currentIsUrgent = isUrgent;
    const replyPayload: ReplyData | null = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text,
          attachmentName: replyingTo.attachment?.name
        }
      : null;

    // IF EDITING EXISTING MESSAGE
    if (editingMessage) {
      try {
        const res = await api.patch(`/notifications/messages/${editingMessage.id}/edit`, {
          text: textToSend
        });
        if (res.data?.success) {
          enqueueSnackbar('Message edited', { variant: 'success' });
          const updateEdited = (list: ChatMessage[]) =>
            list.map(m => (m.id === editingMessage.id ? { ...m, text: textToSend, isEdited: true } : m));

          setGroupMessages(updateEdited);
          setCustomGroupMessages(updateEdited);
          setDirectMessages(updateEdited);
          setSummaryMessages(updateEdited);
          setEditingMessage(null);
          setInputText('');
        }
      } catch (err: any) {
        enqueueSnackbar(err.response?.data?.message || 'Failed to edit message', { variant: 'error' });
      } finally {
        setSending(false);
      }
      return;
    }

    // IF SENDING NEW MESSAGE
    setInputText('');
    setSelectedAttachment(null);
    setReplyingTo(null);

    try {
      if (activeChat === 'GENERAL_GROUP') {
        const payload = {
          text: textToSend,
          attachment: attachmentToSend,
          replyTo: replyPayload,
          senderName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Staff Member',
          senderRole: user?.designation || user?.role || 'Staff',
          priority: currentIsUrgent ? 'URGENT' : 'ROUTINE'
        };
        const res = await api.post('/notifications/general-group/messages', payload);
        if (res.data?.success) {
          setGroupMessages(prev => [...prev, res.data.data]);
          setIsUrgent(false);
          setTimeout(() => scrollToBottom(true), 100);
        }
      } else if (typeof activeChat === 'object' && 'memberIds' in activeChat) {
        // Custom Group Message
        const payload = {
          text: textToSend,
          attachment: attachmentToSend,
          replyTo: replyPayload,
          senderName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Staff Member',
          senderRole: user?.designation || user?.role || 'Staff',
          priority: currentIsUrgent ? 'URGENT' : 'ROUTINE'
        };
        const res = await api.post(`/notifications/custom-groups/${activeChat.id}/messages`, payload);
        if (res.data?.success) {
          setCustomGroupMessages(prev => [...prev, res.data.data]);
          setIsUrgent(false);
          fetchCustomGroups();
          setTimeout(() => scrollToBottom(true), 100);
        }
      } else if (typeof activeChat === 'object' && 'userId' in activeChat) {
        // 1-on-1 Direct Message
        const payload = {
          text: textToSend,
          attachment: attachmentToSend,
          replyTo: replyPayload,
          senderName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Staff Member',
          recipientName: activeChat.fullName,
          priority: currentIsUrgent ? 'URGENT' : 'ROUTINE'
        };
        const res = await api.post(`/notifications/direct-messages/${activeChat.id}`, payload);
        if (res.data?.success) {
          setDirectMessages(prev => [...prev, res.data.data]);
          setIsUrgent(false);
          fetchSummary();
          setTimeout(() => scrollToBottom(true), 100);
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to deliver message';
      enqueueSnackbar(msg, { variant: 'error' });
      if (err.response?.data?.isInactive && activeChat !== 'GENERAL_GROUP' && 'isActive' in activeChat) {
        setActiveChat(prev => (typeof prev === 'object' && 'isActive' in prev ? { ...prev, isActive: false } : prev));
      }
    } finally {
      setSending(false);
    }
  };

  // ── Compute Staff Metadata (Unread Counts, Last Messages) & Sort ──────────
  const decoratedStaff = staffList.map(staff => {
    const incomingFromStaff = summaryMessages.filter(
      m => m.senderId === staff.id && m.recipientId === user?.id
    );
    const unreadCount = incomingFromStaff.filter(m => !m.read).length;

    const allWithStaff = summaryMessages.filter(
      m => (m.senderId === staff.id && m.recipientId === user?.id) ||
           (m.senderId === user?.id && m.recipientId === staff.id)
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const latestMsg = allWithStaff[0];

    return {
      ...staff,
      unreadCount,
      lastMessage: latestMsg
        ? latestMsg.isDeleted
          ? '🚫 This message was deleted'
          : (latestMsg.priority === 'URGENT' ? '🚨 [URGENT] ' : '') + (latestMsg.text || (latestMsg.attachment ? `📎 ${latestMsg.attachment.name}` : ''))
        : undefined,
      lastMessageTime: latestMsg ? latestMsg.timestamp : undefined
    };
  });

  // ── SORTING: Pushes unread messages & latest interactions to the TOP ─────
  const sortedStaff = [...decoratedStaff].sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
    if (a.unreadCount > 0 && b.unreadCount > 0) {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    }

    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    if (timeA !== timeB) {
      return timeB - timeA;
    }

    return a.fullName.localeCompare(b.fullName);
  });

  // ── Filter Staff by Search & Filter Type ──────────────────────────────────
  const filteredStaff = sortedStaff.filter(s => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employeeId.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === 'UNREAD') return matchesSearch && s.unreadCount > 0;
    if (filterType === 'ACTIVE') return matchesSearch && s.isActive;
    if (filterType === 'INACTIVE') return matchesSearch && !s.isActive;
    if (filterType === 'GROUPS') return false; // Hide staff when filter is GROUPS
    return matchesSearch;
  });

  const filteredCustomGroups = customGroups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnreadCount = sortedStaff.reduce((sum, s) => sum + s.unreadCount, 0);

  // ── Exact Time & Date Format Helpers ──────────────────────────────────────
  const formatMessageTime = (ts?: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  const formatSidebarTime = (ts?: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const formatFullDateTime = (ts?: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleString([], { dateStyle: 'full', timeStyle: 'medium' });
    } catch {
      return '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isDirectChat = typeof activeChat === 'object' && 'userId' in activeChat;
  const isCustomGroupChat = typeof activeChat === 'object' && 'memberIds' in activeChat;
  const isCurrentGroupAdmin = isCustomGroupChat && (
    (activeChat.adminIds && activeChat.adminIds.includes(user?.id || '')) ||
    activeChat.createdBy === user?.id ||
    isSuperAdmin ||
    isAdmin
  );
  const isTargetInactive = isDirectChat && !activeChat.isActive;
  const currentMessages =
    activeChat === 'GENERAL_GROUP'
      ? groupMessages
      : isCustomGroupChat
      ? customGroupMessages
      : directMessages;

  return (
    <Box
      sx={{
        height: 'calc(100vh - 84px)',
        bgcolor: '#e2e8f0',
        p: { xs: 1, sm: 2 },
        display: 'flex',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
      }}
    >
      {/* Hidden File Input for Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dcm,.txt,.csv"
      />

      {/* Hidden File Input for User Profile Picture Upload */}
      <input
        type="file"
        ref={avatarInputRef}
        style={{ display: 'none' }}
        onChange={handleAvatarUpload}
        accept="image/*"
      />

      <Paper
        elevation={4}
        sx={{
          flex: 1,
          display: 'flex',
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: '#ffffff',
          boxShadow: '0 12px 36px rgba(15, 23, 42, 0.08)'
        }}
      >
        {/* ════════════════════════════════════════════════════════════════════
            LEFT SIDEBAR: WHATSAPP-STYLE CHAT DIRECTORY & GROUP LIST
        ════════════════════════════════════════════════════════════════════ */}
        <Box
          sx={{
            width: { xs: '100%', sm: 360, md: 410 },
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#ffffff',
            flexShrink: 0
          }}
        >
          {/* Top User Status & Profile Upload Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Tooltip title="Click to upload/change your profile picture (Auto-compressed to HD)">
                <Box sx={{ position: 'relative', cursor: 'pointer' }} onClick={() => avatarInputRef.current?.click()}>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    sx={{ '& .MuiBadge-badge': { bgcolor: '#22c55e', color: '#22c55e', boxShadow: '0 0 0 2px #fff' } }}
                  >
                    <Avatar
                      src={currentUserAvatar || user?.profilePicture || undefined}
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: WA_TEAL,
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        transition: 'opacity 0.2s',
                        '&:hover': { opacity: 0.85 }
                      }}
                    >
                      {user?.firstName?.[0] || user?.username?.[0] || 'U'}
                    </Avatar>
                  </Badge>
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      bgcolor: '#0f172a',
                      color: '#ffffff',
                      borderRadius: '50%',
                      p: 0.3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                  >
                    <PhotoCamera sx={{ fontSize: 12 }} />
                  </Box>
                </Box>
              </Tooltip>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 850, color: '#0f172a', lineHeight: 1.2 }}>
                  {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Staff Member'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                  {user?.designation || user?.role || 'Clinical Staff'} · <span style={{ color: '#16a34a' }}>● Online</span>
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={0.5} alignItems="center">
              {/* Admin Create Group Action */}
              {isAdmin && (
                <Tooltip title="Create a new hospital group (Admin/Super Admin)">
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      setNewGroupName('');
                      setNewGroupDescription('');
                      setSelectedMemberIds([]);
                      setCreateGroupModalOpen(true);
                    }}
                    sx={{
                      bgcolor: WA_TEAL,
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 1.2,
                      py: 0.4,
                      boxShadow: 'none',
                      '&:hover': { bgcolor: WA_TEAL_DARK }
                    }}
                  >
                    New Group
                  </Button>
                </Tooltip>
              )}

              <Tooltip title="Refresh Directory">
                <IconButton size="small" onClick={fetchStaffDirectory} disabled={loadingStaff} sx={{ color: '#64748b' }}>
                  {loadingStaff ? <CircularProgress size={18} /> : <Refresh fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Search Box */}
          <Box sx={{ p: 1.5, pb: 1, bgcolor: '#ffffff' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search staff, groups, departments..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2.5, bgcolor: '#f1f5f9', fontSize: '0.85rem', '& fieldset': { border: 'none' } }
              }}
            />
          </Box>

          {/* Filter Chips */}
          <Box sx={{ px: 1.5, pb: 1.2, display: 'flex', gap: 0.6, overflowX: 'auto' }}>
            <Chip
              label="All"
              size="small"
              onClick={() => setFilterType('ALL')}
              sx={{
                bgcolor: filterType === 'ALL' ? WA_TEAL : '#f1f5f9',
                color: filterType === 'ALL' ? '#ffffff' : '#475569',
                fontWeight: 750,
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            />
            <Chip
              label={`Unread (${totalUnreadCount})`}
              size="small"
              onClick={() => setFilterType('UNREAD')}
              sx={{
                bgcolor: filterType === 'UNREAD' ? '#16a34a' : totalUnreadCount > 0 ? '#dcfce7' : '#f1f5f9',
                color: filterType === 'UNREAD' ? '#ffffff' : totalUnreadCount > 0 ? '#15803d' : '#475569',
                fontWeight: 750,
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            />
            <Chip
              label={`Groups (${customGroups.length + 1})`}
              size="small"
              onClick={() => setFilterType('GROUPS')}
              sx={{
                bgcolor: filterType === 'GROUPS' ? WA_TEAL : '#f1f5f9',
                color: filterType === 'GROUPS' ? '#ffffff' : '#475569',
                fontWeight: 750,
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            />
            <Chip
              label="Active Staff"
              size="small"
              onClick={() => setFilterType('ACTIVE')}
              sx={{
                bgcolor: filterType === 'ACTIVE' ? '#0284c7' : '#f1f5f9',
                color: filterType === 'ACTIVE' ? '#ffffff' : '#475569',
                fontWeight: 750,
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            />
          </Box>

          {/* ── Scrollable Chat Target List ── */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 1, pb: 2 }}>
            {/* ── SECTION 1: HOSPITAL GROUPS ── */}
            {(filterType === 'ALL' || filterType === 'GROUPS') && (
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    display: 'block',
                    fontWeight: 850,
                    color: '#64748b',
                    fontSize: '0.68rem',
                    letterSpacing: '0.05em'
                  }}
                >
                  HOSPITAL CHAT GROUPS ({customGroups.length + 1})
                </Typography>

                {/* 1. General Hospital Staff Group (Broadcaster) */}
                <Box
                  onClick={() => setActiveChat('GENERAL_GROUP')}
                  sx={{
                    p: 1.4,
                    mb: 0.6,
                    borderRadius: 2,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.4,
                    bgcolor: activeChat === 'GENERAL_GROUP' ? '#ccfbf1' : 'transparent',
                    border: activeChat === 'GENERAL_GROUP' ? `1.5px solid ${WA_TEAL}` : '1px solid transparent',
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': { bgcolor: activeChat === 'GENERAL_GROUP' ? '#ccfbf1' : '#f8fafc' }
                  }}
                >
                  <Avatar sx={{ bgcolor: WA_TEAL, width: 44, height: 44 }}>
                    <Group sx={{ color: '#ffffff' }} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 850, color: '#0f172a', fontSize: '0.88rem' }}>
                        General Staff Group
                      </Typography>
                      <Chip label="All Staff" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#dcfce7', color: '#166534' }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {groupMessages[groupMessages.length - 1]?.text || 'Faith Foundation Hospital General Broadcast & Updates'}
                    </Typography>
                  </Box>
                </Box>

                {/* 2. Custom Hospital Groups */}
                {filteredCustomGroups.map(grp => {
                  const isGrpSelected = isCustomGroupChat && activeChat.id === grp.id;
                  return (
                    <Box
                      key={grp.id}
                      onClick={() => setActiveChat(grp)}
                      sx={{
                        p: 1.4,
                        mb: 0.6,
                        borderRadius: 2,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.4,
                        bgcolor: isGrpSelected ? '#e0f2fe' : 'transparent',
                        border: isGrpSelected ? '1.5px solid #0284c7' : '1px solid transparent',
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': { bgcolor: isGrpSelected ? '#e0f2fe' : '#f8fafc' }
                      }}
                    >
                      <Avatar sx={{ bgcolor: '#0284c7', width: 44, height: 44, fontWeight: 800 }}>
                        {grp.name[0]?.toUpperCase() || 'G'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 850, color: '#0f172a', fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {grp.name}
                          </Typography>
                          <Chip label={`${grp.members?.length || grp.memberIds?.length || 0} Members`} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {grp.lastMessage || grp.description || `Created by ${grp.creatorName}`}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* ── SECTION 2: DIRECT PRIVATE MESSAGES ── */}
            {filterType !== 'GROUPS' && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    display: 'block',
                    fontWeight: 850,
                    color: '#64748b',
                    fontSize: '0.68rem',
                    letterSpacing: '0.05em'
                  }}
                >
                  STAFF MEMBERS DIRECT CHAT ({filteredStaff.length})
                </Typography>

                {filteredStaff.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center', color: '#94a3b8' }}>
                    <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>
                      No staff members match filter.
                    </Typography>
                  </Box>
                ) : (
                  filteredStaff.map(staff => {
                    const isSelected = isDirectChat && activeChat.id === staff.id;
                    const hasUnread = staff.unreadCount > 0;

                    return (
                      <Box
                        key={staff.id}
                        onClick={() => {
                          setActiveChat(staff);
                          staff.unreadCount = 0;
                        }}
                        sx={{
                          p: 1.4,
                          mb: 0.6,
                          borderRadius: 2,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.4,
                          bgcolor: isSelected ? '#e0f2fe' : hasUnread ? '#f0fdf4' : 'transparent',
                          border: isSelected ? '1.5px solid #0284c7' : hasUnread ? '1.5px solid #86efac' : '1px solid transparent',
                          opacity: staff.isActive ? 1 : 0.65,
                          transition: 'all 0.15s ease-in-out',
                          '&:hover': { bgcolor: isSelected ? '#e0f2fe' : '#f8fafc' }
                        }}
                      >
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          variant="dot"
                          sx={{
                            '& .MuiBadge-badge': {
                              bgcolor: staff.isActive ? '#22c55e' : '#94a3b8',
                              color: staff.isActive ? '#22c55e' : '#94a3b8',
                              boxShadow: '0 0 0 2px #fff'
                            }
                          }}
                        >
                          <Avatar
                            src={staff.profilePicture || undefined}
                            sx={{
                              width: 44,
                              height: 44,
                              bgcolor: staff.isActive ? (hasUnread ? '#15803d' : '#0284c7') : '#94a3b8',
                              fontWeight: 800,
                              fontSize: '0.9rem'
                            }}
                          >
                            {staff.firstName?.[0] || staff.username?.[0] || 'S'}
                          </Avatar>
                        </Badge>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.2 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: hasUnread ? 900 : 750,
                                color: hasUnread ? '#166534' : staff.isActive ? '#0f172a' : '#64748b',
                                fontSize: '0.86rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {staff.fullName}
                            </Typography>

                            <Stack direction="row" spacing={0.6} alignItems="center">
                              {staff.lastMessageTime && (
                                <Typography variant="caption" sx={{ fontSize: '0.68rem', color: hasUnread ? '#16a34a' : '#64748b', fontWeight: hasUnread ? 850 : 600 }}>
                                  {formatSidebarTime(staff.lastMessageTime)}
                                </Typography>
                              )}

                              {/* Unread count badge */}
                              {hasUnread && (
                                <Chip
                                  label={staff.unreadCount}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    minWidth: 18,
                                    px: 0.5,
                                    fontSize: '0.65rem',
                                    fontWeight: 900,
                                    bgcolor: '#16a34a',
                                    color: '#ffffff',
                                    boxShadow: '0 2px 6px rgba(220, 163, 74, 0.4)'
                                  }}
                                />
                              )}

                              {!staff.isActive && (
                                <Chip
                                  icon={<Lock sx={{ fontSize: '0.7rem !important' }} />}
                                  label="Inactive"
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }}
                                />
                              )}
                            </Stack>
                          </Box>

                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              color: hasUnread ? '#0f172a' : '#64748b',
                              fontWeight: hasUnread ? 750 : 500,
                              fontSize: '0.72rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {staff.lastMessage || `${staff.designation} · ${staff.department}`}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* ════════════════════════════════════════════════════════════════════
            RIGHT MAIN WINDOW: CHAT THREAD & WHATSAPP MESSAGE STREAM
        ════════════════════════════════════════════════════════════════════ */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: WA_BG,
            overflow: 'hidden'
          }}
        >
          {/* Main Chat Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              zIndex: 2
            }}
          >
            {activeChat === 'GENERAL_GROUP' ? (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: WA_TEAL, width: 44, height: 44 }}>
                  <Group sx={{ color: '#ffffff' }} />
                </Avatar>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 850, color: '#0f172a' }}>
                      Faith Foundation Hospital General Staff Group
                    </Typography>
                    <Chip label="All Staff (Broadcaster)" size="small" color="success" sx={{ height: 20, fontWeight: 800, fontSize: '0.65rem' }} />
                  </Stack>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    {staffList.length + 1} Hospital Members · Real-time Clinical & Administrative Hub
                  </Typography>
                </Box>
              </Stack>
            ) : isCustomGroupChat ? (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: '#0284c7', width: 44, height: 44, fontWeight: 800 }}>
                  {activeChat.name[0]?.toUpperCase() || 'G'}
                </Avatar>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 850, color: '#0f172a' }}>
                      {activeChat.name}
                    </Typography>
                    <Chip
                      label={`${activeChat.members?.length || activeChat.memberIds?.length || 0} Members`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ height: 20, fontWeight: 800, fontSize: '0.65rem', cursor: 'pointer' }}
                      onClick={() => {
                        setGroupInfoModalOpen(true);
                      }}
                    />
                  </Stack>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    {activeChat.description || `Created by ${activeChat.creatorName}`}
                  </Typography>
                </Box>
              </Stack>
            ) : (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                  sx={{
                    '& .MuiBadge-badge': {
                      bgcolor: activeChat.isActive ? '#22c55e' : '#dc2626',
                      color: activeChat.isActive ? '#22c55e' : '#dc2626',
                      boxShadow: '0 0 0 2px #fff'
                    }
                  }}
                >
                  <Avatar
                    src={activeChat.profilePicture || undefined}
                    sx={{
                      bgcolor: activeChat.isActive ? '#0284c7' : '#94a3b8',
                      width: 44,
                      height: 44,
                      fontWeight: 800
                    }}
                  >
                    {activeChat.firstName?.[0] || activeChat.username?.[0] || 'S'}
                  </Avatar>
                </Badge>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 850, color: '#0f172a' }}>
                      {activeChat.fullName}
                    </Typography>
                    {activeChat.isActive ? (
                      <Chip label="Active Staff" size="small" color="success" variant="outlined" sx={{ height: 19, fontWeight: 800, fontSize: '0.65rem' }} />
                    ) : (
                      <Chip label="Account Inactive" size="small" color="error" sx={{ height: 19, fontWeight: 800, fontSize: '0.65rem' }} />
                    )}
                  </Stack>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    {activeChat.designation} · {activeChat.department} ({activeChat.employeeId})
                  </Typography>
                </Box>
              </Stack>
            )}

            {/* Header Right Actions */}
            <Stack direction="row" spacing={1} alignItems="center">
              {isCustomGroupChat && (
                <Tooltip title="View & manage group members">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setGroupInfoModalOpen(true);
                    }}
                    sx={{ color: '#0284c7' }}
                  >
                    <InfoOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              {isCustomGroupChat && (isAdmin || isSuperAdmin || isCurrentGroupAdmin) && (
                <Tooltip title="Delete this group (Admin / Group Admin)">
                  <IconButton
                    size="small"
                    onClick={() => setDeleteGroupConfirmOpen(activeChat as CustomGroup)}
                    sx={{ color: '#dc2626', '&:hover': { bgcolor: '#fee2e2' } }}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="Refresh conversation">
                <IconButton size="small" onClick={fetchMessages} sx={{ color: '#64748b' }}>
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* ── Scrollable Chat Messages Body ── */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: { xs: 2, md: 3 },
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              backgroundImage: 'radial-gradient(#cbd5e1 0.75px, transparent 0.75px)',
              backgroundSize: '16px 16px'
            }}
          >
            {/* System Security Notice */}
            <Box sx={{ mx: 'auto', my: 1, maxWidth: 520, textAlign: 'center' }}>
              <Chip
                icon={<Shield sx={{ fontSize: '0.85rem !important', color: `${WA_TEAL} !important` }} />}
                label="End-to-End TLS + AES-256-GCM Encrypted at Rest within Hospital Enterprise"
                size="small"
                sx={{
                  bgcolor: '#ffffffea',
                  color: '#475569',
                  fontWeight: 650,
                  fontSize: '0.68rem',
                  py: 0.5,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  borderRadius: 2
                }}
              />
            </Box>

            {currentMessages.length === 0 ? (
              <Box sx={{ my: 'auto', textAlign: 'center', color: '#64748b' }}>
                <ChatBubbleOutline sx={{ fontSize: 56, opacity: 0.35, mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={750} color="#334155">
                  {activeChat === 'GENERAL_GROUP'
                    ? 'No messages yet in General Group'
                    : isCustomGroupChat
                    ? `No messages yet in ${activeChat.name}`
                    : `No private messages with ${activeChat.fullName}`}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#64748b', mt: 0.5 }}>
                  {activeChat === 'GENERAL_GROUP' || isCustomGroupChat
                    ? 'Start the discussion by posting an update or media file for group members.'
                    : 'Send a private clinical message or media attachment below.'}
                </Typography>
              </Box>
            ) : (
              currentMessages.map((msg, index) => {
                const isMe = msg.senderId === user?.id || msg.senderName === user?.username || msg.senderName === 'You';
                const isGroupThread = activeChat === 'GENERAL_GROUP' || isCustomGroupChat;
                const showSenderName = isGroupThread && !isMe;
                const hasAttachment = Boolean(msg.attachment);
                const isImg = msg.attachment?.type?.startsWith('image/');
                const isPdf = msg.attachment?.type === 'application/pdf' || msg.attachment?.name?.endsWith('.pdf');
                const isDeleted = Boolean(msg.isDeleted);
                const isUrgentMsg = msg.priority === 'URGENT';

                return (
                  <Box
                    key={msg.id || index}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                      width: '100%',
                      position: 'relative',
                      '&:hover .msg-actions-btn': { opacity: 1 }
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: { xs: '88%', sm: '74%', md: '62%' },
                        p: 1.5,
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        bgcolor: isDeleted
                          ? '#f1f5f9'
                          : isUrgentMsg
                          ? '#fef2f2'
                          : isMe
                          ? WA_OUTGOING_BG
                          : WA_INCOMING_BG,
                        boxShadow: isUrgentMsg
                          ? '0 4px 14px rgba(220, 38, 38, 0.14)'
                          : '0 2px 8px rgba(15, 23, 42, 0.05)',
                        border: isDeleted
                          ? '1px dashed #cbd5e1'
                          : isUrgentMsg
                          ? '1.5px solid #f87171'
                          : isMe
                          ? '1px solid #bbf7d0'
                          : '1px solid #e2e8f0',
                        borderLeft: isUrgentMsg ? '5px solid #dc2626 !important' : undefined,
                        position: 'relative',
                        transition: 'all 0.15s ease-in-out'
                      }}
                    >
                      {/* Action Menu Trigger (Hover) */}
                      {!isDeleted && (
                        <IconButton
                          className="msg-actions-btn"
                          size="small"
                          onClick={e => setMenuAnchor({ el: e.currentTarget, msg })}
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            bgcolor: 'rgba(255,255,255,0.85)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            p: 0.3,
                            '&:hover': { bgcolor: '#ffffff' }
                          }}
                        >
                          <Reply fontSize="small" sx={{ fontSize: '0.9rem', color: '#64748b' }} />
                        </IconButton>
                      )}

                      {/* 🚨 PROMINENT URGENT BADGE ON MESSAGE */}
                      {isUrgentMsg && !isDeleted && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.6,
                            bgcolor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1.5px solid #ef4444',
                            px: 1.2,
                            py: 0.35,
                            borderRadius: 1.5,
                            mb: 1,
                            boxShadow: '0 2px 6px rgba(220,38,38,0.16)'
                          }}
                        >
                          <WarningAmber sx={{ fontSize: 16, color: '#dc2626' }} />
                          <Typography variant="caption" sx={{ fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                            URGENT CLINICAL MESSAGE
                          </Typography>
                        </Box>
                      )}

                      {/* Sender Name in Group Chat */}
                      {showSenderName && !isDeleted && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 850,
                            color: isUrgentMsg ? '#b91c1c' : WA_TEAL,
                            display: 'block',
                            mb: 0.4,
                            fontSize: '0.74rem'
                          }}
                        >
                          {msg.senderName} {msg.senderRole ? `(${msg.senderRole})` : ''}
                        </Typography>
                      )}

                      {/* Quoted Reply Block */}
                      {msg.replyTo && !isDeleted && (
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1,
                            mb: 1,
                            bgcolor: isMe ? '#bbf7d060' : '#f1f5f9',
                            borderLeft: `4px solid ${WA_TEAL}`,
                            borderRadius: '4px 8px 8px 4px',
                            borderColor: '#cbd5e1'
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 850, color: WA_TEAL, display: 'block' }}>
                            {msg.replyTo.senderName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.72rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {msg.replyTo.text || (msg.replyTo.attachmentName ? `📎 ${msg.replyTo.attachmentName}` : '')}
                          </Typography>
                        </Paper>
                      )}

                      {/* Attachment Display */}
                      {hasAttachment && msg.attachment && !isDeleted && (
                        <Box sx={{ mb: 1, borderRadius: 2, overflow: 'hidden' }}>
                          {isImg ? (
                            <Box
                              sx={{
                                position: 'relative',
                                cursor: 'pointer',
                                borderRadius: 2,
                                overflow: 'hidden',
                                '&:hover .img-overlay': { opacity: 1 }
                              }}
                              onClick={() => setPreviewMedia(msg.attachment!)}
                            >
                              <Box
                                component="img"
                                src={msg.attachment.dataUrl}
                                alt={msg.attachment.name}
                                sx={{
                                  width: '100%',
                                  maxHeight: 280,
                                  objectFit: 'cover',
                                  display: 'block',
                                  borderRadius: 2
                                }}
                              />
                              <Box
                                className="img-overlay"
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  bgcolor: 'rgba(0,0,0,0.3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  opacity: 0,
                                  transition: 'opacity 0.2s',
                                  color: '#fff'
                                }}
                              >
                                <Visibility sx={{ mr: 0.5 }} /> Click to expand
                              </Box>
                            </Box>
                          ) : (
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1.2,
                                bgcolor: isMe ? '#bbf7d040' : '#f8fafc',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.2,
                                borderRadius: 2
                              }}
                            >
                              <Avatar sx={{ bgcolor: isPdf ? '#fee2e2' : '#e0f2fe', color: isPdf ? '#dc2626' : '#0284c7', width: 38, height: 38 }}>
                                {isPdf ? <PictureAsPdf /> : <InsertDriveFile />}
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {msg.attachment.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatFileSize(msg.attachment.size)}
                                </Typography>
                              </Box>
                              <IconButton
                                size="small"
                                component="a"
                                href={msg.attachment.dataUrl}
                                download={msg.attachment.name}
                                sx={{ bgcolor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                              >
                                <Download fontSize="small" />
                              </IconButton>
                            </Paper>
                          )}
                        </Box>
                      )}

                      {/* Message Content */}
                      {isDeleted ? (
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#94a3b8',
                            fontStyle: 'italic',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.6,
                            fontSize: '0.84rem'
                          }}
                        >
                          <Block sx={{ fontSize: 16, color: '#94a3b8' }} /> This message was deleted
                        </Typography>
                      ) : (
                        msg.text && (
                          <Typography
                            variant="body2"
                            sx={{
                              color: isUrgentMsg ? '#7f1d1d' : '#0f172a',
                              fontWeight: isUrgentMsg ? 600 : 400,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontSize: '0.88rem',
                              lineHeight: 1.5
                            }}
                          >
                            {msg.text}
                          </Typography>
                        )
                      )}

                      {/* ⏰ Sent Time & Status */}
                      <Stack
                        direction="row"
                        spacing={0.6}
                        alignItems="center"
                        justifyContent="flex-end"
                        sx={{ mt: 0.6, pt: 0.2 }}
                      >
                        {msg.isEdited && !isDeleted && (
                          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#64748b', fontStyle: 'italic', fontWeight: 700 }}>
                            edited
                          </Typography>
                        )}

                        <Tooltip title={formatFullDateTime(msg.timestamp)}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.7rem',
                              color: isUrgentMsg ? '#991b1b' : '#64748b',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.3
                            }}
                          >
                            <AccessTime sx={{ fontSize: 11, opacity: 0.7 }} />
                            {formatMessageTime(msg.timestamp)}
                          </Typography>
                        </Tooltip>

                        {isMe && !isDeleted && <DoneAll sx={{ fontSize: 15, color: '#0284c7' }} />}
                      </Stack>
                    </Box>
                  </Box>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* ════════════════════════════════════════════════════════════════════
              BOTTOM INPUT AREA / INACTIVE STAFF LOCK BAR
          ════════════════════════════════════════════════════════════════════ */}
          {isTargetInactive ? (
            /* ── LOCKED CHAT BOX FOR INACTIVE STAFF ── */
            <Box
              sx={{
                p: 2.5,
                bgcolor: '#fef2f2',
                borderTop: '2px solid #f87171',
                textAlign: 'center',
                boxShadow: '0 -4px 16px rgba(220, 38, 38, 0.06)'
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626'
                  }}
                >
                  <Lock sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 850, color: '#991b1b' }}>
                    Messaging Locked: Staff Account is Inactive
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#b91c1c', display: 'block', fontWeight: 500 }}>
                    {activeChat.fullName}'s account has been deactivated in the hospital registry and cannot receive messages.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          ) : (
            /* ── ACTIVE CHAT INPUT BAR ── */
            <Box sx={{ bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
              {/* Urgent Priority Active Banner */}
              {isUrgent && (
                <Box sx={{ p: 1, px: 2, bgcolor: '#fef2f2', borderBottom: '1.5px solid #f87171', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <WarningAmber sx={{ color: '#dc2626', fontSize: 18 }} />
                    <Typography variant="caption" sx={{ fontWeight: 900, color: '#b91c1c', letterSpacing: '0.04em' }}>
                      🚨 URGENT PRIORITY ACTIVE: Loud siren & popup alert will be triggered to all recipients
                    </Typography>
                  </Stack>
                  <IconButton size="small" onClick={() => setIsUrgent(false)}>
                    <Close fontSize="small" sx={{ color: '#dc2626' }} />
                  </IconButton>
                </Box>
              )}

              {/* Replying Banner */}
              {replyingTo && (
                <Box sx={{ p: 1.2, px: 2, bgcolor: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ borderLeft: `3px solid ${WA_TEAL}`, pl: 1.2, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 850, color: WA_TEAL, display: 'block' }}>
                      Replying to {replyingTo.senderName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {replyingTo.text || (replyingTo.attachment ? `📎 ${replyingTo.attachment.name}` : '')}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setReplyingTo(null)}>
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              )}

              {/* Editing Banner */}
              {editingMessage && (
                <Box sx={{ p: 1.2, px: 2, bgcolor: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Edit sx={{ color: '#2563eb', fontSize: 18 }} />
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e40af' }}>
                      Editing message
                    </Typography>
                  </Stack>
                  <Button size="small" onClick={handleCancelEdit} sx={{ textTransform: 'none', color: '#64748b' }}>
                    Cancel
                  </Button>
                </Box>
              )}

              {/* Attachment Preview Bar */}
              {selectedAttachment && (
                <Box sx={{ p: 1.5, pb: 0, bgcolor: '#f8fafc', borderBottom: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip
                    icon={selectedAttachment.type.startsWith('image/') ? <ImageIcon /> : <InsertDriveFile />}
                    label={`${selectedAttachment.name} (${formatFileSize(selectedAttachment.size)})`}
                    onDelete={() => setSelectedAttachment(null)}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                  {selectedAttachment.type.startsWith('image/') && (
                    <Box
                      component="img"
                      src={selectedAttachment.dataUrl}
                      alt="preview"
                      sx={{ width: 34, height: 34, borderRadius: 1, objectFit: 'cover' }}
                    />
                  )}
                </Box>
              )}

              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.2
                }}
              >
                {/* Attachment Button */}
                <Tooltip title="Attach media, scan, image or PDF file (Photos auto-compressed to HD)">
                  <IconButton
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      color: selectedAttachment ? WA_TEAL : '#64748b',
                      bgcolor: selectedAttachment ? '#ccfbf1' : 'transparent',
                      '&:hover': { bgcolor: '#f1f5f9' }
                    }}
                  >
                    <AttachFile sx={{ transform: 'rotate(45deg)' }} />
                  </IconButton>
                </Tooltip>

                {/* 🚨 URGENT PRIORITY TOGGLE BUTTON */}
                <Tooltip title={isUrgent ? 'Urgent Mode Active (Click to disable)' : 'Mark as Urgent clinical priority'}>
                  <IconButton
                    size="small"
                    onClick={() => setIsUrgent(prev => !prev)}
                    sx={{
                      bgcolor: isUrgent ? '#fee2e2' : 'transparent',
                      color: isUrgent ? '#dc2626' : '#64748b',
                      border: isUrgent ? '1.5px solid #ef4444' : '1px solid transparent',
                      boxShadow: isUrgent ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none',
                      '&:hover': { bgcolor: isUrgent ? '#fee2e2' : '#f1f5f9' }
                    }}
                  >
                    <PriorityHigh sx={{ fontWeight: 900 }} />
                  </IconButton>
                </Tooltip>

                <TextField
                  fullWidth
                  size="small"
                  placeholder={
                    editingMessage
                      ? 'Edit your message...'
                      : selectedAttachment
                      ? `Add a caption for ${selectedAttachment.name}...`
                      : isUrgent
                      ? '🚨 Type an URGENT message...'
                      : activeChat === 'GENERAL_GROUP'
                      ? 'Type a message to All Hospital Staff...'
                      : isCustomGroupChat
                      ? `Type a message to ${activeChat.name}...`
                      : `Type a message to ${activeChat.fullName}...`
                  }
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  multiline
                  maxRows={3}
                  InputProps={{
                    sx: {
                      borderRadius: 3,
                      bgcolor: isUrgent ? '#fff1f2' : '#f1f5f9',
                      fontSize: '0.9rem',
                      border: isUrgent ? '1px solid #fca5a5' : 'none',
                      '& fieldset': { border: 'none' }
                    }
                  }}
                />

                <IconButton
                  type="submit"
                  disabled={(!inputText.trim() && !selectedAttachment) || sending}
                  sx={{
                    bgcolor: (inputText.trim() || selectedAttachment) ? (editingMessage ? '#2563eb' : isUrgent ? '#dc2626' : WA_TEAL) : '#e2e8f0',
                    color: '#ffffff',
                    width: 44,
                    height: 44,
                    '&:hover': {
                      bgcolor: editingMessage ? '#1d4ed8' : isUrgent ? '#b91c1c' : WA_TEAL_DARK
                    },
                    '&.Mui-disabled': {
                      bgcolor: '#f1f5f9',
                      color: '#cbd5e1'
                    }
                  }}
                >
                  {sending ? <CircularProgress size={20} color="inherit" /> : <Send fontSize="small" />}
                </IconButton>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL 1: CREATE NEW HOSPITAL GROUP (ADMIN / SUPER ADMIN)
      ════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={createGroupModalOpen}
        onClose={() => setCreateGroupModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: WA_TEAL }}>
              <GroupAdd />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={850}>
                Create Hospital Group
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Set up a dedicated coordination channel for clinical or unit staff
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setCreateGroupModalOpen(false)}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2.5}>
            <TextField
              label="Group Name *"
              placeholder="e.g. Trauma Emergency Team, Maternity Night Shift"
              fullWidth
              size="small"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
            />

            <TextField
              label="Group Description"
              placeholder="Describe the purpose of this group..."
              fullWidth
              size="small"
              multiline
              rows={2}
              value={newGroupDescription}
              onChange={e => setNewGroupDescription(e.target.value)}
            />

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                  Select Staff Members ({selectedMemberIds.length} selected)
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    if (selectedMemberIds.length === staffList.length) {
                      setSelectedMemberIds([]);
                    } else {
                      setSelectedMemberIds(staffList.map(s => s.id));
                    }
                  }}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  {selectedMemberIds.length === staffList.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>

              <TextField
                placeholder="Search staff to add..."
                fullWidth
                size="small"
                value={memberSearchQuery}
                onChange={e => setMemberSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 1 }}
              />

              <Paper
                variant="outlined"
                sx={{
                  maxHeight: 240,
                  overflowY: 'auto',
                  borderRadius: 2,
                  bgcolor: '#f8fafc'
                }}
              >
                <List dense disablePadding>
                  {staffList
                    .filter(s =>
                      s.fullName.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                      s.designation.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                      s.department.toLowerCase().includes(memberSearchQuery.toLowerCase())
                    )
                    .map(staff => {
                      const isChecked = selectedMemberIds.includes(staff.id);
                      return (
                        <ListItem
                          key={staff.id}
                          button
                          onClick={() => {
                            setSelectedMemberIds(prev =>
                              isChecked ? prev.filter(id => id !== staff.id) : [...prev, staff.id]
                            );
                          }}
                          sx={{ borderBottom: '1px solid #f1f5f9' }}
                        >
                          <Checkbox size="small" checked={isChecked} sx={{ mr: 1, color: WA_TEAL, '&.Mui-checked': { color: WA_TEAL } }} />
                          <ListItemAvatar sx={{ minWidth: 42 }}>
                            <Avatar
                              src={staff.profilePicture || undefined}
                              sx={{ width: 34, height: 34, bgcolor: WA_TEAL, fontSize: '0.8rem', fontWeight: 700 }}
                            >
                              {staff.firstName?.[0] || staff.username?.[0] || 'S'}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Typography variant="body2" fontWeight={750}>{staff.fullName}</Typography>}
                            secondary={<Typography variant="caption" color="text.secondary">{staff.designation} · {staff.department}</Typography>}
                          />
                        </ListItem>
                      );
                    })}
                </List>
              </Paper>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setCreateGroupModalOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateGroupSubmit}
            disabled={!newGroupName.trim() || creatingGroup}
            sx={{
              bgcolor: WA_TEAL,
              fontWeight: 800,
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              '&:hover': { bgcolor: WA_TEAL_DARK }
            }}
          >
            {creatingGroup ? <CircularProgress size={20} color="inherit" /> : 'Create Group'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL 2: GROUP DETAILS & MANAGE MEMBERS MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {isCustomGroupChat && (
        <Dialog
          open={groupInfoModalOpen}
          onClose={() => setGroupInfoModalOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: '#0284c7', width: 44, height: 44, fontWeight: 800 }}>
                {activeChat.name[0]?.toUpperCase() || 'G'}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={850} sx={{ color: '#0f172a', lineHeight: 1.2 }}>
                  {activeChat.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {activeChat.description || 'Hospital Coordination Group'}
                </Typography>
              </Box>
            </Stack>
            <IconButton size="small" onClick={() => setGroupInfoModalOpen(false)}>
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ mb: 2 }}>
              {/* Group Members List Header with + Add Staff button */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle2" fontWeight={850} color="#0f172a">
                    Group Members ({activeChat.members?.length || activeChat.memberIds?.length || 0})
                  </Typography>
                  <Chip
                    label={`${activeChat.adminIds?.length || 1} Admin${(activeChat.adminIds?.length || 1) > 1 ? 's' : ''}`}
                    size="small"
                    sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#e0f2fe', color: '#0369a1' }}
                  />
                </Stack>

                {/* Only Group Admins or Super Admins can add members */}
                {isCurrentGroupAdmin && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PersonAdd sx={{ fontSize: '1rem !important' }} />}
                    onClick={() => {
                      setSelectedAddMemberIds([]);
                      setAddMemberSearchQuery('');
                      setAddMembersModalOpen(true);
                    }}
                    sx={{
                      bgcolor: '#0284c7',
                      color: '#ffffff',
                      textTransform: 'none',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      borderRadius: 2,
                      px: 1.8,
                      py: 0.5,
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#0369a1', boxShadow: '0 2px 6px rgba(2,132,199,0.3)' }
                    }}
                  >
                    + Add Staff
                  </Button>
                )}
              </Box>

              {/* ONLY Display Group Members */}
              <Paper
                variant="outlined"
                sx={{
                  maxHeight: 340,
                  overflowY: 'auto',
                  borderRadius: 2.5,
                  bgcolor: '#ffffff',
                  borderColor: '#e2e8f0'
                }}
              >
                <List disablePadding>
                  {(() => {
                    const membersList: GroupMember[] =
                      activeChat.members && activeChat.members.length > 0
                        ? activeChat.members
                        : staffList
                            .filter(s => activeChat.memberIds?.includes(s.id))
                            .map(s => ({
                              id: s.id,
                              fullName: s.fullName,
                              designation: s.designation,
                              department: s.department,
                              role: s.role,
                              profilePicture: s.profilePicture
                            }));

                    if (membersList.length === 0) {
                      return (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            No members found in this group.
                          </Typography>
                        </Box>
                      );
                    }

                    return membersList.map((member, idx) => {
                      const isCreator = member.id === activeChat.createdBy;
                      const isMemberAdmin = (activeChat.adminIds && activeChat.adminIds.includes(member.id)) || isCreator;
                      const isCurrentUser = member.id === user?.id;

                      return (
                        <ListItem
                          key={member.id || idx}
                          sx={{
                            borderBottom: idx < membersList.length - 1 ? '1px solid #f1f5f9' : 'none',
                            py: 1.2,
                            px: 2,
                            transition: 'background-color 0.15s',
                            '&:hover': { bgcolor: '#f8fafc' }
                          }}
                          secondaryAction={
                            isCurrentGroupAdmin && !isCreator && !isCurrentUser ? (
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={e => setMemberActionMenuAnchor({ el: e.currentTarget, member })}
                                sx={{ color: '#64748b', '&:hover': { color: '#0f172a', bgcolor: '#e2e8f0' } }}
                              >
                                <MoreVert fontSize="small" />
                              </IconButton>
                            ) : undefined
                          }
                        >
                          <ListItemAvatar sx={{ minWidth: 44 }}>
                            <Avatar
                              src={member.profilePicture || undefined}
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: isCreator ? '#1e40af' : isMemberAdmin ? '#0284c7' : '#64748b',
                                fontSize: '0.82rem',
                                fontWeight: 800
                              }}
                            >
                              {member.fullName?.[0]?.toUpperCase() || 'S'}
                            </Avatar>
                          </ListItemAvatar>

                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
                                <Typography variant="body2" fontWeight={800} color="#0f172a">
                                  {member.fullName}
                                </Typography>

                                {isCurrentUser && (
                                  <Chip
                                    label="You"
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, borderColor: '#cbd5e1' }}
                                  />
                                )}

                                {isCreator ? (
                                  <Chip
                                    icon={<Shield sx={{ fontSize: '0.7rem !important' }} />}
                                    label="Group Creator"
                                    size="small"
                                    sx={{ height: 18, fontSize: '0.62rem', fontWeight: 850, bgcolor: '#dbeafe', color: '#1e40af' }}
                                  />
                                ) : isMemberAdmin ? (
                                  <Chip
                                    icon={<AdminPanelSettings sx={{ fontSize: '0.7rem !important' }} />}
                                    label="Group Admin"
                                    size="small"
                                    sx={{ height: 18, fontSize: '0.62rem', fontWeight: 850, bgcolor: '#e0f2fe', color: '#0369a1' }}
                                  />
                                ) : (
                                  <Chip
                                    label="Member"
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, color: '#64748b', borderColor: '#e2e8f0' }}
                                  />
                                )}
                              </Stack>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                                {member.designation} · {member.department}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    });
                  })()}
                </List>
              </Paper>

              <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Shield sx={{ fontSize: 14, color: '#0284c7' }} />
                  {isCurrentGroupAdmin
                    ? 'As a Group Admin, you can add hospital staff, promote/demote members as Group Admins, or remove members.'
                    : 'Only Group Admins can add or remove members and promote staff to Group Admin.'}
                </Typography>
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2, pt: 1, justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Created {new Date(activeChat.createdAt).toLocaleDateString()}
              </Typography>
              {(isAdmin || isSuperAdmin || isCurrentGroupAdmin) && (
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteOutline sx={{ fontSize: '1rem !important' }} />}
                  onClick={() => {
                    setDeleteGroupConfirmOpen(activeChat as CustomGroup);
                  }}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    borderRadius: 2,
                    ml: 1
                  }}
                >
                  Delete Group
                </Button>
              )}
            </Stack>
            <Button
              variant="contained"
              onClick={() => setGroupInfoModalOpen(false)}
              sx={{
                bgcolor: '#0f172a',
                color: '#ffffff',
                textTransform: 'none',
                fontWeight: 750,
                borderRadius: 2,
                px: 3,
                '&:hover': { bgcolor: '#1e293b' }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* ── Member Row Action Menu (Group Admin Privileges) ── */}
      <Menu
        anchorEl={memberActionMenuAnchor?.el}
        open={Boolean(memberActionMenuAnchor)}
        onClose={() => setMemberActionMenuAnchor(null)}
        PaperProps={{ sx: { borderRadius: 2.5, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 190 } }}
      >
        {memberActionMenuAnchor && isCustomGroupChat && (() => {
          const target = memberActionMenuAnchor.member;
          const isTargetAdmin = (activeChat.adminIds && activeChat.adminIds.includes(target.id)) || target.id === activeChat.createdBy;

          return [
            <MenuItem
              key="toggle-admin"
              onClick={() => handleToggleGroupAdmin(target.id)}
              disabled={target.id === activeChat.createdBy}
            >
              <ListItemIcon>
                <AdminPanelSettings fontSize="small" sx={{ color: isTargetAdmin ? '#d97706' : '#0284c7' }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={700}>
                    {isTargetAdmin ? 'Dismiss as Admin' : 'Make Group Admin'}
                  </Typography>
                }
              />
            </MenuItem>,
            <Divider key="div-1" />,
            <MenuItem
              key="remove-member"
              onClick={() => {
                setRemoveMemberConfirm(target);
                setMemberActionMenuAnchor(null);
              }}
              disabled={target.id === activeChat.createdBy}
            >
              <ListItemIcon>
                <PersonRemove fontSize="small" sx={{ color: '#dc2626' }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={700} color="error">
                    Remove from Group
                  </Typography>
                }
              />
            </MenuItem>
          ];
        })()}
      </Menu>

      {/* ── Modal 3: Add Staff to Existing Group (Group Admin Only) ── */}
      {isCustomGroupChat && (
        <Dialog
          open={addMembersModalOpen}
          onClose={() => setAddMembersModalOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: '#0284c7' }}>
                <PersonAdd />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={850}>
                  Add Staff to {activeChat.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Select available hospital staff to add into this group
                </Typography>
              </Box>
            </Stack>
            <IconButton size="small" onClick={() => setAddMembersModalOpen(false)}>
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ mb: 2 }}>
              <TextField
                placeholder="Search staff by name, department, designation..."
                fullWidth
                size="small"
                value={addMemberSearchQuery}
                onChange={e => setAddMemberSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 1.5 }}
              />

              <Paper
                variant="outlined"
                sx={{
                  maxHeight: 280,
                  overflowY: 'auto',
                  borderRadius: 2,
                  bgcolor: '#f8fafc'
                }}
              >
                <List dense disablePadding>
                  {(() => {
                    const currentMemberIds = activeChat.memberIds || activeChat.members?.map(m => m.id) || [];
                    const availableStaff = staffList
                      .filter(s => !currentMemberIds.includes(s.id))
                      .filter(
                        s =>
                          s.fullName.toLowerCase().includes(addMemberSearchQuery.toLowerCase()) ||
                          s.designation.toLowerCase().includes(addMemberSearchQuery.toLowerCase()) ||
                          s.department.toLowerCase().includes(addMemberSearchQuery.toLowerCase())
                      );

                    if (availableStaff.length === 0) {
                      return (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            {staffList.length > 0
                              ? 'All available staff members are already in this group.'
                              : 'No staff available to add.'}
                          </Typography>
                        </Box>
                      );
                    }

                    return availableStaff.map(staff => {
                      const isChecked = selectedAddMemberIds.includes(staff.id);
                      return (
                        <ListItem
                          key={staff.id}
                          button
                          onClick={() => {
                            setSelectedAddMemberIds(prev =>
                              isChecked ? prev.filter(id => id !== staff.id) : [...prev, staff.id]
                            );
                          }}
                          sx={{ borderBottom: '1px solid #f1f5f9', py: 0.8 }}
                        >
                          <Checkbox
                            size="small"
                            checked={isChecked}
                            sx={{ mr: 1, color: '#0284c7', '&.Mui-checked': { color: '#0284c7' } }}
                          />
                          <ListItemAvatar sx={{ minWidth: 42 }}>
                            <Avatar
                              src={staff.profilePicture || undefined}
                              sx={{ width: 34, height: 34, bgcolor: '#0284c7', fontSize: '0.8rem', fontWeight: 700 }}
                            >
                              {staff.firstName?.[0] || staff.username?.[0] || 'S'}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Typography variant="body2" fontWeight={750}>{staff.fullName}</Typography>}
                            secondary={<Typography variant="caption" color="text.secondary">{staff.designation} · {staff.department}</Typography>}
                          />
                        </ListItem>
                      );
                    });
                  })()}
                </List>
              </Paper>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2, pt: 1, justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              {selectedAddMemberIds.length} staff member{selectedAddMemberIds.length !== 1 ? 's' : ''} selected
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                onClick={() => setAddMembersModalOpen(false)}
                sx={{ textTransform: 'none', color: '#64748b' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleAddMembersSubmit}
                disabled={selectedAddMemberIds.length === 0 || addingMembers}
                sx={{
                  bgcolor: '#0284c7',
                  fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 3,
                  '&:hover': { bgcolor: '#0369a1' }
                }}
              >
                {addingMembers ? <CircularProgress size={20} color="inherit" /> : `Add to Group (${selectedAddMemberIds.length})`}
              </Button>
            </Stack>
          </DialogActions>
        </Dialog>
      )}

      {/* ── Remove Member Confirmation Modal ── */}
      <Dialog
        open={Boolean(removeMemberConfirm)}
        onClose={() => setRemoveMemberConfirm(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 850, color: '#0f172a' }}>
          Remove Member from Group?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove <strong>{removeMemberConfirm?.fullName}</strong> from <strong>{isCustomGroupChat ? activeChat.name : 'this group'}</strong>? They will no longer receive group updates or messages.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRemoveMemberConfirm(null)} sx={{ textTransform: 'none', color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => removeMemberConfirm && handleRemoveMember(removeMemberConfirm.id)}
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
          >
            Remove Member
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Group Confirmation Dialog (Super Admin / Admin / Group Admin) ── */}
      <Dialog
        open={Boolean(deleteGroupConfirmOpen)}
        onClose={() => setDeleteGroupConfirmOpen(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 850, color: '#dc2626' }}>
          <WarningAmber color="error" />
          Delete Group Permanently?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="#0f172a" sx={{ mb: 1.5 }}>
            Are you sure you want to permanently delete <strong>"{deleteGroupConfirmOpen?.name}"</strong>?
          </Typography>
          <Box sx={{ bgcolor: '#fef2f2', p: 1.5, borderRadius: 2, border: '1px solid #fee2e2' }}>
            <Typography variant="caption" color="#991b1b" sx={{ fontWeight: 600, display: 'block' }}>
              ⚠️ This action cannot be undone. All conversation history and member memberships ({deleteGroupConfirmOpen?.members?.length || deleteGroupConfirmOpen?.memberIds?.length || 0} staff) will be permanently deleted.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setDeleteGroupConfirmOpen(null)}
            disabled={deletingGroup}
            sx={{ textTransform: 'none', color: '#64748b' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteGroupSubmit}
            disabled={deletingGroup}
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2, px: 2.5 }}
          >
            {deletingGroup ? <CircularProgress size={20} color="inherit" /> : 'Yes, Delete Group'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Context Menu for message actions (Reply, Edit, Delete) ── */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{ sx: { borderRadius: 2.5, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 160 } }}
      >
        <MenuItem onClick={() => menuAnchor && handleStartReply(menuAnchor.msg)}>
          <ListItemIcon><Reply fontSize="small" sx={{ color: WA_TEAL }} /></ListItemIcon>
          <ListItemText primary={<Typography variant="body2" fontWeight={650}>Reply</Typography>} />
        </MenuItem>

        {menuAnchor && (menuAnchor.msg.senderId === user?.id || isAdmin) && (
          <MenuItem onClick={() => menuAnchor && handleStartEdit(menuAnchor.msg)}>
            <ListItemIcon><Edit fontSize="small" sx={{ color: '#2563eb' }} /></ListItemIcon>
            <ListItemText primary={<Typography variant="body2" fontWeight={650}>Edit Message</Typography>} />
          </MenuItem>
        )}

        {menuAnchor && (menuAnchor.msg.senderId === user?.id || isAdmin) && (
          <MenuItem onClick={() => { setDeleteConfirmOpen(menuAnchor.msg); setMenuAnchor(null); }}>
            <ListItemIcon><DeleteOutline fontSize="small" sx={{ color: '#dc2626' }} /></ListItemIcon>
            <ListItemText primary={<Typography variant="body2" fontWeight={650} color="error">Delete</Typography>} />
          </MenuItem>
        )}
      </Menu>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={Boolean(deleteConfirmOpen)}
        onClose={() => setDeleteConfirmOpen(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 850, color: '#0f172a' }}>
          Delete Message for Everyone?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This message will be permanently removed for all members in the chat. A "This message was deleted" placeholder will be shown.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(null)} sx={{ textTransform: 'none', color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirmOpen && handleDeleteMessage(deleteConfirmOpen)}
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
          >
            Delete for Everyone
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Expanded Image Preview Modal ── */}
      <Dialog
        open={Boolean(previewMedia)}
        onClose={() => setPreviewMedia(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'hidden' } }}
      >
        <Box sx={{ position: 'relative', textAlign: 'center', p: 1 }}>
          <IconButton
            onClick={() => setPreviewMedia(null)}
            sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
          >
            <Close />
          </IconButton>
          {previewMedia && (
            <Box
              component="img"
              src={previewMedia.dataUrl}
              alt={previewMedia.name}
              sx={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: 3,
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                objectFit: 'contain'
              }}
            />
          )}
        </Box>
      </Dialog>
    </Box>
  );
};

export default Messages;
