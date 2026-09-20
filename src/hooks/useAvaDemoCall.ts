import { useEffect, useMemo, useRef, useState } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { startPublicDemoCall } from '../api/api';

export interface AvaDemoCallResult {
  access_token: string;
  call_id: string;
  agent_name?: string;
}

type Handlers = {
  onStarted?: () => void;
  onEnded?: () => void;
  onError?: (error: unknown) => void;
  onTalkingChange?: (talking: boolean) => void;
  onTranscript?: (transcript: { role: string; content: string }[]) => void;
};

type RetellClientControls = {
  mute?: () => void;
  unmute?: () => void;
  room?: { localParticipant?: { setMicrophoneEnabled: (enabled: boolean) => void } };
};

/** Shared browser-side Retell flow used by the homepage and Conference. */
export function useAvaDemoCall(handlers: Handlers = {}) {
  const client = useMemo(() => new RetellWebClient(), []);
  const latest = useRef(handlers);
  const starting = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [agentName, setAgentName] = useState('Peoplix AI Agent');

  useEffect(() => { latest.current = handlers; }, [handlers]);

  useEffect(() => {
    const started = () => { starting.current = false; setIsConnected(true); setIsLoading(false); latest.current.onStarted?.(); };
    const ended = () => { starting.current = false; setIsConnected(false); setIsLoading(false); setIsMuted(false); latest.current.onTalkingChange?.(false); latest.current.onEnded?.(); };
    const failed = (error: unknown) => { starting.current = false; setIsConnected(false); setIsLoading(false); setIsMuted(false); latest.current.onTalkingChange?.(false); latest.current.onError?.(error); };
    const agentStarted = () => latest.current.onTalkingChange?.(true);
    const agentStopped = () => latest.current.onTalkingChange?.(false);
    const updated = (data: { transcript?: { role: string; content: string }[] }) => {
      if (data.transcript) latest.current.onTranscript?.(data.transcript);
    };
    client.on('call_started', started);
    client.on('call_ended', ended);
    client.on('error', failed);
    client.on('agent_start_talking', agentStarted);
    client.on('agent_stop_talking', agentStopped);
    client.on('update', updated);
    return () => {
      client.off('call_started'); client.off('call_ended'); client.off('error');
      client.off('agent_start_talking'); client.off('agent_stop_talking'); client.off('update');
    };
  }, [client]);

  async function start(createCall: () => Promise<AvaDemoCallResult> = startPublicDemoCall) {
    if (starting.current || isConnected) return;
    starting.current = true;
    setIsLoading(true);
    try {
      const call = await createCall();
      if (call.agent_name) setAgentName(call.agent_name);
      await client.startCall({ accessToken: call.access_token });
      return call;
    } catch (error) {
      starting.current = false;
      setIsConnected(false);
      setIsLoading(false);
      setIsMuted(false);
      throw error;
    }
  }

  function stop() { client.stopCall(); }
  function toggleMute() {
    const nextMuted = !isMuted;
    const internal = client as unknown as RetellClientControls;
    // Newer SDK versions expose these methods; older versions retain the
    // LiveKit room. Supporting both preserves the homepage's working path.
    if (typeof internal.mute === 'function' && typeof internal.unmute === 'function') {
      if (nextMuted) internal.mute();
      else internal.unmute();
      setIsMuted(nextMuted);
      return true;
    }
    if (!internal.room?.localParticipant) return false;
    internal.room.localParticipant.setMicrophoneEnabled(!nextMuted);
    setIsMuted(nextMuted);
    return true;
  }
  async function enableAudioPlayback() { await client.startAudioPlayback(); }

  return { start, stop, toggleMute, enableAudioPlayback, isLoading, isConnected, isMuted, agentName, client };
}
