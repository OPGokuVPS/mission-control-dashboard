-- Migration: 005_fix_agent_activity_table.sql
-- Fix: add correction_applied column to agent_activity table

ALTER TABLE agent_activity ADD COLUMN IF NOT EXISTS correction_applied BOOLEAN DEFAULT FALSE;
