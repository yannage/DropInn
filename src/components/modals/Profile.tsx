import { useMemo, useState } from 'react';
import {
  CHARACTER_CLASS_PRESETS,
  getCharacterInitial,
  getCharacterLabel,
  type CharacterClassKey,
} from '../../lib/character';
import { useLobbyStore } from '../../store/lobbyStore';
import { getSelectedCharacter, usePlayerStore } from '../../store/playerStore';
import { Modal } from './Modal';

export const Profile = () => {
  const closeOverlay = useLobbyStore((state) => state.closeOverlay);
  const characters = usePlayerStore((state) => state.characters);
  const createCharacter = usePlayerStore((state) => state.createCharacter);
  const selectCharacter = usePlayerStore((state) => state.selectCharacter);
  const selectedCharacter = usePlayerStore(getSelectedCharacter);
  const [characterName, setCharacterName] = useState('');
  const [classKey, setClassKey] = useState<CharacterClassKey>('wizard');

  const inventoryLabel = useMemo(() => {
    if (!selectedCharacter) return 'No gear';
    return selectedCharacter.inventory.length > 0
      ? selectedCharacter.inventory.join(', ')
      : 'No special loot yet';
  }, [selectedCharacter]);

  const handleCreateCharacter = () => {
    const created = createCharacter(characterName, classKey);
    if (created) {
      setCharacterName('');
    }
  };

  return (
    <Modal
      title="Profile"
      onClose={closeOverlay}
      footer={<button className="btn-secondary" onClick={closeOverlay}>Close</button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {selectedCharacter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: selectedCharacter.accent,
                border: '2px solid #E8C760',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Cinzel, serif',
                fontWeight: 700,
                fontSize: 22,
                color: '#1F1408',
              }}
            >
              {getCharacterInitial(selectedCharacter.name)}
            </div>
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#E8C760' }}>
                {selectedCharacter.name}
              </div>
              <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 12, color: '#A99668' }}>
                {getCharacterLabel(selectedCharacter.classKey)} · Level {selectedCharacter.level}
              </div>
            </div>
          </div>
        )}

        {selectedCharacter && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {[
              { label: 'Total XP', value: `${selectedCharacter.xp} XP` },
              { label: 'Hit Points', value: `${selectedCharacter.hp}/${selectedCharacter.maxHp}` },
              { label: 'Spotlight', value: `${selectedCharacter.spotlightTokens} tokens` },
              { label: 'Inventory', value: inventoryLabel },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(232,199,96,0.05)',
                  border: '1px solid rgba(232,199,96,0.12)',
                }}
              >
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#7a6a44' }}>
                  {row.label}
                </div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#FFE9A8', marginTop: 4 }}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <div
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 10,
              letterSpacing: '0.16em',
              color: '#7a6a44',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Saved Heroes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {characters.map((character) => {
              const preset = CHARACTER_CLASS_PRESETS[character.classKey];
              const selected = selectedCharacter?.id === character.id;
              return (
                <button
                  key={character.id}
                  onClick={() => selectCharacter(character.id)}
                  style={{
                    borderRadius: 8,
                    border: selected ? '1.5px solid #E8C760' : '1px solid rgba(232,199,96,0.14)',
                    background: selected
                      ? 'linear-gradient(180deg, rgba(232,199,96,0.2), rgba(27,44,74,0.92))'
                      : 'linear-gradient(180deg, rgba(27,44,74,0.92), rgba(14,26,48,0.96))',
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#FFE9A8',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: preset.accent,
                        border: '1.5px solid rgba(255,239,203,0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'Cinzel, serif',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#1F1408',
                      }}
                    >
                      {getCharacterInitial(character.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#FFE9A8' }}>
                        {character.name}
                      </div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#A99668' }}>
                        {preset.label} · {character.xp} XP · HP {character.hp}/{character.maxHp}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            borderTop: '1px dashed rgba(232,199,96,0.15)',
            paddingTop: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 10,
              letterSpacing: '0.16em',
              color: '#7a6a44',
              textTransform: 'uppercase',
            }}
          >
            Create New Hero
          </div>
          <input
            value={characterName}
            onChange={(event) => setCharacterName(event.target.value.slice(0, 18))}
            placeholder="Character name"
            style={{
              width: '100%',
              minHeight: 42,
              borderRadius: 8,
              border: '1px solid rgba(232,199,96,0.28)',
              background: 'rgba(0,0,0,0.22)',
              color: '#FFE9A8',
              padding: '0 12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {(Object.keys(CHARACTER_CLASS_PRESETS) as CharacterClassKey[]).map((key) => {
              const preset = CHARACTER_CLASS_PRESETS[key];
              const active = classKey === key;
              return (
                <button
                  key={key}
                  onClick={() => setClassKey(key)}
                  style={{
                    borderRadius: 8,
                    border: active ? '1.5px solid #E8C760' : '1px solid rgba(232,199,96,0.14)',
                    background: active
                      ? 'linear-gradient(180deg, rgba(232,199,96,0.24), rgba(27,44,74,0.96))'
                      : 'linear-gradient(180deg, rgba(27,44,74,0.92), rgba(14,26,48,0.96))',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    color: '#FFE9A8',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11 }}>{preset.label}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: '#A99668', marginTop: 4 }}>
                    HP {preset.hp} · INT {preset.traits.INT} · ATH {preset.traits.ATH}
                  </div>
                </button>
              );
            })}
          </div>
          <button className="btn-primary" onClick={handleCreateCharacter} disabled={characterName.trim().length < 2}>
            Create And Select
          </button>
        </div>
      </div>
    </Modal>
  );
};
