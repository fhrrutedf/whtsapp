'use client';

import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ChannelType } from '@omni/types';

interface ComplianceBadgeProps {
  channel: ChannelType;
  windowExpiresAt?: string | null;
}

export function ComplianceBadge({ channel, windowExpiresAt }: ComplianceBadgeProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (channel !== 'WHATSAPP' && channel !== 'MESSENGER') {
      return;
    }

    if (!windowExpiresAt) {
      setIsExpired(true);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const expires = new Date(windowExpiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('00:00:00');
      } else {
        setIsExpired(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft(
          `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [channel, windowExpiresAt]);

  if (channel !== 'WHATSAPP' && channel !== 'MESSENGER') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        No Time Constraint
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/60 text-rose-300 text-xs font-semibold border border-rose-800/80 animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        24h Window Expired (Template Only)
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/50 text-emerald-300 text-xs font-semibold border border-emerald-800/60">
      <Clock className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
      24h Window Active: <span className="font-mono text-emerald-200">{timeLeft}</span>
    </div>
  );
}
