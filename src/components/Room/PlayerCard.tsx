import { WizardAvatar, HatGlyph, HeartIcon, BackpackIcon, HelpIcon, DoorIcon } from '../icons';
import { YANNI_TRAITS } from '../../data/campaign';
import { getCharacterInitial, getCharacterLabel, type CharacterProfile } from '../../lib/character';
import { useLobbyStore } from '../../store/lobbyStore';

interface Props {
  character?: CharacterProfile;
  hp?: number;
  maxHp?: number;
  xp: number;
}

const Chip = ({ label, color }: { label: string; color: 'purple' | 'green' | 'yellow' | 'red' }) => {
  const map = {
    purple: { bg: '#A78BFA', border: '#5b3ec9', text: '#1F0E4A' },
    green: { bg: '#6EE7B7', border: '#1f8f3a', text: '#0c4a1a' },
    yellow: { bg: '#FCD34D', border: '#B8902E', text: '#5C3F09' },
    red: { bg: '#F87171', border: '#7E1A1A', text: '#3A0606' },
  };
  const c = map[color];
  return (
    <div className="ui-num" style={{
      padding: '2px 8px',
      borderRadius: 4,
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      fontSize: 11,
      letterSpacing: '0.04em',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 1px rgba(0,0,0,0.4)',
    }}>{label}</div>
  );
};

export const PlayerCard = ({ character, hp = 8, maxHp = 10, xp }: Props) => {
  const openOverlay = useLobbyStore((state) => state.openOverlay);
  const stats = character?.traits ?? YANNI_TRAITS;
  const resolvedHp = character?.hp ?? hp;
  const resolvedMaxHp = character?.maxHp ?? maxHp;
  const resolvedXp = character?.xp ?? xp;
  const name = character?.name ?? 'Yanni';
  const classLabel = character ? getCharacterLabel(character.classKey) : 'Wizard';

  const buttons = [
    { icon: <BackpackIcon size={22} />, label: 'INVENTORY', overlay: 'inventory' as const },
    { icon: <HelpIcon size={22} />, label: 'HELP', overlay: 'help' as const },
    { icon: <DoorIcon size={22} />, label: 'LEAVE', overlay: 'leave' as const },
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 8px',
      background: 'linear-gradient(180deg,#1A2B47,#0F1B2D)',
      borderTop: '2px solid rgba(232,199,96,0.4)',
      minHeight: 120,
      flexShrink: 0,
    }}>
      <div style={{ flexShrink: 0, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}>
        <div style={{ position: 'relative', width: 86, height: 86 }}>
          <WizardAvatar size={86} />
          <div style={{
            position: 'absolute',
            right: -4,
            bottom: -4,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: character?.accent ?? '#A78BFA',
            border: '2px solid #E8C760',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Cinzel, serif',
            fontSize: 12,
            fontWeight: 700,
            color: '#1F1408',
          }}>
            {getCharacterInitial(name)}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <div className="body-serif" style={{ fontSize: 24, color: '#FFEFCB', fontWeight: 500, letterSpacing: '0.02em' }}>
            {name}
          </div>
          <div className="ui-num" style={{ fontSize: 10, color: '#A99668' }}>{resolvedXp} XP</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <HatGlyph size={14} />
          <div className="body-serif" style={{ fontSize: 14, color: character?.accent ?? '#A78BFA', fontStyle: 'italic' }}>
            {classLabel} Â· Lvl {character?.level ?? 3}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <HeartIcon size={16} />
          <div className="ui-num" style={{ fontSize: 12, color: '#FFEFCB', minWidth: 38 }}>
            {resolvedHp} / {resolvedMaxHp}
          </div>
          <div style={{
            flex: 1,
            height: 10,
            borderRadius: 6,
            background: 'linear-gradient(180deg,#0a0a0a,#1a1a1a)',
            border: '1px solid rgba(0,0,0,0.7)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              width: `${(resolvedHp / resolvedMaxHp) * 100}%`,
              height: '100%',
              background: 'linear-gradient(180deg,#86F2A0,#22863a)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
              transition: 'width 0.5s ease',
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '40%',
                background: 'linear-gradient(180deg,rgba(255,255,255,0.3),transparent)',
              }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Chip label={`INT +${stats.INT}`} color="purple" />
          <Chip label={`ATH +${stats.ATH}`} color="green" />
          <Chip label={`ING +${stats.ING}`} color="yellow" />
          <Chip label={`CHA +${stats.CHA}`} color="red" />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
        {buttons.map((button) => (
          <button
            key={button.label}
            onClick={() => openOverlay(button.overlay)}
            style={{
              width: 54,
              padding: '2px 0',
              background: 'linear-gradient(180deg,#E8D9B4,#A99668)',
              border: '1.5px solid #5C3F09',
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            {button.icon}
            <div className="heading" style={{ fontSize: 7, color: '#3A2410', letterSpacing: '0.06em' }}>
              {button.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
