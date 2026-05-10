import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useLobbyStore } from '../../store/lobbyStore';
import { ACTIONS_BY_ROUND, BOT_PLAYS_BY_ROUND, SCENE_TYPE_BY_ROUND } from '../../data/campaign';
import { ROUND_INTROS, SPOTLIGHT_OUTCOMES } from '../../data/outcomes';
import { resolveAction } from '../../lib/engine';
import type { Action } from '../../data/campaign';
import type { RollResult } from '../../lib/engine';

import { CampaignBanner } from './CampaignBanner';
import { SceneHeader } from './SceneHeader';
import { StoryScroll } from './StoryScroll';
import { SharedTable } from './SharedTable';
import { ActionTray } from './ActionTray';
import { SpotlightRow } from './SpotlightRow';
import { PlayerCard } from './PlayerCard';
import { DragLayer } from './DragLayer';
import { IntroHint } from './IntroHint';
import { RewardCard } from './RewardCard';
import { TapConfirmPopover } from './TapConfirmPopover';

export const Room = () => {
  const g = useGameStore();
  const lobby = useLobbyStore();

  const dropZoneRef = useRef<HTMLDivElement>(null);
  const stageRef    = useRef<HTMLDivElement>(null);
  const tableRef    = useRef<HTMLDivElement | null>(null);
  const persuadeCoinRef = useRef<HTMLDivElement>(null);
  const trailIdRef  = useRef(0);

  const spotlightTokens = lobby.spotlightTokens;
  const pendingSpotlight = g.pendingSpotlight;

  /* -------- scene sequence -------- */
  const startSequence = useCallback(() => {
    const round = useGameStore.getState().sceneRound;
    const introText = ROUND_INTROS[round] ?? ROUND_INTROS[1];
    g.resetForNewRound(introText);
    g.bumpStoryKey();

    const bots = BOT_PLAYS_BY_ROUND[round] ?? BOT_PLAYS_BY_ROUND[1];

    setTimeout(() => {
      g.setPhase('bots');
      g.setEnvelopes(prev => ({
        ...prev,
        bram: { appearing: true, sealFlash: true, revealed: false, actionLabel: bots.bram.label },
      }));
      setTimeout(() => g.setEnvelopes(prev => {
        const e = { ...prev };
        if (e.bram) e.bram = { ...e.bram, appearing: false, sealFlash: false };
        return e;
      }), 700);
    }, 800);

    setTimeout(() => {
      g.setEnvelopes(prev => ({
        ...prev,
        aria: { appearing: true, sealFlash: true, revealed: false, actionLabel: bots.aria.label },
      }));
      setTimeout(() => g.setEnvelopes(prev => {
        const e = { ...prev };
        if (e.aria) e.aria = { ...e.aria, appearing: false, sealFlash: false };
        return e;
      }), 700);
    }, 2000);

    setTimeout(() => {
      g.setPhase('player');
      const stage = stageRef.current;
      const coin  = persuadeCoinRef.current;
      if (stage && coin) {
        const sr = stage.getBoundingClientRect();
        const cr = coin.getBoundingClientRect();
        g.setHint({ visible: true, x: cr.left - sr.left + 22, y: cr.top - sr.top + 18 });
      }
    }, 3200);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { startSequence(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------- timer countdown -------- */
  useEffect(() => {
    if (g.phase !== 'player') return;
    if (g.timer <= 0) {
      // Auto-commit the last action in the current round's set (lowest-risk fallback)
      const round = useGameStore.getState().sceneRound;
      const roundActions = ACTIONS_BY_ROUND[round] ?? ACTIONS_BY_ROUND[1];
      commitAction(roundActions[roundActions.length - 1]);
      return;
    }
    const id = setInterval(() => g.setTimer(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [g.phase, g.timer]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------- commit action -------- */
  const commitAction = useCallback((action: Action) => {
    if (useGameStore.getState().phase !== 'player') return;
    g.setHint({ visible: false, x: 0, y: 0 });
    g.setTapAction(null);

    let result = resolveAction(action.id);

    // inject pending spotlight into narrative
    const pending = useGameStore.getState().pendingSpotlight;
    if (pending && result) {
      const idx = Math.floor(Math.random() * SPOTLIGHT_OUTCOMES.length);
      result = { ...result, narrative: SPOTLIGHT_OUTCOMES[idx] };
      g.appendStoryEntry({
        turn: useGameStore.getState().turn,
        text: SPOTLIGHT_OUTCOMES[idx],
        kind: 'spotlight',
        spotlightText: pending,
        roll: result,
      });
      g.setPendingSpotlight(null);
    }

    g.setRollResult(result);
    g.setHiddenAction(action.id);
    g.setEnvelopes(prev => ({
      ...prev,
      yanni: { appearing: true, sealFlash: true, revealed: false, actionLabel: `${action.label} Gremlin` },
    }));

    setTimeout(() => {
      g.setEnvelopes(prev => {
        const e = { ...prev };
        if (e.yanni) e.yanni = { ...e.yanni, appearing: false, sealFlash: false };
        return e;
      });
      triggerReveal(result);
    }, 700);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------- reveal sequence -------- */
  const triggerReveal = useCallback((result: RollResult | null) => {
    g.setPhase('reveal');
    const order = ['yanni', 'bram', 'aria'];
    order.forEach((id, i) => {
      setTimeout(() => {
        g.setEnvelopes(prev => {
          const e = { ...prev };
          if (e[id]) e[id] = { ...e[id], revealed: true };
          return e;
        });
      }, 350 + i * 180);
    });

    setTimeout(() => {
      g.setPhase('resolve');
      const narrative = result?.narrative ?? '';
      g.setCurrentStoryText(narrative);
      g.bumpStoryKey();
      g.appendStoryEntry({
        turn: useGameStore.getState().turn,
        text: narrative,
        kind: 'resolution',
        roll: result ?? undefined,
      });
    }, 1500);

    setTimeout(() => {
      g.setPhase('reward');
      const currentRound = useGameStore.getState().sceneRound;
      if (currentRound >= 3) {
        lobby.onSceneComplete(result);
      }
    }, 2900);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------- continue reward -------- */
  const onContinueReward = useCallback(() => {
    g.setDismissing(true);
    setTimeout(() => {
      g.setDismissing(false);
      const currentRound = useGameStore.getState().sceneRound;
      if (currentRound >= 3) {
        lobby.onLeave();
      } else {
        g.setSceneRound(currentRound + 1);
        g.setTurn(t => t + 1);
        startSequence();
      }
    }, 460);
  }, [startSequence]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------- drag handling -------- */
  const onPointerDown = useCallback((e: React.PointerEvent, action: Action) => {
    if (useGameStore.getState().phase !== 'player') return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const stage = stageRef.current;
    if (!stage) return;
    const sr = stage.getBoundingClientRect();
    g.setHint({ visible: false, x: 0, y: 0 });
    g.setDrag({
      Coin: action.Coin,
      action,
      actionId: action.id,
      x: e.clientX - sr.left,
      y: e.clientY - sr.top,
      hover: false,
      trail: [],
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!g.drag) return;
    const stage = stageRef.current;
    if (!stage) return;

    const onMove = (e: PointerEvent) => {
      const sr = stage.getBoundingClientRect();
      const x = e.clientX - sr.left;
      const y = e.clientY - sr.top;
      const dz = dropZoneRef.current;
      let hover = false;
      if (dz) {
        const d = dz.getBoundingClientRect();
        const cx = d.left + d.width / 2, cy = d.top + d.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        hover = Math.sqrt(dx * dx + dy * dy) < 60;
      }
      g.setDropZoneHot(hover);
      const id = ++trailIdRef.current;
      g.setDrag(prev => prev ? ({
        ...prev,
        x, y, hover,
        trail: [
          ...prev.trail.map(t => ({ ...t, life: t.life - 0.08 })).filter(t => t.life > 0),
          { id, x, y, life: 1 },
        ].slice(-22),
      }) : prev);
    };

    const onUp = (e: PointerEvent) => {
      const dz = dropZoneRef.current;
      let dropped = false;
      if (dz) {
        const d = dz.getBoundingClientRect();
        const cx = d.left + d.width / 2, cy = d.top + d.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        dropped = Math.sqrt(dx * dx + dy * dy) < 60;
      }
      const action = g.drag?.action;
      g.setDrag(null);
      g.setDropZoneHot(false);
      if (dropped && action) commitAction(action);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [g.drag, commitAction]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------- spotlight commit -------- */
  const onSpotlightCommit = useCallback((text: string) => {
    g.setPendingSpotlight(text);
    lobby.onSpotlightCommit(text);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isSceneComplete = g.phase === 'reward' && g.sceneRound >= 3;
  const currentActions = ACTIONS_BY_ROUND[g.sceneRound] ?? ACTIONS_BY_ROUND[1];
  const currentSceneType = SCENE_TYPE_BY_ROUND[g.sceneRound] ?? 'social';

  return (
    <div
      ref={stageRef}
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#0F1B2D',
      }}
    >
      <CampaignBanner/>
      <SceneHeader turn={g.turn}/>
      <StoryScroll
        text={g.currentStoryText}
        refreshKey={g.storyKey}
        rollResult={g.rollResult}
        storyLog={g.storyLog}
      />
      <SharedTable
        envelopes={g.envelopes}
        dropZoneHot={g.dropZoneHot}
        dropZoneRef={dropZoneRef}
        onTableMount={el => { tableRef.current = el; }}
      />
      <ActionTray
        actions={currentActions}
        sceneType={currentSceneType}
        coinRef={persuadeCoinRef}
        onPointerDown={onPointerDown}
        onTapAction={a => { g.setHint({ visible: false, x: 0, y: 0 }); g.setTapAction(a); }}
        draggingActionId={g.drag?.actionId ?? null}
        hiddenActionId={g.hiddenAction}
        timer={g.timer}
        phase={g.phase}
      />
      <SpotlightRow tokensLeft={spotlightTokens}/>
      <PlayerCard xp={lobby.xp} hp={8} maxHp={10}/>

      {/* floating drag layer */}
      <DragLayer drag={g.drag}/>
      <IntroHint visible={g.hint.visible} originX={g.hint.x} originY={g.hint.y}/>

      {/* tap-confirm popover */}
      {g.tapAction && (
        <TapConfirmPopover
          action={g.tapAction}
          onCancel={() => g.setTapAction(null)}
          onConfirm={commitAction}
        />
      )}

      {/* reward card */}
      {g.phase === 'reward' && (
        <RewardCard
          onContinue={onContinueReward}
          dismissing={g.dismissing}
          rollResult={g.rollResult}
          sceneRound={g.sceneRound}
          isSceneComplete={isSceneComplete}
          onSpotlightCommit={onSpotlightCommit}
        />
      )}
    </div>
  );
};
