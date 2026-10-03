import { ArrowRight, BookOpen, Check, Compass, MessageCircle } from 'lucide-react';
import type { buildStoryTable } from '../../lib/dropinn/storyTablePresentation';
import type { ExpeditionInteraction } from '../../lib/dropinn/expeditionTypes';
import './gemward-story-table.css';

type StoryTable = ReturnType<typeof buildStoryTable>;

/** The story remains readable between turns; opening or preparing never commits. */
export function GemwardStoryTable({ model, topics, selectedTopic, selectedPlan, disabled, resting, combat, status, blockingReason, onTopic, onPlan, onRead }: {
  model: StoryTable; topics: ExpeditionInteraction[]; selectedTopic?: string; selectedPlan: boolean;
  disabled: boolean; resting: boolean; combat: boolean; status?: string; blockingReason?: string;
  onTopic: (id: string) => void; onPlan: () => void; onRead: () => void;
}) {
  const focused = !resting && model.focus;
  const last = model.lastTurn;
  const mainText = blockingReason || (focused ? focused.body : last?.text ?? model.situation);
  const conversationTopics = topics.filter(topic => !topic.id.startsWith('story-plan:'));
  return <section className={`gm-story-table ${focused ? 'has-focus' : ''} ${resting ? 'is-resting' : ''}`} aria-label="The story at your table" tabIndex={0} data-story-table>
    <div className="gm-story-copy" aria-live="polite">
      <div className="gm-story-heading"><span><MessageCircle size={14} aria-hidden="true" />{focused ? focused.title : last?.title ?? model.title}</span><button type="button" onClick={onRead} aria-label="Read the current situation"><BookOpen size={17} /></button></div>
      <p className="gm-story-situation" data-story-situation>{mainText}</p>
      {focused && focused.alreadyDone && <p className="gm-story-known"><Check size={13} />Already established. This move offers support.</p>}
      {!focused && !combat && <p className="gm-story-question" data-story-question>{model.question}</p>}
      {focused && last && <p className="gm-story-memory" data-story-last-turn={last.id}><Check size={13} /><span>{last.title}</span><span className="gm-story-memory-copy">{last.text}</span></p>}
      {!focused && last && <span className="gm-story-last-marker" data-story-last-turn={last.id} />}
    </div>
    <div className="gm-story-intentions">
      {!resting && !combat && conversationTopics.length > 0 && !selectedPlan && <div className="gm-story-topics" aria-label="Choose your intention">{conversationTopics.slice(0, 2).map(topic => <button key={topic.id} type="button" data-gemward-interaction={topic.id} aria-pressed={selectedTopic === topic.id} disabled={disabled} onClick={() => onTopic(topic.id)}>{selectedTopic === topic.id && <Check size={14} />}<span>{topic.label}</span></button>)}</div>}
      {!resting && !combat && model.plan && (selectedPlan || model.plan.available) && <div className="gm-story-plan"><button type="button" data-story-plan aria-pressed={selectedPlan} disabled={disabled || !model.plan.available} onClick={onPlan}><Compass size={17} /><span>{selectedPlan ? `Prepared: ${model.plan.label}` : model.plan.label}</span>{!selectedPlan && <ArrowRight size={16} />}</button>{!model.plan.available && <small>{model.plan.reason ?? model.remaining}</small>}</div>}
      {status && <p className="gm-story-status" role="status">{status}</p>}
      {model.remainingLabel && <small className="gm-story-budget" title={model.remaining}>{model.remainingLabel}</small>}
    </div>
  </section>;
}

export function GemwardStorySteps({ steps }: { steps: StoryTable['chapterSteps'] }) {
  return <ol className="gm-story-steps" aria-label="What this chapter needs">{steps.map(step => <li key={step.label} data-story-step={step.state} className={`is-${step.state}`} aria-current={step.state === 'current' ? 'step' : undefined}>{step.state === 'done' ? <Check size={12} /> : <i />}<span>{step.label}</span></li>)}</ol>;
}

export function GemwardStoryDetail({ model }: { model: StoryTable }) {
  return <div className="gm-story-detail"><h3>{model.title}</h3><p>{model.situation}</p><strong>{model.question}</strong>{model.lastTurn && <section><h4>{model.lastTurn.title}</h4><p>{model.lastTurn.text}</p><p>{model.lastTurn.detail}</p></section>}{model.focus && <section><h4>{model.focus.title}</h4><p>{model.focus.body}</p><p>{model.focus.stake}</p></section>}{model.remaining && <p>{model.remaining}</p>}<ul>{model.opportunities.map(item => <li key={item.id}><strong>{item.done && <Check size={14} />}{item.label}</strong><p>{item.detail}</p></li>)}</ul></div>;
}
