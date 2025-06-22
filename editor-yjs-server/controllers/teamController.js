import Team from "../models/Team.js";
import TeamInvite from "../models/TeamInvite.js";
import User from "../models/User.js";

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
    const team = await Team.findById(req.params.teamId).populate(
      "members.userId",
      "username email"
    );
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

    const team = await Team.findById(teamId);
    const inviterRole = team.members.find((m) =>
      m.userId.equals(req.user.userId)
    )?.role;

    if (!team || !(inviterRole === "owner" || inviterRole === "admin")) {
      return res.status(403).json({ msg: "无权操作" });
    }

    const invitedUser = await User.findOne({ email });
    if (
      invitedUser &&
      team.members.some((m) => m.userId.equals(invitedUser._id))
    ) {
      return res.status(400).json({ msg: "用户已经是成员" });
    }

    const invite = new TeamInvite({
      teamId,
      email,
      role,
      invitedBy: req.user.userId,
    });
    await invite.save();
    // Here you would typically send an email to the user
    res.status(201).json({ msg: "邀请已发送" });
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
