import React from "react";
import { Knob } from "../Knob";

export const SubPercPanel: React.FC = () => (
  <div className="grid grid-cols-3 gap-6">
    <Knob label="Tune" value={28} size={44} />
    <Knob label="Decay" value={50} size={44} />
    <Knob label="Punch" value={40} size={44} />
    <Knob label="Shape" value={35} size={44} />
    <Knob label="Noise" value={15} size={44} />
    <Knob label="Filter" value={45} size={44} />
  </div>
);
