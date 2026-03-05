import { useState } from 'react';
import type { BattleshipState, BattleshipShip, ShotCell } from '@cohesion/shared';
import { BATTLESHIP_SHIPS, getShipCells, canPlaceShip, isValidPlacement } from '@cohesion/shared';

interface BattleshipBoardProps {
  state: BattleshipState;
  myPlayerNumber: 1 | 2 | null;
  myShips: BattleshipShip[];
  isMyTurn: boolean;
  onConfirmPlacement: (ships: BattleshipShip[]) => void;
  onShot: (row: number, col: number) => void;
  disabled: boolean;
}

const SHIP_COLORS: Record<BattleshipShip['id'], string> = {
  carrier: 'bg-blue-500',
  battleship: 'bg-indigo-500',
  cruiser: 'bg-violet-500',
  submarine: 'bg-purple-500',
  destroyer: 'bg-fuchsia-500',
};

const SHIP_COLORS_HOVER: Record<BattleshipShip['id'], string> = {
  carrier: 'bg-blue-400',
  battleship: 'bg-indigo-400',
  cruiser: 'bg-violet-400',
  submarine: 'bg-purple-400',
  destroyer: 'bg-fuchsia-400',
};

function Grid10x10({
  label,
  renderCell,
  onCellClick,
  onCellHover,
  onLeave,
}: {
  label: string;
  renderCell: (row: number, col: number) => React.ReactNode;
  onCellClick?: (row: number, col: number) => void;
  onCellHover?: (row: number, col: number) => void;
  onLeave?: () => void;
}) {
  return (
    <div>
      <p className="text-center text-sm text-slate-400 mb-2 font-medium uppercase tracking-wider">{label}</p>
      <div
        className="inline-block border border-slate-600"
        onMouseLeave={onLeave}
      >
        {Array.from({ length: 10 }, (_, row) => (
          <div key={row} className="flex">
            {Array.from({ length: 10 }, (_, col) => (
              <div
                key={col}
                className="w-8 h-8 border border-slate-700 flex items-center justify-center cursor-pointer select-none"
                onClick={() => onCellClick?.(row, col)}
                onMouseEnter={() => onCellHover?.(row, col)}
              >
                {renderCell(row, col)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Placement Phase ----

interface PlacementProps {
  onConfirm: (ships: BattleshipShip[]) => void;
  waitingForOpponent: boolean;
}

function PlacementPhase({ onConfirm, waitingForOpponent }: PlacementProps) {
  const [placedShips, setPlacedShips] = useState<BattleshipShip[]>([]);
  const [selectedShipId, setSelectedShipId] = useState<BattleshipShip['id']>('carrier');
  const [direction, setDirection] = useState<'h' | 'v'>('h');
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);

  const currentShipDef = BATTLESHIP_SHIPS.find((s) => s.id === selectedShipId);
  const allPlaced = placedShips.length === BATTLESHIP_SHIPS.length;
  const remainingShips = BATTLESHIP_SHIPS.filter((s) => !placedShips.find((p) => p.id === s.id));

  // Compute occupied cells from placed ships
  const occupiedSet = new Set<string>();
  for (const ship of placedShips) {
    for (const [r, c] of getShipCells(ship)) {
      occupiedSet.add(`${r},${c}`);
    }
  }

  // Preview ghost ship at hover
  const ghostCells = (() => {
    if (!hoverCell || !currentShipDef || allPlaced) return [];
    const [row, col] = hoverCell;
    const ghost: BattleshipShip = {
      id: selectedShipId,
      size: currentShipDef.size,
      row,
      col,
      direction,
    };
    return getShipCells(ghost);
  })();

  const ghostValid = ghostCells.length > 0 && canPlaceShip(
    { id: selectedShipId, size: currentShipDef!.size, row: hoverCell![0], col: hoverCell![1], direction },
    placedShips
  );

  const ghostSet = new Set(ghostCells.map(([r, c]) => `${r},${c}`));

  const handleCellClick = (row: number, col: number) => {
    if (allPlaced || !currentShipDef) return;

    const newShip: BattleshipShip = {
      id: selectedShipId,
      size: currentShipDef.size,
      row,
      col,
      direction,
    };

    if (!canPlaceShip(newShip, placedShips)) return;

    const updated = [...placedShips, newShip];
    setPlacedShips(updated);

    // Auto-select next unplaced ship
    const next = BATTLESHIP_SHIPS.find((s) => !updated.find((p) => p.id === s.id));
    if (next) setSelectedShipId(next.id);
  };

  const handleRemoveShip = (shipId: BattleshipShip['id']) => {
    setPlacedShips((prev) => prev.filter((s) => s.id !== shipId));
    setSelectedShipId(shipId);
  };

  const renderCell = (row: number, col: number) => {
    const key = `${row},${col}`;
    const placedShip = placedShips.find((ship) =>
      getShipCells(ship).some(([r, c]) => r === row && c === col)
    );

    if (placedShip) {
      return <div className={`w-full h-full ${SHIP_COLORS[placedShip.id]}`} />;
    }

    if (ghostSet.has(key)) {
      return (
        <div className={`w-full h-full opacity-60 ${ghostValid ? SHIP_COLORS_HOVER[selectedShipId] : 'bg-red-500'}`} />
      );
    }

    return null;
  };

  if (waitingForOpponent) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-slate-300 text-lg">Fleet deployed. Waiting for opponent...</p>
        <div className="flex flex-col items-center gap-2">
          <Grid10x10
            label="My Fleet"
            renderCell={(row, col) => {
              const ship = placedShips.find((s) =>
                getShipCells(s).some(([r, c]) => r === row && c === col)
              );
              return ship ? <div className={`w-full h-full ${SHIP_COLORS[ship.id]}`} /> : null;
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setDirection((d) => (d === 'h' ? 'v' : 'h'))}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors"
        >
          Rotate ({direction === 'h' ? 'Horizontal' : 'Vertical'})
        </button>
        <span className="text-slate-400 text-sm">Click grid to place ship</span>
      </div>

      <div className="flex gap-8 flex-wrap justify-center">
        {/* Ship selector */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-400 uppercase tracking-wider font-medium">Fleet</p>
          {BATTLESHIP_SHIPS.map((ship) => {
            const placed = placedShips.find((p) => p.id === ship.id);
            return (
              <button
                key={ship.id}
                onClick={() => {
                  if (placed) {
                    handleRemoveShip(ship.id);
                  } else {
                    setSelectedShipId(ship.id);
                  }
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  placed
                    ? 'bg-slate-700 text-slate-400 line-through'
                    : selectedShipId === ship.id
                    ? 'bg-slate-600 ring-1 ring-[#4AE688] text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <div className={`h-3 rounded-sm ${SHIP_COLORS[ship.id]}`} style={{ width: `${ship.size * 12}px` }} />
                <span className="capitalize">{ship.id} ({ship.size})</span>
              </button>
            );
          })}
          {remainingShips.length === 0 && (
            <p className="text-[#4AE688] text-sm mt-1">All ships placed!</p>
          )}
        </div>

        {/* Grid */}
        <Grid10x10
          label="Place Your Fleet"
          renderCell={renderCell}
          onCellClick={handleCellClick}
          onCellHover={(r, c) => setHoverCell([r, c])}
          onLeave={() => setHoverCell(null)}
        />
      </div>

      {allPlaced && (
        <button
          onClick={() => onConfirm(placedShips)}
          className="px-8 py-3 bg-[#4AE688] hover:bg-[#3DD677] text-[#0D1120] rounded-lg font-bold text-lg transition-colors"
        >
          Deploy Fleet
        </button>
      )}
    </div>
  );
}

// ---- Playing Phase ----

function ShotMarker({ value }: { value: ShotCell }) {
  if (value === 2) return <div className="w-4 h-4 rounded-full bg-orange-500" />;
  if (value === 1) return <div className="w-3 h-3 rounded-full bg-slate-500" />;
  return null;
}

// ---- Main Component ----

export function BattleshipBoard({
  state,
  myPlayerNumber,
  myShips,
  isMyTurn,
  onConfirmPlacement,
  onShot,
  disabled,
}: BattleshipBoardProps) {
  const [hoverTarget, setHoverTarget] = useState<[number, number] | null>(null);

  if (state.phase === 'placing') {
    const myReady = myPlayerNumber === 1 ? state.player1Ready : state.player2Ready;
    return (
      <PlacementPhase
        onConfirm={onConfirmPlacement}
        waitingForOpponent={myReady}
      />
    );
  }

  // Playing phase
  const myShots = myPlayerNumber === 1 ? state.shots1 : state.shots2;
  const opponentShots = myPlayerNumber === 1 ? state.shots2 : state.shots1;
  const mySunkShips = myPlayerNumber === 1 ? state.sunkShips1 : state.sunkShips2;
  const theirSunkShips = myPlayerNumber === 1 ? state.sunkShips2 : state.sunkShips1;

  // My fleet grid: show own ships + opponent's incoming shots
  const renderMyFleet = (row: number, col: number) => {
    const shipHere = myShips.find((s) =>
      getShipCells(s).some(([r, c]) => r === row && c === col)
    );
    const shotVal = opponentShots[row]?.[col] ?? 0;

    if (shotVal === 2) {
      return (
        <div className="w-full h-full relative">
          {shipHere && <div className={`w-full h-full ${SHIP_COLORS[shipHere.id]}`} />}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-orange-500" />
          </div>
        </div>
      );
    }
    if (shotVal === 1) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-slate-500" />
        </div>
      );
    }
    if (shipHere) {
      return <div className={`w-full h-full opacity-70 ${SHIP_COLORS[shipHere.id]}`} />;
    }
    return null;
  };

  // Target grid: show where I've shot + revealed sunk ships
  const renderTarget = (row: number, col: number) => {
    const shotVal = myShots[row]?.[col] ?? 0;

    // Reveal sunk ships on target grid
    const sunkShipHere = theirSunkShips.find((s) =>
      getShipCells(s).some(([r, c]) => r === row && c === col)
    );

    if (sunkShipHere) {
      return (
        <div className="w-full h-full relative">
          <div className={`w-full h-full opacity-50 ${SHIP_COLORS[sunkShipHere.id]}`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-orange-500" />
          </div>
        </div>
      );
    }

    if (shotVal !== 0) {
      return <ShotMarker value={shotVal} />;
    }

    // Hover preview
    if (hoverTarget && hoverTarget[0] === row && hoverTarget[1] === col && isMyTurn && !disabled) {
      return <div className="w-3 h-3 rounded-full border-2 border-[#4AE688] opacity-70" />;
    }

    return null;
  };

  const handleTargetClick = (row: number, col: number) => {
    if (!isMyTurn || disabled) return;
    if ((myShots[row]?.[col] ?? 0) !== 0) return;
    onShot(row, col);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-8 flex-wrap justify-center">
        <Grid10x10
          label="My Fleet"
          renderCell={renderMyFleet}
        />
        <Grid10x10
          label={isMyTurn ? 'Target — Your Move' : 'Target'}
          renderCell={renderTarget}
          onCellClick={handleTargetClick}
          onCellHover={(r, c) => setHoverTarget([r, c])}
          onLeave={() => setHoverTarget(null)}
        />
      </div>

      <div className="flex gap-6 text-sm text-slate-400">
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-500" /> Hit
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-500" /> Miss
        </span>
        {mySunkShips.length > 0 && (
          <span className="text-red-400">Lost: {mySunkShips.map((s) => s.id).join(', ')}</span>
        )}
        {theirSunkShips.length > 0 && (
          <span className="text-[#4AE688]">Sunk: {theirSunkShips.map((s) => s.id).join(', ')}</span>
        )}
      </div>
    </div>
  );
}
