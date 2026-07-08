"use client";

import { MapPin, Activity, Sparkles } from "lucide-react";
import { Sheet } from "./sheet";
import { BodyMap } from "./body-map";
import { MUSCLE_LABELS } from "@/lib/types";
import type { MuscleGroup } from "@/lib/exercise-library";

// Plain-language cards so tapping a muscle tag explains what you're training,
// where it sits, what it does, and why it matters day to day. B2 English.
const MUSCLE_INFO: Record<
  MuscleGroup,
  { where: string; does: string; why: string }
> = {
  chest: {
    where: "The two big fan-shaped muscles across the front of your ribcage.",
    does: "Pushes things away from you and brings your arms in toward the middle.",
    why: "Pushing a door, a heavy cart, or getting up off the floor.",
  },
  back: {
    where: "The wide sheet of muscle from your armpits down to your lower spine.",
    does: "Pulls things toward you and pulls your body up toward a bar.",
    why: "Carrying bags, lifting things off the ground, and holding you upright.",
  },
  traps: {
    where: "The diamond of muscle across the top of your back and the base of your neck.",
    does: "Lifts and steadies your shoulder blades — think shrugging upward.",
    why: "Carrying heavy bags, good posture, and a strong, stable neck.",
  },
  shoulders: {
    where: "The rounded caps that sit on top of each upper arm.",
    does: "Lifts your arms out to the side, forward, and overhead.",
    why: "Reaching a high shelf or lifting anything above your head.",
  },
  biceps: {
    where: "The front of your upper arm, between shoulder and elbow.",
    does: "Bends your elbow and turns your palm up.",
    why: "Picking up and holding a heavy bag or a child.",
  },
  triceps: {
    where: "The back of your upper arm.",
    does: "Straightens your elbow. It is most of your arm's size.",
    why: "Pushing yourself up and any pressing motion.",
  },
  quads: {
    where: "The big muscles on the front of your thighs.",
    does: "Straightens your knee to stand up and drive out of a squat.",
    why: "Standing from a chair, climbing stairs, walking uphill.",
  },
  hamstrings: {
    where: "The back of your thighs, between hip and knee.",
    does: "Bends your knee and drives your hips forward.",
    why: "Walking, running, and bending down safely.",
  },
  glutes: {
    where: "Your buttocks, the largest muscle group in the body.",
    does: "Extends your hips and keeps your pelvis stable.",
    why: "Sprinting, jumping, and protecting your lower back.",
  },
  calves: {
    where: "The back of your lower leg, below the knee.",
    does: "Points your toes and pushes off the ground with each step.",
    why: "Walking, running, and standing on your toes.",
  },
  core: {
    where: "The muscles wrapping your midsection, front and sides.",
    does: "Keeps your spine steady and resists twisting.",
    why: "Almost every lift and staying stable when you carry weight.",
  },
  forearms: {
    where: "Between your elbow and wrist.",
    does: "Controls your grip and moves your wrist and fingers.",
    why: "Holding onto heavy things without your grip failing first.",
  },
};

export function MuscleInfoSheet({
  open,
  onClose,
  muscle,
}: {
  open: boolean;
  onClose: () => void;
  muscle: MuscleGroup;
}) {
  const info = MUSCLE_INFO[muscle];
  return (
    <Sheet open={open} onClose={onClose} title={MUSCLE_LABELS[muscle]}>
      <div className="space-y-4 pb-2">
        <div className="rounded-[var(--radius-md)] bg-surface-2 py-3">
          <BodyMap muscle={muscle} />
        </div>
        <Row icon={<MapPin size={16} aria-hidden="true" />} label="Where it is">
          {info.where}
        </Row>
        <Row icon={<Activity size={16} aria-hidden="true" />} label="What it does">
          {info.does}
        </Row>
        <Row icon={<Sparkles size={16} aria-hidden="true" />} label="Why it matters">
          {info.why}
        </Row>
      </div>
    </Sheet>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-accent" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-[0.7rem] font-medium uppercase tracking-wider text-muted">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-foreground">{children}</p>
      </div>
    </div>
  );
}
