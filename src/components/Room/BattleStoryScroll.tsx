interface Props {
  enemyIntent: string;
  lines: string[];
}

export const BattleStoryScroll = ({ enemyIntent, lines }: Props) => {
  const primary = lines[lines.length - 1] ?? 'The party braces for the first exchange.';

  return (
    <section className="story-scroll-shell">
      <div style={{ flex: 1 }} className="story-scroll">
        <div className="story-scroll__header">
          <div className="heading story-scroll__title">Battle Scroll</div>
          <div className="story-scroll__hint">Live field notes</div>
        </div>

        <div className="body-serif story-scroll__body" style={{ maxHeight: 132 }}>
          <div style={{ marginBottom: 8 }}>{primary}</div>
          <div style={{ borderLeft: '3px solid #b87758', paddingLeft: 10, color: '#56331b' }}>
            Enemy intent: {enemyIntent}
          </div>
          {lines.slice(0, -1).reverse().slice(0, 2).map((line, index) => (
            <div key={`${line}-${index}`} style={{ marginTop: 8, color: 'rgba(58,36,16,0.76)' }}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
