import fs from 'fs';
import path from 'path';
import { secureMessageRecord, unsecureMessageRecord } from './cryptoHelper.js';

const STORE_PATH = path.resolve(process.cwd(), 'logs', 'chat_encrypted_store.json');

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
}

interface StoredChatData {
  generalHospitalGroupMessages: any[];
  directStaffMessages: any[];
  customGroups?: CustomGroup[];
  customGroupMessages?: { [groupId: string]: any[] };
  lastUpdated: string;
}

class ChatStorageManager {
  private generalHospitalGroupMessages: any[] = [];
  private directStaffMessages: any[] = [];
  private customGroups: CustomGroup[] = [];
  private customGroupMessages: { [groupId: string]: any[] } = {};
  private saveTimeout: any = null;

  constructor() {
    this.initStore();
  }

  private initStore() {
    try {
      const logsDir = path.dirname(STORE_PATH);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const data: StoredChatData = JSON.parse(raw);
        this.generalHospitalGroupMessages = Array.isArray(data.generalHospitalGroupMessages) ? data.generalHospitalGroupMessages : [];
        this.directStaffMessages = Array.isArray(data.directStaffMessages) ? data.directStaffMessages : [];
        this.customGroups = Array.isArray(data.customGroups) ? data.customGroups : [];
        this.customGroupMessages = data.customGroupMessages && typeof data.customGroupMessages === 'object' ? data.customGroupMessages : {};
      } else {
        // Initial welcome messages (Encrypted on initialization)
        const initialGeneral = [
          {
            id: 'GEN-MSG-001',
            senderId: 'system-admin',
            senderName: 'Hospital Administrator',
            senderRole: 'Administration',
            senderAvatar: '',
            text: 'Welcome to the Faith Foundation Mission Hospital General Staff Channel. All clinical and non-clinical staff have been unified here for rapid coordination.',
            timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
            isSystem: true
          },
          {
            id: 'GEN-MSG-002',
            senderId: 'dr-emmanuel',
            senderName: 'Dr. Emmanuel Vegher',
            senderRole: 'Medical Director',
            senderAvatar: '',
            text: 'Good morning team. Please ensure all shift handovers and critical clinical notes are synchronized on time today.',
            timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
            isSystem: false
          },
          {
            id: 'GEN-MSG-003',
            senderId: 'pharm-lead',
            senderName: 'Pharmacist Jane',
            senderRole: 'Chief Pharmacist',
            senderAvatar: '',
            text: 'Pharmacy Notice: All emergency crash cart medication replenishment requests are processed within 15 minutes.',
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
            isSystem: false
          }
        ];

        this.generalHospitalGroupMessages = initialGeneral.map(m => secureMessageRecord(m));
        this.directStaffMessages = [];
        this.customGroups = [];
        this.customGroupMessages = {};
        this.persist();
      }
    } catch (e) {
      console.error('Failed to initialize encrypted chat storage:', e);
      this.generalHospitalGroupMessages = [];
      this.directStaffMessages = [];
      this.customGroups = [];
      this.customGroupMessages = {};
    }
  }

  private persist() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      try {
        const data: StoredChatData = {
          generalHospitalGroupMessages: this.generalHospitalGroupMessages,
          directStaffMessages: this.directStaffMessages,
          customGroups: this.customGroups,
          customGroupMessages: this.customGroupMessages,
          lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      } catch (e) {
        console.error('Error persisting encrypted chat store to disk:', e);
      }
    }, 200);
  }

  // ── General Hospital Group Operations ──
  public getGeneralGroupMessages(): any[] {
    return this.generalHospitalGroupMessages.map(m => unsecureMessageRecord(m));
  }

  public addGeneralGroupMessage(plainMsg: any): any {
    const encryptedMsg = secureMessageRecord(plainMsg);
    this.generalHospitalGroupMessages.push(encryptedMsg);
    if (this.generalHospitalGroupMessages.length > 1000) {
      this.generalHospitalGroupMessages = this.generalHospitalGroupMessages.slice(-1000);
    }
    this.persist();
    return unsecureMessageRecord(encryptedMsg);
  }

  // ── Custom Groups Operations ──
  public getCustomGroups(userId?: string, isSuperAdmin = false): CustomGroup[] {
    return this.customGroups
      .filter(g => {
        if (isSuperAdmin) return true;
        if (!userId) return true;
        return g.memberIds.includes(userId) || g.createdBy === userId || g.adminIds.includes(userId);
      })
      .map(g => {
        const msgs = this.customGroupMessages[g.id] || [];
        const lastMsg = msgs.length > 0 ? unsecureMessageRecord(msgs[msgs.length - 1]) : null;
        return {
          ...g,
          lastMessage: lastMsg
            ? lastMsg.isDeleted
              ? '🚫 This message was deleted'
              : (lastMsg.priority === 'URGENT' ? '🚨 [URGENT] ' : '') + (lastMsg.text || (lastMsg.attachment ? `📎 ${lastMsg.attachment.name}` : ''))
            : undefined,
          lastMessageTime: lastMsg ? lastMsg.timestamp : g.createdAt
        };
      });
  }

  public getCustomGroupById(groupId: string): CustomGroup | undefined {
    return this.customGroups.find(g => g.id === groupId);
  }

  public createCustomGroup(
    name: string,
    description: string,
    creatorUser: any,
    initialMembers: GroupMember[] = []
  ): CustomGroup {
    const groupId = `GRP-${Date.now().toString().slice(-6)}`;
    const creatorMember: GroupMember = {
      id: creatorUser.id,
      fullName: (creatorUser.firstName || creatorUser.lastName)
        ? `${creatorUser.firstName || ''} ${creatorUser.lastName || ''}`.trim()
        : creatorUser.username,
      designation: creatorUser.designation || creatorUser.role || 'Staff',
      department: creatorUser.department || 'Hospital Administration',
      role: creatorUser.role,
      profilePicture: creatorUser.profilePicture || null
    };

    // Combine creator with initialMembers uniquely
    const allMembersMap = new Map<string, GroupMember>();
    allMembersMap.set(creatorUser.id, creatorMember);
    initialMembers.forEach(m => {
      if (m.id) allMembersMap.set(m.id, m);
    });

    const members = Array.from(allMembersMap.values());
    const memberIds = members.map(m => m.id);

    const newGroup: CustomGroup = {
      id: groupId,
      name: name.trim(),
      description: (description || '').trim(),
      createdBy: creatorUser.id,
      creatorName: creatorMember.fullName,
      adminIds: [creatorUser.id],
      memberIds,
      members,
      createdAt: new Date().toISOString()
    };

    this.customGroups.unshift(newGroup);
    this.customGroupMessages[groupId] = [];

    // Add initial system message (Encrypted)
    const initMsg = {
      id: `GMSG-${Date.now().toString()}`,
      groupId,
      senderId: 'system-admin',
      senderName: 'System',
      senderRole: 'Administration',
      senderAvatar: '',
      text: `Group "${newGroup.name}" was created by ${newGroup.creatorName}. Welcome ${members.length} members!`,
      timestamp: new Date().toISOString(),
      isSystem: true
    };
    this.customGroupMessages[groupId].push(secureMessageRecord(initMsg));

    this.persist();
    return newGroup;
  }

  public updateCustomGroupMembers(
    groupId: string,
    newMembers: GroupMember[],
    userId: string,
    isSuperAdmin = false
  ): { success: boolean; data?: CustomGroup; error?: string } {
    const group = this.customGroups.find(g => g.id === groupId);
    if (!group) return { success: false, error: 'Group not found' };

    const isAdmin = isSuperAdmin || (group.adminIds && group.adminIds.includes(userId)) || group.createdBy === userId;
    if (!isAdmin) {
      return { success: false, error: 'Only group admins or hospital administrators can manage group members' };
    }

    // Preserve creator as admin
    const membersMap = new Map<string, GroupMember>();
    const creator = group.members.find(m => m.id === group.createdBy);
    if (creator) membersMap.set(creator.id, creator);

    newMembers.forEach(m => {
      if (m.id) membersMap.set(m.id, m);
    });

    group.members = Array.from(membersMap.values());
    group.memberIds = group.members.map(m => m.id);
    group.updatedAt = new Date().toISOString();

    this.persist();
    return { success: true, data: group };
  }

  public addMembersToGroup(
    groupId: string,
    newMembersToAdd: GroupMember[],
    actorUser: any,
    isSuperAdmin = false
  ): { success: boolean; data?: CustomGroup; error?: string } {
    const group = this.customGroups.find(g => g.id === groupId);
    if (!group) return { success: false, error: 'Group not found' };

    const isAdmin = isSuperAdmin || (group.adminIds && group.adminIds.includes(actorUser?.id)) || group.createdBy === actorUser?.id;
    if (!isAdmin) {
      return { success: false, error: 'Only group admins or hospital administrators can add new members' };
    }

    const membersMap = new Map<string, GroupMember>();
    group.members.forEach(m => membersMap.set(m.id, m));

    const addedNames: string[] = [];
    newMembersToAdd.forEach(m => {
      if (m.id && !membersMap.has(m.id)) {
        membersMap.set(m.id, m);
        addedNames.push(m.fullName);
      }
    });

    if (addedNames.length === 0) {
      return { success: true, data: group };
    }

    group.members = Array.from(membersMap.values());
    group.memberIds = group.members.map(m => m.id);
    group.updatedAt = new Date().toISOString();

    // Add encrypted system broadcast message
    const actorName = (actorUser?.firstName || actorUser?.lastName)
      ? `${actorUser.firstName || ''} ${actorUser.lastName || ''}`.trim()
      : actorUser?.username || 'Group Admin';

    const sysMsg = {
      id: `GMSG-${Date.now().toString()}`,
      groupId,
      senderId: 'system-admin',
      senderName: 'System',
      senderRole: 'Administration',
      senderAvatar: '',
      text: `${actorName} added ${addedNames.join(', ')} to the group.`,
      timestamp: new Date().toISOString(),
      isSystem: true
    };
    this.addCustomGroupMessage(groupId, sysMsg);

    this.persist();
    return { success: true, data: group };
  }

  public removeMemberFromGroup(
    groupId: string,
    targetUserId: string,
    actorUser: any,
    isSuperAdmin = false
  ): { success: boolean; data?: CustomGroup; error?: string } {
    const group = this.customGroups.find(g => g.id === groupId);
    if (!group) return { success: false, error: 'Group not found' };

    const isAdmin = isSuperAdmin || (group.adminIds && group.adminIds.includes(actorUser?.id)) || group.createdBy === actorUser?.id;
    if (!isAdmin) {
      return { success: false, error: 'Only group admins or hospital administrators can remove members' };
    }

    if (targetUserId === group.createdBy && !isSuperAdmin) {
      return { success: false, error: 'The original group creator cannot be removed from the group' };
    }

    const targetMember = group.members.find(m => m.id === targetUserId);
    const targetName = targetMember ? targetMember.fullName : 'Staff member';

    group.members = group.members.filter(m => m.id !== targetUserId);
    group.memberIds = group.members.map(m => m.id);
    if (group.adminIds) {
      group.adminIds = group.adminIds.filter(id => id !== targetUserId);
    }
    group.updatedAt = new Date().toISOString();

    const actorName = (actorUser?.firstName || actorUser?.lastName)
      ? `${actorUser.firstName || ''} ${actorUser.lastName || ''}`.trim()
      : actorUser?.username || 'Group Admin';

    const sysMsg = {
      id: `GMSG-${Date.now().toString()}`,
      groupId,
      senderId: 'system-admin',
      senderName: 'System',
      senderRole: 'Administration',
      senderAvatar: '',
      text: `${actorName} removed ${targetName} from the group.`,
      timestamp: new Date().toISOString(),
      isSystem: true
    };
    this.addCustomGroupMessage(groupId, sysMsg);

    this.persist();
    return { success: true, data: group };
  }

  public toggleGroupAdminRole(
    groupId: string,
    targetUserId: string,
    actorUser: any,
    isSuperAdmin = false
  ): { success: boolean; data?: CustomGroup; isNowAdmin?: boolean; error?: string } {
    const group = this.customGroups.find(g => g.id === groupId);
    if (!group) return { success: false, error: 'Group not found' };

    const isActorAdmin = isSuperAdmin || (group.adminIds && group.adminIds.includes(actorUser?.id)) || group.createdBy === actorUser?.id;
    if (!isActorAdmin) {
      return { success: false, error: 'Only group admins or hospital administrators can assign admin privileges' };
    }

    if (!group.adminIds) {
      group.adminIds = [group.createdBy];
    }

    const targetMember = group.members.find(m => m.id === targetUserId);
    if (!targetMember) {
      return { success: false, error: 'User is not a member of this group' };
    }

    let isNowAdmin = false;
    const isCurrentlyAdmin = group.adminIds.includes(targetUserId);

    if (isCurrentlyAdmin) {
      if (targetUserId === group.createdBy) {
        return { success: false, error: 'Cannot revoke admin role from the primary group creator' };
      }
      group.adminIds = group.adminIds.filter(id => id !== targetUserId);
      isNowAdmin = false;
    } else {
      group.adminIds.push(targetUserId);
      isNowAdmin = true;
    }

    group.updatedAt = new Date().toISOString();

    const actorName = (actorUser?.firstName || actorUser?.lastName)
      ? `${actorUser.firstName || ''} ${actorUser.lastName || ''}`.trim()
      : actorUser?.username || 'Group Admin';

    const actionText = isNowAdmin
      ? `${actorName} promoted ${targetMember.fullName} to Group Admin.`
      : `${actorName} revoked Group Admin privileges from ${targetMember.fullName}.`;

    const sysMsg = {
      id: `GMSG-${Date.now().toString()}`,
      groupId,
      senderId: 'system-admin',
      senderName: 'System',
      senderRole: 'Administration',
      senderAvatar: '',
      text: actionText,
      timestamp: new Date().toISOString(),
      isSystem: true
    };
    this.addCustomGroupMessage(groupId, sysMsg);

    this.persist();
    return { success: true, data: group, isNowAdmin };
  }

  public deleteCustomGroup(
    groupId: string,
    actorUser: any,
    isSuperAdmin = false
  ): { success: boolean; error?: string } {
    const groupIdx = this.customGroups.findIndex(g => g.id === groupId);
    if (groupIdx === -1) return { success: false, error: 'Group not found' };

    const group = this.customGroups[groupIdx];
    const isHospitalAdmin =
      isSuperAdmin ||
      actorUser?.role === 'ADMIN' ||
      actorUser?.role === 'SUPER_ADMIN' ||
      actorUser?.roles?.includes('ADMIN') ||
      actorUser?.roles?.includes('SUPER_ADMIN');
    const isGroupAdmin =
      (group.adminIds && group.adminIds.includes(actorUser?.id)) ||
      group.createdBy === actorUser?.id;

    if (!isHospitalAdmin && !isGroupAdmin) {
      return { success: false, error: 'Only administrators or group admins can delete this group' };
    }

    this.customGroups.splice(groupIdx, 1);
    delete this.customGroupMessages[groupId];

    this.persist();
    return { success: true };
  }

  public getCustomGroupMessages(groupId: string): any[] {
    const list = this.customGroupMessages[groupId] || [];
    return list.map(m => unsecureMessageRecord(m));
  }

  public addCustomGroupMessage(groupId: string, plainMsg: any): any {
    if (!this.customGroupMessages[groupId]) {
      this.customGroupMessages[groupId] = [];
    }

    const encryptedMsg = secureMessageRecord({ ...plainMsg, groupId });
    this.customGroupMessages[groupId].push(encryptedMsg);

    if (this.customGroupMessages[groupId].length > 1000) {
      this.customGroupMessages[groupId] = this.customGroupMessages[groupId].slice(-1000);
    }

    this.persist();
    return unsecureMessageRecord(encryptedMsg);
  }

  // ── Direct Message Operations ──
  public getDirectMessagesSummary(userId?: string): any[] {
    const decrypted = this.directStaffMessages.map(m => unsecureMessageRecord(m));
    if (!userId) return decrypted;
    return decrypted.filter(m => m.senderId === userId || m.recipientId === userId);
  }

  public getConversation(userId: string, targetUserId: string): any[] {
    const decrypted = this.directStaffMessages.map(m => unsecureMessageRecord(m));
    return decrypted
      .filter(
        m =>
          (m.senderId === userId && m.recipientId === targetUserId) ||
          (m.senderId === targetUserId && m.recipientId === userId)
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public markConversationAsRead(userId: string, targetUserId: string): number {
    let count = 0;
    this.directStaffMessages.forEach(m => {
      if (m.senderId === targetUserId && m.recipientId === userId && !m.read) {
        m.read = true;
        count++;
      }
    });
    if (count > 0) this.persist();
    return count;
  }

  public addDirectMessage(plainMsg: any): any {
    const encryptedMsg = secureMessageRecord(plainMsg);
    this.directStaffMessages.push(encryptedMsg);
    if (this.directStaffMessages.length > 5000) {
      this.directStaffMessages = this.directStaffMessages.slice(-5000);
    }
    this.persist();
    return unsecureMessageRecord(encryptedMsg);
  }

  // ── Edit & Delete Operations ──
  public editMessage(msgId: string, newPlainText: string, userId: string, isAdmin = false): { success: boolean; data?: any; error?: string } {
    // Check general group
    let encMsg = this.generalHospitalGroupMessages.find(m => m.id === msgId);
    if (encMsg) {
      if (encMsg.senderId !== userId && !isAdmin) {
        return { success: false, error: 'You can only edit your own messages' };
      }
      const updated = {
        ...encMsg,
        text: newPlainText,
        isEdited: true,
        editedAt: new Date().toISOString()
      };
      const secureUpdated = secureMessageRecord(updated);
      Object.assign(encMsg, secureUpdated);
      this.persist();
      return { success: true, data: unsecureMessageRecord(encMsg) };
    }

    // Check direct messages
    encMsg = this.directStaffMessages.find(m => m.id === msgId);
    if (encMsg) {
      if (encMsg.senderId !== userId && !isAdmin) {
        return { success: false, error: 'You can only edit your own messages' };
      }
      const updated = {
        ...encMsg,
        text: newPlainText,
        isEdited: true,
        editedAt: new Date().toISOString()
      };
      const secureUpdated = secureMessageRecord(updated);
      Object.assign(encMsg, secureUpdated);
      this.persist();
      return { success: true, data: unsecureMessageRecord(encMsg) };
    }

    // Check custom groups
    for (const gId of Object.keys(this.customGroupMessages)) {
      encMsg = this.customGroupMessages[gId].find(m => m.id === msgId);
      if (encMsg) {
        if (encMsg.senderId !== userId && !isAdmin) {
          return { success: false, error: 'You can only edit your own messages' };
        }
        const updated = {
          ...encMsg,
          text: newPlainText,
          isEdited: true,
          editedAt: new Date().toISOString()
        };
        const secureUpdated = secureMessageRecord(updated);
        Object.assign(encMsg, secureUpdated);
        this.persist();
        return { success: true, data: unsecureMessageRecord(encMsg) };
      }
    }

    return { success: false, error: 'Message not found' };
  }

  public deleteMessage(msgId: string, userId: string, isAdmin = false): { success: boolean; data?: any; error?: string } {
    // Check general group
    let encMsg = this.generalHospitalGroupMessages.find(m => m.id === msgId);
    if (encMsg) {
      if (encMsg.senderId !== userId && !isAdmin) {
        return { success: false, error: 'You can only delete your own messages' };
      }
      encMsg.isDeleted = true;
      encMsg.text = 'This message was deleted';
      encMsg.attachment = null;
      encMsg.deletedAt = new Date().toISOString();
      const secureUpdated = secureMessageRecord(encMsg);
      Object.assign(encMsg, secureUpdated);
      this.persist();
      return { success: true, data: unsecureMessageRecord(encMsg) };
    }

    // Check direct messages
    encMsg = this.directStaffMessages.find(m => m.id === msgId);
    if (encMsg) {
      if (encMsg.senderId !== userId && !isAdmin) {
        return { success: false, error: 'You can only delete your own messages' };
      }
      encMsg.isDeleted = true;
      encMsg.text = 'This message was deleted';
      encMsg.attachment = null;
      encMsg.deletedAt = new Date().toISOString();
      const secureUpdated = secureMessageRecord(encMsg);
      Object.assign(encMsg, secureUpdated);
      this.persist();
      return { success: true, data: unsecureMessageRecord(encMsg) };
    }

    // Check custom groups
    for (const gId of Object.keys(this.customGroupMessages)) {
      encMsg = this.customGroupMessages[gId].find(m => m.id === msgId);
      if (encMsg) {
        if (encMsg.senderId !== userId && !isAdmin) {
          return { success: false, error: 'You can only delete your own messages' };
        }
        encMsg.isDeleted = true;
        encMsg.text = 'This message was deleted';
        encMsg.attachment = null;
        encMsg.deletedAt = new Date().toISOString();
        const secureUpdated = secureMessageRecord(encMsg);
        Object.assign(encMsg, secureUpdated);
        this.persist();
        return { success: true, data: unsecureMessageRecord(encMsg) };
      }
    }

    return { success: false, error: 'Message not found' };
  }
}

export const chatStore = new ChatStorageManager();
