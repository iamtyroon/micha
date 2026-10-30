import React, { useRef, useState } from 'react';
import { DriverPublic, PointsConfig, RallyRound, Team } from '../types/aerc';
import { calculateDriverStandings } from '../utils/championshipEngine';
import { Download, X, Check } from 'lucide-react';

interface ShareGraphicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rounds: RallyRound[];
  drivers: DriverPublic[];
  teams: Team[];
  pointsConfig: PointsConfig;
  initialRoundId?: string;
}

type AspectPreset = 'whatsapp' | 'instagram' | 'x_landscape';

export const ShareGraphicsModal: React.FC<ShareGraphicsModalProps> = ({
  isOpen,
  onClose,
  rounds,
  drivers,
  teams,
  pointsConfig,
  initialRoundId,
}) => {
  const [preset, setPreset] = useState<AspectPreset>('whatsapp');
  const [cardType, setCardType] = useState<'standings' | 'round'>('standings');
  const [selectedRoundId] = useState<string>(
    initialRoundId || rounds[0]?.id || ''
  );
  const [downloadedNotice, setDownloadedNotice] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const standings = calculateDriverStandings(drivers, teams, rounds, pointsConfig);
  const top6 = standings.slice(0, 6);
  const selectedRound = rounds.find((r) => r.id === selectedRoundId) || rounds[0];

  const handleDownloadPng = () => {
    const canvas = document.createElement('canvas');
    const width = preset === 'x_landscape' ? 1200 : 1080;
    const height = preset === 'whatsapp' ? 1920 : preset === 'instagram' ? 1350 : 675;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#090B0E';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#E11D48';
      ctx.fillRect(0, 0, width, 16);

      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 28px monospace';
      ctx.fillText('AFRICAN ESPORTS RALLY CHAMPIONSHIP · SIM RACING KENYA', 60, 85);

      ctx.fillStyle = '#F4F5F7';
      ctx.font = 'bold 64px sans-serif';
      const title =
        cardType === 'standings'
          ? 'OFFICIAL DRIVERS STANDINGS'
          : (selectedRound?.name || 'AERC ROUND RESULTS').toUpperCase();
      ctx.fillText(title, 60, 160);

      let y = 250;
      if (top6.length === 0) {
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '32px sans-serif';
        ctx.fillText('No drivers classified yet.', 60, y);
      } else {
        top6.forEach((row) => {
          ctx.fillStyle = '#12161D';
          ctx.fillRect(60, y - 45, width - 120, 68);
          ctx.fillStyle = row.rank <= 3 ? '#F59E0B' : '#9CA3AF';
          ctx.font = 'bold 34px monospace';
          ctx.fillText(`P${row.rank}`, 85, y);

          ctx.fillStyle = '#F4F5F7';
          ctx.font = 'bold 34px sans-serif';
          ctx.fillText(`#${row.driver.number} ${row.driver.fullName}`, 180, y);

          ctx.fillStyle = '#9CA3AF';
          ctx.font = '24px monospace';
          ctx.fillText(row.driver.racenetName, 640, y);

          ctx.fillStyle = '#10B981';
          ctx.font = 'bold 36px monospace';
          ctx.fillText(`${row.totalPoints} PTS`, width - 240, y);
          y += 85;
        });
      }

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `AERC_${cardType}_${preset}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadedNotice(true);
      setTimeout(() => setDownloadedNotice(false), 3000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-graphics-title"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-[#12161D] border border-[#222731] rounded-lg p-5 sm:p-6 shadow-2xl space-y-5 my-4 sm:my-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#222731]">
          <div>
            <div className="text-xs text-[#F59E0B] font-semibold">
              One-Click Social Graphic Generator · Replaces Workbook-to-PDF-to-Screenshot Workflow
            </div>
            <h2
              id="share-graphics-title"
              className="font-display text-2xl font-bold uppercase text-[#F4F5F7] mt-0.5"
            >
              Export Official AERC Broadcast Graphic
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close graphic generator"
            onClick={onClose}
            className="p-2 text-[#9CA3AF] hover:text-white rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPreset('whatsapp')}
              className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                preset === 'whatsapp'
                  ? 'bg-[#E11D48] border-[#E11D48] text-white'
                  : 'bg-[#090B0E] border-[#222731] text-[#9CA3AF]'
              }`}
            >
              WhatsApp Status / Story (9:16)
            </button>
            <button
              type="button"
              onClick={() => setPreset('instagram')}
              className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                preset === 'instagram'
                  ? 'bg-[#E11D48] border-[#E11D48] text-white'
                  : 'bg-[#090B0E] border-[#222731] text-[#9CA3AF]'
              }`}
            >
              Instagram Feed (4:5)
            </button>
            <button
              type="button"
              onClick={() => setPreset('x_landscape')}
              className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                preset === 'x_landscape'
                  ? 'bg-[#E11D48] border-[#E11D48] text-white'
                  : 'bg-[#090B0E] border-[#222731] text-[#9CA3AF]'
              }`}
            >
              X / Broadcast Card (16:9)
            </button>
          </div>

          <div className="flex items-center gap-3">
            <select
              aria-label="Graphic Content Type"
              value={cardType}
              onChange={(e) => setCardType(e.target.value as 'standings' | 'round')}
              className="bg-[#090B0E] border border-[#222731] rounded px-3 py-1.5 text-xs text-[#F4F5F7]"
            >
              <option value="standings">Championship Standings Card</option>
              <option value="round">Round Classification Card</option>
            </select>

            <button
              type="button"
              onClick={handleDownloadPng}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#10B981] rounded hover:bg-[#059669] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {downloadedNotice ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>PNG Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download High-Res PNG</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6 bg-[#090B0E] border border-[#222731] rounded-lg flex items-center justify-center">
          <div
            ref={canvasRef as React.RefObject<HTMLDivElement>}
            className={`w-full bg-[#0D1016] border-2 border-[#222731] rounded-lg overflow-hidden shadow-2xl transition-all ${
              preset === 'whatsapp'
                ? 'max-w-md'
                : preset === 'instagram'
                ? 'max-w-lg'
                : 'max-w-2xl'
            }`}
          >
            <div className="h-2 bg-gradient-to-r from-[#E11D48] via-[#F59E0B] to-[#10B981]" />

            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#222731] pb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#F59E0B]">
                    Esports Commission · Sim Racing Kenya · EA Sports WRC
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold uppercase text-[#F4F5F7] mt-0.5">
                    {cardType === 'standings'
                      ? 'AERC Drivers Standings'
                      : selectedRound?.name || 'Round Classification'}
                  </h3>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-[#E11D48]">RALLY1 HYBRID</div>
                  <div className="text-[10px] text-[#9CA3AF]">OFFICIAL TELEMETRY</div>
                </div>
              </div>

              {top6.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#9CA3AF]">
                  No drivers registered yet. Onboard drivers or import CSV results to populate this broadcast graphic.
                </div>
              ) : (
                <div className="space-y-2">
                  {top6.map((row) => (
                    <div
                      key={row.driver.id}
                      className="px-3.5 py-2.5 bg-[#12161D] border border-[#222731] rounded flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono text-sm font-bold w-6 ${
                            row.rank === 1
                              ? 'text-[#F59E0B]'
                              : row.rank <= 3
                              ? 'text-[#F4F5F7]'
                              : 'text-[#9CA3AF]'
                          }`}
                        >
                          P{row.rank}
                        </span>
                        <span
                          className="w-6 h-6 rounded flex items-center justify-center font-mono text-[10px] font-bold text-white"
                          style={{ backgroundColor: row.driver.avatarColor }}
                        >
                          #{row.driver.number}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-[#F4F5F7]">
                            {row.driver.fullName}{' '}
                            <span className="text-[10px] font-normal text-[#9CA3AF]">
                              ({row.driver.countryCode})
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-[#9CA3AF]">
                            {row.driver.racenetName} · {row.teamName}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-[#10B981] tabular-nums">
                          {row.totalPoints} PTS
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-[#222731] flex items-center justify-between text-[10px] font-mono text-[#9CA3AF]">
                <span>VERIFIED BY AERC RALLY CONTROL</span>
                <span>SIMRACINGKENYA.ORG/AERC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
