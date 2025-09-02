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
      return res.status(404).json({ msg: "Team not found" });
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
      return res.status(403).json({ msg: "No permission to operate" });
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

    // Get team info and inviter info
    const team = await Team.findById(teamId).populate("ownerId", "username");
    const inviter = await User.findById(req.user.userId);

    if (!team || !inviter) {
      return res.status(404).json({ msg: "Team or user does not exist" });
    }

    const inviterRole = team.members.find((m) =>
      m.userId.equals(req.user.userId)
    )?.role;

    if (!(inviterRole === "owner" || inviterRole === "admin")) {
      return res.status(403).json({ msg: "No permission" });
    }

    // Check if user is already a member
    const invitedUser = await User.findOne({ email });
    if (
      invitedUser &&
      team.members.some((m) => m.userId.equals(invitedUser._id))
    ) {
      return res.status(400).json({ msg: "User is already a member" });
    }

    // Check if there's already a pending invitation
    const existingInvite = await TeamInvite.findOne({
      teamId,
      email,
      status: "pending",
    });

    if (existingInvite) {
      return res
        .status(400)
        .json({ msg: "User already has a pending invitation" });
    }

    // Generate invite token
    const inviteToken = generateInviteToken();

    // Create invitation record
    const invite = new TeamInvite({
      teamId,
      email,
      role: role || "member",
      invitedBy: req.user.userId,
      inviteToken,
    });
    await invite.save();

    // Send invitation email
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
        msg: "Invitation email sent",
        inviteId: invite._id,
      });
    } catch (emailError) {
      // If email sending failed, delete invitation record
      await TeamInvite.findByIdAndDelete(invite._id);

      console.error("Email sending failed:", emailError);
      return res.status(500).json({
        success: false,
        msg: "Email sending failed, please check email address or try again later",
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
      return res.status(403).json({ msg: "No permission" });
    }

    if (team.ownerId.equals(memberId)) {
      return res.status(400).json({ msg: "Cannot remove owner" });
    }

    team.members = team.members.filter((m) => !m.userId.equals(memberId));
    await team.save();
    res.json(team);
  } catch (err) {
    next(err);
  }
};

// Get invitation details (with token)
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
        msg: "Invite does not exist or has expired",
      });
    }

    // Check if expired
    if (invite.expiresAt < new Date()) {
      await TeamInvite.findByIdAndUpdate(invite._id, { status: "expired" });
      return res.status(400).json({
        success: false,
        msg: "Invite has expired",
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

// Accept invitation
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
        msg: "Invite does not exist or has expired",
      });
    }

    // Check if expired
    if (invite.expiresAt < new Date()) {
      await TeamInvite.findByIdAndUpdate(invite._id, { status: "expired" });
      return res.status(400).json({
        success: false,
        msg: "Invite has expired",
      });
    }

    // Get current user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User does not exist",
      });
    }

    // Verify if email matches
    if (user.email !== invite.email) {
      return res.status(400).json({
        success: false,
        msg: "Email address does not match",
      });
    }

    // Get team info
    const team = await Team.findById(invite.teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        msg: "Team does not exist",
      });
    }

    // Check if already a member
    const isAlreadyMember = team.members.some((m) => m.userId.equals(userId));
    if (isAlreadyMember) {
      // Update invitation status
      await TeamInvite.findByIdAndUpdate(invite._id, { status: "accepted" });
      return res.status(400).json({
        success: false,
        msg: "You are already a team member",
      });
    }

    // Add user to team
    team.members.push({
      userId: userId,
      role: invite.role,
      joinedAt: new Date(),
    });
    await team.save();

    // Update invitation status
    await TeamInvite.findByIdAndUpdate(invite._id, { status: "accepted" });

    res.json({
      success: true,
      msg: "Successfully joined team",
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

// Reject invitation
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
        msg: "Invite does not exist or has expired",
      });
    }

    // Update invitation status
    await TeamInvite.findByIdAndUpdate(invite._id, { status: "rejected" });

    res.json({
      success: true,
      msg: "Invitation rejected",
    });
  } catch (err) {
    next(err);
  }
};
