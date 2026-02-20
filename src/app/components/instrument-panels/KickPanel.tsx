import React from "react";
import { Knob } from "../Knob";

export const KickPanel: React.FC = () => (
  <div className="grid grid-cols-3 gap-6">
    <Knob label="Pitch" value={42} size={44} />
    <Knob label="Decay" value={65} size={44} />
    <Knob label="Punch" value={55} size={44} />
    <Knob label="Tone" value={50} size={44} />
    <Knob label="Drive" value={30} size={44} />
    <Knob label="Sub" value={70} size={44} />
  </div>
);
