import { Camera, Coffee, MapPin, Compass, Plane, BookOpen } from "lucide-react";
import { seededValue } from "@/utils/photoStyle";

const objectTypes = [Camera, Coffee, MapPin, Compass, Plane, BookOpen];

export function TableObject({ seed }: { seed: string }) {
  const iconIndex = Math.floor(Math.abs(seededValue(seed + "t", 0, objectTypes.length - 0.001)));
  const Icon = objectTypes[iconIndex];
  const x = seededValue(seed + "ox", 8, 72);
  const rot = seededValue(seed + "or", -20, 20);
  const size = Math.round(seededValue(seed + "os", 28, 40));

  return (
    <div
      style={{
        position: "relative",
        height: size + 16,
        marginBottom: -size * 0.3,
        pointerEvents: "none",
        zIndex: 7,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: 8,
          transform: `rotate(${rot}deg)`,
          filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))",
          color: "rgba(200, 165, 100, 0.5)",
        }}
      >
        <Icon size={size} strokeWidth={1.2} />
      </div>
    </div>
  );
}
