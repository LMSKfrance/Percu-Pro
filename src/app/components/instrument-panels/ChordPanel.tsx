import React from "react";
import { Knob } from "../Knob";

export const ChordPanel: React.FC = () => (
  <div className="grid grid-cols-3 gap-6">
    <Knob label="Root" value={50} size={44} />
    <Knob label="Shape" value={40} size={44} />
    <Knob label="Decay" value={55} size={44} />
    <Knob label="Detune" value={15} size={44} />
    <Knob label="Filter" value={60} size={44} />
    <Knob label="Reso" value={30} size={44} />
  </div>
);
