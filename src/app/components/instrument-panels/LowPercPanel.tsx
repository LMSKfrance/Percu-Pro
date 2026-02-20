import React from "react";
import { Knob } from "../Knob";

export const LowPercPanel: React.FC = () => (
  <div className="grid grid-cols-3 gap-6">
    <Knob label="Tune" value={38} size={44} />
    <Knob label="Decay" value={55} size={44} />
    <Knob label="Punch" value={35} size={44} />
    <Knob label="Color" value={45} size={44} />
    <Knob label="Shape" value={50} size={44} />
    <Knob label="Noise" value={25} size={44} />
  </div>
);
