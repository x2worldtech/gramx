import { getAvatarGradient, getInitials } from "../utils/avatarUtils";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  colorIndex?: number;
  avatarImage?: string | null;
}

const SIZE_MAP = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
};

export default function Avatar({
  name,
  size = "md",
  className = "",
  colorIndex,
  avatarImage,
}: AvatarProps) {
  const gradient =
    colorIndex !== undefined
      ? `avatar-gradient-${colorIndex + 1}`
      : getAvatarGradient(name);
  const initials = getInitials(name);
  const sizeClass = SIZE_MAP[size];

  if (avatarImage) {
    return (
      <div
        className={`${sizeClass} rounded-full flex-shrink-0 overflow-hidden ${className}`}
      >
        <img
          src={avatarImage}
          alt={name}
          className="w-full h-full object-cover rounded-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${gradient} rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white select-none ${className}`}
    >
      {initials}
    </div>
  );
}
