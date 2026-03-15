"use strict";

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

/** GET /api/teams */
router.get("/", async (req, res) => {
  try {
    const rows = await req.catalyst.datastore().table("Machines").getAllRows();
    // Teams are derived from distinct team_id values; in a real app there'd be a Teams table.
    // Return a synthetic list for now.
    const teamMap = {};
    rows.forEach((m) => {
      if (m.team_id) {
        teamMap[m.team_id] = teamMap[m.team_id] || { team_id: m.team_id, machines: [] };
        teamMap[m.team_id].machines.push(m.machine_id);
      }
    });
    res.json(Object.values(teamMap));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/teams */
router.post("/", async (req, res) => {
  // In a full implementation, teams would have their own DataStore table.
  const { name, parentTeamId } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });

  const team = {
    team_id: `team-${uuidv4().slice(0, 8)}`,
    name,
    parent_team_id: parentTeamId || null,
    owner_email: req.user.email,
    created_at: new Date().toISOString(),
  };

  res.status(201).json(team);
});

/** POST /api/teams/:teamId/members */
router.post("/:teamId/members", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "email is required" });
  // Membership management would update a Teams DataStore table
  res.json({ ok: true, teamId: req.params.teamId, email });
});

/** DELETE /api/teams/:teamId/members/:email */
router.delete("/:teamId/members/:email", async (req, res) => {
  res.json({ ok: true, teamId: req.params.teamId, email: req.params.email });
});

module.exports = router;
