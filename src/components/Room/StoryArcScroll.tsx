interface Props {
  chapter: string;
  sceneTitle: string;
  objective: string;
  clues: Array<{ id: string; label: string }>;
  setbackCount: number;
  lines: string[];
  currentText: string;
}

export const StoryArcScroll = ({
  chapter,
  sceneTitle,
  objective,
  clues,
  setbackCount,
  lines,
  currentText,
}: Props) => {
  const recentLines = lines.filter((line) => line !== currentText).slice(-2).reverse();

  return (
    <section className="story-scroll-shell">
      <div style={{ flex: 1 }} className="story-scroll">
        <div className="story-scroll__header">
          <div className="heading story-scroll__title">Story Arc</div>
          <div className="story-scroll__hint">{chapter} · {sceneTitle}</div>
        </div>

        <div className="body-serif story-scroll__body" style={{ maxHeight: 196, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>{currentText}</div>

          <div style={{ borderLeft: '3px solid #b87758', paddingLeft: 10, color: '#56331b' }}>
            Objective: {objective}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.12em', color: '#6A4A24' }}>
              Leads {clues.length}
            </div>
            {clues.length > 0 ? clues.map((clue) => (
              <div key={clue.id} style={{ color: '#56331b' }}>
                {clue.label}
              </div>
            )) : (
              <div style={{ color: 'rgba(58,36,16,0.76)' }}>
                No solid leads yet.
              </div>
            )}
          </div>

          <div style={{ color: '#7A241C' }}>
            Setbacks: {setbackCount}
          </div>

          {recentLines.map((line, index) => (
            <div key={`${line}-${index}`} style={{ color: 'rgba(58,36,16,0.76)' }}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
