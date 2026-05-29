interface Props {
  label: string;
  glyph: string;
  topColor: string;
  edgeColor: string;
  glowColor: string;
  size?: number;
  isActive?: boolean;
}

export const ActionChip3D = ({
  label,
  glyph,
  topColor,
  edgeColor,
  glowColor,
  size = 84,
  isActive = true,
}: Props) => {
  return (
    <div
      className={`action-chip3d ${isActive ? 'action-chip3d--active' : ''}`}
      style={{
        width: size,
        height: size,
        ['--chip-top' as string]: topColor,
        ['--chip-edge' as string]: edgeColor,
        ['--chip-glow' as string]: glowColor,
      }}
    >
      <div className="action-chip3d__shadow" />
      <div className="action-chip3d__body">
        <div className="action-chip3d__rim" />
        <div className="action-chip3d__face">
          <div className="action-chip3d__glyph">{glyph}</div>
          <div className="action-chip3d__label">{label}</div>
        </div>
      </div>
    </div>
  );
};
