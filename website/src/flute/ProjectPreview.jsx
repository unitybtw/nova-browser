"use client";
import React from "react";
import { ProjectPreview } from "@webprodigies/flute/preview";
import { sceneModules } from "./catalog";
// Host-owned development flag: no process, Vite or Electron globals in this adapter.
export function FluteProjectPreview({ children, enabled, active, ...props }) {
  if (!enabled) return children;
  return <ProjectPreview {...props} projectId="a6251228-fd03-4957-8d3c-2d943c720807" enabled={enabled} active={active} sceneModules={sceneModules}>{children}</ProjectPreview>;
}
