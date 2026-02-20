import React from "react";
import { Knob } from "../Knob";

export const ClapPanel: React.FC = () => (
  <div className="grid grid-cols-3 gap-6">
    <Knob label="Decay" value={60} size={44} />
    <Knob label="Snap" value={55} size={44} />
    <Knob label="Tone" value={50} size={44} />
    <Knob label="Stereo" value={40} size={44} />
    <Knob label="Noise" value={70} size={44} />
    <Knob label="Body" value={45} size={44} />
  </div>
);
