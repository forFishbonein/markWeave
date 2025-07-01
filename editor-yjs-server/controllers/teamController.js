import Team from "../models/Team.js";
import TeamInvite from "../models/TeamInvite.js";
import User from "../models/User.js";
import {
  sendTeamInviteEmail,
  generateInviteToken,
} from "../services/emailService.js";

export const createTeam = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const ownerId = req.user.userId;
    const team = new Team({ name, description, ownerId });
    await team.save();
    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
};

export const getUserTeams = async (req, res, next) => {
  try {
    const teams = await Team.find({ "members.userId": req.user.userId });
    res.json(teams);
  } catch (err) {
    next(err);
  }
};

export const getTeamDetails = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate("members.userId", "username email")
      .populate("ownerId", "username email");
    if (!team || !team.members.some((m) => m.userId.equals(req.user.userId))) {
      return res.status(404).json({ msg: "未找到团队" });
    }
    res.json(team);
  } catch (err) {
    next(err);
  }
};

export const updateTeam = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const team = await Team.findById(req.params.teamId);

    if (!team || !team.ownerId.equals(req.user.userId)) {
      return res.status(403).json({ msg: "无权操作" });
    }

    team.name = name || team.name;
    team.description = description || team.description;
    await team.save();
    res.json(team);
  } catch (err) {
    next(err);
  }
};

export const inviteMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const { teamId } = req.params;

    // 获取团队信息和邀请人信息
    const team = await Team.findById(teamId).populate("ownerId", "username");
    const inviter = await User.findById(req.user.userId);

    if (!team || !inviter) {
      return res.status(404).json({ msg: "团队或用户不存在" });
    }

    const inviterRole = team.members.find((m) =>
      m.userId.equals(req.user.userId)
    )?.role;

    if (!(inviterRole === "owner" || inviterRole === "admin")) {
      return res.status(403).json({ msg: "无权操作" });
    }

    // 检查用户是否已经是成员
    const invitedUser = await User.findOne({ email });
    if (
      invitedUser &&
      team.members.some((m) => m.userId.equals(invitedUser._id))
    ) {
      return res.status(400).json({ msg: "用户已经是成员" });
    }

    // 检查是否已有待处理的邀请
    const existingInvite = await TeamInvite.findOne({
      teamId,
      email,
      status: "pending",
    });

    if (existingInvite) {
      return res.status(400).json({ msg: "该用户已有待处理的邀请" });
    }

    // 生成邀请令牌
    const inviteToken = generateInviteToken();

    // 创建邀请记录
    const invite = new TeamInvite({
      teamId,
      email,
      role: role || "member",
      invitedBy: req.user.userId,
      inviteToken,
    });
    await invite.save();

    // 发送邀请邮件
    try {
      await sendTeamInviteEmail({
        email,
        teamName: team.name,
        inviterName: inviter.username,
        role: role || "member",
        inviteToken,
        teamId,
      });

      res.status(201).json({
        success: true,
        msg: "邀请邮件已发送",
        inviteId: invite._id,
      });
    } catch (emailError) {
      // 如果邮件发送失败，删除邀请记录
      await TeamInvite.findByIdAndDelete(invite._id);

      console.error("邮件发送失败:", emailError);
      return res.status(500).json({
        success: false,
        msg: "邮件发送失败，请检查邮箱地址或稍后重试",
        error: emailError.message,
      });
    }
  } catch (err) {
    next(err);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { teamId, memberId } = req.params;
    const team = await Team.findById(teamId);
    const removerRole = team.members.find((m) =>
      m.userId.equals(req.user.userId)
    )?.role;

    if (!team || !(removerRole === "owner" || removerRole === "admin")) {
      return res.status(403).json({ msg: "无权操作" });
    }

    if (team.ownerId.equals(memberId)) {
      return res.status(400).json({ msg: "不能移除所有者" });
    }

    team.members = team.members.filter((m) => !m.userId.equals(memberId));
    await team.save();
    res.json(team);
  } catch (err) {
    next(err);
  }
};

// 获取邀请详情（通过令牌）
export const getInviteDetails = async (req, res, next) => {
  try {
    const { token } = req.params;

    const invite = await TeamInvite.findOne({
      inviteToken: token,
      status: "pending",
    })
      .populate("teamId", "name description")
      .populate("invitedBy", "username");

    if (!invite) {
      return res.status(404).json({
        success: false,
        msg: "邀请不存在或已过期",
      });
    }

    // 检查是否过期
    if (invite.expiresAt < new Date()) {
      await TeamInvite.findByIdAndUpdate(invite._id, { status: "expired" });
      return res.status(400).json({
        success: false,
        msg: "邀请已过期",
      });
    }

    res.json({
      success: true,
      invite: {
        email: invite.email,
        role: invite.role,
        teamName: invite.teamId.name,
        teamDescription: invite.teamId.description,
        inviterName: invite.invitedBy.username,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 接受邀请
export const acceptInvite = async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user.userId;

    const invite = await TeamInvite.findOne({
      inviteToken: token,
      status: "pending",
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        msg: "邀请不存在或已过期",
      });
    }

    // 检查是否过期
    if (invite.expiresAt < new Date()) {
      await TeamInvite.findByIdAndUpdate(invite._id, { status: "expired" });
      return res.status(400).json({
        success: false,
        msg: "邀请已过期",
      });
    }

    // 获取当前用户信息
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "用户不存在",
      });
    }

    // 验证邮箱是否匹配
    if (user.email !== invite.email) {
      return res.status(400).json({
        success: false,
        msg: "邮箱地址不匹配",
      });
    }

    // 获取团队信息
    const team = await Team.findById(invite.teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        msg: "团队不存在",
      });
    }

    // 检查是否已经是成员
    const isAlreadyMember = team.members.some((m) => m.userId.equals(userId));
    if (isAlreadyMember) {
      // 更新邀请状态
      await TeamInvite.findByIdAndUpdate(invite._id, { status: "accepted" });
      return res.status(400).json({
        success: false,
        msg: "你已经是团队成员了",
      });
    }

    // 添加用户到团队
    team.members.push({
      userId: userId,
      role: invite.role,
      joinedAt: new Date(),
    });
    await team.save();

    // 更新邀请状态
    await TeamInvite.findByIdAndUpdate(invite._id, { status: "accepted" });

    res.json({
      success: true,
      msg: "成功加入团队",
      team: {
        id: team._id,
        name: team.name,
        role: invite.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 拒绝邀请
export const rejectInvite = async (req, res, next) => {
  try {
    const { token } = req.params;

    const invite = await TeamInvite.findOne({
      inviteToken: token,
      status: "pending",
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        msg: "邀请不存在或已过期",
      });
    }

    // 更新邀请状态
    await TeamInvite.findByIdAndUpdate(invite._id, { status: "rejected" });

    res.json({
      success: true,
      msg: "已拒绝邀请",
    });
  } catch (err) {
    next(err);
  }
};
